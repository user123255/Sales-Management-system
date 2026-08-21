
import type { OrderStatus } from '../types/database';
import { STATUS_LABELS } from '../types/database';
import { cn } from '../lib/utils';

const statusStyles: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  accepted: 'bg-blue-100 text-blue-800 border-blue-200',
  processing: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ready: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
  pulse?: boolean;
}

export function StatusBadge({ status, className, pulse }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        statusStyles[status],
        pulse && status === 'pending' && 'animate-pulse',
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
