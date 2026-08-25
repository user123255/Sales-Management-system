import {
  useCallback,
  useEffect,
  useState,
  type ComponentType,
} from 'react';

import { Link } from 'react-router-dom';

import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Boxes,
  Check,
  CheckCircle,
  ChefHat,
  Clock,
  Eye,
  ListOrdered,
  Package,
  Play,
  PlusCircle,
  RefreshCw,
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

import type {
  Order,
  OrderStatus,
} from '../types/database';


/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  highlight,
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        'rounded-2xl border p-5 shadow-sm transition-all',
        'bg-white dark:bg-slate-900',
        'border-slate-200 dark:border-slate-800',
        'hover:-translate-y-0.5 hover:shadow-md',
        highlight
          ? 'border-amber-300 ring-2 ring-amber-100 dark:border-amber-500/50 dark:ring-amber-500/10'
          : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
  iconClass,
}: {
  to: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  iconClass: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-primary-500/50"
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900 dark:text-white">
          {title}
        </p>

        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-primary-600" />
    </Link>
  );
}


/* =========================================================
   BUTCHERY DASHBOARD
========================================================= */

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

  const [updatingOrderId, setUpdatingOrderId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);


  /* =======================================================
     SORT ORDERS
  ======================================================= */

  const sortOrders = useCallback(
    (orderList: Order[]) => {
      return [...orderList].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
    },
    []
  );


  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadData = useCallback(
    async (showSpinner = false) => {
      try {
        if (showSpinner) {
          setLoading(true);
        }

        setError(null);

        /*
         * IMPORTANT:
         *
         * Do NOT use getOrderStats('butchery').
         *
         * The order.department field represents the department
         * that CREATED the order.
         *
         * Butchery needs to see incoming orders from all
         * departments.
         */

        const [orderStats, allOrders] =
          await Promise.all([
            getOrderStats(),
            fetchOrders(),
          ]);


        /* -----------------------------------------------
           Calculate today's completed orders
        ------------------------------------------------ */

        const today = new Date();

        const startOfToday = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate()
        );

        const endOfToday = new Date(
          today.getFullYear(),
          today.getMonth(),
          today.getDate() + 1
        );


        const completedToday =
          allOrders.filter((order) => {
            if (order.status !== 'completed') {
              return false;
            }

            const completedDate = order.completed_at
              ? new Date(order.completed_at)
              : new Date(order.updated_at);

            return (
              completedDate >= startOfToday &&
              completedDate < endOfToday
            );
          }).length;


        setStats({
          newOrders: orderStats.pending,

          pending: orderStats.pending,

          processing: orderStats.processing,

          ready: orderStats.ready,

          completedToday,
        });


        /*
         * Butchery dashboard only shows active orders.
         */

        const activeOrders =
          allOrders.filter(
            (order) =>
              order.status !== 'completed' &&
              order.status !== 'cancelled'
          );


        setOrders(
          sortOrders(activeOrders)
        );

      } catch (err) {
        console.error(
          'Butchery dashboard failed to load:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load orders. Please try again.'
        );

      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [sortOrders]
  );


  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    void loadData(true);
  }, [loadData]);


  /* =======================================================
     REALTIME ORDERS
  ======================================================= */

  useEffect(() => {
    const unsubscribe =
      subscribeToOrders(
        /*
         * CREATE / UPDATE
         */
        (updatedOrder) => {
          setOrders((currentOrders) => {
            const isActive =
              updatedOrder.status !== 'completed' &&
              updatedOrder.status !== 'cancelled';


            const existingIndex =
              currentOrders.findIndex(
                (order) =>
                  order.id === updatedOrder.id
              );


            /*
             * If completed/cancelled, remove it
             * immediately from the dashboard.
             */

            if (!isActive) {
              return currentOrders.filter(
                (order) =>
                  order.id !== updatedOrder.id
              );
            }


            /*
             * Existing order.
             */

            if (existingIndex !== -1) {
              const next = [
                ...currentOrders,
              ];

              next[existingIndex] =
                updatedOrder;

              return sortOrders(next);
            }


            /*
             * New order.
             */

            return sortOrders([
              updatedOrder,
              ...currentOrders,
            ]);
          });


          /*
           * Refresh statistics.
           */

          void loadData(false);
        },


        /*
         * DELETE
         */
        (deletedOrderId) => {
          setOrders((currentOrders) =>
            currentOrders.filter(
              (order) =>
                order.id !== deletedOrderId
            )
          );

          void loadData(false);
        }
      );


    return unsubscribe;
  }, [loadData, sortOrders]);


  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    await loadData(false);
  };


  /* =======================================================
     STATUS COMMENT
  ======================================================= */

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


  /* =======================================================
     CHANGE STATUS
  ======================================================= */

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


    if (
      !window.confirm(
        confirmationMessage
      )
    ) {
      return;
    }


    try {
      setUpdatingOrderId(order.id);

      setError(null);


      await updateOrderStatus(
        order.id,
        newStatus,
        profile.id,
        profile.department || 'BUTCHERY',
        getStatusComment(newStatus)
      );


      /*
       * Update UI immediately instead of waiting
       * for realtime.
       */

      if (
        newStatus === 'completed' ||
        newStatus === 'cancelled'
      ) {
        setOrders((currentOrders) =>
          currentOrders.filter(
            (currentOrder) =>
              currentOrder.id !== order.id
          )
        );

      } else {
        setOrders((currentOrders) =>
          sortOrders(
            currentOrders.map(
              (currentOrder) =>
                currentOrder.id === order.id
                  ? {
                      ...currentOrder,
                      status: newStatus,
                      updated_at:
                        new Date().toISOString(),
                      completed_at: currentOrder.completed_at,
                    }
                  : currentOrder
            )
          )
        );
      }


      /*
       * Refresh statistics.
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


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <LoadingSpinner
        message="Loading Butchery dashboard..."
        className="py-20"
      />
    );
  }


  const pendingOrders =
    orders.filter(
      (order) =>
        order.status === 'pending'
    );


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-full space-y-6 bg-slate-50 dark:bg-slate-950">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>
          <div className="flex flex-wrap items-center gap-3">

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Butchery Dashboard
            </h1>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>

          </div>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage orders, production, products and inventory
            in real time.
          </p>
        </div>


        <div className="flex flex-wrap items-center gap-2">

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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


          <Link
            to="/butchery/queue"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
          >
            <ListOrdered className="h-4 w-4" />

            Order Queue
          </Link>

        </div>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">

          <div className="flex gap-3">

            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

            <div>

              <p className="font-semibold text-red-800 dark:text-red-300">
                Unable to load dashboard
              </p>

              <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                {error}
              </p>

            </div>

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


      {/* =================================================
          NEW ORDER ALERT
      ================================================= */}

      {pendingOrders.length > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-700/50 dark:bg-amber-950/20">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/10">

              <Bell className="h-5 w-5 animate-pulse text-amber-600 dark:text-amber-400" />

            </div>


            <div>

              <p className="font-semibold text-amber-900 dark:text-amber-300">
                New orders waiting
              </p>

              <p className="text-sm text-amber-800 dark:text-amber-400">
                {pendingOrders.length}{' '}
                order
                {pendingOrders.length > 1
                  ? 's are'
                  : ' is'}{' '}
                waiting for acceptance.
              </p>

            </div>

          </div>


          <Link
            to="/butchery/queue"
            className="hidden rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 sm:inline-flex"
          >
            Review
          </Link>

        </div>
      )}


      {/* =================================================
          STATISTICS
      ================================================= */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">

        <StatCard
          label="New Orders"
          value={stats.newOrders}
          icon={Bell}
          color="bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          highlight={stats.newOrders > 0}
        />


        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          color="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
        />


        <StatCard
          label="Processing"
          value={stats.processing}
          icon={ChefHat}
          color="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
        />


        <StatCard
          label="Ready"
          value={stats.ready}
          icon={Package}
          color="bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
        />


        <StatCard
          label="Completed Today"
          value={stats.completedToday}
          icon={CheckCircle}
          color="bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400"
        />

      </div>


      {/* =================================================
          BUTCHERY MANAGEMENT
      ================================================= */}

      <section>

        <div className="mb-4">

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Butchery Management
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage orders, products and stock from one place.
          </p>

        </div>


        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <QuickAction
            to="/butchery/queue"
            icon={ListOrdered}
            title="Order Queue"
            description="View and process incoming orders"
            iconClass="bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
          />


          <QuickAction
            to="/butchery/products"
            icon={Package}
            title="Products"
            description="Manage available butchery products"
            iconClass="bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400"
          />


          <QuickAction
            to="/butchery/inventory"
            icon={Boxes}
            title="Inventory"
            description="Stock products and monitor quantities"
            iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          />


          <QuickAction
            to="/butchery/products/new"
            icon={PlusCircle}
            title="Add Product"
            description="Add a new product to the catalogue"
            iconClass="bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          />

        </div>

      </section>


      {/* =================================================
          DESKTOP ORDER QUEUE
      ================================================= */}

      <section className="hidden md:block">

        <div className="mb-4 flex items-center justify-between">

          <div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Order Queue
            </h2>

            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage incoming orders and update their status.
            </p>

          </div>


          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {orders.length} active
          </span>

        </div>


        {orders.length > 0 ? (
          <div className="space-y-4">

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

              <OrderTable
                orders={orders}
                basePath="/butchery"
                highlightNew
              />

            </div>


            {/* ===========================================
                QUICK STATUS MANAGEMENT
            =========================================== */}

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">

              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/50">

                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Quick Order Status Management
                </h3>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Update orders without opening the order details page.
                </p>

              </div>


              <div className="divide-y divide-slate-200 dark:divide-slate-800">

                {orders.map((order) => (

                  <div
                    key={order.id}
                    className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >

                    <div className="min-w-0">

                      <p className="font-semibold text-slate-900 dark:text-white">
                        #{order.order_number}
                      </p>

                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {order.customer_name ||
                          order.department ||
                          'Department order'}
                      </p>

                      <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {order.status}
                      </span>

                    </div>


                    <div className="flex flex-wrap items-center gap-2">

                      <Link
                        to={`/butchery/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
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
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
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
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
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
                          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
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
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Complete
                        </button>
                      )}


                      {order.status !== 'completed' &&
                        order.status !== 'cancelled' && (
                          <button
                            type="button"
                            disabled={
                              updatingOrderId ===
                              order.id
                            }
                            onClick={() =>
                              void handleStatusChange(
                                order,
                                'cancelled'
                              )
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
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

          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

            <EmptyState
              title="No active orders"
              description="New orders from Finance and other departments will appear here automatically."
            />

          </div>

        )}

      </section>


      {/* =================================================
          MOBILE ORDER QUEUE
      ================================================= */}

      <section className="md:hidden">

        <div className="mb-4">

          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Order Queue
          </h2>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage incoming orders.
          </p>

        </div>


        {orders.length > 0 ? (

          <div className="grid gap-3">

            {orders.map((order) => (

              <div
                key={order.id}
                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >

                <OrderCard
                  order={order}
                  basePath="/butchery"
                  isNew={
                    order.status === 'pending'
                  }
                />


                <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">

                  <Link
                    to={`/butchery/orders/${order.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
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


                  {order.status !== 'completed' &&
                    order.status !== 'cancelled' && (
                      <button
                        type="button"
                        disabled={
                          updatingOrderId ===
                          order.id
                        }
                        onClick={() =>
                          void handleStatusChange(
                            order,
                            'cancelled'
                          )
                        }
                        className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50 dark:bg-red-950/20 dark:text-red-400"
                      >
                        Cancel
                      </button>
                    )}

                </div>

              </div>

            ))}

          </div>

        ) : (

          <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">

            <EmptyState
              title="No active orders"
              description="Orders will appear here automatically when submitted."
            />

          </div>

        )}

      </section>

    </div>
  );
}


export default ButcheryDashboard;