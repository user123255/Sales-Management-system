
import React from 'react';

// Inline lightweight SVG icon components to avoid dependency on 'lucide-react'
const Eye: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Printer: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M6 9V3h12v6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 14H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="6" y="14" width="12" height="7" rx="2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Receipt: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M21 11.5V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6.5a2 2 0 0 0 2 2H7v4l3-2 3 2 3-2 3 2v-4h2a2 2 0 0 0 2-2z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 7h8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 11h8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
import type { Order } from '../types/database';
// Local StatusBadge component to avoid missing module import

const StatusBadge: React.FC<{ status: string; pulse?: boolean }> = ({ status, pulse = false }) => {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium';
  const statusMap: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  const cls = `${base} ${statusMap[status] || 'bg-gray-100 text-gray-800'} ${
    pulse ? 'animate-pulse' : ''
  }`;

  return <span className={cls}>{status}</span>;
};
// Local lightweight formatting utilities to avoid dependency on '@/lib/utils'
function formatDate(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  try {
    return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
  } catch {
    return d.toLocaleDateString();
  }
}

function formatTime(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(d);
  } catch {
    return d.toLocaleTimeString();
  }
}

function formatCurrency(amount: number | string, currency = 'USD') {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(num || 0);
  } catch {
    return (num || 0).toFixed(2) + ` ${currency}`;
  }
}
import { DEPARTMENT_LABELS } from '../types/database';

interface OrderTableProps {
  orders: Order[];
  basePath: string;
  showDepartment?: boolean;
  highlightNew?: boolean;
  currency?: string;
}

export function OrderTable({
  orders,
  basePath,
  showDepartment = true,
  highlightNew = false,
  currency = 'USD',
}: OrderTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            <th className="px-4 py-3 text-left font-semibold text-text-muted">Order</th>
            {showDepartment && (
              <th className="px-4 py-3 text-left font-semibold text-text-muted hidden sm:table-cell">Department</th>
            )}
            <th className="px-4 py-3 text-left font-semibold text-text-muted">Items</th>
            <th className="px-4 py-3 text-left font-semibold text-text-muted hidden md:table-cell">Time</th>
            <th className="px-4 py-3 text-left font-semibold text-text-muted hidden lg:table-cell">Total</th>
            <th className="px-4 py-3 text-left font-semibold text-text-muted">Status</th>
            <th className="px-4 py-3 text-right font-semibold text-text-muted">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className={`border-b border-border last:border-0 hover:bg-surface-muted/50 transition-colors ${
                highlightNew && order.status === 'pending' ? 'bg-amber-50/50' : ''
              }`}
            >
              <td className="px-4 py-3">
                <a
                  href={`${basePath}/orders/${order.id}`}
                  className="font-medium text-primary-600 hover:underline"
                >
                  {order.order_number}
                </a>
                <p className="text-xs text-text-muted sm:hidden mt-0.5">
                  {formatDate(order.created_at)}
                </p>
              </td>
              {showDepartment && (
                <td className="px-4 py-3 text-text-muted hidden sm:table-cell capitalize">
                  {DEPARTMENT_LABELS[order.department] || order.department}
                </td>
              )}
              <td className="px-4 py-3">{order.items?.length || 0}</td>
              <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                {formatTime(order.created_at)}
              </td>
              <td className="px-4 py-3 font-medium hidden lg:table-cell">
                {formatCurrency(order.total, currency)}
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={order.status} pulse={highlightNew && order.status === 'pending'} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <a
                    href={`${basePath}/orders/${order.id}`}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted hover:text-text"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                  {order.status === 'completed' && (
                    <a
                      href={`${basePath}/orders/${order.id}?receipt=1`}
                      className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted hover:text-text"
                      title="Receipt"
                    >
                      <Receipt className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="rounded-lg p-1.5 text-text-muted hover:bg-surface-muted hover:text-text"
                    title="Print"
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
