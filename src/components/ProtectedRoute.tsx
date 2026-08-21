import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../lib/auth';
import {
  canAccessRoute,
  getDashboardRoute,
} from '../lib/permissions';

import type { Department } from '../types/database';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedDepartments?: Department[];
}

export function ProtectedRoute({
  children,
  allowedDepartments,
}: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow-lg">
            S
          </div>

          <div className="mx-auto mt-6 h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500" />

          <p className="mt-4 text-sm text-slate-400">
            Loading SOMS...
          </p>

        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  if (!profile.is_active) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">

        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            !
          </div>

          <h2 className="mt-5 text-xl font-bold text-slate-900">
            Account Disabled
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Your SOMS account has been deactivated.
            Please contact your system administrator.
          </p>

        </div>

      </div>
    );
  }

  if (
    allowedDepartments &&
    !allowedDepartments.includes(profile.department)
  ) {
    return (
      <Navigate
        to={getDashboardRoute(profile.department)}
        replace
      />
    );
  }

  if (!canAccessRoute(profile.department, location.pathname)) {
    return (
      <Navigate
        to={getDashboardRoute(profile.department)}
        replace
      />
    );
  }

  return <>{children}</>;
}