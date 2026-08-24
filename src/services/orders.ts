import {
  supabase,
  getFriendlyError,
} from '../lib/supabase';

import type {
  CreateOrderInput,
  Order,
  OrderItem,
  OrderItemResponseStatus,
  OrderStatus,
  OrderStatusHistory,
} from '../types/database';

import { calculateOrderTotal } from '../lib/utils';

/* =========================================================
   TYPES
========================================================= */

type FetchOrdersFilters = {
  status?: OrderStatus;
  department?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
};

type OrderRealtimeDeleteCallback = (
  orderId: string
) => void;

/* =========================================================
   CONSTANTS
========================================================= */

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'accepted',
  'processing',
  'ready',
  'completed',
  'cancelled',
];

const STATUS_TRANSITIONS: Record<
  OrderStatus,
  OrderStatus[]
> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['processing', 'cancelled'],
  processing: ['ready', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

/* =========================================================
   HELPERS
========================================================= */

function isOrderStatus(
  value: unknown
): value is OrderStatus {
  return (
    typeof value === 'string' &&
    ORDER_STATUSES.includes(
      value as OrderStatus
    )
  );
}

function statusLabel(
  status: OrderStatus
): string {
  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
  );
}

function cleanSearchValue(
  value: string
): string {
  return value
    .trim()
    .replace(/[%_,]/g, ' ')
    .replace(/\s+/g, ' ');
}

function isValidQuantity(
  value: number
): boolean {
  return (
    Number.isFinite(value) &&
    value >= 0
  );
}

/**
 * Load a complete order including:
 * - creator
 * - items
 * - item responders
 * - status history
 * - status changers
 */
async function fetchCompleteOrder(
  orderId: string
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
    .eq('id', orderId)
    .maybeSingle();

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  if (!data) {
    return null;
  }

  const order = data as Order;

  if (order.status_history) {
    order.status_history =
      order.status_history
        .slice()
        .sort(
          (a, b) =>
            new Date(
              a.created_at
            ).getTime() -
            new Date(
              b.created_at
            ).getTime()
        );
  }

  return order;
}

/* =========================================================
   FETCH ORDERS
========================================================= */

export async function fetchOrders(
  filters?: FetchOrdersFilters
): Promise<Order[]> {
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
    .order('created_at', {
      ascending: false,
    });

  if (filters?.status) {
    query = query.eq(
      'status',
      filters.status
    );
  }

  if (filters?.department) {
    query = query.eq(
      'department',
      filters.department
    );
  }

  if (filters?.dateFrom) {
    query = query.gte(
      'created_at',
      filters.dateFrom
    );
  }

  if (filters?.dateTo) {
    const dateTo =
      filters.dateTo.includes('T')
        ? filters.dateTo
        : `${filters.dateTo}T23:59:59`;

    query = query.lte(
      'created_at',
      dateTo
    );
  }

  if (filters?.search?.trim()) {
    const search =
      cleanSearchValue(
        filters.search
      );

    if (search) {
      query = query.or(
        [
          `order_number.ilike.%${search}%`,
          `customer_name.ilike.%${search}%`,
          `department.ilike.%${search}%`,
        ].join(',')
      );
    }
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  return (data || []) as Order[];
}

/* =========================================================
   FETCH SINGLE ORDER
========================================================= */

export async function fetchOrderById(
  id: string
): Promise<Order | null> {
  if (!id?.trim()) {
    return null;
  }

  return fetchCompleteOrder(
    id.trim()
  );
}

/* =========================================================
   FETCH ORDER BY NUMBER
========================================================= */

export async function fetchOrderByNumber(
  orderNumber: string
): Promise<Order | null> {
  const cleanedNumber =
    orderNumber.trim();

  if (!cleanedNumber) {
    return null;
  }

  const { data, error } =
    await supabase
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
      .eq(
        'order_number',
        cleanedNumber
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  if (!data) {
    return null;
  }

  const order = data as Order;

  if (order.status_history) {
    order.status_history =
      order.status_history
        .slice()
        .sort(
          (a, b) =>
            new Date(
              a.created_at
            ).getTime() -
            new Date(
              b.created_at
            ).getTime()
        );
  }

  return order;
}

/* =========================================================
   CREATE ORDER
========================================================= */

export async function createOrder(
  input: CreateOrderInput,
  userId: string,
  department: string
): Promise<Order> {
  if (!userId) {
    throw new Error(
      'You must be signed in to create an order.'
    );
  }

  if (!department?.trim()) {
    throw new Error(
      'A department is required.'
    );
  }

  if (
    !input?.items ||
    input.items.length === 0
  ) {
    throw new Error(
      'Please add at least one item to the order.'
    );
  }

  for (const item of input.items) {
    if (
      !item.product_name?.trim()
    ) {
      throw new Error(
        'Every order item must have a product name.'
      );
    }

    if (
      !Number.isFinite(
        Number(item.quantity)
      ) ||
      Number(item.quantity) <= 0
    ) {
      throw new Error(
        `Quantity for ${item.product_name} must be greater than zero.`
      );
    }

    if (
      !Number.isFinite(
        Number(item.price)
      ) ||
      Number(item.price) < 0
    ) {
      throw new Error(
        `Price for ${item.product_name} cannot be negative.`
      );
    }
  }

  const subtotal =
    calculateOrderTotal(
      input.items
    );

  /* -------------------------------------------------------
     Generate order number
  ------------------------------------------------------- */

  const {
    data: generatedOrderNumber,
    error: numberError,
  } =
    await supabase.rpc(
      'generate_order_number'
    );

  let orderNumber: string;

  if (
    !numberError &&
    generatedOrderNumber
  ) {
    orderNumber =
      String(
        generatedOrderNumber
      );
  } else {
    const today =
      new Date()
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');

    orderNumber =
      `SOMS-${today}-${Date.now()
        .toString()
        .slice(-6)}`;
  }

  /* -------------------------------------------------------
     Create parent order
  ------------------------------------------------------- */

  const {
    data: order,
    error: orderError,
  } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      created_by: userId,
      department:
        department.trim(),
      status: 'pending',
      notes:
        input.notes?.trim() ||
        null,
      customer_name:
        input.customer_name?.trim() ||
        null,
      delivery_info:
        input.delivery_info?.trim() ||
        null,
      subtotal,
      total: subtotal,
    })
    .select()
    .single();

  if (orderError || !order) {
    throw new Error(
      getFriendlyError(
        orderError ||
          new Error(
            'Unable to create order.'
          )
      )
    );
  }

  /* -------------------------------------------------------
     Create order items
  ------------------------------------------------------- */

  const orderItems =
    input.items.map((item) => ({
      order_id: order.id,
      product_id:
        item.product_id || null,
      product_name:
        item.product_name.trim(),
      quantity:
        Number(item.quantity),
      unit:
        item.unit || null,
      price:
        Number(item.price),
      packaging:
        item.packaging?.trim() ||
        null,
      notes:
        item.notes?.trim() ||
        null,

      available_quantity:
        null,

      accepted_quantity:
        null,

      butchery_note:
        null,

      responded_at:
        null,

      responded_by:
        null,

      response_status:
        'pending' as OrderItemResponseStatus,
    }));

  const {
    error: itemsError,
  } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    await supabase
      .from('orders')
      .delete()
      .eq(
        'id',
        order.id
      );

    throw new Error(
      getFriendlyError(
        itemsError
      )
    );
  }

  /* -------------------------------------------------------
     Add status history
  ------------------------------------------------------- */

  const {
    error: historyError,
  } =
    await supabase
      .from(
        'order_status_history'
      )
      .insert({
        order_id: order.id,
        status: 'pending',
        changed_by: userId,
        department:
          department.trim(),
        comment:
          'Order submitted to Butchery.',
      });

  if (historyError) {
    console.error(
      'Unable to create order history:',
      historyError
    );
  }

  /* -------------------------------------------------------
     Notify Butchery
  ------------------------------------------------------- */

  await notifyButcheryNewOrder(
    order.id,
    orderNumber,
    department
  );

  /* -------------------------------------------------------
     Return complete order
  ------------------------------------------------------- */

  const freshOrder =
    await fetchOrderById(
      order.id
    );

  return (
    freshOrder ||
    (order as Order)
  );
}

/* =========================================================
   RESPOND TO ORDER ITEM
========================================================= */

export async function respondToOrderItem(
  itemId: string,
  availableQuantity: number,
  acceptedQuantity: number,
  responseStatus: OrderItemResponseStatus,
  note: string,
  userId: string
): Promise<void> {
  if (!itemId) {
    throw new Error(
      'Order item is required.'
    );
  }

  if (!userId) {
    throw new Error(
      'You must be signed in to respond to an order.'
    );
  }

  if (
    !isValidQuantity(
      availableQuantity
    )
  ) {
    throw new Error(
      'Available quantity must be zero or greater.'
    );
  }

  if (
    !isValidQuantity(
      acceptedQuantity
    )
  ) {
    throw new Error(
      'Fulfilled quantity must be zero or greater.'
    );
  }

  if (
    acceptedQuantity >
    availableQuantity
  ) {
    throw new Error(
      'Fulfilled quantity cannot be greater than available quantity.'
    );
  }

  const {
    data: item,
    error: itemError,
  } = await supabase
    .from('order_items')
    .select(`
      id,
      order_id,
      product_name,
      quantity
    `)
    .eq('id', itemId)
    .single();

  if (itemError || !item) {
    throw new Error(
      getFriendlyError(
        itemError ||
          new Error(
            'Order item not found.'
          )
      )
    );
  }

  const requestedQuantity =
    Number(item.quantity);

  if (
    acceptedQuantity >
    requestedQuantity
  ) {
    throw new Error(
      'Fulfilled quantity cannot exceed the requested quantity.'
    );
  }

  let finalStatus =
    responseStatus;

  /**
   * Always derive the response status
   * from the actual quantities.
   *
   * This prevents the UI from accidentally
   * saving a contradictory status.
   */
  if (
    availableQuantity <= 0 ||
    acceptedQuantity <= 0
  ) {
    finalStatus =
      'unavailable';
  } else if (
    acceptedQuantity <
    requestedQuantity
  ) {
    finalStatus =
      'partial';
  } else {
    finalStatus =
      'available';
  }

  const {
    error: updateError,
  } = await supabase
    .from('order_items')
    .update({
      available_quantity:
        availableQuantity,

      accepted_quantity:
        acceptedQuantity,

      response_status:
        finalStatus,

      butchery_note:
        note?.trim() || null,

      responded_at:
        new Date().toISOString(),

      responded_by:
        userId,
    })
    .eq(
      'id',
      itemId
    );

  if (updateError) {
    throw new Error(
      getFriendlyError(
        updateError
      )
    );
  }

  /* -------------------------------------------------------
     Notify department that created the order
  ------------------------------------------------------- */

  const {
    data: order,
    error: orderError,
  } =
    await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        created_by
      `)
      .eq(
        'id',
        item.order_id
      )
      .single();

  if (orderError) {
    console.error(
      'Unable to load order for notification:',
      orderError
    );

    return;
  }

  if (!order?.created_by) {
    return;
  }

  const responseText =
    finalStatus ===
    'available'
      ? 'is available'
      : finalStatus ===
          'partial'
        ? 'is partially available'
        : 'is unavailable';

  const {
    error: notificationError,
  } =
    await supabase
      .from('notifications')
      .insert({
        user_id:
          order.created_by,

        type:
          'butchery_response',

        title:
          'Butchery Updated Your Order',

        message:
          `Butchery responded to ${item.product_name} on Order #${order.order_number}: ${responseText}.`,

        order_id:
          order.id,
      });

  if (notificationError) {
    console.error(
      'Unable to create item response notification:',
      notificationError
    );
  }
}

/* =========================================================
   ACCEPT ORDER
========================================================= */

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
    comment ||
      'Order accepted by Butchery.'
  );
}

/* =========================================================
   START PROCESSING
========================================================= */

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
    comment ||
      'Butchery started processing this order.'
  );
}

/* =========================================================
   MARK READY
========================================================= */

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
    comment ||
      'Order is ready for collection/delivery.'
  );
}

/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  userId: string,
  department: string,
  comment?: string
): Promise<void> {
  if (!orderId) {
    throw new Error(
      'Order ID is required.'
    );
  }

  if (!userId) {
    throw new Error(
      'You must be signed in.'
    );
  }

  if (!department?.trim()) {
    throw new Error(
      'Department is required.'
    );
  }

  if (!isOrderStatus(status)) {
    throw new Error(
      'Invalid order status.'
    );
  }

  /* -------------------------------------------------------
     Get current order first.
  ------------------------------------------------------- */

  const {
    data: currentOrder,
    error: currentError,
  } =
    await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        created_by,
        completed_at
      `)
      .eq(
        'id',
        orderId
      )
      .single();

  if (
    currentError ||
    !currentOrder
  ) {
    throw new Error(
      getFriendlyError(
        currentError ||
          new Error(
            'Order not found.'
          )
      )
    );
  }

  const currentStatus =
    currentOrder.status as OrderStatus;

  /* -------------------------------------------------------
     Ignore duplicate status update.
  ------------------------------------------------------- */

  if (
    currentStatus === status
  ) {
    return;
  }

  /* -------------------------------------------------------
     Validate transition.
  ------------------------------------------------------- */

  const allowedStatuses =
    STATUS_TRANSITIONS[
      currentStatus
    ] || [];

  if (
    !allowedStatuses.includes(
      status
    )
  ) {
    throw new Error(
      `Order cannot move from ${statusLabel(
        currentStatus
      )} to ${statusLabel(status)}.`
    );
  }

  /* -------------------------------------------------------
     Update order.
  ------------------------------------------------------- */

  const updates: Record<
    string,
    unknown
  > = {
    status,
    updated_at:
      new Date().toISOString(),
  };

  if (
    status === 'completed'
  ) {
    updates.completed_at =
      new Date().toISOString();
  }

  const {
    data: updatedOrder,
    error: orderError,
  } =
    await supabase
      .from('orders')
      .update(updates)
      .eq(
        'id',
        orderId
      )
      .select(`
        *,
        creator:profiles!orders_created_by_fkey(
          id
        )
      `)
      .single();

  if (
    orderError ||
    !updatedOrder
  ) {
    throw new Error(
      getFriendlyError(
        orderError ||
          new Error(
            'Unable to update order status.'
          )
      )
    );
  }

  /* -------------------------------------------------------
     Add status history.
  ------------------------------------------------------- */

  const {
    error: historyError,
  } =
    await supabase
      .from(
        'order_status_history'
      )
      .insert({
        order_id:
          orderId,

        status,

        changed_by:
          userId,

        department:
          department.trim(),

        comment:
          comment?.trim() ||
          null,
      });

  if (historyError) {
    console.error(
      'Unable to save order status history:',
      historyError
    );
  }

  /* -------------------------------------------------------
     Notify order creator.
  ------------------------------------------------------- */

  if (
    updatedOrder.created_by
  ) {
    const lowerStatus =
      status.toLowerCase();

    const notificationType =
      status === 'completed'
        ? 'order_completed'
        : 'order_update';

    const notificationTitle =
      status === 'completed'
        ? 'Order Completed'
        : 'Order Status Updated';

    const {
      error:
        notificationError,
    } =
      await supabase
        .from(
          'notifications'
        )
        .insert({
          user_id:
            updatedOrder.created_by,

          type:
            notificationType,

          title:
            notificationTitle,

          message:
            `Order #${updatedOrder.order_number} is now ${lowerStatus}.`,

          order_id:
            orderId,
        });

    if (
      notificationError
    ) {
      console.error(
        'Unable to create status notification:',
        notificationError
      );
    }
  }

  /* -------------------------------------------------------
     Deduct inventory only when the order actually
     transitions INTO completed.
  ------------------------------------------------------- */

  if (
    status === 'completed' &&
    currentStatus !== 'completed'
  ) {
    await adjustInventoryForOrder(
      orderId
    );
  }
}

/* =========================================================
   NOTIFY BUTCHERY
========================================================= */

async function notifyButcheryNewOrder(
  orderId: string,
  orderNumber: string,
  fromDepartment: string
): Promise<void> {
  const {
    data: butcheryUsers,
    error,
  } =
    await supabase
      .from('profiles')
      .select('id')
      .eq(
        'department',
        'butchery'
      )
      .eq(
        'is_active',
        true
      );

  if (error) {
    console.error(
      'Unable to load Butchery users:',
      error
    );

    return;
  }

  if (
    !butcheryUsers?.length
  ) {
    return;
  }

  const departmentName =
    fromDepartment
      .charAt(0)
      .toUpperCase() +
    fromDepartment.slice(1);

  const notifications =
    butcheryUsers.map(
      (user) => ({
        user_id:
          user.id,

        type:
          'new_order',

        title:
          'New Order Received',

        message:
          `${departmentName} submitted Order #${orderNumber}.`,

        order_id:
          orderId,
      })
    );

  const {
    error:
      notificationError,
  } =
    await supabase
      .from(
        'notifications'
      )
      .insert(
        notifications
      );

  if (
    notificationError
  ) {
    console.error(
      'Unable to create Butchery notifications:',
      notificationError
    );
  }
}

/* =========================================================
   ADJUST INVENTORY
========================================================= */

async function adjustInventoryForOrder(
  orderId: string
): Promise<void> {
  const {
    data: items,
    error,
  } =
    await supabase
      .from('order_items')
      .select(`
        product_id,
        quantity,
        accepted_quantity
      `)
      .eq(
        'order_id',
        orderId
      );

  if (error) {
    console.error(
      'Unable to load order items for inventory:',
      error
    );

    return;
  }

  if (!items?.length) {
    return;
  }

  for (const item of items) {
    if (!item.product_id) {
      continue;
    }

    const {
      data: inventory,
      error:
        inventoryError,
    } =
      await supabase
        .from('inventory')
        .select(
          'quantity'
        )
        .eq(
          'product_id',
          item.product_id
        )
        .maybeSingle();

    if (inventoryError) {
      console.error(
        'Unable to load inventory:',
        inventoryError
      );

      continue;
    }

    if (!inventory) {
      continue;
    }

    const fulfilledQuantity =
      item.accepted_quantity ??
      item.quantity;

    const currentQuantity =
      Number(
        inventory.quantity
      );

    const newQuantity =
      Math.max(
        0,
        currentQuantity -
          Number(
            fulfilledQuantity
          )
      );

    const {
      error:
        updateError,
    } =
      await supabase
        .from('inventory')
        .update({
          quantity:
            newQuantity,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'product_id',
          item.product_id
        );

    if (updateError) {
      console.error(
        `Unable to update inventory for product ${item.product_id}:`,
        updateError
      );
    }
  }
}

/* =========================================================
   MARK ITEM PREPARED
========================================================= */

export async function markItemPrepared(
  itemId: string,
  prepared: boolean
): Promise<void> {
  if (!itemId) {
    throw new Error(
      'Order item is required.'
    );
  }

  const {
    error,
  } = await supabase
    .from('order_items')
    .update({
      is_prepared:
        prepared,
    })
    .eq(
      'id',
      itemId
    );

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }
}

/* =========================================================
   ORDER STATISTICS
========================================================= */

export async function getOrderStats(
  department?: string
) {
  const today =
    new Date()
      .toISOString()
      .slice(0, 10);

  let query = supabase
    .from('orders')
    .select(`
      status,
      total,
      created_at,
      department
    `);

  if (department) {
    query = query.eq(
      'department',
      department
    );
  }

  const {
    data,
    error,
  } = await query;

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  const orders =
    data || [];

  const todayOrders =
    orders.filter(
      (order) =>
        String(
          order.created_at
        ).startsWith(today)
    );

  const pending =
    orders.filter(
      (order) =>
        order.status ===
        'pending'
    );

  const processing =
    orders.filter(
      (order) =>
        order.status ===
          'accepted' ||
        order.status ===
          'processing'
    );

  const ready =
    orders.filter(
      (order) =>
        order.status ===
        'ready'
    );

  const completed =
    orders.filter(
      (order) =>
        order.status ===
        'completed'
    );

  return {
    ordersToday:
      todayOrders.length,

    pending:
      pending.length,

    processing:
      processing.length,

    ready:
      ready.length,

    completedToday:
      todayOrders.filter(
        (order) =>
          order.status ===
          'completed'
      ).length,

    completed:
      completed.length,

    totalSales:
      completed.reduce(
        (
          sum,
          order
        ) =>
          sum +
          Number(
            order.total || 0
          ),
        0
      ),

    newOrders:
      pending.length,
  };
}

/* =========================================================
   REALTIME ORDERS
========================================================= */

/**
 * Subscribe to order INSERT / UPDATE / DELETE events.
 *
 * The second callback is optional and is used by Orders.tsx
 * to immediately remove deleted orders.
 */
export function subscribeToOrders(
  callback: (
    order: Order
  ) => void,

  onDelete?: OrderRealtimeDeleteCallback
) {
  const channelName =
    `soms-orders-${Math.random()
      .toString(36)
      .slice(2)}`;

  const channel =
    supabase
      .channel(
        channelName
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        async (
          payload
        ) => {
          try {
            const record =
              payload.new as {
                id?: string;
              };

            if (!record?.id) {
              return;
            }

            const order =
              await fetchOrderById(
                record.id
              );

            if (order) {
              callback(order);
            }
          } catch (error) {
            console.error(
              'Realtime order INSERT error:',
              error
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        async (
          payload
        ) => {
          try {
            const record =
              payload.new as {
                id?: string;
              };

            if (!record?.id) {
              return;
            }

            const order =
              await fetchOrderById(
                record.id
              );

            if (order) {
              callback(order);
            }
          } catch (error) {
            console.error(
              'Realtime order UPDATE error:',
              error
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
        },
        (
          payload
        ) => {
          const record =
            payload.old as {
              id?: string;
            };

          if (
            record?.id &&
            onDelete
          ) {
            onDelete(
              record.id
            );
          }
        }
      )
      .subscribe(
        (status) => {
          if (
            status ===
            'CHANNEL_ERROR'
          ) {
            console.error(
              'SOMS orders realtime channel error.'
            );
          }

          if (
            status ===
            'TIMED_OUT'
          ) {
            console.error(
              'SOMS orders realtime channel timed out.'
            );
          }
        }
      );

  return () => {
    void supabase.removeChannel(
      channel
    );
  };
}

/* =========================================================
   REALTIME ORDER ITEMS
========================================================= */

export function subscribeToOrderItems(
  orderId: string,
  callback: () => void
) {
  if (!orderId) {
    return () => undefined;
  }

  const channel =
    supabase
      .channel(
        `soms-order-items-${orderId}-${Math.random()
          .toString(36)
          .slice(2)}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
          filter:
            `order_id=eq.${orderId}`,
        },
        () => {
          callback();
        }
      )
      .subscribe(
        (status) => {
          if (
            status ===
            'CHANNEL_ERROR'
          ) {
            console.error(
              'Order item realtime channel error.'
            );
          }
        }
      );

  return () => {
    void supabase.removeChannel(
      channel
    );
  };
}

/* =========================================================
   REALTIME ORDER STATUS HISTORY
========================================================= */

export function subscribeToOrderStatus(
  orderId: string,
  callback: (
    history: OrderStatusHistory
  ) => void
) {
  if (!orderId) {
    return () => undefined;
  }

  const channel =
    supabase
      .channel(
        `soms-order-status-${orderId}-${Math.random()
          .toString(36)
          .slice(2)}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_status_history',
          filter:
            `order_id=eq.${orderId}`,
        },
        (
          payload
        ) => {
          callback(
            payload.new as OrderStatusHistory
          );
        }
      )
      .subscribe(
        (status) => {
          if (
            status ===
            'CHANNEL_ERROR'
          ) {
            console.error(
              'Order status realtime channel error.'
            );
          }
        }
      );

  return () => {
    void supabase.removeChannel(
      channel
    );
  };
}

/* =========================================================
   EXPORT TYPE
========================================================= */

export type {
  OrderItem,
  OrderStatusHistory
};