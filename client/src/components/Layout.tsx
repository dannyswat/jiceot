import { startTransition, useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  BanknotesIcon,
  BellAlertIcon,
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  HomeIcon,
  ReceiptPercentIcon,
  RectangleGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

import { formatCurrency } from '../common/currency'
import { formatDate } from '../common/date'
import { useAuth } from '../contexts/AuthContext'
import { dashboardAPI } from '../services/api'
import type { DueExpense, DueWallet } from '../types/dashboard'
import QuickAddButton from './QuickAddButton'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
  { label: 'Due Items', path: '/due-items', icon: ClockIcon },
  { label: 'Payments', path: '/payments', icon: BanknotesIcon },
  { label: 'Expenses', path: '/expenses', icon: ReceiptPercentIcon },
  { label: 'Wallets', path: '/wallets', icon: CreditCardIcon },
  { label: 'Expense Types', path: '/expense-types', icon: RectangleGroupIcon },
  { label: 'Reports', path: '/reports', icon: ChartBarIcon },
  { label: 'Settings', path: '/settings', icon: Cog6ToothIcon },
] as const

interface NotificationItem {
  id: string
  type: 'wallet' | 'expense'
  label: string
  icon: string
  color: string
  dueDate: string
  daysUntilDue: number
  detail: string
}

function dueLabel(daysUntilDue: number): string {
  if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)}d overdue`
  if (daysUntilDue === 0) return 'Due today'
  if (daysUntilDue === 1) return 'Due tomorrow'
  return `Due in ${daysUntilDue} days`
}

function toNotificationItem(item: DueWallet | DueExpense): NotificationItem | null {
  if (item.days_until_due > 3) return null

  if ('has_payment' in item) {
    if (item.has_payment) return null

    return {
      id: `wallet-${item.id}`,
      type: 'wallet',
      label: item.name,
      icon: item.icon,
      color: item.color,
      dueDate: item.next_due_date,
      daysUntilDue: item.days_until_due,
      detail: `Credit bill · Day ${item.bill_due_day}`,
    }
  }

  return {
    id: `expense-${item.id}`,
    type: 'expense',
    label: item.name,
    icon: item.icon,
    color: item.color,
    dueDate: item.next_due_date,
    daysUntilDue: item.days_until_due,
    detail: item.default_amount > 0 ? `Expense · ${formatCurrency(item.default_amount)}` : 'Expense due',
  }
}

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationOpenPath, setNotificationOpenPath] = useState<string | null>(null)
  const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([])

  const isFormPage = location.pathname === '/get-started' || location.pathname.includes('/new') || /\/\d+$/.test(location.pathname)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const data = await dashboardAPI.stats()
        if (!active) return

        const items = [
          ...(data.due_wallets ?? []),
          ...(data.fixed_expenses ?? []),
          ...(data.flexible_expenses ?? []),
        ]
          .map(toNotificationItem)
          .filter((item): item is NotificationItem => item !== null)
          .sort((left, right) => left.daysUntilDue - right.daysUntilDue)

        startTransition(() => {
          setNotificationItems(items)
        })
      } catch {
        if (!active) return
        startTransition(() => {
          setNotificationItems([])
        })
      }
    })()

    return () => {
      active = false
    }
  }, [location.pathname])

  const isNotificationOpen = notificationOpenPath === location.pathname

  useEffect(() => {
    if (!isNotificationOpen) return

    function handleWindowClick(): void {
      setNotificationOpenPath(null)
    }

    window.addEventListener('click', handleWindowClick)
    return () => window.removeEventListener('click', handleWindowClick)
  }, [isNotificationOpen])

  const notificationLabel = notificationItems.length === 0
    ? 'No due items in the next 3 days'
    : notificationItems.length === 1
      ? '1 due item within 3 days'
      : `${notificationItems.length} due items within 3 days`

  function isActive(path: string): boolean {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
  }

  function renderNotificationButton() {
    return (
      <div className="notification-shell" onClick={(e) => e.stopPropagation()}>
        <button
          className="notification-button"
          type="button"
          onClick={() => setNotificationOpenPath((prev) => (prev === location.pathname ? null : location.pathname))}
          title={notificationLabel}
          aria-label={notificationLabel}
          aria-haspopup="menu"
          aria-expanded={isNotificationOpen}
        >
          <BellAlertIcon />
          {notificationItems.length > 0 && (
            <span className="notification-button__badge">{notificationItems.length}</span>
          )}
        </button>
        {isNotificationOpen && (
          <div className="notification-panel wallet-card-menu__panel" role="menu">
            <div className="notification-panel__header">
              <strong>Due in 3 days</strong>
              <span>{notificationItems.length === 0 ? 'All clear' : `${notificationItems.length} item${notificationItems.length === 1 ? '' : 's'}`}</span>
            </div>
            {notificationItems.length === 0 ? (
              <div className="notification-panel__empty">Nothing due in the next 3 days.</div>
            ) : (
              <div className="notification-panel__list">
                {notificationItems.map((item) => (
                  <Link
                    key={item.id}
                    to="/due-items"
                    className="notification-panel__item"
                    onClick={() => setNotificationOpenPath(null)}
                  >
                    <div className="notification-panel__icon" style={{ background: item.color || '#577590' }}>
                      {item.icon || (item.type === 'wallet' ? '💳' : '📋')}
                    </div>
                    <div className="notification-panel__content">
                      <span className="notification-panel__title">{item.label}</span>
                      <span className="notification-panel__meta">{item.detail}</span>
                    </div>
                    <div className="notification-panel__side">
                      <span className="notification-panel__status">{dueLabel(item.daysUntilDue)}</span>
                      <span className="notification-panel__date">{formatDate(item.dueDate)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <Link to="/due-items" className="btn btn--sm btn--ghost notification-panel__cta" onClick={() => setNotificationOpenPath(null)}>
              View due items
            </Link>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar__header">
          <img src="/jiceot.svg" alt="Jiceot" className="sidebar__brand-logo" />
          <button
            className="sidebar__close"
            type="button"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon />
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar__link ${isActive(item.path) ? 'sidebar__link--active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <span className="sidebar__user-name">{user?.name ?? 'User'}</span>
            <span className="sidebar__user-email">{user?.email ?? ''}</span>
          </div>
          <div className="sidebar__actions">
            {renderNotificationButton()}
            <button
              className="sidebar__logout"
              type="button"
              onClick={() => void logout()}
              title="Sign out"
            >
              <ArrowRightStartOnRectangleIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="layout__main">
        {/* Mobile header */}
        <header className="layout__topbar">
          <button
            className="topbar__menu-btn"
            type="button"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon />
          </button>
          <Link to="/dashboard" className="topbar__brand">
            <img src="/jiceot.svg" alt="Jiceot" className="topbar__brand-logo" />
          </Link>
          <div className="topbar__actions">
            {renderNotificationButton()}
            <button
              className="topbar__logout-btn"
              type="button"
              onClick={() => void logout()}
              title="Sign out"
            >
              <ArrowRightStartOnRectangleIcon />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="layout__content">
          <Outlet />
        </main>
      </div>

      {!isFormPage && <QuickAddButton />}
    </div>
  )
}
