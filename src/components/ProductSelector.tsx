
import { useState, useEffect, useRef } from 'react';
import { fetchProductsByCategory, createProduct } from '../services/products';
import type { Product } from '../types/database';
import { PRODUCT_CATEGORIES } from '../types/database';
// avoid TS error when react-hot-toast isn't installed in all environments by not augmenting modules here
// simple classnames helper to avoid dependency on path aliases
const cn = (...classes: Array<string | boolean | undefined | null>) =>
  classes.filter(Boolean).join(' ');
// attempt to load react-hot-toast if available; otherwise provide a minimal fallback
let toast: { success: (msg: string) => void; error: (msg: string) => void };
// try to dynamically import react-hot-toast if available; otherwise use console fallback
toast = {
  success: (msg: string) => console.log('Toast success:', msg),
  error: (msg: string) => console.error('Toast error:', msg),
};
if (typeof window !== 'undefined') {
  // perform a runtime dynamic import without requiring TS module resolution
  const runtimeImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;
  runtimeImport('react-hot-toast')
    .then((mod) => {
      const _toast = (mod as any).default ?? mod;
      toast = _toast;
    })
    .catch(() => {
      // keep fallback
    });
}

type IconProps = {
  className?: string;
};

const Search = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const Plus = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

const ChevronDown = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const X = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

interface ProductSelectorProps {
  value: Product | null;
  onChange: (product: Product | null) => void;
  onUnitChange?: (unit: string) => void;
  disabled?: boolean;
}

export function ProductSelector({ value, onChange, onUnitChange, disabled }: ProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [productsByCategory, setProductsByCategory] = useState<Record<string, Product[]>>({});
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', category: 'Beef Cuts', unit: 'kg' });
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await fetchProductsByCategory();
      setProductsByCategory(data);
    } catch {
      toast.error('Unable to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredCategories = Object.entries(productsByCategory).reduce(
    (acc, [category, products]) => {
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
      if (filtered.length > 0) acc[category] = filtered;
      return acc;
    },
    {} as Record<string, Product[]>
  );

  const handleSelect = (product: Product) => {
    onChange(product);
    onUnitChange?.(product.unit);
    setOpen(false);
    setSearch('');
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name.trim()) {
      toast.error('Product name is required.');
      return;
    }
    setSaving(true);
    try {
      const created = await createProduct(newProduct);
      await loadProducts();
      onChange(created);
      onUnitChange?.(created.unit);
      setShowAddModal(false);
      setNewProduct({ name: '', category: 'Beef Cuts', unit: 'kg' });
      setOpen(false);
      toast.success('Product added successfully.');
    } catch {
      toast.error('Unable to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(!open)}
          className={cn(
            'flex w-full items-center justify-between rounded-lg border border-border bg-white px-3 py-2.5 text-sm transition-colors',
            'hover:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className={value ? 'text-text' : 'text-text-muted'}>
            {value ? value.name : 'Select product...'}
          </span>
          <ChevronDown className={cn('h-4 w-4 text-text-muted transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full min-w-[280px] rounded-xl border border-border bg-white shadow-xl">
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products..."
                  className="w-full rounded-lg border border-border py-2 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  autoFocus
                />
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto scrollbar-thin p-1">
              {loading ? (
                <p className="px-3 py-4 text-sm text-text-muted text-center">Loading products...</p>
              ) : Object.keys(filteredCategories).length === 0 ? (
                <p className="px-3 py-4 text-sm text-text-muted text-center">No products found</p>
              ) : (
                Object.entries(filteredCategories).map(([category, products]) => (
                  <div key={category}>
                    <p className="px-3 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wide">
                      {category}
                    </p>
                    {products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleSelect(product)}
                        className={cn(
                          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-primary-50 transition-colors',
                          value?.id === product.id && 'bg-primary-50 text-primary-700'
                        )}
                      >
                        <span>{product.name}</span>
                        <span className="text-xs text-text-muted">{product.unit}</span>
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>

            <div className="border-t border-border p-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(true);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors"
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
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Product</h3>
              <button type="button" onClick={() => setShowAddModal(false)} className="rounded-lg p-1 hover:bg-surface-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Product Name *</label>
                <input
                  type="text"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Category *</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Unit *</label>
                <select
                  value={newProduct.unit}
                  onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="kg">kg</option>
                  <option value="g">g</option>
                  <option value="piece">piece</option>
                  <option value="box">box</option>
                  <option value="bag">bag</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
