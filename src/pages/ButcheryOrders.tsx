import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  RefreshCw,
  Clock3,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  XCircle,
  Eye,
  Radio,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  fetchOrders,
  subscribeToOrders,
} from '../services/orders';

import type {
  Order,
  OrderStatus,
} from '../types/database';

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

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function QueueCard({
  label,
  value,
  icon: Icon,
  active,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{
    className?: string;
  }>;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
        active
          ? 'border-amber-300 ring-2 ring-amber-100'
          : 'border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
          <Icon className="h-6 w-6 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

export function ButcheryOrders() {
  const navigate = useNavigate();

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [activeFilter, setActiveFilter] =
    useState<'all' | OrderStatus>('all');

  const loadOrders = async () => {
    try {
      setLoading(true);

      const data =
        await fetchOrders();

      setOrders(data);
    } catch (error) {
      console.error(
        'Unable to load orders:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    const unsubscribe =
      subscribeToOrders(() => {
        loadOrders();
      });

    return unsubscribe;
  }, []);

  const filteredOrders =
    useMemo(() => {
      let result = orders;

      if (activeFilter !== 'all') {
        result = result.filter(
          (order) =>
            order.status ===
            activeFilter
        );
      }

      if (search.trim()) {
        const query =
          search
            .toLowerCase()
            .trim();

        result = result.filter(
          (order) =>
            order.order_number
              .toLowerCase()
              .includes(query) ||
            order.department
              .toLowerCase()
              .includes(query) ||
            order.customer_name
              ?.toLowerCase()
              .includes(query)
        );
      }

      return result;
    }, [
      orders,
      search,
      activeFilter,
    ]);

  const pending = orders.filter(
    (o) => o.status === 'pending'
  ).length;

  const accepted = orders.filter(
    (o) => o.status === 'accepted'
  ).length;

  const processing = orders.filter(
    (o) => o.status === 'processing'
  ).length;

  const ready = orders.filter(
    (o) => o.status === 'ready'
  ).length;

  return (
    <div className="min-h-full bg-slate-50">
      <div className="space-y-6 p-1">
        {/* Header */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Radio className="h-3.5 w-3.5 animate-pulse" />
                LIVE
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Order Center
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage incoming requests,
              production and fulfilment
              in real time.
            </p>
          </div>

          <button
            onClick={loadOrders}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Queue */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <button
            onClick={() =>
              setActiveFilter('pending')
            }
            className="text-left"
          >
            <QueueCard
              label="New Requests"
              value={pending}
              icon={Clock3}
              active={
                activeFilter ===
                'pending'
              }
            />
          </button>

          <button
            onClick={() =>
              setActiveFilter('accepted')
            }
            className="text-left"
          >
            <QueueCard
              label="Accepted"
              value={accepted}
              icon={CheckCircle2}
              active={
                activeFilter ===
                'accepted'
              }
            />
          </button>

          <button
            onClick={() =>
              setActiveFilter(
                'processing'
              )
            }
            className="text-left"
          >
            <QueueCard
              label="Processing"
              value={processing}
              icon={ChefHat}
              active={
                activeFilter ===
                'processing'
              }
            />
          </button>

          <button
            onClick={() =>
              setActiveFilter('ready')
            }
            className="text-left"
          >
            <QueueCard
              label="Ready"
              value={ready}
              icon={PackageCheck}
              active={
                activeFilter ===
                'ready'
              }
            />
          </button>
        </div>

        {/* Search */}

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search order number, department or customer..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <button
              onClick={() =>
                setActiveFilter('all')
              }
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'border border-slate-200 bg-white text-slate-700'
              }`}
            >
              All Orders
            </button>
          </div>
        </div>

        {/* Orders */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Fulfilment Queue
                </h2>

                <p className="text-sm text-slate-500">
                  {filteredOrders.length}{' '}
                  order
                  {filteredOrders.length !==
                  1
                    ? 's'
                    : ''}{' '}
                  shown
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : filteredOrders.length ===
            0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <XCircle className="h-7 w-7 text-slate-400" />
              </div>

              <h3 className="mt-4 font-semibold text-slate-900">
                No orders found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                New orders will appear
                here automatically.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredOrders.map(
                (order) => (
                  <button
                    key={order.id}
                    onClick={() =>
                      navigate(
                        `/butchery/orders/${order.id}`
                      )
                    }
                    className="group w-full px-6 py-5 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">
                          {order.order_number
                            .slice(-3)}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="font-bold text-slate-900">
                              #
                              {
                                order.order_number
                              }
                            </h3>

                            <StatusBadge
                              status={
                                order.status
                              }
                            />
                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            {order.department
                              .charAt(
                                0
                              )
                              .toUpperCase() +
                              order.department.slice(
                                1
                              )}{' '}
                            ·{' '}
                            {order.items
                              ?.length ||
                              0}{' '}
                            item
                            {(order
                              .items
                              ?.length ||
                              0) !== 1
                              ? 's'
                              : ''}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Submitted{' '}
                            {new Date(
                              order.created_at
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="hidden text-right sm:block">
                          <p className="text-xs font-medium text-slate-400">
                            REQUESTED
                          </p>

                          <p className="mt-1 font-semibold text-slate-800">
                            {order.items?.reduce(
                              (
                                total,
                                item
                              ) =>
                                total +
                                Number(
                                  item.quantity
                                ),
                              0
                            ) || 0}{' '}
                            units
                          </p>
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 transition group-hover:bg-blue-600 group-hover:text-white">
                          <Eye className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}