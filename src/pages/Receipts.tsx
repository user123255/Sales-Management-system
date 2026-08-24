import {
  ArrowLeft,
  CheckCircle2,
  Download,
  Loader2,
  Package,
  Printer,
  Receipt as ReceiptIcon,
  Search,
  XCircle,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useParams } from 'react-router-dom';

import jsPDF from 'jspdf';

import { supabase } from '../lib/supabase';

/* =========================================================
   TYPES
========================================================= */

interface Profile {
  id?: string;
  user_id?: string;
  full_name?: string;
  name?: string;
  email?: string;
}

interface Department {
  id?: string;
  name?: string;
  department_name?: string;
}

interface OrderItem {
  id?: string;
  order_id?: string;

  product_id?: string;
  product_name?: string;
  name?: string;

  category?: string;
  product_category?: string;

  quantity?: number;
  unit?: string;
  packaging?: string;

  price?: number;
  unit_price?: number;

  total?: number;
  line_total?: number;

  notes?: string;
}

interface Order {
  id: string;

  order_number?: string;
  order_no?: string;
  reference?: string;

  department?: string;
  department_name?: string;
  department_id?: string;

  status?: string;

  created_at?: string;
  updated_at?: string;
  completed_at?: string;

  created_by?: string;
  created_by_name?: string;

  requester_name?: string;
  requested_by?: string;

  notes?: string;

  subtotal?: number;
  discount?: number;

  total?: number;
  total_amount?: number;
  grand_total?: number;

  order_items?: OrderItem[];
  items?: OrderItem[];
}

/* =========================================================
   CONSTANTS
========================================================= */

const BRAND_MAROON = '#7A1F2B';
const BRAND_GOLD = '#C89B3C';
const DARK = '#20252B';
const MUTED = '#667085';
const LIGHT_BORDER = '#E5DFD6';
const LIGHT_BG = '#FCFBF9';

/* =========================================================
   HELPERS
========================================================= */

function formatCurrency(value?: number | null) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value?: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function formatTime(value?: string) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function isUUID(value?: string | null) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function cleanDisplayValue(value?: string | null) {
  if (!value) return '';

  return isUUID(value) ? '' : value;
}

function safeNumber(value: unknown) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

/* =========================================================
   ORDER NUMBER
========================================================= */

function getOrderNumber(order: Order) {
  return (
    order.order_number ||
    order.order_no ||
    order.reference ||
    order.id
  );
}

/* =========================================================
   DEPARTMENT
========================================================= */

function getDepartment(order: Order) {
  return (
    cleanDisplayValue(order.department_name) ||
    cleanDisplayValue(order.department) ||
    'Department'
  );
}

/* =========================================================
   REQUESTER
========================================================= */

function getRequester(order: Order) {
  return (
    cleanDisplayValue(order.requester_name) ||
    cleanDisplayValue(order.requested_by) ||
    cleanDisplayValue(order.created_by_name) ||
    'Unknown User'
  );
}

/* =========================================================
   ITEMS
========================================================= */

function getItems(order: Order): OrderItem[] {
  return order.order_items || order.items || [];
}

function getItemName(item: OrderItem) {
  return (
    cleanDisplayValue(item.product_name) ||
    cleanDisplayValue(item.name) ||
    'Product'
  );
}

function getItemCategory(item: OrderItem) {
  return (
    cleanDisplayValue(item.product_category) ||
    cleanDisplayValue(item.category) ||
    'Product'
  );
}

function getItemPrice(item: OrderItem) {
  return safeNumber(
    item.unit_price ?? item.price ?? 0,
  );
}

function getItemQuantity(item: OrderItem) {
  return safeNumber(item.quantity);
}

function getItemTotal(item: OrderItem) {
  if (
    item.line_total !== undefined &&
    item.line_total !== null
  ) {
    return safeNumber(item.line_total);
  }

  if (
    item.total !== undefined &&
    item.total !== null
  ) {
    return safeNumber(item.total);
  }

  return (
    getItemQuantity(item) *
    getItemPrice(item)
  );
}

/* =========================================================
   TOTALS
========================================================= */

function getOrderSubtotal(order: Order) {
  if (
    order.subtotal !== undefined &&
    order.subtotal !== null
  ) {
    return safeNumber(order.subtotal);
  }

  return getItems(order).reduce(
    (sum, item) =>
      sum + getItemTotal(item),
    0,
  );
}

function getOrderDiscount(order: Order) {
  return safeNumber(order.discount);
}

function getOrderTotal(order: Order) {
  if (
    order.grand_total !== undefined &&
    order.grand_total !== null
  ) {
    return safeNumber(order.grand_total);
  }

  if (
    order.total_amount !== undefined &&
    order.total_amount !== null
  ) {
    return safeNumber(order.total_amount);
  }

  if (
    order.total !== undefined &&
    order.total !== null
  ) {
    return safeNumber(order.total);
  }

  return Math.max(
    0,
    getOrderSubtotal(order) -
      getOrderDiscount(order),
  );
}

/* =========================================================
   STATUS
========================================================= */

function isCompletedStatus(status?: string) {
  const value = String(
    status || '',
  ).toLowerCase();

  return [
    'completed',
    'complete',
    'ready',
    'fulfilled',
    'delivered',
    'paid',
    'processed',
  ].includes(value);
}

function StatusBadge({
  status,
}: {
  status?: string;
}) {
  const completed =
    isCompletedStatus(status);

  return (
    <span
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        px-3
        py-1
        text-xs
        font-bold
        ${
          completed
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        }
      `}
    >
      {completed ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}

      <span className="capitalize">
        {status || 'Pending'}
      </span>
    </span>
  );
}

/* =========================================================
   PDF HELPERS
========================================================= */

function hexToRgb(hex: string) {
  const cleaned = hex.replace('#', '');

  const value =
    cleaned.length === 3
      ? cleaned
          .split('')
          .map((char) => char + char)
          .join('')
      : cleaned;

  return {
    r: parseInt(
      value.substring(0, 2),
      16,
    ),
    g: parseInt(
      value.substring(2, 4),
      16,
    ),
    b: parseInt(
      value.substring(4, 6),
      16,
    ),
  };
}

function setFillColor(
  pdf: jsPDF,
  color: string,
) {
  const rgb = hexToRgb(color);

  pdf.setFillColor(
    rgb.r,
    rgb.g,
    rgb.b,
  );
}

function setTextColor(
  pdf: jsPDF,
  color: string,
) {
  const rgb = hexToRgb(color);

  pdf.setTextColor(
    rgb.r,
    rgb.g,
    rgb.b,
  );
}

function setDrawColor(
  pdf: jsPDF,
  color: string,
) {
  const rgb = hexToRgb(color);

  pdf.setDrawColor(
    rgb.r,
    rgb.g,
    rgb.b,
  );
}

function drawTextRight(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
) {
  pdf.text(
    text,
    x,
    y,
    {
      align: 'right',
    },
  );
}

function drawTextCenter(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
) {
  pdf.text(
    text,
    x,
    y,
    {
      align: 'center',
    },
  );
}

function drawWrappedText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  lineHeight = 4,
) {
  const lines =
    pdf.splitTextToSize(
      text || '',
      width,
    );

  pdf.text(
    lines,
    x,
    y,
  );

  return y + lines.length * lineHeight;
}

/* =========================================================
   GENERATE PDF
========================================================= */

function generateReceiptPDF(
  order: Order,
) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth =
    pdf.internal.pageSize.getWidth();

  const pageHeight =
    pdf.internal.pageSize.getHeight();

  const margin = 10;

  const contentWidth =
    pageWidth - margin * 2;

  let y = margin;

  /* -------------------------------------------------------
     PAGE BACKGROUND
  ------------------------------------------------------- */

  pdf.setFillColor(255, 255, 255);

  pdf.rect(
    0,
    0,
    pageWidth,
    pageHeight,
    'F',
  );

  /* -------------------------------------------------------
     TOP STRIPE
  ------------------------------------------------------- */

  setFillColor(
    pdf,
    BRAND_MAROON,
  );

  pdf.rect(
    0,
    0,
    pageWidth * 0.72,
    5,
    'F',
  );

  setFillColor(
    pdf,
    BRAND_GOLD,
  );

  pdf.rect(
    pageWidth * 0.72,
    0,
    pageWidth * 0.28,
    5,
    'F',
  );

  y = 16;

  /* -------------------------------------------------------
     HEADER
  ------------------------------------------------------- */

  setFillColor(
    pdf,
    BRAND_MAROON,
  );

  pdf.roundedRect(
    margin,
    y,
    22,
    22,
    3,
    3,
    'F',
  );

  setTextColor(
    pdf,
    '#FFFFFF',
  );

  pdf.setFont(
    'helvetica',
    'bold',
  );

  pdf.setFontSize(22);

  drawTextCenter(
    pdf,
    'S',
    margin + 11,
    y + 15,
  );

  setTextColor(
    pdf,
    BRAND_MAROON,
  );

  pdf.setFont(
    'helvetica',
    'bold',
  );

  pdf.setFontSize(18);

  pdf.text(
    'SHANGANI',
    margin + 27,
    y + 9,
  );

  setTextColor(
    pdf,
    MUTED,
  );

  pdf.setFont(
    'helvetica',
    'bold',
  );

  pdf.setFontSize(7);

  pdf.text(
    'SALES & ORDER MANAGEMENT',
    margin + 27,
    y + 15,
  );

  setTextColor(
    pdf,
    BRAND_GOLD,
  );

  pdf.setFontSize(7);

  drawTextRight(
    pdf,
    'OFFICIAL DOCUMENT',
    pageWidth - margin,
    y + 3,
  );

  setTextColor(
    pdf,
    DARK,
  );

  pdf.setFontSize(19);

  pdf.setFont(
    'helvetica',
    'bold',
  );

  drawTextRight(
    pdf,
    'ORDER RECEIPT',
    pageWidth - margin,
    y + 11,
  );

  setTextColor(
    pdf,
    BRAND_MAROON,
  );

  pdf.setFontSize(10);

  drawTextRight(
    pdf,
    getOrderNumber(order),
    pageWidth - margin,
    y + 18,
  );

  y += 29;

  /* -------------------------------------------------------
     GOLD LINE
  ------------------------------------------------------- */

  setDrawColor(
    pdf,
    LIGHT_BORDER,
  );

  pdf.setLineWidth(0.3);

  pdf.line(
    margin,
    y,
    pageWidth - margin,
    y,
  );

  setDrawColor(
    pdf,
    BRAND_GOLD,
  );

  pdf.setLineWidth(1);

  pdf.line(
    margin,
    y,
    margin + 28,
    y,
  );

  y += 8;

  /* -------------------------------------------------------
     ORDER INFORMATION
  ------------------------------------------------------- */

  const infoColumns = 3;

  const infoWidth =
    contentWidth / infoColumns;

  const infoHeight = 21;

  const infoItems = [
    [
      'CREATED BY',
      getRequester(order),
    ],
    [
      'DEPARTMENT',
      getDepartment(order),
    ],
    [
      'ORDER NO.',
      getOrderNumber(order),
    ],
    [
      'DATE',
      formatDate(order.created_at),
    ],
    [
      'TIME',
      formatTime(order.created_at),
    ],
    [
      'STATUS',
      order.status || 'Pending',
    ],
  ];

  infoItems.forEach(
    ([label, value], index) => {
      const row =
        Math.floor(
          index / infoColumns,
        );

      const column =
        index % infoColumns;

      const x =
        margin +
        column * infoWidth;

      const boxY =
        y + row * infoHeight;

      setFillColor(
        pdf,
        LIGHT_BG,
      );

      setDrawColor(
        pdf,
        LIGHT_BORDER,
      );

      pdf.setLineWidth(0.25);

      pdf.rect(
        x,
        boxY,
        infoWidth,
        infoHeight,
        'FD',
      );

      setTextColor(
        pdf,
        MUTED,
      );

      pdf.setFont(
        'helvetica',
        'bold',
      );

      pdf.setFontSize(6.5);

      pdf.text(
        label,
        x + 4,
        boxY + 6,
      );

      const completed =
        isCompletedStatus(
          order.status,
        );

      setTextColor(
        pdf,
        label === 'STATUS'
          ? completed
            ? '#087443'
            : '#B54708'
          : DARK,
      );

      pdf.setFontSize(8);

      const displayValue =
        String(value || '—');

      const wrapped =
        pdf.splitTextToSize(
          displayValue,
          infoWidth - 8,
        );

      pdf.text(
        wrapped.slice(0, 2),
        x + 4,
        boxY + 13,
      );
    },
  );

  y += infoHeight * 2 + 9;

  /* -------------------------------------------------------
     PRODUCTS TITLE
  ------------------------------------------------------- */

  setTextColor(
    pdf,
    BRAND_GOLD,
  );

  pdf.setFont(
    'helvetica',
    'bold',
  );

  pdf.setFontSize(7);

  pdf.text(
    '01',
    margin,
    y,
  );

  setTextColor(
    pdf,
    DARK,
  );

  pdf.setFontSize(12);

  pdf.text(
    'Ordered Products',
    margin + 8,
    y,
  );

  setTextColor(
    pdf,
    MUTED,
  );

  pdf.setFontSize(7);

  drawTextRight(
    pdf,
    `${getItems(order).length} product line(s)`,
    pageWidth - margin,
    y,
  );

  y += 5;

  /* -------------------------------------------------------
     PRODUCTS TABLE
  ------------------------------------------------------- */

  const tableX = margin;

  const tableWidth =
    contentWidth;

  const columns = [
    {
      title: '#',
      width: 7,
    },
    {
      title: 'PRODUCT',
      width: 37,
    },
    {
      title: 'CATEGORY',
      width: 25,
    },
    {
      title: 'QTY',
      width: 11,
    },
    {
      title: 'UNIT',
      width: 14,
    },
    {
      title: 'PACKAGING',
      width: 25,
    },
    {
      title: 'UNIT PRICE',
      width: 25,
    },
    {
      title: 'TOTAL',
      width: 26,
    },
  ];

  let currentX = tableX;

  setFillColor(
    pdf,
    BRAND_MAROON,
  );

  pdf.rect(
    tableX,
    y,
    tableWidth,
    8,
    'F',
  );

  setTextColor(
    pdf,
    '#FFFFFF',
  );

  pdf.setFont(
    'helvetica',
    'bold',
  );

  pdf.setFontSize(5.8);

  columns.forEach(
    (column) => {
      if (
        column.title === 'QTY'
      ) {
        drawTextCenter(
          pdf,
          column.title,
          currentX +
            column.width / 2,
          y + 5.2,
        );
      } else if (
        column.title ===
          'UNIT PRICE' ||
        column.title ===
          'TOTAL'
      ) {
        drawTextRight(
          pdf,
          column.title,
          currentX +
            column.width -
            2,
          y + 5.2,
        );
      } else {
        pdf.text(
          column.title,
          currentX + 2,
          y + 5.2,
        );
      }

      currentX += column.width;
    },
  );

  y += 8;

  const items = getItems(order);

  if (items.length === 0) {
    setDrawColor(
      pdf,
      LIGHT_BORDER,
    );

    pdf.rect(
      tableX,
      y,
      tableWidth,
      15,
    );

    setTextColor(
      pdf,
      MUTED,
    );

    pdf.setFontSize(8);

    drawTextCenter(
      pdf,
      'No products were found for this order.',
      pageWidth / 2,
      y + 9,
    );

    y += 15;
  } else {
    items.forEach(
      (item, index) => {
        const productName =
          getItemName(item);

        const category =
          getItemCategory(item);

        const packaging =
          item.packaging || '—';

        const unit =
          item.unit || '—';

        const notes =
          item.notes || '';

        const productLines =
          pdf.splitTextToSize(
            productName,
            columns[1].width - 4,
          );

        const packagingLines =
          pdf.splitTextToSize(
            packaging,
            columns[5].width - 4,
          );

        const notesLines =
          notes
            ? pdf.splitTextToSize(
                notes,
                columns[1].width - 4,
              )
            : [];

        const maxLines =
          Math.max(
            productLines.length,
            packagingLines.length,
            notesLines.length + 1,
          );

        const rowHeight = Math.max(
          12,
          4 +
            maxLines * 3.5,
        );

        /* Page break before row */

        if (
          y + rowHeight >
          pageHeight - 20
        ) {
          pdf.addPage();

          y = 12;

          /* Repeat table header */

          setFillColor(
            pdf,
            BRAND_MAROON,
          );

          pdf.rect(
            tableX,
            y,
            tableWidth,
            8,
            'F',
          );

          currentX = tableX;

          setTextColor(
            pdf,
            '#FFFFFF',
          );

          pdf.setFontSize(5.8);

          columns.forEach(
            (column) => {
              if (
                column.title ===
                'QTY'
              ) {
                drawTextCenter(
                  pdf,
                  column.title,
                  currentX +
                    column.width /
                      2,
                  y + 5.2,
                );
              } else if (
                column.title ===
                  'UNIT PRICE' ||
                column.title ===
                  'TOTAL'
              ) {
                drawTextRight(
                  pdf,
                  column.title,
                  currentX +
                    column.width -
                    2,
                  y + 5.2,
                );
              } else {
                pdf.text(
                  column.title,
                  currentX + 2,
                  y + 5.2,
                );
              }

              currentX +=
                column.width;
            },
          );

          y += 8;
        }

        if (index % 2 === 1) {
          setFillColor(
            pdf,
            '#FCFBFA',
          );

          pdf.rect(
            tableX,
            y,
            tableWidth,
            rowHeight,
            'F',
          );
        }

        setDrawColor(
          pdf,
          '#E5E0D8',
        );

        pdf.setLineWidth(
          0.2,
        );

        pdf.rect(
          tableX,
          y,
          tableWidth,
          rowHeight,
        );

        currentX = tableX;

        const cells = [
          {
            value: String(
              index + 1,
            ),
            width:
              columns[0].width,
            align: 'center',
          },
          {
            value: productName,
            width:
              columns[1].width,
            align: 'left',
          },
          {
            value: category,
            width:
              columns[2].width,
            align: 'left',
          },
          {
            value: String(
              getItemQuantity(
                item,
              ),
            ),
            width:
              columns[3].width,
            align: 'center',
          },
          {
            value: unit,
            width:
              columns[4].width,
            align: 'left',
          },
          {
            value: packaging,
            width:
              columns[5].width,
            align: 'left',
          },
          {
            value: formatCurrency(
              getItemPrice(
                item,
              ),
            ),
            width:
              columns[6].width,
            align: 'right',
          },
          {
            value: formatCurrency(
              getItemTotal(item),
            ),
            width:
              columns[7].width,
            align: 'right',
          },
        ];

        cells.forEach(
          (cell, cellIndex) => {
            setTextColor(
              pdf,
              cellIndex ===
                7
                ? DARK
                : '#475467',
            );

            pdf.setFont(
              'helvetica',
              cellIndex ===
                7
                ? 'bold'
                : 'normal',
            );

            pdf.setFontSize(
              cellIndex ===
                1
                ? 6.7
                : 6.2,
            );

            const cellX =
              currentX;

            const textY =
              y + 5;

            const cellWidth =
              cell.width;

            const lines =
              pdf.splitTextToSize(
                cell.value,
                cellWidth - 4,
              );

            if (
              cell.align ===
              'right'
            ) {
              lines
                .slice(0, 4)
                .forEach(
                  (
                    line: string,
                    lineIndex: number,
                  ) => {
                    drawTextRight(
                      pdf,
                      line,
                      cellX +
                        cellWidth -
                        2,
                      textY +
                        lineIndex *
                          3.4,
                    );
                  },
                );
            } else if (
              cell.align ===
              'center'
            ) {
              lines
                .slice(0, 4)
                .forEach(
                  (
                    line: string,
                    lineIndex: number,
                  ) => {
                    drawTextCenter(
                      pdf,
                      line,
                      cellX +
                        cellWidth /
                          2,
                      textY +
                        lineIndex *
                          3.4,
                    );
                  },
                );
            } else {
              lines
                .slice(0, 4)
                .forEach(
                  (
                    line: string,
                    lineIndex: number,
                  ) => {
                    pdf.text(
                      line,
                      cellX + 2,
                      textY +
                        lineIndex *
                          3.4,
                    );
                  },
                );
            }

            currentX +=
              cellWidth;
          },
        );

        /* Notes under product name */

        if (notes) {
          setTextColor(
            pdf,
            MUTED,
          );

          pdf.setFont(
            'helvetica',
            'italic',
          );

          pdf.setFontSize(5.3);

          pdf.text(
            notesLines
              .slice(0, 2),
            tableX +
              columns[0]
                .width +
              columns[1]
                .width -
              columns[1]
                .width +
              2,
            y +
              rowHeight -
              3,
          );
        }

        y += rowHeight;
      },
    );
  }

  /* -------------------------------------------------------
     QUANTITY TOTAL
  ------------------------------------------------------- */

  const totalQuantity =
    items.reduce(
      (sum, item) =>
        sum +
        getItemQuantity(item),
      0,
    );

  setTextColor(
    pdf,
    MUTED,
  );

  pdf.setFont(
    'helvetica',
    'normal',
  );

  pdf.setFontSize(7);

  drawTextRight(
    pdf,
    `Total quantity requested: ${totalQuantity}`,
    pageWidth - margin,
    y + 5,
  );

  y += 12;

  /* -------------------------------------------------------
     SUMMARY
  ------------------------------------------------------- */

  if (
    y + 47 >
    pageHeight - 15
  ) {
    pdf.addPage();

    y = 15;
  }

  const summaryGap = 6;

  const totalsWidth = 62;

  const notesWidth =
    contentWidth -
    totalsWidth -
    summaryGap;

  /* NOTES */

  setFillColor(
    pdf,
    LIGHT_BG,
  );

  setDrawColor(
    pdf,
    LIGHT_BORDER,
  );

  pdf.roundedRect(
    margin,
    y,
    notesWidth,
    43,
    2,
    2,
    'FD',
  );

  setTextColor(
    pdf,
    BRAND_MAROON,
  );

  pdf.setFont(
    'helvetica',
    'bold',
  );

  pdf.setFontSize(6.5);

  pdf.text(
    'ORDER NOTES',
    margin + 5,
    y + 7,
  );

  setTextColor(
    pdf,
    '#475467',
  );

  pdf.setFont(
    'helvetica',
    'normal',
  );

  pdf.setFontSize(7);

  drawWrappedText(
    pdf,
    order.notes ||
      'No additional order notes were provided.',
    margin + 5,
    y + 14,
    notesWidth - 10,
    4,
  );

  /* TOTALS */

  setDrawColor(
    pdf,
    LIGHT_BORDER,
  );

  pdf.roundedRect(
    margin +
      notesWidth +
      summaryGap,
    y,
    totalsWidth,
    43,
    2,
    2,
    'S',
  );

  const totalsX =
    margin +
    notesWidth +
    summaryGap;

  setTextColor(
    pdf,
    MUTED,
  );

  pdf.setFont(
    'helvetica',
    'normal',
  );

  pdf.setFontSize(7);

  pdf.text(
    'Subtotal',
    totalsX + 5,
    y + 9,
  );

  drawTextRight(
    pdf,
    formatCurrency(
      getOrderSubtotal(order),
    ),
    totalsX +
      totalsWidth -
      5,
    y + 9,
  );

  pdf.text(
    'Discount',
    totalsX + 5,
    y + 17,
  );

  drawTextRight(
    pdf,
    formatCurrency(
      getOrderDiscount(order),
    ),
    totalsX +
      totalsWidth -
      5,
    y + 17,
  );

  setDrawColor(
    pdf,
    BRAND_MAROON,
  );

  pdf.setLineWidth(0.8);

  pdf.line(
    totalsX + 5,
    y + 23,
    totalsX +
      totalsWidth -
      5,
    y + 23,
  );

  setTextColor(
    pdf,
    BRAND_MAROON,
  );

  pdf.setFont(
    'helvetica',
    'bold',
  );

  pdf.setFontSize(11);

  pdf.text(
    'TOTAL',
    totalsX + 5,
    y + 33,
  );

  drawTextRight(
    pdf,
    formatCurrency(
      getOrderTotal(order),
    ),
    totalsX +
      totalsWidth -
      5,
    y + 33,
  );

  y += 51;

  /* -------------------------------------------------------
     FOOTER
  ------------------------------------------------------- */

  if (
    y + 25 >
    pageHeight - 8
  ) {
    pdf.addPage();

    y = 15;
  }

  setDrawColor(
    pdf,
    LIGHT_BORDER,
  );

  pdf.setLineWidth(0.3);

  pdf.line(
    margin,
    y,
    pageWidth - margin,
    y,
  );

  y += 8;

  setTextColor(
    pdf,
    BRAND_MAROON,
  );

  pdf.setFont(
    'helvetica',
    'bold',
  );

  pdf.setFontSize(9);

  pdf.text(
    'SHANGANI',
    margin,
    y,
  );

  setTextColor(
    pdf,
    MUTED,
  );

  pdf.setFontSize(6);

  pdf.text(
    'SOMS',
    margin,
    y + 5,
  );

  setTextColor(
    pdf,
    DARK,
  );

  pdf.setFontSize(6.5);

  drawTextCenter(
    pdf,
    'Thank you for using SOMS.',
    pageWidth / 2,
    y,
  );

  setTextColor(
    pdf,
    MUTED,
  );

  pdf.setFontSize(5.5);

  drawTextCenter(
    pdf,
    'This receipt is generated from the recorded order information.',
    pageWidth / 2,
    y + 5,
  );

  setTextColor(
    pdf,
    MUTED,
  );

  pdf.setFontSize(5.5);

  drawTextRight(
    pdf,
    'ORDER REFERENCE',
    pageWidth - margin,
    y,
  );

  setTextColor(
    pdf,
    BRAND_MAROON,
  );

  pdf.setFont(
    'helvetica',
    'bold',
  );

  pdf.setFontSize(7);

  drawTextRight(
    pdf,
    getOrderNumber(order),
    pageWidth - margin,
    y + 5,
  );

  /* -------------------------------------------------------
     BOTTOM STRIPE
  ------------------------------------------------------- */

  const bottomY =
    pageHeight - 4;

  setFillColor(
    pdf,
    BRAND_GOLD,
  );

  pdf.rect(
    0,
    bottomY,
    pageWidth * 0.28,
    4,
    'F',
  );

  setFillColor(
    pdf,
    BRAND_MAROON,
  );

  pdf.rect(
    pageWidth * 0.28,
    bottomY,
    pageWidth * 0.72,
    4,
    'F',
  );

  /* -------------------------------------------------------
     PAGE NUMBERS
  ------------------------------------------------------- */

  const totalPages =
    pdf.getNumberOfPages();

  for (
    let page = 1;
    page <= totalPages;
    page++
  ) {
    pdf.setPage(page);

    setTextColor(
      pdf,
      '#98A2B3',
    );

    pdf.setFont(
      'helvetica',
      'normal',
    );

    pdf.setFontSize(5);

    drawTextCenter(
      pdf,
      `Page ${page} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
    );
  }

  return pdf;
}

/* =========================================================
   COMPONENT
========================================================= */

export function Receipts() {
  const {
    orderId,
  } = useParams<{
    orderId?: string;
  }>();

  const [
    orders,
    setOrders,
  ] = useState<Order[]>([]);

  const [
    selectedOrder,
    setSelectedOrder,
  ] = useState<Order | null>(null);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    downloading,
    setDownloading,
  ] = useState(false);

  /* =======================================================
     LOAD ORDERS
  ======================================================= */

  const loadOrders =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const {
          data,
          error: queryError,
        } = await supabase
          .from('orders')
          .select(`
            *,
            order_items (*)
          `)
          .order(
            'created_at',
            {
              ascending: false,
            },
          );

        if (queryError) {
          throw queryError;
        }

        let loadedOrders =
          (data || []) as Order[];

        /* ---------------------------------------------------
           CREATOR IDs
        --------------------------------------------------- */

        const creatorIds =
          Array.from(
            new Set(
              loadedOrders
                .map(
                  (order) =>
                    order.created_by,
                )
                .filter(
                  (
                    value,
                  ): value is string =>
                    Boolean(value) &&
                    isUUID(value),
                ),
            ),
          );

        const profileMap =
          new Map<
            string,
            string
          >();

        /* ---------------------------------------------------
           PROFILES
        --------------------------------------------------- */

        if (
          creatorIds.length > 0
        ) {
          try {
            const {
              data: profiles,
            } = await supabase
              .from('profiles')
              .select(
                'id,user_id,full_name,name,email',
              )
              .or(
                `id.in.(${creatorIds.join(
                  ',',
                )}),user_id.in.(${creatorIds.join(
                  ',',
                )})`,
              );

            (
              profiles || []
            ).forEach(
              (
                profile: Profile,
              ) => {
                const name =
                  profile.full_name ||
                  profile.name ||
                  profile.email ||
                  '';

                if (
                  profile.id &&
                  name
                ) {
                  profileMap.set(
                    profile.id,
                    name,
                  );
                }

                if (
                  profile.user_id &&
                  name
                ) {
                  profileMap.set(
                    profile.user_id,
                    name,
                  );
                }
              },
            );
          } catch {
            // Optional lookup.
          }
        }

        /* ---------------------------------------------------
           USERS FALLBACK
        --------------------------------------------------- */

        if (
          creatorIds.length > 0
        ) {
          try {
            const {
              data: users,
            } = await supabase
              .from('users')
              .select(
                'id,full_name,name,email',
              )
              .in(
                'id',
                creatorIds,
              );

            (
              users || []
            ).forEach(
              (
                user: Profile,
              ) => {
                const name =
                  user.full_name ||
                  user.name ||
                  user.email ||
                  '';

                if (
                  user.id &&
                  name
                ) {
                  profileMap.set(
                    user.id,
                    name,
                  );
                }
              },
            );
          } catch {
            // Optional lookup.
          }
        }

        /* ---------------------------------------------------
           DEPARTMENTS
        --------------------------------------------------- */

        const departmentIds =
          Array.from(
            new Set(
              loadedOrders
                .map(
                  (order) =>
                    order.department_id,
                )
                .filter(
                  (
                    value,
                  ): value is string =>
                    Boolean(value) &&
                    isUUID(value),
                ),
            ),
          );

        const departmentMap =
          new Map<
            string,
            string
          >();

        if (
          departmentIds.length > 0
        ) {
          try {
            const {
              data: departments,
            } = await supabase
              .from('departments')
              .select(
                'id,name,department_name',
              )
              .in(
                'id',
                departmentIds,
              );

            (
              departments || []
            ).forEach(
              (
                department: Department,
              ) => {
                const name =
                  department.name ||
                  department.department_name ||
                  '';

                if (
                  department.id &&
                  name
                ) {
                  departmentMap.set(
                    department.id,
                    name,
                  );
                }
              },
            );
          } catch {
            // Optional lookup.
          }
        }

        /* ---------------------------------------------------
           DISPLAY VALUES
        --------------------------------------------------- */

        loadedOrders =
          loadedOrders.map(
            (order) => ({
              ...order,

              created_by_name:
                cleanDisplayValue(
                  order.created_by_name,
                ) ||
                cleanDisplayValue(
                  order.requester_name,
                ) ||
                cleanDisplayValue(
                  order.requested_by,
                ) ||
                (
                  order.created_by
                    ? profileMap.get(
                        order.created_by,
                      )
                    : undefined
                ) ||
                'Unknown User',

              department_name:
                cleanDisplayValue(
                  order.department_name,
                ) ||
                cleanDisplayValue(
                  order.department,
                ) ||
                (
                  order.department_id
                    ? departmentMap.get(
                        order.department_id,
                      )
                    : undefined
                ) ||
                'Department',
            }),
          );

        setOrders(
          loadedOrders,
        );

        /* ---------------------------------------------------
           SELECT ORDER
        --------------------------------------------------- */

        if (orderId) {
          const matchingOrder =
            loadedOrders.find(
              (order) =>
                order.id ===
                  orderId ||
                order.order_number ===
                  orderId ||
                order.order_no ===
                  orderId ||
                order.reference ===
                  orderId,
            );

          if (
            matchingOrder
          ) {
            setSelectedOrder(
              matchingOrder,
            );
          }
        }
      } catch (err) {
        console.error(
          'Failed to load receipts:',
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load orders.',
        );
      } finally {
        setLoading(false);
      }
    }, [orderId]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  /* =======================================================
     TITLE
  ======================================================= */

  useEffect(() => {
    const originalTitle =
      document.title;

    document.title =
      selectedOrder
        ? `SOMS Receipt - ${getOrderNumber(
            selectedOrder,
          )}`
        : 'SOMS Receipts';

    return () => {
      document.title =
        originalTitle;
    };
  }, [selectedOrder]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredOrders =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return orders;
      }

      return orders.filter(
        (order) => {
          const orderNumber =
            getOrderNumber(
              order,
            ).toLowerCase();

          const department =
            getDepartment(
              order,
            ).toLowerCase();

          const status =
            String(
              order.status || '',
            ).toLowerCase();

          const requester =
            getRequester(
              order,
            ).toLowerCase();

          return (
            orderNumber.includes(
              query,
            ) ||
            department.includes(
              query,
            ) ||
            status.includes(
              query,
            ) ||
            requester.includes(
              query,
            )
          );
        },
      );
    }, [orders, search]);

  /* =======================================================
     PRINT
  ======================================================= */

  const printReceipt =
    () => {
      if (!selectedOrder) {
        return;
      }

      window.print();
    };

  /* =======================================================
     DOWNLOAD PDF
  ======================================================= */

  const downloadPDF =
    () => {
      if (!selectedOrder) {
        return;
      }

      try {
        setDownloading(true);

        /*
         * IMPORTANT:
         *
         * We intentionally DO NOT use html2canvas here.
         * The old implementation depended on rendering the
         * entire React/CSS receipt into a canvas. Tailwind/Vite
         * styles can cause html2canvas to fail.
         *
         * Instead, jsPDF creates the PDF directly.
         */

        const pdf =
          generateReceiptPDF(
            selectedOrder,
          );

        const filename =
          `SOMS-Receipt-${getOrderNumber(
            selectedOrder,
          )}.pdf`;

        pdf.save(filename);
      } catch (err) {
        console.error(
          'PDF generation failed:',
          err,
        );

        window.alert(
          'Unable to generate the PDF. Please try again.',
        );
      } finally {
        setDownloading(false);
      }
    };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#7A1F2B]" />

          <p className="text-sm font-semibold text-slate-500">
            Loading receipts...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (error) {
    return (
      <div className="soms-page">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500" />

            <h2 className="mt-4 text-xl font-extrabold text-red-900">
              Unable to load receipts
            </h2>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadOrders()
              }
              className="
                mt-6
                rounded-xl
                bg-red-600
                px-5
                py-2.5
                text-sm
                font-bold
                text-white
                transition
                hover:bg-red-700
              "
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="soms-page">

      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <div
        className="
          mb-6
          flex
          flex-col
          gap-4
          lg:flex-row
          lg:items-center
          lg:justify-between
          print:hidden
        "
      >
        <div className="flex items-center gap-3">

          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-2xl
              bg-[#7A1F2B]/10
              text-[#7A1F2B]
            "
          >
            <ReceiptIcon className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Receipts
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View, print and download order receipts.
            </p>
          </div>
        </div>

        {selectedOrder && (
          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={printReceipt}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-slate-200
                bg-white
                px-5
                py-2.5
                text-sm
                font-bold
                text-slate-700
                shadow-sm
                transition
                hover:border-slate-300
                hover:bg-slate-50
              "
            >
              <Printer className="h-4 w-4" />
              Print Receipt
            </button>

            <button
              type="button"
              onClick={downloadPDF}
              disabled={downloading}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-[#7A1F2B]
                px-5
                py-2.5
                text-sm
                font-bold
                text-white
                shadow-lg
                shadow-[#7A1F2B]/20
                transition
                hover:bg-[#641923]
                disabled:cursor-not-allowed
                disabled:opacity-60
              "
            >
              {downloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Download PDF
                </>
              )}
            </button>

          </div>
        )}
      </div>

      {/* ===================================================
          SELECTED RECEIPT
      =================================================== */}

      {selectedOrder ? (

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">

          {/* =================================================
              RECEIPT PREVIEW
          ================================================= */}

          <div
            id="printable-receipt"
            className="
              receipt-document
              overflow-hidden
              bg-white
              shadow-xl
              print:shadow-none
            "
          >

            <div className="receipt-top-stripe" />

            {/* HEADER */}

            <div className="receipt-header">

              <div className="receipt-brand">

                <div className="receipt-logo">
                  <div className="receipt-logo-letter">
                    S
                  </div>
                </div>

                <div>
                  <h2>
                    SHANGANI
                  </h2>

                  <p>
                    SALES &amp;
                    ORDER MANAGEMENT
                  </p>
                </div>

              </div>

              <div className="receipt-title">

                <span>
                  OFFICIAL DOCUMENT
                </span>

                <h1>
                  ORDER RECEIPT
                </h1>

                <strong>
                  {getOrderNumber(
                    selectedOrder,
                  )}
                </strong>

              </div>

            </div>

            <div className="receipt-gold-line" />

            {/* ORDER INFORMATION */}

            <div className="receipt-information">

              <div className="receipt-info-box">
                <span>
                  CREATED BY
                </span>

                <strong>
                  {getRequester(
                    selectedOrder,
                  )}
                </strong>
              </div>

              <div className="receipt-info-box">
                <span>
                  DEPARTMENT
                </span>

                <strong>
                  {getDepartment(
                    selectedOrder,
                  )}
                </strong>
              </div>

              <div className="receipt-info-box">
                <span>
                  ORDER NO.
                </span>

                <strong>
                  {getOrderNumber(
                    selectedOrder,
                  )}
                </strong>
              </div>

              <div className="receipt-info-box">
                <span>
                  DATE
                </span>

                <strong>
                  {formatDate(
                    selectedOrder.created_at,
                  )}
                </strong>
              </div>

              <div className="receipt-info-box">
                <span>
                  TIME
                </span>

                <strong>
                  {formatTime(
                    selectedOrder.created_at,
                  )}
                </strong>
              </div>

              <div className="receipt-info-box status-info">
                <span>
                  STATUS
                </span>

                <StatusBadge
                  status={
                    selectedOrder.status
                  }
                />
              </div>

            </div>

            {/* PRODUCTS */}

            <div className="receipt-products-section">

              <div className="receipt-section-title">

                <div>
                  <span>
                    01
                  </span>

                  <h3>
                    Ordered Products
                  </h3>
                </div>

                <strong>
                  {
                    getItems(
                      selectedOrder,
                    ).length
                  }{' '}
                  product line(s)
                </strong>

              </div>

              {getItems(
                selectedOrder,
              ).length === 0 ? (

                <div className="receipt-empty-products">
                  <Package className="mx-auto h-8 w-8 text-slate-300" />

                  <p>
                    No products were found
                    for this order.
                  </p>
                </div>

              ) : (

                <div className="receipt-table-container">

                  <table className="receipt-products-table">

                    <thead>
                      <tr>
                        <th>#</th>
                        <th>PRODUCT</th>
                        <th>CATEGORY</th>
                        <th>QTY</th>
                        <th>UNIT</th>
                        <th>PACKAGING</th>
                        <th className="money">
                          UNIT PRICE
                        </th>
                        <th className="money">
                          LINE TOTAL
                        </th>
                      </tr>
                    </thead>

                    <tbody>

                      {getItems(
                        selectedOrder,
                      ).map(
                        (
                          item,
                          index,
                        ) => (

                          <tr
                            key={
                              item.id ||
                              index
                            }
                          >

                            <td className="number">
                              {index + 1}
                            </td>

                            <td>
                              <strong className="product-name">
                                {getItemName(
                                  item,
                                )}
                              </strong>

                              {item.notes && (
                                <small>
                                  {item.notes}
                                </small>
                              )}
                            </td>

                            <td>
                              <span className="category-badge">
                                {getItemCategory(
                                  item,
                                )}
                              </span>
                            </td>

                            <td className="quantity">
                              <strong>
                                {getItemQuantity(
                                  item,
                                )}
                              </strong>
                            </td>

                            <td>
                              {item.unit ||
                                '—'}
                            </td>

                            <td>
                              {item.packaging ||
                                '—'}
                            </td>

                            <td className="money">
                              {formatCurrency(
                                getItemPrice(
                                  item,
                                ),
                              )}
                            </td>

                            <td className="money strong-total">
                              {formatCurrency(
                                getItemTotal(
                                  item,
                                ),
                              )}
                            </td>

                          </tr>

                        ),
                      )}

                    </tbody>

                  </table>

                </div>
              )}

              <div className="receipt-quantity-total">
                Total quantity requested:{' '}
                <strong>
                  {getItems(
                    selectedOrder,
                  ).reduce(
                    (
                      sum,
                      item,
                    ) =>
                      sum +
                      getItemQuantity(
                        item,
                      ),
                    0,
                  )}
                </strong>
              </div>

            </div>

            {/* SUMMARY */}

            <div className="receipt-summary-grid">

              <div className="receipt-notes">

                <span>
                  ORDER NOTES
                </span>

                <p>
                  {selectedOrder.notes ||
                    'No additional order notes were provided.'}
                </p>

              </div>

              <div className="receipt-totals">

                <div>
                  <span>
                    Subtotal
                  </span>

                  <strong>
                    {formatCurrency(
                      getOrderSubtotal(
                        selectedOrder,
                      ),
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Discount
                  </span>

                  <strong>
                    {formatCurrency(
                      getOrderDiscount(
                        selectedOrder,
                      ),
                    )}
                  </strong>
                </div>

                <div className="grand-total">

                  <span>
                    TOTAL
                  </span>

                  <strong>
                    {formatCurrency(
                      getOrderTotal(
                        selectedOrder,
                      ),
                    )}
                  </strong>

                </div>

              </div>

            </div>

            {/* FOOTER */}

            <div className="receipt-footer">

              <div className="footer-brand">
                <strong>
                  SHANGANI
                </strong>

                <span>
                  SOMS
                </span>
              </div>

              <div className="footer-message">

                <strong>
                  Thank you for using SOMS.
                </strong>

                <span>
                  This receipt is generated
                  from the recorded order
                  information.
                </span>

              </div>

              <div className="footer-reference">

                <span>
                  ORDER REFERENCE
                </span>

                <strong>
                  {getOrderNumber(
                    selectedOrder,
                  )}
                </strong>

              </div>

            </div>

            <div className="receipt-bottom-stripe" />

          </div>

          {/* =================================================
              SIDE DETAILS
          ================================================= */}

          <aside className="print:hidden">

            <div className="soms-card p-5">

              <div className="flex items-center justify-between">

                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Receipt Details
                  </h3>

                  <p className="mt-1 text-xs text-slate-400">
                    Order information
                  </p>
                </div>

                <ReceiptIcon className="h-5 w-5 text-[#7A1F2B]" />

              </div>

              <div className="mt-5 space-y-4">

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Order Number
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {getOrderNumber(
                      selectedOrder,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Department
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {getDepartment(
                      selectedOrder,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Created By
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {getRequester(
                      selectedOrder,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Date
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {formatDate(
                      selectedOrder.created_at,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Time
                  </p>

                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {formatTime(
                      selectedOrder.created_at,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Status
                  </p>

                  <div className="mt-2">
                    <StatusBadge
                      status={
                        selectedOrder.status
                      }
                    />
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total
                  </p>

                  <p className="mt-1 text-lg font-black text-[#7A1F2B]">
                    {formatCurrency(
                      getOrderTotal(
                        selectedOrder,
                      ),
                    )}
                  </p>
                </div>

              </div>

              <button
                type="button"
                onClick={printReceipt}
                className="
                  mt-6
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-slate-700
                  transition
                  hover:bg-slate-50
                "
              >
                <Printer className="h-4 w-4" />
                Print Receipt
              </button>

              <button
                type="button"
                onClick={downloadPDF}
                disabled={downloading}
                className="
                  mt-2
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#7A1F2B]
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  transition
                  hover:bg-[#641923]
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {downloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Download PDF
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedOrder(null)
                }
                className="
                  mt-2
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-slate-200
                  px-4
                  py-2.5
                  text-sm
                  font-bold
                  text-slate-600
                  transition
                  hover:bg-slate-50
                "
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Receipts
              </button>

            </div>

          </aside>

        </div>

      ) : (

        /* =================================================
           RECEIPT LIST
        ================================================= */

        <div className="soms-card overflow-hidden">

          <div className="border-b border-slate-100 p-5 sm:p-6">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  Available Orders
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Select an order to view,
                  print or download its
                  receipt.
                </p>
              </div>

              <div className="relative w-full sm:w-72">

                <Search
                  className="
                    absolute
                    left-3
                    top-1/2
                    h-4
                    w-4
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  type="search"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                  placeholder="Search orders..."
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-200
                    bg-slate-50
                    py-2.5
                    pl-9
                    pr-3
                    text-sm
                    outline-none
                    transition
                    focus:border-[#7A1F2B]
                    focus:bg-white
                    focus:ring-4
                    focus:ring-[#7A1F2B]/10
                  "
                />

              </div>

            </div>

          </div>

          {filteredOrders.length === 0 ? (

            <div className="p-12 text-center">

              <div
                className="
                  mx-auto
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-2xl
                  bg-slate-100
                  text-slate-400
                "
              >
                <ReceiptIcon className="h-6 w-6" />
              </div>

              <h3 className="mt-4 text-base font-extrabold text-slate-800">
                No orders found
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Orders created in SOMS
                will appear here.
              </p>

            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {filteredOrders.map(
                (order) => (

                  <button
                    key={order.id}
                    type="button"
                    onClick={() =>
                      setSelectedOrder(
                        order,
                      )
                    }
                    className="
                      flex
                      w-full
                      items-center
                      justify-between
                      gap-4
                      p-5
                      text-left
                      transition
                      hover:bg-slate-50
                    "
                  >

                    <div className="flex min-w-0 items-center gap-4">

                      <div
                        className="
                          flex
                          h-11
                          w-11
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-[#7A1F2B]/10
                          text-[#7A1F2B]
                        "
                      >
                        <ReceiptIcon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">

                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {getOrderNumber(
                            order,
                          )}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-500">
                          {getDepartment(
                            order,
                          )}
                          {' • '}
                          {getRequester(
                            order,
                          )}
                          {' • '}
                          {formatDate(
                            order.created_at,
                          )}
                        </p>

                      </div>

                    </div>

                    <div className="flex shrink-0 items-center gap-4">

                      <div className="hidden text-right sm:block">

                        <p className="text-sm font-black text-slate-900">
                          {formatCurrency(
                            getOrderTotal(
                              order,
                            ),
                          )}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-400">
                          {
                            getItems(
                              order,
                            ).length
                          }{' '}
                          item
                          {getItems(
                            order,
                          ).length ===
                          1
                            ? ''
                            : 's'}
                        </p>

                      </div>

                      <StatusBadge
                        status={
                          order.status
                        }
                      />

                    </div>

                  </button>
                ),
              )}

            </div>
          )}

        </div>
      )}

      {/* ===================================================
          RECEIPT DESIGN
      =================================================== */}

      <style>
        {`

          .receipt-document {
            width: 100%;
            max-width: 1180px;
            margin: 0 auto;
            color: #20252b;
            background: #ffffff;
            font-family:
              Inter,
              ui-sans-serif,
              system-ui,
              -apple-system,
              BlinkMacSystemFont,
              "Segoe UI",
              sans-serif;
          }

          .receipt-top-stripe {
            height: 9px;
            background:
              linear-gradient(
                90deg,
                #7A1F2B 0%,
                #7A1F2B 72%,
                #C89B3C 72%,
                #C89B3C 100%
              );
          }

          .receipt-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 30px;
            padding: 32px 38px 25px;
          }

          .receipt-brand {
            display: flex;
            align-items: center;
            gap: 15px;
          }

          .receipt-logo {
            width: 72px;
            height: 72px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border: 1px solid #e5ded3;
            border-radius: 14px;
            background: #ffffff;
          }

          .receipt-logo-letter {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 54px;
            height: 54px;
            border-radius: 50%;
            background: #7A1F2B;
            color: #ffffff;
            font-size: 27px;
            font-weight: 900;
          }

          .receipt-brand h2 {
            margin: 0;
            color: #7A1F2B;
            font-size: 25px;
            font-weight: 950;
            letter-spacing: .13em;
          }

          .receipt-brand p {
            margin: 4px 0 0;
            color: #667085;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: .08em;
          }

          .receipt-title {
            text-align: right;
          }

          .receipt-title > span {
            color: #C89B3C;
            font-size: 9px;
            font-weight: 850;
            letter-spacing: .18em;
          }

          .receipt-title h1 {
            margin: 5px 0 6px;
            color: #20252b;
            font-size: 28px;
            font-weight: 900;
            letter-spacing: .02em;
          }

          .receipt-title strong {
            color: #7A1F2B;
            font-size: 16px;
            letter-spacing: .04em;
          }

          .receipt-gold-line {
            position: relative;
            height: 1px;
            margin: 0 38px;
            background: #e8e1d7;
          }

          .receipt-gold-line::after {
            position: absolute;
            left: 0;
            top: -1px;
            width: 90px;
            height: 3px;
            background: #C89B3C;
            content: "";
          }

          .receipt-information {
            display: grid;
            grid-template-columns:
              repeat(6, minmax(0, 1fr));
            margin: 22px 38px 0;
            overflow: hidden;
            border: 1px solid #e7e1d8;
            border-radius: 10px;
          }

          .receipt-info-box {
            min-height: 82px;
            padding: 14px 15px;
            border-right: 1px solid #e7e1d8;
            background: #fcfbf9;
          }

          .receipt-info-box:last-child {
            border-right: 0;
          }

          .receipt-info-box > span:first-child {
            display: block;
            color: #667085;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: .1em;
          }

          .receipt-info-box > strong {
            display: block;
            margin-top: 8px;
            color: #20252b;
            font-size: 12px;
            line-height: 1.35;
          }

          .status-info {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
          }

          .receipt-products-section {
            margin: 28px 38px 0;
          }

          .receipt-section-title {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            margin-bottom: 12px;
          }

          .receipt-section-title > div {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .receipt-section-title > div > span {
            color: #C89B3C;
            font-size: 10px;
            font-weight: 900;
          }

          .receipt-section-title h3 {
            margin: 0;
            color: #20252b;
            font-size: 17px;
            font-weight: 850;
          }

          .receipt-section-title > strong {
            color: #667085;
            font-size: 11px;
          }

          .receipt-table-container {
            overflow: hidden;
            border: 1px solid #ddd7ce;
            border-radius: 9px;
          }

          .receipt-products-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }

          .receipt-products-table th {
            padding: 11px 8px;
            background: #7A1F2B;
            color: #ffffff;
            text-align: left;
            font-size: 8px;
            font-weight: 850;
            letter-spacing: .08em;
            white-space: nowrap;
          }

          .receipt-products-table td {
            padding: 13px 8px;
            border-bottom: 1px solid #ebe6df;
            vertical-align: top;
          }

          .receipt-products-table tbody tr:nth-child(even) {
            background: #fcfbfa;
          }

          .receipt-products-table tbody tr:last-child td {
            border-bottom: 0;
          }

          .receipt-products-table .number {
            width: 32px;
            text-align: center;
          }

          .receipt-products-table .quantity {
            width: 55px;
            text-align: center;
          }

          .receipt-products-table .money {
            text-align: right;
            white-space: nowrap;
          }

          .product-name {
            display: block;
            color: #20252b;
            font-size: 11.5px;
          }

          .receipt-products-table td small {
            display: block;
            margin-top: 4px;
            color: #667085;
            font-size: 9px;
          }

          .category-badge {
            display: inline-flex;
            padding: 4px 7px;
            border-radius: 6px;
            background: #f3eee6;
            color: #6f6255;
            font-size: 8.5px;
            font-weight: 750;
          }

          .strong-total {
            color: #20252b;
            font-weight: 850;
          }

          .receipt-empty-products {
            padding: 30px;
            text-align: center;
          }

          .receipt-empty-products p {
            margin-top: 10px;
            color: #667085;
            font-size: 12px;
          }

          .receipt-quantity-total {
            padding: 9px 2px;
            color: #667085;
            font-size: 10px;
            text-align: right;
          }

          .receipt-quantity-total strong {
            color: #20252b;
          }

          .receipt-summary-grid {
            display: grid;
            grid-template-columns:
              minmax(0, 1fr)
              350px;
            gap: 22px;
            margin: 24px 38px 0;
          }

          .receipt-notes,
          .receipt-totals {
            padding: 17px;
            border: 1px solid #e5dfd6;
            border-radius: 10px;
          }

          .receipt-notes {
            min-height: 125px;
            background: #fcfbf9;
          }

          .receipt-notes > span {
            color: #7A1F2B;
            font-size: 9px;
            font-weight: 900;
            letter-spacing: .12em;
          }

          .receipt-notes p {
            margin: 10px 0 0;
            color: #475467;
            font-size: 11px;
            line-height: 1.65;
          }

          .receipt-totals > div {
            display: flex;
            justify-content: space-between;
            gap: 20px;
            padding: 7px 0;
            color: #667085;
            font-size: 12px;
          }

          .receipt-totals .grand-total {
            margin-top: 8px;
            padding: 14px 0 3px;
            border-top: 2px solid #7A1F2B;
            color: #7A1F2B;
            font-size: 17px;
          }

          .receipt-totals .grand-total span,
          .receipt-totals .grand-total strong {
            color: #7A1F2B;
            font-weight: 950;
          }

          .receipt-footer {
            display: grid;
            grid-template-columns:
              1fr
              1.5fr
              .8fr;
            gap: 25px;
            align-items: center;
            margin: 30px 38px 0;
            padding: 21px 0;
            border-top: 1px solid #e4ded5;
          }

          .footer-brand strong {
            display: block;
            color: #7A1F2B;
            font-size: 15px;
            font-weight: 950;
            letter-spacing: .1em;
          }

          .footer-brand span {
            display: block;
            margin-top: 3px;
            color: #667085;
            font-size: 8px;
            font-weight: 800;
            letter-spacing: .08em;
          }

          .footer-message {
            text-align: center;
          }

          .footer-message strong {
            display: block;
            color: #20252b;
            font-size: 11px;
          }

          .footer-message span {
            display: block;
            margin-top: 4px;
            color: #667085;
            font-size: 8.5px;
            line-height: 1.45;
          }

          .footer-reference {
            text-align: right;
          }

          .footer-reference span {
            display: block;
            color: #667085;
            font-size: 8px;
            font-weight: 800;
            letter-spacing: .1em;
          }

          .footer-reference strong {
            display: block;
            margin-top: 5px;
            color: #7A1F2B;
            font-size: 10px;
          }

          .receipt-bottom-stripe {
            height: 7px;
            background:
              linear-gradient(
                90deg,
                #C89B3C 0%,
                #C89B3C 28%,
                #7A1F2B 28%,
                #7A1F2B 100%
              );
          }

          @media (max-width: 1100px) {
            .receipt-information {
              grid-template-columns:
                repeat(3, minmax(0, 1fr));
            }

            .receipt-info-box:nth-child(3n) {
              border-right: 0;
            }
          }

          @media (max-width: 900px) {
            .receipt-header {
              flex-direction: column;
              align-items: flex-start;
            }

            .receipt-title {
              text-align: left;
            }

            .receipt-information {
              grid-template-columns:
                repeat(2, minmax(0, 1fr));
            }

            .receipt-info-box:nth-child(3n) {
              border-right: 1px solid #e7e1d8;
            }

            .receipt-info-box:nth-child(2n) {
              border-right: 0;
            }

            .receipt-summary-grid,
            .receipt-footer {
              grid-template-columns: 1fr;
            }

            .footer-message {
              text-align: left;
            }

            .footer-reference {
              text-align: left;
            }
          }

          @media (max-width: 640px) {
            .receipt-header {
              padding: 24px 18px 20px;
            }

            .receipt-gold-line {
              margin: 0 18px;
            }

            .receipt-information,
            .receipt-products-section,
            .receipt-summary-grid,
            .receipt-footer {
              margin-left: 18px;
              margin-right: 18px;
            }

            .receipt-information {
              grid-template-columns: 1fr;
            }

            .receipt-info-box {
              border-right: 0 !important;
              border-bottom: 1px solid #e7e1d8;
            }

            .receipt-info-box:last-child {
              border-bottom: 0;
            }

            .receipt-table-container {
              overflow-x: auto;
            }

            .receipt-products-table {
              min-width: 850px;
            }
          }

          @media print {

            @page {
              size: A4;
              margin: 8mm;
            }

            html,
            body {
              background: #ffffff !important;
            }

            body * {
              visibility: hidden !important;
            }

            #printable-receipt,
            #printable-receipt * {
              visibility: visible !important;
            }

            #printable-receipt {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              border: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              background: #ffffff !important;
            }

            .receipt-top-stripe,
            .receipt-bottom-stripe,
            .receipt-products-table th,
            .receipt-notes,
            .category-badge {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            .receipt-table-container {
              overflow: visible !important;
            }

            .receipt-products-table {
              min-width: 0 !important;
              font-size: 8px;
            }

            .receipt-products-table th {
              padding: 7px 5px;
              font-size: 6.5px;
            }

            .receipt-products-table td {
              padding: 7px 5px;
            }

            .receipt-header {
              padding-top: 18px;
              padding-bottom: 15px;
            }

            .receipt-products-section,
            .receipt-summary-grid,
            .receipt-footer {
              break-inside: avoid;
            }

            .receipt-products-table tr {
              break-inside: avoid;
            }

            .print\\:hidden {
              display: none !important;
            }
          }

        `}
      </style>

    </div>
  );
}

export default Receipts;