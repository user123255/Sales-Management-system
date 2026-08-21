
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  DollarSign,
  Users,
  PlusCircle,
  TrendingUp,
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
import { fetchOrders, getOrderStats, subscribeToOrders } from '../services/orders';
import { getSalesChartData } from '../services/reports';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import { formatCurrency } from '../lib/utils';
import type { Order } from '../types/database';

function OrderTable({ orders, basePath }: { orders: Order[]; basePath: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Order</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Customer</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Status</th>
            <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="px-4 py-3 text-sm text-text">
                <Link className="text-primary-600 hover:underline" to={`${basePath}/orders/${order.id}`}>
                  {order.order_number ?? order.id}
                </Link>
              </td>
              <td className="px-4 py-3 text-sm text-text-muted">{order.customer_name ?? '—'}</td>
              <td className="px-4 py-3 text-sm text-text-muted">{order.status ?? '—'}</td>
              <td className="px-4 py-3 text-right text-sm font-medium text-text">{formatCurrency(order.total ?? 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-muted">{label}</p>
          <p className="mt-1 text-2xl font-bold text-text">{value}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export function FinanceDashboard() {
  const [stats, setStats] = useState({
    ordersToday: 0,
    pending: 0,
    processing: 0,
    completed: 0,
    totalSales: 0,
  });
  const [outstanding, setOutstanding] = useState(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [chartData, setChartData] = useState<{ date: string; sales: number; orders: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const calculateOutstanding = (orders: Order[]) =>
    orders.reduce((sum, order) => {
      const status = (order.status ?? '').toLowerCase();
      if (status === 'completed' || status === 'paid') return sum;
      return sum + (order.total ?? 0);
    }, 0);

  const loadData = async () => {
    try {
      const [orderStats, orders, salesChart] = await Promise.all([
        getOrderStats('finance'),
        fetchOrders(),
        getSalesChartData(7),
      ]);
      setStats(orderStats);
      setRecentOrders(orders.slice(0, 10));
      setOutstanding(calculateOutstanding(orders));
      setChartData(salesChart);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToOrders(() => loadData());
    return unsub;
  }, []);

  if (loading) return <LoadingSpinner message="Loading dashboard..." className="py-20" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Finance Dashboard</h1>
          <p className="text-sm text-text-muted">Overview of orders and sales</p>
        </div>
        <Link
          to="/finance/create-order"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          <PlusCircle className="h-4 w-4" />
          Create Order
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Orders Today" value={stats.ordersToday} icon={ShoppingCart} color="bg-blue-100 text-blue-600" />
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="bg-amber-100 text-amber-600" />
        <StatCard label="Processing" value={stats.processing} icon={TrendingUp} color="bg-indigo-100 text-indigo-600" />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle} color="bg-green-100 text-green-600" />
        <StatCard label="Total Sales" value={formatCurrency(stats.totalSales)} icon={DollarSign} color="bg-primary-100 text-primary-600" />
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} icon={Users} color="bg-red-100 text-red-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Sales (Last 7 Days)</h2>
          {chartData.some((d) => d.sales > 0 || d.orders > 0) ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="sales" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="No sales data yet" description="Completed orders will appear here." />
          )}
        </div>

        <div className="rounded-xl border border-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-text-muted">Pending Orders</span>
              <span className="font-semibold text-amber-600">{stats.pending}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-text-muted">In Processing</span>
              <span className="font-semibold text-indigo-600">{stats.processing}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-text-muted">Completed Total</span>
              <span className="font-semibold text-green-600">{stats.completed}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-text-muted">Outstanding Debt</span>
              <span className="font-semibold text-red-600">{formatCurrency(outstanding)}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <Link to="/finance/history" className="text-sm text-primary-600 hover:underline">
            View all
          </Link>
        </div>
        {recentOrders.length > 0 ? (
          <OrderTable orders={recentOrders} basePath="/finance" />
        ) : (
          <EmptyState
            title="No orders yet"
            description="Orders created by your department will appear here."
            action={
              <Link
                to="/finance/create-order"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white"
              >
                <PlusCircle className="h-4 w-4" />
                Create your first order
              </Link>
            }
          />
        )}
      </div>
    </div>
  );
}
