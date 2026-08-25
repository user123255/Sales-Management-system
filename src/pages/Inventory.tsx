import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  CheckCircle2,
  Edit3,
  Package,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  addStock,
  adjustStock,
  fetchInventory,
  removeStock,
  subscribeToInventory,
} from '../services/inventory';

import type { InventoryItem } from '../types/database';

import {
  supabase,
  getFriendlyError,
} from '../lib/supabase';

import { useAuth } from '../lib/auth';

/* =========================================================
   STOCK MODAL
========================================================= */

type StockModalMode =
  | 'in'
  | 'out'
  | 'adjustment';

type StockModalProps = {
  open: boolean;
  mode: StockModalMode;
  item: InventoryItem | null;
  onClose: () => void;
  onSuccess: () => Promise<void>;
};

function StockModal({
  open,
  mode,
  item,
  onClose,
  onSuccess,
}: StockModalProps) {
  const [quantity, setQuantity] =
    useState('');

  const [reason, setReason] =
    useState('');

  const [notes, setNotes] =
    useState('');

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuantity('');

    setReason(
      mode === 'in'
        ? 'Stock received'
        : mode === 'out'
          ? 'Stock used'
          : 'Stock adjustment'
    );

    setNotes('');
    setError(null);
  }, [open, mode, item]);

  if (!open || !item) {
    return null;
  }

  const productName =
    item.product?.name ||
    'Product';

  const currentQuantity =
    Number(item.quantity || 0);

  const numericQuantity =
    Number(quantity);

  const previewQuantity =
    mode === 'in'
      ? currentQuantity +
        (Number.isFinite(numericQuantity)
          ? numericQuantity
          : 0)
      : mode === 'out'
        ? currentQuantity -
          (Number.isFinite(numericQuantity)
            ? numericQuantity
            : 0)
        : Number.isFinite(numericQuantity)
          ? numericQuantity
          : currentQuantity;

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const value = Number(quantity);

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      setError(
        mode === 'adjustment'
          ? 'Enter a valid stock quantity.'
          : 'Enter a quantity greater than zero.'
      );
      return;
    }

    if (
      mode === 'out' &&
      value > currentQuantity
    ) {
      setError(
        `You cannot remove ${value}. Only ${currentQuantity} ${
          item.product?.unit || 'units'
        } is available.`
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (mode === 'in') {
        await addStock(
          item.product_id,
          value
        );
      } else if (mode === 'out') {
        await removeStock(
          item.product_id,
          value
        );
      } else {
        await adjustStock(
          item.product_id,
          value
        );
      }

      await onSuccess();

      onClose();
    } catch (err) {
      console.error(
        'Unable to update stock:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update stock.'
      );
    } finally {
      setSaving(false);
    }
  };

  const title =
    mode === 'in'
      ? 'Add Stock'
      : mode === 'out'
        ? 'Remove Stock'
        : 'Adjust Stock';

  const description =
    mode === 'in'
      ? 'Add newly received stock to inventory.'
      : mode === 'out'
        ? 'Remove stock that has been used or issued.'
        : 'Set the exact physical quantity currently available.';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {productName}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-5"
        >
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70">

            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Inventory ID
              </span>

              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {item.inventory_number ||
                  'Not assigned'}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Current stock
              </span>

              <span className="font-bold text-slate-900 dark:text-white">
                {currentQuantity}{' '}
                {item.product?.unit || ''}
              </span>
            </div>

            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {description}
            </div>
          </div>

          {error && (
            <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />

              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              {mode === 'adjustment'
                ? 'New Stock Quantity'
                : 'Quantity'}
            </label>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(event) =>
                  setQuantity(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-16 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                placeholder="0"
                autoFocus
              />

              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                {item.product?.unit ||
                  'units'}
              </span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Reason
            </label>

            <input
              type="text"
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Why is stock changing?"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Notes
              <span className="ml-1 font-normal text-slate-400">
                (optional)
              </span>
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              placeholder="Additional information..."
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                New stock level
              </span>

              <span
                className={`font-bold ${
                  previewQuantity < 0
                    ? 'text-red-600'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {Number.isFinite(
                  previewQuantity
                )
                  ? previewQuantity
                  : currentQuantity}{' '}
                {item.product?.unit || ''}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-400"
            >
              {saving && (
                <RefreshCw className="h-4 w-4 animate-spin" />
              )}

              {!saving &&
                mode === 'in' && (
                  <ArrowUp className="h-4 w-4" />
                )}

              {!saving &&
                mode === 'out' && (
                  <ArrowDown className="h-4 w-4" />
                )}

              {!saving &&
                mode === 'adjustment' && (
                  <Edit3 className="h-4 w-4" />
                )}

              {saving
                ? 'Saving...'
                : 'Save Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   DELETE CONFIRMATION MODAL
========================================================= */

type DeleteInventoryModalProps = {
  open: boolean;
  item: InventoryItem | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
};

function DeleteInventoryModal({
  open,
  item,
  deleting,
  onCancel,
  onConfirm,
}: DeleteInventoryModalProps) {
  if (!open || !item) {
    return null;
  }

  const productName =
    item.product?.name ||
    'Unknown product';

  const quantity =
    Number(item.quantity || 0);

  const unit =
    item.product?.unit ||
    item.unit ||
    'units';

  const inventoryNumber =
    item.inventory_number ||
    'Not assigned';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">

      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">

        {/* HEADER */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">

          <div className="flex items-start gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Delete Inventory
              </h2>

              <p className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                Permanent action
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>

        </div>

        {/* CONTENT */}
        <div className="space-y-5 p-6">

          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">

            <div className="flex gap-3">

              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

              <div>
                <p className="font-semibold text-red-800 dark:text-red-300">
                  Are you sure you want to delete this inventory record?
                </p>

                <p className="mt-1 text-sm text-red-700 dark:text-red-400">
                  This permanently removes the inventory record from the database.
                </p>
              </div>

            </div>

          </div>

          {/* INVENTORY DETAILS */}
          <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">

            <div className="grid grid-cols-1 divide-y divide-slate-200 dark:divide-slate-700">

              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Product
                </span>

                <span className="text-right font-semibold text-slate-900 dark:text-white">
                  {productName}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Current stock
                </span>

                <span className="font-semibold text-slate-900 dark:text-white">
                  {quantity} {unit}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
                <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Inventory ID
                </span>

                <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {inventoryNumber}
                </span>
              </div>

            </div>

          </div>

          {/* WARNING */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">

            <p className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Important:</strong>{' '}
              Delete removes only the inventory record.
              The product itself remains in the Products table.
            </p>

          </div>

        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-800">

          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
          >

            {deleting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Delete Inventory
              </>
            )}

          </button>

        </div>

      </div>
    </div>
  );
}

/* =========================================================
   INVENTORY PAGE
========================================================= */

export function Inventory() {
  useAuth();

  const [inventory, setInventory] =
    useState<InventoryItem[]>([]);

  const [search, setSearch] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [modalMode, setModalMode] =
    useState<StockModalMode>('in');

  const [selectedItem, setSelectedItem] =
    useState<InventoryItem | null>(null);

  const [deleteItem, setDeleteItem] =
    useState<InventoryItem | null>(null);

  /* =======================================================
     LOAD INVENTORY
  ======================================================= */

  const loadInventory =
    useCallback(
      async (
        showLoading = true
      ) => {
        try {
          if (showLoading) {
            setLoading(true);
          }

          setError(null);

          const data =
            await fetchInventory();

          setInventory(data);
        } catch (err) {
          console.error(
            'Unable to load inventory:',
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load inventory.'
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    void loadInventory(true);
  }, [loadInventory]);

  /* =======================================================
     REALTIME
  ======================================================= */

  useEffect(() => {
    const unsubscribe =
      subscribeToInventory(() => {
        void loadInventory(false);
      });

    return unsubscribe;
  }, [loadInventory]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredInventory =
    useMemo(() => {
      const value =
        search.trim().toLowerCase();

      if (!value) {
        return inventory;
      }

      return inventory.filter(
        (item) => {
          const product =
            item.product;

          return (
            product?.name
              ?.toLowerCase()
              .includes(value) ||
            product?.category
              ?.toLowerCase()
              .includes(value) ||
            product?.unit
              ?.toLowerCase()
              .includes(value) ||
            item.inventory_number
              ?.toLowerCase()
              .includes(value)
          );
        }
      );
    }, [inventory, search]);

  /* =======================================================
     STATS
  ======================================================= */

  const totalProducts =
    inventory.length;

  const inStock =
    inventory.filter(
      (item) =>
        Number(item.quantity || 0) > 0
    ).length;

  const lowStock =
    inventory.filter(
      (item) => {
        const quantity =
          Number(item.quantity || 0);

        const threshold =
          Number(
            item.low_stock_threshold || 0
          );

        return (
          quantity > 0 &&
          quantity <= threshold
        );
      }
    ).length;

  const outOfStock =
    inventory.filter(
      (item) =>
        Number(item.quantity || 0) <= 0
    ).length;

  /* =======================================================
     STOCK MODAL
  ======================================================= */

  const openStockModal = (
    mode: StockModalMode,
    item: InventoryItem
  ) => {
    setModalMode(mode);
    setSelectedItem(item);
  };

  const closeStockModal = () => {
    setSelectedItem(null);
  };

  /* =======================================================
     OPEN DELETE CONFIRMATION
  ======================================================= */

  const openDeleteConfirmation = (
    item: InventoryItem
  ) => {
    setDeleteItem(item);
  };

  /* =======================================================
     CLOSE DELETE CONFIRMATION
  ======================================================= */

  const closeDeleteConfirmation = () => {
    if (deletingId) {
      return;
    }

    setDeleteItem(null);
  };

  /* =======================================================
     DELETE INVENTORY RECORD
  ======================================================= */

  const handleDeleteInventory =
    async () => {
      if (!deleteItem) {
        return;
      }

      const item =
        deleteItem;

      try {
        setDeletingId(item.id);
        setError(null);

        /*
         * IMPORTANT:
         *
         * inventory_number is the human-readable ID.
         *
         * item.id is the actual Supabase database UUID.
         *
         * We use item.id to delete the exact
         * inventory row.
         */
        const {
          error: deleteError,
        } = await supabase
          .from('inventory')
          .delete()
          .eq('id', item.id);

        if (deleteError) {
          throw new Error(
            getFriendlyError(
              deleteError
            )
          );
        }

        /*
         * Remove immediately from UI.
         */
        setInventory((current) =>
          current.filter(
            (inventoryItem) =>
              inventoryItem.id !==
              item.id
          )
        );

        /*
         * Close confirmation.
         */
        setDeleteItem(null);

        /*
         * Verify database state.
         */
        await loadInventory(false);
      } catch (err) {
        console.error(
          'Unable to delete inventory record:',
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to delete inventory record.'
        );

        /*
         * Reload so the UI remains
         * synchronized with Supabase.
         */
        await loadInventory(false);
      } finally {
        setDeletingId(null);
      }
    };

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInventory(false);
  };

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">

          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-emerald-600" />

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Loading inventory...
          </p>

        </div>
      </div>
    );
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <>
      <div className="soms-page space-y-6">

        {/* HEADER */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
              <Boxes className="h-5 w-5" />
            </div>

            <div>

              <h1 className="soms-page-title">
                Inventory
              </h1>

              <p className="soms-page-description">
                Manage stock levels,
                availability, and stock
                movements.
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Refresh
          </button>

        </div>

        {/* ERROR */}
        {error && (
          <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">

            <div className="flex items-start gap-3">

              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <div>

                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  Inventory operation failed
                </p>

                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>

              </div>

            </div>

            <button
              type="button"
              onClick={() =>
                setError(null)
              }
              className="rounded-lg p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              <X className="h-4 w-4" />
            </button>

          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="soms-stat-card">
            <div className="flex items-center justify-between">

              <div>
                <div className="soms-stat-label">
                  TOTAL PRODUCTS
                </div>

                <div className="soms-stat-value">
                  {totalProducts}
                </div>
              </div>

              <Package className="h-6 w-6 text-blue-600" />

            </div>
          </div>

          <div className="soms-stat-card">
            <div className="flex items-center justify-between">

              <div>
                <div className="soms-stat-label">
                  IN STOCK
                </div>

                <div className="soms-stat-value">
                  {inStock}
                </div>
              </div>

              <CheckCircle2 className="h-6 w-6 text-emerald-600" />

            </div>
          </div>

          <div className="soms-stat-card">
            <div className="flex items-center justify-between">

              <div>
                <div className="soms-stat-label">
                  LOW STOCK
                </div>

                <div className="soms-stat-value">
                  {lowStock}
                </div>
              </div>

              <AlertTriangle className="h-6 w-6 text-amber-600" />

            </div>
          </div>

          <div className="soms-stat-card">
            <div className="flex items-center justify-between">

              <div>
                <div className="soms-stat-label">
                  OUT OF STOCK
                </div>

                <div className="soms-stat-value">
                  {outOfStock}
                </div>
              </div>

              <XCircle className="h-6 w-6 text-red-600" />

            </div>
          </div>

        </div>

        {/* TABLE */}
        <div className="soms-card overflow-hidden">

          <div className="soms-card-header flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

            <div>

              <h3>
                Stock Inventory
              </h3>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Manage stock and inventory records.
              </p>

            </div>

            <div className="relative w-full lg:w-[320px]">

              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                className="soms-input w-full"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search product or Inventory ID..."
                style={{
                  paddingLeft: 38,
                }}
              />

            </div>

          </div>

          {filteredInventory.length ===
          0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center px-5 text-center">

              <Package className="h-12 w-12 text-slate-300 dark:text-slate-700" />

              <h3 className="mt-4 font-semibold text-slate-800 dark:text-slate-200">
                {inventory.length === 0
                  ? 'No inventory records'
                  : 'No matching products'}
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {inventory.length === 0
                  ? 'There are currently no inventory records.'
                  : 'Try a different product name or Inventory ID.'}
              </p>

            </div>
          ) : (
            <>

              {/* DESKTOP */}

              <div className="hidden overflow-x-auto md:block">

                <table className="w-full">

                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">

                      <th className="px-5 py-4">
                        Inventory ID
                      </th>

                      <th className="px-5 py-4">
                        Product
                      </th>

                      <th className="px-5 py-4">
                        Category
                      </th>

                      <th className="px-5 py-4">
                        Current Stock
                      </th>

                      <th className="px-5 py-4">
                        Threshold
                      </th>

                      <th className="px-5 py-4">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right">
                        Actions
                      </th>

                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">

                    {filteredInventory.map(
                      (item) => {

                        const quantity =
                          Number(
                            item.quantity || 0
                          );

                        const threshold =
                          Number(
                            item.low_stock_threshold ||
                              0
                          );

                        const isOut =
                          quantity <= 0;

                        const isLow =
                          !isOut &&
                          quantity <=
                            threshold;

                        const deleting =
                          deletingId ===
                          item.id;

                        return (
                          <tr
                            key={item.id}
                            className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                          >

                            {/* INVENTORY ID */}

                            <td className="px-5 py-4">

                              <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1.5 font-mono text-xs font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                                {item.inventory_number ||
                                  'Not assigned'}
                              </span>

                            </td>

                            {/* PRODUCT */}

                            <td className="px-5 py-4">

                              <div className="font-semibold text-slate-900 dark:text-white">
                                {item.product
                                  ?.name ||
                                  'Unknown product'}
                              </div>

                              <div className="mt-1 text-xs text-slate-400">
                                Unit:{' '}
                                {item.product
                                  ?.unit ||
                                  item.unit ||
                                  'unit'}
                              </div>

                            </td>

                            {/* CATEGORY */}

                            <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                              {item.product
                                ?.category ||
                                '—'}
                            </td>

                            {/* STOCK */}

                            <td className="px-5 py-4">

                              <span className="text-lg font-bold text-slate-900 dark:text-white">
                                {quantity}
                              </span>

                              <span className="ml-1 text-xs text-slate-400">
                                {item.product
                                  ?.unit ||
                                  item.unit ||
                                  ''}
                              </span>

                            </td>

                            {/* THRESHOLD */}

                            <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                              {threshold}{' '}
                              {item.product
                                ?.unit ||
                                item.unit ||
                                ''}
                            </td>

                            {/* STATUS */}

                            <td className="px-5 py-4">

                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  isOut
                                    ? 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                                    : isLow
                                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                                }`}
                              >

                                <span className="h-1.5 w-1.5 rounded-full bg-current" />

                                {isOut
                                  ? 'Out of stock'
                                  : isLow
                                    ? 'Low stock'
                                    : 'In stock'}

                              </span>

                            </td>

                            {/* ACTIONS */}

                            <td className="px-5 py-4">

                              <div className="flex justify-end gap-2">

                                <button
                                  type="button"
                                  onClick={() =>
                                    openStockModal(
                                      'in',
                                      item
                                    )
                                  }
                                  disabled={deleting}
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  Add
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openStockModal(
                                      'out',
                                      item
                                    )
                                  }
                                  disabled={
                                    quantity <=
                                      0 ||
                                    deleting
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <ArrowDown className="h-3.5 w-3.5" />
                                  Remove
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openStockModal(
                                      'adjustment',
                                      item
                                    )
                                  }
                                  disabled={
                                    deleting
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  Adjust
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openDeleteConfirmation(
                                      item
                                    )
                                  }
                                  disabled={
                                    deleting
                                  }
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
                                >
                                  {deleting ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}

                                  Delete
                                </button>

                              </div>

                            </td>

                          </tr>
                        );
                      }
                    )}

                  </tbody>
                </table>

              </div>

              {/* MOBILE */}

              <div className="grid gap-3 p-3 md:hidden">

                {filteredInventory.map(
                  (item) => {

                    const quantity =
                      Number(
                        item.quantity || 0
                      );

                    const threshold =
                      Number(
                        item.low_stock_threshold ||
                          0
                      );

                    const isOut =
                      quantity <= 0;

                    const isLow =
                      !isOut &&
                      quantity <=
                        threshold;

                    const deleting =
                      deletingId ===
                      item.id;

                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div>

                            <div className="mb-2 inline-flex rounded-lg bg-emerald-50 px-2 py-1 font-mono text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                              {item.inventory_number ||
                                'Not assigned'}
                            </div>

                            <h3 className="font-bold text-slate-900 dark:text-white">
                              {item.product
                                ?.name ||
                                'Unknown product'}
                            </h3>

                            <p className="mt-1 text-xs text-slate-500">
                              {item.product
                                ?.category ||
                                'No category'}
                            </p>

                          </div>

                          <span
                            className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                              isOut
                                ? 'bg-red-100 text-red-700'
                                : isLow
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isOut
                              ? 'OUT'
                              : isLow
                                ? 'LOW'
                                : 'IN STOCK'}
                          </span>

                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3">

                          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">

                            <p className="text-[10px] font-semibold uppercase text-slate-400">
                              Stock
                            </p>

                            <p className="mt-1 font-bold text-slate-900 dark:text-white">
                              {quantity}{' '}
                              {item.product
                                ?.unit ||
                                item.unit ||
                                ''}
                            </p>

                          </div>

                          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">

                            <p className="text-[10px] font-semibold uppercase text-slate-400">
                              Threshold
                            </p>

                            <p className="mt-1 font-bold text-slate-900 dark:text-white">
                              {threshold}{' '}
                              {item.product
                                ?.unit ||
                                item.unit ||
                                ''}
                            </p>

                          </div>

                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              openStockModal(
                                'in',
                                item
                              )
                            }
                            disabled={
                              deleting
                            }
                            className="rounded-lg bg-emerald-600 px-2 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                          >
                            + Add
                          </button>

                          <button
                            type="button"
                            disabled={
                              quantity <=
                                0 ||
                              deleting
                            }
                            onClick={() =>
                              openStockModal(
                                'out',
                                item
                              )
                            }
                            className="rounded-lg bg-orange-600 px-2 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            - Remove
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openStockModal(
                                'adjustment',
                                item
                              )
                            }
                            disabled={
                              deleting
                            }
                            className="rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200 disabled:opacity-40"
                          >
                            Adjust
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openDeleteConfirmation(
                                item
                              )
                            }
                            disabled={
                              deleting
                            }
                            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400"
                          >

                            {deleting ? (
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}

                            Delete

                          </button>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            </>
          )}

        </div>

      </div>

      {/* STOCK MODAL */}

      <StockModal
        open={Boolean(selectedItem)}
        mode={modalMode}
        item={selectedItem}
        onClose={closeStockModal}
        onSuccess={async () => {
          await loadInventory(false);
        }}
      />

      {/* DELETE MODAL */}

      <DeleteInventoryModal
        open={Boolean(deleteItem)}
        item={deleteItem}
        deleting={
          Boolean(
            deleteItem &&
            deletingId === deleteItem.id
          )
        }
        onCancel={
          closeDeleteConfirmation
        }
        onConfirm={
          handleDeleteInventory
        }
      />
    </>
  );
}

export default Inventory;