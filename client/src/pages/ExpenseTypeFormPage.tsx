import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

import AmountInput from '../components/AmountInput'
import { expenseTypeAPI, walletAPI } from '../services/api'
import {
  RECURRING_TYPE_OPTIONS,
  RECURRING_PERIOD_OPTIONS,
} from '../common/constants'
import IconPicker from '../components/IconPicker'
import ColorPicker from '../components/ColorPicker'
import { useI18n } from '../contexts/I18nContext'
import type { ExpenseType, RecurringPeriod, RecurringType } from '../types/expense'
import type { Wallet } from '../types/wallet'

type ReminderTypeValue = 'none' | 'in_advance' | 'on_day' | 'automatic'

const reminderTypeOptions: { value: ReminderTypeValue; label: string }[] = [
  { value: 'in_advance', label: 'In advance' },
  { value: 'on_day', label: 'On day' },
  { value: 'automatic', label: 'Automatic' },
  { value: 'none', label: 'None' },
]

const iosShortcutCategoryOptions = [
  'Food & Drinks',
  'Shopping',
  'Travel',
  'Services',
  'Entertainment',
  'Health',
  'Transport',
] as const

function defaultReminderTypeForRecurring(recurringType: RecurringType, recurringPeriod: RecurringPeriod): ReminderTypeValue {
  if (recurringType === 'none') return 'none'
  if (recurringPeriod === 'weekly') return 'on_day'
  return 'in_advance'
}

function defaultRecurringPeriodForType(recurringType: RecurringType): RecurringPeriod {
  switch (recurringType) {
    case 'flexible':
      return 'weekly'
    case 'fixed_day':
      return 'monthly'
    default:
      return 'none'
  }
}

function isRecurringPeriodAllowed(recurringType: RecurringType, recurringPeriod: RecurringPeriod): boolean {
  if (recurringType === 'none') return recurringPeriod === 'none'
  if (recurringType === 'flexible') return recurringPeriod !== 'none'
  if (recurringType === 'fixed_day') return recurringPeriod !== 'none' && recurringPeriod !== 'weekly' && recurringPeriod !== 'biweekly'
  return false
}

function periodOptionsForRecurringType(recurringType: RecurringType) {
  return RECURRING_PERIOD_OPTIONS.filter((option) => isRecurringPeriodAllowed(recurringType, option.value))
}

function reminderTypeLabel(reminderType: ReminderTypeValue): string {
  const option = reminderTypeOptions.find((candidate) => candidate.value === reminderType)
  return option ? option.label : reminderType
}

interface ExpenseTypeFormLocationState {
  returnTo?: string
  expenseDraft?: {
    expense_type_id: string
    wallet_id: string
    amount: string
    date: string
    note: string
  }
}

interface ExpenseTypeFormState {
  parent_id: string
  name: string
  icon: string
  color: string
  description: string
  default_amount: string
  default_wallet_id: string
  recurring_type: RecurringType
  recurring_period: RecurringPeriod
  recurring_due_day: number
  reminder_type: ReminderTypeValue
  ios_category: string
  stopped: boolean
}

const INITIAL_FORM: ExpenseTypeFormState = {
  parent_id: '',
  name: '',
  icon: '',
  color: '#d94f3d',
  description: '',
  default_amount: '',
  default_wallet_id: '',
  recurring_type: 'none',
  recurring_period: 'none',
  recurring_due_day: 0,
  reminder_type: 'none',
  ios_category: '',
  stopped: false,
}

export default function ExpenseTypeFormPage() {
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigationState = location.state as ExpenseTypeFormLocationState | null
  const returnTo = !isEdit ? navigationState?.returnTo : undefined

  const [form, setForm] = useState<ExpenseTypeFormState>(INITIAL_FORM)
  const [parentTypes, setParentTypes] = useState<ExpenseType[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    expenseTypeAPI
      .list({ includeStopped: true })
      .then((r) => setParentTypes(r.expense_types.filter((et) => !et.parent_id)))
      .catch((err) => { console.error(err) })
    walletAPI
      .list({ includeStopped: false })
      .then((r) => setWallets(r.wallets))
      .catch((err) => { console.error(err) })
  }, [])

  useEffect(() => {
    if (!isEdit || !id) return
    setInitialLoading(true)
    expenseTypeAPI
      .get(Number(id))
      .then((et) => {
        const recurringType = et.recurring_type
        const recurringPeriod = isRecurringPeriodAllowed(recurringType, et.recurring_period)
          ? et.recurring_period
          : defaultRecurringPeriodForType(recurringType)

        setForm({
          parent_id: et.parent_id?.toString() ?? '',
          name: et.name,
          icon: et.icon,
          color: et.color || '#d94f3d',
          description: et.description,
          default_amount: et.default_amount ? Math.round(et.default_amount).toString() : '',
          default_wallet_id: et.default_wallet_id?.toString() ?? '',
          recurring_type: recurringType,
          recurring_period: recurringPeriod,
          recurring_due_day: recurringType === 'fixed_day' ? (et.recurring_due_day || 1) : et.recurring_due_day,
          reminder_type: (et.reminder_type ?? 'none') as ReminderTypeValue,
          ios_category: et.ios_category || '',
          stopped: et.stopped,
        })
      })
        .catch(() => setError(t('Failed to load expense type')))
      .finally(() => setInitialLoading(false))
      }, [id, isEdit, t])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const recurringPeriod = form.recurring_type === 'none'
        ? 'none'
        : isRecurringPeriodAllowed(form.recurring_type, form.recurring_period)
          ? form.recurring_period
          : defaultRecurringPeriodForType(form.recurring_type)

      const payload = {
        name: form.name,
        icon: form.icon || undefined,
        color: form.color || undefined,
        description: form.description || undefined,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        default_amount: form.default_amount ? Number(form.default_amount) : undefined,
        default_wallet_id: form.default_wallet_id ? Number(form.default_wallet_id) : null,
        recurring_type: form.recurring_type,
        recurring_period: recurringPeriod,
        recurring_due_day: form.recurring_type === 'fixed_day' ? Math.max(form.recurring_due_day, 1) : 0,
        reminder_type: form.recurring_type !== 'none' ? form.reminder_type : 'none',
        ios_category: form.ios_category || undefined,
        ...(isEdit ? { stopped: form.stopped } : {}),
      }
      if (isEdit && id) {
        await expenseTypeAPI.update(Number(id), payload)
      } else {
        const createdExpenseType = await expenseTypeAPI.create(payload)
        if (navigationState?.returnTo) {
          navigate(navigationState.returnTo, {
            state: {
              expenseDraft: {
                ...navigationState.expenseDraft,
                expense_type_id: createdExpenseType.id.toString(),
              },
              createdExpenseTypeId: createdExpenseType.id,
            },
          })
          return
        }
      }
      navigate('/expense-types')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to save expense type'))
    } finally {
      setLoading(false)
    }
  }

  function set<K extends keyof ExpenseTypeFormState>(key: K, value: ExpenseTypeFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function setRecurringType(value: RecurringType) {
    setForm((prev) => {
      if (value === 'none') {
        return {
          ...prev,
          recurring_type: value,
          recurring_period: 'none',
          recurring_due_day: 0,
          reminder_type: 'none',
        }
      }

      const nextRecurringPeriod = isRecurringPeriodAllowed(value, prev.recurring_period)
        ? prev.recurring_period
        : defaultRecurringPeriodForType(value)
      const previousPeriod = isRecurringPeriodAllowed(prev.recurring_type, prev.recurring_period)
        ? prev.recurring_period
        : defaultRecurringPeriodForType(prev.recurring_type)
      const previousDefault = defaultReminderTypeForRecurring(prev.recurring_type, previousPeriod)
      const nextReminderType = prev.reminder_type === 'none' || prev.reminder_type === previousDefault
        ? defaultReminderTypeForRecurring(value, nextRecurringPeriod)
        : prev.reminder_type

      return {
        ...prev,
        recurring_type: value,
        recurring_period: nextRecurringPeriod,
        recurring_due_day: value === 'fixed_day' ? (prev.recurring_due_day || 1) : 0,
        reminder_type: nextReminderType,
      }
    })
  }

  function setRecurringPeriod(value: RecurringPeriod) {
    setForm((prev) => {
      const previousDefault = defaultReminderTypeForRecurring(prev.recurring_type, prev.recurring_period)
      const nextReminderType = prev.recurring_type === 'none'
        ? 'none'
        : prev.reminder_type === 'none' || prev.reminder_type === previousDefault
          ? defaultReminderTypeForRecurring(prev.recurring_type, value)
          : prev.reminder_type

      return {
        ...prev,
        recurring_period: value,
        reminder_type: nextReminderType,
      }
    })
  }

  function handleClose() {
    if (returnTo) {
      navigate(returnTo, {
        state: {
          expenseDraft: navigationState?.expenseDraft,
        },
      })
      return
    }

    navigate('/expense-types')
  }

  if (initialLoading) {
    return (
      <div className="page">
        <div className="page__loading"><div className="loading-orb" /></div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page__header page__header--with-back">
        <button className="back-button" onClick={handleClose}>
          <ArrowLeftIcon />
        </button>
        <div>
          <h1>{isEdit ? t('Edit Expense Type') : t('New Expense Type')}</h1>
          <p>{isEdit ? t('Update expense type settings') : t('Create a new expense category')}</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="alert alert--error">{error}</div>}

        {/* Parent */}
        <div className="field">
          <label className="field__label">{t('Parent Type')}</label>
          <select
            className="field__input"
            value={form.parent_id}
            onChange={(e) => set('parent_id', e.target.value)}
          >
            <option value="">{t('None (top-level)')}</option>
            {parentTypes
              .filter((pt) => pt.id !== Number(id))
              .map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.icon} {pt.name}
                </option>
              ))}
          </select>
        </div>

        {/* Name */}
        <div className="field">
          <label className="field__label">{t('Name')} *</label>
          <input
            className="field__input"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={t('e.g. Groceries, Electricity')}
          />
        </div>

        {/* Icon & Color */}
        <div className="field-row">
          <div className="field field--flex1">
            <label className="field__label">{t('Icon')}</label>
            <IconPicker value={form.icon} onChange={(v) => set('icon', v)} />
          </div>
          <div className="field field--flex1">
            <label className="field__label">{t('Color')}</label>
            <ColorPicker value={form.color} onChange={(v) => set('color', v)} />
          </div>
        </div>

        {/* Description */}
        <div className="field">
          <label className="field__label">{t('Description')}</label>
          <input
            className="field__input"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder={t('Optional description')}
          />
        </div>

        {/* iOS Category */}
        <div className="field">
          <label className="field__label">{t('iOS Shortcut Category')}</label>
          <input
            className="field__input"
            list="ios-shortcut-category-options"
            value={form.ios_category}
            onChange={(e) => set('ios_category', e.target.value)}
            placeholder={t('e.g. Food & Drink, Transport')}
          />
          <datalist id="ios-shortcut-category-options">
            {iosShortcutCategoryOptions.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
          <small>{t('Used to map Apple Pay transactions from iOS Shortcuts')}</small>
        </div>

        {/* Default amount & wallet */}
        <div className="field-row">
          <div className="field field--flex1">
            <label className="field__label">{t('Default Amount')}</label>
            <AmountInput
              value={form.default_amount}
              onChange={(value) => set('default_amount', value)}
              placeholder="0"
              title="Default amount"
            />
          </div>
          <div className="field field--flex1">
            <label className="field__label">{t('Default Wallet')}</label>
            <select
              className="field__input"
              value={form.default_wallet_id}
              onChange={(e) => set('default_wallet_id', e.target.value)}
            >
              <option value="">{t('None')}</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.icon} {w.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Recurring settings */}
        <div className="field">
          <label className="field__label">{t('Recurring Type')}</label>
          <select
            className="field__input"
            value={form.recurring_type}
            onChange={(e) => setRecurringType(e.target.value as RecurringType)}
          >
            {RECURRING_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.label)}
              </option>
            ))}
          </select>
        </div>

        {form.recurring_type !== 'none' && (
          <>
            <div className="field-row">
              <div className="field field--flex1">
                <label className="field__label">{t('Recurring Period')}</label>
                <select
                  className="field__input"
                  value={form.recurring_period}
                  onChange={(e) => setRecurringPeriod(e.target.value as RecurringPeriod)}
                >
                  {periodOptionsForRecurringType(form.recurring_type).map((o) => (
                    <option key={o.value} value={o.value}>
                      {t(o.label)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field field--flex1">
                <label className="field__label">{t('Reminder Type')}</label>
                <select
                  className="field__input"
                  value={form.reminder_type}
                  onChange={(e) => set('reminder_type', e.target.value as ReminderTypeValue)}
                >
                  {reminderTypeOptions.filter((option) => option.value !== 'none').map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              </div>
              {form.recurring_type === 'fixed_day' && (
                <div className="field field--flex1">
                  <label className="field__label">{t('Due Day')}</label>
                  <select
                    className="field__input"
                    value={form.recurring_due_day}
                    onChange={(e) => set('recurring_due_day', Number(e.target.value))}
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <small>
              {t('Weekly recurring expenses default to On day. Automatic uses the app default reminder behavior for the selected schedule.')}
            </small>
          </>
        )}

        {/* Stopped (edit only) */}
        {isEdit && (
          <label className="field-check">
            <input
              type="checkbox"
              checked={form.stopped}
              onChange={(e) => set('stopped', e.target.checked)}
            />
            <span>{t('Mark as stopped')}</span>
          </label>
        )}

        {/* Preview */}
        <div className="form-preview">
          <div
            className="entity-card__icon"
            style={{ background: form.color }}
          >
            {form.icon || (form.name ? form.name.charAt(0).toUpperCase() : '?')}
          </div>
          <div>
            <strong>{form.name || t('Expense Type Name')}</strong>
            <span className="form-preview__sub">
              {t(RECURRING_TYPE_OPTIONS.find((o) => o.value === form.recurring_type)?.label ?? form.recurring_type)}
              {form.recurring_type !== 'none' &&
                form.recurring_period !== 'none' &&
                ` · ${t(RECURRING_PERIOD_OPTIONS.find((o) => o.value === form.recurring_period)?.label ?? form.recurring_period)}`}
              {form.recurring_type !== 'none' && form.reminder_type !== 'none' && ` · ${reminderTypeLabel(form.reminder_type)}`}
              {form.default_amount && ` · $${form.default_amount}`}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={loading || !form.name.trim()}
          >
            {loading ? t('Saving…') : isEdit ? t('Update Type') : t('Create Type')}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={handleClose}
          >
            {t('Cancel')}
          </button>
        </div>
      </form>
    </div>
  )
}
