
import { supabase, getFriendlyError } from '../lib/supabase';
import type { ReportSummary, ProductPerformance, DepartmentActivity } from '../types/database';

export async function getDailyReport(date: string): Promise<ReportSummary> {
  const { data, error } = await supabase
    .from('orders')
    .select('status, total, created_at')
    .gte('created_at', `${date}T00:00:00`)
    .lte('created_at', `${date}T23:59:59`);

  if (error) throw new Error(getFriendlyError(error));
  const orders = data || [];

  const { data: invoices } = await supabase
    .from('invoices')
    .select('balance')
    .in('status', ['outstanding', 'partially_paid', 'overdue']);

  return {
    totalOrders: orders.length,
    totalSales: orders
      .filter((o) => o.status === 'completed')
      .reduce((s, o) => s + Number(o.total), 0),
    completedOrders: orders.filter((o) => o.status === 'completed').length,
    pendingOrders: orders.filter((o) => o.status === 'pending').length,
    outstandingAmount: (invoices || []).reduce((s, i) => s + Number(i.balance), 0),
  };
}

export async function getWeeklyReport(startDate: string, endDate: string): Promise<ReportSummary> {
  const { data, error } = await supabase
    .from('orders')
    .select('status, total, created_at')
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`);

  if (error) throw new Error(getFriendlyError(error));
  const orders = data || [];

  return {
    totalOrders: orders.length,
    totalSales: orders
      .filter((o) => o.status === 'completed')
      .reduce((s, o) => s + Number(o.total), 0),
    completedOrders: orders.filter((o) => o.status === 'completed').length,
    pendingOrders: orders.filter((o) => o.status === 'pending').length,
    outstandingAmount: 0,
  };
}

export async function getMonthlyReport(year: number, month: number): Promise<ReportSummary> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('orders')
    .select('status, total')
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`);

  if (error) throw new Error(getFriendlyError(error));
  const orders = data || [];

  const { data: invoices } = await supabase
    .from('invoices')
    .select('balance')
    .in('status', ['outstanding', 'partially_paid', 'overdue']);

  return {
    totalOrders: orders.length,
    totalSales: orders
      .filter((o) => o.status === 'completed')
      .reduce((s, o) => s + Number(o.total), 0),
    completedOrders: orders.filter((o) => o.status === 'completed').length,
    pendingOrders: orders.filter((o) => o.status === 'pending').length,
    outstandingAmount: (invoices || []).reduce((s, i) => s + Number(i.balance), 0),
  };
}

export async function getProductPerformance(
  startDate: string,
  endDate: string
): Promise<ProductPerformance[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, status')
    .eq('status', 'completed')
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`);

  if (error) throw new Error(getFriendlyError(error));
  if (!orders?.length) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('product_name, quantity, price, order_id')
    .in('order_id', orderIds);

  if (itemsError) throw new Error(getFriendlyError(itemsError));

  const map = new Map<string, ProductPerformance>();
  for (const item of items || []) {
    const existing = map.get(item.product_name) || {
      product_name: item.product_name,
      total_quantity: 0,
      total_sales: 0,
      order_count: 0,
    };
    existing.total_quantity += Number(item.quantity);
    existing.total_sales += Number(item.quantity) * Number(item.price);
    existing.order_count += 1;
    map.set(item.product_name, existing);
  }

  return Array.from(map.values()).sort((a, b) => b.total_sales - a.total_sales);
}

export async function getDepartmentActivity(
  startDate: string,
  endDate: string
): Promise<DepartmentActivity[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('department, total, status')
    .gte('created_at', `${startDate}T00:00:00`)
    .lte('created_at', `${endDate}T23:59:59`);

  if (error) throw new Error(getFriendlyError(error));

  const map = new Map<string, DepartmentActivity>();
  for (const order of data || []) {
    const dept = order.department;
    const existing = map.get(dept) || {
      department: dept,
      order_count: 0,
      total_sales: 0,
    };
    existing.order_count += 1;
    if (order.status === 'completed') {
      existing.total_sales += Number(order.total);
    }
    map.set(dept, existing);
  }

  return Array.from(map.values());
}

export async function getSalesChartData(days = 7) {
  const result: { date: string; sales: number; orders: number }[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);

    const { data } = await supabase
      .from('orders')
      .select('total, status')
      .gte('created_at', `${dateStr}T00:00:00`)
      .lte('created_at', `${dateStr}T23:59:59`);

    const orders = data || [];
    result.push({
      date: dateStr,
      sales: orders
        .filter((o) => o.status === 'completed')
        .reduce((s, o) => s + Number(o.total), 0),
      orders: orders.length,
    });
  }

  return result;
}

export async function fetchOrganizationSettings() {
  const { data, error } = await supabase
    .from('organization_settings')
    .select('*')
    .limit(1)
    .single();

  if (error) throw new Error(getFriendlyError(error));
  return data;
}
