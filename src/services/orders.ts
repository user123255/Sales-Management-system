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


function cleanSearchValue(
  value: string
): string {
  return value
    .trim()
    .replace(
      /[%_,]/g,
      ' '
    )
    .replace(
      /\s+/g,
      ' '
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


  if (filters?.status) {
    query =
      query.eq(
        'status',
        filters.status
      );
  }


  if (filters?.department) {
    query =
      query.eq(
        'department',
        filters.department
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

        status_history:order_status_history(
          *
        )
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
   NO APPLICATION-LEVEL RESTRICTIONS
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

  const notificationResult =
    await supabase
      .from('notifications')
      .delete()
      .eq(
        'order_id',
        id
      );


  if (notificationResult.error) {
    throw new Error(
      getFriendlyError(
        notificationResult.error
      )
    );
  }


  const historyResult =
    await supabase
      .from('order_status_history')
      .delete()
      .eq(
        'order_id',
        id
      );


  if (historyResult.error) {
    throw new Error(
      getFriendlyError(
        historyResult.error
      )
    );
  }


  const itemsResult =
    await supabase
      .from('order_items')
      .delete()
      .eq(
        'order_id',
        id
      );


  if (itemsResult.error) {
    throw new Error(
      getFriendlyError(
        itemsResult.error
      )
    );
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
      getFriendlyError(error)
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


  /*
   * Validate items.
   */

  for (const item of input.items) {
    if (!item.product_name?.trim()) {
      throw new Error(
        'Product name is required.'
      );
    }


    if (
      !Number.isFinite(
        Number(item.quantity)
      ) ||
      Number(item.quantity) <= 0
    ) {
      throw new Error(
        `Invalid quantity for ${item.product_name}`
      );
    }


    if (
      !Number.isFinite(
        Number(item.price)
      ) ||
      Number(item.price) < 0
    ) {
      throw new Error(
        `Invalid price for ${item.product_name}`
      );
    }
  }


  const subtotal =
    calculateOrderTotal(
      input.items
    );


  /*
   * Update main order.
   */

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
        orderId
      );


  if (updateError) {
    throw new Error(
      getFriendlyError(
        updateError
      )
    );
  }


  /*
   * Get existing items before replacing them.
   *
   * This allows us to preserve Butchery response
   * information when the same item is edited.
   */

  const {
    data: existingItems,
    error: existingItemsError,
  } =
    await supabase
      .from('order_items')
      .select('*')
      .eq(
        'order_id',
        orderId
      );


  if (existingItemsError) {
    throw new Error(
      getFriendlyError(
        existingItemsError
      )
    );
  }


  /*
   * Delete old items.
   */

  const {
    error: deleteItemsError,
  } =
    await supabase
      .from('order_items')
      .delete()
      .eq(
        'order_id',
        orderId
      );


  if (deleteItemsError) {
    throw new Error(
      getFriendlyError(
        deleteItemsError
      )
    );
  }


  /*
   * Recreate items.
   */

  const updatedItems =
    input.items.map(
      (item) => {
        /*
         * Try to find the previous item by
         * product name.
         */

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
            orderId,

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

          /*
           * Preserve existing Butchery information
           * whenever the product still exists.
           */

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


  /*
   * Return complete updated order.
   */

  const updatedOrder =
    await fetchOrderById(
      orderId
    );


  if (!updatedOrder) {
    throw new Error(
      'Order updated but could not be loaded.'
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
  if (!userId) {
    throw new Error(
      'You must login first.'
    );
  }


  if (!department?.trim()) {
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


  const subtotal =
    calculateOrderTotal(
      input.items
    );


  /*
   * Generate order number.
   */

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


  /*
   * Create order.
   */

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
          department.trim(),

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
      getFriendlyError(
        error
      )
    );
  }


  /*
   * Create order items.
   */

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
    /*
     * Roll the order back if its items
     * cannot be created.
     */

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


  /*
   * Load complete order.
   */

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
      'User is required.'
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
        itemId
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
  if (!orderId) {
    throw new Error(
      'Order ID required.'
    );
  }


  if (!userId) {
    throw new Error(
      'User ID required.'
    );
  }


  if (!isOrderStatus(status)) {
    throw new Error(
      'Invalid status.'
    );
  }


  /*
   * Get current order.
   */

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
        orderId
      )
      .single();


  if (error || !current) {
    throw new Error(
      'Order not found.'
    );
  }


  const now =
    new Date().toISOString();


  /*
   * Update order.
   */

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
        orderId
      );


  if (updateError) {
    throw new Error(
      getFriendlyError(
        updateError
      )
    );
  }


  /*
   * Add status history.
   */

  const {
    error: historyError,
  } =
    await supabase
      .from('order_status_history')
      .insert({
        order_id:
          orderId,

        status,

        changed_by:
          userId,

        department:
          department ||
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


  /*
   * Notify the person who created the order.
   */

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
            orderId,
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
   QUICK STATUS ACTIONS
========================================================= */

export async function acceptOrder(
  orderId: string,
  userId: string,
  department: string
): Promise<void> {
  return updateOrderStatus(
    orderId,
    'accepted',
    userId,
    department
  );
}


export async function startOrderProcessing(
  orderId: string,
  userId: string,
  department: string
): Promise<void> {
  return updateOrderStatus(
    orderId,
    'processing',
    userId,
    department
  );
}


export async function markOrderReady(
  orderId: string,
  userId: string,
  department: string
): Promise<void> {
  return updateOrderStatus(
    orderId,
    'ready',
    userId,
    department
  );
}


/* =========================================================
   ORDER STATISTICS
========================================================= */

export async function getOrderStats(
  department?: string
) {
  let query =
    supabase
      .from('orders')
      .select(
        'status,total,created_at,completed_at'
      );


  /*
   * Only filter by department when a specific
   * department is actually requested.
   *
   * Butchery calls this without a department because
   * it processes orders created by many departments.
   */

  if (department?.trim()) {
    query =
      query.eq(
        'department',
        department
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
          created >= startOfToday &&
          created < endOfToday
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

    accepted:
      orders.filter(
        (o) =>
          o.status ===
          'accepted'
      ).length,

    completed:
      orders.filter(
        (o) =>
          o.status ===
          'completed'
      ).length,

    completedToday:
      completedToday.length,

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
          /*
           * DELETE
           */

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


          /*
           * INSERT / UPDATE
           */

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