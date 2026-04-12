import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowTopRightOnSquareIcon,
  BanknotesIcon,
  BellAlertIcon,
  CheckCircleIcon,
  CreditCardIcon,
  RectangleGroupIcon,
} from '@heroicons/react/24/outline'

import { CURRENCY_SYMBOL_OPTIONS, DEFAULT_CURRENCY_SYMBOL } from '../common/constants'
import { formatCurrency } from '../common/currency'
import { useAuth } from '../contexts/AuthContext'
import { expenseTypeAPI, notificationAPI, walletAPI } from '../services/api'
import type { ReminderType } from '../types/expense'
import type { NotificationSetting } from '../types/notification'
import type { Wallet } from '../types/wallet'

const COMMON_TIMEZONES = Intl.supportedValuesOf('timeZone')
const BROWSER_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

const REMINDER_HOURS = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour).padStart(2, '0') + ':00',
  label: hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`,
}))

interface WalletPreset {
  key: string
  name: string
  icon: string
  color: string
  is_credit?: boolean
  is_cash?: boolean
  bill_period?: string
  bill_due_day?: number
}

interface ExpenseTypePreset {
  key: string
  name: string
  icon: string
  color: string
  recurring_type?: 'none' | 'fixed_day'
  recurring_period?: 'none' | 'monthly'
  recurring_due_day?: number
  reminder_type?: ReminderType
}

interface ExpenseTypePresetGroup {
  key: string
  title: string
  items: ExpenseTypePreset[]
}

const WALLET_PRESETS: WalletPreset[] = [
  {
    key: 'cash-wallet',
    name: 'Cash Wallet',
    icon: '💵',
    color: '#2a9d8f',
    is_cash: true,
  },
  {
    key: 'main-bank',
    name: 'Main Bank',
    icon: '🏦',
    color: '#277da1',
  },
  {
    key: 'credit-card',
    name: 'Primary Credit Card',
    icon: '💳',
    color: '#d94f3d',
    is_credit: true,
    bill_period: 'monthly',
    bill_due_day: 5,
  },
]

const EXPENSE_TYPE_GROUPS: ExpenseTypePresetGroup[] = [
  {
    key: 'core',
    title: 'Core living',
    items: [
      { key: 'groceries', name: 'Groceries', icon: '🛒', color: '#588157' },
      { key: 'dining', name: 'Dining', icon: '🍽️', color: '#e07a5f' },
      { key: 'transport', name: 'Transport', icon: '🚗', color: '#577590' },
      { key: 'rent', name: 'Rent', icon: '🏠', color: '#7f5539', recurring_type: 'fixed_day', recurring_period: 'monthly', recurring_due_day: 1, reminder_type: 'in_advance' },
      { key: 'utilities', name: 'Utilities', icon: '💡', color: '#f59e0b', recurring_type: 'fixed_day', recurring_period: 'monthly', recurring_due_day: 5, reminder_type: 'in_advance' },
      { key: 'phone', name: 'Phone', icon: '📱', color: '#0ea5e9', recurring_type: 'fixed_day', recurring_period: 'monthly', recurring_due_day: 10, reminder_type: 'in_advance' },
      { key: 'internet', name: 'Internet', icon: '🌐', color: '#6366f1', recurring_type: 'fixed_day', recurring_period: 'monthly', recurring_due_day: 15, reminder_type: 'in_advance' },
      { key: 'Subscriptions', name: 'Subscriptions', icon: '🎧', color: '#bc4749' },
    ],
  },
  {
    key: 'student',
    title: 'Student',
    items: [
      { key: 'tuition', name: 'Tuition', icon: '🎓', color: '#4f46e5', recurring_type: 'fixed_day', recurring_period: 'monthly', recurring_due_day: 1, reminder_type: 'in_advance' },
      { key: 'books-supplies', name: 'Books & Supplies', icon: '📚', color: '#8b5cf6' },
      { key: 'campus-meals', name: 'Campus Meals', icon: '🥪', color: '#f97316' },
      { key: 'dorm', name: 'Dorm / Boarding', icon: '🛏️', color: '#7c3aed', recurring_type: 'fixed_day', recurring_period: 'monthly', recurring_due_day: 3, reminder_type: 'in_advance' },
      { key: 'clubs', name: 'Clubs & Activities', icon: '🎭', color: '#ec4899' },
      { key: 'exam-fees', name: 'Exam Fees', icon: '📝', color: '#0f766e' },
    ],
  },
  {
    key: 'women-lifestyle',
    title: 'Women lifestyle',
    items: [
      { key: 'skincare', name: 'Skincare', icon: '🧴', color: '#db2777' },
      { key: 'hair-salon', name: 'Hair & Salon', icon: '💇', color: '#c026d3' },
      { key: 'feminine-care', name: 'Feminine Care', icon: '🩷', color: '#ec4899' },
      { key: 'makeup-beauty', name: 'Makeup & Beauty', icon: '💄', color: '#e11d48' },
      { key: 'fashion', name: 'Fashion', icon: '👜', color: '#be185d' },
      { key: 'wellness-checkups', name: 'Wellness Checkups', icon: '🩺', color: '#0ea5e9' },
    ],
  },
  {
    key: 'home-family',
    title: 'Housewife / homemaker',
    items: [
      { key: 'household-supplies', name: 'Household Supplies', icon: '🧺', color: '#84cc16' },
      { key: 'home-maintenance', name: 'Home Maintenance', icon: '🛠️', color: '#65a30d' },
      { key: 'childcare', name: 'Childcare', icon: '🧸', color: '#f43f5e' },
      { key: 'school-needs', name: 'School Needs', icon: '🎒', color: '#2563eb' },
      { key: 'family-medical', name: 'Family Medical', icon: '🏥', color: '#0284c7' },
      { key: 'kitchen-gas', name: 'Kitchen Gas', icon: '🔥', color: '#ea580c', recurring_type: 'fixed_day', recurring_period: 'monthly', recurring_due_day: 20, reminder_type: 'in_advance' },
    ],
  },
  {
    key: 'work',
    title: 'Office worker / freelancer',
    items: [
      { key: 'commuting', name: 'Commuting', icon: '🚆', color: '#0891b2' },
      { key: 'office-lunch', name: 'Office Lunch', icon: '🍱', color: '#f59e0b' },
      { key: 'software-tools', name: 'Software Tools', icon: '💻', color: '#3b82f6', recurring_type: 'fixed_day', recurring_period: 'monthly', recurring_due_day: 12, reminder_type: 'in_advance' },
      { key: 'coworking', name: 'Coworking', icon: '🏢', color: '#475569', recurring_type: 'fixed_day', recurring_period: 'monthly', recurring_due_day: 2, reminder_type: 'in_advance' },
      { key: 'client-meetings', name: 'Client Meetings', icon: '🤝', color: '#14b8a6' },
      { key: 'taxes-fees', name: 'Taxes & Fees', icon: '🧾', color: '#b45309' },
    ],
  },
  {
    key: 'extra-life',
    title: 'Parent / pet / health / travel',
    items: [
      { key: 'baby-essentials', name: 'Baby Essentials', icon: '🍼', color: '#fb7185' },
      { key: 'kids-activities', name: 'Kids Activities', icon: '⚽', color: '#22c55e' },
      { key: 'pet-care', name: 'Pet Care', icon: '🐾', color: '#a16207' },
      { key: 'gym-fitness', name: 'Gym & Fitness', icon: '🏋️', color: '#16a34a' },
      { key: 'travel', name: 'Travel', icon: '✈️', color: '#0ea5e9' },
      { key: 'insurance', name: 'Insurance', icon: '🛡️', color: '#1d4ed8', recurring_type: 'fixed_day', recurring_period: 'monthly', recurring_due_day: 25, reminder_type: 'in_advance' },
    ],
  },
]

const EXPENSE_TYPE_PRESETS: ExpenseTypePreset[] = EXPENSE_TYPE_GROUPS.flatMap((group) => group.items)

function normalizeName(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function clampDueDays(value: number): number {
  return Math.max(1, Math.min(30, value))
}

export default function GetStartedPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [existingExpenseTypeNames, setExistingExpenseTypeNames] = useState<string[]>([])
  const [currencySymbol, setCurrencySymbol] = useState(auth.user?.currency_symbol || DEFAULT_CURRENCY_SYMBOL)
  const [selectedWalletKeys, setSelectedWalletKeys] = useState<string[]>([])
  const [selectedExpenseTypeKeys, setSelectedExpenseTypeKeys] = useState<string[]>([])
  const [enabled, setEnabled] = useState(false)
  const [barkUrl, setBarkUrl] = useState('')
  const [reminderTime, setReminderTime] = useState('10:00')
  const [timezone, setTimezone] = useState(BROWSER_TZ)
  const [dueDaysAhead, setDueDaysAhead] = useState(3)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notificationLoadWarning, setNotificationLoadWarning] = useState<string | null>(null)

  const existingWalletNames = useMemo(
    () => new Set(wallets.map((wallet) => normalizeName(wallet.name))),
    [wallets],
  )
  const existingExpenseTypeNameSet = useMemo(
    () => new Set(existingExpenseTypeNames.map((name) => normalizeName(name))),
    [existingExpenseTypeNames],
  )

  useEffect(() => {
    setCurrencySymbol(auth.user?.currency_symbol || DEFAULT_CURRENCY_SYMBOL)
  }, [auth.user?.currency_symbol])

  useEffect(() => {
    void loadInitialData()
  }, [])

  async function loadInitialData(): Promise<void> {
    setLoading(true)
    setError(null)
    setNotificationLoadWarning(null)

    const [walletResult, expenseTypeResult, notificationResult] = await Promise.allSettled([
      walletAPI.list({ includeStopped: true }),
      expenseTypeAPI.list({ includeStopped: true }),
      notificationAPI.getSettings(),
    ])

    if (walletResult.status === 'fulfilled') {
      setWallets(walletResult.value.wallets)
      const availableWalletKeys = WALLET_PRESETS
        .filter((preset) => !walletResult.value.wallets.some((wallet) => normalizeName(wallet.name) === normalizeName(preset.name)))
        .map((preset) => preset.key)
      setSelectedWalletKeys(availableWalletKeys)
    } else {
      setWallets([])
      setSelectedWalletKeys(WALLET_PRESETS.map((preset) => preset.key))
    }

    if (expenseTypeResult.status === 'fulfilled') {
      const names = expenseTypeResult.value.expense_types.map((expenseType) => expenseType.name)
      setExistingExpenseTypeNames(names)
      const availableExpenseTypeKeys = EXPENSE_TYPE_PRESETS
        .filter((preset) => !names.some((name) => normalizeName(name) === normalizeName(preset.name)))
        .map((preset) => preset.key)
      setSelectedExpenseTypeKeys(availableExpenseTypeKeys)
    } else {
      setExistingExpenseTypeNames([])
      setSelectedExpenseTypeKeys(EXPENSE_TYPE_PRESETS.map((preset) => preset.key))
    }

    if (notificationResult.status === 'fulfilled') {
      applyNotificationSetting(notificationResult.value)
    } else {
      setNotificationLoadWarning('Notification defaults are shown because your saved settings could not be loaded.')
    }

    setLoading(false)
  }

  function applyNotificationSetting(setting: NotificationSetting): void {
    setEnabled(setting.enabled)
    setBarkUrl(setting.bark_url || '')
    setReminderTime(setting.reminder_time || '10:00')
    setTimezone(setting.timezone || BROWSER_TZ)
    setDueDaysAhead(setting.due_days_ahead || 3)
  }

  function toggleWalletSelection(key: string): void {
    setSelectedWalletKeys((current) => (
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key]
    ))
  }

  function toggleExpenseTypeSelection(key: string): void {
    setSelectedExpenseTypeKeys((current) => (
      current.includes(key) ? current.filter((value) => value !== key) : [...current, key]
    ))
  }

  async function handleSubmit(): Promise<void> {
    setError(null)

    if (enabled && !barkUrl.trim()) {
      setError('Bark URL is required when notifications are enabled.')
      return
    }

    setSaving(true)

    try {
      for (const preset of WALLET_PRESETS) {
        if (!selectedWalletKeys.includes(preset.key) || existingWalletNames.has(normalizeName(preset.name))) {
          continue
        }

        await walletAPI.create({
          name: preset.name,
          icon: preset.icon,
          color: preset.color,
          is_credit: preset.is_credit,
          is_cash: preset.is_cash,
          bill_period: preset.bill_period,
          bill_due_day: preset.bill_due_day,
        })
      }

      for (const preset of EXPENSE_TYPE_PRESETS) {
        if (!selectedExpenseTypeKeys.includes(preset.key) || existingExpenseTypeNameSet.has(normalizeName(preset.name))) {
          continue
        }

        await expenseTypeAPI.create({
          name: preset.name,
          icon: preset.icon,
          color: preset.color,
          recurring_type: preset.recurring_type ?? 'none',
          recurring_period: preset.recurring_period,
          recurring_due_day: preset.recurring_due_day,
          reminder_type: preset.recurring_type === 'fixed_day' ? preset.reminder_type ?? 'in_advance' : 'none',
        })
      }

      const normalizedCurrencySymbol = currencySymbol.trim() || DEFAULT_CURRENCY_SYMBOL
      if (normalizedCurrencySymbol !== (auth.user?.currency_symbol || DEFAULT_CURRENCY_SYMBOL)) {
        await auth.updateCurrencySymbol(normalizedCurrencySymbol)
      }

      await notificationAPI.updateSettings({
        bark_url: barkUrl.trim(),
        enabled,
        reminder_time: reminderTime,
        timezone,
        due_days_ahead: clampDueDays(dueDaysAhead),
      })

      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to finish setup')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page page--setup-loading">
        <div className="page__loading">
          <div className="loading-orb" />
          <p>Preparing your starter setup...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page page--setup">
      <section className="setup-hero">
        <div className="setup-hero__copy">
          <p className="eyebrow">Get Started</p>
          <h1>Set up the parts most people need in the first five minutes.</h1>
          <p>
            Pick starter wallets and expense types, set your display currency, and decide whether Jiceot should remind you through Bark.
          </p>
          <div className="setup-hero__stats">
            <div>
              <strong>{selectedWalletKeys.length}</strong>
              <span>wallet presets selected</span>
            </div>
            <div>
              <strong>{selectedExpenseTypeKeys.length}</strong>
              <span>expense types selected</span>
            </div>
            <div>
              <strong>{enabled ? 'On' : 'Off'}</strong>
              <span>push reminder status</span>
            </div>
          </div>
        </div>
        <div className="setup-hero__panel">
          <div className="setup-checklist">
            <div className="setup-checklist__item">
              <CheckCircleIcon />
              <div>
                <strong>Use the presets as-is</strong>
                <span>You can edit or delete everything later from Wallets and Expense Types.</span>
              </div>
            </div>
            <div className="setup-checklist__item">
              <CheckCircleIcon />
              <div>
                <strong>No duplicate presets</strong>
                <span>Anything already in your account is marked and skipped automatically.</span>
              </div>
            </div>
            <div className="setup-checklist__item">
              <CheckCircleIcon />
              <div>
                <strong>Skip is always safe</strong>
                <span>You can come back later from Settings whenever you want.</span>
              </div>
            </div>
          </div>
          <div className="setup-hero__actions">
            <button type="button" className="ghost-button" onClick={() => navigate('/dashboard', { replace: true })}>
              Skip for now
            </button>
            <button type="button" className="primary-button" onClick={() => void handleSubmit()} disabled={saving}>
              {saving ? 'Finishing setup...' : 'Finish setup'}
            </button>
          </div>
        </div>
      </section>

      {error && <p className="form-error">{error}</p>}
      {notificationLoadWarning && <p className="setup-note">{notificationLoadWarning}</p>}

      <section className="setup-section">
        <div className="setup-section__header">
          <div className="setup-section__icon"><BanknotesIcon /></div>
          <div>
            <h2>Currency</h2>
            <p>Pick the symbol Jiceot should use across balances, reports, and forms.</p>
          </div>
        </div>

        <div className="setup-currency-card">
          <label className="field field--flex1">
            <span className="field__label">Display symbol</span>
            <input
              type="text"
              className="field__input"
              list="setup-currency-symbol-options"
              value={currencySymbol}
              onChange={(event) => setCurrencySymbol(event.target.value)}
              maxLength={4}
              placeholder={DEFAULT_CURRENCY_SYMBOL}
              autoComplete="off"
            />
            <datalist id="setup-currency-symbol-options">
              {CURRENCY_SYMBOL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </datalist>
          </label>
          <div className="setup-currency-preview">
            <span>Preview</span>
            <strong>{formatCurrency(12345, currencySymbol.trim() || DEFAULT_CURRENCY_SYMBOL)}</strong>
          </div>
        </div>
      </section>

      <section className="setup-section">
        <div className="setup-section__header">
          <div className="setup-section__icon"><CreditCardIcon /></div>
          <div>
            <h2>Starter Wallets</h2>
            <p>Select the wallet types you want ready on day one.</p>
          </div>
        </div>
        <div className="setup-card-grid">
          {WALLET_PRESETS.map((preset) => {
            const exists = existingWalletNames.has(normalizeName(preset.name))
            const selected = selectedWalletKeys.includes(preset.key)

            return (
              <button
                key={preset.key}
                type="button"
                className={`setup-preset-card ${selected ? 'setup-preset-card--selected' : ''} ${exists ? 'setup-preset-card--existing' : ''}`}
                onClick={() => !exists && toggleWalletSelection(preset.key)}
                disabled={exists}
              >
                <div className="setup-preset-card__top">
                  <span className="setup-preset-card__emoji" style={{ background: preset.color }}>{preset.icon}</span>
                </div>
                <strong>{preset.name}</strong>
                {exists && <small className="setup-preset-card__meta">Already added</small>}
              </button>
            )
          })}
        </div>
      </section>

      <section className="setup-section">
        <div className="setup-section__header">
          <div className="setup-section__icon"><RectangleGroupIcon /></div>
          <div>
            <h2>Starter Expense Types</h2>
            <p>Comprehensive starters across different roles and life situations.</p>
          </div>
        </div>
        <div className="setup-role-groups">
          {EXPENSE_TYPE_GROUPS.map((group) => (
            <div key={group.key} className="setup-role-group">
              <h3>{group.title}</h3>
              <div className="setup-card-grid setup-card-grid--compact">
                {group.items.map((preset) => {
                  const exists = existingExpenseTypeNameSet.has(normalizeName(preset.name))
                  const selected = selectedExpenseTypeKeys.includes(preset.key)

                  return (
                    <button
                      key={preset.key}
                      type="button"
                      className={`setup-preset-card setup-preset-card--compact ${selected ? 'setup-preset-card--selected' : ''} ${exists ? 'setup-preset-card--existing' : ''}`}
                      onClick={() => !exists && toggleExpenseTypeSelection(preset.key)}
                      disabled={exists}
                    >
                      <div className="setup-preset-card__top">
                        <span className="setup-preset-card__emoji" style={{ background: preset.color }}>{preset.icon}</span>
                      </div>
                      <strong>{preset.name}</strong>
                      {preset.recurring_type === 'fixed_day' && (
                        <small className="setup-preset-card__meta">Monthly reminder on day {preset.recurring_due_day}</small>
                      )}
                      {exists && <small className="setup-preset-card__meta">Already added</small>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="setup-section">
        <div className="setup-section__header">
          <div className="setup-section__icon"><BellAlertIcon /></div>
          <div>
            <h2>Notifications</h2>
            <p>Enable Bark if you want a daily push reminder whenever something is due soon.</p>
          </div>
        </div>

        <div className="form-card setup-form-card">
          <a
            className="setup-bark-link"
            href="https://bark.day.app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="https://bark.day.app/_media/Icon.png" alt="Bark" className="setup-bark-link__icon" />
            <div className="setup-bark-link__copy">
              <strong>Open Bark</strong>
              <span>Install Bark, copy your personal push URL, then paste it below.</span>
            </div>
            <ArrowTopRightOnSquareIcon />
          </a>

          <div className="field setup-toggle-row">
            <label className="field__label" htmlFor="setup-notifications-enabled">Enable notifications</label>
            <input
              id="setup-notifications-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
          </div>

          <div className="field">
            <label className="field__label">Bark URL</label>
            <input
              type="url"
              className="field__input"
              placeholder="https://api.day.app/YOUR_KEY"
              value={barkUrl}
              onChange={(event) => setBarkUrl(event.target.value)}
              disabled={!enabled}
            />
            <small className="field-hint">Paste the Bark URL from the app after opening the link above.</small>
          </div>

          <div className="field-row">
            <div className="field field--flex1">
              <label className="field__label">Daily reminder time</label>
              <select
                className="field__input"
                value={reminderTime}
                onChange={(event) => setReminderTime(event.target.value)}
                disabled={!enabled}
              >
                {REMINDER_HOURS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="field field--flex1">
              <label className="field__label">Notify days ahead</label>
              <input
                type="number"
                className="field__input"
                min={1}
                max={30}
                value={dueDaysAhead}
                onChange={(event) => setDueDaysAhead(clampDueDays(Number(event.target.value) || 1))}
                disabled={!enabled}
              />
            </div>
          </div>

          <div className="field">
            <label className="field__label">Timezone</label>
            <select
              className="field__input"
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              disabled={!enabled}
            >
              {!COMMON_TIMEZONES.includes(BROWSER_TZ) && (
                <option value={BROWSER_TZ}>{BROWSER_TZ.replace(/_/g, ' ')} (detected)</option>
              )}
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}{tz === BROWSER_TZ ? ' (detected)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>
    </div>
  )
}