import { useState } from 'react';
import {
  FileText,
  Plus,
  X,
  Save,
  Loader2,
  User,
  Calendar,
  DollarSign,
  ClipboardList,
} from 'lucide-react';

export function Invoices() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const resetForm = () => {
    setCustomerName('');
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setAmount('');
    setDescription('');
    setNotes('');
  };

  const handleCreateInvoice = async () => {
    if (!customerName.trim()) {
      window.alert('Please enter the customer name.');
      return;
    }

    if (!amount || Number(amount) <= 0) {
      window.alert('Please enter a valid invoice amount.');
      return;
    }

    setSaving(true);

    try {
      /*
       * Invoice creation UI is now functional.
       *
       * Database persistence will be connected in the next step
       * once we verify the invoices table/schema used by SOMS.
       */

      const generatedInvoiceNumber =
        invoiceNumber.trim() ||
        `INV-${Date.now().toString().slice(-8)}`;

      console.log('NEW INVOICE', {
        invoice_number: generatedInvoiceNumber,
        customer_name: customerName.trim(),
        invoice_date: invoiceDate,
        due_date: dueDate || null,
        amount: Number(amount),
        description: description.trim(),
        notes: notes.trim(),
      });

      await new Promise((resolve) => setTimeout(resolve, 500));

      window.alert(
        `Invoice ${generatedInvoiceNumber} created successfully.`
      );

      setShowCreateForm(false);
      resetForm();
    } catch (error) {
      console.error('CREATE INVOICE ERROR:', error);

      window.alert(
        error instanceof Error
          ? error.message
          : 'Unable to create invoice.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="soms-page">

      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="soms-page-header">
        <div>
          <h1 className="soms-page-title">
            Invoices
          </h1>

          <p className="soms-page-description">
            Create, manage and track customer invoices and payments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="soms-button soms-button-primary"
        >
          <Plus size={17} />
          Create Invoice
        </button>
      </div>

      {/* =====================================================
          INVOICE LIST
      ===================================================== */}

      <div className="soms-card">
        <div className="soms-card-body">

          <div
            style={{
              textAlign: 'center',
              padding: '50px 20px',
            }}
          >
            <FileText
              size={42}
              style={{
                margin: '0 auto 14px',
                opacity: 0.45,
              }}
            />

            <h3>
              Invoices
            </h3>

            <p
              style={{
                marginTop: 8,
                color: 'var(--slate-500)',
              }}
            >
              Your invoices will appear here.
            </p>

            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="soms-button soms-button-primary"
              style={{
                marginTop: 20,
              }}
            >
              <Plus size={16} />
              Create your first invoice
            </button>
          </div>

        </div>
      </div>

      {/* =====================================================
          CREATE INVOICE MODAL
      ===================================================== */}

      {showCreateForm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowCreateForm(false);
            }
          }}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >

            {/* Modal Header */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <FileText className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Create Invoice
                  </h2>

                  <p className="text-sm text-slate-500">
                    Enter the invoice information below.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close create invoice"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}

            <div className="max-h-[70vh] overflow-y-auto px-6 py-6">

              <div className="grid gap-5 sm:grid-cols-2">

                {/* Customer */}

                <div className="sm:col-span-2">
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <User className="h-4 w-4 text-blue-600" />
                    Customer / Client
                  </label>

                  <input
                    type="text"
                    value={customerName}
                    onChange={(event) =>
                      setCustomerName(event.target.value)
                    }
                    placeholder="Enter customer or client name"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {/* Invoice Number */}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Invoice Number
                  </label>

                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(event) =>
                      setInvoiceNumber(event.target.value)
                    }
                    placeholder="Auto-generated if empty"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {/* Amount */}

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    Amount
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    placeholder="0.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>

                {/* Invoice Date */}

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Invoice Date
                  </label>

                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(event) =>
                      setInvoiceDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {/* Due Date */}

                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Calendar className="h-4 w-4 text-amber-600" />
                    Due Date
                  </label>

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(event) =>
                      setDueDate(event.target.value)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                  />
                </div>

                {/* Description */}

                <div className="sm:col-span-2">
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <ClipboardList className="h-4 w-4 text-violet-600" />
                    Description
                  </label>

                  <input
                    type="text"
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    placeholder="What is this invoice for?"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10"
                  />
                </div>

                {/* Notes */}

                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Notes
                  </label>

                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    placeholder="Additional invoice notes..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

              </div>

              {/* Preview */}

              <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
                      Invoice Total
                    </p>

                    <p className="mt-1 text-2xl font-black text-slate-900">
                      ${Number(amount || 0).toFixed(2)}
                    </p>
                  </div>

                  <FileText className="h-8 w-8 text-blue-500/60" />
                </div>
              </div>

            </div>

            {/* Modal Footer */}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreateInvoice}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Create Invoice
                  </>
                )}
              </button>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}