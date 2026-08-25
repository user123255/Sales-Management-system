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

import {
  supabase,
  getFriendlyError,
} from '../lib/supabase';

/* =========================================================
   TYPES
========================================================= */

type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  is_active: boolean;
  created_at?: string;
};

type ProductForm = {
  name: string;
  category: string;
  unit: string;
  is_active: boolean;
};

/* =========================================================
   CONSTANTS
========================================================= */

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

/* =========================================================
   PRODUCT MODAL
========================================================= */

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
  const [name, setName] =
    useState('');

  const [category, setCategory] =
    useState('BEEF CUTS');

  const [unit, setUnit] =
    useState('kg');

  const [isActive, setIsActive] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const isEditing =
    Boolean(product);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (product) {
      setName(
        product.name || ''
      );

      setCategory(
        product.category ||
          'BEEF CUTS'
      );

      setUnit(
        product.unit || 'kg'
      );

      setIsActive(
        product.is_active !== false
      );
    } else {
      setName('');
      setCategory('BEEF CUTS');
      setUnit('kg');
      setIsActive(true);
    }

    setError(null);
  }, [open, product]);

  if (!open) {
    return null;
  }

  const handleSubmit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const trimmedName =
      name.trim();

    if (!trimmedName) {
      setError(
        'Please enter a product name.'
      );
      return;
    }

    if (!category) {
      setError(
        'Please select a category.'
      );
      return;
    }

    if (!unit) {
      setError(
        'Please select a unit.'
      );
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isEditing && product) {
        const {
          error: updateError,
        } = await supabase
          .from('products')
          .update({
            name: trimmedName,
            category,
            unit,
            is_active: isActive,
          })
          .eq(
            'id',
            product.id
          );

        if (updateError) {
          throw new Error(
            getFriendlyError(
              updateError
            )
          );
        }

        const {
          error: inventoryError,
        } = await supabase
          .from('inventory')
          .update({
            unit,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            'product_id',
            product.id
          );

        if (inventoryError) {
          console.warn(
            'Product updated, but inventory unit could not be synchronized:',
            inventoryError
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
            'id, name, category, unit, is_active'
          )
          .single();

        if (productError) {
          throw new Error(
            getFriendlyError(
              productError
            )
          );
        }

        if (!newProduct?.id) {
          throw new Error(
            'Product was created, but its ID could not be found.'
          );
        }

        const {
          error: inventoryError,
        } = await supabase
          .from('inventory')
          .insert({
            product_id:
              newProduct.id,
            quantity: 0,
            unit,
            low_stock_threshold: 5,
            updated_at:
              new Date().toISOString(),
          });

        if (inventoryError) {
          console.warn(
            'Product created, but inventory record could not be created:',
            inventoryError
          );

          throw new Error(
            `Product was created, but inventory could not be initialized. ${getFriendlyError(
              inventoryError
            )}`
          );
        }
      }

      await onSaved();
      onClose();
    } catch (err) {
      console.error(
        'Unable to save product:',
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to save product.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {isEditing
                ? 'Edit Product'
                : 'Add Product'}
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
              onChange={(event) =>
                setName(
                  event.target.value
                )
              }
              placeholder="e.g. Pork Sausage"
              autoFocus
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Category
            </label>

            <select
              value={category}
              onChange={(event) =>
                setCategory(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {CATEGORIES.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Unit
            </label>

            <select
              value={unit}
              onChange={(event) =>
                setUnit(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              {UNITS.map(
                (item) => (
                  <option
                    key={item.value}
                    value={item.value}
                  >
                    {item.label}
                  </option>
                )
              )}
            </select>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(event) =>
                setIsActive(
                  event.target.checked
                )
              }
              className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />

            <div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                Active product
              </div>

              <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Active products can be used when creating orders.
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
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
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

/* =========================================================
   PRODUCTS PAGE
========================================================= */

export function Products() {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [search, setSearch] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [modalOpen, setModalOpen] =
    useState(false);

  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);

  /* =======================================================
     LOAD PRODUCTS
  ======================================================= */

  const loadProducts =
    useCallback(
      async (
        showLoading = true
      ) => {
        try {
          if (showLoading) {
            setLoading(true);
          }

          setError(null);

          const {
            data,
            error: fetchError,
          } = await supabase
            .from('products')
            .select(
              'id, name, category, unit, is_active, created_at'
            )
            .order('name', {
              ascending: true,
            });

          if (fetchError) {
            throw new Error(
              getFriendlyError(
                fetchError
              )
            );
          }

          setProducts(
            (data || []) as Product[]
          );
        } catch (err) {
          console.error(
            'Unable to load products:',
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : 'Unable to load products.'
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      []
    );

  useEffect(() => {
    void loadProducts(true);
  }, [loadProducts]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredProducts =
    useMemo(() => {
      const value =
        search.trim().toLowerCase();

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
            .includes(value)
      );
    }, [products, search]);

  /* =======================================================
     STATS
  ======================================================= */

  const totalProducts =
    products.length;

  const activeProducts =
    products.filter(
      (product) =>
        product.is_active
    ).length;

  const inactiveProducts =
    products.filter(
      (product) =>
        !product.is_active
    ).length;

  /* =======================================================
     PRODUCT MODAL
  ======================================================= */

  const openAddProduct = () => {
    setSelectedProduct(null);
    setModalOpen(true);
  };

  const openEditProduct = (
    product: Product
  ) => {
    setSelectedProduct(product);
    setModalOpen(true);
  };

  const closeProductModal = () => {
    setModalOpen(false);
    setSelectedProduct(null);
  };

  /* =======================================================
     DELETE PRODUCT
  ======================================================= */

 const handleDeleteProduct = async (
  product: Product
) => {
  const confirmed = window.confirm(
    `DELETE PRODUCT\n\n` +
      `Product: ${product.name}\n` +
      `Product ID: ${product.id}\n\n` +
      `This will permanently delete the product and its inventory record.\n\n` +
      `This action cannot be undone.\n\n` +
      `Click OK to permanently delete this product.`
  );

  if (!confirmed) {
    return;
  }

  try {
    setError(null);

    /*
     * =====================================================
     * STEP 1 — DELETE INVENTORY RECORD
     * =====================================================
     *
     * Inventory is connected to products through:
     *
     * inventory.product_id = products.id
     *
     * Therefore we use the REAL product UUID.
     */
    const {
      data: deletedInventory,
      error: inventoryError,
    } = await supabase
      .from('inventory')
      .delete()
      .eq('product_id', product.id)
      .select('id, product_id');

    if (inventoryError) {
      console.error(
        'Inventory deletion failed:',
        inventoryError
      );

      throw new Error(
        `Could not delete the inventory record. ${getFriendlyError(
          inventoryError
        )}`
      );
    }

    console.log(
      'Deleted inventory records:',
      deletedInventory
    );

    /*
     * =====================================================
     * STEP 2 — DELETE PRODUCT
     * =====================================================
     *
     * IMPORTANT:
     * We use product.id directly.
     *
     * Do NOT use:
     * product.id.slice(0, 8)
     *
     * That is only for display.
     */
    const {
      data: deletedProduct,
      error: productError,
    } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)
      .select('id');

    if (productError) {
      console.error(
        'Product deletion failed:',
        productError
      );

      throw new Error(
        `Could not delete the product. ${getFriendlyError(
          productError
        )}`
      );
    }

    /*
     * =====================================================
     * STEP 3 — VERIFY PRODUCT WAS ACTUALLY DELETED
     * =====================================================
     *
     * Supabase can sometimes return no error when a DELETE
     * affected zero rows because of RLS.
     */
    if (
      !deletedProduct ||
      deletedProduct.length === 0
    ) {
      throw new Error(
        'The product was not deleted. Supabase did not return a deleted product. This usually means the DELETE operation is blocked by Row Level Security (RLS) or the product ID does not match.'
      );
    }

    /*
     * =====================================================
     * STEP 4 — REMOVE FROM UI
     * =====================================================
     */
    setProducts((current) =>
      current.filter(
        (item) =>
          item.id !== product.id
      )
    );

    /*
     * =====================================================
     * SUCCESS
     * =====================================================
     */
    console.log(
      `Product ${product.id} deleted successfully.`
    );
  } catch (err) {
    console.error(
      'Unable to delete product:',
      err
    );

    setError(
      err instanceof Error
        ? err.message
        : 'Unable to delete product.'
    );

    /*
     * Reload so the UI reflects the actual database.
     */
    await loadProducts(false);
  }
};

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts(false);
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
            Loading products...
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
              <Package className="h-5 w-5" />
            </div>

            <div>
              <h1 className="soms-page-title">
                Products
              </h1>

              <p className="soms-page-description">
                Manage products available
                for ordering and sales.
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
                className={`h-4 w-4 ${
                  refreshing
                    ? 'animate-spin'
                    : ''
                }`}
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={openAddProduct}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        </div>

        {/* ERROR */}
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
              onClick={() => {
                void loadProducts(true);
              }}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* STATS */}
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

              <Package className="h-6 w-6 text-blue-600" />
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

              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
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

        {/* PRODUCT CATALOGUE */}
        <div className="soms-card overflow-hidden">
          <div className="soms-card-header flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3>
                Product Catalogue
              </h3>

              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Products created here can
                be used for orders and
                inventory.
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
                placeholder="Search products..."
                style={{
                  paddingLeft: 38,
                }}
              />
            </div>
          </div>

          {filteredProducts.length ===
          0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center px-5 text-center">
              <Package className="h-12 w-12 text-slate-300 dark:text-slate-700" />

              <h3 className="mt-4 font-semibold text-slate-800 dark:text-slate-200">
                {products.length ===
                0
                  ? 'No products to display'
                  : 'No matching products'}
              </h3>

              <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
                {products.length ===
                0
                  ? 'Click Add Product to create your first product.'
                  : 'Try a different product name or category.'}
              </p>

              {products.length ===
                0 && (
                <button
                  type="button"
                  onClick={
                    openAddProduct
                  }
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </button>
              )}
            </div>
          ) : (
            <>
              {/* DESKTOP */}
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
                          key={
                            product.id
                          }
                          className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                                <Package className="h-5 w-5" />
                              </div>

                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white">
                                  {
                                    product.name
                                  }
                                </div>

                                <div className="mt-1 text-xs text-slate-400">
                                  Product
                                  ID:{' '}
                                  {product.id.slice(
                                    0,
                                    8
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-600 dark:text-slate-300">
                            {
                              product.category
                            }
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {
                              product.unit
                            }
                          </td>

                          <td className="px-5 py-4">
                            {product.is_active ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
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
                                onClick={() =>
                                  openEditProduct(
                                    product
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void handleDeleteProduct(
                                    product
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}
              <div className="grid gap-3 p-3 md:hidden">
                {filteredProducts.map(
                  (product) => (
                    <div
                      key={
                        product.id
                      }
                      className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">
                            {
                              product.name
                            }
                          </h3>

                          <p className="mt-1 text-xs text-slate-500">
                            {
                              product.category
                            }
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                            product.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {product.is_active
                            ? 'ACTIVE'
                            : 'INACTIVE'}
                        </span>
                      </div>

                      <div className="mt-4 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                        <p className="text-[10px] font-semibold uppercase text-slate-400">
                          Unit
                        </p>

                        <p className="mt-1 font-bold text-slate-900 dark:text-white">
                          {
                            product.unit
                          }
                        </p>
                      </div>

                      {/* MOBILE ACTIONS */}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEditProduct(
                              product
                            )
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void handleDeleteProduct(
                              product
                            )
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      <ProductModal
        open={modalOpen}
        product={selectedProduct}
        onClose={
          closeProductModal
        }
        onSaved={async () => {
          await loadProducts(false);
        }}
      />
    </>
  );
}

export default Products;