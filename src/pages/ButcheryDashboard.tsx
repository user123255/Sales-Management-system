import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Clock,
  ChefHat,
  Package,
  CheckCircle,
  ListOrdered,
  RefreshCw,
  Eye,
  Play,
  Check,
  XCircle,
} from 'lucide-react';

import {
  fetchOrders,
  getOrderStats,
  subscribeToOrders,
  updateOrderStatus,
} from '../services/orders';

import { useAuth } from '../lib/auth';
import { OrderTable } from '../components/OrderTable';
import { OrderCard } from '../components/OrderCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';

import type { Order, OrderStatus } from '../types/database';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 shadow-sm transition-all ${
        highlight
          ? 'border-amber-300 ring-2 ring-amber-100'
          : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">{label}</p>

          <p className="mt-1 text-2xl font-bold text-text">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export function ButcheryDashboard() {
  const { profile } = useAuth();

  const [stats, setStats] = useState({
    newOrders: 0,
    pending: 0,
    processing: 0,
    ready: 0,
    completedToday: 0,
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  /**
   * Load dashboard data.
   *
   * Important:
   * We do NOT clear the existing orders before fetching.
   * This prevents the dashboard from appearing empty while
   * Supabase is loading.
   */
  const loadData = useCallback(
    async (showSpinner = false) => {
      try {
        if (showSpinner) {
          setLoading(true);
        }

        setError(null);

        const [orderStats, allOrders] = await Promise.all([
          getOrderStats('butchery'),
          fetchOrders({
            department: undefined,
          }),
        ]);

        setStats({
          newOrders: orderStats.pending,
          pending: orderStats.pending,
          processing: orderStats.processing,
          ready: orderStats.ready,
          completedToday: orderStats.completedToday,
        });

        const activeOrders = allOrders.filter(
          (order) =>
            !['completed', 'cancelled'].includes(order.status)
        );

        setOrders(activeOrders);
      } catch (err) {
        console.error(
          'Butchery dashboard failed to load:',
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : 'Unable to load orders. Please try again.';

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /**
   * Initial dashboard load.
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) return;
      await loadData(true);
    };

    void initialize();

    return () => {
      mounted = false;
    };
  }, [loadData]);

  /**
   * Supabase realtime subscription.
   *
   * IMPORTANT:
   * We subscribe only once.
   *
   * The previous implementation subscribed again every time
   * lastOrderId changed, which could create multiple realtime
   * subscriptions and make the dashboard slow/unreliable.
   */
  useEffect(() => {
    const unsubscribe = subscribeToOrders((updatedOrder) => {
      setOrders((currentOrders) => {
        const isActive = ![
          'completed',
          'cancelled',
        ].includes(updatedOrder.status);

        const existingIndex = currentOrders.findIndex(
          (order) => order.id === updatedOrder.id
        );

        /**
         * Order is no longer active.
         * Remove it from the active queue.
         */
        if (!isActive) {
          if (existingIndex === -1) {
            return currentOrders;
          }

          return currentOrders.filter(
            (order) => order.id !== updatedOrder.id
          );
        }

        /**
         * Existing order was updated.
         */
        if (existingIndex !== -1) {
          const next = [...currentOrders];
          next[existingIndex] = updatedOrder;

          return next.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );
        }

        /**
         * New order arrived.
         */
        return [updatedOrder, ...currentOrders];
      });

      /**
       * Refresh statistics without replacing the visible
       * order list with a loading state.
       */
      void loadData(false);
    });

    return unsubscribe;
  }, [loadData]);

  /**
   * Manual refresh.
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData(false);
  };

  /**
   * Update order status directly from the Butchery dashboard.
   */
  const handleStatusChange = async (
    order: Order,
    newStatus: OrderStatus
  ) => {
    if (!profile?.id) {
      setError(
        'Your user profile could not be found. Please log in again.'
      );
      return;
    }

    if (updatingOrderId) {
      return;
    }

    const confirmationMessage =
      newStatus === 'cancelled'
        ? `Are you sure you want to cancel Order #${order.order_number}?`
        : `Change Order #${order.order_number} to ${newStatus}?`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    try {
      setUpdatingOrderId(order.id);
      setError(null);

      await updateOrderStatus(
        order.id,
        newStatus,
        profile.id,
        profile.department,
        getStatusComment(newStatus)
      );

      /**
       * Update the UI immediately instead of waiting for
       * realtime.
       */
      if (
        newStatus === 'completed' ||
        newStatus === 'cancelled'
      ) {
        setOrders((current) =>
          current.filter(
            (currentOrder) => currentOrder.id !== order.id
          )
        );
      } else {
        setOrders((current) =>
          current.map((currentOrder) =>
            currentOrder.id === order.id
              ? {
                  ...currentOrder,
                  status: newStatus,
                  updated_at: new Date().toISOString(),
                }
              : currentOrder
          )
        );
      }

      /**
       * Refresh statistics in the background.
       */
      void loadData(false);
    } catch (err) {
      console.error(
        'Unable to update order status:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update the order status.'
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  /**
   * Human-readable comments saved into the order history.
   */
  const getStatusComment = (
    status: OrderStatus
  ): string => {
    switch (status) {
      case 'accepted':
        return 'Order accepted by Butchery.';

      case 'processing':
        return 'Butchery started processing this order.';

      case 'ready':
        return 'Order is ready for collection or delivery.';

      case 'completed':
        return 'Order completed by Butchery.';

      case 'cancelled':
        return 'Order cancelled by Butchery.';

      default:
        return `Order status changed to ${status}.`;
    }
  };

  if (loading) {
    return (
      <LoadingSpinner
        message="Loading Butchery dashboard..."
        className="py-20"
      />
    );
  }

  const pendingOrders = orders.filter(
    (order) => order.status === 'pending'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text">
              Butchery Dashboard
            </h1>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Live
            </span>
          </div>

          <p className="text-sm text-text-muted">
            Real-time order queue and fulfilment management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-text transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />

            Refresh
          </button>

          <Link
            to="/butchery/queue"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            <ListOrdered className="h-4 w-4" />
            Order Queue
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div>
            <p className="font-semibold text-red-800">
              Unable to load dashboard
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setError(null);
              void loadData(true);
            }}
            className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* New orders notification */}
      {pendingOrders.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <Bell className="h-5 w-5 animate-pulse text-amber-600" />

          <p className="text-sm font-medium text-amber-800">
            {pendingOrders.length} new order
            {pendingOrders.length > 1 ? 's' : ''} waiting
            for acceptance.
          </p>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="New Orders"
          value={stats.newOrders}
          icon={Bell}
          color="bg-amber-100 text-amber-600"
          highlight={stats.newOrders > 0}
        />

        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          color="bg-blue-100 text-blue-600"
        />

        <StatCard
          label="Processing"
          value={stats.processing}
          icon={ChefHat}
          color="bg-indigo-100 text-indigo-600"
        />

        <StatCard
          label="Ready"
          value={stats.ready}
          icon={Package}
          color="bg-purple-100 text-purple-600"
        />

        <StatCard
          label="Completed Today"
          value={stats.completedToday}
          icon={CheckCircle}
          color="bg-green-100 text-green-600"
        />
      </div>

      {/* Desktop order queue */}
      <div className="hidden md:block">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              Order Queue
            </h2>

            <p className="text-sm text-text-muted">
              Manage incoming orders and update their status.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {orders.length} active
          </span>
        </div>

        {orders.length > 0 ? (
          <div className="space-y-4">
            <OrderTable
              orders={orders}
              basePath="/butchery"
              highlightNew
            />

            {/* Quick status controls */}
            <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
              <div className="border-b border-border bg-slate-50 px-5 py-3">
                <h3 className="text-sm font-semibold text-text">
                  Quick Order Status Management
                </h3>
              </div>

              <div className="divide-y divide-border">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-text">
                        #{order.order_number}
                      </p>

                      <p className="text-sm text-text-muted">
                        {order.customer_name ||
                          order.department ||
                          'Department order'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/butchery/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-text transition hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>

                      {order.status === 'pending' && (
                        <button
                          type="button"
                          disabled={
                            updatingOrderId === order.id
                          }
                          onClick={() =>
                            void handleStatusChange(
                              order,
                              'accepted'
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept
                        </button>
                      )}

                      {order.status === 'accepted' && (
                        <button
                          type="button"
                          disabled={
                            updatingOrderId === order.id
                          }
                          onClick={() =>
                            void handleStatusChange(
                              order,
                              'processing'
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Start Processing
                        </button>
                      )}

                      {order.status === 'processing' && (
                        <button
                          type="button"
                          disabled={
                            updatingOrderId === order.id
                          }
                          onClick={() =>
                            void handleStatusChange(
                              order,
                              'ready'
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
                        >
                          <Package className="h-3.5 w-3.5" />
                          Mark Ready
                        </button>
                      )}

                      {order.status === 'ready' && (
                        <button
                          type="button"
                          disabled={
                            updatingOrderId === order.id
                          }
                          onClick={() =>
                            void handleStatusChange(
                              order,
                              'completed'
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Complete
                        </button>
                      )}

                      {![
                        'completed',
                        'cancelled',
                      ].includes(order.status) && (
                        <button
                          type="button"
                          disabled={
                            updatingOrderId === order.id
                          }
                          onClick={() =>
                            void handleStatusChange(
                              order,
                              'cancelled'
                            )
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      )}

                      {updatingOrderId === order.id && (
                        <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No active orders"
            description="New orders from Finance and other departments will appear here automatically."
          />
        )}
      </div>

      {/* Mobile order queue */}
      <div className="md:hidden">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Order Queue
          </h2>

          <p className="text-sm text-text-muted">
            Manage incoming orders.
          </p>
        </div>

        {orders.length > 0 ? (
          <div className="grid gap-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-border bg-white p-3 shadow-sm"
              >
                <OrderCard
                  order={order}
                  basePath="/butchery"
                  isNew={order.status === 'pending'}
                />

                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  <Link
                    to={`/butchery/orders/${order.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </Link>

                  {order.status === 'pending' && (
                    <button
                      type="button"
                      disabled={
                        updatingOrderId === order.id
                      }
                      onClick={() =>
                        void handleStatusChange(
                          order,
                          'accepted'
                        )
                      }
                      className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Accept
                    </button>
                  )}

                  {order.status === 'accepted' && (
                    <button
                      type="button"
                      disabled={
                        updatingOrderId === order.id
                      }
                      onClick={() =>
                        void handleStatusChange(
                          order,
                          'processing'
                        )
                      }
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Start Processing
                    </button>
                  )}

                  {order.status === 'processing' && (
                    <button
                      type="button"
                      disabled={
                        updatingOrderId === order.id
                      }
                      onClick={() =>
                        void handleStatusChange(
                          order,
                          'ready'
                        )
                      }
                      className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Mark Ready
                    </button>
                  )}

                  {order.status === 'ready' && (
                    <button
                      type="button"
                      disabled={
                        updatingOrderId === order.id
                      }
                      onClick={() =>
                        void handleStatusChange(
                          order,
                          'completed'
                        )
                      }
                      className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Complete
                    </button>
                  )}

                  {![
                    'completed',
                    'cancelled',
                  ].includes(order.status) && (
                    <button
                      type="button"
                      disabled={
                        updatingOrderId === order.id
                      }
                      onClick={() =>
                        void handleStatusChange(
                          order,
                          'cancelled'
                        )
                      }
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No active orders"
            description="Orders will appear here automatically when submitted."
          />
        )}
      </div>
    </div>
  );
}

export default ButcheryDashboard;