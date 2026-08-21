
import { useCallback, useEffect, useState } from 'react';
import { Search, RefreshCw, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../lib/auth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

type OrderStatus = 'pending' | 'accepted' | 'processing' | 'ready' | 'completed' | 'cancelled';

type OrderRecord = {
  id: string;
  order_number: string;
  department: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  customer_name?: string | null;
};

export default function Orders() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);

      setOrders([]);
    } catch (error) {
      console.error('Unable to load orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.department, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOrders();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadOrders]);

  async function refresh() {
    setRefreshing(true);

    try {
      await loadOrders();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="soms-page space-y-6">
      <div className="soms-page-header">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="soms-page-title">
              Orders
            </h1>

            <span className="soms-live">
              <span className="soms-live-dot" />
              Live
            </span>
          </div>

          <p className="soms-page-description">
          </p>
        </div>

        <button
          type="button"
          onClick={refresh}
          className="soms-button soms-button-secondary"
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? 'animate-spin' : ''}
          />

          Refresh
        </button>
      </div>

      <div className="soms-filter-bar">
        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder= "Search order number or customer..."
            className="soms-input pl-10"
          />
        </div>

        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value)
          }
          className="soms-input"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="processing">Processing</option>
          <option value="ready">Ready</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className="soms-table-wrapper">
        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="There are no orders matching your current filters."
          />
        ) : (
          <table className="soms-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Department</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong className="text-slate-900">
                      #{order.order_number}
                    </strong>
                  </td>

                  <td>
                    {order.department}
                  </td>

                  <td>
                    {order.customer_name || '—'}
                  </td>

                  <td>
                    {Number(order.total || 0).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }
                    )}
                  </td>

                  <td>
                    <StatusBadge status={order.status} />
                  </td>

                  <td>
                    {new Date(
                      order.created_at
                    ).toLocaleDateString()}
                  </td>

                  <td>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/orders/${order.id}`
                        )
                      }
                      className="soms-button soms-button-secondary"
                    >
                      <Eye size={15} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}