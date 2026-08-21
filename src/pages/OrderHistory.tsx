
import { useCallback, useEffect, useState } from 'react';
import {
  History,
  RefreshCw,
  Search,
} from 'lucide-react';

import type { OrderStatus } from '../types/database';

import { fetchOrders } from '../services/orders';
import { useAuth } from '../lib/auth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

type HistoryOrder = {
  id: string;
  order_number: string;
  department: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  updated_at?: string;
};

export default function OrderHistory() {
  const { profile } = useAuth();

  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);

      const data = await fetchOrders({
        department:
          profile?.department || undefined,
        search: search || undefined,
      });

      setOrders(data as HistoryOrder[]);
    } catch (error) {
      console.error(
        'Unable to load order history:',
        error
      );

      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.department, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [loadHistory]);

  return (
    <div className="soms-page space-y-6">
      <div className="soms-page-header">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <History
              size={23}
              className="text-blue-600"
            />

            <h1 className="soms-page-title">
              Order History
            </h1>
          </div>

          <p className="soms-page-description">
            Review previous orders and order activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadHistory()}
          className="soms-button soms-button-secondary"
        >
          <RefreshCw size={16} />
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
            className="soms-input pl-10"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search order history..."
          />
        </div>
      </div>

      <div className="soms-table-wrapper">
        {loading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No order history"
            description="Previous orders will appear here once they are created."
          />
        ) : (
          <table className="soms-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Department</th>
                <th>Status</th>
                <th>Total</th>
                <th>Created</th>
                <th>Last Updated</th>
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

                  <td>{order.department}</td>

                  <td>
                  <StatusBadge status={order.status as OrderStatus} />                 
                   </td>

                  <td>
                    {Number(
                      order.total || 0
                    ).toLocaleString(
                      undefined,
                      {
                        minimumFractionDigits: 2,
                      }
                    )}
                  </td>

                  <td>
                    {new Date(
                      order.created_at
                    ).toLocaleString()}
                  </td>

                  <td>
                    {order.updated_at
                      ? new Date(
                          order.updated_at
                        ).toLocaleString()
                      : '—'}
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