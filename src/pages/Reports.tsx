import {
  BarChart3,
  Download,
  RefreshCw,
  TrendingUp,
  ShoppingCart,
  CheckCircle2,
  Clock3,
  DollarSign,
  XCircle,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  fetchOrders,
  subscribeToOrders,
} from '../services/orders';

import type {
  Order,
} from '../types/database';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReportPeriod =
  | 'today'
  | '7days'
  | '30days'
  | 'all';

interface ReportStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  readyOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalSales: number;
}

interface ProductSummary {
  name: string;
  quantity: number;
  orders: number;
}

interface DepartmentSummary {
  name: string;
  orders: number;
  sales: number;
}

function getPeriodStart(
  period: ReportPeriod
): Date | null {
  const now = new Date();

  if (period === 'all') {
    return null;
  }

  if (period === 'today') {
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );
  }

  const days =
    period === '7days'
      ? 7
      : 30;

  const start = new Date(now);

  start.setDate(
    start.getDate() - days
  );

  return start;
}

function formatCurrency(
  amount: number
): string {
  return Number(amount || 0).toLocaleString(
    undefined,
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
}

function formatNumber(
  value: number
): string {
  return Number(value || 0).toLocaleString();
}

function getOrderAmount(
  order: Order
): number {
  return Number(order.total || 0);
}

function getProductSummaries(
  orders: Order[]
): ProductSummary[] {
  const products = new Map<
    string,
    ProductSummary
  >();

  orders.forEach((order) => {
    order.items?.forEach((item) => {
      const name =
        item.product_name?.trim() ||
        'Unknown Product';

      const existing =
        products.get(name);

      const quantity = Number(
        item.quantity || 0
      );

      if (existing) {
        existing.quantity += quantity;
        existing.orders += 1;
      } else {
        products.set(name, {
          name,
          quantity,
          orders: 1,
        });
      }
    });
  });

  return Array.from(
    products.values()
  )
    .sort(
      (a, b) =>
        b.quantity - a.quantity
    )
    .slice(0, 10);
}

function getDepartmentSummaries(
  orders: Order[]
): DepartmentSummary[] {
  const departments = new Map<
    string,
    DepartmentSummary
  >();

  orders.forEach((order) => {
    const name =
      order.department?.trim() ||
      'Unknown Department';

    const existing =
      departments.get(name);

    const sales =
      getOrderAmount(order);

    if (existing) {
      existing.orders += 1;
      existing.sales += sales;
    } else {
      departments.set(name, {
        name,
        orders: 1,
        sales,
      });
    }
  });

  return Array.from(
    departments.values()
  ).sort(
    (a, b) =>
      b.orders - a.orders
  );
}

export function Reports() {
  const [orders, setOrders] =
    useState<Order[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [period, setPeriod] =
    useState<ReportPeriod>('30days');

  const loadOrders =
    useCallback(
      async () => {
        try {
          setError('');

          const data =
            await fetchOrders();

          setOrders(data);
        } catch (err) {
          console.error(
            'Unable to load report data:',
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to generate report data.'
          );

          setOrders([]);
        } finally {
          setLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  /*
   * Keep reports automatically synchronized
   * with new, updated, and deleted orders.
   */
  useEffect(() => {
    const unsubscribe =
      subscribeToOrders(
        () => {
          void loadOrders();
        },
        () => {
          void loadOrders();
        }
      );

    return unsubscribe;
  }, [loadOrders]);

  const refresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await loadOrders();
    } finally {
      setRefreshing(false);
    }
  };

  const filteredOrders =
    useMemo(() => {
      const start =
        getPeriodStart(period);

      if (!start) {
        return orders;
      }

      return orders.filter(
        (order) => {
          if (!order.created_at) {
            return false;
          }

          return (
            new Date(
              order.created_at
            ) >= start
          );
        }
      );
    }, [orders, period]);

  const stats =
    useMemo<ReportStats>(() => {
      let totalSales = 0;

      const result: ReportStats = {
        totalOrders:
          filteredOrders.length,
        pendingOrders: 0,
        processingOrders: 0,
        readyOrders: 0,
        completedOrders: 0,
        cancelledOrders: 0,
        totalSales: 0,
      };

      filteredOrders.forEach(
        (order) => {
          const amount =
            getOrderAmount(order);

          /*
           * Sales are counted from completed
           * orders so cancelled/pending requests
           * are not treated as realized sales.
           */
          if (
            order.status ===
            'completed'
          ) {
            totalSales += amount;
          }

          switch (
            order.status
          ) {
            case 'pending':
              result.pendingOrders += 1;
              break;

            case 'processing':
              result.processingOrders += 1;
              break;

            case 'ready':
              result.readyOrders += 1;
              break;

            case 'completed':
              result.completedOrders += 1;
              break;

            case 'cancelled':
              result.cancelledOrders += 1;
              break;

            default:
              break;
          }
        }
      );

      result.totalSales =
        totalSales;

      return result;
    }, [filteredOrders]);

  const productSummaries =
    useMemo(
      () =>
        getProductSummaries(
          filteredOrders
        ),
      [filteredOrders]
    );

  const departmentSummaries =
    useMemo(
      () =>
        getDepartmentSummaries(
          filteredOrders
        ),
      [filteredOrders]
    );

  const exportReport = () => {
    const doc =
      new jsPDF();

    const generatedAt =
      new Date().toLocaleString();

    /*
     * TITLE
     */
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');

    doc.text(
      'SOMS SALES & ORDER REPORT',
      14,
      20
    );

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    doc.text(
      `Period: ${period}`,
      14,
      28
    );

    doc.text(
      `Generated: ${generatedAt}`,
      14,
      34
    );

    /*
     * SUMMARY
     */
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');

    doc.text(
      'SUMMARY',
      14,
      46
    );

    autoTable(doc, {
      startY: 50,

      head: [
        [
          'Metric',
          'Value',
        ],
      ],

      body: [
        [
          'Total Orders',
          formatNumber(
            stats.totalOrders
          ),
        ],
        [
          'Pending Orders',
          formatNumber(
            stats.pendingOrders
          ),
        ],
        [
          'Processing Orders',
          formatNumber(
            stats.processingOrders
          ),
        ],
        [
          'Ready Orders',
          formatNumber(
            stats.readyOrders
          ),
        ],
        [
          'Completed Orders',
          formatNumber(
            stats.completedOrders
          ),
        ],
        [
          'Cancelled Orders',
          formatNumber(
            stats.cancelledOrders
          ),
        ],
        [
          'Total Sales',
          formatCurrency(
            stats.totalSales
          ),
        ],
      ],

      theme: 'grid',

      headStyles: {
        fontStyle: 'bold',
      },

      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
    });

    /*
     * TOP PRODUCTS
     */
    const productStartY =
      (doc as any).lastAutoTable.finalY + 12;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');

    doc.text(
      'TOP PRODUCTS',
      14,
      productStartY
    );

    autoTable(doc, {
      startY:
        productStartY + 4,

      head: [
        [
          '#',
          'Product',
          'Quantity',
          'Orders',
        ],
      ],

      body:
        productSummaries.length > 0
          ? productSummaries.map(
              (
                product,
                index
              ) => [
                String(
                  index + 1
                ),
                product.name,
                formatNumber(
                  product.quantity
                ),
                formatNumber(
                  product.orders
                ),
              ]
            )
          : [
              [
                '-',
                'No product data available',
                '-',
                '-',
              ],
            ],

      theme: 'grid',

      headStyles: {
        fontStyle: 'bold',
      },

      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
    });

    /*
     * DEPARTMENT ACTIVITY
     */
    const departmentStartY =
      (doc as any).lastAutoTable.finalY + 12;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');

    doc.text(
      'DEPARTMENT ACTIVITY',
      14,
      departmentStartY
    );

    autoTable(doc, {
      startY:
        departmentStartY + 4,

      head: [
        [
          'Department',
          'Orders',
          'Sales',
        ],
      ],

      body:
        departmentSummaries.length > 0
          ? departmentSummaries.map(
              (
                department
              ) => [
                department.name,
                formatNumber(
                  department.orders
                ),
                formatCurrency(
                  department.sales
                ),
              ]
            )
          : [
              [
                'No departmental data available',
                '-',
                '-',
              ],
            ],

      theme: 'grid',

      headStyles: {
        fontStyle: 'bold',
      },

      styles: {
        fontSize: 10,
        cellPadding: 4,
      },
    });

    /*
     * FOOTER
     */
    const pageCount =
      doc.getNumberOfPages();

    for (
      let page = 1;
      page <= pageCount;
      page += 1
    ) {
      doc.setPage(page);

      const pageHeight =
        doc.internal.pageSize.height;

      doc.setFontSize(8);
      doc.setFont(
        'helvetica',
        'normal'
      );

      doc.text(
        `SOMS Sales & Order Management System - Page ${page} of ${pageCount}`,
        14,
        pageHeight - 10
      );
    }

    /*
     * SAVE PDF
     */
    doc.save(
      `SOMS-report-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    );
  };

  return (
    <div className="soms-page space-y-6">
      <div className="soms-page-header">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <h1 className="soms-page-title">
              Reports
            </h1>

            <span className="soms-live">
              <span className="soms-live-dot" />
            </span>
          </div>

          <p className="soms-page-description">
            Automatically generated sales,
            order, product and departmental
            performance reports.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              void refresh()
            }
            disabled={
              refreshing
            }
            className="soms-button soms-button-secondary"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={
              exportReport
            }
            disabled={loading}
            className="soms-button soms-button-secondary"
          >
            <Download size={17} />
            Export Report
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-bold text-slate-900">
            Report Period
          </p>

          <p className="text-xs text-slate-500">
            Choose the period used to
            automatically calculate the
            report.
          </p>
        </div>

        <select
          value={period}
          onChange={(event) =>
            setPeriod(
              event.target.value as ReportPeriod
            )
          }
          className="soms-input max-w-xs"
        >
          <option value="today">
            Today
          </option>

          <option value="7days">
            Last 7 days
          </option>

          <option value="30days">
            Last 30 days
          </option>

          <option value="all">
            All time
          </option>
        </select>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-7 w-7 animate-spin text-blue-600" />

            <p className="text-sm font-medium text-slate-500">
              Generating report...
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="soms-stat-grid">
            <ReportStat
              label="TOTAL ORDERS"
              value={formatNumber(
                stats.totalOrders
              )}
              icon={
                <ShoppingCart size={20} />
              }
            />

            <ReportStat
              label="TOTAL SALES"
              value={`$${formatCurrency(
                stats.totalSales
              )}`}
              icon={
                <DollarSign size={20} />
              }
            />

            <ReportStat
              label="COMPLETED ORDERS"
              value={formatNumber(
                stats.completedOrders
              )}
              icon={
                <CheckCircle2 size={20} />
              }
            />

            <ReportStat
              label="PENDING ORDERS"
              value={formatNumber(
                stats.pendingOrders
              )}
              icon={
                <Clock3 size={20} />
              }
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <MiniStat
              label="PROCESSING"
              value={
                stats.processingOrders
              }
            />

            <MiniStat
              label="READY"
              value={
                stats.readyOrders
              }
            />

            <MiniStat
              label="CANCELLED"
              value={
                stats.cancelledOrders
              }
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="soms-card">
              <div className="soms-card-header">
                <div>
                  <h3>
                    Sales Performance
                  </h3>

                  <p
                    style={{
                      marginTop: 4,
                      color:
                        'var(--slate-500)',
                      fontSize: 13,
                    }}
                  >
                    Automatically calculated
                    from completed orders.
                  </p>
                </div>

                <TrendingUp
                  size={21}
                  color="var(--blue-600)"
                />
              </div>

              <div className="soms-card-body">
                <div className="py-8">
                  <p className="text-sm text-slate-500">
                    Completed sales
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    $
                    {formatCurrency(
                      stats.totalSales
                    )}
                  </p>

                  <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{
                        width:
                          stats.totalOrders >
                          0
                            ? `${Math.min(
                                100,
                                (stats.completedOrders /
                                  stats.totalOrders) *
                                  100
                              )}%`
                            : '0%',
                      }}
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    {stats.totalOrders >
                    0
                      ? Math.round(
                          (stats.completedOrders /
                            stats.totalOrders) *
                            100
                        )
                      : 0}
                    % of orders completed
                  </p>
                </div>
              </div>
            </div>

            <div className="soms-card">
              <div className="soms-card-header">
                <div>
                  <h3>
                    Order Status
                  </h3>

                  <p
                    style={{
                      marginTop: 4,
                      color:
                        'var(--slate-500)',
                      fontSize: 13,
                    }}
                  >
                    Current order distribution.
                  </p>
                </div>

                <BarChart3
                  size={21}
                  color="var(--blue-600)"
                />
              </div>

              <div className="soms-card-body space-y-4">
                <StatusRow
                  label="Pending"
                  value={
                    stats.pendingOrders
                  }
                  total={
                    stats.totalOrders
                  }
                />

                <StatusRow
                  label="Processing"
                  value={
                    stats.processingOrders
                  }
                  total={
                    stats.totalOrders
                  }
                />

                <StatusRow
                  label="Ready"
                  value={
                    stats.readyOrders
                  }
                  total={
                    stats.totalOrders
                  }
                />

                <StatusRow
                  label="Completed"
                  value={
                    stats.completedOrders
                  }
                  total={
                    stats.totalOrders
                  }
                />

                <StatusRow
                  label="Cancelled"
                  value={
                    stats.cancelledOrders
                  }
                  total={
                    stats.totalOrders
                  }
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="soms-card">
              <div className="soms-card-header">
                <div>
                  <h3>
                    Most Ordered Products
                  </h3>

                  <p
                    style={{
                      marginTop: 4,
                      color:
                        'var(--slate-500)',
                      fontSize: 13,
                    }}
                  >
                    Products ranked by requested
                    quantity.
                  </p>
                </div>
              </div>

              <div className="soms-card-body">
                {productSummaries.length ===
                0 ? (
                  <EmptyReport
                    text="No product data available for this period."
                  />
                ) : (
                  <div className="space-y-3">
                    {productSummaries.map(
                      (
                        product,
                        index
                      ) => (
                        <div
                          key={
                            product.name
                          }
                          className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-xs font-bold text-slate-500">
                              {index +
                                1}
                            </span>

                            <span className="truncate text-sm font-semibold text-slate-800">
                              {
                                product.name
                              }
                            </span>
                          </div>

                          <span className="ml-3 shrink-0 text-sm font-bold text-slate-900">
                            {formatNumber(
                              product.quantity
                            )}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="soms-card">
              <div className="soms-card-header">
                <div>
                  <h3>
                    Department Activity
                  </h3>

                  <p
                    style={{
                      marginTop: 4,
                      color:
                        'var(--slate-500)',
                      fontSize: 13,
                    }}
                  >
                    Orders generated by each
                    department.
                  </p>
                </div>
              </div>

              <div className="soms-card-body">
                {departmentSummaries.length ===
                0 ? (
                  <EmptyReport
                    text="No departmental data available for this period."
                  />
                ) : (
                  <div className="space-y-3">
                    {departmentSummaries.map(
                      (
                        department
                      ) => (
                        <div
                          key={
                            department.name
                          }
                          className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold text-slate-800">
                              {
                                department.name
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {
                                department.orders
                              }{' '}
                              orders
                            </p>
                          </div>

                          <p className="font-bold text-slate-900">
                            $
                            {formatCurrency(
                              department.sales
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

              <div>
                <p className="font-bold text-blue-900">
                  Report generated automatically
                </p>

                <p className="mt-1 text-sm text-blue-700">
                  This report is calculated directly
                  from your current orders. New or
                  updated orders are automatically
                  reflected in the report.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ReportStat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="soms-stat-card">
      <div className="flex items-center justify-between">
        <span className="soms-stat-label">
          {label}
        </span>

        <span className="text-blue-600">
          {icon}
        </span>
      </div>

      <div className="soms-stat-value">
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <p className="mt-2 text-2xl font-bold text-slate-900">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function StatusRow({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percentage =
    total > 0
      ? Math.round(
          (value / total) * 100
        )
      : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">
          {label}
        </span>

        <span className="text-sm font-bold text-slate-900">
          {formatNumber(value)}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

function EmptyReport({
  text,
}: {
  text: string;
}) {
  return (
    <div className="py-8 text-center">
      <XCircle className="mx-auto h-8 w-8 text-slate-300" />

      <p className="mt-3 text-sm font-medium text-slate-500">
        {text}
      </p>
    </div>
  );
}