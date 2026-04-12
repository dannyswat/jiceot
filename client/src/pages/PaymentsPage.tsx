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
import { useI18n } from '../contexts/I18nContext'
import type { Payment } from '../types/payment'
import type { Wallet } from '../types/wallet'

function formatLinkedExpenseSummary(payment: Payment, t: (key: string, params?: Record<string, string | number>) => string): string | null {
  if (!payment.wallet || payment.wallet.is_cash || payment.wallet.is_credit) {
    return null
  }

  if (!payment.expenses || payment.expenses.length === 0) {
    return null
  }

  const visibleSummaries = payment.expenses.slice(0, 2).map((expense) => {
    const label = expense.expense_type?.name ?? t('Expense')
    const icon = expense.expense_type?.icon ? `${expense.expense_type.icon} ` : ''
    return `${icon}${label} ${formatCurrency(expense.amount)}`
  })

  if (payment.expenses.length > 2) {
    visibleSummaries.push(t('+{count} more', { count: payment.expenses.length - 2 }))
  }

  return visibleSummaries.join(' · ')
}

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

export default function PaymentsPage() {
  const { locale, t } = useI18n()
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
      .catch((err) => { setError(err instanceof Error ? err.message : t('Failed to load wallets')) })
  }, [t])

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
      setError(err instanceof Error ? err.message : t('Failed to load payments'))
    } finally {
      setLoading(false)
    }
  }, [filterMonth, filterWallet, filterYear, t])

  useEffect(() => {
    void loadPayments()
  }, [loadPayments])

  async function handleDelete(p: Payment): Promise<void> {
    if (!window.confirm(t('Delete this payment of {amount}?', { amount: formatCurrency(p.amount) }))) return
    try {
      await paymentAPI.delete(p.id)
      await loadPayments()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to delete payment'))
    }
  }

  const total = payments.reduce((s, p) => s + p.amount, 0)

  const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i)
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString(locale, { month: 'short' }),
  }))

  return (
    <div className="page">
      <div className="page__header">
        <h1>{t('Payments')}</h1>
        <p>{t('Ledger of wallet-linked outgoing payments')}</p>
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
            <option value="">{t('All Wallets')}</option>
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
          <span>{t('New Payment')}</span>
        </Link>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {/* Summary */}
      <div className="summary-bar">
        <span>{t('{count} payments', { count: payments.length })}</span>
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
          <p>{t('No payments found for this period')}</p>
          <Link to="/payments/new" state={{ returnTo: '/payments' }} className="btn btn--primary">
            <PlusIcon />
            <span>{t('Record a payment')}</span>
          </Link>
        </div>
      )}

      {!loading && payments.length > 0 && (
        <div className="entity-list">
          {payments.map((p) => {
            const secondaryParts = [formatDate(p.date)]
            const linkedExpenseSummary = formatLinkedExpenseSummary(p, t)

            if (linkedExpenseSummary) {
              secondaryParts.push(linkedExpenseSummary)
            }
            if (p.note) {
              secondaryParts.push(p.note)
            }

            return (
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
                      {p.wallet?.icon} {p.wallet?.name ?? t('Unknown Wallet')}
                    </span>
                    <span className="entity-row__secondary">{secondaryParts.join(' · ')}</span>
                  </div>
                </div>
                <div className="entity-row__trailing">
                  <span className="entity-row__amount">{formatCurrency(p.amount)}</span>
                  <div className="entity-row__buttons">
                    <Link to={`/payments/${p.id}`} className="icon-button" title={t('Edit')}>
                      <PencilIcon />
                    </Link>
                    <button
                      className="icon-button icon-button--danger"
                      onClick={() => handleDelete(p)}
                      title={t('Delete')}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
