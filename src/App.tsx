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

import { ButcheryDashboard } from './pages/ButcheryDashboard';
import { ButcheryOrders } from './pages/ButcheryOrders';
import { ButcheryOrderDetails } from './pages/ButcheryOrderDetails';

import { OtherDepartmentDashboard } from './pages/OtherDepartmentDashboard';

import { CreateOrder } from './pages/CreateOrder';
import Orders from './pages/Orders';
import OrderHistory from './pages/OrderHistory';
import Receipts from './pages/Receipts';

import { DebtorAccounts } from './pages/DebtorAccounts';
import { Invoices } from './pages/Invoices';
import { Inventory } from './pages/Inventory';
import { Products } from './pages/Products';
import { Reports } from './pages/Reports';
import Notifications from './pages/Notifications';
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
          <p>Sales &amp; Order Management System</p>
        </div>

        <div className="soms-loading-spinner" />
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD ROUTING
========================================================= */

function getDashboardPath(
  department?: string | null
): string {
  const value = String(department || '')
    .trim()
    .toLowerCase();

  if (value === 'finance') {
    return '/finance';
  }

  if (value === 'butchery') {
    return '/butchery';
  }

  return '/other';
}

/* =========================================================
   PROTECTED ROUTE
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
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return <>{children}</>;
}

/* =========================================================
   PUBLIC ROUTE
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
   APPLICATION ROUTES
========================================================= */

function AppRoutes() {
  const { profile } = useAuth();

  const dashboardPath = getDashboardPath(
    profile?.department
  );

  return (
    <Routes>
      {/* ===================================================
          PUBLIC ROUTES
      =================================================== */}

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

      {/* ===================================================
          PROTECTED APPLICATION
      =================================================== */}

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* ROOT */}

        <Route
          path="/"
          element={
            <Navigate
              to={dashboardPath}
              replace
            />
          }
        />

        {/* =================================================
            FINANCE
        ================================================= */}

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
          path="/finance/orders/:orderId"
          element={<ButcheryOrderDetails />}
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

        {/* =================================================
            BUTCHERY
        ================================================= */}

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

        {/* =================================================
            OTHER DEPARTMENTS
        ================================================= */}

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

        {/* Use the existing order-details page.
            This removes the missing OtherOrderDetails error. */}
        <Route
          path="/other/orders/:orderId"
          element={<ButcheryOrderDetails />}
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

        {/* =================================================
            GENERAL ROUTES
        ================================================= */}

        <Route
          path="/dashboard"
          element={
            <Navigate
              to={dashboardPath}
              replace
            />
          }
        />

        <Route
          path="/orders"
          element={<Orders />}
        />

        <Route
          path="/orders/create"
          element={<CreateOrder />}
        />

        <Route
          path="/orders/history"
          element={<OrderHistory />}
        />

        <Route
          path="/orders/:orderId"
          element={<ButcheryOrderDetails />}
        />

        <Route
          path="/receipts"
          element={<Receipts />}
        />

        <Route
          path="/debtors"
          element={<DebtorAccounts />}
        />

        <Route
          path="/invoices"
          element={<Invoices />}
        />

        <Route
          path="/inventory"
          element={<Inventory />}
        />

        <Route
          path="/products"
          element={<Products />}
        />

        <Route
          path="/reports"
          element={<Reports />}
        />

        <Route
          path="/notifications"
          element={<Notifications />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />

        {/* =================================================
            FALLBACK
        ================================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to={dashboardPath}
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