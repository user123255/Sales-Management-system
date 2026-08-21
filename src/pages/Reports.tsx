import {
  BarChart3,
  Download,
  TrendingUp,
} from 'lucide-react';

export function Reports() {
  return (
    <div className="soms-page">
      <div className="soms-page-header">
        <div>
          <h1 className="soms-page-title">Reports</h1>
          <p className="soms-page-description">
            Analyse sales, orders, products and departmental activity.
          </p>
        </div>

        <button className="soms-button soms-button-secondary">
          <Download size={17} />
          Export Report
        </button>
      </div>

      <div className="soms-stat-grid">
        <div className="soms-stat-card">
          <span className="soms-stat-label">TOTAL ORDERS</span>
          <div className="soms-stat-value">0</div>
        </div>

        <div className="soms-stat-card">
          <span className="soms-stat-label">TOTAL SALES</span>
          <div className="soms-stat-value">$0.00</div>
        </div>

        <div className="soms-stat-card">
          <span className="soms-stat-label">COMPLETED ORDERS</span>
          <div className="soms-stat-value">0</div>
        </div>

        <div className="soms-stat-card">
          <span className="soms-stat-label">OUTSTANDING</span>
          <div className="soms-stat-value">$0.00</div>
        </div>
      </div>

      <div className="soms-card">
        <div className="soms-card-header">
          <div>
            <h3>Sales Performance</h3>
            <p
              style={{
                marginTop: 4,
                color: 'var(--slate-500)',
                fontSize: 13,
              }}
            >
              Sales and order performance overview
            </p>
          </div>

          <BarChart3 size={21} color="var(--blue-600)" />
        </div>

        <div className="soms-card-body">
          <div style={{ textAlign: 'center', padding: '55px 20px' }}>
            <TrendingUp
              size={42}
              style={{ margin: '0 auto 14px', opacity: 0.45 }}
            />

            <h3>No report data available</h3>

            <p
              style={{
                marginTop: 8,
                color: 'var(--slate-500)',
              }}
            >
              Reports will populate as orders and sales are recorded.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}