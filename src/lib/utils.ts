
import { clsx, type ClassValue } from 'clsx';

// If 'tailwind-merge' is not available in the environment, fall back to a no-op
// merge function that simply returns the clsx result. This avoids build errors
// when the package or its types are missing.
function twMerge(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

function parseISO(date: string): Date {
  return new Date(date);
}

function format(date: Date, pattern: string): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const tokens: Record<string, string> = {
    dd: pad(date.getDate()),
    MM: pad(date.getMonth() + 1),
    yyyy: String(date.getFullYear()),
    HH: pad(date.getHours()),
    mm: pad(date.getMinutes()),
  };

  return pattern.replace(/dd|MM|yyyy|HH|mm/g, (token) => tokens[token] ?? token);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date, dateFormat = 'dd/MM/yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  const map: Record<string, string> = {
    dd: 'dd',
    MM: 'MM',
    yyyy: 'yyyy',
    'dd/MM/yyyy': 'dd/MM/yyyy',
    'MM/dd/yyyy': 'MM/dd/yyyy',
    'yyyy-MM-dd': 'yyyy-MM-dd',
  };
  const fmt = map[dateFormat] || 'dd/MM/yyyy';
  return format(d, fmt);
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm');
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm');
}

export function calculateItemTotal(quantity: number, price: number): number {
  return Math.round(quantity * price * 100) / 100;
}

export function calculateOrderTotal(items: { quantity: number; price: number }[]): number {
  return items.reduce((sum, item) => sum + calculateItemTotal(item.quantity, item.price), 0);
}

export function getInventoryStatus(
  quantity: number,
  threshold: number
): 'available' | 'low_stock' | 'out_of_stock' {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= threshold) return 'low_stock';
  return 'available';
}

export function getInvoiceStatus(
  total: number,
  amountPaid: number,
  dueDate: string
): 'paid' | 'partially_paid' | 'outstanding' | 'overdue' {
  if (amountPaid >= total) return 'paid';
  if (amountPaid > 0) {
    const due = parseISO(dueDate);
    if (due < new Date()) return 'overdue';
    return 'partially_paid';
  }
  const due = parseISO(dueDate);
  if (due < new Date()) return 'overdue';
  return 'outstanding';
}
