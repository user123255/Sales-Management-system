import { supabase, getFriendlyError } from '../lib/supabase';

import type {
  CreateOrderInput,
  Order,
  OrderStatus,
  OrderItem,
  OrderStatusHistory,
  OrderItemResponseStatus,
} from '../types/database';

import { calculateOrderTotal } from '../lib/utils';

export async function fetchOrders(filters?: {
  status?: OrderStatus;
  department?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}): Promise<Order[]> {
  let query = supabase
    .from('orders')
    .select(`
      *,
      creator:profiles!orders_created_by_fkey(
        id,
        full_name,
        email,
        department
      ),
      items:order_items(*)
    `)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.department) {
    query = query.eq('department', filters.department);
  }

  if (filters?.dateFrom) {
    query = query.gte('created_at', filters.dateFrom);
  }

  if (filters?.dateTo) {
    query = query.lte(
      'created_at',
      `${filters.dateTo}T23:59:59`
    );
  }

  if (filters?.search) {
    query = query.or(
      `order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  return (data || []) as Order[];
}

export async function fetchOrderById(
  id: string
): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      creator:profiles!orders_created_by_fkey(
        id,
        full_name,
        email,
        department
      ),
      items:order_items(
        *,
        responder:profiles!order_items_responded_by_fkey(
          id,
          full_name,
          email,
          department
        )
      ),
      status_history:order_status_history(
        *,
        changer:profiles!order_status_history_changed_by_fkey(
          id,
          full_name,
          department
        )
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }

    throw new Error(getFriendlyError(error));
  }

  const order = data as Order;

  if (order.status_history) {
    order.status_history.sort(
      (a, b) =>
        new Date(a.created_at).getTime() -
        new Date(b.created_at).getTime()
    );
  }

  return order;
}

export async function fetchOrderByNumber(
  orderNumber: string
): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      creator:profiles!orders_created_by_fkey(
        id,
        full_name,
        email,
        department
      ),
      items:order_items(*),
      status_history:order_status_history(*)
    `)
    .eq('order_number', orderNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }

    throw new Error(getFriendlyError(error));
  }

  return data as Order;
}

export async function createOrder(
  input: CreateOrderInput,
  userId: string,
  department: string
): Promise<Order> {
  if (!input.items.length) {
    throw new Error('Please add at least one item to the order.');
  }

  const subtotal = calculateOrderTotal(input.items);

  const { data: orderNumberData, error: numError } =
    await supabase.rpc('generate_order_number');

  let orderNumber: string;

  if (numError) {
    const today = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');

    orderNumber =
      `SOMS-${today}-${Date.now().toString().slice(-4)}`;
  } else {
    orderNumber = orderNumberData as string;
  }

  const { data: order, error: orderError } =
    await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        created_by: userId,
        department,
        status: 'pending',
        notes: input.notes || null,
        customer_name: input.customer_name || null,
        delivery_info: input.delivery_info || null,
        subtotal,
        total: subtotal,
      })
      .select()
      .single();

  if (orderError) {
    throw new Error(getFriendlyError(orderError));
  }

  const orderItems = input.items.map((item) => ({
    order_id: order.id,
    product_id: item.product_id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit: item.unit,
    price: item.price,
    packaging: item.packaging || null,
    notes: item.notes || null,

    available_quantity: null,
    accepted_quantity: null,
    butchery_note: null,
    responded_at: null,
    responded_by: null,
    response_status: 'pending',
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    // Roll back the parent order if possible.
    await supabase
      .from('orders')
      .delete()
      .eq('id', order.id);

    throw new Error(getFriendlyError(itemsError));
  }

  await supabase
    .from('order_status_history')
    .insert({
      order_id: order.id,
      status: 'pending',
      changed_by: userId,
      department,
      comment: 'Order submitted to Butchery.',
    });

  await notifyButcheryNewOrder(
    order.id,
    orderNumber,
    department
  );

  const freshOrder = await fetchOrderById(order.id);

  return freshOrder || (order as Order);
}

/**
 * Butchery responds to one requested item.
 */
export async function respondToOrderItem(
  itemId: string,
  availableQuantity: number,
  acceptedQuantity: number,
  responseStatus: OrderItemResponseStatus,
  note: string,
  userId: string
): Promise<void> {
  const { data: item, error: itemError } =
    await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        product_name
      `)
      .eq('id', itemId)
      .single();

  if (itemError || !item) {
    throw new Error(
      getFriendlyError(
        itemError || new Error('Order item not found.')
      )
    );
  }

  if (availableQuantity < 0 || acceptedQuantity < 0) {
    throw new Error('Quantities cannot be negative.');
  }

  if (acceptedQuantity > availableQuantity) {
    throw new Error(
      'Accepted quantity cannot be greater than available quantity.'
    );
  }

  const { error } = await supabase
    .from('order_items')
    .update({
      available_quantity: availableQuantity,
      accepted_quantity: acceptedQuantity,
      response_status: responseStatus,
      butchery_note: note || null,
      responded_at: new Date().toISOString(),
      responded_by: userId,
    })
    .eq('id', itemId);

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  const { data: order } = await supabase
    .from('orders')
    .select('id, order_number, created_by')
    .eq('id', item.order_id)
    .single();

  if (order?.created_by) {
    await supabase.from('notifications').insert({
      user_id: order.created_by,
      type: 'butchery_response',
      title: 'Butchery Updated Your Order',
      message:
        `Butchery responded to ${item.product_name} on Order #${order.order_number}.`,
      order_id: order.id,
    });
  }
}

/**
 * Move order from pending -> accepted.
 */
export async function acceptOrder(
  orderId: string,
  userId: string,
  department: string,
  comment?: string
): Promise<void> {
  await updateOrderStatus(
    orderId,
    'accepted',
    userId,
    department,
    comment || 'Order accepted by Butchery.'
  );
}

/**
 * Move order into processing.
 */
export async function startOrderProcessing(
  orderId: string,
  userId: string,
  department: string,
  comment?: string
): Promise<void> {
  await updateOrderStatus(
    orderId,
    'processing',
    userId,
    department,
    comment || 'Butchery started processing this order.'
  );
}

/**
 * Mark order ready.
 */
export async function markOrderReady(
  orderId: string,
  userId: string,
  department: string,
  comment?: string
): Promise<void> {
  await updateOrderStatus(
    orderId,
    'ready',
    userId,
    department,
    comment || 'Order is ready for collection/delivery.'
  );
}

/**
 * Generic status update.
 */
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  userId: string,
  department: string,
  comment?: string
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'completed') {
    updates.completed_at = new Date().toISOString();
  }

  const { data: order, error: orderError } =
    await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select('*, creator:profiles!orders_created_by_fkey(id)')
      .single();

  if (orderError) {
    throw new Error(getFriendlyError(orderError));
  }

  const { error: historyError } = await supabase
    .from('order_status_history')
    .insert({
      order_id: orderId,
      status,
      changed_by: userId,
      department,
      comment: comment || null,
    });

  if (historyError) {
    throw new Error(getFriendlyError(historyError));
  }

  if (order?.created_by) {
    const statusLabel =
      status.charAt(0).toUpperCase() + status.slice(1);

    await supabase.from('notifications').insert({
      user_id: order.created_by,
      type:
        status === 'completed'
          ? 'order_completed'
          : 'order_update',

      title:
        status === 'completed'
          ? 'Order Completed'
          : 'Order Status Updated',

      message:
        `Order #${order.order_number} is now ${statusLabel.toLowerCase()}.`,

      order_id: orderId,
    });
  }

  if (status === 'completed') {
    await adjustInventoryForOrder(orderId);
  }
}

async function notifyButcheryNewOrder(
  orderId: string,
  orderNumber: string,
  fromDepartment: string
) {
  const { data: butcheryUsers, error } =
    await supabase
      .from('profiles')
      .select('id')
      .eq('department', 'butchery')
      .eq('is_active', true);

  if (error) {
    console.error(
      'Unable to load Butchery users:',
      error
    );
    return;
  }

  if (!butcheryUsers?.length) {
    return;
  }

  const departmentName =
    fromDepartment.charAt(0).toUpperCase() +
    fromDepartment.slice(1);

  const notifications = butcheryUsers.map((user) => ({
    user_id: user.id,
    type: 'new_order',
    title: 'New Order Received',
    message:
      `${departmentName} submitted Order #${orderNumber}.`,
    order_id: orderId,
  }));

  await supabase
    .from('notifications')
    .insert(notifications);
}

async function adjustInventoryForOrder(
  orderId: string
) {
  const { data: items } = await supabase
    .from('order_items')
    .select(
      'product_id, quantity, accepted_quantity'
    )
    .eq('order_id', orderId);

  if (!items) return;

  for (const item of items) {
    if (!item.product_id) continue;

    const { data: inventory } =
      await supabase
        .from('inventory')
        .select('quantity')
        .eq('product_id', item.product_id)
        .single();

    if (!inventory) continue;

    const fulfilledQuantity =
      item.accepted_quantity ??
      item.quantity;

    const newQuantity = Math.max(
      0,
      Number(inventory.quantity) -
        Number(fulfilledQuantity)
    );

    await supabase
      .from('inventory')
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('product_id', item.product_id);
  }
}

export async function markItemPrepared(
  itemId: string,
  prepared: boolean
): Promise<void> {
  const { error } = await supabase
    .from('order_items')
    .update({
      is_prepared: prepared,
    })
    .eq('id', itemId);

  if (error) {
    throw new Error(getFriendlyError(error));
  }
}

export async function getOrderStats(
  department?: string
) {
  const today = new Date()
    .toISOString()
    .slice(0, 10);

  let query = supabase
    .from('orders')
    .select(
      'status, total, created_at, department'
    );

  if (department) {
    query = query.eq(
      'department',
      department
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  const orders = data || [];

  const todayOrders = orders.filter((order) =>
    order.created_at.startsWith(today)
  );

  return {
    ordersToday: todayOrders.length,

    pending: orders.filter(
      (order) =>
        order.status === 'pending'
    ).length,

    processing: orders.filter(
      (order) =>
        ['accepted', 'processing'].includes(
          order.status
        )
    ).length,

    ready: orders.filter(
      (order) =>
        order.status === 'ready'
    ).length,

    completedToday: todayOrders.filter(
      (order) =>
        order.status === 'completed'
    ).length,

    completed: orders.filter(
      (order) =>
        order.status === 'completed'
    ).length,

    totalSales: orders
      .filter(
        (order) =>
          order.status === 'completed'
      )
      .reduce(
        (sum, order) =>
          sum + Number(order.total),
        0
      ),

    newOrders: orders.filter(
      (order) =>
        order.status === 'pending'
    ).length,
  };
}

/**
 * Global realtime order subscription.
 */
export function subscribeToOrders(
  callback: (order: Order) => void
) {
  const channel = supabase
    .channel(
      `soms-orders-${Date.now()}`
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
      },
      async (payload) => {
        const newRecord = payload.new;

        if (
          newRecord &&
          typeof newRecord === 'object' &&
          'id' in newRecord
        ) {
          const order =
            await fetchOrderById(
              String(
                (newRecord as { id: string })
                  .id
              )
            );

          if (order) {
            callback(order);
          }
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Realtime order item updates.
 */
export function subscribeToOrderItems(
  orderId: string,
  callback: () => void
) {
  const channel = supabase
    .channel(
      `soms-order-items-${orderId}`
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'order_items',
        filter: `order_id=eq.${orderId}`,
      },
      () => {
        callback();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Realtime status history.
 */
export function subscribeToOrderStatus(
  orderId: string,
  callback: (
    history: OrderStatusHistory
  ) => void
) {
  const channel = supabase
    .channel(
      `soms-order-status-${orderId}`
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'order_status_history',
        filter: `order_id=eq.${orderId}`,
      },
      (payload) => {
        callback(
          payload.new as OrderStatusHistory
        );
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export type { OrderItem };