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
  mobileOpen?: boolean;
  onClose?: () => void;
  onToggle: () => void;
  onLogout: () => Promise<void>;
}

interface NavigationItem {
  label: string;
  path: string;
  icon: React.ComponentType<{
    className?: string;
  }>;
  description?: string;
}

/* =========================================================
   SOMS NAVIGATION
========================================================= */

const navigation: Record<
  Department,
  NavigationItem[]
> = {
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

/* =========================================================
   DEPARTMENT INFORMATION
========================================================= */

const departmentInfo: Record<
  Department,
  {
    name: string;
    shortName: string;
    icon: React.ComponentType<{
      className?: string;
    }>;
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

/* =========================================================
   SIDEBAR
========================================================= */

export function Sidebar({
  department,
  collapsed,
  mobileOpen = false,
  onClose,
  onToggle,
  onLogout,
}: SidebarProps) {
  const items =
    navigation[department] ?? [];

  const info =
    departmentInfo[department];

  const DepartmentIcon =
    info.icon;

  return (
    <>
      {/* =====================================================
          MOBILE BACKDROP
      ===================================================== */}

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className="
            fixed inset-0 z-40
            bg-slate-950/60
            backdrop-blur-sm
            lg:hidden
          "
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`
          fixed
          left-0
          top-0
          z-50
          flex
          h-screen
          flex-col

          border-r
          border-slate-200

          bg-white

          shadow-[8px_0_30px_rgba(15,23,42,0.06)]

          transition-all
          duration-300
          ease-in-out

          ${
            collapsed
              ? 'w-[82px]'
              : 'w-[280px]'
          }

          ${
            mobileOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }

          dark:border-slate-800
          dark:bg-slate-950
        `}
      >
        {/* =================================================
            BRAND
        ================================================= */}

        <div
          className={`
            flex
            h-[78px]
            shrink-0
            items-center

            border-b
            border-slate-100

            dark:border-slate-800

            ${
              collapsed
                ? 'justify-center px-3'
                : 'px-5'
            }
          `}
        >
          <div className="flex min-w-0 items-center gap-3">
            {/* Logo */}

            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-2xl

                bg-gradient-to-br
                from-[#7f1d1d]
                via-[#991b1b]
                to-[#b91c1c]

                shadow-lg
                shadow-red-900/20
              "
            >
              <ShoppingCart
                className="
                  h-5
                  w-5
                  text-white
                "
              />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <h1
                  className="
                    truncate
                    text-[15px]
                    font-extrabold
                    tracking-tight
                    text-slate-900
                    dark:text-white
                  "
                >
                  SOMS
                </h1>

                <p
                  className="
                    truncate
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-slate-400
                  "
                >
                  Sales Management
                </p>
              </div>
            )}
          </div>

          {/* Mobile close */}

          <button
            type="button"
            onClick={onClose}
            className="
              ml-auto
              rounded-lg
              p-2

              text-slate-400

              transition

              hover:bg-slate-100
              hover:text-slate-700

              dark:hover:bg-slate-800
              dark:hover:text-white

              lg:hidden
            "
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* =================================================
            DEPARTMENT CARD
        ================================================= */}

        <div
          className={`
            ${
              collapsed
                ? 'px-3'
                : 'px-4'
            }
            pt-5
          `}
        >
          <div
            className={`
              flex
              items-center
              rounded-2xl

              border
              border-red-100

              bg-red-50

              dark:border-red-950
              dark:bg-red-950/30

              ${
                collapsed
                  ? 'justify-center p-3'
                  : 'gap-3 p-3'
              }
            `}
          >
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl

                bg-white

                text-[#991b1b]

                shadow-sm

                dark:bg-slate-900
                dark:text-red-400
              "
            >
              <DepartmentIcon
                className="h-5 w-5"
              />
            </div>

            {!collapsed && (
              <div className="min-w-0">
                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-wider
                    text-[#991b1b]

                    dark:text-red-400
                  "
                >
                  Department
                </p>

                <p
                  className="
                    truncate
                    text-sm
                    font-bold
                    text-slate-800

                    dark:text-slate-100
                  "
                >
                  {info.name}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* =================================================
            NAVIGATION
        ================================================= */}

        <nav
          className="
            flex-1
            overflow-y-auto
            px-3
            py-5
          "
        >
          {!collapsed && (
            <p
              className="
                mb-3
                px-2
                text-[10px]
                font-bold
                uppercase
                tracking-[0.16em]
                text-slate-400
              "
            >
              Workspace
            </p>
          )}

          <div className="space-y-1">
            {items.map((item) => {
              const Icon =
                item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  title={
                    collapsed
                      ? item.label
                      : undefined
                  }
                  className={({
                    isActive,
                  }) =>
                    `
                    group
                    relative
                    flex
                    items-center
                    rounded-xl

                    transition-all
                    duration-200

                    ${
                      collapsed
                        ? 'justify-center px-3 py-3'
                        : 'gap-3 px-3 py-2.5'
                    }

                    ${
                      isActive
                        ? `
                          bg-[#991b1b]
                          text-white
                          shadow-md
                          shadow-red-900/20
                        `
                        : `
                          text-slate-600
                          hover:bg-red-50
                          hover:text-[#991b1b]

                          dark:text-slate-300
                          dark:hover:bg-red-950/30
                          dark:hover:text-red-400
                        `
                    }
                    `
                  }
                >
                  {({
                    isActive,
                  }) => (
                    <>
                      {/* Active indicator */}

                      {isActive && (
                        <span
                          className="
                            absolute
                            left-0
                            h-6
                            w-1
                            rounded-r-full
                            bg-white
                          "
                        />
                      )}

                      <Icon
                        className={`
                          h-[19px]
                          w-[19px]
                          shrink-0

                          transition-transform
                          duration-200

                          group-hover:scale-105

                          ${
                            isActive
                              ? 'text-white'
                              : `
                                text-slate-400
                                group-hover:text-[#991b1b]

                                dark:text-slate-500
                                dark:group-hover:text-red-400
                              `
                          }
                        `}
                      />

                      {!collapsed && (
                        <div
                          className="
                            min-w-0
                            flex-1
                          "
                        >
                          <p
                            className={`
                              truncate
                              text-[13px]
                              font-semibold

                              ${
                                isActive
                                  ? 'text-white'
                                  : `
                                    text-slate-700
                                    dark:text-slate-200
                                  `
                              }
                            `}
                          >
                            {item.label}
                          </p>

                          {item.description &&
                            !isActive && (
                              <p
                                className="
                                  truncate
                                  text-[10px]
                                  text-slate-400
                                  dark:text-slate-500
                                "
                              >
                                {
                                  item.description
                                }
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

        {/* =================================================
            BOTTOM CONTROLS
        ================================================= */}

        <div
          className="
            shrink-0
            border-t
            border-slate-100
            p-3

            dark:border-slate-800
          "
        >
          {/* Collapse / Expand */}

          <button
            type="button"
            onClick={onToggle}
            className={`
              mb-2
              hidden
              w-full
              items-center
              rounded-xl

              text-slate-500

              transition-all

              hover:bg-red-50
              hover:text-[#991b1b]

              dark:hover:bg-red-950/30
              dark:hover:text-red-400

              lg:flex

              ${
                collapsed
                  ? 'justify-center p-3'
                  : 'gap-3 px-3 py-2.5'
              }
            `}
            title={
              collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
            aria-label={
              collapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
          >
            {collapsed ? (
              <ChevronRight
                className="h-4 w-4"
              />
            ) : (
              <>
                <ChevronLeft
                  className="h-4 w-4"
                />

                <span
                  className="
                    text-xs
                    font-semibold
                  "
                >
                  Collapse menu
                </span>
              </>
            )}
          </button>

          {/* Sign out */}

          <button
            type="button"
            onClick={() => {
              void onLogout();
            }}
            className={`
              flex
              w-full
              items-center
              rounded-xl

              text-red-600

              transition-all
              duration-200

              hover:bg-red-50
              hover:text-red-700

              dark:text-red-400
              dark:hover:bg-red-950/40
              dark:hover:text-red-300

              ${
                collapsed
                  ? 'justify-center p-3'
                  : 'gap-3 px-3 py-2.5'
              }
            `}
            title={
              collapsed
                ? 'Sign out'
                : undefined
            }
            aria-label="Sign out"
          >
            <LogOut
              className="
                h-[19px]
                w-[19px]
                shrink-0
              "
            />

            {!collapsed && (
              <span
                className="
                  text-xs
                  font-bold
                "
              >
                Sign out
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;