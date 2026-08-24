import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Trash2,
  Loader2,
  Search,
  Package,
  ChevronDown,
  X,
  CheckCircle2,
  ShoppingCart,
} from 'lucide-react';

import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { createOrder } from '../services/orders';
import type { Product } from '../types/database';

const DEPARTMENT_LABELS: Record<string, string> = {
  finance: 'Finance',
  butchery: 'Butchery',
  sales: 'Sales',
  admin: 'Admin',
  other: 'Other',
};

type ProductSelection = {
  id: string | null;
  name: string;
  unit: string;
  category?: string;
};

interface OrderItemRow {
  id: string;
  product: ProductSelection | null;
  quantity: string;
  unit: string;
  price: string;
  packaging: string;
  notes: string;
  errors: Record<string, string>;
}

const emptyRow = (): OrderItemRow => ({
  id: crypto.randomUUID(),
  product: null,
  quantity: '',
  unit: 'kg',
  price: '',
  packaging: '',
  notes: '',
  errors: {},
});

const calculateItemTotal = (
  quantity: number,
  price: number
) => quantity * price;

const calculateOrderTotal = (
  items: Array<{ quantity: number; price: number }>
) =>
  items.reduce(
    (sum, item) =>
      sum +
      calculateItemTotal(
        item.quantity,
        item.price
      ),
    0
  );

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

function ProductSelector({
  value,
  onChange,
  onUnitChange,
  error,
}: {
  value: ProductSelection | null;
  onChange: (
    product: ProductSelection | null
  ) => void;
  onUnitChange: (unit: string) => void;
  error?: string;
}) {
  const [products, setProducts] =
    useState<Product[]>([]);
  const [search, setSearch] =
    useState('');
  const [open, setOpen] =
    useState(false);
  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      setLoading(true);

      const {
        data,
        error: productsError,
      } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name');

      if (!productsError && mounted) {
        setProducts(
          (data || []) as Product[]
        );
      }

      setLoading(false);
    };

    void loadProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProducts =
    useMemo(() => {
      const term =
        search.trim().toLowerCase();

      if (!term) return products;

      return products.filter(
        (product) =>
          product.name
            .toLowerCase()
            .includes(term) ||
          product.category
            .toLowerCase()
            .includes(term)
      );
    }, [products, search]);

  const selectExistingProduct = (
    product: Product
  ) => {
    onChange({
      id: product.id,
      name: product.name,
      unit: product.unit || 'kg',
      category: product.category,
    });

    onUnitChange(
      product.unit || 'kg'
    );

    setSearch('');
    setOpen(false);
  };

  const createCustomProduct = () => {
    const name = search.trim();

    if (!name) return;

    onChange({
      id: null,
      name,
      unit: value?.unit || 'kg',
    });

    setSearch('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <div
        className={`
          rounded-xl border bg-white
          transition-all
          ${
            open
              ? 'border-[#7A1F2B] ring-4 ring-[#7A1F2B]/10'
              : 'border-slate-200'
          }
          ${
            error
              ? 'border-red-400'
              : ''
          }
        `}
      >
        <div className="flex items-center gap-2 px-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />

          <input
            type="text"
            value={
              open
                ? search
                : value?.name || ''
            }
            onFocus={() =>
              setOpen(true)
            }
            onChange={(e) => {
              setSearch(
                e.target.value
              );
              setOpen(true);
            }}
            placeholder="Search or enter product..."
            className="
              w-full border-0 bg-transparent
              py-3 text-sm text-slate-900
              outline-none placeholder:text-slate-400
              focus:ring-0
            "
          />

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setSearch('');
              }}
              className="
                rounded-md p-1
                text-slate-400
                transition
                hover:bg-slate-100
                hover:text-slate-700
              "
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <ChevronDown
            className={`
              h-4 w-4 text-slate-400
              transition-transform
              ${open ? 'rotate-180' : ''}
            `}
          />
        </div>
      </div>

      {open && (
        <div className="
          absolute left-0 right-0 top-full z-50 mt-2
          overflow-hidden rounded-xl
          border border-slate-200 bg-white
          shadow-2xl
        ">
          <div className="max-h-64 overflow-y-auto p-2">
            {loading ? (
              <div className="
                flex items-center justify-center
                gap-2 px-4 py-8
                text-sm text-slate-500
              ">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading products...
              </div>
            ) : filteredProducts.length > 0 ? (
              <>
                {filteredProducts.map(
                  (product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() =>
                        selectExistingProduct(
                          product
                        )
                      }
                      className="
                        flex w-full items-center
                        gap-3 rounded-lg px-3 py-3
                        text-left transition
                        hover:bg-[#7A1F2B]/5
                      "
                    >
                      <div className="
                        flex h-9 w-9 shrink-0
                        items-center justify-center
                        rounded-lg
                        bg-[#7A1F2B]/10
                        text-[#7A1F2B]
                      ">
                        <Package className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="
                          truncate text-sm
                          font-semibold text-slate-900
                        ">
                          {product.name}
                        </p>

                        <p className="
                          text-xs text-slate-500
                        ">
                          {product.category} •{' '}
                          {product.unit}
                        </p>
                      </div>
                    </button>
                  )
                )}

                {search.trim() && (
                  <button
                    type="button"
                    onClick={
                      createCustomProduct
                    }
                    className="
                      mt-1 flex w-full items-center
                      gap-3 rounded-lg
                      border-t border-slate-100
                      px-3 py-3 text-left
                      transition
                      hover:bg-[#7A1F2B]/5
                    "
                  >
                    <div className="
                      flex h-9 w-9 shrink-0
                      items-center justify-center
                      rounded-lg
                      bg-[#7A1F2B]/10
                      text-[#7A1F2B]
                    ">
                      <Plus className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="
                        text-sm font-semibold
                        text-slate-900
                      ">
                        Use "{search.trim()}"
                      </p>

                      <p className="
                        text-xs text-slate-500
                      ">
                        Add as a custom product
                      </p>
                    </div>
                  </button>
                )}
              </>
            ) : search.trim() ? (
              <button
                type="button"
                onClick={
                  createCustomProduct
                }
                className="
                  flex w-full items-center
                  gap-3 rounded-lg p-3
                  text-left transition
                  hover:bg-[#7A1F2B]/5
                "
              >
                <div className="
                  flex h-9 w-9
                  items-center justify-center
                  rounded-lg
                  bg-[#7A1F2B]/10
                  text-[#7A1F2B]
                ">
                  <Plus className="h-4 w-4" />
                </div>

                <div>
                  <p className="
                    text-sm font-semibold
                    text-slate-900
                  ">
                    Add "{search.trim()}"
                  </p>

                  <p className="
                    text-xs text-slate-500
                  ">
                    Use this as a custom product
                  </p>
                </div>
              </button>
            ) : (
              <div className="
                px-4 py-8 text-center
                text-sm text-slate-500
              ">
                Start typing to search products.
              </div>
            )}
          </div>

          <div className="
            border-t border-slate-100
            bg-slate-50 px-3 py-2
          ">
            <p className="text-[11px] text-slate-500">
              Search an existing product or
              type a new product name.
            </p>
          </div>
        </div>
      )}

      <div className="mt-2">
        <select
          value={value?.unit || 'kg'}
          onChange={(e) =>
            onUnitChange(
              e.target.value
            )
          }
          className="
            w-full rounded-xl
            border border-slate-200
            bg-white px-3 py-2.5
            text-sm text-slate-700
            outline-none transition
            focus:border-[#7A1F2B]
            focus:ring-4
            focus:ring-[#7A1F2B]/10
          "
        >
          <option value="kg">
            Kilograms (kg)
          </option>
          <option value="g">
            Grams (g)
          </option>
          <option value="piece">
            Piece
          </option>
          <option value="box">
            Box
          </option>
          <option value="pack">
            Pack
          </option>
        </select>
      </div>

      {value?.id === null &&
        value?.name && (
          <p className="
            mt-2 flex items-center gap-1.5
            text-xs text-[#7A1F2B]
          ">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Custom product — will be saved
            with this order
          </p>
        )}

      {error && (
        <p className="
          mt-1 text-xs font-medium
          text-red-500
        ">
          {error}
        </p>
      )}
    </div>
  );
}

export function CreateOrder() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] =
    useState<OrderItemRow[]>([
      emptyRow(),
    ]);

  const [notes, setNotes] =
    useState('');

  const [customerName, setCustomerName] =
    useState('');

  const [deliveryInfo, setDeliveryInfo] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [showConfirm, setShowConfirm] =
    useState(false);

  const addItem = () => {
    setItems((current) => [
      ...current,
      emptyRow(),
    ]);
  };

  const removeItem = (
    id: string
  ) => {
    setItems((current) =>
      current.length > 1
        ? current.filter(
            (item) =>
              item.id !== id
          )
        : current
    );
  };

  const updateItem = (
    id: string,
    updates: Partial<OrderItemRow>
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              ...updates,
              errors: {},
            }
          : item
      )
    );
  };

  const validateItems = () => {
    let valid = true;

    const updated = items.map(
      (item) => {
        const errors: Record<
          string,
          string
        > = {};

        if (
          !item.product?.name?.trim()
        ) {
          errors.product =
            'Product is required';
        }

        const quantity =
          Number(item.quantity);

        if (
          !item.quantity ||
          !Number.isFinite(
            quantity
          ) ||
          quantity <= 0
        ) {
          errors.quantity =
            'Enter a quantity greater than 0';
        }

        const price =
          Number(item.price);

        if (
          item.price === '' ||
          !Number.isFinite(
            price
          ) ||
          price < 0
        ) {
          errors.price =
            'Enter a valid price';
        }

        if (
          Object.keys(errors)
            .length > 0
        ) {
          valid = false;
        }

        return {
          ...item,
          errors,
        };
      }
    );

    setItems(updated);

    return valid;
  };

  const getOrderItems = () => {
    return items.map(
      (item) => ({
        product_id:
          item.product?.id || null,

        product_name:
          item.product?.name?.trim() ||
          '',

        quantity:
          Number(item.quantity),

        unit:
          item.unit,

        price:
          Number(item.price),

        packaging:
          item.packaging.trim(),

        notes:
          item.notes.trim(),
      })
    );
  };

  const subtotal =
    calculateOrderTotal(
      items
        .filter(
          (item) =>
            item.product &&
            item.quantity !== '' &&
            item.price !== ''
        )
        .map((item) => ({
          quantity:
            Number(
              item.quantity
            ) || 0,

          price:
            Number(
              item.price
            ) || 0,
        }))
    );

  const handleSubmit = () => {
    if (!profile) {
      window.alert(
        'Your session has expired. Please sign in again.'
      );

      return;
    }

    if (!validateItems()) {
      return;
    }

    setShowConfirm(true);
  };

  const confirmSubmit =
    async () => {
      if (
        !profile ||
        submitting
      ) {
        return;
      }

      setSubmitting(true);

      try {
        const order =
          await createOrder(
            {
              notes:
                notes.trim(),

              customer_name:
                customerName.trim(),

              delivery_info:
                deliveryInfo.trim(),

              items:
                getOrderItems(),
            },
            profile.id,
            profile.department
          );

        setShowConfirm(false);

        window.alert(
          `Order ${order.order_number} submitted successfully to Butchery.`
        );

        navigate(
          `/finance/orders/${order.id}`
        );
      } catch (error) {
        console.error(
          'CREATE ORDER ERROR:',
          error
        );

        const message =
          error instanceof Error
            ? error.message
            : 'Unable to create the order.';

        window.alert(
          `Unable to create the order.\n\n${message}`
        );
      } finally {
        setSubmitting(false);
      }
    };

  const now = new Date();

  return (
    <div className="
      mx-auto max-w-6xl
      space-y-6 pb-10
    ">

      {/* HEADER */}
      <div className="
        relative overflow-hidden
        rounded-2xl
        bg-gradient-to-br
        from-[#5A1620]
        via-[#7A1F2B]
        to-[#941F34]
        p-6 text-white
        shadow-xl
        shadow-[#7A1F2B]/15
      ">
        <div className="
          absolute -right-12 -top-12
          h-40 w-40 rounded-full
          bg-white/10 blur-2xl
        " />

        <div className="
          absolute -bottom-16 left-1/3
          h-40 w-40 rounded-full
          bg-rose-300/10 blur-3xl
        " />

        <div className="
          relative flex flex-col gap-4
          sm:flex-row sm:items-center
          sm:justify-between
        ">
          <div>
            <div className="
              mb-2 flex items-center
              gap-2 text-rose-100
            ">
              <ShoppingCart className="h-5 w-5" />

              <span className="text-sm font-medium">
                New Order
              </span>
            </div>

            <h1 className="
              text-2xl font-bold
              sm:text-3xl
            ">
              Create Order
            </h1>

            <p className="
              mt-1 max-w-xl
              text-sm text-rose-50
            ">
              Add products, specify
              quantities and packaging,
              then submit the order directly
              to the Butchery Department.
            </p>
          </div>

          <div className="
            rounded-xl
            border border-white/20
            bg-white/10 px-4 py-3
            backdrop-blur
          ">
            <p className="
              text-xs text-rose-100
            ">
              Department
            </p>

            <p className="font-semibold">
              {profile
                ? DEPARTMENT_LABELS[
                    profile.department
                  ] ||
                  profile.department
                : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ORDER INFORMATION */}
      <section className="
        rounded-2xl
        border border-slate-200
        bg-white p-5 shadow-sm
        sm:p-6
      ">
        <div className="mb-5">
          <h2 className="
            text-lg font-bold
            text-slate-900
          ">
            Order Information
          </h2>

          <p className="
            mt-1 text-sm
            text-slate-500
          ">
            Basic information about this
            order.
          </p>
        </div>

        <div className="
          grid gap-4
          sm:grid-cols-2
          lg:grid-cols-3
        ">
          <div className="
            rounded-xl
            border border-[#7A1F2B]/10
            bg-[#7A1F2B]/5 p-4
          ">
            <p className="
              text-xs font-medium
              uppercase tracking-wide
              text-[#7A1F2B]/70
            ">
              Order Number
            </p>

            <p className="
              mt-1 text-sm font-semibold
              text-slate-700
            ">
              Auto-generated
            </p>
          </div>

          <div className="
            rounded-xl
            border border-[#7A1F2B]/10
            bg-[#7A1F2B]/5 p-4
          ">
            <p className="
              text-xs font-medium
              uppercase tracking-wide
              text-[#7A1F2B]/70
            ">
              Created By
            </p>

            <p className="
              mt-1 truncate
              text-sm font-semibold
              text-slate-700
            ">
              {profile?.full_name ||
                '—'}
            </p>
          </div>

          <div className="
            rounded-xl
            border border-[#7A1F2B]/10
            bg-[#7A1F2B]/5 p-4
          ">
            <p className="
              text-xs font-medium
              uppercase tracking-wide
              text-[#7A1F2B]/70
            ">
              Date & Time
            </p>

            <p className="
              mt-1 text-sm font-semibold
              text-slate-700
            ">
              {now.toLocaleDateString()} •{' '}
              {now.toLocaleTimeString(
                [],
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}
            </p>
          </div>
        </div>

        <div className="
          mt-5 grid gap-4
          sm:grid-cols-2
        ">
          <div>
            <label className="
              mb-2 block
              text-sm font-semibold
              text-slate-700
            ">
              Customer / Client
            </label>

            <input
              value={customerName}
              onChange={(e) =>
                setCustomerName(
                  e.target.value
                )
              }
              placeholder="Optional"
              className="
                w-full rounded-xl
                border border-slate-200
                px-4 py-3 text-sm
                outline-none transition
                focus:border-[#7A1F2B]
                focus:ring-4
                focus:ring-[#7A1F2B]/10
              "
            />
          </div>

          <div>
            <label className="
              mb-2 block
              text-sm font-semibold
              text-slate-700
            ">
              Delivery Information
            </label>

            <input
              value={deliveryInfo}
              onChange={(e) =>
                setDeliveryInfo(
                  e.target.value
                )
              }
              placeholder="e.g. Pickup at 2pm"
              className="
                w-full rounded-xl
                border border-slate-200
                px-4 py-3 text-sm
                outline-none transition
                focus:border-[#7A1F2B]
                focus:ring-4
                focus:ring-[#7A1F2B]/10
              "
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="
            mb-2 block
            text-sm font-semibold
            text-slate-700
          ">
            Order Notes
          </label>

          <textarea
            value={notes}
            onChange={(e) =>
              setNotes(e.target.value)
            }
            rows={3}
            placeholder="Additional instructions..."
            className="
              w-full resize-none
              rounded-xl
              border border-slate-200
              px-4 py-3 text-sm
              outline-none transition
              focus:border-[#7A1F2B]
              focus:ring-4
              focus:ring-[#7A1F2B]/10
            "
          />
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="
        rounded-2xl
        border border-slate-200
        bg-white p-5 shadow-sm
        sm:p-6
      ">
        <div className="
          mb-5 flex flex-col gap-3
          sm:flex-row sm:items-center
          sm:justify-between
        ">
          <div>
            <h2 className="
              text-lg font-bold
              text-slate-900
            ">
              Products
            </h2>

            <p className="
              mt-1 text-sm
              text-slate-500
            ">
              Search an existing product
              or enter your own product.
            </p>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="
              inline-flex items-center
              justify-center gap-2
              rounded-xl
              bg-[#7A1F2B]
              px-4 py-2.5
              text-sm font-semibold
              text-white
              shadow-md
              shadow-[#7A1F2B]/15
              transition-all
              hover:bg-[#651923]
              hover:shadow-lg
              active:scale-95
            "
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>

        <div className="space-y-4">
          {items.map(
            (item, index) => (
              <div
                key={item.id}
                className="
                  rounded-2xl
                  border border-slate-200
                  bg-slate-50/50 p-4
                  transition-all
                  duration-300
                  hover:border-[#7A1F2B]/30
                  hover:shadow-sm
                  sm:p-5
                "
              >
                <div className="
                  mb-4 flex items-center
                  justify-between
                ">
                  <div className="
                    flex items-center gap-2
                  ">
                    <div className="
                      flex h-8 w-8
                      items-center
                      justify-center
                      rounded-lg
                      bg-[#7A1F2B]/10
                      text-xs font-bold
                      text-[#7A1F2B]
                    ">
                      {index + 1}
                    </div>

                    <div>
                      <p className="
                        text-sm font-bold
                        text-slate-900
                      ">
                        Product {index + 1}
                      </p>

                      <p className="
                        text-xs
                        text-slate-500
                      ">
                        Product details
                      </p>
                    </div>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removeItem(
                          item.id
                        )
                      }
                      className="
                        rounded-lg p-2
                        text-red-500
                        transition
                        hover:bg-red-50
                        active:scale-95
                      "
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                <div className="
                  grid gap-4
                  lg:grid-cols-12
                ">
                  <div className="lg:col-span-4">
                    <label className="
                      mb-2 block
                      text-xs font-bold
                      uppercase tracking-wide
                      text-slate-500
                    ">
                      Product *
                    </label>

                    <ProductSelector
                      value={
                        item.product
                      }
                      error={
                        item.errors
                          .product
                      }
                      onChange={(
                        product
                      ) =>
                        updateItem(
                          item.id,
                          {
                            product,
                            unit:
                              product?.unit ||
                              item.unit,
                          }
                        )
                      }
                      onUnitChange={(
                        unit
                      ) =>
                        updateItem(
                          item.id,
                          {
                            unit,
                            product:
                              item.product
                                ? {
                                    ...item.product,
                                    unit,
                                  }
                                : null,
                          }
                        )
                      }
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="
                      mb-2 block
                      text-xs font-bold
                      uppercase tracking-wide
                      text-slate-500
                    ">
                      Quantity *
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        item.quantity
                      }
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          {
                            quantity:
                              e.target.value,
                          }
                        )
                      }
                      placeholder="0"
                      className="
                        w-full rounded-xl
                        border border-slate-200
                        bg-white px-3 py-3
                        text-sm outline-none
                        transition
                        focus:border-[#7A1F2B]
                        focus:ring-4
                        focus:ring-[#7A1F2B]/10
                      "
                    />

                    {item.errors
                      .quantity && (
                      <p className="
                        mt-1 text-xs
                        text-red-500
                      ">
                        {
                          item.errors
                            .quantity
                        }
                      </p>
                    )}
                  </div>

                  <div className="lg:col-span-2">
                    <label className="
                      mb-2 block
                      text-xs font-bold
                      uppercase tracking-wide
                      text-slate-500
                    ">
                      Price *
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        item.price
                      }
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          {
                            price:
                              e.target.value,
                          }
                        )
                      }
                      placeholder="0.00"
                      className="
                        w-full rounded-xl
                        border border-slate-200
                        bg-white px-3 py-3
                        text-sm outline-none
                        transition
                        focus:border-[#7A1F2B]
                        focus:ring-4
                        focus:ring-[#7A1F2B]/10
                      "
                    />

                    {item.errors.price && (
                      <p className="
                        mt-1 text-xs
                        text-red-500
                      ">
                        {
                          item.errors
                            .price
                        }
                      </p>
                    )}
                  </div>

                  <div className="lg:col-span-4">
                    <label className="
                      mb-2 block
                      text-xs font-bold
                      uppercase tracking-wide
                      text-slate-500
                    ">
                      Packaging
                    </label>

                    <input
                      type="text"
                      value={
                        item.packaging
                      }
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          {
                            packaging:
                              e.target.value,
                          }
                        )
                      }
                      placeholder="e.g. 2 × 5kg bags"
                      className="
                        w-full rounded-xl
                        border border-slate-200
                        bg-white px-3 py-3
                        text-sm outline-none
                        transition
                        focus:border-[#7A1F2B]
                        focus:ring-4
                        focus:ring-[#7A1F2B]/10
                      "
                    />
                  </div>

                  <div className="lg:col-span-12">
                    <label className="
                      mb-2 block
                      text-xs font-bold
                      uppercase tracking-wide
                      text-slate-500
                    ">
                      Item Notes
                    </label>

                    <input
                      type="text"
                      value={
                        item.notes
                      }
                      onChange={(e) =>
                        updateItem(
                          item.id,
                          {
                            notes:
                              e.target.value,
                          }
                        )
                      }
                      placeholder="Optional instructions for Butchery..."
                      className="
                        w-full rounded-xl
                        border border-slate-200
                        bg-white px-3 py-3
                        text-sm outline-none
                        transition
                        focus:border-[#7A1F2B]
                        focus:ring-4
                        focus:ring-[#7A1F2B]/10
                      "
                    />
                  </div>
                </div>

                {item.product &&
                  item.quantity !== '' &&
                  item.price !== '' && (
                    <div className="
                      mt-4 flex items-center
                      justify-between
                      border-t
                      border-slate-200
                      pt-4
                    ">
                      <span className="
                        text-xs font-medium
                        text-slate-500
                      ">
                        Item total
                      </span>

                      <span className="
                        text-sm font-bold
                        text-[#7A1F2B]
                      ">
                        {formatCurrency(
                          calculateItemTotal(
                            Number(
                              item.quantity
                            ) || 0,
                            Number(
                              item.price
                            ) || 0
                          )
                        )}
                      </span>
                    </div>
                  )}
              </div>
            )
          )}
        </div>

        {/* TOTAL */}
        <div className="
          mt-6 flex flex-col gap-5
          border-t border-slate-200
          pt-6
          sm:flex-row sm:items-center
          sm:justify-between
        ">
          <div>
            <p className="
              text-sm text-slate-500
            ">
              Order total
            </p>

            <p className="
              text-3xl font-black
              text-[#7A1F2B]
            ">
              {formatCurrency(
                subtotal
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="
              inline-flex
              items-center
              justify-center
              gap-2 rounded-xl
              bg-[#7A1F2B]
              px-7 py-3.5
              text-sm font-bold
              text-white
              shadow-lg
              shadow-[#7A1F2B]/20
              transition-all
              hover:bg-[#651923]
              hover:shadow-xl
              active:scale-[0.98]
              disabled:cursor-not-allowed
              disabled:opacity-60
            "
          >
            {submitting ? (
              <>
                <Loader2 className="
                  h-5 w-5 animate-spin
                " />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Submit Order
              </>
            )}
          </button>
        </div>
      </section>

      {/* CONFIRMATION MODAL */}
      {showConfirm && (
        <div className="
          fixed inset-0 z-[100]
          flex items-center
          justify-center
          bg-slate-950/50
          p-4 backdrop-blur-sm
        ">
          <div className="
            w-full max-w-md
            animate-[fadeIn_.2s_ease-out]
            rounded-2xl
            bg-white p-6
            shadow-2xl
          ">
            <div className="
              flex h-12 w-12
              items-center
              justify-center
              rounded-xl
              bg-[#7A1F2B]/10
              text-[#7A1F2B]
            ">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <h3 className="
              mt-4 text-xl font-bold
              text-slate-900
            ">
              Submit this order?
            </h3>

            <p className="
              mt-2 text-sm
              leading-6 text-slate-500
            ">
              The Butchery Department
              will receive this order
              immediately after submission.
            </p>

            <div className="
              mt-5 rounded-xl
              border
              border-[#7A1F2B]/10
              bg-[#7A1F2B]/5 p-4
            ">
              <div className="
                flex items-center
                justify-between
              ">
                <span className="
                  text-sm text-slate-500
                ">
                  Products
                </span>

                <span className="
                  font-semibold
                  text-slate-900
                ">
                  {items.length}
                </span>
              </div>

              <div className="
                mt-2 flex items-center
                justify-between
              ">
                <span className="
                  text-sm text-slate-500
                ">
                  Total
                </span>

                <span className="
                  text-lg font-bold
                  text-[#7A1F2B]
                ">
                  {formatCurrency(
                    subtotal
                  )}
                </span>
              </div>
            </div>

            <div className="
              mt-6 flex gap-3
            ">
              <button
                type="button"
                onClick={() =>
                  setShowConfirm(
                    false
                  )
                }
                disabled={submitting}
                className="
                  flex-1 rounded-xl
                  border border-slate-200
                  px-4 py-3
                  text-sm font-semibold
                  text-slate-700
                  transition
                  hover:bg-slate-50
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={
                  confirmSubmit
                }
                disabled={submitting}
                className="
                  flex-1 rounded-xl
                  bg-[#7A1F2B]
                  px-4 py-3
                  text-sm font-bold
                  text-white
                  transition
                  hover:bg-[#651923]
                  disabled:opacity-60
                "
              >
                {submitting ? (
                  <Loader2 className="
                    mx-auto h-5 w-5
                    animate-spin
                  " />
                ) : (
                  'Confirm & Submit'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}