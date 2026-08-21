
import { useRef } from 'react';
// Use external QR image generator to avoid dependency on 'qrcode.react'
// Simple inline icons to avoid dependency on 'lucide-react'
import React from 'react';

const Printer = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M6 9V2h12v7" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="6" y="13" width="12" height="8" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 18h12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Download = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8 11l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 21H3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
import type { Order } from '../types/database';
import { formatCurrency, formatDate, formatTime } from '../lib/utils';
import { DEPARTMENT_LABELS, STATUS_LABELS } from '../types/database';
import { calculateItemTotal } from '../lib/utils';
// Import jsPDF via require to avoid missing type declaration errors in some setups
// @ts-ignore
const { jsPDF } = require('jspdf');

interface ReceiptProps {
  order: Order;
  currency?: string;
  completedBy?: string;
}

export function Receipt({ order, currency = 'USD', completedBy }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    let y = 15;

    pdf.setFontSize(16);
    pdf.text('SOMS Receipt', pdfWidth / 2, y, { align: 'center' });
    y += 10;

    pdf.setFontSize(10);
    const lines = [
      `Order Number: ${order.order_number}`,
      `Date: ${formatDate(order.created_at)}`,
      `Time: ${formatTime(order.created_at)}`,
      `Department: ${DEPARTMENT_LABELS[order.department]}`,
      `Created By: ${order.creator?.full_name || '—'}`,
      '',
      'Items:',
      ...(order.items || []).map(
        (item) =>
          `${item.product_name} | Qty: ${item.quantity} ${item.unit} | ${formatCurrency(
            item.price,
            currency
          )} | Total: ${formatCurrency(calculateItemTotal(item.quantity, item.price), currency)}`
      ),
      '',
      `Subtotal: ${formatCurrency(order.subtotal, currency)}`,
      `Total: ${formatCurrency(order.total, currency)}`,
      `Status: ${STATUS_LABELS.completed}`,
      completedBy ? `Completed By: ${completedBy}` : '',
      order.completed_at ? `Completed Date: ${formatDate(order.completed_at)} ${formatTime(order.completed_at)}` : '',
      completedEntry?.changer?.full_name ? `Completed By: ${completedEntry.changer.full_name}` : '',
    ].filter(Boolean) as string[];

    lines.forEach((line) => {
      const wrapped = pdf.splitTextToSize(line, pdfWidth - 30);
      pdf.text(wrapped, 15, y);
      y += wrapped.length * 6;
      if (y > 280) {
        pdf.addPage();
        y = 15;
      }
    });

    pdf.save(`${order.order_number}-receipt.pdf`);
  };

  const completedEntry = order.status_history?.find((h) => h.status === 'completed');

  return (
    <div>
      <div className="no-print flex gap-2 mb-4">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Printer className="h-4 w-4" />
          Print Receipt
        </button>
        <button
          type="button"
          onClick={handleDownloadPDF}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      <div
        ref={receiptRef}
        className="mx-auto max-w-lg rounded-xl border border-border bg-white p-8 shadow-sm print:shadow-none print:border-0"
      >
        <div className="text-center border-b border-border pb-6">
          <h1 className="text-2xl font-bold text-primary-700">SOMS</h1>
          <p className="text-sm text-text-muted">Sales & Order Management System</p>
          <div className="mt-4 flex justify-center">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                order.order_number
              )}&size=160x160`}
              alt={`QR code for ${order.order_number}`}
              width={80}
              height={80}
            />
          </div>
        </div>

        <div className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Order Number</span>
            <span className="font-semibold">{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Date</span>
            <span>{formatDate(order.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Time</span>
            <span>{formatTime(order.created_at)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Department</span>
            <span className="capitalize">{DEPARTMENT_LABELS[order.department]}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Created By</span>
            <span>{order.creator?.full_name || '—'}</span>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="pb-2 font-medium">Product</th>
                <th className="pb-2 font-medium text-right">Qty</th>
                <th className="pb-2 font-medium text-right">Price</th>
                <th className="pb-2 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item) => (
                <tr key={item.id} className="border-b border-border/50">
                  <td className="py-2">
                    <p className="font-medium">{item.product_name}</p>
                    {item.packaging && (
                      <p className="text-xs text-text-muted">Pkg: {item.packaging}</p>
                    )}
                  </td>
                  <td className="py-2 text-right">{item.quantity} {item.unit}</td>
                  <td className="py-2 text-right">{formatCurrency(item.price, currency)}</td>
                  <td className="py-2 text-right font-medium">
                    {formatCurrency(calculateItemTotal(item.quantity, item.price), currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 space-y-1 text-sm border-t border-border pt-4">
          <div className="flex justify-between">
            <span className="text-text-muted">Subtotal</span>
            <span>{formatCurrency(order.subtotal, currency)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary-700">{formatCurrency(order.total, currency)}</span>
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-4 text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-text-muted">Status</span>
            <span className="font-semibold text-green-700">{STATUS_LABELS.completed}</span>
          </div>
          {completedBy && (
            <div className="flex justify-between">
              <span className="text-text-muted">Completed By</span>
              <span>{completedBy}</span>
            </div>
          )}
          {order.completed_at && (
            <div className="flex justify-between">
              <span className="text-text-muted">Completed Date</span>
              <span>{formatDate(order.completed_at)} {formatTime(order.completed_at)}</span>
            </div>
          )}
          {completedEntry && (
            <div className="flex justify-between">
              <span className="text-text-muted">Completed By</span>
              <span>{completedEntry.changer?.full_name || 'Butchery'}</span>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-text-muted">
          Thank you for your order
        </p>
      </div>
    </div>
  );
}
