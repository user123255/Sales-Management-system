import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Calendar,
  DollarSign,
  Edit3,
  FileText,
  Loader2,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  User,
  X,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

type Invoice = {
  id: string;
  invoice_number: string;
  order_id: string | null;
  customer_name: string;
  customer_contact: string | null;
  subtotal: number;
  total: number;
  amount_paid: number;
  balance: number;
  status: string;
  due_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [editingInvoice, setEditingInvoice] =
    useState<Invoice | null>(null);

  const [errorMessage, setErrorMessage] =
    useState('');

  /*
   * ==========================================================
   * FORM STATE
   * ==========================================================
   */

  const [customerName, setCustomerName] =
    useState('');

  const [customerContact, setCustomerContact] =
    useState('');

  const [invoiceNumber, setInvoiceNumber] =
    useState('');

  const [total, setTotal] =
    useState('');

  const [amountPaid, setAmountPaid] =
    useState('0');

  const [dueDate, setDueDate] =
    useState('');

  const [notes, setNotes] =
    useState('');

  /*
   * ==========================================================
   * LOAD INVOICES
   * ==========================================================
   */

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setErrorMessage('');

    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setInvoices((data || []) as Invoice[]);
    } catch (error) {
      console.error(
        'LOAD INVOICES ERROR:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load invoices.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  /*
   * ==========================================================
   * GENERATE NEXT INVOICE NUMBER
   *
   * Format:
   *
   * INV-2026-0001
   * INV-2026-0002
   * INV-2026-0003
   * ==========================================================
   */

  const generateInvoiceNumber = async () => {
    const currentYear =
      new Date().getFullYear();

    const prefix =
      `INV-${currentYear}-`;

    const { data, error } = await supabase
      .from('invoices')
      .select('invoice_number')
      .like(
        'invoice_number',
        `${prefix}%`
      )
      .order('invoice_number', {
        ascending: false,
      })
      .limit(1);

    if (error) {
      console.error(
        'GENERATE INVOICE NUMBER ERROR:',
        error
      );

      throw error;
    }

    let nextNumber = 1;

    if (
      data &&
      data.length > 0 &&
      data[0]?.invoice_number
    ) {
      const lastInvoiceNumber =
        data[0].invoice_number;

      const numberPart =
        lastInvoiceNumber
          .replace(prefix, '');

      const parsedNumber =
        Number(numberPart);

      if (
        Number.isFinite(
          parsedNumber
        )
      ) {
        nextNumber =
          parsedNumber + 1;
      }
    }

    return (
      prefix +
      String(nextNumber).padStart(
        4,
        '0'
      )
    );
  };

  /*
   * ==========================================================
   * RESET FORM
   * ==========================================================
   */

  const resetForm = () => {
    setCustomerName('');
    setCustomerContact('');
    setInvoiceNumber('');
    setTotal('');
    setAmountPaid('0');
    setDueDate('');
    setNotes('');
    setErrorMessage('');
  };

  /*
   * ==========================================================
   * OPEN CREATE FORM
   * ==========================================================
   */

  const openCreateForm = async () => {
    setErrorMessage('');
    setEditingInvoice(null);
    resetForm();

    try {
      /*
       * Generate the invoice number
       * before opening the form.
       */

      const nextInvoiceNumber =
        await generateInvoiceNumber();

      setInvoiceNumber(
        nextInvoiceNumber
      );

      setShowCreateForm(true);
    } catch (error) {
      console.error(
        'OPEN CREATE INVOICE ERROR:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to generate invoice number.'
      );
    }
  };

  /*
   * ==========================================================
   * OPEN EDIT FORM
   * ==========================================================
   */

  const openEditForm = (
    invoice: Invoice
  ) => {
    setErrorMessage('');
    setEditingInvoice(invoice);

    setCustomerName(
      invoice.customer_name || ''
    );

    setCustomerContact(
      invoice.customer_contact || ''
    );

    setInvoiceNumber(
      invoice.invoice_number || ''
    );

    setTotal(
      String(invoice.total ?? '')
    );

    setAmountPaid(
      String(invoice.amount_paid ?? 0)
    );

    setDueDate(
      invoice.due_date || ''
    );

    setNotes(
      invoice.notes || ''
    );

    setShowCreateForm(true);
  };

  /*
   * ==========================================================
   * CLOSE FORM
   * ==========================================================
   */

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowCreateForm(false);
    setEditingInvoice(null);
    resetForm();
  };

  /*
   * ==========================================================
   * VALIDATE FORM
   * ==========================================================
   */

  const validateForm = () => {
    const trimmedCustomerName =
      customerName.trim();

    const numericTotal =
      Number(total);

    const numericAmountPaid =
      Number(amountPaid || 0);

    if (!trimmedCustomerName) {
      setErrorMessage(
        'Please enter the customer or client name.'
      );

      return false;
    }

    if (
      !total ||
      Number.isNaN(numericTotal) ||
      numericTotal <= 0
    ) {
      setErrorMessage(
        'Please enter a valid invoice total.'
      );

      return false;
    }

    if (
      Number.isNaN(
        numericAmountPaid
      ) ||
      numericAmountPaid < 0
    ) {
      setErrorMessage(
        'Please enter a valid amount paid.'
      );

      return false;
    }

    if (
      numericAmountPaid >
      numericTotal
    ) {
      setErrorMessage(
        'Amount paid cannot be greater than the invoice total.'
      );

      return false;
    }

    if (!dueDate) {
      setErrorMessage(
        'Please select an invoice due date.'
      );

      return false;
    }

    return true;
  };

  /*
   * ==========================================================
   * CREATE / UPDATE INVOICE
   * ==========================================================
   */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setErrorMessage('');

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const numericTotal =
        Number(total);

      const numericAmountPaid =
        Number(amountPaid || 0);

      const calculatedBalance =
        Math.max(
          0,
          numericTotal -
            numericAmountPaid
        );

      /*
       * Automatically calculate status.
       */

      let status = 'unpaid';

      if (
        calculatedBalance <= 0
      ) {
        status = 'paid';
      } else if (
        numericAmountPaid > 0
      ) {
        status = 'partial';
      }

      /*
       * IMPORTANT:
       *
       * When creating a new invoice,
       * generate the invoice number
       * automatically.
       *
       * When editing, keep the
       * existing invoice number.
       */

      let finalInvoiceNumber =
        invoiceNumber.trim();

      if (!editingInvoice) {
        finalInvoiceNumber =
          await generateInvoiceNumber();

        setInvoiceNumber(
          finalInvoiceNumber
        );
      }

      /*
       * Only use columns that exist
       * in your invoices table.
       */

      const invoiceData = {
        invoice_number:
          finalInvoiceNumber,

        customer_name:
          customerName.trim(),

        customer_contact:
          customerContact.trim() ||
          null,

        subtotal:
          numericTotal,

        total:
          numericTotal,

        amount_paid:
          numericAmountPaid,

        balance:
          calculatedBalance,

        status,

        due_date:
          dueDate,

        notes:
          notes.trim() || null,
      };

      /*
       * ======================================================
       * UPDATE EXISTING INVOICE
       * ======================================================
       */

      if (editingInvoice) {
        const {
          data,
          error,
        } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq(
            'id',
            editingInvoice.id
          )
          .select('*')
          .single();

        if (error) {
          console.error(
            'UPDATE INVOICE ERROR:',
            error
          );

          throw new Error(
            [
              `Message: ${
                error.message ||
                'Unknown error'
              }`,
              `Details: ${
                error.details ||
                'None'
              }`,
              `Hint: ${
                error.hint ||
                'None'
              }`,
              `Code: ${
                error.code ||
                'None'
              }`,
            ].join('\n')
          );
        }

        if (!data) {
          throw new Error(
            'Invoice was updated but no invoice data was returned.'
          );
        }

        setInvoices(
          previous =>
            previous.map(
              invoice =>
                invoice.id ===
                editingInvoice.id
                  ? (data as Invoice)
                  : invoice
            )
        );

        window.alert(
          `Invoice ${finalInvoiceNumber} updated successfully.`
        );
      }

      /*
       * ======================================================
       * CREATE NEW INVOICE
       * ======================================================
       */

      else {
        const {
          data,
          error,
        } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select('*')
          .single();

        if (error) {
          console.error(
            'CREATE INVOICE ERROR:',
            error
          );

          throw new Error(
            [
              `Message: ${
                error.message ||
                'Unknown error'
              }`,
              `Details: ${
                error.details ||
                'None'
              }`,
              `Hint: ${
                error.hint ||
                'None'
              }`,
              `Code: ${
                error.code ||
                'None'
              }`,
            ].join('\n')
          );
        }

        if (!data) {
          throw new Error(
            'Invoice was created but no invoice data was returned.'
          );
        }

        setInvoices(
          previous => [
            data as Invoice,
            ...previous,
          ]
        );

        window.alert(
          `Invoice ${finalInvoiceNumber} created successfully.`
        );
      }

      setShowCreateForm(false);
      setEditingInvoice(null);
      resetForm();
    } catch (error) {
      console.error(
        'INVOICE SUBMISSION ERROR:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : editingInvoice
          ? 'Unable to update invoice.'
          : 'Unable to create invoice.'
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ==========================================================
   * DELETE INVOICE
   * ==========================================================
   */

  const handleDeleteInvoice = async (
    invoice: Invoice
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to delete invoice ${invoice.invoice_number}?`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(invoice.id);
    setErrorMessage('');

    try {
      const {
        error,
      } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);

      if (error) {
        throw new Error(
          [
            `Message: ${
              error.message ||
              'Unable to delete invoice.'
            }`,
            `Details: ${
              error.details ||
              'None'
            }`,
            `Hint: ${
              error.hint ||
              'None'
            }`,
            `Code: ${
              error.code ||
              'None'
            }`,
          ].join('\n')
        );
      }

      setInvoices(
        previous =>
          previous.filter(
            item =>
              item.id !==
              invoice.id
          )
      );

      window.alert(
        `Invoice ${invoice.invoice_number} deleted successfully.`
      );
    } catch (error) {
      console.error(
        'DELETE INVOICE ERROR:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to delete invoice.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  /*
   * ==========================================================
   * FORMAT CURRENCY
   * ==========================================================
   */

  const formatAmount = (
    value: number
  ) => {
    return new Intl.NumberFormat(
      'en-US',
      {
        style: 'currency',
        currency: 'USD',
      }
    ).format(
      Number(value) || 0
    );
  };

  /*
   * ==========================================================
   * FORMAT DATE
   * ==========================================================
   */

  const formatDate = (
    value: string | null
  ) => {
    if (!value) {
      return '—';
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString();
  };

  /*
   * ==========================================================
   * PREVIEW VALUES
   * ==========================================================
   */

  const previewTotal =
    Number(total || 0);

  const previewPaid =
    Number(amountPaid || 0);

  const previewBalance =
    Math.max(
      0,
      previewTotal -
        previewPaid
    );

  /*
   * ==========================================================
   * PAGE
   * ==========================================================
   */

  return (
    <div className="soms-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="soms-page-header">

        <div>

          <h1 className="soms-page-title">
            Invoices
          </h1>

          <p className="soms-page-description">
          </p>

        </div>

        <div className="flex items-center gap-3">

          <button
            type="button"
            onClick={loadInvoices}
            disabled={loading}
            className="soms-button"
          >

            <RefreshCw
              size={17}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh

          </button>

          <button
            type="button"
            onClick={
              openCreateForm
            }
            className="soms-button soms-button-primary"
          >

            <Plus size={17} />

            Create Invoice

          </button>

        </div>

      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {errorMessage &&
        !showCreateForm && (

          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

            <strong>
              Invoice error:
            </strong>

            <span className="ml-1 whitespace-pre-line">
              {errorMessage}
            </span>

          </div>

        )}

      {/* =====================================================
          INVOICE TABLE
      ===================================================== */}

      <div className="soms-card">

        <div className="soms-card-body">

          {loading ? (

            <div className="flex flex-col items-center justify-center py-16">

              <Loader2
                size={36}
                className="animate-spin text-blue-600"
              />

              <p className="mt-4 text-sm text-slate-500">
                Loading invoices...
              </p>

            </div>

          ) : invoices.length === 0 ? (

            <div
              style={{
                textAlign: 'center',
                padding:
                  '50px 20px',
              }}
            >

              <FileText
                size={42}
                style={{
                  margin:
                    '0 auto 14px',
                  opacity: 0.45,
                }}
              />

              <h3>
                Invoices
              </h3>

              <p
                style={{
                  marginTop: 8,
                  color:
                    'var(--slate-500)',
                }}
              >
              </p>

              <button
                type="button"
                onClick={
                  openCreateForm
                }
                className="soms-button soms-button-primary"
                style={{
                  marginTop: 20,
                }}
              >

                <Plus size={16} />

                Create Invoice

              </button>

            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1100px]">

                <thead>

                  <tr className="border-b border-slate-200 text-left">

                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Invoice
                    </th>

                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Customer
                    </th>

                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Total
                    </th>

                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Paid
                    </th>

                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Balance
                    </th>

                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-4 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                      Due Date
                    </th>

                    <th className="px-4 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {invoices.map(
                    invoice => (

                      <tr
                        key={
                          invoice.id
                        }
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >

                        {/* INVOICE NUMBER */}

                        <td className="px-4 py-4">

                          <div className="flex items-center gap-3">

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                              <FileText
                                size={18}
                              />

                            </div>

                            <div>

                              <p className="font-bold text-slate-900">
                                {
                                  invoice.invoice_number
                                }
                              </p>

                              <p className="text-xs text-slate-400">
                                Created{' '}
                                {
                                  formatDate(
                                    invoice.created_at
                                  )
                                }
                              </p>

                            </div>

                          </div>

                        </td>

                        {/* CUSTOMER */}

                        <td className="px-4 py-4">

                          <p className="font-semibold text-slate-800">
                            {
                              invoice.customer_name
                            }
                          </p>

                          {invoice.customer_contact && (

                            <p className="text-xs text-slate-400">
                              {
                                invoice.customer_contact
                              }
                            </p>

                          )}

                        </td>

                        {/* TOTAL */}

                        <td className="px-4 py-4">

                          <span className="font-bold text-slate-900">
                            {
                              formatAmount(
                                invoice.total
                              )
                            }
                          </span>

                        </td>

                        {/* PAID */}

                        <td className="px-4 py-4">

                          <span className="font-semibold text-emerald-600">
                            {
                              formatAmount(
                                invoice.amount_paid
                              )
                            }
                          </span>

                        </td>

                        {/* BALANCE */}

                        <td className="px-4 py-4">

                          <span
                            className={
                              invoice.balance >
                              0
                                ? 'font-bold text-red-600'
                                : 'font-bold text-emerald-600'
                            }
                          >
                            {
                              formatAmount(
                                invoice.balance
                              )
                            }
                          </span>

                        </td>

                        {/* STATUS */}

                        <td className="px-4 py-4">

                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                              invoice.status ===
                              'paid'
                                ? 'bg-emerald-100 text-emerald-700'
                                : invoice.status ===
                                  'partial'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {
                              invoice.status
                            }
                          </span>

                        </td>

                        {/* DUE DATE */}

                        <td className="px-4 py-4 text-sm text-slate-600">

                          {
                            formatDate(
                              invoice.due_date
                            )
                          }

                        </td>

                        {/* ACTIONS */}

                        <td className="px-4 py-4">

                          <div className="flex items-center justify-end gap-2">

                            {/* EDIT */}

                            <button
                              type="button"
                              onClick={() =>
                                openEditForm(
                                  invoice
                                )
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-100"
                            >

                              <Edit3
                                size={15}
                              />

                              Edit

                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteInvoice(
                                  invoice
                                )
                              }
                              disabled={
                                deletingId ===
                                invoice.id
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >

                              {deletingId ===
                              invoice.id ? (

                                <Loader2
                                  size={15}
                                  className="animate-spin"
                                />

                              ) : (

                                <Trash2
                                  size={15}
                                />

                              )}

                              Delete

                            </button>

                          </div>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>

      </div>

      {/* =====================================================
          CREATE / EDIT MODAL
      ===================================================== */}

      {showCreateForm && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={event => {

            if (
              event.target ===
                event.currentTarget &&
              !saving
            ) {
              closeForm();
            }

          }}
        >

          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={event =>
              event.stopPropagation()
            }
          >

            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">

                  <FileText
                    className="h-5 w-5"
                  />

                </div>

                <div>

                  <h2 className="text-lg font-bold text-slate-900">

                    {editingInvoice
                      ? 'Edit Invoice'
                      : 'Create Invoice'}

                  </h2>

                  <p className="text-sm text-slate-500">

                    {editingInvoice
                      ? 'Update the invoice information below.'
                      : 'Enter the invoice information below.'}

                  </p>

                </div>

              </div>

              <button
                type="button"
                onClick={
                  closeForm
                }
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >

                <X className="h-5 w-5" />

              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={
                handleSubmit
              }
            >

              <div className="max-h-[70vh] overflow-y-auto px-6 py-6">

                {errorMessage && (

                  <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">

                    <strong>
                      Unable to{' '}
                      {editingInvoice
                        ? 'update'
                        : 'create'}{' '}
                      invoice:
                    </strong>

                    <div className="mt-1 whitespace-pre-line">
                      {
                        errorMessage
                      }
                    </div>

                  </div>

                )}

                <div className="grid gap-5 sm:grid-cols-2">

                  {/* CUSTOMER */}

                  <div className="sm:col-span-2">

                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">

                      <User className="h-4 w-4 text-blue-600" />

                      Customer / Client

                    </label>

                    <input
                      type="text"
                      value={
                        customerName
                      }
                      onChange={event =>
                        setCustomerName(
                          event.target.value
                        )
                      }
                      placeholder="Enter customer or client name"
                      required
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />

                  </div>

                  {/* CONTACT */}

                  <div className="sm:col-span-2">

                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">

                      <Phone className="h-4 w-4 text-blue-600" />

                      Customer Contact

                    </label>

                    <input
                      type="text"
                      value={
                        customerContact
                      }
                      onChange={event =>
                        setCustomerContact(
                          event.target.value
                        )
                      }
                      placeholder="Phone number or email"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />

                  </div>

                  {/* INVOICE NUMBER */}

                  <div>

                    <label className="mb-2 block text-sm font-semibold text-slate-700">

                      Invoice Number

                    </label>

                    <div className="relative">

                      <input
                        type="text"
                        value={
                          invoiceNumber
                        }
                        readOnly
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-20 text-sm font-bold text-slate-700 outline-none"
                      />

                      <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-blue-100 px-2 py-1 text-[10px] font-bold uppercase text-blue-600">
                        Auto
                      </span>

                    </div>

                    <p className="mt-1 text-xs text-slate-400">
                      Automatically generated by SOMS.
                    </p>

                  </div>

                  {/* TOTAL */}

                  <div>

                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">

                      <DollarSign className="h-4 w-4 text-emerald-600" />

                      Invoice Total

                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        total
                      }
                      onChange={event =>
                        setTotal(
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      required
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    />

                  </div>

                  {/* AMOUNT PAID */}

                  <div>

                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">

                      <DollarSign className="h-4 w-4 text-emerald-600" />

                      Amount Paid

                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        amountPaid
                      }
                      onChange={event =>
                        setAmountPaid(
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    />

                  </div>

                  {/* DUE DATE */}

                  <div>

                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">

                      <Calendar className="h-4 w-4 text-amber-600" />

                      Due Date

                    </label>

                    <input
                      type="date"
                      value={
                        dueDate
                      }
                      onChange={event =>
                        setDueDate(
                          event.target.value
                        )
                      }
                      required
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                    />

                  </div>

                  {/* NOTES */}

                  <div className="sm:col-span-2">

                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Notes
                    </label>

                    <textarea
                      rows={3}
                      value={
                        notes
                      }
                      onChange={event =>
                        setNotes(
                          event.target.value
                        )
                      }
                      placeholder="Additional invoice notes..."
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />

                  </div>

                </div>

                {/* PREVIEW */}

                <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">

                  <div className="grid gap-4 sm:grid-cols-3">

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                        Total
                      </p>

                      <p className="mt-1 text-xl font-black text-slate-900">
                        $
                        {Number(
                          total || 0
                        ).toFixed(2)}
                      </p>

                    </div>

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                        Paid
                      </p>

                      <p className="mt-1 text-xl font-black text-slate-900">
                        $
                        {Number(
                          amountPaid ||
                            0
                        ).toFixed(2)}
                      </p>

                    </div>

                    <div>

                      <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
                        Balance
                      </p>

                      <p className="mt-1 text-xl font-black text-slate-900">
                        ${previewBalance.toFixed(2)}
                      </p>

                    </div>

                  </div>

                </div>

              </div>

              {/* FOOTER */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={
                    closeForm
                  }
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    !invoiceNumber
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {saving ? (

                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin"
                      />

                      {editingInvoice
                        ? 'Saving Changes...'
                        : 'Creating...'}

                    </>

                  ) : (

                    <>
                      <Save className="h-4 w-4" />

                      {editingInvoice
                        ? 'Save Changes'
                        : 'Create Invoice'}

                    </>

                  )}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}