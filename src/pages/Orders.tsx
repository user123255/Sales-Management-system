import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Search,
  RefreshCw,
  Eye,
} from 'lucide-react';

import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import type {
  Order,
  OrderStatus,
} from '../types/database';

import {
  fetchOrders,
  subscribeToOrders,
} from '../services/orders';

import { useAuth } from '../lib/auth';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

export default function Orders() {
  const { profile } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState('');
  const [status, setStatus] =
    useState<OrderStatus | ''>('');

  /*
   * This page can be used from both the normal
   * Orders section and the Butchery Order Center.
   *
   * The destination must therefore match the
   * section from which the user opened the order.
   */
  const isButcheryOrdersPage =
    location.pathname.startsWith(
      '/butchery/orders'
    );

  const getOrderDetailsPath = useCallback(
    (orderId: string) => {
      if (isButcheryOrdersPage) {
        return `/butchery/orders/${orderId}`;
      }

      return `/orders/${orderId}`;
    },
    [isButcheryOrdersPage]
  );

  /*
   * Load orders from Supabase.
   */
  const loadOrders = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const data = await fetchOrders({
          department:
            profile?.department || undefined,

          search:
            search.trim() || undefined,

          status:
            status || undefined,
        });

        setOrders(
          Array.isArray(data)
            ? data
            : []
        );
      } catch (error) {
        console.error(
          'Unable to load orders:',
          error
        );

        setOrders([]);
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [
      profile?.department,
      search,
      status,
    ]
  );

  /*
   * Initial load and filter changes.
   *
   * Debouncing prevents Supabase from receiving
   * a request for every individual keystroke.
   */
  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadOrders(true);
      }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadOrders]);

  /*
   * Realtime updates.
   *
   * Important:
   * The subscription is intentionally kept separate
   * from the initial fetch.
   */
  useEffect(() => {
    const unsubscribe =
      subscribeToOrders(
        (updatedOrder) => {
          const matchesDepartment =
            !profile?.department ||
            updatedOrder.department ===
              profile.department;

          const matchesStatus =
            !status ||
            updatedOrder.status ===
              status;

          const searchValue =
            search
              .trim()
              .toLowerCase();

          const matchesSearch =
            !searchValue ||
            String(
              updatedOrder.order_number || ''
            )
              .toLowerCase()
              .includes(searchValue) ||
            String(
              updatedOrder.customer_name || ''
            )
              .toLowerCase()
              .includes(searchValue) ||
            String(
              updatedOrder.department || ''
            )
              .toLowerCase()
              .includes(searchValue);

          /*
           * If the updated order no longer matches
           * the current filters, remove it.
           */
          if (
            !matchesDepartment ||
            !matchesStatus ||
            !matchesSearch
          ) {
            setOrders((current) =>
              current.filter(
                (order) =>
                  order.id !==
                  updatedOrder.id
              )
            );

            return;
          }

          /*
           * Otherwise insert or replace it.
           */
          setOrders((current) => {
            const index =
              current.findIndex(
                (order) =>
                  order.id ===
                  updatedOrder.id
              );

            if (index === -1) {
              return [
                updatedOrder,
                ...current,
              ];
            }

            const next = [
              ...current,
            ];

            next[index] =
              updatedOrder;

            return next;
          });
        },

        (deletedOrderId) => {
          setOrders((current) =>
            current.filter(
              (order) =>
                order.id !==
                deletedOrderId
            )
          );
        }
      );

    return () => {
      unsubscribe();
    };
  }, [
    profile?.department,
    search,
    status,
  ]);

  /*
   * Manual refresh.
   */
  const refresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await loadOrders(false);
    } finally {
      setRefreshing(false);
    }
  };

  /*
   * Open the correct details route.
   */
  const openOrder = (
    orderId: string
  ) => {
    if (!orderId) {
      console.error(
        'Cannot open order: missing order ID'
      );

      return;
    }

    navigate(
      getOrderDetailsPath(orderId)
    );
  };

  return (
    <div className="soms-page space-y-6">
      {/* Header */}
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
            View, search, and track orders
            across the system.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void refresh()
          }
          className="soms-button soms-button-secondary"
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? 'animate-spin'
                : ''
            }
          />

          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="soms-filter-bar">
        <div className="relative">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search order number or customer..."
            className="soms-input pl-10"
          />
        </div>

        <select
          value={status}
          onChange={(event) =>
            setStatus(
              event.target
                .value as
                | OrderStatus
                | ''
            )
          }
          className="soms-input"
        >
          <option value="">
            All statuses
          </option>

          <option value="pending">
            Pending
          </option>

          <option value="accepted">
            Accepted
          </option>

          <option value="processing">
            Processing
          </option>

          <option value="ready">
            Ready
          </option>

          <option value="completed">
            Completed
          </option>

          <option value="cancelled">
            Cancelled
          </option>
        </select>
      </div>

      {/* Orders */}
      <div className="soms-table-wrapper">
        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description={
              search || status
                ? 'There are no orders matching your current filters.'
                : 'No orders have been created yet.'
            }
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
              {orders.map(
                (order) => (
                  <tr
                    key={order.id}
                  >
                    <td>
                      <strong className="text-slate-900">
                        #
                        {
                          order.order_number
                        }
                      </strong>
                    </td>

                    <td>
                      {order.department ||
                        '—'}
                    </td>

                    <td>
                      {order.customer_name ||
                        '—'}
                    </td>

                    <td>
                      {Number(
                        order.total || 0
                      ).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }
                      )}
                    </td>

                    <td>
                      <StatusBadge
                        status={
                          order.status
                        }
                      />
                    </td>

                    <td>
                      {order.created_at
                        ? new Date(
                            order.created_at
                          ).toLocaleDateString()
                        : '—'}
                    </td>

                    <td>
                      <button
                        type="button"
                        onClick={() =>
                          openOrder(
                            order.id
                          )
                        }
                        disabled={
                          !order.id
                        }
                        className="soms-button soms-button-secondary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Eye
                          size={15}
                        />

                        View
                      </button>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}