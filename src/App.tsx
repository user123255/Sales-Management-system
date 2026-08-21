import type { ReactNode } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import { AuthProvider, useAuth } from './lib/auth';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { FinanceDashboard } from './pages/FinanceDashboard';
import { ButcheryDashboard } from './pages/ButcheryDashboardc';
import { ButcheryOrders } from './pages/ButcheryOrders';
import { ButcheryOrderDetails } from './pages/ButcheryOrderDetails';
import { CreateOrder } from './pages/CreateOrder';
import Orders from './pages/Orders';
import OrderHistory from './pages/OrderHistory';
import Receipts from './pages/Receipts';
import { DebtorAccounts } from './pages/DebtorAccounts';
import { Invoices } from './pages/Invoices';
import { Inventory } from './pages/Inventory';
import { Products } from './pages/Products';
import { Reports } from './pages/Reports';
import { Notifications } from './pages/Notifications';
import { Settings } from './pages/Settings';

import { MainLayout } from './layouts/MainLayout';

/* =========================================================
   LOADING SCREEN
========================================================= */

function LoadingScreen() {
  return (
    <div className="soms-loading">
      <div className="soms-loading-card">
        <div className="soms-loading-logo">
          <span>S</span>
        </div>

        <div>
          <h1>SOMS</h1>
          <p>Sales & Order Management System</p>
        </div>

        <div className="soms-loading-spinner" />
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD ROUTING
========================================================= */

function getDashboardPath(department?: string | null) {
  const value = String(department || '').trim().toLowerCase();

  if (value === 'finance') {
    return '/finance';
  }

  if (value === 'butchery') {
    return '/butchery';
  }

  return '/other';
}

/* =========================================================
   PROTECTED APPLICATION
========================================================= */

function ProtectedRoute({
  children,
}: {
  children: ReactNode;
}) {
  const { profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <>{children}</>;
}

/* =========================================================
   PUBLIC APPLICATION
========================================================= */

function PublicRoute({
  children,
}: {
  children: ReactNode;
}) {
  const { profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (profile) {
    return (
      <Navigate
        to={getDashboardPath(profile.department)}
        replace
      />
    );
  }

  return <>{children}</>;
}

/* =========================================================
   OTHER DEPARTMENT DASHBOARD
========================================================= */

function OtherDepartmentDashboard() {
  const { profile } = useAuth();

  return (
    <div className="soms-page">
      <section className="soms-hero">
        <div>
          <span className="soms-eyebrow">
            Department Workspace
          </span>

          <h1>
            Welcome to your workspace
          </h1>

          <p>
            Manage departmental orders, track fulfilment and
            stay updated with your team's activity.
          </p>
        </div>

        <div className="soms-hero-badge">
          <span />
          Live
        </div>
      </section>

      <section className="soms-stat-grid">
        <div className="soms-stat-card">
          <span>Department</span>
          <strong>
            {profile?.department || 'Operations'}
          </strong>
        </div>

        <div className="soms-stat-card">
          <span>Today's Orders</span>
          <strong>0</strong>
        </div>

        <div className="soms-stat-card">
          <span>Pending</span>
          <strong className="warning">0</strong>
        </div>

        <div className="soms-stat-card">
          <span>Completed</span>
          <strong className="success">0</strong>
        </div>
      </section>

      <section className="soms-content-grid">
        <div className="soms-panel">
          <div className="soms-panel-header">
            <div>
              <h2>Recent Orders</h2>
              <p>Your department's latest orders.</p>
            </div>
          </div>

          <div className="soms-empty">
            <div className="soms-empty-icon">🛒</div>
            <h3>No orders yet</h3>
            <p>
              Create your first departmental order to get started.
            </p>
          </div>
        </div>

        <div className="soms-panel">
          <div className="soms-panel-header">
            <div>
              <h2>Quick Actions</h2>
              <p>Common tasks for your department.</p>
            </div>
          </div>

          <div className="soms-action-grid">
            <a href="/other/orders/create">
              <span>＋</span>
              Create Order
            </a>

            <a href="/other/orders">
              <span>🛒</span>
              View Orders
            </a>

            <a href="/other/receipts">
              <span>🧾</span>
              Receipts
            </a>

            <a href="/other/notifications">
              <span>🔔</span>
              Notifications
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

/* =========================================================
   APPLICATION ROUTES
========================================================= */

function AppRoutes() {
  const { profile } = useAuth();

  return (
    <Routes>

      {/* =====================================================
          PUBLIC
      ===================================================== */}

      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* =====================================================
          PROTECTED APPLICATION
      ===================================================== */}

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >

        {/* ===================================================
            ROOT
        =================================================== */}

        <Route
          path="/"
          element={
            <Navigate
              to={getDashboardPath(profile?.department)}
              replace
            />
          }
        />

        {/* ===================================================
            FINANCE
        =================================================== */}

        <Route
          path="/finance"
          element={<FinanceDashboard />}
        />

        <Route
          path="/finance/dashboard"
          element={<FinanceDashboard />}
        />

        <Route
          path="/finance/orders"
          element={<Orders />}
        />

        <Route
          path="/finance/orders/create"
          element={<CreateOrder />}
        />

        <Route
          path="/finance/orders/history"
          element={<OrderHistory />}
        />

        <Route
          path="/finance/debtors"
          element={<DebtorAccounts />}
        />

        <Route
          path="/finance/invoices"
          element={<Invoices />}
        />

        <Route
          path="/finance/receipts"
          element={<Receipts />}
        />

        <Route
          path="/finance/inventory"
          element={<Inventory />}
        />

        <Route
          path="/finance/products"
          element={<Products />}
        />

        <Route
          path="/finance/reports"
          element={<Reports />}
        />

        <Route
          path="/finance/notifications"
          element={<Notifications />}
        />

        <Route
          path="/finance/settings"
          element={<Settings />}
        />

        {/* ===================================================
            BUTCHERY
        =================================================== */}

        <Route
          path="/butchery"
          element={<ButcheryDashboard />}
        />

        <Route
          path="/butchery/dashboard"
          element={<ButcheryDashboard />}
        />

        <Route
          path="/butchery/orders"
          element={<ButcheryOrders />}
        />

        <Route
          path="/butchery/orders/:orderId"
          element={<ButcheryOrderDetails />}
        />

        <Route
          path="/butchery/orders/history"
          element={<OrderHistory />}
        />

        <Route
          path="/butchery/inventory"
          element={<Inventory />}
        />

        <Route
          path="/butchery/products"
          element={<Products />}
        />

        <Route
          path="/butchery/receipts"
          element={<Receipts />}
        />

        <Route
          path="/butchery/reports"
          element={<Reports />}
        />

        <Route
          path="/butchery/notifications"
          element={<Notifications />}
        />

        <Route
          path="/butchery/settings"
          element={<Settings />}
        />

        {/* ===================================================
            OTHER DEPARTMENTS
        =================================================== */}

        <Route
          path="/other"
          element={<OtherDepartmentDashboard />}
        />

        <Route
          path="/other/dashboard"
          element={<OtherDepartmentDashboard />}
        />

        <Route
          path="/other/orders"
          element={<Orders />}
        />

        <Route
          path="/other/orders/create"
          element={<CreateOrder />}
        />

        <Route
          path="/other/orders/history"
          element={<OrderHistory />}
        />

        <Route
          path="/other/receipts"
          element={<Receipts />}
        />

        <Route
          path="/other/notifications"
          element={<Notifications />}
        />

        <Route
          path="/other/settings"
          element={<Settings />}
        />

        {/* ===================================================
            GENERAL
        =================================================== */}

        <Route
          path="/dashboard"
          element={
            <Navigate
              to={getDashboardPath(profile?.department)}
              replace
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to={getDashboardPath(profile?.department)}
              replace
            />
          }
        />

      </Route>
    </Routes>
  );
}

/* =========================================================
   ROOT APPLICATION
========================================================= */

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}