import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BanknotesIcon,
  FunnelIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

import { expenseAPI, expenseTypeAPI, walletAPI } from '../services/api'
import { formatCurrency } from '../common/currency'
import { formatDate, startOfMonth, endOfMonth } from '../common/date'
import { useI18n } from '../contexts/I18nContext'
import type { Expense, ExpenseType } from '../types/expense'
import type { Wallet } from '../types/wallet'

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

export default function ExpensesPage() {
  const { locale, t } = useI18n()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filterType, setFilterType] = useState<number | ''>('')
  const [filterWallet, setFilterWallet] = useState<number | ''>('')
  const [filterYear, setFilterYear] = useState(currentYear)
  const [filterMonth, setFilterMonth] = useState(currentMonth)
  const [unbilledOnly, setUnbilledOnly] = useState(false)

  useEffect(() => {
    expenseTypeAPI
      .list({ includeStopped: true })
      .then((r) => setExpenseTypes(r.expense_types))
      .catch(() => undefined)
    walletAPI
      .list({ includeStopped: true })
      .then((r) => setWallets(r.wallets))
      .catch(() => undefined)
  }, [])

  const loadExpenses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const from = startOfMonth(filterYear, filterMonth)
      const to = endOfMonth(filterYear, filterMonth)
      const res = await expenseAPI.list({
        expenseTypeId: filterType || undefined,
        walletId: filterWallet || undefined,
        from,
        to,
        unbilledOnly: unbilledOnly || undefined,
      })
      setExpenses(res.expenses)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to load expenses'))
    } finally {
      setLoading(false)
    }
  }, [filterMonth, filterType, filterWallet, filterYear, t, unbilledOnly])

  useEffect(() => {
    void loadExpenses()
  }, [loadExpenses])

  async function handleDelete(exp: Expense): Promise<void> {
    if (!window.confirm(t('Delete this expense of {amount}?', { amount: formatCurrency(exp.amount) }))) return
    try {
      await expenseAPI.delete(exp.id)
      await loadExpenses()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to delete expense'))
    }
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0)

  const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i)
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString(locale, { month: 'short' }),
  }))

  return (
    <div className="page">
      <div className="page__header">
        <h1>{t('Expenses')}</h1>
        <p>{t('Day-by-day spend records linked to wallets and payments')}</p>
      </div>

      {/* Toolbar */}
      <div className="entity-toolbar entity-toolbar--wrap">
        <div className="entity-filters entity-filters--wrap">
          <FunnelIcon className="filter-icon" />
          <select
            className="field__input field__input--compact"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">{t('All Types')}</option>
            {expenseTypes.map((et) => (
              <option key={et.id} value={et.id}>
                {et.icon} {et.name}
              </option>
            ))}
          </select>
          <select
            className="field__input field__input--compact"
            value={filterWallet}
            onChange={(e) => setFilterWallet(e.target.value ? Number(e.target.value) : '')}
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
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            className="field__input field__input--compact"
            value={filterMonth}
            onChange={(e) => setFilterMonth(Number(e.target.value))}
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={unbilledOnly}
              onChange={(e) => setUnbilledOnly(e.target.checked)}
            />
            <span>{t('Unbilled only')}</span>
          </label>
        </div>
        <Link to="/expenses/new" className="btn btn--primary">
          <PlusIcon />
          <span>{t('New Expense')}</span>
        </Link>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {/* Summary */}
      <div className="summary-bar">
        <span>{t('{count} expenses', { count: expenses.length })}</span>
        <strong>{formatCurrency(total)}</strong>
      </div>

      {loading && (
        <div className="page__loading"><div className="loading-orb" /></div>
      )}

      {!loading && expenses.length === 0 && (
        <div className="empty-state">
          <BanknotesIcon />
          <p>{t('No expenses found for this period')}</p>
          <Link to="/expenses/new" className="btn btn--primary">
            <PlusIcon />
            <span>{t('Record an expense')}</span>
          </Link>
        </div>
      )}

      {!loading && expenses.length > 0 && (
        <div className="entity-list">
          {expenses.map((exp) => (
            <div key={exp.id} className="entity-row">
              <div className="entity-row__leading">
                <div
                  className="entity-row__dot"
                  style={{ background: exp.expense_type?.color || '#577590' }}
                />
                <div className="entity-row__info">
                  <span className="entity-row__primary">
                    {exp.expense_type?.icon} {exp.expense_type?.name ?? t('Unknown Type')}
                  </span>
                  <span className="entity-row__secondary">
                    {formatDate(exp.date)}
                    {exp.wallet && ` · ${exp.wallet.icon} ${exp.wallet.name}`}
                    {exp.note && ` · ${exp.note}`}
                    {!exp.payment_id && exp.wallet?.is_credit && (
                      <span className="badge badge--orange" style={{ marginLeft: 6 }}>
                        {t('Unbilled')}
                      </span>
                    )}
                  </span>
                </div>
              </div>
              <div className="entity-row__trailing">
                <span className="entity-row__amount">{formatCurrency(exp.amount)}</span>
                <div className="entity-row__buttons">
                  <Link to={`/expenses/${exp.id}`} className="icon-button" title={t('Edit')}>
                    <PencilIcon />
                  </Link>
                  <button
                    className="icon-button icon-button--danger"
                    onClick={() => handleDelete(exp)}
                    title={t('Delete')}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
