import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardList,
  Clock3,
  PackagePlus,
  RefreshCw,
  ShoppingCart,
  Truck,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../lib/auth';

import {
  fetchOrders,
  getOrderStats,
  subscribeToOrders,
} from '../services/orders';

import type { Order } from '../types/database';

export function OtherDepartmentDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);

  const [stats, setStats] = useState({
    ordersToday: 0,
    pending: 0,
    accepted: 0,
    processing: 0,
    ready: 0,
    completed: 0,
    completedToday: 0,
    totalSales: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /*
   * Department is kept as a string because profiles in the
   * current application may contain different department
   * values.
   */
  const department = String(
    profile?.department || 'other'
  );

  const departmentName = useMemo(() => {
    const normalized = department.toLowerCase();

    if (normalized === 'finance') {
      return 'Finance';
    }

    if (normalized === 'butchery') {
      return 'Butchery';
    }

    return department
      ? department.charAt(0).toUpperCase() +
          department.slice(1)
      : 'Other';
  }, [department]);

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  const loadDashboard = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        /*
         * fetchOrders expects FetchOrdersFilters.
         *
         * IMPORTANT:
         * Do not pass the department string directly.
         */
        const filters = {
          department,
        };

        const [ordersData, statsData] =
          await Promise.all([
            fetchOrders(filters),
            getOrderStats(department),
          ]);

        setOrders(ordersData);
        setStats(statsData);
      } catch (error) {
        console.error(
          'Failed to load department dashboard:',
          error
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [department]
  );

  /* =======================================================
     INITIAL LOAD + REALTIME
  ======================================================= */

  useEffect(() => {
    void loadDashboard();

    const unsubscribe = subscribeToOrders(
      (updatedOrder) => {
        const updatedDepartment = String(
          updatedOrder.department || ''
        ).toLowerCase();

        if (
          updatedDepartment !==
          department.toLowerCase()
        ) {
          return;
        }

        setOrders((current) => {
          const exists = current.some(
            (order) =>
              order.id === updatedOrder.id
          );

          if (exists) {
            return current.map((order) =>
              order.id === updatedOrder.id
                ? updatedOrder
                : order
            );
          }

          return [
            updatedOrder,
            ...current,
          ];
        });

        void loadDashboard(true);
      },
      (deletedId) => {
        setOrders((current) =>
          current.filter(
            (order) =>
              order.id !== deletedId
          )
        );

        void loadDashboard(true);
      }
    );

    return unsubscribe;
  }, [department, loadDashboard]);

  /* =======================================================
     RECENT ORDERS
  ======================================================= */

  const recentOrders = useMemo(() => {
    return [...orders]
      .sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      )
      .slice(0, 6);
  }, [orders]);

  /* =======================================================
     FORMATTING
  ======================================================= */

  const formatCurrency = (
    value: number
  ) => {
    return new Intl.NumberFormat(
      'en-US',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }
    ).format(value);
  };

  const formatDate = (
    value: string
  ) => {
    return new Date(value).toLocaleString(
      [],
      {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  const statusClass = (
    status: string
  ) => {
    switch (
      status.toLowerCase()
    ) {
      case 'completed':
        return 'bg-emerald-50 text-emerald-700';

      case 'ready':
        return 'bg-blue-50 text-blue-700';

      case 'processing':
        return 'bg-amber-50 text-amber-700';

      case 'accepted':
        return 'bg-indigo-50 text-indigo-700';

      case 'cancelled':
        return 'bg-red-50 text-red-700';

      case 'pending':
        return 'bg-slate-100 text-slate-700';

      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-900 to-blue-700 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                Department Workspace
              </span>

              <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Live
              </span>
            </div>

            <h1 className="text-2xl font-bold sm:text-3xl">
              {departmentName} Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-blue-100 sm:text-base">
              Welcome back,{' '}
              {profile?.full_name ||
                'User'}
              . Manage your departmental
              orders, monitor fulfilment
              and keep track of your
              team's activity.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadDashboard(true)
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Refresh
          </button>
        </div>
      </section>

      {/* STATISTICS */}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Today's Orders"
          value={stats.ordersToday}
          icon={
            <ShoppingCart className="h-5 w-5" />
          }
          iconClass="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Pending"
          value={stats.pending}
          icon={
            <Clock3 className="h-5 w-5" />
          }
          iconClass="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Processing"
          value={stats.processing}
          icon={
            <PackagePlus className="h-5 w-5" />
          }
          iconClass="bg-indigo-50 text-indigo-600"
        />

        <StatCard
          title="Ready"
          value={stats.ready}
          icon={
            <Truck className="h-5 w-5" />
          }
          iconClass="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Completed"
          value={stats.completed}
          icon={
            <CheckCircle2 className="h-5 w-5" />
          }
          iconClass="bg-emerald-50 text-emerald-600"
        />
      </section>

      {/* MAIN CONTENT */}

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* RECENT ORDERS */}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                Recent Orders
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest orders from your
                department.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate('/other/orders')
              }
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View all
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="flex min-h-[280px] flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 rounded-full bg-blue-50 p-4">
                <ClipboardList className="h-7 w-7 text-blue-600" />
              </div>

              <h3 className="font-semibold text-slate-900">
                No orders yet
              </h3>

              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Create your first
                departmental order to
                start tracking activity
                here.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate(
                    '/other/orders/create'
                  )
                }
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Create Order
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOrders.map(
                (order) => (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() =>
                      navigate(
                        `/other/orders/${order.id}`
                      )
                    }
                    className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">
                          #
                          {
                            order.order_number
                          }
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClass(
                            order.status
                          )}`}
                        >
                          {
                            order.status
                          }
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatDate(
                          order.created_at
                        )}
                      </p>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-slate-900">
                        {formatCurrency(
                          Number(
                            order.total ||
                              0
                          )
                        )}
                      </p>

                      <p className="text-xs text-slate-500">
                        {order.items
                          ?.length ||
                          0}{' '}
                        item(s)
                      </p>
                    </div>
                  </button>
                )
              )}
            </div>
          )}
        </div>

        {/* QUICK ACTIONS */}

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="font-semibold text-slate-900">
              Quick Actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Common departmental
              tasks.
            </p>
          </div>

          <div className="grid gap-3">
            <QuickAction
              icon={<ShoppingCart />}
              title="Create Order"
              description="Create a new departmental order"
              onClick={() =>
                navigate(
                  '/other/orders/create'
                )
              }
            />

            <QuickAction
              icon={<ClipboardList />}
              title="View Orders"
              description="View and manage your orders"
              onClick={() =>
                navigate('/other/orders')
              }
            />

            <QuickAction
              icon={<Clock3 />}
              title="Order History"
              description="Review previous orders"
              onClick={() =>
                navigate(
                  '/other/orders/history'
                )
              }
            />

            <QuickAction
              icon={<Bell />}
              title="Notifications"
              description="Check order updates"
              onClick={() =>
                navigate(
                  '/other/notifications'
                )
              }
            />
          </div>
        </div>
      </section>

      {/* SUMMARY */}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard
          label="Completed Today"
          value={stats.completedToday}
          description="Orders completed today"
        />

        <SummaryCard
          label="Accepted"
          value={stats.accepted}
          description="Orders accepted for processing"
        />

        <SummaryCard
          label="Department Order Value"
          value={formatCurrency(
            stats.totalSales
          )}
          description="Total value of visible orders"
        />
      </section>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`rounded-xl p-3 ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-200 hover:bg-blue-50"
    >
      <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 group-hover:bg-blue-100">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-slate-500">
          {description}
        </p>
      </div>

      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" />
    </button>
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number | string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

export default OtherDepartmentDashboard;