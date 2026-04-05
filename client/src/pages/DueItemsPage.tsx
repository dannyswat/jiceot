import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDaysIcon,
  ClockIcon,
  ForwardIcon,
} from '@heroicons/react/24/outline'

import { dashboardAPI, expenseTypeAPI } from '../services/api'
import { formatCurrency } from '../common/currency'
import { formatDate } from '../common/date'
import { RECURRING_PERIOD_OPTIONS } from '../common/constants'
import type { DueExpense, DueWallet } from '../types/dashboard'

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

function statusColor(status: string): string {
  switch (status) {
    case 'overdue':
      return '#d94f3d'
    case 'due_soon':
      return '#f48c06'
    case 'upcoming':
      return '#2a9d8f'
    case 'suggested':
      return '#577590'
    default:
      return '#577590'
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'overdue':
      return 'Overdue'
    case 'due_soon':
      return 'Due Soon'
    case 'upcoming':
      return 'Upcoming'
    case 'suggested':
      return 'Suggested'
    default:
      return status
  }
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)}d overdue`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}

function periodLabel(period: string): string {
  return RECURRING_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period
}

export default function DueItemsPage() {
  const [dueWallets, setDueWallets] = useState<DueWallet[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<DueExpense[]>([])
  const [flexibleExpenses, setFlexibleExpenses] = useState<DueExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [postponingId, setPostponingId] = useState<number | null>(null)

  const [filterYear, setFilterYear] = useState(currentYear)
  const [filterMonth, setFilterMonth] = useState(currentMonth)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [wallets, expenses] = await Promise.all([
        dashboardAPI.dueWallets(filterYear, filterMonth),
        dashboardAPI.dueExpenses(filterYear, filterMonth),
      ])
      setDueWallets(wallets.due_wallets ?? [])
      setFixedExpenses(expenses.fixed_due ?? [])
      setFlexibleExpenses(expenses.flexible_suggested ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load due items')
    } finally {
      setLoading(false)
    }
  }, [filterYear, filterMonth])

  useEffect(() => {
    void loadData()
  }, [loadData])

  async function handlePostpone(item: DueExpense, daysToAdd: number): Promise<void> {
    if (!item.next_due_date) return
    setPostponingId(item.id)
    try {
      const today = new Date()
      today.setDate(today.getDate() + daysToAdd)
      const newDate = [
        String(today.getFullYear()),
        String(today.getMonth() + 1).padStart(2, '0'),
        String(today.getDate()).padStart(2, '0'),
      ].join('-')
      await expenseTypeAPI.postpone(item.id, { next_due_day: newDate })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to postpone')
    } finally {
      setPostponingId(null)
    }
  }

  const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  }))

  const totalDueItems = dueWallets.length + fixedExpenses.length + flexibleExpenses.length

  return (
    <div className="page">
      <div className="page__header">
        <h1>Due Items</h1>
        <p>Fixed and flexible obligations lined up by urgency</p>
      </div>

      {/* Period filter */}
      <div className="entity-toolbar">
        <div className="entity-filters">
          <CalendarDaysIcon className="filter-icon" />
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
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="summary-bar">
        <span>{totalDueItems} due item{totalDueItems !== 1 ? 's' : ''}</span>
      </div>

      {loading && (
        <div className="page__loading"><div className="loading-orb" /></div>
      )}

      {!loading && totalDueItems === 0 && (
        <div className="empty-state">
          <ClockIcon />
          <p>No due items for this period</p>
        </div>
      )}

      {!loading && totalDueItems > 0 && (
        <div className="due-sections">
          {/* Due Wallet Bills */}
          {dueWallets.length > 0 && (
            <section className="due-section">
              <h2 className="due-section__title">
                <span className="due-section__dot" style={{ background: '#f48c06' }} />
                Credit Bills
                <span className="due-section__count">{dueWallets.length}</span>
              </h2>
              <div className="due-items-list">
                {dueWallets.map((w) => (
                  <div key={w.id} className="due-item-card">
                    <div className="due-item__leading">
                      <div className="due-item__icon" style={{ background: w.color || '#577590' }}>
                        {w.icon || '💳'}
                      </div>
                      <div className="due-item__info">
                        <span className="due-item__name">{w.name}</span>
                        <span className="due-item__meta">
                          Due day {w.bill_due_day} · {daysLabel(w.days_until_due)}
                          {w.last_paid_at && ` · Last paid ${formatDate(w.last_paid_at)}`}
                        </span>
                      </div>
                    </div>
                    <div className="due-item__trailing">
                      <span
                        className="badge"
                        style={{
                          background: `${statusColor(w.status)}22`,
                          color: statusColor(w.status),
                        }}
                      >
                        {statusLabel(w.status)}
                      </span>
                      {w.has_payment ? (
                        <span className="badge badge--green">Paid</span>
                      ) : (
                        <Link
                          to={`/payments/new?wallet_id=${w.id}`}
                          state={{ returnTo: '/due-items' }}
                          className="btn btn--sm btn--primary"
                        >
                          Pay
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Fixed Day Expenses */}
          {fixedExpenses.length > 0 && (
            <section className="due-section">
              <h2 className="due-section__title">
                <span className="due-section__dot" style={{ background: '#d94f3d' }} />
                Recurring Expenses
                <span className="due-section__count">{fixedExpenses.length}</span>
              </h2>
              <div className="due-items-list">
                {fixedExpenses.map((e) => (
                  <div key={e.id} className="due-item-card">
                    <div className="due-item__leading">
                      <div className="due-item__icon" style={{ background: e.color || '#577590' }}>
                        {e.icon || '📋'}
                      </div>
                      <div className="due-item__info">
                        <span className="due-item__name">{e.name}</span>
                        <span className="due-item__meta">
                          {periodLabel(e.recurring_period)} · {daysLabel(e.days_until_due)}
                          {e.next_due_date && ` · Due ${formatDate(e.next_due_date)}`}
                        </span>
                      </div>
                    </div>
                    <div className="due-item__trailing">
                      {e.default_amount > 0 && (
                        <span className="due-item__amount">{formatCurrency(e.default_amount)}</span>
                      )}
                      <span
                        className="badge"
                        style={{
                          background: `${statusColor(e.status)}22`,
                          color: statusColor(e.status),
                        }}
                      >
                        {statusLabel(e.status)}
                      </span>
                      <Link to={`/expenses/new?expense_type_id=${e.id}`} className="btn btn--sm btn--primary">
                        Record
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Flexible / Suggested Expenses */}
          {flexibleExpenses.length > 0 && (
            <section className="due-section">
              <h2 className="due-section__title">
                <span className="due-section__dot" style={{ background: '#577590' }} />
                Suggested Tasks
                <span className="due-section__count">{flexibleExpenses.length}</span>
              </h2>
              <div className="due-items-list">
                {flexibleExpenses.map((e) => (
                  <div key={e.id} className="due-item-card">
                    <div className="due-item__leading">
                      <div className="due-item__icon" style={{ background: e.color || '#577590' }}>
                        {e.icon || '📋'}
                      </div>
                      <div className="due-item__info">
                        <span className="due-item__name">{e.name}</span>
                        <span className="due-item__meta">
                          {periodLabel(e.recurring_period)} · {daysLabel(e.days_until_due)}
                          {e.next_due_date && ` · Next ${formatDate(e.next_due_date)}`}
                        </span>
                      </div>
                    </div>
                    <div className="due-item__trailing">
                      {e.default_amount > 0 && (
                        <span className="due-item__amount">{formatCurrency(e.default_amount)}</span>
                      )}
                      <span
                        className="badge"
                        style={{
                          background: `${statusColor(e.status)}22`,
                          color: statusColor(e.status),
                        }}
                      >
                        {statusLabel(e.status)}
                      </span>
                      {e.days_until_due <= 3 && (
                      <div className="due-item__postpone">
                        <button
                          className="btn btn--sm btn--ghost"
                          disabled={postponingId === e.id}
                          onClick={() => handlePostpone(e, 7)}
                          title="Postpone 1 week"
                        >
                          <ForwardIcon />
                          <span>+7d</span>
                        </button>
                        <button
                          className="btn btn--sm btn--ghost"
                          disabled={postponingId === e.id}
                          onClick={() => handlePostpone(e, 30)}
                          title="Postpone 1 month"
                        >
                          <ForwardIcon />
                          <span>+30d</span>
                        </button>
                      </div>
                      )}
                      <Link to={`/expenses/new?expense_type_id=${e.id}`} className="btn btn--sm btn--primary">
                        Record
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
