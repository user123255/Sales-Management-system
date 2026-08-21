import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  DollarSign,
  FileText,
  RefreshCw,
  Search,
  UserRound,
  Wallet,
} from 'lucide-react';

import {
  fetchDebtors,
  fetchDebtorInvoices,
} from '../services/invoices';

import type { Debtor, Invoice } from '../types/database';

export function DebtorAccounts() {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [error, setError] = useState('');

  async function loadDebtors() {
    try {
      setLoading(true);
      setError('');

      const data = await fetchDebtors(search);

      setDebtors(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load debtor accounts.'
      );
    } finally {
      setLoading(false);
    }
  }

  async function openDebtor(debtor: Debtor) {
    try {
      setSelectedDebtor(debtor);
      setLoadingInvoices(true);
      setError('');

      const data = await fetchDebtorInvoices(debtor.customer_name);

      setInvoices(data);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load customer invoices.'
      );
    } finally {
      setLoadingInvoices(false);
    }
  }

  useEffect(() => {
    loadDebtors();
  }, []);

  const filteredDebtors = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return debtors;
    }

    return debtors.filter((debtor) =>
      debtor.customer_name.toLowerCase().includes(value)
    );
  }, [debtors, search]);

  const outstandingBalance = useMemo(
    () =>
      debtors.reduce(
        (total, debtor) => total + Number(debtor.total_balance || 0),
        0
      ),
    [debtors]
  );

  const accountsWithBalance = useMemo(
    () =>
      debtors.filter(
        (debtor) => Number(debtor.total_balance || 0) > 0
      ).length,
    [debtors]
  );

  const averageBalance =
    debtors.length > 0
      ? outstandingBalance / debtors.length
      : 0;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'paid':
        return 'soms-badge soms-badge-success';

      case 'overdue':
        return 'soms-badge soms-badge-danger';

      case 'partially_paid':
        return 'soms-badge soms-badge-warning';

      default:
        return 'soms-badge soms-badge-info';
    }
  };

  return (
    <div className="soms-page">
      <div className="soms-page-header">
        <div>
          <h1 className="soms-page-title">Debtor Accounts</h1>

          <p className="soms-page-description">
            Monitor outstanding balances, invoices, and customer payments.
          </p>
        </div>

        <button
          type="button"
          className="soms-button soms-button-secondary"
          onClick={loadDebtors}
          disabled={loading}
        >
          <RefreshCw
            size={16}
            className={loading ? 'soms-spin-icon' : ''}
          />

          Refresh
        </button>
      </div>

      {error && (
        <div
          className="soms-card"
          style={{
            marginBottom: 20,
            borderColor: '#fecaca',
            background: '#fef2f2',
          }}
        >
          <div
            className="soms-card-body"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <AlertCircle
              size={20}
              style={{
                color: '#dc2626',
                flexShrink: 0,
              }}
            />

            <div>
              <strong
                style={{
                  color: '#991b1b',
                  display: 'block',
                  marginBottom: 4,
                }}
              >
                Unable to load debtor accounts
              </strong>

              <p
                style={{
                  color: '#b91c1c',
                  fontSize: 13,
                }}
              >
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="soms-stat-grid">
        <div className="soms-stat-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <div className="soms-stat-label">
                OUTSTANDING BALANCE
              </div>

              <div className="soms-stat-value">
                {formatCurrency(outstandingBalance)}
              </div>
            </div>

            <Wallet size={22} />
          </div>
        </div>

        <div className="soms-stat-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <div className="soms-stat-label">
                DEBTOR ACCOUNTS
              </div>

              <div className="soms-stat-value">
                {debtors.length}
              </div>
            </div>

            <UserRound size={22} />
          </div>
        </div>

        <div className="soms-stat-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <div className="soms-stat-label">
                ACCOUNTS WITH BALANCE
              </div>

              <div className="soms-stat-value">
                {accountsWithBalance}
              </div>
            </div>

            <CreditCard size={22} />
          </div>
        </div>

        <div className="soms-stat-card">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <div>
              <div className="soms-stat-label">
                AVERAGE BALANCE
              </div>

              <div className="soms-stat-value">
                {formatCurrency(averageBalance)}
              </div>
            </div>

            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {!selectedDebtor ? (
        <div className="soms-card">
          <div className="soms-card-header">
            <div>
              <h3>Customer Accounts</h3>

              <p
                style={{
                  marginTop: 5,
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                Select an account to view its invoices.
              </p>
            </div>

            <div
              style={{
                position: 'relative',
                width: 300,
                maxWidth: '100%',
              }}
            >
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />

              <input
                className="soms-input"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customers..."
                style={{
                  paddingLeft: 38,
                }}
              />
            </div>
          </div>

          <div className="soms-card-body">
            {loading ? (
              <div className="soms-loading">
                <div className="soms-spinner" />
              </div>
            ) : filteredDebtors.length === 0 ? (
              <div
                style={{
                  minHeight: 260,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                }}
              >
                <UserRound
                  size={42}
                  style={{
                    color: '#94a3b8',
                    marginBottom: 12,
                  }}
                />

                <h3>No debtor accounts found.</h3>

                <p
                  style={{
                    marginTop: 6,
                    color: '#64748b',
                    fontSize: 13,
                  }}
                >
                  Try another customer name.
                </p>
              </div>
            ) : (
              <div className="soms-table-wrapper">
                <table className="soms-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Balance</th>
                      <th>Last Updated</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredDebtors.map((debtor) => (
                      <tr key={debtor.id}>
                        <td>
                          <strong
                            style={{
                              color: '#0f172a',
                            }}
                          >
                            {debtor.customer_name}
                          </strong>
                        </td>

                        <td>
                          {debtor.contact || '—'}
                        </td>

                        <td>
                          <strong
                            style={{
                              color:
                                Number(debtor.total_balance) > 0
                                  ? '#dc2626'
                                  : '#059669',
                            }}
                          >
                            {formatCurrency(
                              Number(debtor.total_balance || 0)
                            )}
                          </strong>
                        </td>

                        <td>
                          {debtor.updated_at
                            ? new Date(
                                debtor.updated_at
                              ).toLocaleDateString()
                            : '—'}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="soms-button soms-button-secondary"
                            onClick={() => openDebtor(debtor)}
                          >
                            View Account
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="soms-card">
          <div className="soms-card-header">
            <button
              type="button"
              className="soms-button soms-button-secondary"
              onClick={() => {
                setSelectedDebtor(null);
                setInvoices([]);
              }}
            >
              <ArrowLeft size={16} />
              Back to Accounts
            </button>

            <div
              style={{
                textAlign: 'right',
              }}
            >
              <h3>{selectedDebtor.customer_name}</h3>

              <p
                style={{
                  marginTop: 4,
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                {selectedDebtor.contact || 'No contact information'}
              </p>
            </div>
          </div>

          <div className="soms-card-body">
            <div
              style={{
                marginBottom: 22,
                padding: 20,
                borderRadius: 14,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <div className="soms-stat-label">
                CURRENT BALANCE
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 30,
                  fontWeight: 800,
                  color:
                    Number(selectedDebtor.total_balance) > 0
                      ? '#dc2626'
                      : '#059669',
                }}
              >
                {formatCurrency(
                  Number(selectedDebtor.total_balance || 0)
                )}
              </div>
            </div>

            <h3
              style={{
                marginBottom: 14,
              }}
            >
              Invoice History
            </h3>

            {loadingInvoices ? (
              <div className="soms-loading">
                <div className="soms-spinner" />
              </div>
            ) : invoices.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                <FileText
                  size={38}
                  style={{
                    margin: '0 auto 10px',
                  }}
                />

                <p>No invoices found for this customer.</p>
              </div>
            ) : (
              <div className="soms-table-wrapper">
                <table className="soms-table">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>
                          <strong>
                            {invoice.invoice_number}
                          </strong>
                        </td>

                        <td>
                          {invoice.created_at
                            ? new Date(
                                invoice.created_at
                              ).toLocaleDateString()
                            : '—'}
                        </td>

                        <td>
                          {formatCurrency(
                            Number(invoice.total || 0)
                          )}
                        </td>

                        <td>
                          {formatCurrency(
                            Number(invoice.amount_paid || 0)
                          )}
                        </td>

                        <td>
                          <strong>
                            {formatCurrency(
                              Number(invoice.balance || 0)
                            )}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={getStatusClass(
                              invoice.status
                            )}
                          >
                            {invoice.status.replace(
                              '_',
                              ' '
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DebtorAccounts;
