export type Department = 'finance' | 'butchery' | 'other';

export type UserRole = 'user' | 'manager' | 'admin';

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'processing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type OrderItemResponseStatus =
  | 'pending'
  | 'available'
  | 'partial'
  | 'unavailable';

export type InvoiceStatus =
  | 'paid'
  | 'partially_paid'
  | 'outstanding'
  | 'overdue';

export type InventoryStatus =
  | 'available'
  | 'low_stock'
  | 'out_of_stock';

export type PaymentMethod =
  | 'bank_transfer'
  | 'cash'
  | 'ecobank'
  | 'mobile_money'
  | 'other';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  department: Department;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  notification_preferences: NotificationPreferences;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  order_updates: boolean;
  new_orders: boolean;
  completed_orders: boolean;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  created_by: string;
  department: Department;
  status: OrderStatus;
  notes: string | null;
  customer_name: string | null;
  delivery_info: string | null;
  subtotal: number;
  total: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;

  creator?: Profile;

  items?: OrderItem[];

  status_history?: OrderStatusHistory[];
}

export interface OrderItem {
  id: string;
  order_id: string;

  product_id: string | null;

  product_name: string;

  quantity: number;

  unit: string;

  price: number;

  packaging: string | null;

  notes: string | null;

  is_prepared: boolean;

  created_at: string;

  /* Butchery response */

  available_quantity: number | null;

  accepted_quantity: number | null;

  butchery_note: string | null;

  responded_at: string | null;

  responded_by: string | null;

  response_status: OrderItemResponseStatus;

  responder?: Profile;
}

export interface OrderStatusHistory {
  id: string;

  order_id: string;

  status: OrderStatus;

  changed_by: string;

  department: Department;

  comment: string | null;

  created_at: string;

  changer?: Profile;
}

export interface Notification {
  id: string;

  user_id: string;

  type: string;

  title: string;

  message: string;

  order_id: string | null;

  is_read: boolean;

  created_at: string;
}

export interface Invoice {
  id: string;

  invoice_number: string;

  order_id: string | null;

  customer_name: string;

  customer_contact: string | null;

  subtotal: number;

  total: number;

  amount_paid: number;

  balance: number;

  status: InvoiceStatus;

  due_date: string;

  notes: string | null;

  created_by: string;

  created_at: string;

  updated_at: string;

  items?: InvoiceItem[];

  order?: Order;
}

export interface InvoiceItem {
  id: string;

  invoice_id: string;

  product_name: string;

  quantity: number;

  unit: string;

  price: number;

  total: number;
}

export interface Debtor {
  id: string;

  customer_name: string;

  contact: string | null;

  total_balance: number;

  created_at: string;

  updated_at: string;

  invoices?: Invoice[];
}

export interface Payment {
  id: string;

  invoice_id: string;

  payment_method: PaymentMethod;

  amount: number;

  reference: string | null;

  payment_date: string;

  recorded_by: string;

  created_at: string;
}

export interface InventoryItem {
  id: string;

  product_id: string;

  quantity: number;

  unit: string;

  low_stock_threshold: number;

  updated_at: string;

  product?: Product;
}

export interface OrganizationSettings {
  id: string;

  name: string;

  currency: string;

  date_format: string;

  allow_negative_inventory: boolean;

  updated_at: string;
}

export interface CreateOrderItemInput {
  product_id: string | null;

  product_name: string;

  quantity: number;

  unit: string;

  price: number;

  packaging: string;

  notes: string;
}

export interface CreateOrderInput {
  notes: string;

  customer_name: string;

  delivery_info: string;

  items: CreateOrderItemInput[];
}

export interface ReportSummary {
  totalOrders: number;

  totalSales: number;

  completedOrders: number;

  pendingOrders: number;

  outstandingAmount: number;
}

export interface ProductPerformance {
  product_name: string;

  total_quantity: number;

  total_sales: number;

  order_count: number;
}

export interface DepartmentActivity {
  department: string;

  order_count: number;

  total_sales: number;
}

export const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'accepted',
  'processing',
  'ready',
  'completed',
  'cancelled',
];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  processing: 'Processing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const DEPARTMENT_LABELS: Record<Department, string> = {
  finance: 'Finance',
  butchery: 'Butchery',
  other: 'Other',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: 'Bank Transfer',
  cash: 'Cash',
  ecobank: 'Ecobank',
  mobile_money: 'Mobile Money',
  other: 'Other',
};

export const PRODUCT_CATEGORIES = [
  'Beef Cuts',
  'Pork Cuts',
  'Quarters',
  'Processed Products',
] as const;