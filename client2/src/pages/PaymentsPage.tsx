import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BanknotesIcon,
  FunnelIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

import { paymentAPI, walletAPI } from '../services/api'
import { formatCurrency } from '../common/currency'
import { formatDate, startOfMonth, endOfMonth } from '../common/date'
import type { Payment } from '../types/payment'
import type { Wallet } from '../types/wallet'

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterWallet, setFilterWallet] = useState<number | ''>('')
  const [filterYear, setFilterYear] = useState(currentYear)
  const [filterMonth, setFilterMonth] = useState(currentMonth)

  useEffect(() => {
    walletAPI
      .list({ includeStopped: true })
      .then((r) => setWallets(r.wallets))
      .catch((err) => { setError(err instanceof Error ? err.message : 'Failed to load wallets') })
  }, [])

  const loadPayments = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = startOfMonth(filterYear, filterMonth)
      const to = endOfMonth(filterYear, filterMonth)
      const res = await paymentAPI.list({
        walletId: filterWallet || undefined,
        from,
        to,
      })
      setPayments(res.payments)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [filterWallet, filterYear, filterMonth])

  useEffect(() => {
    void loadPayments()
  }, [loadPayments])

  async function handleDelete(p: Payment): Promise<void> {
    if (!window.confirm(`Delete this payment of ${formatCurrency(p.amount)}?`)) return
    try {
      await paymentAPI.delete(p.id)
      await loadPayments()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete payment')
    }
  }

  const total = payments.reduce((s, p) => s + p.amount, 0)

  const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i)
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'short' }),
  }))

  return (
    <div className="page">
      <div className="page__header">
        <h1>Payments</h1>
        <p>Ledger of wallet-linked outgoing payments</p>
      </div>

      {/* Toolbar */}
      <div className="entity-toolbar entity-toolbar--wrap">
        <div className="entity-filters">
          <FunnelIcon className="filter-icon" />
          <select
            className="field__input field__input--compact"
            value={filterWallet}
            onChange={(e) =>
              setFilterWallet(e.target.value ? Number(e.target.value) : '')
            }
          >
            <option value="">All Wallets</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.icon} {w.name}
              </option>
            ))}
          </select>
          <select
            className="field__input field__input--compact"
            value={filterYear}
            onChange={(e) => setFilterYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            className="field__input field__input--compact"
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <Link to="/payments/new" state={{ returnTo: '/payments' }} className="btn btn--primary">
          <PlusIcon />
          <span>New Payment</span>
        </Link>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {/* Summary */}
      <div className="summary-bar">
        <span>
          {payments.length} payment{payments.length !== 1 ? 's' : ''}
        </span>
        <strong>{formatCurrency(total)}</strong>
      </div>

      {loading && (
        <div className="page__loading">
          <div className="loading-orb" />
        </div>
      )}

      {!loading && payments.length === 0 && (
        <div className="empty-state">
          <BanknotesIcon />
          <p>No payments found for this period</p>
          <Link to="/payments/new" state={{ returnTo: '/payments' }} className="btn btn--primary">
            <PlusIcon />
            <span>Record a payment</span>
          </Link>
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="entity-list">
          {payments.map((p) => (
            <div key={p.id} className="entity-row">
              <div className="entity-row__leading">
                {p.wallet && (
                  <div
                    className="entity-row__dot"
                    style={{ background: p.wallet.color || '#577590' }}
                  />
                )}
                <div className="entity-row__info">
                  <span className="entity-row__primary">
                    {p.wallet?.icon} {p.wallet?.name ?? 'Unknown Wallet'}
                  </span>
                  <span className="entity-row__secondary">
                    {formatDate(p.date)}
                    {p.note && ` · ${p.note}`}
                  </span>
                </div>
              </div>
              <div className="entity-row__trailing">
                <span className="entity-row__amount">{formatCurrency(p.amount)}</span>
                <Link to={`/payments/${p.id}`} className="icon-button" title="Edit">
                  <PencilIcon />
                </Link>
                <button
                  className="icon-button icon-button--danger"
                  onClick={() => handleDelete(p)}
                  title="Delete"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
