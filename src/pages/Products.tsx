
import {
  AlertTriangle,
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

import type { FormEvent } from 'react';

import {
  getFriendlyError,
  supabase,
} from '../lib/supabase';

type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  is_active: boolean;
  created_at?: string;
  quantity: number;
};

type InventoryRecord = {
  product_id: string;
  quantity: number | string | null;
  unit?: string | null;
};

const CATEGORIES = [
  'BEEF CUTS',
  'PORK CUTS',
  'QUARTERS',
  'PROCESSED PRODUCTS',
];

const UNITS = [
  {
    value: 'kg',
    label: 'Kilogram (kg)',
  },
  {
    value: 'piece',
    label: 'Piece',
  },
  {
    value: 'unit',
    label: 'Unit',
  },
  {
    value: 'litre',
    label: 'Litre (L)',
  },
  {
    value: 'pack',
    label: 'Pack',
  },
];

type ProductModalProps = {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

function ProductModal({
  open,
  product,
  onClose,
  onSaved,
}: ProductModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('BEEF CUTS');
  const [unit, setUnit] = useState('kg');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(product);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (product) {
      setName(product.name || '');

      setCategory(
        CATEGORIES.includes(product.category)
          ? product.category
          : 'BEEF CUTS',
      );

      setUnit(
        UNITS.some((item) => item.value === product.unit)
          ? product.unit
          : 'kg',
      );

      setIsActive(product.is_active !== false);
    } else {
      setName('');
      setCategory('BEEF CUTS');
      setUnit('kg');
      setIsActive(true);
    }

    setError(null);
  }, [open, product]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('Please enter a product name.');
      return;
    }

    if (!CATEGORIES.includes(category)) {
      setError('Please select a valid product category.');
      return;
    }

    if (!UNITS.some((item) => item.value === unit)) {
      setError('Please select a valid unit.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isEditing && product) {
        const { error: updateError } = await supabase
          .from('products')
          .update({
            name: trimmedName,
            category,
            unit,
            is_active: isActive,
          })
          .eq('id', product.id);

        if (updateError) {
          throw new Error(
            getFriendlyError(updateError),
          );
        }

        const { error: inventoryError } = await supabase
          .from('inventory')
          .update({
            unit,
            updated_at: new Date().toISOString(),
          })
          .eq('product_id', product.id);

        if (inventoryError) {
          console.warn(
            'Inventory unit synchronization failed:',
            inventoryError,
          );
        }
      } else {
        const {
          data: newProduct,
          error: productError,
        } = await supabase
          .from('products')
          .insert({
            name: trimmedName,
            category,
            unit,
            is_active: isActive,
          })
          .select(
            'id, name, category, unit, is_active, created_at',
          )
          .single();

        if (productError) {
          throw new Error(
            getFriendlyError(productError),
          );
        }

        if (!newProduct?.id) {
          throw new Error(
            'Product was created, but its ID could not be found.',
          );
        }

        const { error: inventoryError } = await supabase
          .from('inventory')
          .insert({
            product_id: newProduct.id,
            quantity: 0,
            unit,
            low_stock_threshold: 5,
            updated_at: new Date().toISOString(),
          });

        if (inventoryError) {
          console.error(
            'Inventory initialization failed:',
            inventoryError,
          );

          await supabase
            .from('products')
            .delete()
            .eq('id', newProduct.id);

          throw new Error(
            'Product could not be initialized in inventory. ' +
              getFriendlyError(inventoryError),
          );
        }
      }

      await onSaved();
      onClose();
    } catch (err) {
      console.error('Unable to save product:', err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save product.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Edit Product' : 'Add Product'}
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {isEditing
                ? 'Update product information.'
                : 'Create a product for orders and inventory.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Product Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              placeholder="e.g. Beef Fillet"
              autoFocus
              disabled={saving}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Category
            </label>

            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
              }}
              disabled={saving}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Unit
            </label>

            <select
              value={unit}
              onChange={(event) => {
                setUnit(event.target.value);
              }}
              disabled={saving}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {UNITS.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) => {
                setIsActive(event.target.checked);
              }}
              disabled={saving}
              className="mt-1 h-5 w-5 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
            />

            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Active product
              </div>

              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Active products can be used when creating
                orders.
              </div>
            </div>
          </label>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  {isEditing
                    ? 'Save Changes'
                    : 'Save Product'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const loadProducts = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
        }

        setError(null);

        const {
          data: productData,
          error: productError,
        } = await supabase
          .from('products')
          .select(
            'id, name, category, unit, is_active, created_at',
          )
          .order('name', {
            ascending: true,
          });

        if (productError) {
          throw new Error(
            getFriendlyError(productError),
          );
        }

        const {
          data: inventoryData,
          error: inventoryError,
        } = await supabase
          .from('inventory')
          .select('product_id, quantity, unit');

        if (inventoryError) {
          console.warn(
            'Unable to load inventory:',
            inventoryError,
          );
        }

        const inventoryMap = new Map<
          string,
          InventoryRecord
        >();

        (inventoryData || []).forEach(
          (record: InventoryRecord) => {
            if (record.product_id) {
              inventoryMap.set(
                record.product_id,
                record,
              );
            }
          },
        );

        const normalizedProducts: Product[] =
          (productData || []).map((item) => {
            const inventory = inventoryMap.get(item.id);

            return {
              id: item.id,
              name: item.name || '',
              category:
                item.category || 'BEEF CUTS',
              unit:
                item.unit ||
                inventory?.unit ||
                'unit',
              is_active:
                item.is_active !== false,
              created_at: item.created_at,
              quantity: Number(
                inventory?.quantity ?? 0,
              ),
            };
          });

        setProducts(normalizedProducts);
      } catch (err) {
        console.error(
          'Unable to load products:',
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : 'Unable to load products.',
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadProducts(true);
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return products;
    }

    return products.filter(
      (product) =>
        product.name
          .toLowerCase()
          .includes(value) ||
        product.category
          .toLowerCase()
          .includes(value) ||
        product.unit
          .toLowerCase()
          .includes(value),
    );
  }, [products, search]);

  const totalProducts = products.length;

  const activeProducts = products.filter(
    (product) => product.is_active,
  ).length;

  const inactiveProducts = products.filter(
    (product) => !product.is_active,
  ).length;

  const openAddProduct = () => {
    setSelectedProduct(null);
    setModalOpen(true);
  };

  const openEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const closeProductModal = () => {
    if (deletingId) {
      return;
    }

    setModalOpen(false);
    setSelectedProduct(null);
  };

  const deleteProduct = async (
    product: Product,
  ) => {
    const confirmed = window.confirm(
      'Are you sure you want to permanently delete "' +
        product.name +
        '"?\n\nThis action cannot be undone.',
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(product.id);
      setError(null);

      const {
        error: inventoryDeleteError,
      } = await supabase
        .from('inventory')
        .delete()
        .eq('product_id', product.id);

      if (inventoryDeleteError) {
        throw new Error(
          'Unable to delete the inventory record for "' +
            product.name +
            '". ' +
            getFriendlyError(inventoryDeleteError),
        );
      }

      const {
        error: productDeleteError,
      } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (productDeleteError) {
        throw new Error(
          'Unable to permanently delete "' +
            product.name +
            '". ' +
            getFriendlyError(productDeleteError),
        );
      }

      setProducts((current) =>
        current.filter(
          (item) => item.id !== product.id,
        ),
      );
    } catch (err) {
      console.error(
        'Unable to delete product:',
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete product.',
      );

      await loadProducts(false);
    } finally {
      setDeletingId(null);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    await loadProducts(false);
  };

  const formatQuantity = (
    quantity: number,
    unit: string,
  ) => {
    const safeQuantity =
      Number.isFinite(quantity)
        ? quantity
        : 0;

    const formatted =
      Number.isInteger(safeQuantity)
        ? safeQuantity.toString()
        : safeQuantity
            .toFixed(2)
            .replace(/\.?0+$/, '');

    return formatted + ' ' + unit;
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-slate-700" />

          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Loading products...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="soms-page space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-white shadow-sm">
              <Package className="h-5 w-5" />
            </div>

            <div>
              <h1 className="soms-page-title">
                Products
              </h1>

              <p className="soms-page-description">
                Manage products, stock quantities,
                and product availability.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={
                  'h-4 w-4' +
                  (refreshing
                    ? ' animate-spin'
                    : '')
                }
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openAddProduct}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700 active:bg-slate-900"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />

              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="rounded-lg p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-950/40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

              <Package className="h-6 w-6 text-slate-700" />
            </div>
          </div>

          <div className="soms-stat-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="soms-stat-label">
                  ACTIVE PRODUCTS
                </div>

                <div className="soms-stat-value">
                  {activeProducts}
                </div>
              </div>

              <CheckCircle2 className="h-6 w-6 text-slate-700" />
            </div>
          </div>

          <div className="soms-stat-card">
            <div className="flex items-center justify-between">
              <div>
                <div className="soms-stat-label">
                  INACTIVE PRODUCTS
                </div>

                <div className="soms-stat-value">
                  {inactiveProducts}
                </div>
              </div>

              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="soms-card overflow-hidden">
          <div className="soms-card-header flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3>Product Catalogue</h3>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Products created here can be used
                for orders and inventory.
              </p>
            </div>

            <div className="relative w-full lg:w-[320px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                className="soms-input w-full"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                placeholder="Search products..."
                style={{
                  paddingLeft: 38,
                }}
              />
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
              <Package className="h-12 w-12 text-slate-300 dark:text-slate-700" />

              <h3 className="mt-4 font-semibold text-slate-800 dark:text-slate-200">
                {products.length === 0
                  ? 'No products to display'
                  : 'No matching products'}
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {products.length === 0
                  ? 'Click Add Product to create your first product.'
                  : 'Try a different product name or category.'}
              </p>

              {products.length === 0 && (
                <button
                  type="button"
                  onClick={openAddProduct}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                      <th className="px-5 py-4">
                        Product
                      </th>

                      <th className="px-5 py-4">
                        Category
                      </th>

                      <th className="px-5 py-4">
                        Quantity
                      </th>

                      <th className="px-5 py-4">
                        Unit
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
                    {filteredProducts.map(
                      (product) => (
                        <tr
                          key={product.id}
                          className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-white">
                                <Package className="h-5 w-5" />
                              </div>

                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {product.name}
                                </div>

                                <div className="mt-1 text-xs text-slate-400">
                                  Product ID:{' '}
                                  {product.id.slice(
                                    0,
                                    8,
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                            {product.category}
                          </td>

                          <td className="px-5 py-4">
                            <span className="inline-flex items-center rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {formatQuantity(
                                product.quantity,
                                product.unit,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {product.unit}
                          </td>

                          <td className="px-5 py-4">
                            {product.is_active ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                Inactive
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  openEditProduct(
                                    product,
                                  );
                                }}
                                disabled={
                                  deletingId ===
                                  product.id
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  void deleteProduct(
                                    product,
                                  );
                                }}
                                disabled={
                                  deletingId ===
                                  product.id
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:bg-slate-900 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                {deletingId ===
                                product.id ? (
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}

                                {deletingId ===
                                product.id
                                  ? 'Deleting...'
                                  : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 md:hidden">
                {filteredProducts.map(
                  (product) => (
                    <div
                      key={product.id}
                      className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">
                            {product.name}
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {product.category}
                          </p>
                        </div>

                        <span
                          className={
                            product.is_active
                              ? 'rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700'
                              : 'rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600'
                          }
                        >
                          {product.is_active
                            ? 'ACTIVE'
                            : 'INACTIVE'}
                        </span>
                      </div>

                      <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                        <p className="text-[10px] font-semibold uppercase text-slate-400">
                          Current Quantity
                        </p>

                        <p className="mt-1 text-lg font-black text-slate-800 dark:text-white">
                          {formatQuantity(
                            product.quantity,
                            product.unit,
                          )}
                        </p>
                      </div>

                      <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                        <p className="text-[10px] font-semibold uppercase text-slate-400">
                          Unit
                        </p>

                        <p className="mt-1 font-bold text-slate-900 dark:text-white">
                          {product.unit}
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            openEditProduct(
                              product,
                            );
                          }}
                          disabled={
                            deletingId ===
                            product.id
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            void deleteProduct(
                              product,
                            );
                          }}
                          disabled={
                            deletingId ===
                            product.id
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          {deletingId ===
                          product.id ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}

                          {deletingId ===
                          product.id
                            ? 'Deleting...'
                            : 'Delete'}
                        </button>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <ProductModal
        open={modalOpen}
        product={selectedProduct}
        onClose={closeProductModal}
        onSaved={async () => {
          await loadProducts(false);
        }}
      />
    </>
  );
}

export default Products;

