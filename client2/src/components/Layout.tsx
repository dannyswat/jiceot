import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  ArrowRightStartOnRectangleIcon,
  Bars3Icon,
  BanknotesIcon,
  ChartBarIcon,
  ClockIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  HomeIcon,
  ReceiptPercentIcon,
  RectangleGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

import { useAuth } from '../contexts/AuthContext'
import QuickAddButton from './QuickAddButton'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: HomeIcon },
  { label: 'Due Items', path: '/due-items', icon: ClockIcon },
  { label: 'Wallets', path: '/wallets', icon: CreditCardIcon },
  { label: 'Payments', path: '/payments', icon: BanknotesIcon },
  { label: 'Expense Types', path: '/expense-types', icon: RectangleGroupIcon },
  { label: 'Expenses', path: '/expenses', icon: ReceiptPercentIcon },
  { label: 'Reports', path: '/reports', icon: ChartBarIcon },
  { label: 'Settings', path: '/settings', icon: Cog6ToothIcon },
] as const

export default function Layout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isFormPage = location.pathname.includes('/new') || /\/\d+$/.test(location.pathname)

  function isActive(path: string): boolean {
    if (path === '/dashboard') return location.pathname === '/dashboard'
    return location.pathname.startsWith(path)
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
          <button
            className="sidebar__logout"
            type="button"
            onClick={() => void logout()}
            title="Sign out"
          >
            <ArrowRightStartOnRectangleIcon />
          </button>
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
          <button
            className="topbar__logout-btn"
            type="button"
            onClick={() => void logout()}
            title="Sign out"
          >
            <ArrowRightStartOnRectangleIcon />
          </button>
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
