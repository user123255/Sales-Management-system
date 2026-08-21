import {
  Bell,
  CheckCircle2,
} from 'lucide-react';

export function Notifications() {
  return (
    <div className="soms-page">
      <div className="soms-page-header">
        <div>
          <h1 className="soms-page-title">Notifications</h1>
          <p className="soms-page-description">
            
          </p>
        </div>
      </div>

      <div className="soms-card">
        <div className="soms-card-header">
          <div>
            <h3>Recent Notifications</h3>
          </div>

          <Bell size={20} color="var(--blue-600)" />
        </div>

        <div className="soms-card-body">
          <div style={{ textAlign: 'center', padding: '50px 20px' }}>
            <CheckCircle2
              size={42}
              style={{ margin: '0 auto 14px', opacity: 0.45 }}
            />

            <h3>You're all caught up</h3>

            <p
              style={{
                marginTop: 8,
                color: 'var(--slate-500)',
              }}
            >
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}