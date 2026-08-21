import { Package, Plus, Search } from 'lucide-react';
import { useState } from 'react';

export function Products() {
  const [search, setSearch] = useState('');

  return (
    <div className="soms-page">
      <div className="soms-page-header">
        <div>
          <h1 className="soms-page-title">Products</h1>
          <p className="soms-page-description">
            Manage products available for ordering and sales.
          </p>
        </div>

        <button className="soms-button soms-button-primary">
          <Plus size={16} />
          Add Product
        </button>
      </div>

      <div className="soms-card">
        <div className="soms-card-header">
          <div>
            <h3>Product Catalogue</h3>
          </div>

          <div style={{ position: 'relative', width: 280 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />

            <input
              className="soms-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              style={{ paddingLeft: 36 }}
            />
          </div>
        </div>

        <div className="soms-card-body">
          <div className="soms-loading">
            <div style={{ textAlign: 'center' }}>
              <Package
                size={42}
                style={{
                  margin: '0 auto 12px',
                  color: '#2563eb',
                }}
              />

              <h3>No products to display</h3>

              <p
                style={{
                  marginTop: 6,
                  color: '#64748b',
                  fontSize: 14,
                }}
              >
                Products connected to Supabase will appear here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Products;
