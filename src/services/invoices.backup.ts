
import { supabase, getFriendlyError } from '../lib/supabase';
import type { Invoice, InvoiceItem, Payment, Debtor, PaymentMethod } from '../types/database';
import { getInvoiceStatus } from '../lib/utils';

export async function fetchInvoices(filters?: {
  status?: string;
  search?: string;
}): Promise<Invoice[]> {
  let query = supabase
    .from('invoices')
    .select(`
      *,
      items:invoice_items(*),
      order:orders(order_number)
    `)
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search) {
    query = query.or(
      `invoice_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(getFriendlyError(error));
  return (data || []) as Invoice[];
}

export async function fetchInvoiceById(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      items:invoice_items(*),
      order:orders(order_number, id)
    `)
    .eq('id', id)
    .single();

  if (error) throw new Error(getFriendlyError(error));
  return data as Invoice;
}

export async function createInvoice(input: {
  customer_name: string;
  customer_contact?: string;
  due_date: string;
  notes?: string;
  order_id?: string;
  items: { product_name: string; quantity: number; unit: string; price: number }[];
  created_by: string;
}): Promise<Invoice> {
  const subtotal = input.items.reduce((s, i) => s + i.quantity * i.price, 0);
  const total = subtotal;

  const { data: invNum, error: numErr } = await supabase.rpc('generate_invoice_number');
  const invoiceNumber = numErr
    ? `INV-${Date.now()}`
    : (invNum as string);

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: invoiceNumber,
      order_id: input.order_id || null,
      customer_name: input.customer_name,
      customer_contact: input.customer_contact || null,
      subtotal,
      total,
      amount_paid: 0,
      balance: total,
      status: 'outstanding',
      due_date: input.due_date,
      notes: input.notes || null,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) throw new Error(getFriendlyError(error));

  const invoiceItems = input.items.map((item) => ({
    invoice_id: data.id,
    product_name: item.product_name,
    quantity: item.quantity,
    unit: item.unit,
    price: item.price,
    total: item.quantity * item.price,
  }));

  await supabase.from('invoice_items').insert(invoiceItems);

  await upsertDebtor(input.customer_name, input.customer_contact, total);

  return data as Invoice;
}

async function upsertDebtor(name: string, contact: string | undefined, amount: number) {
  const { data: existing } = await supabase
    .from('debtors')
    .select('*')
    .eq('customer_name', name)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('debtors')
      .update({
        total_balance: Number(existing.total_balance) + amount,
        contact: contact || existing.contact,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('debtors').insert({
      customer_name: name,
      contact: contact || null,
      total_balance: amount,
    });
  }
}

export async function recordPayment(input: {
  invoice_id: string;
  payment_method: PaymentMethod;
  amount: number;
  reference?: string;
  payment_date: string;
  recorded_by: string;
}): Promise<void> {
  if (input.amount <= 0) {
    throw new Error('Payment amount must be greater than zero.');
  }

  const invoice = await fetchInvoiceById(input.invoice_id);

  if (!invoice) {
    throw new Error('Invoice not found.');
  }

  if (input.amount > Number(invoice.balance)) {
    throw new Error(
      'Payment cannot be greater than the outstanding balance.'
    );
  }

  const { error: paymentError } = await supabase
    .from('payments')
    .insert({
      invoice_id: input.invoice_id,
      payment_method: input.payment_method,
      amount: input.amount,
      reference: input.reference || null,
      payment_date: input.payment_date,
      recorded_by: input.recorded_by,
    });

  if (paymentError) {
    throw new Error(getFriendlyError(paymentError));
  }

  const newPaid =
    Number(invoice.amount_paid) + input.amount;

  const newBalance =
    Math.max(0, Number(invoice.total) - newPaid);

  const newStatus = getInvoiceStatus(
    Number(invoice.total),
    newPaid,
    invoice.due_date
  );

  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({
      amount_paid: newPaid,
      balance: newBalance,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.invoice_id);

  if (invoiceError) {
    throw new Error(getFriendlyError(invoiceError));
  }

  // Recalculate the customer's complete outstanding balance.
  const { data: customerInvoices, error: customerError } =
    await supabase
      .from('invoices')
      .select('balance')
      .eq('customer_name', invoice.customer_name);

  if (customerError) {
    throw new Error(getFriendlyError(customerError));
  }

  const outstandingBalance =
    (customerInvoices || []).reduce(
      (sum, item) => sum + Number(item.balance || 0),
      0
    );

  const { error: debtorError } = await supabase
    .from('debtors')
    .update({
      total_balance: Math.max(0, outstandingBalance),
      updated_at: new Date().toISOString(),
    })
    .eq('customer_name', invoice.customer_name);

  if (debtorError) {
    throw new Error(getFriendlyError(debtorError));
  }
}

export async function fetchDebtors(search?: string): Promise<Debtor[]> {
  let query = supabase.from('debtors').select('*').order('customer_name');
  if (search) query = query.ilike('customer_name', `%${search}%`);

  const { data, error } = await query;
  if (error) throw new Error(getFriendlyError(error));
  return (data || []) as Debtor[];
}

export async function fetchDebtorInvoices(customerName: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('customer_name', customerName)
    .order('created_at', { ascending: false });

  if (error) throw new Error(getFriendlyError(error));
  return (data || []) as Invoice[];
}

export async function getOutstandingTotal(): Promise<number> {
  const { data, error } = await supabase
    .from('invoices')
    .select('balance')
    .in('status', ['outstanding', 'partially_paid', 'overdue']);

  if (error) throw new Error(getFriendlyError(error));
  return (data || []).reduce((sum, i) => sum + Number(i.balance), 0);
}

export type { InvoiceItem, Payment };
