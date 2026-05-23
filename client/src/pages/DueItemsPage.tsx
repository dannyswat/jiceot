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
import { useI18n } from '../contexts/I18nContext'
import type { DueExpense, DueWallet } from '../types/dashboard'

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

type DueItem =
  | ({ kind: 'wallet'; key: string } & DueWallet)
  | ({ kind: 'fixed' | 'flexible'; key: string } & DueExpense)

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

function statusLabel(status: string, t: (key: string) => string): string {
  switch (status) {
    case 'overdue':
      return t('Overdue')
    case 'due_soon':
      return t('Due Soon')
    case 'upcoming':
      return t('Upcoming')
    case 'suggested':
      return t('Suggested')
    default:
      return status
  }
}

function daysLabel(days: number, t: (key: string, params?: Record<string, string | number>) => string): string {
  if (days < 0) return t('{days}d overdue', { days: Math.abs(days) })
  if (days === 0) return t('Due today')
  if (days === 1) return t('Tomorrow')
  return t('In {days} days', { days })
}

function periodLabel(period: string, t: (key: string) => string): string {
  return t(RECURRING_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period)
}

function dueItemMeta(item: DueItem, t: TranslateFn): string {
  if (item.kind === 'wallet') {
    return [
      t('Credit Bills'),
      `${t('Due')} ${formatDate(item.next_due_date)}`,
      `${t('Due day')} ${item.bill_due_day}`,
      item.days_until_due === 0 ? null : daysLabel(item.days_until_due, t),
      item.last_paid_at ? `${t('Last paid')} ${formatDate(item.last_paid_at)}` : null,
    ]
      .filter((value): value is string => Boolean(value))
      .join(' · ')
  }

  return [
    item.kind === 'fixed' ? t('Recurring Expenses') : t('Suggested Tasks'),
    periodLabel(item.recurring_period, t),
    `${item.kind === 'fixed' ? t('Due') : t('Next')} ${formatDate(item.next_due_date)}`,
    item.days_until_due === 0 ? null : daysLabel(item.days_until_due, t),
  ]
    .filter((value): value is string => Boolean(value))
    .join(' · ')
}

export default function DueItemsPage() {
  const { locale, t } = useI18n()
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
      setError(err instanceof Error ? err.message : t('Failed to load due items'))
    } finally {
      setLoading(false)
    }
  }, [filterYear, filterMonth, t])

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
      setError(err instanceof Error ? err.message : t('Failed to postpone'))
    } finally {
      setPostponingId(null)
    }
  }

  const years = Array.from({ length: 6 }, (_, i) => currentYear - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString(locale, { month: 'long' }),
  }))

  const dueItems: DueItem[] = [
    ...dueWallets.map((wallet) => ({
      ...wallet,
      kind: 'wallet' as const,
      key: `wallet-${wallet.id}`,
    })),
    ...fixedExpenses.map((expense) => ({
      ...expense,
      kind: 'fixed' as const,
      key: `fixed-${expense.id}`,
    })),
    ...flexibleExpenses.map((expense) => ({
      ...expense,
      kind: 'flexible' as const,
      key: `flexible-${expense.id}`,
    })),
  ].sort((left, right) => left.next_due_date.localeCompare(right.next_due_date))

  const totalDueItems = dueItems.length

  return (
    <div className="page">
      <div className="page__header">
        <h1>{t('Due Items')}</h1>
        <p>{t('Fixed and flexible obligations lined up by urgency')}</p>
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
        <span>{t('{count} due items', { count: totalDueItems })}</span>
      </div>

      {loading && (
        <div className="page__loading"><div className="loading-orb" /></div>
      )}

      {!loading && totalDueItems === 0 && (
        <div className="empty-state">
          <ClockIcon />
          <p>{t('No due items for this period')}</p>
        </div>
      )}

      {!loading && totalDueItems > 0 && (
        <div className="due-items-list due-list">
          {dueItems.map((item) => {
            const isDueToday = item.days_until_due === 0

            return (
              <div
                key={item.key}
                className={`due-item-card${isDueToday ? ' due-item-card--today' : ''}`}
              >
                <div className="due-item__leading">
                  <div className="due-item__icon" style={{ background: item.color || '#577590' }}>
                    {item.icon || (item.kind === 'wallet' ? '💳' : '📋')}
                  </div>
                  <div className="due-item__info">
                    <div className="due-item__title">
                      <span className="due-item__name">{item.name}</span>
                      {isDueToday && (
                        <span className="badge badge--orange due-item__today-badge">{t('Due today')}</span>
                      )}
                    </div>
                    <span className="due-item__meta">{dueItemMeta(item, t)}</span>
                  </div>
                </div>

                <div className="due-item__trailing">
                  {item.kind !== 'wallet' && item.default_amount > 0 && (
                    <span className="due-item__amount">{formatCurrency(item.default_amount)}</span>
                  )}

                  <span
                    className="badge"
                    style={{
                      background: `${statusColor(item.status)}22`,
                      color: statusColor(item.status),
                    }}
                  >
                    {statusLabel(item.status, t)}
                  </span>

                  {item.kind === 'wallet' ? (
                    item.has_payment ? (
                      <span className="badge badge--green">{t('Paid')}</span>
                    ) : (
                      <Link
                        to={`/payments/new?wallet_id=${item.id}`}
                        state={{ returnTo: '/due-items' }}
                        className="btn btn--sm btn--primary"
                      >
                        {t('Pay')}
                      </Link>
                    )
                  ) : (
                    <>
                      {item.kind === 'flexible' && item.days_until_due <= 3 && (
                        <div className="due-item__postpone">
                          <button
                            className="btn btn--sm btn--ghost"
                            disabled={postponingId === item.id}
                            onClick={() => handlePostpone(item, 7)}
                            title={t('Postpone 1 week')}
                          >
                            <ForwardIcon />
                            <span>+7d</span>
                          </button>
                          <button
                            className="btn btn--sm btn--ghost"
                            disabled={postponingId === item.id}
                            onClick={() => handlePostpone(item, 30)}
                            title={t('Postpone 1 month')}
                          >
                            <ForwardIcon />
                            <span>+30d</span>
                          </button>
                        </div>
                      )}
                      <Link
                        to={`/expenses/new?expense_type_id=${item.id}`}
                        state={{ returnTo: '/due-items' }}
                        className="btn btn--sm btn--primary"
                      >
                        {t('Record')}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
