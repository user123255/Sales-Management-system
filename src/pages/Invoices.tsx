import { FileText } from 'lucide-react';

export function Invoices() {
  return (
    <div className="soms-page">
      <div className="soms-page-header">
        <div>
          <h1 className="soms-page-title">Invoices</h1>
          <p className="soms-page-description">
            Create, manage and track customer invoices and payments.
          </p>
        </div>

        <button className="soms-button soms-button-primary">
          <FileText size={17} />
          Create Invoice
        </button>
      </div>

      <div className="soms-card">
        <div className="soms-card-body">
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <FileText
              size={42}
              style={{ margin: '0 auto 14px', opacity: 0.45 }}
            />

            <h3>Invoices</h3>

            <p
              style={{
                marginTop: 8,
                color: 'var(--slate-500)',
              }}
            >
              Your invoices will appear here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}