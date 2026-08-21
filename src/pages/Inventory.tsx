import { Package, Plus, Search } from 'lucide-react';
import { useState } from 'react';

export function Inventory() {
  const [search, setSearch] = useState('');

  return (
    <div className="soms-page">
      <div className="soms-page-header">
        <div>
          <h1 className="soms-page-title">Inventory</h1>
          <p className="soms-page-description">
            Monitor stock levels, availability, and inventory movements.
          </p>
        </div>

        <button className="soms-button soms-button-primary">
          <Plus size={16} />
          Add Stock
        </button>
      </div>

      <div className="soms-stat-grid">
        <div className="soms-stat-card">
          <div className="soms-stat-label">TOTAL PRODUCTS</div>
          <div className="soms-stat-value">0</div>
        </div>

        <div className="soms-stat-card">
          <div className="soms-stat-label">IN STOCK</div>
          <div className="soms-stat-value">0</div>
        </div>

        <div className="soms-stat-card">
          <div className="soms-stat-label">LOW STOCK</div>
          <div className="soms-stat-value">0</div>
        </div>

        <div className="soms-stat-card">
          <div className="soms-stat-label">OUT OF STOCK</div>
          <div className="soms-stat-value">0</div>
        </div>
      </div>

      <div className="soms-card">
        <div className="soms-card-header">
          <h3>Inventory</h3>

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
              placeholder="Search inventory..."
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

              <h3>No inventory records</h3>

              <p
                style={{
                  marginTop: 6,
                  color: '#64748b',
                  fontSize: 14,
                }}
              >
                Inventory data connected to Supabase will appear here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Inventory;
