import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ClockIcon,
  CreditCardIcon,
  PlusIcon,
  RectangleGroupIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'

import { dashboardAPI } from '../services/api'
import { formatCurrency } from '../common/currency'
import { RECURRING_PERIOD_OPTIONS } from '../common/constants'
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

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const data = await dashboardAPI.stats()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

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
          <h1>Dashboard</h1>
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
      <div className="page__header">
        <h1>Dashboard</h1>
        <p>Overview of your financial activity and upcoming obligations</p>
      </div>

      {/* Stats */}
      <div className="dash-stats">
        <div className="stat-card stat-card--warm">
          <p>Total Expenses</p>
          <strong>{formatCurrency(stats.total_expenses)}</strong>
        </div>
        <div className="stat-card stat-card--teal">
          <p>Payments Made</p>
          <strong>{stats.payments_made}</strong>
        </div>
        <div className="stat-card stat-card--ink">
          <p>Pending Credit Bills</p>
          <strong>{stats.pending_wallets}</strong>
        </div>
        <div className="stat-card stat-card--sand">
          <p>Pending Expenses</p>
          <strong>{stats.pending_expenses}</strong>
        </div>
      </div>

      {/* Quick actions */}
      <div className="dash-actions">
        <Link to="/expenses/new" className="btn btn--primary">
          <PlusIcon />
          <span>Add Expense</span>
        </Link>
        <Link to="/payments/new" className="btn btn--ghost">
          <CreditCardIcon />
          <span>Record Payment</span>
        </Link>
        <Link to="/due-items" className="btn btn--ghost">
          <ClockIcon />
          <span>View Due Items</span>
        </Link>
      </div>

      {/* Due Items Summary */}
      {hasDueItems && (
        <div className="dash-due-section">
          {/* Due Wallets */}
          {dueWallets.length > 0 && (
            <div className="surface-card">
              <div className="surface-card__header">
                <h2>Credit Bills Due</h2>
                <Link to="/due-items" className="btn btn--sm btn--ghost">View all</Link>
              </div>
              <DueWalletList items={dueWallets} />
            </div>
          )}

          {/* Fixed Expenses */}
          {fixedExpenses.length > 0 && (
            <div className="surface-card">
              <div className="surface-card__header">
                <h2>Expenses Due</h2>
                <Link to="/due-items" className="btn btn--sm btn--ghost">View all</Link>
              </div>
              <DueExpenseList items={fixedExpenses} />
            </div>
          )}

          {/* Flexible Expenses */}
          {flexibleExpenses.length > 0 && (
            <div className="surface-card">
              <div className="surface-card__header">
                <h2>Suggested Expenses</h2>
                <Link to="/due-items" className="btn btn--sm btn--ghost">View all</Link>
              </div>
              <DueExpenseList items={flexibleExpenses} />
            </div>
          )}
        </div>
      )}

      {!hasDueItems && (
        <div className="empty-state">
          <WalletIcon />
          <p>No upcoming due items</p>
          <Link to="/wallets" className="btn btn--ghost">
            <RectangleGroupIcon />
            <span>Manage wallets</span>
          </Link>
        </div>
      )}
    </div>
  )
}

function DueWalletList({ items }: { items: DueWallet[] }) {
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
                Day {w.bill_due_day} · {daysLabel(w.days_until_due)}
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
              <Link to={`/payments/new?wallet_id=${w.id}`} className="btn btn--sm btn--primary">
                Pay
              </Link>
            )}
          </div>
        </li>
      ))}
    </div>
  )
}

function DueExpenseList({ items }: { items: DueExpense[] }) {
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
                {periodLabel(e.recurring_period)} · {daysLabel(e.days_until_due)}
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
              {statusLabel(e.status)}
            </span>
            <Link
              to={`/expenses/new?expense_type_id=${e.id}`}
              className="btn btn--sm btn--primary"
            >
              Record
            </Link>
          </div>
        </li>
      ))}
    </div>
  )
}
