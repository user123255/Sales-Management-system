import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  Package,
  RefreshCw,
  User,
  Building2,
  FileText,
  AlertCircle,
} from 'lucide-react';

import {
  fetchOrderById,
  subscribeToOrderItems,
  subscribeToOrderStatus,
} from '../services/orders';

import type {
  Order,
  OrderItem,
  OrderStatusHistory,
} from '../types/database';

/* =========================================================
   HELPERS
========================================================= */

function formatStatus(status?: string) {
  if (!status) return 'Unknown';

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
  );
}

function statusClass(status?: string) {
  switch (status) {
    case 'pending':
      return 'bg-amber-50 text-amber-700 border-amber-200';

    case 'accepted':
      return 'bg-blue-50 text-blue-700 border-blue-200';

    case 'processing':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';

    case 'ready':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';

    case 'completed':
      return 'bg-green-50 text-green-700 border-green-200';

    case 'cancelled':
      return 'bg-red-50 text-red-700 border-red-200';

    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
}

function formatMoney(value?: number | string | null) {
  const amount = Number(value ?? 0);

  return amount.toFixed(2);
}

/* =========================================================
   PAGE
========================================================= */

export function OrderDetails() {
  const navigate = useNavigate();

  const { id } = useParams<{
    id: string;
  }>();

  const [order, setOrder] =
    useState<Order | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* =======================================================
     LOAD ORDER
  ======================================================= */

  async function loadOrder(
    showRefresh = false
  ) {
    if (!id) {
      setError('Order ID is missing.');
      setLoading(false);
      return;
    }

    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const result =
        await fetchOrderById(id);

      if (!result) {
        setOrder(null);
        setError(
          'The order could not be found, or you do not have permission to view it.'
        );
        return;
      }

      setOrder(result);
    } catch (err) {
      console.error(
        'Unable to load order details:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load order details.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    void loadOrder();
  }, [id]);

  /* =======================================================
     REALTIME ORDER ITEMS
  ======================================================= */

  useEffect(() => {
    if (!id) {
      return;
    }

    const unsubscribe =
      subscribeToOrderItems(
        id,
        () => {
          void loadOrder(true);
        }
      );

    return unsubscribe;
  }, [id]);

  /* =======================================================
     REALTIME STATUS HISTORY
  ======================================================= */

  useEffect(() => {
    if (!id) {
      return;
    }

    const unsubscribe =
      subscribeToOrderStatus(
        id,
        () => {
          void loadOrder(true);
        }
      );

    return unsubscribe;
  }, [id]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="soms-page">
        <div
          className="soms-card"
          style={{
            padding: 60,
            textAlign: 'center',
          }}
        >
          <RefreshCw
            size={34}
            className="animate-spin"
            style={{
              margin: '0 auto 16px',
            }}
          />

          <h2>Loading order...</h2>

          <p
            style={{
              marginTop: 8,
              color: 'var(--slate-500)',
            }}
          >
            Please wait while we load the
            complete order details.
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error || !order) {
    return (
      <div className="soms-page">
        <div
          className="soms-page-header"
          style={{
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            className="soms-button soms-button-secondary"
            onClick={() =>
              navigate('/orders')
            }
          >
            <ArrowLeft size={17} />
            Back to Orders
          </button>
        </div>

        <div
          className="soms-card"
          style={{
            padding: 60,
            textAlign: 'center',
          }}
        >
          <AlertCircle
            size={46}
            style={{
              margin: '0 auto 16px',
              opacity: 0.6,
            }}
          />

          <h2>Order not found</h2>

          <p
            style={{
              marginTop: 8,
              color: 'var(--slate-500)',
            }}
          >
            {error ||
              'The order may have been deleted, or you may not have permission to view it.'}
          </p>

          <div
            style={{
              marginTop: 24,
            }}
          >
            <button
              type="button"
              className="soms-button soms-button-primary"
              onClick={() =>
                navigate('/orders')
              }
            >
              Back to Order Center
            </button>
          </div>
        </div>
      </div>
    );
  }

  const items =
    (order.items || []) as OrderItem[];

  const history =
    (order.status_history ||
      []) as OrderStatusHistory[];

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="soms-page">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="soms-page-header">
        <div>
          <button
            type="button"
            className="soms-button soms-button-secondary"
            onClick={() =>
              navigate('/orders')
            }
            style={{
              marginBottom: 14,
            }}
          >
            <ArrowLeft size={17} />
            Back to Orders
          </button>

          <h1 className="soms-page-title">
            Order Details
          </h1>

          <p className="soms-page-description">
            Complete information and activity
            for this order.
          </p>
        </div>

        <button
          type="button"
          className="soms-button soms-button-secondary"
          onClick={() =>
            void loadOrder(true)
          }
          disabled={refreshing}
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? 'animate-spin'
                : ''
            }
          />

          {refreshing
            ? 'Refreshing...'
            : 'Refresh'}
        </button>
      </div>

      {/* ===================================================
          ORDER SUMMARY
      =================================================== */}

      <div
        className="soms-card"
        style={{
          marginBottom: 20,
        }}
      >
        <div className="soms-card-header">
          <div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: 'var(--slate-500)',
                textTransform:
                  'uppercase',
                letterSpacing:
                  '0.05em',
              }}
            >
              Order Number
            </span>

            <h2
              style={{
                marginTop: 5,
                fontSize: 24,
                fontWeight: 800,
              }}
            >
              #{order.order_number}
            </h2>
          </div>

          <span
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-semibold ${statusClass(
              order.status
            )}`}
          >
            {formatStatus(
              order.status
            )}
          </span>
        </div>

        <div className="soms-card-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 20,
            }}
          >
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color:
                    'var(--slate-500)',
                  fontSize: 13,
                }}
              >
                <Building2 size={16} />
                Department
              </div>

              <strong
                style={{
                  display: 'block',
                  marginTop: 6,
                }}
              >
                {order.department ||
                  '—'}
              </strong>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color:
                    'var(--slate-500)',
                  fontSize: 13,
                }}
              >
                <User size={16} />
                Customer
              </div>

              <strong
                style={{
                  display: 'block',
                  marginTop: 6,
                }}
              >
                {order.customer_name ||
                  '—'}
              </strong>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color:
                    'var(--slate-500)',
                  fontSize: 13,
                }}
              >
                <Calendar size={16} />
                Created
              </div>

              <strong
                style={{
                  display: 'block',
                  marginTop: 6,
                }}
              >
                {formatDate(
                  order.created_at
                )}
              </strong>
            </div>

            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color:
                    'var(--slate-500)',
                  fontSize: 13,
                }}
              >
                <Package size={16} />
                Total
              </div>

              <strong
                style={{
                  display: 'block',
                  marginTop: 6,
                  fontSize: 20,
                }}
              >
                {formatMoney(
                  order.total
                )}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================
          CREATOR
      =================================================== */}

      <div
        className="soms-card"
        style={{
          marginBottom: 20,
        }}
      >
        <div className="soms-card-header">
          <div>
            <h3>Order Information</h3>
          </div>

          <FileText size={21} />
        </div>

        <div className="soms-card-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20,
            }}
          >
            <div>
              <span className="soms-stat-label">
                CREATED BY
              </span>

              <div
                style={{
                  marginTop: 7,
                  fontWeight: 600,
                }}
              >
                {order.creator
                  ?.full_name ||
                  '—'}
              </div>
            </div>

            <div>
              <span className="soms-stat-label">
                EMAIL
              </span>

              <div
                style={{
                  marginTop: 7,
                  fontWeight: 600,
                }}
              >
                {order.creator
                  ?.email ||
                  '—'}
              </div>
            </div>

            <div>
              <span className="soms-stat-label">
                DEPARTMENT
              </span>

              <div
                style={{
                  marginTop: 7,
                  fontWeight: 600,
                }}
              >
                {order.creator
                  ?.department ||
                  order.department ||
                  '—'}
              </div>
            </div>

            <div>
              <span className="soms-stat-label">
                DELIVERY
              </span>

              <div
                style={{
                  marginTop: 7,
                  fontWeight: 600,
                }}
              >
                {order.delivery_info ||
                  '—'}
              </div>
            </div>
          </div>

          {order.notes && (
            <div
              style={{
                marginTop: 24,
                padding: 16,
                borderRadius: 10,
                background:
                  'var(--slate-50)',
              }}
            >
              <strong>Notes</strong>

              <p
                style={{
                  marginTop: 6,
                  color:
                    'var(--slate-600)',
                }}
              >
                {order.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================
          ORDER ITEMS
      =================================================== */}

      <div
        className="soms-card"
        style={{
          marginBottom: 20,
        }}
      >
        <div className="soms-card-header">
          <div>
            <h3>Order Items</h3>

            <p
              style={{
                marginTop: 4,
                color:
                  'var(--slate-500)',
                fontSize: 13,
              }}
            >
              Products requested and
              Butchery responses.
            </p>
          </div>

          <Package size={21} />
        </div>

        <div className="soms-card-body">
          {items.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color:
                  'var(--slate-500)',
              }}
            >
              No items found for this
              order.
            </div>
          ) : (
            <div
              style={{
                overflowX: 'auto',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse:
                    'collapse',
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        textAlign: 'left',
                        padding: 12,
                      }}
                    >
                      Product
                    </th>

                    <th
                      style={{
                        textAlign: 'left',
                        padding: 12,
                      }}
                    >
                      Quantity
                    </th>

                    <th
                      style={{
                        textAlign: 'left',
                        padding: 12,
                      }}
                    >
                      Unit
                    </th>

                    <th
                      style={{
                        textAlign: 'left',
                        padding: 12,
                      }}
                    >
                      Price
                    </th>

                    <th
                      style={{
                        textAlign: 'left',
                        padding: 12,
                      }}
                    >
                      Response
                    </th>

                    <th
                      style={{
                        textAlign: 'left',
                        padding: 12,
                      }}
                    >
                      Fulfilled
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {items.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                        style={{
                          borderTop:
                            '1px solid var(--slate-200)',
                        }}
                      >
                        <td
                          style={{
                            padding: 12,
                            fontWeight: 600,
                          }}
                        >
                          {
                            item.product_name
                          }

                          {item.packaging && (
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                color:
                                  'var(--slate-500)',
                              }}
                            >
                              Packaging:{' '}
                              {
                                item.packaging
                              }
                            </div>
                          )}
                        </td>

                        <td
                          style={{
                            padding: 12,
                          }}
                        >
                          {
                            item.quantity
                          }
                        </td>

                        <td
                          style={{
                            padding: 12,
                          }}
                        >
                          {item.unit ||
                            '—'}
                        </td>

                        <td
                          style={{
                            padding: 12,
                          }}
                        >
                          {formatMoney(
                            item.price
                          )}
                        </td>

                        <td
                          style={{
                            padding: 12,
                          }}
                        >
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                              item.response_status
                            )}`}
                          >
                            {formatStatus(
                              item.response_status
                            )}
                          </span>

                          {item.butchery_note && (
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 12,
                                color:
                                  'var(--slate-500)',
                              }}
                            >
                              {
                                item.butchery_note
                              }
                            </div>
                          )}
                        </td>

                        <td
                          style={{
                            padding: 12,
                          }}
                        >
                          {item.accepted_quantity ??
                            '—'}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ===================================================
          STATUS HISTORY
      =================================================== */}

      <div className="soms-card">
        <div className="soms-card-header">
          <div>
            <h3>Order Timeline</h3>

            <p
              style={{
                marginTop: 4,
                color:
                  'var(--slate-500)',
                fontSize: 13,
              }}
            >
              Track every status change
              made to this order.
            </p>
          </div>

          <Clock3 size={21} />
        </div>

        <div className="soms-card-body">
          {history.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: 40,
                color:
                  'var(--slate-500)',
              }}
            >
              No status history
              available.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection:
                  'column',
                gap: 20,
              }}
            >
              {history.map(
                (entry) => (
                  <div
                    key={
                      entry.id
                    }
                    style={{
                      display: 'flex',
                      gap: 14,
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        minWidth: 34,
                        borderRadius:
                          '50%',
                        display: 'flex',
                        alignItems:
                          'center',
                        justifyContent:
                          'center',
                        background:
                          'var(--slate-100)',
                      }}
                    >
                      <CheckCircle2
                        size={18}
                      />
                    </div>

                    <div>
                      <strong>
                        {formatStatus(
                          entry.status
                        )}
                      </strong>

                      <div
                        style={{
                          marginTop: 3,
                          fontSize: 13,
                          color:
                            'var(--slate-500)',
                        }}
                      >
                        {formatDate(
                          entry.created_at
                        )}
                      </div>

                      {entry.comment && (
                        <p
                          style={{
                            marginTop: 6,
                            color:
                              'var(--slate-600)',
                          }}
                        >
                          {
                            entry.comment
                          }
                        </p>
                      )}

                      {entry.changer && (
                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 12,
                            color:
                              'var(--slate-500)',
                          }}
                        >
                          Changed by:{' '}
                          {
                            entry
                              .changer
                              .full_name
                          }
                        </div>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderDetails;