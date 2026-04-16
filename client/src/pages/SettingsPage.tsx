import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BanknotesIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  BellAlertIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  LanguageIcon,
  RocketLaunchIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'

import { useAuth } from '../contexts/AuthContext'
import { LANGUAGE_OPTIONS, normalizeLanguage, useI18n, type SupportedLanguage } from '../contexts/I18nContext'
import { formatCurrency } from '../common/currency'
import { CURRENCY_SYMBOL_OPTIONS, DEFAULT_CURRENCY_SYMBOL } from '../common/constants'
import { api } from '../services/api'
import type { AuthContextValue, User } from '../types/auth'

function normalizeCurrencySymbolInput(value: string): string {
  const trimmed = value.trim()
  return trimmed || DEFAULT_CURRENCY_SYMBOL
}

function buildAutomationURL(apiKey: string): string {
  if (!apiKey) {
    return ''
  }

  const url = new URL('/api/automation/expense', window.location.origin)
  url.searchParams.set('api_key', apiKey)
  return url.toString()
}

export default function SettingsPage() {
  const auth: AuthContextValue = useAuth()
  const { locale, t } = useI18n()
  const user: User | null = auth.user
  const navigate = useNavigate()
  const rawLanguage: unknown = user ? (user as { language?: unknown }).language : undefined
  const currentLanguage: SupportedLanguage = normalizeLanguage(typeof rawLanguage === 'string' ? rawLanguage : undefined)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const initialCurrencySymbol: string = user && 'currency_symbol' in user ? user.currency_symbol : DEFAULT_CURRENCY_SYMBOL
  const automationAPIKey: string = user && 'automation_api_key' in user ? user.automation_api_key : ''
  const automationURL: string = buildAutomationURL(automationAPIKey)
  const [currencySymbol, setCurrencySymbol] = useState<string>(initialCurrencySymbol)
  const [isSavingCurrency, setIsSavingCurrency] = useState(false)
  const [currencyError, setCurrencyError] = useState<string | null>(null)
  const [currencyMessage, setCurrencyMessage] = useState<string | null>(null)
  const [language, setLanguage] = useState<SupportedLanguage>(currentLanguage)
  const [isSavingLanguage, setIsSavingLanguage] = useState(false)
  const [languageError, setLanguageError] = useState<string | null>(null)
  const [languageMessage, setLanguageMessage] = useState<string | null>(null)
  const [automationKeyMessage, setAutomationKeyMessage] = useState<string | null>(null)
  const [automationKeyError, setAutomationKeyError] = useState<string | null>(null)
  const [isRotatingAutomationKey, setIsRotatingAutomationKey] = useState(false)

  useEffect(() => {
    const newSymbol: string = user && 'currency_symbol' in user ? user.currency_symbol : DEFAULT_CURRENCY_SYMBOL
    const nextRawLanguage: unknown = user ? (user as { language?: unknown }).language : undefined
    setCurrencySymbol(newSymbol)
    setLanguage(normalizeLanguage(typeof nextRawLanguage === 'string' ? nextRawLanguage : undefined))
    setAutomationKeyError(null)
  }, [user])

  const currentCurrencySymbol: string = initialCurrencySymbol
  const normalizedCurrencySymbol: string = normalizeCurrencySymbolInput(currencySymbol)
  const hasCurrencyChanges = normalizedCurrencySymbol !== currentCurrencySymbol
  const hasLanguageChanges = language !== currentLanguage

  const settingsSections = [
    {
      title: t('Account'),
      items: [
        {
          name: t('Get Started Setup'),
          description: t('Starter wallets, expense types, currency, and Bark setup'),
          icon: RocketLaunchIcon,
          href: '/get-started',
        },
        {
          name: t('Change Password'),
          description: t('Update your account password'),
          icon: KeyIcon,
          href: '/change-password',
        },
      ],
    },
    {
      title: t('Notifications'),
      items: [
        {
          name: t('Push Notifications'),
          description: t('Daily reminders for due items via Bark'),
          icon: BellAlertIcon,
          href: '/settings/notifications',
        },
      ],
    },
    {
      title: t('Security'),
      items: [
        {
          name: t('Devices'),
          description: t('Manage logged-in devices'),
          icon: ComputerDesktopIcon,
          href: '/settings/devices',
        },
      ],
    },
  ]

  async function handleSaveCurrencySymbol(): Promise<void> {
    setIsSavingCurrency(true)
    setCurrencyError(null)
    setCurrencyMessage(null)
    try {
      await auth.updateCurrencySymbol(normalizedCurrencySymbol)
      setCurrencyMessage(t('Currency symbol updated.'))
    } catch (err) {
      setCurrencyError(err instanceof Error ? err.message : t('Failed to update currency symbol'))
    } finally {
      setIsSavingCurrency(false)
    }
  }

  async function handleSaveLanguage(): Promise<void> {
    setIsSavingLanguage(true)
    setLanguageError(null)
    setLanguageMessage(null)
    try {
      await (auth.updateLanguage as (language: SupportedLanguage) => Promise<void>)(language)
      setLanguageMessage(t('Language updated.'))
    } catch (err) {
      setLanguageError(err instanceof Error ? err.message : t('Failed to update language'))
    } finally {
      setIsSavingLanguage(false)
    }
  }

  async function handleDeleteAccount(): Promise<void> {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      await auth.deleteAccount()
      navigate('/login', { replace: true })
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : t('Failed to delete account'))
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleCopyAutomationURL(): Promise<void> {
    if (!automationURL) {
      return
    }

    setAutomationKeyError(null)
    setAutomationKeyMessage(null)

    try {
      await window.navigator.clipboard.writeText(automationURL)
      setAutomationKeyMessage(t('Automation API URL copied.'))
    } catch {
      setAutomationKeyError(t('Failed to copy automation API URL'))
    }
  }

  async function handleRotateAutomationKey(): Promise<void> {
    setIsRotatingAutomationKey(true)
    setAutomationKeyError(null)
    setAutomationKeyMessage(null)

    try {
      await api.post<User>('/user/preferences/automation-key/rotate')
      await auth.refreshSession()
      setAutomationKeyMessage(t('Automation API key rotated.'))
    } catch (err) {
      setAutomationKeyError(err instanceof Error ? err.message : t('Failed to rotate automation API key'))
    } finally {
      setIsRotatingAutomationKey(false)
    }
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1>{t('Settings')}</h1>
        <p>{t('Manage your account and preferences')}</p>
      </div>

      {/* User card */}
      <div className="settings-user-card">
        <div className="settings-user-card__avatar">
          <UserCircleIcon />
        </div>
        <div>
          <p className="settings-user-card__name">{user?.name ?? t('User')}</p>
          <p className="settings-user-card__email">{user?.email ?? ''}</p>
          {user?.created_at && (
            <p className="settings-user-card__since">
              {t('Member since')} {new Date(user.created_at).toLocaleDateString(locale)}
            </p>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section__title">{t('Display')}</h2>
        <div className="settings-preference">
          <div className="settings-preference__icon">
            <BanknotesIcon />
          </div>
          <div className="settings-preference__body">
            <div className="settings-preference__copy">
              <p>{t('Currency symbol')}</p>
              <small>{t('Used for labels and amounts throughout the app. It does not change stored values.')}</small>
            </div>
            <div className="settings-preference__controls">
              <label className="field field--flex1">
                <span className="field__label">{t('Display symbol')}</span>
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
                      {t(option.label)}
                    </option>
                  ))}
                </datalist>
                <small className="field-hint">{t('Choose a suggested symbol or type your own, up to 4 characters.')}</small>
              </label>
              <button
                type="button"
                className="primary-button settings-preference__save"
                onClick={() => void handleSaveCurrencySymbol()}
                disabled={!hasCurrencyChanges || isSavingCurrency}
              >
                {isSavingCurrency ? t('Saving…') : t('Save')}
              </button>
            </div>
            <p className="settings-preference__preview">
              {t('Preview:')} {formatCurrency(12345, normalizedCurrencySymbol)}
            </p>
            {currencyError && <p className="form-error">{currencyError}</p>}
            {currencyMessage && <p className="settings-preference__message">{currencyMessage}</p>}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section__title">{t('Language')}</h2>
        <div className="settings-preference">
          <div className="settings-preference__icon">
            <LanguageIcon />
          </div>
          <div className="settings-preference__body">
            <div className="settings-preference__copy">
              <p>{t('App language')}</p>
              <small>{t('Choose the language used across the app interface.')}</small>
            </div>
            <div className="settings-preference__controls">
              <label className="field field--flex1">
                <span className="field__label">{t('Language')}</span>
                <select
                  className="field__input"
                  value={language}
                  onChange={(event) => {
                    setLanguage(event.target.value as SupportedLanguage)
                    setLanguageError(null)
                    setLanguageMessage(null)
                  }}
                  disabled={isSavingLanguage}
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="primary-button settings-preference__save"
                onClick={() => void handleSaveLanguage()}
                disabled={!hasLanguageChanges || isSavingLanguage}
              >
                {isSavingLanguage ? t('Saving…') : t('Save')}
              </button>
            </div>
            {languageError && <p className="form-error">{languageError}</p>}
            {languageMessage && <p className="settings-preference__message">{languageMessage}</p>}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section__title">{t('Automation')}</h2>
        <div className="settings-preference">
          <div className="settings-preference__icon">
            <KeyIcon />
          </div>
          <div className="settings-preference__body">
            <div className="settings-preference__copy">
              <p>{t('Automation API URL')}</p>
              <small>{t('Paste this URL directly into the Shortcuts Get Contents of URL action. The api_key is already included.')}</small>
            </div>
            <div className="settings-preference__controls settings-preference__controls--stack">
              <label className="field field--flex1">
                <span className="field__label">{t('Automation API URL')}</span>
                <input
                  type="text"
                  className="field__input settings-preference__mono"
                  value={automationURL}
                  readOnly
                  spellCheck={false}
                />
                <small className="field-hint">{t('Rotate the key if this URL was exposed. Copying the full URL is the fastest way to set up the shortcut.')}</small>
              </label>
              <div className="settings-preference__actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => void handleCopyAutomationURL()}
                  disabled={!automationURL || isRotatingAutomationKey}
                >
                  <ClipboardDocumentIcon />
                  {t('Copy URL')}
                </button>
                <button
                  type="button"
                  className="primary-button settings-preference__save"
                  onClick={() => void handleRotateAutomationKey()}
                  disabled={isRotatingAutomationKey}
                >
                  {isRotatingAutomationKey ? t('Rotating…') : t('Rotate key')}
                </button>
              </div>
            </div>
            {automationKeyError && <p className="form-error">{automationKeyError}</p>}
            {automationKeyMessage && <p className="settings-preference__message">{automationKeyMessage}</p>}
          </div>
        </div>
      </div>

      {/* Settings sections */}
      {settingsSections.map((section) => (
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
        <h2 className="settings-section__title">{t('Danger Zone')}</h2>
        <div className="settings-danger">
          <div>
            <p>{t('Delete Account')}</p>
            <small>{t('Permanently delete your account and all data')}</small>
          </div>
          <button
            type="button"
            className="danger-button"
            onClick={() => setShowDeleteDialog(true)}
          >
            {t('Delete Account')}
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
                  <h3>{t('Delete Account')}</h3>
                  <p>{t('This action cannot be undone.')}</p>
                </div>
              </div>

              <div className="modal__body">
                <p>{t('All your data will be permanently removed:')}</p>
                <ul>
                  <li>{t('Wallets and payment records')}</li>
                  <li>{t('Expense types and expenses')}</li>
                  <li>{t('Account information and sessions')}</li>
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
                  {t('Cancel')}
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => void handleDeleteAccount()}
                  disabled={isDeleting}
                >
                  {isDeleting ? t('Deleting…') : t('Delete My Account')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
