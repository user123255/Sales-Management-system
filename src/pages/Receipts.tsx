import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Package,
  Printer,
  Receipt as ReceiptIcon,
  Search,
  User,
  XCircle,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useParams } from 'react-router-dom';

import { supabase } from '../lib/supabase';


/* =========================================================
   TYPES
========================================================= */

interface OrderItem {
  id?: string;
  order_id?: string;

  product_id?: string;
  product_name?: string;
  name?: string;

  quantity?: number;
  unit?: string;
  packaging?: string;

  price?: number;
  unit_price?: number;

  total?: number;
  line_total?: number;
}

interface Order {
  id: string;

  order_number?: string;
  order_no?: string;
  reference?: string;

  department?: string;
  department_name?: string;

  status?: string;

  created_at?: string;
  updated_at?: string;

  created_by?: string;
  created_by_name?: string;

  requester_name?: string;
  requested_by?: string;

  notes?: string;

  total?: number;
  total_amount?: number;
  grand_total?: number;

  order_items?: OrderItem[];
  items?: OrderItem[];
}


/* =========================================================
   HELPERS
========================================================= */

function formatCurrency(value: number | null | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}


function formatDate(value?: string) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}


function getOrderNumber(order: Order) {
  return (
    order.order_number ||
    order.order_no ||
    order.reference ||
    order.id
  );
}


function getDepartment(order: Order) {
  return (
    order.department ||
    order.department_name ||
    'Department'
  );
}


function getRequester(order: Order) {
  return (
    order.requester_name ||
    order.requested_by ||
    order.created_by_name ||
    order.created_by ||
    '—'
  );
}


function getItems(order: Order): OrderItem[] {
  return order.order_items || order.items || [];
}


function getItemName(item: OrderItem) {
  return (
    item.product_name ||
    item.name ||
    item.product_id ||
    'Product'
  );
}


function getItemPrice(item: OrderItem) {
  return Number(
    item.unit_price ??
    item.price ??
    0,
  );
}


function getItemQuantity(item: OrderItem) {
  return Number(item.quantity || 0);
}


function getItemTotal(item: OrderItem) {
  if (
    item.line_total !== undefined &&
    item.line_total !== null
  ) {
    return Number(item.line_total);
  }

  if (
    item.total !== undefined &&
    item.total !== null
  ) {
    return Number(item.total);
  }

  return (
    getItemQuantity(item) *
    getItemPrice(item)
  );
}


function getOrderTotal(order: Order) {
  if (
    order.grand_total !== undefined &&
    order.grand_total !== null
  ) {
    return Number(order.grand_total);
  }

  if (
    order.total_amount !== undefined &&
    order.total_amount !== null
  ) {
    return Number(order.total_amount);
  }

  if (
    order.total !== undefined &&
    order.total !== null
  ) {
    return Number(order.total);
  }

  return getItems(order).reduce(
    (sum, item) =>
      sum + getItemTotal(item),
    0,
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
   RECEIPTS
========================================================= */

export default function Receipts() {

  const { orderId } =
    useParams<{
      orderId?: string;
    }>();


  const [orders, setOrders] =
    useState<Order[]>([]);

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  const [search, setSearch] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);


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

        const loadedOrders =
          (data || []) as Order[];

        setOrders(loadedOrders);


        /* Open requested order */

        if (orderId) {

          const matchingOrder =
            loadedOrders.find(
              (order) =>
                order.id === orderId ||
                order.order_number === orderId ||
                order.order_no === orderId ||
                order.reference === orderId,
            );

          if (matchingOrder) {
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
            : 'Failed to load receipts.',
        );

      } finally {

        setLoading(false);

      }

    }, [orderId]);


  useEffect(() => {
    loadOrders();
  }, [loadOrders]);


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
            getOrderNumber(order)
              .toLowerCase();

          const department =
            getDepartment(order)
              .toLowerCase();

          const requester =
            getRequester(order)
              .toLowerCase();

          const status =
            String(
              order.status || '',
            ).toLowerCase();

          return (
            orderNumber.includes(query) ||
            department.includes(query) ||
            requester.includes(query) ||
            status.includes(query)
          );
        },
      );

    }, [orders, search]);


  /* =======================================================
     PRINT / PDF
  ======================================================= */

  const printReceipt = () => {

    if (!selectedOrder) {
      return;
    }

    window.print();
  };


  const downloadPDF = () => {

    if (!selectedOrder) {
      return;
    }

    /*
     * Browser print dialog allows:
     *
     * Destination → Save as PDF
     *
     * This produces a clean PDF without
     * requiring an additional package.
     */

    window.print();
  };


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {

    return (
      <div className="flex min-h-[60vh] items-center justify-center">

        <div className="flex flex-col items-center gap-4">

          <Loader2
            className="
              h-8
              w-8
              animate-spin
              text-blue-600
            "
          />

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

          <div
            className="
              rounded-3xl
              border
              border-red-200
              bg-red-50
              p-8
              text-center
            "
          >

            <XCircle
              className="
                mx-auto
                h-12
                w-12
                text-red-500
              "
            />

            <h2
              className="
                mt-4
                text-xl
                font-extrabold
                text-red-900
              "
            >
              Unable to load receipts
            </h2>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={loadOrders}
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

      {/* =================================================
          PAGE HEADER
      ================================================= */}

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
              bg-blue-50
              text-blue-600
            "
          >
            <ReceiptIcon className="h-5 w-5" />
          </div>

          <div>

            <h1
              className="
                text-2xl
                font-extrabold
                tracking-tight
                text-slate-900
              "
            >
              Receipts
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View, print or save order receipts as PDF.
            </p>

          </div>

        </div>


        {/* =================================================
            ACTION BUTTONS
        ================================================= */}

        {selectedOrder && (

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={downloadPDF}
              className="
                inline-flex
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
                shadow-sm
                transition
                hover:border-blue-200
                hover:bg-blue-50
                hover:text-blue-700
              "
            >
              <Download className="h-4 w-4" />

              Download PDF
            </button>


            <button
              type="button"
              onClick={printReceipt}
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-xl
                bg-blue-600
                px-5
                py-2.5
                text-sm
                font-bold
                text-white
                shadow-lg
                shadow-blue-600/20
                transition
                hover:bg-blue-700
              "
            >
              <Printer className="h-4 w-4" />

              Print Receipt
            </button>

          </div>
        )}

      </div>


      {/* =================================================
          SELECTED RECEIPT
      ================================================= */}

      {selectedOrder ? (

        <div className="mx-auto max-w-5xl">

          {/* =================================================
              RECEIPT
          ================================================= */}

          <div
            id="printable-receipt"
            className="
              overflow-hidden
              rounded-3xl
              border
              border-slate-200
              bg-white
              shadow-sm

              print:mx-0
              print:w-full
              print:max-w-none
              print:rounded-none
              print:border-0
              print:shadow-none
            "
          >

            {/* =================================================
                RECEIPT HEADER
            ================================================= */}

            <div
              className="
                border-b
                border-slate-200
                p-6
                sm:p-8
              "
            >

              <div
                className="
                  flex
                  flex-col
                  gap-6
                  sm:flex-row
                  sm:items-start
                  sm:justify-between
                "
              >

                <div>

                  <div className="flex items-center gap-3">

                    <div
                      className="
                        flex
                        h-12
                        w-12
                        items-center
                        justify-center
                        rounded-2xl
                        bg-blue-600
                        text-white
                      "
                    >
                      <ReceiptIcon className="h-6 w-6" />
                    </div>

                    <div>

                      <h2
                        className="
                          text-xl
                          font-extrabold
                          text-slate-900
                        "
                      >
                        SOMS
                      </h2>

                      <p
                        className="
                          text-xs
                          font-semibold
                          uppercase
                          tracking-wider
                          text-slate-400
                        "
                      >
                        Sales & Order Management System
                      </p>

                    </div>

                  </div>

                </div>


                <div className="text-left sm:text-right">

                  <p
                    className="
                      text-xs
                      font-bold
                      uppercase
                      tracking-wider
                      text-slate-400
                    "
                  >
                    Receipt
                  </p>

                  <p
                    className="
                      mt-1
                      text-lg
                      font-extrabold
                      text-slate-900
                    "
                  >
                    #{getOrderNumber(selectedOrder)}
                  </p>

                  <div className="mt-2">
                    <StatusBadge
                      status={
                        selectedOrder.status
                      }
                    />
                  </div>

                </div>

              </div>

            </div>


            {/* =================================================
                ORDER INFORMATION
            ================================================= */}

            <div
              className="
                grid
                gap-5
                border-b
                border-slate-200
                p-6
                sm:grid-cols-2
                sm:p-8
                lg:grid-cols-4
              "
            >

              <div>

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-bold
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  <Calendar className="h-3.5 w-3.5" />
                  Order Date
                </div>

                <p
                  className="
                    mt-2
                    text-sm
                    font-bold
                    text-slate-800
                  "
                >
                  {formatDate(
                    selectedOrder.created_at,
                  )}
                </p>

              </div>


              <div>

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-bold
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  <Package className="h-3.5 w-3.5" />
                  Department
                </div>

                <p
                  className="
                    mt-2
                    text-sm
                    font-bold
                    capitalize
                    text-slate-800
                  "
                >
                  {getDepartment(
                    selectedOrder,
                  )}
                </p>

              </div>


              <div>

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-bold
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  <User className="h-3.5 w-3.5" />
                  Ordered By
                </div>

                <p
                  className="
                    mt-2
                    text-sm
                    font-bold
                    text-slate-800
                  "
                >
                  {getRequester(
                    selectedOrder,
                  )}
                </p>

              </div>


              <div>

                <div
                  className="
                    flex
                    items-center
                    gap-2
                    text-xs
                    font-bold
                    uppercase
                    tracking-wider
                    text-slate-400
                  "
                >
                  <FileText className="h-3.5 w-3.5" />
                  Status
                </div>

                <div className="mt-2">
                  <StatusBadge
                    status={
                      selectedOrder.status
                    }
                  />
                </div>

              </div>

            </div>


            {/* =================================================
                PRODUCTS
            ================================================= */}

            <div className="p-6 sm:p-8">

              <div className="mb-5">

                <h3
                  className="
                    text-base
                    font-extrabold
                    text-slate-900
                  "
                >
                  Order Items
                </h3>

              </div>


              {getItems(selectedOrder).length ===
              0 ? (

                <div
                  className="
                    rounded-2xl
                    border
                    border-dashed
                    border-slate-300
                    p-8
                    text-center
                  "
                >

                  <Package
                    className="
                      mx-auto
                      h-8
                      w-8
                      text-slate-300
                    "
                  />

                  <p
                    className="
                      mt-3
                      text-sm
                      font-semibold
                      text-slate-500
                    "
                  >
                    No products were found for this order.
                  </p>

                </div>

              ) : (

                <div
                  className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-slate-200
                  "
                >

                  <div className="overflow-x-auto">

                    <table
                      className="
                        w-full
                        min-w-[650px]
                        text-left
                      "
                    >

                      <thead
                        className="bg-slate-50"
                      >

                        <tr>

                          <th
                            className="
                              px-4
                              py-3
                              text-[10px]
                              font-bold
                              uppercase
                              tracking-wider
                              text-slate-400
                            "
                          >
                            Product
                          </th>

                          <th
                            className="
                              px-4
                              py-3
                              text-[10px]
                              font-bold
                              uppercase
                              tracking-wider
                              text-slate-400
                            "
                          >
                            Packaging
                          </th>

                          <th
                            className="
                              px-4
                              py-3
                              text-right
                              text-[10px]
                              font-bold
                              uppercase
                              tracking-wider
                              text-slate-400
                            "
                          >
                            Quantity
                          </th>

                          <th
                            className="
                              px-4
                              py-3
                              text-right
                              text-[10px]
                              font-bold
                              uppercase
                              tracking-wider
                              text-slate-400
                            "
                          >
                            Unit Price
                          </th>

                          <th
                            className="
                              px-4
                              py-3
                              text-right
                              text-[10px]
                              font-bold
                              uppercase
                              tracking-wider
                              text-slate-400
                            "
                          >
                            Total
                          </th>

                        </tr>

                      </thead>


                      <tbody
                        className="
                          divide-y
                          divide-slate-100
                        "
                      >

                        {getItems(
                          selectedOrder,
                        ).map(
                          (item, index) => (

                            <tr
                              key={
                                item.id ||
                                index
                              }
                            >

                              <td className="px-4 py-4">

                                <p
                                  className="
                                    text-sm
                                    font-bold
                                    text-slate-800
                                  "
                                >
                                  {getItemName(item)}
                                </p>

                                {item.unit && (

                                  <p
                                    className="
                                      mt-1
                                      text-xs
                                      text-slate-400
                                    "
                                  >
                                    Unit: {item.unit}
                                  </p>

                                )}

                              </td>


                              <td className="px-4 py-4">

                                <span
                                  className="
                                    text-sm
                                    text-slate-600
                                  "
                                >
                                  {item.packaging ||
                                    '—'}
                                </span>

                              </td>


                              <td
                                className="
                                  px-4
                                  py-4
                                  text-right
                                "
                              >

                                <span
                                  className="
                                    text-sm
                                    font-semibold
                                    text-slate-700
                                  "
                                >
                                  {getItemQuantity(
                                    item,
                                  )}
                                </span>

                              </td>


                              <td
                                className="
                                  px-4
                                  py-4
                                  text-right
                                "
                              >

                                <span
                                  className="
                                    text-sm
                                    text-slate-600
                                  "
                                >
                                  {formatCurrency(
                                    getItemPrice(
                                      item,
                                    ),
                                  )}
                                </span>

                              </td>


                              <td
                                className="
                                  px-4
                                  py-4
                                  text-right
                                "
                              >

                                <span
                                  className="
                                    text-sm
                                    font-bold
                                    text-slate-900
                                  "
                                >
                                  {formatCurrency(
                                    getItemTotal(
                                      item,
                                    ),
                                  )}
                                </span>

                              </td>

                            </tr>

                          ),
                        )}

                      </tbody>

                    </table>

                  </div>

                </div>

              )}


              {/* =================================================
                  NOTES
              ================================================= */}

              {selectedOrder.notes && (

                <div
                  className="
                    mt-6
                    rounded-2xl
                    bg-slate-50
                    p-4
                  "
                >

                  <p
                    className="
                      text-[10px]
                      font-bold
                      uppercase
                      tracking-wider
                      text-slate-400
                    "
                  >
                    Order Notes
                  </p>

                  <p
                    className="
                      mt-2
                      text-sm
                      leading-6
                      text-slate-600
                    "
                  >
                    {selectedOrder.notes}
                  </p>

                </div>

              )}


              {/* =================================================
                  TOTAL
              ================================================= */}

              <div className="mt-8 flex justify-end">

                <div className="w-full max-w-sm">

                  <div
                    className="
                      flex
                      items-center
                      justify-between
                      border-t-2
                      border-slate-900
                      pt-4
                    "
                  >

                    <span
                      className="
                        text-sm
                        font-bold
                        text-slate-600
                      "
                    >
                      Order Total
                    </span>

                    <span
                      className="
                        text-2xl
                        font-black
                        text-slate-900
                      "
                    >
                      {formatCurrency(
                        getOrderTotal(
                          selectedOrder,
                        ),
                      )}
                    </span>

                  </div>

                </div>

              </div>


              {/* =================================================
                  RECEIPT FOOTER
              ================================================= */}

              <div
                className="
                  mt-10
                  border-t
                  border-slate-200
                  pt-6
                  text-center
                "
              >

                <p
                  className="
                    text-xs
                    font-semibold
                    text-slate-500
                  "
                >
                  Thank you for using SOMS.
                </p>

                <p
                  className="
                    mt-1
                    text-[10px]
                    text-slate-400
                  "
                >
                  Sales & Order Management System
                </p>

              </div>

            </div>

          </div>


          {/* =================================================
              RECEIPT CONTROLS
          ================================================= */}

          <div
            className="
              mt-6
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:justify-between
              print:hidden
            "
          >

            <button
              type="button"
              onClick={() =>
                setSelectedOrder(null)
              }
              className="
                inline-flex
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
                text-slate-600
                transition
                hover:bg-slate-50
              "
            >

              <ArrowLeft className="h-4 w-4" />

              Back to Receipts

            </button>


            <div className="flex gap-2">

              <button
                type="button"
                onClick={downloadPDF}
                className="
                  inline-flex
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
                  hover:bg-blue-50
                  hover:text-blue-700
                "
              >

                <Download className="h-4 w-4" />

                Save as PDF

              </button>


              <button
                type="button"
                onClick={printReceipt}
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  px-5
                  py-2.5
                  text-sm
                  font-bold
                  text-white
                  transition
                  hover:bg-blue-700
                "
              >

                <Printer className="h-4 w-4" />

                Print

              </button>

            </div>

          </div>

        </div>

      ) : (

        /* =====================================================
           RECEIPT LIST
        ===================================================== */

        <div className="soms-card overflow-hidden">

          {/* =================================================
              LIST HEADER
          ================================================= */}

          <div
            className="
              border-b
              border-slate-100
              p-5
              sm:p-6
            "
          >

            <div
              className="
                flex
                flex-col
                gap-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >

              <div>

                <h2
                  className="
                    text-base
                    font-extrabold
                    text-slate-900
                  "
                >
                  Available Orders
                </h2>

                <p
                  className="
                    mt-1
                    text-xs
                    text-slate-400
                  "
                >
                  Select an order to view its receipt.
                </p>

              </div>


              <div
                className="
                  relative
                  w-full
                  sm:w-72
                "
              >

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
                    focus:border-blue-500
                    focus:bg-white
                    focus:ring-4
                    focus:ring-blue-500/10
                  "
                />

              </div>

            </div>

          </div>


          {/* =================================================
              EMPTY STATE
          ================================================= */}

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

              <h3
                className="
                  mt-4
                  text-base
                  font-extrabold
                  text-slate-800
                "
              >
                No orders found
              </h3>

              <p
                className="
                  mx-auto
                  mt-2
                  max-w-sm
                  text-sm
                  leading-6
                  text-slate-500
                "
              >
                Orders created in SOMS will appear here.
              </p>

            </div>

          ) : (

            /* =================================================
               ORDER LIST
            ================================================= */

            <div
              className="
                divide-y
                divide-slate-100
              "
            >

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

                    <div
                      className="
                        flex
                        min-w-0
                        items-center
                        gap-4
                      "
                    >

                      <div
                        className="
                          flex
                          h-11
                          w-11
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-blue-50
                          text-blue-600
                        "
                      >
                        <ReceiptIcon className="h-5 w-5" />
                      </div>


                      <div className="min-w-0">

                        <p
                          className="
                            truncate
                            text-sm
                            font-extrabold
                            text-slate-900
                          "
                        >
                          #{getOrderNumber(order)}
                        </p>

                        <p
                          className="
                            mt-1
                            truncate
                            text-xs
                            text-slate-500
                          "
                        >
                          {getDepartment(order)}
                          {' • '}
                          {formatDate(
                            order.created_at,
                          )}
                        </p>

                      </div>

                    </div>


                    <div
                      className="
                        flex
                        shrink-0
                        items-center
                        gap-4
                      "
                    >

                      <div
                        className="
                          hidden
                          text-right
                          sm:block
                        "
                      >

                        <p
                          className="
                            text-sm
                            font-black
                            text-slate-900
                          "
                        >
                          {formatCurrency(
                            getOrderTotal(
                              order,
                            ),
                          )}
                        </p>

                        <p
                          className="
                            mt-1
                            text-[10px]
                            text-slate-400
                          "
                        >
                          {getItems(order).length}{' '}
                          item
                          {getItems(order).length ===
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

    </div>
  );
}


/* =========================================================
   PRINT STYLES
========================================================= */
