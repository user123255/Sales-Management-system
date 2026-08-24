import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ArrowLeft,
  Check,
  Clock3,
  PackageCheck,
  ChefHat,
  Send,
  User,
  CalendarDays,
  MessageSquare,
  RefreshCw,
  CircleDot,
  AlertCircle,
} from 'lucide-react';

import {
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  acceptOrder,
  fetchOrderById,
  markOrderReady,
  respondToOrderItem,
  startOrderProcessing,
  subscribeToOrderItems,
  subscribeToOrderStatus,
} from '../services/orders';

import { supabase } from '../lib/supabase';

import type {
  Order,
  OrderItemResponseStatus,
  OrderStatus,
} from '../types/database';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function statusLabel(
  status: OrderStatus
): string {
  const labels: Record<
    OrderStatus,
    string
  > = {
    pending: 'New Request',
    accepted: 'Accepted',
    processing: 'Processing',
    ready: 'Ready',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  return labels[status];
}

function StatusBadge({
  status,
}: {
  status: OrderStatus;
}) {
  const styles: Record<
    OrderStatus,
    string
  > = {
    pending:
      'bg-amber-50 text-amber-700 border-amber-200',

    accepted:
      'bg-blue-50 text-blue-700 border-blue-200',

    processing:
      'bg-indigo-50 text-indigo-700 border-indigo-200',

    ready:
      'bg-emerald-50 text-emerald-700 border-emerald-200',

    completed:
      'bg-slate-100 text-slate-700 border-slate-200',

    cancelled:
      'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {statusLabel(status)}
    </span>
  );
}

function ResponseBadge({
  status,
}: {
  status: OrderItemResponseStatus;
}) {
  const styles: Record<
    OrderItemResponseStatus,
    string
  > = {
    pending:
      'bg-slate-100 text-slate-600',

    available:
      'bg-emerald-50 text-emerald-700',

    partial:
      'bg-amber-50 text-amber-700',

    unavailable:
      'bg-red-50 text-red-700',
  };

  const labels: Record<
    OrderItemResponseStatus,
    string
  > = {
    pending: 'Awaiting response',
    available: 'Available',
    partial: 'Partially available',
    unavailable: 'Unavailable',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export function ButcheryOrderDetails() {
  const { orderId } = useParams<{
  orderId: string;
}>();

const navigate = useNavigate();

const location = useLocation();

const backToOrders =
  location.pathname.startsWith('/finance/')
    ? '/finance/orders'
    : location.pathname.startsWith('/other/')
      ? '/other/orders'
      : '/butchery/orders';

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [savingItem, setSavingItem] =
    useState<string | null>(null);

  const [updatingStatus, setUpdatingStatus] =
    useState<OrderStatus | null>(null);

  const [message, setMessage] =
    useState('');

  const [error, setError] =
    useState('');

  /**
   * Prevents overlapping requests.
   */
  const loadingRef =
    useRef(false);

  /**
   * Keeps the mounted state safe when an async
   * request completes after navigation.
   */
  const mountedRef =
    useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ------------------------------------------------------------------------ */
  /* Load order                                                               */
  /* ------------------------------------------------------------------------ */

  const loadOrder = useCallback(
  async (
    showLoader = false
  ) => {
    if (!orderId) {
      if (mountedRef.current) {
        setLoading(false);
        setError(
          'No order ID was provided.'
        );
      }

      return;
    }

    if (loadingRef.current) {
      return;
    }

    loadingRef.current = true;

    if (showLoader) {
      setLoading(true);
    }

    setError('');

    try {
      const data =
        await fetchOrderById(orderId);

        if (!mountedRef.current) {
          return;
        }

        if (!data) {
          setOrder(null);
          setError(
            'This order could not be found.'
          );

          return;
        }

        setOrder(data);
      } catch (err) {
        console.error(
          'Failed to load order:',
          err
        );

        if (!mountedRef.current) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load this order.'
        );
      } finally {
        loadingRef.current = false;

        if (
          mountedRef.current &&
          showLoader
        ) {
          setLoading(false);
        }
      }
    },
    [orderId]
  );

  /* ------------------------------------------------------------------------ */
  /* Initial load + realtime subscriptions                                    */
  /* ------------------------------------------------------------------------ */

 useEffect(() => {
  if (!orderId) {
    setLoading(false);
    setError('No order ID was provided.');
    return;
  }

  void loadOrder(true);

  const unsubscribeItems =
    subscribeToOrderItems(
      orderId,
      () => {
        void loadOrder(false);
      }
    );

  const unsubscribeStatus =
    subscribeToOrderStatus(
      orderId,
      () => {
        void loadOrder(false);
      }
    );

  return () => {
    unsubscribeItems();
    unsubscribeStatus();
  };
}, [orderId, loadOrder]);

  /* ------------------------------------------------------------------------ */
  /* Manual refresh                                                           */
  /* ------------------------------------------------------------------------ */

  const refreshOrder =
    async () => {
      if (refreshing) {
        return;
      }

      setRefreshing(true);
      setMessage('');
      setError('');

      try {
        await loadOrder(false);
      } finally {
        if (mountedRef.current) {
          setRefreshing(false);
        }
      }
    };

  /* ------------------------------------------------------------------------ */
  /* Get current user                                                         */
  /* ------------------------------------------------------------------------ */

  const getCurrentUser =
    async () => {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          'Your session has expired. Please sign in again.'
        );
      }

      return user;
    };

  /* ------------------------------------------------------------------------ */
  /* Item response                                                            */
  /* ------------------------------------------------------------------------ */

  const updateItemResponse =
    async (
      itemId: string,
      requested: number,
      available: string,
      accepted: string,
      note: string
    ) => {
      setMessage('');
      setError('');

      if (!itemId) {
        setError(
          'Order item ID is missing.'
        );
        return;
      }

      const requestedNumber =
        Number(requested);

      const availableNumber =
        Number(available);

      const acceptedNumber =
        Number(accepted);

      if (
        !Number.isFinite(
          requestedNumber
        ) ||
        requestedNumber < 0
      ) {
        setError(
          'The requested quantity is invalid.'
        );
        return;
      }

      if (
        !Number.isFinite(
          availableNumber
        ) ||
        availableNumber < 0
      ) {
        setError(
          'Available quantity cannot be negative.'
        );
        return;
      }

      if (
        !Number.isFinite(
          acceptedNumber
        ) ||
        acceptedNumber < 0
      ) {
        setError(
          'Fulfilled quantity cannot be negative.'
        );
        return;
      }

      if (
        acceptedNumber >
        availableNumber
      ) {
        setError(
          'Fulfilled quantity cannot be greater than available quantity.'
        );
        return;
      }

      if (
        availableNumber >
        requestedNumber
      ) {
        setError(
          'Available quantity cannot be greater than the requested quantity.'
        );
        return;
      }

      if (
        order &&
        [
          'completed',
          'cancelled',
        ].includes(order.status)
      ) {
        setError(
          'This order can no longer be modified.'
        );
        return;
      }

      try {
        setSavingItem(itemId);

        const user =
          await getCurrentUser();

        let responseStatus:
          OrderItemResponseStatus;

        if (
          availableNumber <= 0
        ) {
          responseStatus =
            'unavailable';
        } else if (
          availableNumber <
          requestedNumber
        ) {
          responseStatus =
            'partial';
        } else {
          responseStatus =
            'available';
        }

        await respondToOrderItem(
          itemId,
          availableNumber,
          acceptedNumber,
          responseStatus,
          note.trim(),
          user.id
        );

        setMessage(
          'Butchery response saved successfully.'
        );

        /**
         * Re-fetch immediately so the UI reflects
         * the exact database state.
         */
        await loadOrder(false);
      } catch (err) {
        console.error(
          'Unable to save item response:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to save response.'
        );
      } finally {
        if (mountedRef.current) {
          setSavingItem(null);
        }
      }
    };

  /* ------------------------------------------------------------------------ */
  /* Change order status                                                      */
  /* ------------------------------------------------------------------------ */

  const changeStatus =
    async (
      nextStatus: OrderStatus
    ) => {
      if (!order) {
        return;
      }

      if (
        updatingStatus
      ) {
        return;
      }

      setMessage('');
      setError('');

      /**
       * Prevent impossible actions from being
       * triggered by stale UI.
       */
      if (
        ['completed', 'cancelled'].includes(
          order.status
        )
      ) {
        setError(
          'This order is already closed and cannot be changed.'
        );
        return;
      }

      if (
        nextStatus ===
        order.status
      ) {
        return;
      }

      const validNextStatus =
        (
          order.status ===
            'pending' &&
          nextStatus ===
            'accepted'
        ) ||
        (
          order.status ===
            'accepted' &&
          nextStatus ===
            'processing'
        ) ||
        (
          order.status ===
            'processing' &&
          nextStatus ===
            'ready'
        );

      if (!validNextStatus) {
        setError(
          `Order cannot move from ${statusLabel(
            order.status
          )} to ${statusLabel(
            nextStatus
          )}.`
        );
        return;
      }

      try {
        setUpdatingStatus(
          nextStatus
        );

        const user =
          await getCurrentUser();

        if (
          nextStatus ===
          'accepted'
        ) {
          await acceptOrder(
            order.id,
            user.id,
            'butchery'
          );
        }

        if (
          nextStatus ===
          'processing'
        ) {
          await startOrderProcessing(
            order.id,
            user.id,
            'butchery'
          );
        }

        if (
          nextStatus ===
          'ready'
        ) {
          await markOrderReady(
            order.id,
            user.id,
            'butchery'
          );
        }

        setMessage(
          `Order successfully marked as ${statusLabel(
            nextStatus
          ).toLowerCase()}.`
        );

        await loadOrder(false);
      } catch (err) {
        console.error(
          'Unable to update order:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to update order.'
        );
      } finally {
        if (mountedRef.current) {
          setUpdatingStatus(null);
        }
      }
    };

  /* ------------------------------------------------------------------------ */
  /* Loading state                                                            */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />

          <p className="text-sm font-medium text-slate-500">
            Loading order details...
          </p>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Not found                                                                */
  /* ------------------------------------------------------------------------ */

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>

        <h2 className="mt-5 text-xl font-bold text-slate-900">
          Order not found
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          {error ||
            'The order may have been deleted or you may not have permission to view it.'}
        </p>

        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(
                '/butchery/orders'
              )
            }
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Back to Order Center
          </button>

          <button
            type="button"
            onClick={() =>
              void refreshOrder()
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Main UI                                                                  */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            type="button"
            onClick={() =>
              navigate(
                backToOrders
              )
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Order Center
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              #{order.order_number}
            </h1>

            <StatusBadge
              status={order.status}
            />
          </div>

          <p className="mt-2 text-sm text-slate-500">
            Request from{' '}
            <span className="font-semibold text-slate-700">
              {order.department}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              void refreshOrder()
            }
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={
                refreshing
                  ? 'h-4 w-4 animate-spin'
                  : 'h-4 w-4'
              }
            />

            Refresh
          </button>

          {order.status ===
            'pending' && (
            <button
              type="button"
              disabled={
                updatingStatus !==
                null
              }
              onClick={() =>
                void changeStatus(
                  'accepted'
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updatingStatus ===
              'accepted' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}

              Accept Order
            </button>
          )}

          {order.status ===
            'accepted' && (
            <button
              type="button"
              disabled={
                updatingStatus !==
                null
              }
              onClick={() =>
                void changeStatus(
                  'processing'
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updatingStatus ===
              'processing' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ChefHat className="h-4 w-4" />
              )}

              Start Processing
            </button>
          )}

          {order.status ===
            'processing' && (
            <button
              type="button"
              disabled={
                updatingStatus !==
                null
              }
              onClick={() =>
                void changeStatus(
                  'ready'
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updatingStatus ===
              'ready' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <PackageCheck className="h-4 w-4" />
              )}

              Mark Ready
            </button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Messages                                                           */}
      {/* ------------------------------------------------------------------ */}

      {message && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />

          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

          <span>{error}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Meta                                                               */}
      {/* ------------------------------------------------------------------ */}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
              <User className="h-5 w-5 text-slate-400" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Requested By
              </p>

              <p className="mt-1 truncate font-semibold text-slate-900">
                {order.creator
                  ?.full_name ||
                  order.department}
              </p>

              {order.creator
                ?.email && (
                <p className="mt-0.5 truncate text-xs text-slate-400">
                  {
                    order.creator
                      .email
                  }
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
              <CalendarDays className="h-5 w-5 text-slate-400" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Submitted
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {new Date(
                  order.created_at
                ).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
              <Clock3 className="h-5 w-5 text-slate-400" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Last Updated
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {new Date(
                  order.updated_at ||
                    order.created_at
                ).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Items                                                              */}
      {/* ------------------------------------------------------------------ */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Fulfilment Review
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review requested quantities
                and tell the ordering
                department what Butchery
                can fulfil.
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
              {order.items?.length ||
                0}{' '}
              {order.items?.length ===
              1
                ? 'item'
                : 'items'}
            </div>
          </div>
        </div>

        {!order.items ||
        order.items.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <PackageCheck className="mx-auto h-8 w-8 text-slate-300" />

            <p className="mt-3 font-semibold text-slate-700">
              No order items found
            </p>

            <p className="mt-1 text-sm text-slate-400">
              This order does not contain
              any fulfilment items.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {order.items.map(
              (item) => (
                <ItemResponse
                  key={item.id}
                  item={item}
                  saving={
                    savingItem ===
                    item.id
                  }
                  disabled={
                    [
                      'completed',
                      'cancelled',
                    ].includes(
                      order.status
                    )
                  }
                  onSave={
                    updateItemResponse
                  }
                />
              )
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Notes                                                              */}
      {/* ------------------------------------------------------------------ */}

      {(order.notes ||
        order.delivery_info) && (
        <div className="grid gap-4 md:grid-cols-2">
          {order.notes && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-slate-400" />

                <h3 className="font-bold text-slate-900">
                  Order Notes
                </h3>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {order.notes}
              </p>
            </div>
          )}

          {order.delivery_info && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <PackageCheck className="h-5 w-5 text-slate-400" />

                <h3 className="font-bold text-slate-900">
                  Delivery / Collection
                </h3>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {order.delivery_info}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Timeline                                                           */}
      {/* ------------------------------------------------------------------ */}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-slate-900">
            Order Activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            A complete record of what
            happened to this order.
          </p>
        </div>

        {!order.status_history ||
        order.status_history.length ===
          0 ? (
          <div className="rounded-xl bg-slate-50 px-5 py-8 text-center">
            <CircleDot className="mx-auto h-7 w-7 text-slate-300" />

            <p className="mt-2 text-sm font-medium text-slate-500">
              No activity recorded yet.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {order.status_history
              .slice()
              .reverse()
              .map((history) => (
                <div
                  key={history.id}
                  className="relative flex gap-4"
                >
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                    <CircleDot className="h-4 w-4 text-slate-500" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {statusLabel(
                          history.status
                        )}
                      </span>

                      <span className="text-xs text-slate-400">
                        {new Date(
                          history.created_at
                        ).toLocaleString()}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {history.comment ||
                        'Status updated.'}
                    </p>

                    {history.changer && (
                      <p className="mt-1 text-xs text-slate-400">
                        by{' '}
                        <span className="font-semibold text-slate-500">
                          {
                            history
                              .changer
                              .full_name
                          }
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Item response component                                                    */
/* -------------------------------------------------------------------------- */

function ItemResponse({
  item,
  saving,
  disabled,
  onSave,
}: {
  item: NonNullable<
    Order['items']
  >[number];

  saving: boolean;

  disabled: boolean;

  onSave: (
    itemId: string,
    requested: number,
    available: string,
    accepted: string,
    note: string
  ) => void;
}) {
  const [available, setAvailable] =
    useState<number>(
      Number(
        item.available_quantity ??
          item.quantity ??
          0
      )
    );

  const [accepted, setAccepted] =
    useState<number>(
      Number(
        item.accepted_quantity ??
          item.quantity ??
          0
      )
    );

  const [note, setNote] =
    useState(
      item.butchery_note || ''
    );

  const requested =
    Number(item.quantity || 0);

  /**
   * Keep local form state synchronized with
   * realtime database updates.
   */
  useEffect(() => {
    setAvailable(
      Number(
        item.available_quantity ??
          item.quantity ??
          0
      )
    );

    setAccepted(
      Number(
        item.accepted_quantity ??
          item.quantity ??
          0
      )
    );

    setNote(
      item.butchery_note || ''
    );
  }, [
    item.available_quantity,
    item.accepted_quantity,
    item.butchery_note,
    item.quantity,
  ]);

  const availableValid =
    Number.isFinite(
      available
    ) &&
    available >= 0 &&
    available <= requested;

  const acceptedValid =
    Number.isFinite(
      accepted
    ) &&
    accepted >= 0 &&
    accepted <= available;

  const canSave =
    !saving &&
    !disabled &&
    availableValid &&
    acceptedValid;

  return (
    <div className="p-6">
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        {/* Product information */}
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-bold text-slate-900">
              {item.product_name}
            </h3>

            <ResponseBadge
              status={
                item.response_status
              }
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-slate-400">
                Requested
              </span>

              <span className="ml-2 font-bold text-slate-900">
                {item.quantity}{' '}
                {item.unit}
              </span>
            </div>

            {item.packaging && (
              <div>
                <span className="text-slate-400">
                  Packaging
                </span>

                <span className="ml-2 font-semibold text-slate-700">
                  {item.packaging}
                </span>
              </div>
            )}
          </div>

          {item.notes && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
              <strong className="text-slate-700">
                Request note:
              </strong>{' '}
              {item.notes}
            </div>
          )}
        </div>

        {/* Response form */}
        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Available
            </span>

            <input
              type="number"
              min="0"
              max={requested}
              step="0.01"
              value={available}
              disabled={disabled || saving}
              onChange={(e) => {
                const value =
                  Number(
                    e.target.value
                  );

                setAvailable(
                  Number.isFinite(
                    value
                  )
                    ? Math.max(
                        0,
                        value
                      )
                    : 0
                );

                /**
                 * If availability is reduced below
                 * the current fulfilment amount,
                 * automatically reduce fulfilment.
                 */
                if (
                  Number.isFinite(
                    value
                  ) &&
                  accepted > value
                ) {
                  setAccepted(
                    Math.max(
                      0,
                      value
                    )
                  );
                }
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Fulfil
            </span>

            <input
              type="number"
              min="0"
              max={available}
              step="0.01"
              value={accepted}
              disabled={disabled || saving}
              onChange={(e) => {
                const value =
                  Number(
                    e.target.value
                  );

                setAccepted(
                  Number.isFinite(
                    value
                  )
                    ? Math.min(
                        Math.max(
                          0,
                          value
                        ),
                        available
                      )
                    : 0
                );
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-semibold outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          {/* Validation */}
          {(!availableValid ||
            !acceptedValid) && (
            <div className="sm:col-span-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              Available quantity must be between
              0 and {requested}, and fulfilled
              quantity cannot exceed available
              quantity.
            </div>
          )}

          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Butchery response
            </span>

            <input
              value={note}
              disabled={disabled || saving}
              onChange={(e) =>
                setNote(
                  e.target.value
                )
              }
              placeholder="e.g. We can provide 18kg today. Remaining 2kg tomorrow."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <button
            type="button"
            disabled={!canSave}
            onClick={() =>
              onSave(
                item.id,
                requested,
                String(
                  available
                ),
                String(
                  accepted
                ),
                note
              )
            }
            className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving response...
              </>
            ) : disabled ? (
              <>
                <Check className="h-4 w-4" />
                Order Closed
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Response
              </>
            )}
          </button>
        </div>
      </div>

      {item.responded_at && (
        <p className="mt-4 text-xs text-slate-400">
          Response submitted{' '}
          {new Date(
            item.responded_at
          ).toLocaleString()}
          {item.responder
            ? ` by ${item.responder.full_name}`
            : ''}
        </p>
      )}
    </div>
  );
}