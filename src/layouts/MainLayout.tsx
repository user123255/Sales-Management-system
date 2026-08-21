import { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  Command,
  LogOut,
  User,
} from 'lucide-react';

import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../lib/auth';
import type { Department } from '../types/database';

function getPageTitle(pathname: string) {
  if (pathname.includes('/orders/create')) return 'Create Order';
  if (pathname.includes('/orders/history')) return 'Order History';
  if (pathname.includes('/orders')) return 'Orders';
  if (pathname.includes('/receipts')) return 'Receipts';
  if (pathname.includes('/invoices')) return 'Invoices';
  if (pathname.includes('/debtors')) return 'Debtor Accounts';
  if (pathname.includes('/inventory')) return 'Inventory';
  if (pathname.includes('/products')) return 'Products';
  if (pathname.includes('/reports')) return 'Reports';
  if (pathname.includes('/notifications')) return 'Notifications';
  if (pathname.includes('/settings')) return 'Settings';

  if (pathname === '/finance') return 'Finance Dashboard';
  if (pathname === '/butchery') return 'Butchery Dashboard';
  if (pathname === '/other') return 'Department Dashboard';

  return 'SOMS';
}

function getPageDescription(pathname: string) {
  if (pathname.includes('/orders/create')) {
    return 'Create and submit a new departmental order';
  }

  if (pathname.includes('/orders/history')) {
    return 'Review previous orders and activity';
  }

  if (pathname.includes('/orders')) {
    return 'Track and manage your orders';
  }

  if (pathname.includes('/receipts')) {
    return 'View, print and download receipts';
  }

  if (pathname.includes('/invoices')) {
    return 'Manage invoices and billing';
  }

  if (pathname.includes('/debtors')) {
    return 'Monitor outstanding customer balances';
  }

  if (pathname.includes('/inventory')) {
    return 'Monitor stock availability and movement';
  }

  if (pathname.includes('/products')) {
    return 'Manage the product catalogue';
  }

  if (pathname.includes('/reports')) {
    return 'Analyse business activity and performance';
  }

  if (pathname.includes('/notifications')) {
    return 'Stay updated with workspace activity';
  }

  if (pathname.includes('/settings')) {
    return 'Manage your account and preferences';
  }

  return 'Sales & Order Management System';
}

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const { profile, signOut } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const department = (profile?.department || 'finance') as Department;

  const title = getPageTitle(location.pathname);
  const description = getPageDescription(location.pathname);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const initials =
    profile?.full_name
      ?.split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        department={department}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onToggle={() => setCollapsed((value) => !value)}
        onLogout={handleLogout}
      />

      <div
        className={`
          min-h-screen
          transition-[padding] duration-300
          ease-[cubic-bezier(0.22,1,0.36,1)]
          ${collapsed ? 'lg:pl-[82px]' : 'lg:pl-[272px]'}
        `}
      >
        {/* =====================================================
            TOP BAR
        ===================================================== */}

        <header
          className="
            sticky top-0 z-30
            border-b border-slate-200/80
            bg-white/90
            backdrop-blur-xl
          "
        >
          <div className="flex min-h-[78px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              className="
                flex h-10 w-10 shrink-0 items-center
                justify-center rounded-xl
                border border-slate-200
                bg-white text-slate-600
                shadow-sm
                transition
                hover:border-slate-300
                hover:bg-slate-50
                lg:hidden
              "
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Page title */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl">
                  {title}
                </h1>

                <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-700 sm:inline-flex">
                  <span className="soms-live-dot" />
                  Live
                </span>
              </div>

              <p className="mt-0.5 hidden truncate text-[11px] font-medium text-slate-400 sm:block">
                {description}
              </p>
            </div>

            {/* Search */}
            <button
              type="button"
              className="
                hidden h-10 w-[240px]
                items-center gap-2
                rounded-xl
                border border-slate-200
                bg-slate-50
                px-3
                text-left
                transition
                hover:border-slate-300
                hover:bg-white
                md:flex
              "
            >
              <Search className="h-4 w-4 text-slate-400" />

              <span className="flex-1 text-[11px] font-medium text-slate-400">
                Search anything...
              </span>

              <span
                className="
                  flex items-center gap-0.5
                  rounded-md
                  border border-slate-200
                  bg-white
                  px-1.5 py-0.5
                  text-[9px] font-semibold
                  text-slate-400
                  shadow-sm
                "
              >
                <Command className="h-2.5 w-2.5" />
                K
              </span>
            </button>

            {/* Notifications */}
            <button
              type="button"
              onClick={() =>
                navigate(`/${department}/notifications`)
              }
              aria-label="Notifications"
              className="
                relative flex h-10 w-10 shrink-0
                items-center justify-center
                rounded-xl
                border border-slate-200
                bg-white
                text-slate-500
                shadow-sm
                transition
                hover:border-slate-300
                hover:bg-slate-50
                hover:text-slate-900
              "
            >
              <Bell className="h-[18px] w-[18px]" />

              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
            </button>

            {/* Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setProfileOpen((value) => !value)
                }
                className="
                  flex items-center gap-2
                  rounded-xl
                  border border-slate-200
                  bg-white
                  p-1.5 pr-2
                  shadow-sm
                  transition
                  hover:border-slate-300
                  hover:bg-slate-50
                "
              >
                <div
                  className="
                    flex h-8 w-8 items-center
                    justify-center rounded-lg
                    bg-gradient-to-br
                    from-blue-600 to-indigo-600
                    text-[10px] font-extrabold
                    text-white
                  "
                >
                  {initials}
                </div>

                <div className="hidden max-w-[130px] text-left xl:block">
                  <p className="truncate text-[11px] font-extrabold text-slate-800">
                    {profile?.full_name || 'Workspace User'}
                  </p>

                  <p className="truncate text-[9px] font-medium capitalize text-slate-400">
                    {department}
                  </p>
                </div>

                <ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 xl:block" />
              </button>

              {profileOpen && (
                <div
                  className="
                    soms-modal
                    absolute right-0 top-12
                    w-60 overflow-hidden
                    rounded-2xl
                    border border-slate-200
                    bg-white
                    p-2
                    shadow-2xl
                    shadow-slate-900/10
                  "
                >
                  <div className="border-b border-slate-100 px-3 py-3">
                    <p className="text-xs font-extrabold text-slate-800">
                      {profile?.full_name || 'Workspace User'}
                    </p>

                    <p className="mt-1 truncate text-[10px] text-slate-400">
                      {profile?.email || ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      navigate(`/${department}/settings`);
                    }}
                    className="
                      mt-1 flex w-full items-center gap-3
                      rounded-xl px-3 py-2.5
                      text-left text-xs font-bold
                      text-slate-600
                      transition
                      hover:bg-slate-50
                      hover:text-slate-900
                    "
                  >
                    <User className="h-4 w-4" />
                    My profile
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="
                      flex w-full items-center gap-3
                      rounded-xl px-3 py-2.5
                      text-left text-xs font-bold
                      text-red-500
                      transition
                      hover:bg-red-50
                      hover:text-red-600
                    "
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* =====================================================
            PAGE CONTENT
        ===================================================== */}

        <main className="min-h-[calc(100vh-78px)] px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <div
            key={location.pathname}
            className="soms-page mx-auto w-full max-w-[1600px]"
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}