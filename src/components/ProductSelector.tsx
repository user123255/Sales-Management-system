import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ChevronDown,
  Plus,
  Search,
  X,
} from 'lucide-react';

import {
  createProduct,
  fetchProductsByCategory,
} from '../services/products';

import type { Product } from '../types/database';

import {
  PRODUCT_CATEGORIES,
} from '../types/database';

interface ProductSelectorProps {
  value: Product | null;
  onChange: (product: Product | null) => void;
  onUnitChange?: (unit: string) => void;
  disabled?: boolean;
}

interface NewProductForm {
  name: string;
  category: string;
  unit: string;
}

export function ProductSelector({
  value,
  onChange,
  onUnitChange,
  disabled = false,
}: ProductSelectorProps) {
  const [open, setOpen] = useState(false);

  const [search, setSearch] = useState('');

  const [
    productsByCategory,
    setProductsByCategory,
  ] = useState<Record<string, Product[]>>({});

  const [loading, setLoading] = useState(false);

  const [showAddModal, setShowAddModal] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState('');

  const [
    newProduct,
    setNewProduct,
  ] = useState<NewProductForm>({
    name: '',
    category:
      PRODUCT_CATEGORIES[0] ??
      'Beef Cuts',
    unit: 'kg',
  });

  const containerRef =
    useRef<HTMLDivElement>(null);

  /*
   * -------------------------------------------------------
   * LOAD PRODUCTS
   * -------------------------------------------------------
   */

  const loadProducts = async () => {
    setLoading(true);
    setError('');

    try {
      const data =
        await fetchProductsByCategory();

      setProductsByCategory(data);
    } catch (cause) {
      console.error(
        'Unable to load products:',
        cause
      );

      setProductsByCategory({});

      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to load products.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  /*
   * -------------------------------------------------------
   * CLOSE WHEN CLICKING OUTSIDE
   * -------------------------------------------------------
   */

  useEffect(() => {
    const handleMouseDown = (
      event: MouseEvent
    ) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(
          event.target as Node
        )
      ) {
        setOpen(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleMouseDown
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleMouseDown
      );
    };
  }, []);

  /*
   * -------------------------------------------------------
   * FILTER PRODUCTS
   * -------------------------------------------------------
   */

  const normalizedSearch =
    search.trim().toLowerCase();

  const filteredCategories =
    Object.entries(
      productsByCategory
    ).reduce<Record<string, Product[]>>(
      (
        result,
        [category, products]
      ) => {
        const filtered =
          products.filter(
            (product) => {
              if (
                !normalizedSearch
              ) {
                return true;
              }

              return (
                product.name
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  ) ||
                product.category
                  .toLowerCase()
                  .includes(
                    normalizedSearch
                  )
              );
            }
          );

        if (filtered.length > 0) {
          result[category] =
            filtered;
        }

        return result;
      },
      {}
    );

  /*
   * -------------------------------------------------------
   * SELECT PRODUCT
   * -------------------------------------------------------
   */

  const handleSelect = (
    product: Product
  ) => {
    onChange(product);
    onUnitChange?.(product.unit);

    setOpen(false);
    setSearch('');
    setError('');
  };

  /*
   * -------------------------------------------------------
   * ADD PRODUCT
   * -------------------------------------------------------
   */

  const handleAddProduct = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const name =
      newProduct.name.trim();

    if (!name) {
      setError(
        'Product name is required.'
      );
      return;
    }

    if (!newProduct.category.trim()) {
      setError(
        'Product category is required.'
      );
      return;
    }

    if (!newProduct.unit.trim()) {
      setError(
        'Product unit is required.'
      );
      return;
    }

    setSaving(true);
    setError('');

    try {
      const created =
        await createProduct({
          name,
          category:
            newProduct.category.trim(),
          unit:
            newProduct.unit.trim(),
        });

      await loadProducts();

      /*
       * createProduct() now returns the
       * exact same Product type used by
       * this component.
       */
      onChange(created);

      onUnitChange?.(
        created.unit
      );

      setShowAddModal(false);
      setOpen(false);
      setSearch('');

      setNewProduct({
        name: '',
        category:
          PRODUCT_CATEGORIES[0] ??
          'Beef Cuts',
        unit: 'kg',
      });
    } catch (cause) {
      console.error(
        'Unable to create product:',
        cause
      );

      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to save product.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        className="relative w-full"
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            setOpen(
              (current) => !current
            )
          }
          className={[
            'flex w-full items-center justify-between',
            'rounded-lg border border-border',
            'bg-white px-3 py-2.5 text-sm',
            'transition-colors',
            'hover:border-primary-300',
            'focus:outline-none',
            'focus:ring-2',
            'focus:ring-primary-500/20',
            disabled
              ? 'cursor-not-allowed opacity-50'
              : '',
          ].join(' ')}
        >
          <span
            className={
              value
                ? 'text-text'
                : 'text-text-muted'
            }
          >
            {value
              ? value.name
              : 'Select product...'}
          </span>

          <ChevronDown
            className={[
              'h-4 w-4',
              'text-text-muted',
              'transition-transform',
              open
                ? 'rotate-180'
                : '',
            ].join(' ')}
          />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full min-w-[280px] overflow-hidden rounded-xl border border-border bg-white shadow-xl">
            <div className="border-b border-border p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search products..."
                  className="w-full rounded-lg border border-border py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <div className="border-b border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="max-h-60 overflow-y-auto p-1">
              {loading ? (
                <div className="px-3 py-6 text-center text-sm text-text-muted">
                  Loading products...
                </div>
              ) : Object.keys(
                  filteredCategories
                ).length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-sm text-text-muted">
                    No products found.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(true);
                      setOpen(false);
                    }}
                    className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
                  >
                    Add a new product
                  </button>
                </div>
              ) : (
                Object.entries(
                  filteredCategories
                ).map(
                  ([
                    category,
                    products,
                  ]) => (
                    <div
                      key={category}
                    >
                      <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-muted">
                        {category}
                      </p>

                      {products.map(
                        (product) => (
                          <button
                            key={
                              product.id
                            }
                            type="button"
                            onClick={() =>
                              handleSelect(
                                product
                              )
                            }
                            className={[
                              'flex w-full items-center',
                              'justify-between',
                              'rounded-lg px-3 py-2',
                              'text-left text-sm',
                              'transition-colors',
                              'hover:bg-primary-50',
                              value?.id ===
                              product.id
                                ? 'bg-primary-50 text-primary-700'
                                : '',
                            ].join(
                              ' '
                            )}
                          >
                            <span className="font-medium">
                              {
                                product.name
                              }
                            </span>

                            <span className="text-xs text-text-muted">
                              {
                                product.unit
                              }
                            </span>
                          </button>
                        )
                      )}
                    </div>
                  )
                )
              )}
            </div>

            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(true);
                  setOpen(false);
                  setError('');
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50"
              >
                <Plus className="h-4 w-4" />

                Add New Product
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text">
                Add New Product
              </h3>

              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  setError('');
                }}
                className="rounded-lg p-1 hover:bg-surface-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form
              onSubmit={
                handleAddProduct
              }
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-text">
                  Product Name *
                </label>

                <input
                  type="text"
                  value={
                    newProduct.name
                  }
                  onChange={(event) =>
                    setNewProduct(
                      (current) => ({
                        ...current,
                        name:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text">
                  Category *
                </label>

                <select
                  value={
                    newProduct.category
                  }
                  onChange={(event) =>
                    setNewProduct(
                      (current) => ({
                        ...current,
                        category:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  {PRODUCT_CATEGORIES.map(
                    (category) => (
                      <option
                        key={category}
                        value={
                          category
                        }
                      >
                        {category}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text">
                  Unit *
                </label>

                <select
                  value={
                    newProduct.unit
                  }
                  onChange={(event) =>
                    setNewProduct(
                      (current) => ({
                        ...current,
                        unit:
                          event.target
                            .value,
                      })
                    )
                  }
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="kg">
                    kg
                  </option>

                  <option value="g">
                    g
                  </option>

                  <option value="piece">
                    piece
                  </option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setShowAddModal(
                      false
                    );
                    setError('');
                  }}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? 'Saving...'
                    : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default ProductSelector;