import type { Department, UserRole } from '../types/database';

export const DEPARTMENT_ROUTES: Record<Department, string> = {
  finance: '/finance',
  butchery: '/butchery',
  other: '/other',
};

export function getDashboardRoute(department: Department): string {
  return DEPARTMENT_ROUTES[department];
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

export function getNavItems(department: Department): NavItem[] {
  switch (department) {
    case 'finance':
      return [
        {
          label: 'Dashboard',
          path: '/finance',
          icon: 'LayoutDashboard',
        },
        {
          label: 'Create Order',
          path: '/finance/orders/create',
          icon: 'PlusCircle',
        },
        {
          label: 'Order History',
          path: '/finance/orders',
          icon: 'ClipboardList',
        },
        {
          label: 'Invoices',
          path: '/finance/invoices',
          icon: 'FileText',
        },
        {
          label: 'Debtor Accounts',
          path: '/finance/debtors',
          icon: 'Users',
        },
        {
          label: 'Reports',
          path: '/finance/reports',
          icon: 'BarChart3',
        },
      ];

    case 'butchery':
      return [
        {
          label: 'Dashboard',
          path: '/butchery',
          icon: 'LayoutDashboard',
        },
        {
          label: 'Orders',
          path: '/butchery/orders',
          icon: 'ClipboardList',
        },
        {
          label: 'Inventory',
          path: '/butchery/inventory',
          icon: 'Package',
        },
        {
          label: 'Products',
          path: '/butchery/products',
          icon: 'Boxes',
        },
        {
          label: 'Reports',
          path: '/butchery/reports',
          icon: 'BarChart3',
        },
      ];

    case 'other':
      return [
        {
          label: 'Dashboard',
          path: '/other',
          icon: 'LayoutDashboard',
        },
        {
          label: 'Create Order',
          path: '/other/orders/create',
          icon: 'PlusCircle',
        },
        {
          label: 'Order History',
          path: '/other/orders',
          icon: 'ClipboardList',
        },
      ];

    default:
      return [];
  }
}

export function canAccessRoute(
  department: Department,
  pathname: string
): boolean {
  if (pathname === '/' || pathname === '/login') {
    return true;
  }

  switch (department) {
    case 'finance':
      return (
        pathname === '/finance' ||
        pathname.startsWith('/finance/')
      );

    case 'butchery':
      return (
        pathname === '/butchery' ||
        pathname.startsWith('/butchery/')
      );

    case 'other':
      return (
        pathname === '/other' ||
        pathname.startsWith('/other/')
      );

    default:
      return false;
  }
}

export function canCreateOrders(department: Department): boolean {
  return department === 'finance' || department === 'other';
}

export function canUpdateOrderStatus(department: Department): boolean {
  return department === 'butchery';
}

export function canManageProducts(
  department: Department,
  role: UserRole
): boolean {
  return (
    department === 'butchery' ||
    department === 'finance' ||
    role === 'admin'
  );
}