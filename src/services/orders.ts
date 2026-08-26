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

type UpdateOrderDetailsInput = {
  department?: string;
  customer_name?: string | null;
  notes?: string | null;
  delivery_info?: string | null;
};

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

const BUTCHERY_DEPARTMENT = 'butchery';

/* =========================================================
   HELPERS
========================================================= */

function normalizeDepartment(
  department?: string | null
): string {
  return department?.trim().toLowerCase() || '';
}

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

function cleanSearchValue(
  value: string
): string {
  return value
    .trim()
    .replace(/[%_,]/g, ' ')
    .replace(/\s+/g, ' ');
}

/* =========================================================
   DEPARTMENT VISIBILITY
========================================================= */

/*
 * SOMS ORDER VISIBILITY RULES
 *
 * BUTCHERY
 * --------
 * Butchery is the fulfilment department.
 * It must see orders created by ALL departments.
 *
 * FINANCE
 * -------
 * Finance sees ONLY orders belonging to Finance.
 *
 * OTHER DEPARTMENTS
 * -----------------
 * Every other department sees ONLY its own orders.
 *
 * Therefore:
 *
 * Kitchen order
 *   -> Kitchen: YES
 *   -> Butchery: YES
 *   -> Finance: NO
 *   -> Catering: NO
 *   -> Operations: NO
 *
 * Finance order
 *   -> Finance: YES
 *   -> Butchery: YES
 *   -> Kitchen: NO
 *   -> Catering: NO
 *
 * Catering order
 *   -> Catering: YES
 *   -> Butchery: YES
 *   -> Finance: NO
 *   -> Kitchen: NO
 */
function applyDepartmentVisibility<T>(
  query: T,
  department?: string
): T {
  const normalized =
    normalizeDepartment(department);

  if (!normalized) {
    return query;
  }

  /*
   * Butchery is the ONLY department
   * allowed to see every department's orders.
   */
  if (
    normalized === BUTCHERY_DEPARTMENT
  ) {
    return query;
  }

  /*
   * Every other department is restricted
   * to its own department.
   */
  return (
    query as any
  ).eq(
    'department',
    normalized
  );
}

/* =========================================================
   BUTCHERY PERMISSION
========================================================= */

function canAcceptOrders(
  department?: string
): boolean {
  return (
    normalizeDepartment(
      department
    ) === BUTCHERY_DEPARTMENT
  );
}

/* =========================================================
   FETCH COMPLETE ORDER
========================================================= */

async function fetchCompleteOrder(
  orderId: string
): Promise<Order | null> {
  const {
    data,
    error,
  } = await supabase
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
      'id',
      orderId
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

  const order =
    data as Order;

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
  const requestedDepartment =
    normalizeDepartment(
      filters?.department
    );

  let query =
    supabase
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
      .order(
        'created_at',
        {
          ascending: false,
        }
      );

  /*
   * IMPORTANT:
   *
   * Department filtering is applied BEFORE
   * the query is executed.
   */
  if (requestedDepartment) {
    query =
      applyDepartmentVisibility(
        query,
        requestedDepartment
      );
  }

  if (filters?.status) {
    query =
      query.eq(
        'status',
        filters.status
      );
  }

  if (filters?.dateFrom) {
    query =
      query.gte(
        'created_at',
        filters.dateFrom
      );
  }

  if (filters?.dateTo) {
    const dateTo =
      filters.dateTo.includes('T')
        ? filters.dateTo
        : `${filters.dateTo}T23:59:59`;

    query =
      query.lte(
        'created_at',
        dateTo
      );
  }

  if (filters?.search?.trim()) {
    const search =
      cleanSearchValue(
        filters.search
      );

    query =
      query.or(
        [
          `order_number.ilike.%${search}%`,
          `customer_name.ilike.%${search}%`,
          `department.ilike.%${search}%`,
        ].join(',')
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  return (
    data || []
  ) as Order[];
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
  if (!orderNumber?.trim()) {
    return null;
  }

  const {
    data,
    error,
  } =
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

        items:order_items(*),

        status_history:order_status_history(*)
      `)
      .eq(
        'order_number',
        orderNumber.trim()
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  return (
    data as Order
  ) || null;
}

/* =========================================================
   DELETE ORDER
========================================================= */

export async function deleteOrder(
  orderId: string
): Promise<void> {
  if (!orderId?.trim()) {
    throw new Error(
      'Order ID is required.'
    );
  }

  const id =
    orderId.trim();

  /*
   * Delete dependent records first.
   */
  const childTables = [
    'notifications',
    'order_status_history',
    'order_items',
  ] as const;

  for (const table of childTables) {
    const {
      error,
    } = await supabase
      .from(table)
      .delete()
      .eq(
        'order_id',
        id
      );

    if (error) {
      throw new Error(
        `Unable to delete order data from ${table}: ${getFriendlyError(
          error
        )}`
      );
    }
  }

  /*
   * Finally delete the order itself.
   */
  const {
    error,
  } =
    await supabase
      .from('orders')
      .delete()
      .eq(
        'id',
        id
      );

  if (error) {
    throw new Error(
      `Unable to permanently delete the order: ${getFriendlyError(
        error
      )}`
    );
  }
}

/* =========================================================
   UPDATE ORDER
========================================================= */

export async function updateOrder(
  orderId: string,
  input: CreateOrderInput
): Promise<Order> {
  if (!orderId?.trim()) {
    throw new Error(
      'Order ID is required.'
    );
  }

  if (
    !input?.items ||
    input.items.length === 0
  ) {
    throw new Error(
      'Order must contain at least one item.'
    );
  }

  const id =
    orderId.trim();

  for (const item of input.items) {
    if (!item.product_name?.trim()) {
      throw new Error(
        'Product name is required.'
      );
    }

    const quantity =
      Number(item.quantity);

    const price =
      Number(item.price);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      throw new Error(
        `Invalid quantity for ${item.product_name}.`
      );
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new Error(
        `Invalid price for ${item.product_name}.`
      );
    }
  }

  const subtotal =
    calculateOrderTotal(
      input.items
    );

  const {
    error: updateError,
  } =
    await supabase
      .from('orders')
      .update({
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

        total:
          subtotal,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        'id',
        id
      );

  if (updateError) {
    throw new Error(
      getFriendlyError(
        updateError
      )
    );
  }

  const {
    data: existingItems,
    error: existingItemsError,
  } =
    await supabase
      .from('order_items')
      .select('*')
      .eq(
        'order_id',
        id
      );

  if (existingItemsError) {
    throw new Error(
      getFriendlyError(
        existingItemsError
      )
    );
  }

  const {
    error: deleteItemsError,
  } =
    await supabase
      .from('order_items')
      .delete()
      .eq(
        'order_id',
        id
      );

  if (deleteItemsError) {
    throw new Error(
      getFriendlyError(
        deleteItemsError
      )
    );
  }

  const updatedItems =
    input.items.map(
      (item) => {
        const previous =
          existingItems?.find(
            (existing) =>
              existing.product_name
                ?.trim()
                .toLowerCase() ===
              item.product_name
                .trim()
                .toLowerCase()
          );

        return {
          order_id:
            id,

          product_id:
            item.product_id ||
            null,

          product_name:
            item.product_name.trim(),

          quantity:
            Number(
              item.quantity
            ),

          unit:
            item.unit ||
            null,

          price:
            Number(
              item.price
            ),

          packaging:
            item.packaging?.trim() ||
            null,

          notes:
            item.notes?.trim() ||
            null,

          available_quantity:
            previous?.available_quantity ??
            null,

          accepted_quantity:
            previous?.accepted_quantity ??
            null,

          response_status:
            previous?.response_status ??
            'pending',

          butchery_note:
            previous?.butchery_note ??
            null,

          responded_at:
            previous?.responded_at ??
            null,

          responded_by:
            previous?.responded_by ??
            null,
        };
      }
    );

  const {
    error: itemError,
  } =
    await supabase
      .from('order_items')
      .insert(
        updatedItems
      );

  if (itemError) {
    throw new Error(
      getFriendlyError(
        itemError
      )
    );
  }

  const updatedOrder =
    await fetchOrderById(
      id
    );

  if (!updatedOrder) {
    throw new Error(
      'Order updated but could not be loaded.'
    );
  }

  return updatedOrder;
}

/* =========================================================
   UPDATE ORDER DETAILS
========================================================= */

export async function updateOrderDetails(
  orderId: string,
  input: UpdateOrderDetailsInput,
  userId: string
): Promise<Order> {
  if (!orderId?.trim()) {
    throw new Error(
      'Order ID is required.'
    );
  }

  if (!userId?.trim()) {
    throw new Error(
      'You must be signed in to edit an order.'
    );
  }

  const id =
    orderId.trim();

  const updates: Record<
    string,
    unknown
  > = {
    updated_at:
      new Date().toISOString(),
  };

  if (
    input.department !==
    undefined
  ) {
    const department =
      normalizeDepartment(
        input.department
      );

    if (!department) {
      throw new Error(
        'Department is required.'
      );
    }

    updates.department =
      department;
  }

  if (
    input.customer_name !==
    undefined
  ) {
    updates.customer_name =
      input.customer_name?.trim() ||
      null;
  }

  if (
    input.notes !==
    undefined
  ) {
    updates.notes =
      input.notes?.trim() ||
      null;
  }

  if (
    input.delivery_info !==
    undefined
  ) {
    updates.delivery_info =
      input.delivery_info?.trim() ||
      null;
  }

  const {
    data,
    error,
  } =
    await supabase
      .from('orders')
      .update(updates)
      .eq(
        'id',
        id
      )
      .select()
      .single();

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  if (!data) {
    throw new Error(
      'Order not found.'
    );
  }

  const updatedOrder =
    await fetchOrderById(
      id
    );

  if (!updatedOrder) {
    throw new Error(
      'Order was updated but could not be loaded.'
    );
  }

  return updatedOrder;
}

/* =========================================================
   CREATE ORDER
========================================================= */

export async function createOrder(
  input: CreateOrderInput,
  userId: string,
  department: string
): Promise<Order> {
  if (!userId?.trim()) {
    throw new Error(
      'You must login first.'
    );
  }

  const cleanDepartment =
    normalizeDepartment(
      department
    );

  if (!cleanDepartment) {
    throw new Error(
      'Department is required.'
    );
  }

  if (
    !input?.items ||
    input.items.length === 0
  ) {
    throw new Error(
      'Order must contain at least one item.'
    );
  }

  for (const item of input.items) {
    if (!item.product_name?.trim()) {
      throw new Error(
        'Product name is required.'
      );
    }

    const quantity =
      Number(item.quantity);

    const price =
      Number(item.price);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      throw new Error(
        `Invalid quantity for ${item.product_name}.`
      );
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      throw new Error(
        `Invalid price for ${item.product_name}.`
      );
    }
  }

  const subtotal =
    calculateOrderTotal(
      input.items
    );

  const {
    data: numberData,
    error: numberError,
  } =
    await supabase.rpc(
      'generate_order_number'
    );

  if (numberError) {
    console.warn(
      'Could not generate order number:',
      numberError
    );
  }

  const orderNumber =
    numberData ||
    `SOMS-${Date.now()}`;

  const {
    data: order,
    error,
  } =
    await supabase
      .from('orders')
      .insert({
        order_number:
          orderNumber,

        created_by:
          userId,

        department:
          cleanDepartment,

        status:
          'pending',

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

        total:
          subtotal,
      })
      .select()
      .single();

  if (error || !order) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  const items =
    input.items.map(
      (item) => ({
        order_id:
          order.id,

        product_id:
          item.product_id ||
          null,

        product_name:
          item.product_name.trim(),

        quantity:
          Number(
            item.quantity
          ),

        unit:
          item.unit ||
          null,

        price:
          Number(
            item.price
          ),

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

        response_status:
          'pending',
      })
    );

  const {
    error: itemError,
  } =
    await supabase
      .from('order_items')
      .insert(
        items
      );

  if (itemError) {
    await supabase
      .from('orders')
      .delete()
      .eq(
        'id',
        order.id
      );

    throw new Error(
      getFriendlyError(
        itemError
      )
    );
  }

  const result =
    await fetchOrderById(
      order.id
    );

  return (
    result ||
    (order as Order)
  );
}

/* =========================================================
   RESPOND TO ORDER ITEM
   BUTCHERY ONLY
========================================================= */

export async function respondToOrderItem(
  itemId: string,
  availableQuantity: number,
  acceptedQuantity: number,
  responseStatus: OrderItemResponseStatus,
  note: string,
  userId: string,
  department = BUTCHERY_DEPARTMENT
): Promise<void> {
  if (!itemId?.trim()) {
    throw new Error(
      'Order item is required.'
    );
  }

  if (!userId?.trim()) {
    throw new Error(
      'User is required.'
    );
  }

  if (
    !canAcceptOrders(
      department
    )
  ) {
    throw new Error(
      'Only Butchery can accept or respond to order items.'
    );
  }

  if (
    !Number.isFinite(
      Number(availableQuantity)
    ) ||
    Number(availableQuantity) < 0
  ) {
    throw new Error(
      'Available quantity is invalid.'
    );
  }

  if (
    !Number.isFinite(
      Number(acceptedQuantity)
    ) ||
    Number(acceptedQuantity) < 0
  ) {
    throw new Error(
      'Accepted quantity is invalid.'
    );
  }

  if (
    Number(acceptedQuantity) >
    Number(availableQuantity)
  ) {
    throw new Error(
      'Accepted quantity cannot be greater than available quantity.'
    );
  }

  const {
    error,
  } =
    await supabase
      .from('order_items')
      .update({
        available_quantity:
          Number(
            availableQuantity
          ),

        accepted_quantity:
          Number(
            acceptedQuantity
          ),

        response_status:
          responseStatus,

        butchery_note:
          note?.trim() ||
          null,

        responded_at:
          new Date().toISOString(),

        responded_by:
          userId,
      })
      .eq(
        'id',
        itemId.trim()
      );

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }
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
  if (!orderId?.trim()) {
    throw new Error(
      'Order ID required.'
    );
  }

  if (!userId?.trim()) {
    throw new Error(
      'User ID required.'
    );
  }

  if (!isOrderStatus(status)) {
    throw new Error(
      'Invalid status.'
    );
  }

  const cleanDepartment =
    normalizeDepartment(
      department
    );

  /*
   * Only Butchery can control
   * fulfilment statuses.
   */
  if (
    (
      status === 'accepted' ||
      status === 'processing' ||
      status === 'ready'
    ) &&
    !canAcceptOrders(
      cleanDepartment
    )
  ) {
    throw new Error(
      'Only Butchery can update this fulfilment status.'
    );
  }

  const id =
    orderId.trim();

  const {
    data: current,
    error,
  } =
    await supabase
      .from('orders')
      .select(`
        status,
        order_number,
        created_by
      `)
      .eq(
        'id',
        id
      )
      .single();

  if (error || !current) {
    throw new Error(
      'Order not found.'
    );
  }

  const now =
    new Date().toISOString();

  const {
    error: updateError,
  } =
    await supabase
      .from('orders')
      .update({
        status,

        updated_at:
          now,

        completed_at:
          status === 'completed'
            ? now
            : null,
      })
      .eq(
        'id',
        id
      );

  if (updateError) {
    throw new Error(
      getFriendlyError(
        updateError
      )
    );
  }

  const {
    error: historyError,
  } =
    await supabase
      .from('order_status_history')
      .insert({
        order_id:
          id,

        status,

        changed_by:
          userId,

        department:
          cleanDepartment ||
          null,

        comment:
          comment?.trim() ||
          null,
      });

  if (historyError) {
    console.error(
      'Order status history failed:',
      historyError
    );
  }

  if (current.created_by) {
    const {
      error: notificationError,
    } =
      await supabase
        .from('notifications')
        .insert({
          user_id:
            current.created_by,

          type:
            'order_update',

          title:
            'Order Updated',

          message:
            `Order #${current.order_number} is now ${status}.`,

          order_id:
            id,
        });

    if (notificationError) {
      console.error(
        'Order notification failed:',
        notificationError
      );
    }
  }
}

/* =========================================================
   ACCEPT ORDER
========================================================= */

export async function acceptOrder(
  orderId: string,
  userId: string,
  department: string
): Promise<void> {
  if (
    !canAcceptOrders(
      department
    )
  ) {
    throw new Error(
      'Only Butchery can accept orders.'
    );
  }

  return updateOrderStatus(
    orderId,
    'accepted',
    userId,
    BUTCHERY_DEPARTMENT
  );
}

/* =========================================================
   START PROCESSING
========================================================= */

export async function startOrderProcessing(
  orderId: string,
  userId: string,
  department: string
): Promise<void> {
  if (
    !canAcceptOrders(
      department
    )
  ) {
    throw new Error(
      'Only Butchery can process orders.'
    );
  }

  return updateOrderStatus(
    orderId,
    'processing',
    userId,
    BUTCHERY_DEPARTMENT
  );
}

/* =========================================================
   MARK READY
========================================================= */

export async function markOrderReady(
  orderId: string,
  userId: string,
  department: string
): Promise<void> {
  if (
    !canAcceptOrders(
      department
    )
  ) {
    throw new Error(
      'Only Butchery can mark orders as ready.'
    );
  }

  return updateOrderStatus(
    orderId,
    'ready',
    userId,
    BUTCHERY_DEPARTMENT
  );
}

/* =========================================================
   ORDER STATISTICS
========================================================= */

export async function getOrderStats(
  department?: string
) {
  const normalized =
    normalizeDepartment(
      department
    );

  let query =
    supabase
      .from('orders')
      .select(
        'status,total,created_at,completed_at,department'
      );

  if (normalized) {
    query =
      applyDepartmentVisibility(
        query,
        normalized
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    throw new Error(
      getFriendlyError(error)
    );
  }

  const orders =
    data || [];

  const now =
    new Date();

  const startOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const endOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

  const ordersToday =
    orders.filter(
      (order) => {
        const created =
          new Date(
            order.created_at
          );

        return (
          created >=
            startOfToday &&
          created <
            endOfToday
        );
      }
    );

  const completedToday =
    orders.filter(
      (order) => {
        if (
          order.status !==
          'completed'
        ) {
          return false;
        }

        const completedDate =
          order.completed_at
            ? new Date(
                order.completed_at
              )
            : new Date(
                order.created_at
              );

        return (
          completedDate >=
            startOfToday &&
          completedDate <
            endOfToday
        );
      }
    );

  return {
    ordersToday:
      ordersToday.length,

    pending:
      orders.filter(
        (o) =>
          o.status ===
          'pending'
      ).length,

    accepted:
      orders.filter(
        (o) =>
          o.status ===
          'accepted'
      ).length,

    processing:
      orders.filter(
        (o) =>
          o.status ===
          'processing'
      ).length,

    ready:
      orders.filter(
        (o) =>
          o.status ===
          'ready'
      ).length,

    completed:
      orders.filter(
        (o) =>
          o.status ===
          'completed'
      ).length,

    completedToday:
      completedToday.length,

    cancelled:
      orders.filter(
        (o) =>
          o.status ===
          'cancelled'
      ).length,

    totalSales:
      orders.reduce(
        (sum, order) =>
          sum +
          Number(
            order.total || 0
          ),
        0
      ),
  };
}

/* =========================================================
   REALTIME ORDERS
========================================================= */

export function subscribeToOrders(
  callback: (
    order: Order
  ) => void,
  onDelete?: OrderRealtimeDeleteCallback
) {
  const channel =
    supabase
      .channel(
        `orders-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}`
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        async (payload) => {
          if (
            payload.eventType ===
            'DELETE'
          ) {
            const old =
              payload.old as {
                id?: string;
              };

            if (old?.id) {
              onDelete?.(
                old.id
              );
            }

            return;
          }

          const record =
            payload.new as {
              id?: string;
            };

          if (!record?.id) {
            return;
          }

          try {
            const order =
              await fetchOrderById(
                record.id
              );

            if (order) {
              callback(order);
            }
          } catch (error) {
            console.error(
              'Realtime order refresh failed:',
              error
            );
          }
        }
      )
      .subscribe();

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
  const channel =
    supabase
      .channel(
        `items-${orderId}-${Date.now()}`
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
      .subscribe();

  return () => {
    void supabase.removeChannel(
      channel
    );
  };
}

/* =========================================================
   REALTIME STATUS HISTORY
========================================================= */

export function subscribeToOrderStatus(
  orderId: string,
  callback: (
    history: OrderStatusHistory
  ) => void
) {
  const channel =
    supabase
      .channel(
        `status-${orderId}-${Date.now()}`
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table:
            'order_status_history',
          filter:
            `order_id=eq.${orderId}`,
        },
        (payload) => {
          callback(
            payload.new as OrderStatusHistory
          );
        }
      )
      .subscribe();

  return () => {
    void supabase.removeChannel(
      channel
    );
  };
}

/* =========================================================
   EXPORT TYPES
========================================================= */

export type {
  OrderItem,
  OrderStatusHistory,
};