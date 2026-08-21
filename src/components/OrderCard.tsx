
// Small inline icons to avoid dependency on 'lucide-react'
function PackageIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="M7.5 4.21v7.58" />
      <path d="M16.5 4.21v7.58" />
    </svg>
  );
}

function ClockIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
import type { Order } from '../types/database';
import { formatCurrency, formatTime } from '../lib/utils';
import { DEPARTMENT_LABELS } from '../types/database';

function StatusBadge({
  status,
  pulse = false,
}: {
  status: string;
  pulse?: boolean;
}) {
  const label = status.replace(/_/g, ' ');

  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
        styles[status] || 'bg-gray-100 text-gray-800'
      } ${pulse ? 'ring-2 ring-amber-100' : ''}`}
    >
      {label}
    </span>
  );
}

interface OrderCardProps {
  order: Order;
  basePath: string;
  isNew?: boolean;
  currency?: string;
}

export function OrderCard({ order, basePath, isNew, currency = 'USD' }: OrderCardProps) {
  const orderHref = `${basePath}/orders/${order.id}`;

  return (
    <a
      href={orderHref}
      className={`block rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
        isNew ? 'border-amber-300 ring-2 ring-amber-100' : 'border-border'
      }`}
    >
      {isNew && (
        <span className="mb-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          New Order
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-text">{order.order_number}</p>
          <p className="text-sm text-text-muted capitalize">
            From: {DEPARTMENT_LABELS[order.department] || order.department}
          </p>
        </div>
        <StatusBadge status={order.status} pulse={isNew} />
      </div>
      <div className="mt-3 flex items-center gap-4 text-sm text-text-muted">
        <span className="flex items-center gap-1">
          <PackageIcon className="h-3.5 w-3.5" />
          {order.items?.length || 0} items
        </span>
        <span className="flex items-center gap-1">
          <ClockIcon className="h-3.5 w-3.5" />
          {formatTime(order.created_at)}
        </span>
      </div>
      <p className="mt-2 text-lg font-bold text-primary-700">
        {formatCurrency(order.total, currency)}
      </p>
    </a>
  );
}
