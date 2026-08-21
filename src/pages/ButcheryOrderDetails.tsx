import {
  useEffect,
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
} from 'lucide-react';

import { useNavigate, useParams } from 'react-router-dom';

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

function statusLabel(
  status: OrderStatus
) {
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
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
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
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function ButcheryOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [savingItem, setSavingItem] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState('');

  const loadOrder = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const data =
        await fetchOrderById(id);

      setOrder(data);
    } catch (error) {
      console.error(error);
      setMessage(
        'Unable to load this order.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();

    if (!id) return;

    const unsubscribeItems =
      subscribeToOrderItems(
        id,
        loadOrder
      );

    const unsubscribeStatus =
      subscribeToOrderStatus(
        id,
        () => {
          loadOrder();
        }
      );

    return () => {
      unsubscribeItems();
      unsubscribeStatus();
    };
  }, [id]);

  const getCurrentUser =
    async () => {
      const {
        data: {
          user,
        },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          'Your session has expired. Please sign in again.'
        );
      }

      return user;
    };

  const updateItemResponse =
    async (
      itemId: string,
      requested: number,
      available: string,
      accepted: string,
      note: string
    ) => {
      try {
        setSavingItem(itemId);

        const user =
          await getCurrentUser();

        const availableNumber =
          Number(available);

        const acceptedNumber =
          Number(accepted);

        let responseStatus:
          OrderItemResponseStatus;

        if (
          availableNumber <= 0
        ) {
          responseStatus =
            'unavailable';
        } else if (
          availableNumber <
          requested
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
          note,
          user.id
        );

        await loadOrder();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Unable to save response.'
        );
      } finally {
        setSavingItem(null);
      }
    };

  const changeStatus =
    async (
      nextStatus: OrderStatus
    ) => {
      if (!order) return;

      try {
        const user =
          await getCurrentUser();

        if (
          nextStatus === 'accepted'
        ) {
          await acceptOrder(
            order.id,
            user.id,
            'butchery'
          );
        }

        if (
          nextStatus === 'processing'
        ) {
          await startOrderProcessing(
            order.id,
            user.id,
            'butchery'
          );
        }

        if (
          nextStatus === 'ready'
        ) {
          await markOrderReady(
            order.id,
            user.id,
            'butchery'
          );
        }

        await loadOrder();
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : 'Unable to update order.'
        );
      }
    };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center">
        <h2 className="font-bold text-slate-900">
          Order not found
        </h2>

        <button
          onClick={() =>
            navigate(
              '/butchery/orders'
            )
          }
          className="mt-4 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Back to Order Center
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            onClick={() =>
              navigate(
                '/butchery/orders'
              )
            }
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Order Center
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">
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

        <div className="flex flex-wrap gap-2">
          {order.status ===
            'pending' && (
            <button
              onClick={() =>
                changeStatus(
                  'accepted'
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Check className="h-4 w-4" />
              Accept Order
            </button>
          )}

          {order.status ===
            'accepted' && (
            <button
              onClick={() =>
                changeStatus(
                  'processing'
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <ChefHat className="h-4 w-4" />
              Start Processing
            </button>
          )}

          {order.status ===
            'processing' && (
            <button
              onClick={() =>
                changeStatus(
                  'ready'
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700"
            >
              <PackageCheck className="h-4 w-4" />
              Mark Ready
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          {message}
        </div>
      )}

      {/* Meta */}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-slate-400" />

            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Requested By
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {order.creator
                  ?.full_name ||
                  order.department}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-slate-400" />

            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
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
            <Clock3 className="h-5 w-5 text-slate-400" />

            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">
                Last Updated
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {new Date(
                  order.updated_at
                ).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-bold text-slate-900">
            Fulfilment Review
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Review requested quantities
            and tell the ordering department
            what Butchery can fulfil.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {order.items?.map(
            (item) => (
              <ItemResponse
                key={item.id}
                item={item}
                saving={
                  savingItem === item.id
                }
                onSave={
                  updateItemResponse
                }
              />
            )
          )}
        </div>
      </div>

      {/* Notes */}

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

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {order.notes}
              </p>
            </div>
          )}

          {order.delivery_info && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-bold text-slate-900">
                Delivery / Collection
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {order.delivery_info}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}

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

        <div className="space-y-6">
          {order.status_history
            ?.slice()
            .reverse()
            .map((history) => (
              <div
                key={history.id}
                className="relative flex gap-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <CircleDot className="h-4 w-4 text-slate-500" />
                </div>

                <div className="min-w-0">
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
                      <span className="font-semibold">
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
      </div>
    </div>
  );
}

function ItemResponse({
  item,
  saving,
  onSave,
}: {
  item: NonNullable<Order['items']>[number];
  saving: boolean;
  onSave: (
    itemId: string,
    requested: number,
    available: string,
    accepted: string,
    note: string
  ) => void;
}) {
  const [available, setAvailable] =
    useState(
      item.available_quantity ??
        item.quantity
    );

  const [accepted, setAccepted] =
    useState(
      item.accepted_quantity ??
        item.quantity
    );

  const [note, setNote] =
    useState(
      item.butchery_note || ''
    );

  useEffect(() => {
    setAvailable(
      item.available_quantity ??
        item.quantity
    );

    setAccepted(
      item.accepted_quantity ??
        item.quantity
    );

    setNote(
      item.butchery_note || ''
    );
  }, [
    item.available_quantity,
    item.accepted_quantity,
    item.butchery_note,
  ]);

  return (
    <div className="p-6">
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
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
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
              <strong>Request note:</strong>{' '}
              {item.notes}
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Available
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={available}
              onChange={(e) =>
                setAvailable(
                  Number(
                    e.target.value
                  )
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <label>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Fulfil
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              max={Number(available)}
              value={accepted}
              onChange={(e) =>
                setAccepted(
                  Number(
                    e.target.value
                  )
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 font-semibold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Butchery response
            </span>

            <input
              value={note}
              onChange={(e) =>
                setNote(e.target.value)
              }
              placeholder="e.g. We can provide 18kg today. Remaining 2kg tomorrow."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </label>

          <button
            disabled={saving}
            onClick={() =>
              onSave(
                item.id,
                Number(item.quantity),
                String(available),
                String(accepted),
                note
              )
            }
            className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Saving...
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