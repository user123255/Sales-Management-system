
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Clock, ChefHat, Package, CheckCircle, ListOrdered } from 'lucide-react';
import { fetchOrders, getOrderStats, subscribeToOrders } from '../services/orders';
import { OrderTable } from '../components/OrderTable';
import { OrderCard } from '../components/OrderCard';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { EmptyState } from '../components/EmptyState';
import type { Order } from '../types/database';

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
      className={`rounded-xl border bg-white p-5 shadow-sm ${
        highlight ? 'border-amber-300 ring-2 ring-amber-100' : 'border-border'
      }`}
    >
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

export function ButcheryDashboard() {
  const [stats, setStats] = useState({
    newOrders: 0,
    pending: 0,
    processing: 0,
    ready: 0,
    completedToday: 0,
  });
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [orderStats, allOrders] = await Promise.all([
        getOrderStats(),
        fetchOrders(),
      ]);
      setStats({
        newOrders: orderStats.pending,
        pending: orderStats.pending,
        processing: orderStats.processing,
        ready: orderStats.ready,
        completedToday: orderStats.completedToday,
      });

      const activeOrders = allOrders.filter(
        (o) => !['completed', 'cancelled'].includes(o.status)
      );
      setOrders(activeOrders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeToOrders((order) => {
      if (order.status === 'pending' && order.id !== lastOrderId) {
        setLastOrderId(order.id);
        window.alert(`New Order Received: ${order.order_number}`);
      }
      loadData();
    });
    return unsub;
  }, [lastOrderId]);

  if (loading) return <LoadingSpinner message="Loading dashboard..." className="py-20" />;

  const pendingOrders = orders.filter((o) => o.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Butchery Dashboard</h1>
          <p className="text-sm text-text-muted">Real-time order queue</p>
        </div>
        <Link
          to="/butchery/queue"
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <ListOrdered className="h-4 w-4" />
          Order Queue
        </Link>
      </div>

      {pendingOrders.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-center gap-3">
          <Bell className="h-5 w-5 text-amber-600 animate-pulse" />
          <p className="text-sm font-medium text-amber-800">
            {pendingOrders.length} new order{pendingOrders.length > 1 ? 's' : ''} waiting for acceptance
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label="New Orders" value={stats.newOrders} icon={Bell} color="bg-amber-100 text-amber-600" highlight={stats.newOrders > 0} />
        <StatCard label="Pending" value={stats.pending} icon={Clock} color="bg-blue-100 text-blue-600" />
        <StatCard label="Processing" value={stats.processing} icon={ChefHat} color="bg-indigo-100 text-indigo-600" />
        <StatCard label="Ready" value={stats.ready} icon={Package} color="bg-purple-100 text-purple-600" />
        <StatCard label="Completed Today" value={stats.completedToday} icon={CheckCircle} color="bg-green-100 text-green-600" />
      </div>

      <div className="hidden md:block">
        <h2 className="text-lg font-semibold mb-4">Order Queue</h2>
        {orders.length > 0 ? (
          <OrderTable orders={orders} basePath="/butchery" highlightNew />
        ) : (
          <EmptyState
            title="No active orders"
            description="New orders from Finance will appear here instantly."
          />
        )}
      </div>

      <div className="md:hidden">
        <h2 className="text-lg font-semibold mb-4">Order Queue</h2>
        {orders.length > 0 ? (
          <div className="grid gap-3">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                basePath="/butchery"
                isNew={order.status === 'pending'}
              />
            ))}
          </div>
        ) : (
          <EmptyState title="No active orders" description="Orders will appear here in real-time." />
        )}
      </div>
    </div>
  );
}
