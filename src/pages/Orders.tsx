import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  AlertTriangle,
  Edit3,
  Eye,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../lib/auth';

import {
  deleteOrder,
  fetchOrders,
  subscribeToOrders,
} from '../services/orders';

import { supabase } from '../lib/supabase';

import { LoadingSpinner } from '../components/LoadingSpinner';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

import type { OrderStatus } from '../types/database';

/* =========================================================
   UPDATE ORDER
========================================================= */

type UpdateOrderInput = {
  department?: string;
  customer_name?: string | null;
  notes?: string | null;
  delivery_info?: string | null;
};

export async function updateOrder(
  orderId: string,
  input: UpdateOrderInput,
  userId: string
): Promise<OrderRecord> {
  if (!orderId?.trim()) {
    throw new Error(
      'Order ID is required.'
    );
  }

  if (!userId?.trim()) {
    throw new Error(
      'You must be signed in to edit an order.'
    );
  }

  const cleanedOrderId =
    orderId.trim();

  if (
    input.department !== undefined &&
    !input.department.trim()
  ) {
    throw new Error(
      'Department is required.'
    );
  }

  const updates: Record<
    string,
    unknown
  > = {
    updated_at:
      new Date().toISOString(),
  };

  if (
    input.department !== undefined
  ) {
    updates.department =
      input.department.trim();
  }

  if (
    input.customer_name !==
    undefined
  ) {
    updates.customer_name =
      input.customer_name?.trim() ||
      null;
  }

  if (
    input.notes !== undefined
  ) {
    updates.notes =
      input.notes?.trim() ||
      null;
  }

  if (
    input.delivery_info !==
    undefined
  ) {
    updates.delivery_info =
      input.delivery_info?.trim() ||
      null;
  }

  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', cleanedOrderId)
    .select()
    .single();

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (!updatedOrder) {
    throw new Error('Order not found.');
  }

  return updatedOrder as OrderRecord;
}

/* =========================================================
   TYPES
========================================================= */

type OrderRecord = {
  id: string;
  order_number: string;
  department: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  customer_name?: string | null;
  notes?: string | null;
  delivery_info?: string | null;
};

/* =========================================================
   COMPONENT
========================================================= */

export default function Orders() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] =
    useState<OrderRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState('');

  const [status, setStatus] =
    useState('');

  const [error, setError] =
    useState('');

  /* =======================================================
     DELETE
  ======================================================= */

  const [deleteTarget, setDeleteTarget] =
    useState<OrderRecord | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  /* =======================================================
     EDIT
  ======================================================= */

  const [editTarget, setEditTarget] =
    useState<OrderRecord | null>(null);

  const [editDepartment, setEditDepartment] =
    useState('');

  const [editCustomerName, setEditCustomerName] =
    useState('');

  const [editDeliveryInfo, setEditDeliveryInfo] =
    useState('');

  const [editNotes, setEditNotes] =
    useState('');

  const [savingEdit, setSavingEdit] =
    useState(false);

  /* =======================================================
     LOAD ORDERS
  ======================================================= */

  const loadOrders = useCallback(
    async () => {
      try {
        setLoading(true);
        setError('');

        const data =
          await fetchOrders({
            search:
              search.trim() ||
              undefined,

            status:
              status
                ? (status as OrderStatus)
                : undefined,
          });

        setOrders(
          data as OrderRecord[]
        );
      } catch (err) {
        console.error(
          'Unable to load orders:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load orders.'
        );
      } finally {
        setLoading(false);
      }
    },
    [search, status]
  );

  /* =======================================================
     LOAD WHEN FILTERS CHANGE
  ======================================================= */

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        void loadOrders();
      }, 250);

    return () =>
      window.clearTimeout(timer);
  }, [loadOrders]);

  /* =======================================================
     REALTIME
  ======================================================= */

  useEffect(() => {
    const unsubscribe =
      subscribeToOrders(
        (incomingOrder) => {
          const order =
            incomingOrder as OrderRecord;

          setOrders(
            (current) => {
              const exists =
                current.some(
                  (item) =>
                    item.id === order.id
                );

              if (exists) {
                return current.map(
                  (item) =>
                    item.id === order.id
                      ? {
                          ...item,
                          ...order,
                        }
                      : item
                );
              }

              return [
                order,
                ...current,
              ];
            }
          );
        },

        (deletedOrderId) => {
          setOrders(
            (current) =>
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
  }, []);

  /* =======================================================
     REFRESH
  ======================================================= */

  async function refresh() {
    setRefreshing(true);

    try {
      await loadOrders();
    } finally {
      setRefreshing(false);
    }
  }

  /* =======================================================
     OPEN EDIT
  ======================================================= */

  function openEdit(
    order: OrderRecord
  ) {
    setError('');

    setEditTarget(order);

    setEditDepartment(
      order.department || ''
    );

    setEditCustomerName(
      order.customer_name || ''
    );

    setEditDeliveryInfo(
      order.delivery_info || ''
    );

    setEditNotes(
      order.notes || ''
    );
  }

  /* =======================================================
     CLOSE EDIT
  ======================================================= */

  function closeEdit() {
    if (savingEdit) {
      return;
    }

    setEditTarget(null);
  }

  /* =======================================================
     SAVE EDIT
  ======================================================= */

  async function saveEdit() {
    if (!editTarget) {
      return;
    }

    if (!profile?.id) {
      setError(
        'You must be signed in to edit an order.'
      );

      return;
    }

    if (!editDepartment.trim()) {
      setError(
        'Department is required.'
      );

      return;
    }

    setSavingEdit(true);
    setError('');

    try {
      const updated =
        await updateOrder(
          editTarget.id,
          {
            department:
              editDepartment.trim(),

            customer_name:
              editCustomerName.trim() ||
              null,

            delivery_info:
              editDeliveryInfo.trim() ||
              null,

            notes:
              editNotes.trim() ||
              null,
          },
          profile.id
        );

      setOrders(
        (current) =>
          current.map(
            (order) =>
              order.id === updated.id
                ? {
                    ...order,
                    ...(updated as OrderRecord),
                  }
                : order
          )
      );

      setEditTarget(null);
    } catch (err) {
      console.error(
        'Unable to update order:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update order.'
      );
    } finally {
      setSavingEdit(false);
    }
  }

  /* =======================================================
     OPEN DELETE
  ======================================================= */

  function openDelete(
    order: OrderRecord
  ) {
    setError('');
    setDeleteTarget(order);
  }

  /* =======================================================
     CLOSE DELETE
  ======================================================= */

  function closeDelete() {
    if (deletingId) {
      return;
    }

    setDeleteTarget(null);
  }

  /* =======================================================
     DELETE ORDER
  ======================================================= */

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    if (!profile?.id) {
      setError(
        'You must be signed in to delete an order.'
      );

      setDeleteTarget(null);

      return;
    }

    const orderId =
      deleteTarget.id;

    setDeletingId(orderId);
    setError('');

    try {
      await deleteOrder(orderId);

      setOrders(
        (current) =>
          current.filter(
            (order) =>
              order.id !== orderId
          )
      );

      setDeleteTarget(null);
    } catch (err) {
      console.error(
        'Unable to delete order:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete order.'
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="soms-page space-y-6">

      {/* HEADER */}

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
            View, edit, and manage all
            orders in the system.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void refresh()
          }
          disabled={refreshing}
          className="soms-button soms-button-secondary"
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

      {/* ERROR */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">

          <AlertTriangle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div className="flex-1">
            <p className="font-semibold">
              Action failed
            </p>

            <p className="mt-1">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setError('')
            }
          >
            <X size={17} />
          </button>

        </div>
      )}

      {/* FILTERS */}

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
              event.target.value
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

      {/* TABLE */}

      <div className="soms-table-wrapper">

        {loading ? (

          <div className="flex min-h-[280px] items-center justify-center">
            <LoadingSpinner />
          </div>

        ) : orders.length === 0 ? (

          <EmptyState
            title="No orders found"
            description="There are no orders matching your current filters."
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
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {orders.map(
                (order) => {

                  const deleting =
                    deletingId ===
                    order.id;

                  return (
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
                        {
                          order.department
                        }
                      </td>

                      <td>
                        {
                          order.customer_name ||
                          '—'
                        }
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
                        {new Date(
                          order.created_at
                        ).toLocaleDateString()}
                      </td>

                      <td>

                        <div className="flex flex-wrap gap-2">

                          {/* VIEW */}

                          <button
                            type="button"
                            disabled={
                              deleting
                            }
                            onClick={() =>
                              navigate(
                                `/orders/${order.id}`
                              )
                            }
                            className="soms-button soms-button-secondary"
                          >
                            <Eye size={15} />
                            View
                          </button>

                          {/* EDIT */}

                          <button
                            type="button"
                            disabled={
                              deleting ||
                              deletingId !== null
                            }
                            onClick={() =>
                              openEdit(order)
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Edit3 size={15} />
                            Edit
                          </button>

                          {/* DELETE */}

                          <button
                            type="button"
                            disabled={
                              deleting ||
                              deletingId !== null
                            }
                            onClick={() =>
                              openDelete(order)
                            }
                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deleting ? (
                              <RefreshCw
                                size={15}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={15} />
                            )}

                            {deleting
                              ? 'Deleting...'
                              : 'Delete'}
                          </button>

                        </div>

                      </td>

                    </tr>
                  );
                }
              )}

            </tbody>

          </table>

        )}

      </div>

      {/* =====================================================
          EDIT MODAL
      ===================================================== */}

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between border-b border-slate-200 p-6">

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Edit Order
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  #
                  {
                    editTarget.order_number
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={savingEdit}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>

            </div>

            <div className="space-y-5 p-6">

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Department
                </label>

                <input
                  value={editDepartment}
                  onChange={(event) =>
                    setEditDepartment(
                      event.target.value
                    )
                  }
                  className="soms-input w-full"
                  placeholder="Department"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Customer
                </label>

                <input
                  value={editCustomerName}
                  onChange={(event) =>
                    setEditCustomerName(
                      event.target.value
                    )
                  }
                  className="soms-input w-full"
                  placeholder="Customer name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Delivery Information
                </label>

                <input
                  value={editDeliveryInfo}
                  onChange={(event) =>
                    setEditDeliveryInfo(
                      event.target.value
                    )
                  }
                  className="soms-input w-full"
                  placeholder="Delivery information"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Notes
                </label>

                <textarea
                  value={editNotes}
                  onChange={(event) =>
                    setEditNotes(
                      event.target.value
                    )
                  }
                  rows={4}
                  className="soms-input w-full resize-none"
                  placeholder="Order notes..."
                />
              </div>

            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 p-6">

              <button
                type="button"
                onClick={closeEdit}
                disabled={savingEdit}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void saveEdit()
                }
                disabled={savingEdit}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {savingEdit && (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                )}

                {savingEdit
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>

            </div>

          </div>

        </div>
      )}

      {/* =====================================================
          DELETE CONFIRMATION
      ===================================================== */}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">

          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

            <div className="flex items-start gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
                <Trash2 size={22} />
              </div>

              <div>

                <h2 className="text-lg font-bold text-slate-900">
                  Delete Order?
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Are you sure you want to permanently
                  delete
                  <strong className="mx-1 text-slate-900">
                    #
                    {
                      deleteTarget.order_number
                    }
                  </strong>
                  ?
                </p>

                <p className="mt-2 text-xs leading-5 text-red-600">
                  The order and its related records
                  will be removed. This action cannot
                  be undone.
                </p>

              </div>

            </div>

            <div className="mt-6 flex justify-end gap-3">

              <button
                type="button"
                onClick={closeDelete}
                disabled={
                  deletingId !== null
                }
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() =>
                  void confirmDelete()
                }
                disabled={
                  deletingId !== null
                }
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
              >

                {deletingId ? (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Trash2 size={16} />
                )}

                {deletingId
                  ? 'Deleting...'
                  : 'Yes, Delete'}

              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}