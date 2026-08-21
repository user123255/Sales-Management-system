import {
  BarChart3,
  Bell,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  PlusCircle,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import type { Department } from '../types/database';

interface SidebarProps {
  department: Department;
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggle: () => void;
  onLogout: () => Promise<void>;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const navigation: Record<Department, NavigationItem[]> = {
  finance: [
    {
      label: 'Dashboard',
      path: '/finance',
      icon: LayoutDashboard,
      description: 'Overview & performance',
    },
    {
      label: 'Create Order',
      path: '/finance/orders/create',
      icon: PlusCircle,
      description: 'Create a new order',
    },
    {
      label: 'Orders',
      path: '/finance/orders',
      icon: ShoppingCart,
      description: 'Track all orders',
    },
    {
      label: 'Order History',
      path: '/finance/orders/history',
      icon: ClipboardList,
      description: 'Previous orders',
    },
    {
      label: 'Invoices',
      path: '/finance/invoices',
      icon: FileText,
      description: 'Invoices & billing',
    },
    {
      label: 'Receipts',
      path: '/finance/receipts',
      icon: Receipt,
      description: 'Print & download receipts',
    },
    {
      label: 'Debtor Accounts',
      path: '/finance/debtors',
      icon: Users,
      description: 'Outstanding balances',
    },
    {
      label: 'Reports',
      path: '/finance/reports',
      icon: BarChart3,
      description: 'Financial reports',
    },
    {
      label: 'Notifications',
      path: '/finance/notifications',
      icon: Bell,
      description: 'Updates & alerts',
    },
    {
      label: 'Settings',
      path: '/finance/settings',
      icon: Settings,
      description: 'Account preferences',
    },
  ],

  butchery: [
    {
      label: 'Dashboard',
      path: '/butchery',
      icon: LayoutDashboard,
      description: 'Butchery overview',
    },
    {
      label: 'Orders',
      path: '/butchery/orders',
      icon: ShoppingCart,
      description: 'Incoming orders',
    },
    {
      label: 'Order History',
      path: '/butchery/orders/history',
      icon: ClipboardList,
      description: 'Completed orders',
    },
    {
      label: 'Inventory',
      path: '/butchery/inventory',
      icon: Package,
      description: 'Stock management',
    },
    {
      label: 'Products',
      path: '/butchery/products',
      icon: Boxes,
      description: 'Manage products',
    },
    {
      label: 'Reports',
      path: '/butchery/reports',
      icon: BarChart3,
      description: 'Production reports',
    },
    {
      label: 'Notifications',
      path: '/butchery/notifications',
      icon: Bell,
      description: 'Order alerts',
    },
    {
      label: 'Settings',
      path: '/butchery/settings',
      icon: Settings,
      description: 'Department settings',
    },
  ],

  other: [
    {
      label: 'Dashboard',
      path: '/other',
      icon: LayoutDashboard,
      description: 'Overview',
    },
    {
      label: 'Create Order',
      path: '/other/orders/create',
      icon: PlusCircle,
      description: 'Create a new order',
    },
    {
      label: 'Orders',
      path: '/other/orders',
      icon: ShoppingCart,
      description: 'Track orders',
    },
    {
      label: 'Order History',
      path: '/other/orders/history',
      icon: ClipboardList,
      description: 'Previous orders',
    },
    {
      label: 'Receipts',
      path: '/other/receipts',
      icon: Receipt,
      description: 'Print & download receipts',
    },
    {
      label: 'Notifications',
      path: '/other/notifications',
      icon: Bell,
      description: 'Updates & alerts',
    },
    {
      label: 'Settings',
      path: '/other/settings',
      icon: Settings,
      description: 'Account preferences',
    },
  ],
};

const departmentInfo: Record<
  Department,
  {
    name: string;
    shortName: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  finance: {
    name: 'Finance Department',
    shortName: 'Finance',
    icon: BarChart3,
  },
  butchery: {
    name: 'Butchery Department',
    shortName: 'Butchery',
    icon: Package,
  },
  other: {
    name: 'Operations',
    shortName: 'Operations',
    icon: ShoppingCart,
  },
};

export function Sidebar({
  department,
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggle,
  onLogout,
}: SidebarProps) {
  const items = navigation[department] ?? [];
  const info = departmentInfo[department];
  const DepartmentIcon = info.icon;

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-50 flex h-screen flex-col
          border-r border-slate-200/80 bg-white
          shadow-[8px_0_30px_rgba(15,23,42,0.04)]
          transition-all duration-300 ease-out
          ${collapsed ? 'w-[82px]' : 'w-[280px]'}
          ${
            mobileOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }
        `}
      >
        {/* Brand */}
        <div
          className={`
            flex h-[78px] items-center border-b border-slate-100
            ${collapsed ? 'justify-center px-3' : 'px-5'}
          `}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 shadow-lg shadow-blue-600/20">
              <ShoppingCart className="h-5 w-5 text-white" />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <h1 className="truncate text-[15px] font-extrabold tracking-tight text-slate-900">
                  SOMS
                </h1>
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Sales Management
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onCloseMobile}
            className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Department identity */}
        <div className={`${collapsed ? 'px-3' : 'px-4'} pt-5`}>
          <div
            className={`
              flex items-center rounded-2xl border border-blue-100
              bg-gradient-to-br from-blue-50 to-indigo-50
              ${collapsed ? 'justify-center p-3' : 'gap-3 p-3'}
            `}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <DepartmentIcon className="h-5 w-5" />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">
                  Department
                </p>
                <p className="truncate text-sm font-bold text-slate-800">
                  {info.name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {!collapsed && (
            <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Workspace
            </p>
          )}

          <div className="space-y-1">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  title={collapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    `
                    group relative flex items-center rounded-xl
                    transition-all duration-200
                    ${
                      collapsed
                        ? 'justify-center px-3 py-3'
                        : 'gap-3 px-3 py-2.5'
                    }
                    ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                    `
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 h-6 w-1 rounded-r-full bg-white" />
                      )}

                      <Icon
                        className={`
                          h-[19px] w-[19px] shrink-0
                          transition-transform duration-200
                          group-hover:scale-105
                          ${
                            isActive
                              ? 'text-white'
                              : 'text-slate-400 group-hover:text-blue-600'
                          }
                        `}
                      />

                      {!collapsed && (
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-[13px] font-semibold ${
                              isActive ? 'text-white' : 'text-slate-700'
                            }`}
                          >
                            {item.label}
                          </p>

                          {item.description && !isActive && (
                            <p className="truncate text-[10px] text-slate-400">
                              {item.description}
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Bottom controls */}
        <div className="border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={onToggle}
            className={`
              mb-2 hidden w-full items-center rounded-xl
              text-slate-500 transition hover:bg-slate-50 hover:text-slate-900
              lg:flex
              ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
            `}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs font-semibold">Collapse menu</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onLogout}
            className={`
              flex w-full items-center rounded-xl
              text-red-500 transition-all duration-200
              hover:bg-red-50 hover:text-red-600
              ${collapsed ? 'justify-center p-3' : 'gap-3 px-3 py-2.5'}
            `}
            title={collapsed ? 'Sign out' : undefined}
          >
            <LogOut className="h-[19px] w-[19px] shrink-0" />

            {!collapsed && (
              <span className="text-xs font-bold">
                Sign out
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}