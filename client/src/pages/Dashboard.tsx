import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  RectangleGroupIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'

import { dashboardAPI } from '../services/api'
import { formatCurrency } from '../common/currency'
import { RECURRING_PERIOD_OPTIONS } from '../common/constants'
import { useI18n } from '../contexts/I18nContext'
import type { DashboardStats, DueExpense, DueWallet } from '../types/dashboard'

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

export default function Dashboard() {
  const { t } = useI18n()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const data = await dashboardAPI.stats()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to load dashboard'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  if (loading) {
    return (
      <div className="page">
        <div className="page__loading"><div className="loading-orb" /></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="page__header">
          <h1>{t('Dashboard')}</h1>
        </div>
        <div className="alert alert--error">{error}</div>
      </div>
    )
  }

  if (!stats) return null

  const dueWallets = stats.due_wallets ?? []
  const fixedExpenses = stats.fixed_expenses ?? []
  const flexibleExpenses = stats.flexible_expenses ?? []
  const hasDueItems = dueWallets.length > 0 || fixedExpenses.length > 0 || flexibleExpenses.length > 0

  return (
    <div className="page">
      {/* Stats */}
      <div className="dash-stats">
        <div className="stat-card stat-card--warm">
          <p>{t('Total Expenses')}</p>
          <strong>{formatCurrency(stats.total_expenses)}</strong>
        </div>
        <div className="stat-card stat-card--teal">
          <p>{t('Payments Made')}</p>
          <strong>{stats.payments_made}</strong>
        </div>
        <div className="stat-card stat-card--ink">
          <p>{t('Pending Credit Bills')}</p>
          <strong>{stats.pending_wallets}</strong>
        </div>
        <div className="stat-card stat-card--sand">
          <p>{t('Pending Expenses')}</p>
          <strong>{stats.pending_expenses}</strong>
        </div>
      </div>

      {/* Due Items Summary */}
      {hasDueItems && (
        <div className="dash-due-section">
          {/* Due Wallets */}
          {dueWallets.length > 0 && (
            <div className="surface-card">
              <div className="surface-card__header">
                <h2>{t('Credit Bills Due')}</h2>
                <Link to="/due-items" className="btn btn--sm btn--ghost">{t('View all')}</Link>
              </div>
              <DueWalletList items={dueWallets} t={t} />
            </div>
          )}

          {/* Fixed Expenses */}
          {fixedExpenses.length > 0 && (
            <div className="surface-card">
              <div className="surface-card__header">
                <h2>{t('Expenses Due')}</h2>
                <Link to="/due-items" className="btn btn--sm btn--ghost">{t('View all')}</Link>
              </div>
              <DueExpenseList items={fixedExpenses} t={t} />
            </div>
          )}

          {/* Flexible Expenses */}
          {flexibleExpenses.length > 0 && (
            <div className="surface-card">
              <div className="surface-card__header">
                <h2>{t('Suggested Expenses')}</h2>
                <Link to="/due-items" className="btn btn--sm btn--ghost">{t('View all')}</Link>
              </div>
              <DueExpenseList items={flexibleExpenses} t={t} />
            </div>
          )}
        </div>
      )}

      {!hasDueItems && (
        <div className="empty-state">
          <WalletIcon />
          <p>{t('No upcoming due items')}</p>
          <Link to="/wallets" className="btn btn--ghost">
            <RectangleGroupIcon />
            <span>{t('Manage wallets')}</span>
          </Link>
        </div>
      )}
    </div>
  )
}

function DueWalletList({ items, t }: { items: DueWallet[]; t: (key: string, params?: Record<string, string | number>) => string }) {
  return (
    <div className="due-list">
      {items.map((w) => (
        <li key={w.id}>
          <div className="due-item__leading">
            <div className="due-item__icon" style={{ background: w.color || '#577590' }}>
              {w.icon || '💳'}
            </div>
            <div className="due-item__info">
              <span className="due-item__name">{w.name}</span>
              <span className="due-item__meta">
                {t('Day')} {w.bill_due_day} · {daysLabel(w.days_until_due, t)}
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
              {statusLabel(w.status, t)}
            </span>
            {w.has_payment ? (
              <span className="badge badge--green">{t('Paid')}</span>
            ) : (
              <Link
                to={`/payments/new?wallet_id=${w.id}`}
                state={{ returnTo: '/dashboard' }}
                className="btn btn--sm btn--primary"
              >
                {t('Pay')}
              </Link>
            )}
          </div>
        </li>
      ))}
    </div>
  )
}

function DueExpenseList({ items, t }: { items: DueExpense[]; t: (key: string, params?: Record<string, string | number>) => string }) {
  return (
    <div className="due-list">
      {items.map((e) => (
        <li key={e.id}>
          <div className="due-item__leading">
            <div className="due-item__icon" style={{ background: e.color || '#577590' }}>
              {e.icon || '📋'}
            </div>
            <div className="due-item__info">
              <span className="due-item__name">{e.name}</span>
              <span className="due-item__meta">
                {periodLabel(e.recurring_period, t)} · {daysLabel(e.days_until_due, t)}
                {e.default_amount > 0 && ` · ${formatCurrency(e.default_amount)}`}
              </span>
            </div>
          </div>
          <div className="due-item__trailing">
            <span
              className="badge"
              style={{
                background: `${statusColor(e.status)}22`,
                color: statusColor(e.status),
              }}
            >
              {statusLabel(e.status, t)}
            </span>
            <Link
              to={`/expenses/new?expense_type_id=${e.id}`}
              className="btn btn--sm btn--primary"
            >
              {t('Record')}
            </Link>
          </div>
        </li>
      ))}
    </div>
  )
}
