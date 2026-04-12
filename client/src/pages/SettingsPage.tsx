import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BanknotesIcon,
  ChevronRightIcon,
  BellAlertIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  RocketLaunchIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

import { useAuth } from '../contexts/AuthContext'
import { formatCurrency } from '../common/currency'
import { CURRENCY_SYMBOL_OPTIONS, DEFAULT_CURRENCY_SYMBOL } from '../common/constants'
import type { AuthContextValue, User } from '../types/auth'

function normalizeCurrencySymbolInput(value: string): string {
  const trimmed = value.trim()
  return trimmed || DEFAULT_CURRENCY_SYMBOL
}

const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    items: [
      {
        name: 'Get Started Setup',
        description: 'Starter wallets, expense types, currency, and Bark setup',
        icon: RocketLaunchIcon,
        href: '/get-started',
      },
      {
        name: 'Change Password',
        description: 'Update your account password',
        icon: KeyIcon,
        href: '/change-password',
      },
    ],
  },
  {
    title: 'Notifications',
    items: [
      {
        name: 'Push Notifications',
        description: 'Daily reminders for due items via Bark',
        icon: BellAlertIcon,
        href: '/settings/notifications',
      },
    ],
  },
  {
    title: 'Security',
    items: [
      {
        name: 'Devices',
        description: 'Manage logged-in devices',
        icon: ComputerDesktopIcon,
        href: '/settings/devices',
      },
    ],
  },
]

export default function SettingsPage() {
  const auth: AuthContextValue = useAuth()
  const user: User | null = auth.user
  const navigate = useNavigate()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const initialCurrencySymbol: string = user && 'currency_symbol' in user ? user.currency_symbol : DEFAULT_CURRENCY_SYMBOL
  const [currencySymbol, setCurrencySymbol] = useState<string>(initialCurrencySymbol)
  const [isSavingCurrency, setIsSavingCurrency] = useState(false)
  const [currencyError, setCurrencyError] = useState<string | null>(null)
  const [currencyMessage, setCurrencyMessage] = useState<string | null>(null)

  useEffect(() => {
    const newSymbol: string = user && 'currency_symbol' in user ? user.currency_symbol : DEFAULT_CURRENCY_SYMBOL
    setCurrencySymbol(newSymbol)
  }, [user])

  const currentCurrencySymbol: string = initialCurrencySymbol
  const normalizedCurrencySymbol: string = normalizeCurrencySymbolInput(currencySymbol)
  const hasCurrencyChanges = normalizedCurrencySymbol !== currentCurrencySymbol

  async function handleSaveCurrencySymbol(): Promise<void> {
    setIsSavingCurrency(true)
    setCurrencyError(null)
    setCurrencyMessage(null)
    try {
      await auth.updateCurrencySymbol(normalizedCurrencySymbol)
      setCurrencyMessage('Currency symbol updated.')
    } catch (err) {
      setCurrencyError(err instanceof Error ? err.message : 'Failed to update currency symbol')
    } finally {
      setIsSavingCurrency(false)
    }
  }

  async function handleDeleteAccount(): Promise<void> {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await auth.deleteAccount()
      navigate('/login', { replace: true })
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete account')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      {/* User card */}
      <div className="settings-user-card">
        <div className="settings-user-card__avatar">
          <UserCircleIcon />
        </div>
        <div>
          <p className="settings-user-card__name">{user?.name ?? 'User'}</p>
          <p className="settings-user-card__email">{user?.email ?? ''}</p>
          {user?.created_at && (
            <p className="settings-user-card__since">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section__title">Display</h2>
        <div className="settings-preference">
          <div className="settings-preference__icon">
            <BanknotesIcon />
          </div>
          <div className="settings-preference__body">
            <div className="settings-preference__copy">
              <p>Currency symbol</p>
              <small>Used for labels and amounts throughout the app. It does not change stored values.</small>
            </div>
            <div className="settings-preference__controls">
              <label className="field field--flex1">
                <span className="field__label">Display symbol</span>
                <input
                  type="text"
                  className="field__input"
                  list="currency-symbol-options"
                  value={currencySymbol}
                  onChange={(event) => {
                    setCurrencySymbol(event.target.value)
                    setCurrencyError(null)
                    setCurrencyMessage(null)
                  }}
                  maxLength={4}
                  placeholder={DEFAULT_CURRENCY_SYMBOL}
                  autoComplete="off"
                  disabled={isSavingCurrency}
                />
                <datalist id="currency-symbol-options">
                  {CURRENCY_SYMBOL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </datalist>
                <small className="field-hint">Choose a suggested symbol or type your own, up to 4 characters.</small>
              </label>
              <button
                type="button"
                className="primary-button settings-preference__save"
                onClick={() => void handleSaveCurrencySymbol()}
                disabled={!hasCurrencyChanges || isSavingCurrency}
              >
                {isSavingCurrency ? 'Saving…' : 'Save'}
              </button>
            </div>
            <p className="settings-preference__preview">
              Preview: {formatCurrency(12345, normalizedCurrencySymbol)}
            </p>
            {currencyError && <p className="form-error">{currencyError}</p>}
            {currencyMessage && <p className="settings-preference__message">{currencyMessage}</p>}
          </div>
        </div>
      </div>

      {/* Settings sections */}
      {SETTINGS_SECTIONS.map((section) => (
        <div key={section.title} className="settings-section">
          <h2 className="settings-section__title">{section.title}</h2>
          <div className="settings-section__items">
            {section.items.map((item) => (
              <Link key={item.href} to={item.href} className="settings-item">
                <item.icon className="settings-item__icon" />
                <div className="settings-item__text">
                  <span>{item.name}</span>
                  <small>{item.description}</small>
                </div>
                <ChevronRightIcon className="settings-item__chevron" />
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Danger zone */}
      <div className="settings-section settings-section--danger">
        <h2 className="settings-section__title">Danger Zone</h2>
        <div className="settings-danger">
          <div>
            <p>Delete Account</p>
            <small>Permanently delete your account and all data</small>
          </div>
          <button
            type="button"
            className="danger-button"
            onClick={() => setShowDeleteDialog(true)}
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <>
          <div className="modal-backdrop" onClick={() => setShowDeleteDialog(false)} />
          <div className="modal-wrap">
            <div className="modal modal--narrow">
              <div className="modal__header">
                <div className="modal__header-icon modal__header-icon--danger">
                  <ExclamationTriangleIcon />
                </div>
                <div>
                  <h3>Delete Account</h3>
                  <p>This action cannot be undone.</p>
                </div>
              </div>

              <div className="modal__body">
                <p>All your data will be permanently removed:</p>
                <ul>
                  <li>Wallets and payment records</li>
                  <li>Expense types and expenses</li>
                  <li>Account information and sessions</li>
                </ul>
              </div>

              {deleteError && <p className="form-error">{deleteError}</p>}

              <div className="modal__actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => void handleDeleteAccount()}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting…' : 'Delete My Account'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
