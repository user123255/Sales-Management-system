import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Clock,
  CheckCircle2,
  DollarSign,
  Users,
  PlusCircle,
  TrendingUp,
  FileText,
  Package,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import {
  fetchOrders,
  getOrderStats,
  subscribeToOrders,
} from '../services/orders';

import { getSalesChartData } from '../services/reports';

import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { formatCurrency } from '../lib/utils';

import type { Order } from '../types/database';

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{
    className?: string;
  }>;
  iconClass: string;
}) {
  return (
    <div
      className="
        rounded-2xl
        border border-slate-200
        bg-white p-5
        shadow-sm
        transition
        hover:-translate-y-0.5
        hover:shadow-md
        dark:border-slate-700
        dark:bg-slate-900
      "
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>

          <p className="mt-2 truncate text-2xl font-black text-slate-900 dark:text-white">
            {value}
          </p>
        </div>

        <div
          className={`
            flex h-12 w-12 shrink-0
            items-center justify-center
            rounded-xl
            ${iconClass}
          `}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   QUICK STAT
========================================================= */

function QuickStat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div
      className="
        flex items-center justify-between
        gap-3 rounded-xl
        border border-slate-200
        bg-slate-50 px-3 py-2.5
        dark:border-slate-700
        dark:bg-slate-800/60
      "
    >
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {label}
      </span>

      <span
        className={`
          text-base font-black
          ${valueClass || 'text-slate-900 dark:text-white'}
        `}
      >
        {value}
      </span>
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
}: {
  to: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="
        group flex items-center gap-3
        rounded-xl
        border border-slate-200
        bg-white p-4
        transition
        hover:border-[#7A1F2B]/30
        hover:bg-[#7A1F2B]/5
        dark:border-slate-700
        dark:bg-slate-900
        dark:hover:bg-slate-800
      "
    >
      <div
        className="
          flex h-10 w-10 shrink-0
          items-center justify-center
          rounded-xl
          bg-[#7A1F2B]/10
          text-[#7A1F2B]
          dark:text-rose-400
        "
      >
        <Icon className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900 dark:text-white">
          {title}
        </p>

        <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <ArrowRight
        className="
          h-4 w-4
          text-slate-300
          transition
          group-hover:translate-x-1
          group-hover:text-[#7A1F2B]
        "
      />
    </Link>
  );
}

/* =========================================================
   FINANCE DASHBOARD
========================================================= */

export function FinanceDashboard() {
  const [stats, setStats] = useState({
    ordersToday: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    totalSales: 0,
  });

  const [outstanding, setOutstanding] =
    useState(0);

  const [chartData, setChartData] =
    useState<
      {
        date: string;
        sales: number;
        orders: number;
      }[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  /* =====================================================
     CALCULATE OUTSTANDING
  ===================================================== */

  const calculateOutstanding = (
    orders: Order[]
  ) =>
    orders.reduce(
      (sum, order) => {
        const status =
          String(order.status || '')
            .toLowerCase();

        if (
          status === 'completed' ||
          status === 'cancelled'
        ) {
          return sum;
        }

        return (
          sum +
          Number(order.total || 0)
        );
      },
      0
    );

  /* =====================================================
     LOAD DATA
  ===================================================== */

  const loadData = useCallback(
    async (
      showRefresh = false
    ) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        }

        const [
          orderStats,
          orders,
          salesChart,
        ] = await Promise.all([
          getOrderStats('finance'),
          fetchOrders(),
          getSalesChartData(7),
        ]);

        setStats(orderStats);

        setOutstanding(
          calculateOutstanding(
            orders
          )
        );

        setChartData(
          salesChart
        );
      } catch (error) {
        console.error(
          'FINANCE DASHBOARD ERROR:',
          error
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  /* =====================================================
     INITIAL LOAD + REALTIME
  ===================================================== */

  useEffect(() => {
    void loadData();

    const unsubscribe =
      subscribeToOrders(() => {
        void loadData();
      });

    return () => {
      unsubscribe();
    };
  }, [loadData]);

  /* =====================================================
     LOADING
  ===================================================== */

  if (loading) {
    return (
      <LoadingSpinner
        message="Loading Finance Dashboard..."
        className="py-20"
      />
    );
  }

  /* =====================================================
     UI
  ===================================================== */

  return (
    <div
      className="
        mx-auto max-w-7xl
        space-y-6 pb-10
        text-slate-900
        dark:text-slate-100
      "
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <section
        className="
          relative overflow-hidden
          rounded-2xl
          bg-gradient-to-br
          from-[#5A1620]
          via-[#7A1F2B]
          to-[#941F34]
          p-6 text-white
          shadow-xl
          shadow-[#7A1F2B]/15
        "
      >
        <div
          className="
            absolute -right-16 -top-16
            h-48 w-48
            rounded-full
            bg-white/10
            blur-3xl
          "
        />

        <div
          className="
            absolute -bottom-20 left-1/3
            h-48 w-48
            rounded-full
            bg-rose-300/10
            blur-3xl
          "
        />

        <div
          className="
            relative flex flex-col
            gap-5
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
          <div>
            <div
              className="
                mb-2 flex items-center
                gap-2 text-rose-100
              "
            >
              <DollarSign className="h-5 w-5" />

              <span className="text-sm font-semibold">
                Finance Overview
              </span>
            </div>

            <h1 className="text-2xl font-black sm:text-3xl">
              Finance Dashboard
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-rose-50">
              Monitor orders, sales, outstanding
              balances and financial activity
              across the business.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void loadData(true)
              }
              disabled={refreshing}
              className="
                inline-flex items-center
                gap-2 rounded-xl
                border border-white/20
                bg-white/10
                px-4 py-2.5
                text-sm font-semibold
                text-white
                backdrop-blur
                transition
                hover:bg-white/20
                disabled:opacity-60
              "
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

            <Link
              to="/finance/create-order"
              className="
                inline-flex items-center
                gap-2 rounded-xl
                bg-white
                px-4 py-2.5
                text-sm font-bold
                text-[#7A1F2B]
                shadow-lg
                transition
                hover:bg-rose-50
              "
            >
              <PlusCircle className="h-4 w-4" />
              Create Order
            </Link>
          </div>
        </div>
      </section>

      {/* =================================================
          STAT CARDS
      ================================================= */}

      <div
        className="
          grid grid-cols-1 gap-4
          sm:grid-cols-2
          lg:grid-cols-3
          xl:grid-cols-6
        "
      >
        <StatCard
          label="Orders Today"
          value={stats.ordersToday}
          icon={ShoppingCart}
          iconClass="bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
        />

        <StatCard
          label="Pending"
          value={stats.pending}
          icon={Clock}
          iconClass="bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
        />

        <StatCard
          label="Processing"
          value={stats.processing}
          icon={TrendingUp}
          iconClass="bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400"
        />

        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
        />

        <StatCard
          label="Total Sales"
          value={formatCurrency(
            stats.totalSales
          )}
          icon={DollarSign}
          iconClass="bg-[#7A1F2B]/10 text-[#7A1F2B] dark:text-rose-400"
        />

        <StatCard
          label="Outstanding"
          value={formatCurrency(
            outstanding
          )}
          icon={Users}
          iconClass="bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400"
        />
      </div>

      {/* =================================================
          QUICK ACTIONS
      ================================================= */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-black text-slate-900 dark:text-white">
            Quick Actions
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Quickly access the areas you use most.
          </p>
        </div>

        <div
          className="
            grid grid-cols-1 gap-3
            sm:grid-cols-2
            lg:grid-cols-4
          "
        >
          <QuickAction
            to="/finance/create-order"
            icon={PlusCircle}
            title="Create Order"
            description="Create a new department order"
          />

          <QuickAction
            to="/finance/debtors"
            icon={Users}
            title="Debtors"
            description="View outstanding customer balances"
          />

          <QuickAction
            to="/finance/invoices"
            icon={FileText}
            title="Invoices"
            description="Manage invoices and payments"
          />

          <QuickAction
            to="/finance/inventory"
            icon={Package}
            title="Products & Inventory"
            description="View available products and stock"
          />
        </div>
      </section>

      {/* =================================================
          CHART + QUICK STATS
      ================================================= */}

      <div
        className="
          grid grid-cols-1 gap-6
          lg:grid-cols-3
        "
      >
        {/* SALES CHART */}

        <div
          className="
            lg:col-span-2
            rounded-2xl
            border border-slate-200
            bg-white p-6
            shadow-sm
            dark:border-slate-700
            dark:bg-slate-900
          "
        >
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Sales Overview
              </h2>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Sales activity for the last 7 days.
              </p>
            </div>

            <div
              className="
                rounded-lg
                bg-emerald-100
                p-2
                text-emerald-600
                dark:bg-emerald-950/40
                dark:text-emerald-400
              "
            >
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          {chartData.some(
            (item) =>
              item.sales > 0 ||
              item.orders > 0
          ) ? (
            <ResponsiveContainer
              width="100%"
              height={280}
            >
              <BarChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 10,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  opacity={0.2}
                />

                <XAxis
                  dataKey="date"
                  tick={{
                    fontSize: 11,
                  }}
                  tickFormatter={(value) =>
                    String(
                      value
                    ).slice(5)
                  }
                  stroke="#94a3b8"
                />

                <YAxis
                  tick={{
                    fontSize: 11,
                  }}
                  stroke="#94a3b8"
                />

                <Tooltip
                  formatter={(
                    value
                  ) =>
                    formatCurrency(
                      Number(value)
                    )
                  }
                />

                <Bar
                  dataKey="sales"
                  fill="#7A1F2B"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState
              title="No sales data yet"
              description="Completed orders will appear here."
            />
          )}
        </div>

        {/* QUICK STATS */}

        <div
          className="
            rounded-2xl
            border border-slate-200
            bg-white p-6
            shadow-sm
            dark:border-slate-700
            dark:bg-slate-900
          "
        >
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-900 dark:text-white">
              Quick Stats
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Current financial activity.
            </p>
          </div>

          <div className="space-y-1">
            <QuickStat
              label="Pending Orders"
              value={String(
                stats.pending
              )}
              valueClass="text-amber-600 dark:text-amber-400"
            />

            <QuickStat
              label="In Processing"
              value={String(
                stats.processing
              )}
              valueClass="text-indigo-600 dark:text-indigo-400"
            />

            <QuickStat
              label="Completed"
              value={String(
                stats.completed
              )}
              valueClass="text-emerald-600 dark:text-emerald-400"
            />

            <QuickStat
              label="Outstanding Debt"
              value={formatCurrency(
                outstanding
              )}
              valueClass="text-red-600 dark:text-red-400"
            />
          </div>

          {outstanding > 0 && (
            <Link
              to="/finance/debtors"
              className="
                mt-5 flex items-center
                justify-between
                rounded-xl
                bg-red-50 p-3
                text-sm font-semibold
                text-red-700
                transition
                hover:bg-red-100
                dark:bg-red-950/30
                dark:text-red-300
                dark:hover:bg-red-950/50
              "
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Review outstanding debt
              </span>

              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
      

      