import { supabase, getFriendlyError } from '../lib/supabase';
import type {
  Invoice,
  InvoiceItem,
  Payment,
  Debtor,
  PaymentMethod,
} from '../types/database';
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

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  if (filters?.search?.trim()) {
    const search = filters.search.trim();

    query = query.or(
      `invoice_number.ilike.%${search}%,customer_name.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  return (data || []) as Invoice[];
}

export async function fetchInvoiceById(
  id: string
): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      items:invoice_items(*),
      order:orders(order_number, id)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  return data as Invoice | null;
}

export async function createInvoice(input: {
  customer_name: string;
  customer_contact?: string;
  due_date: string;
  notes?: string;
  order_id?: string;
  items: {
    product_name: string;
    quantity: number;
    unit: string;
    price: number;
  }[];
  created_by: string;
}): Promise<Invoice> {
  if (!input.customer_name.trim()) {
    throw new Error('Customer or department name is required.');
  }

  if (!input.items.length) {
    throw new Error('An invoice must contain at least one item.');
  }

  for (const item of input.items) {
    if (!item.product_name.trim()) {
      throw new Error('Every invoice item must have a product name.');
    }

    if (item.quantity <= 0) {
      throw new Error(
        `Quantity for ${item.product_name} must be greater than zero.`
      );
    }

    if (item.price < 0) {
      throw new Error(
        `Price for ${item.product_name} cannot be negative.`
      );
    }
  }

  const subtotal = input.items.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );

  const total = subtotal;

  /*
   * Invoice numbers are financial identifiers.
   * Do not silently create a local fallback if the database
   * generator fails.
   */
  const {
    data: invoiceNumber,
    error: numberError,
  } = await supabase.rpc('generate_invoice_number');

  if (numberError || !invoiceNumber) {
    throw new Error(
      numberError
        ? getFriendlyError(numberError)
        : 'Unable to generate a unique invoice number.'
    );
  }

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      invoice_number: String(invoiceNumber),
      order_id: input.order_id || null,
      customer_name: input.customer_name.trim(),
      customer_contact: input.customer_contact?.trim() || null,
      subtotal,
      total,
      amount_paid: 0,
      balance: total,
      status: 'outstanding',
      due_date: input.due_date,
      notes: input.notes?.trim() || null,
      created_by: input.created_by,
    })
    .select()
    .single();

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  const invoiceItems = input.items.map((item) => ({
    invoice_id: data.id,
    product_name: item.product_name.trim(),
    quantity: item.quantity,
    unit: item.unit,
    price: item.price,
    total: item.quantity * item.price,
  }));

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(invoiceItems);

  if (itemsError) {
    /*
     * Do not leave a header-only invoice behind if its
     * line items could not be saved.
     */
    await supabase
      .from('invoices')
      .delete()
      .eq('id', data.id);

    throw new Error(getFriendlyError(itemsError));
  }

  await upsertDebtor(
    input.customer_name.trim(),
    input.customer_contact,
    total
  );

  const createdInvoice = await fetchInvoiceById(data.id);

  if (!createdInvoice) {
    throw new Error(
      'Invoice was created but could not be loaded afterwards.'
    );
  }

  return createdInvoice;
}

async function upsertDebtor(
  name: string,
  contact: string | undefined,
  amount: number
) {
  const { data: existing, error: lookupError } = await supabase
    .from('debtors')
    .select('*')
    .eq('customer_name', name)
    .maybeSingle();

  if (lookupError) {
    throw new Error(getFriendlyError(lookupError));
  }

  if (existing) {
    const { error } = await supabase
      .from('debtors')
      .update({
        total_balance:
          Number(existing.total_balance || 0) + amount,
        contact: contact || existing.contact,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (error) {
      throw new Error(getFriendlyError(error));
    }
  } else {
    const { error } = await supabase
      .from('debtors')
      .insert({
        customer_name: name,
        contact: contact || null,
        total_balance: amount,
      });

    if (error) {
      throw new Error(getFriendlyError(error));
    }
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

  const currentBalance = Number(invoice.balance || 0);

  if (input.amount > currentBalance) {
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
      reference: input.reference?.trim() || null,
      payment_date: input.payment_date,
      recorded_by: input.recorded_by,
    });

  if (paymentError) {
    throw new Error(getFriendlyError(paymentError));
  }

  const newPaid =
    Number(invoice.amount_paid || 0) + input.amount;

  const newBalance = Math.max(
    0,
    Number(invoice.total || 0) - newPaid
  );

  const newStatus = getInvoiceStatus(
    Number(invoice.total || 0),
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

  await recalculateDebtorBalance(invoice.customer_name);
}

async function recalculateDebtorBalance(customerName: string) {
  const { data: customerInvoices, error: customerError } =
    await supabase
      .from('invoices')
      .select('balance')
      .eq('customer_name', customerName);

  if (customerError) {
    throw new Error(getFriendlyError(customerError));
  }

  const outstandingBalance =
    (customerInvoices || []).reduce(
      (sum, invoice) =>
        sum + Number(invoice.balance || 0),
      0
    );

  const { error: debtorError } = await supabase
    .from('debtors')
    .update({
      total_balance: Math.max(0, outstandingBalance),
      updated_at: new Date().toISOString(),
    })
    .eq('customer_name', customerName);

  if (debtorError) {
    throw new Error(getFriendlyError(debtorError));
  }
}

export async function fetchDebtors(
  search?: string
): Promise<Debtor[]> {
  let query = supabase
    .from('debtors')
    .select('*')
    .order('customer_name');

  if (search?.trim()) {
    query = query.ilike(
      'customer_name',
      `%${search.trim()}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  return (data || []) as Debtor[];
}

export async function fetchDebtorInvoices(
  customerName: string
): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      items:invoice_items(*)
    `)
    .eq('customer_name', customerName)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  return (data || []) as Invoice[];
}

export async function getOutstandingTotal(): Promise<number> {
  const { data, error } = await supabase
    .from('invoices')
    .select('balance')
    .in('status', [
      'outstanding',
      'partially_paid',
      'overdue',
    ]);

  if (error) {
    throw new Error(getFriendlyError(error));
  }

  return (data || []).reduce(
    (sum, invoice) =>
      sum + Number(invoice.balance || 0),
    0
  );
}

export type { InvoiceItem, Payment };