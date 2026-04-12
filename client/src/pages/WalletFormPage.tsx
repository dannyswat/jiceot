import { useState, useEffect } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

import { walletAPI, expenseTypeAPI } from '../services/api'
import { BILL_PERIOD_OPTIONS } from '../common/constants'
import IconPicker from '../components/IconPicker'
import ColorPicker from '../components/ColorPicker'
import { useI18n } from '../contexts/I18nContext'
import type { ExpenseType } from '../types/expense'

interface ExpenseDraftFormState {
  expense_type_id: string
  wallet_id: string
  amount: string
  date: string
  note: string
}

interface NewExpenseEntry {
  tempId: number
  expense_type_id: string
  amount: string
  note: string
}

type AmountMode = 'expenses-total' | 'manual'
type DiscrepancyMode = 'default-expense' | 'unexplained'

interface PaymentDraftFormState {
  wallet_id: string
  amount: string
  date: string
  note: string
}

interface PaymentDraftState {
  form: PaymentDraftFormState
  selectedExpenseIds: number[]
  newExpenses: NewExpenseEntry[]
  amountMode: AmountMode
  discrepancyMode: DiscrepancyMode
}

interface WalletFormLocationState {
  returnTo?: string
  expenseDraft?: ExpenseDraftFormState
  paymentDraft?: PaymentDraftState
  paymentReturnTo?: string
  paymentIsEdit?: boolean
}

export default function WalletFormPage() {
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigationState = location.state as WalletFormLocationState | null
  const returnTo = !isEdit ? navigationState?.returnTo : undefined

  const [form, setForm] = useState({
    name: '',
    icon: '',
    color: '#d94f3d',
    description: '',
    is_credit: false,
    is_cash: false,
    bill_period: 'none',
    bill_due_day: 0,
    default_expense_type_id: '' as string,
    stopped: false,
  })
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    expenseTypeAPI
      .list()
      .then((res) => setExpenseTypes(res.expense_types))
      .catch((err) => { console.error(err) })
  }, [])

  useEffect(() => {
    if (!isEdit || !id) return
    setInitialLoading(true)
    walletAPI
      .get(Number(id))
      .then((w) => {
        setForm({
          name: w.name,
          icon: w.icon,
          color: w.color || '#d94f3d',
          description: w.description,
          is_credit: w.is_credit,
          is_cash: w.is_cash,
          bill_period: w.bill_period || 'none',
          bill_due_day: w.bill_due_day,
          default_expense_type_id: w.default_expense_type_id?.toString() ?? '',
          stopped: w.stopped,
        })
      })
      .catch(() => setError('Failed to load wallet'))
        .catch(() => setError(t('Failed to load wallet')))
      .finally(() => setInitialLoading(false))
      }, [id, isEdit, t])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        name: form.name,
        icon: form.icon || undefined,
        color: form.color || undefined,
        description: form.description || undefined,
        is_credit: form.is_credit,
        is_cash: form.is_cash,
        bill_period: form.bill_period !== 'none' ? form.bill_period : undefined,
        bill_due_day: form.bill_due_day || undefined,
        default_expense_type_id: form.default_expense_type_id
          ? Number(form.default_expense_type_id)
          : null,
        ...(isEdit ? { stopped: form.stopped } : {}),
      }
      if (isEdit && id) {
        await walletAPI.update(Number(id), payload)
      } else {
        const createdWallet = await walletAPI.create(payload)
        if (returnTo) {
          if (navigationState?.paymentDraft) {
            navigate(returnTo, {
              state: {
                returnTo: navigationState.paymentReturnTo,
                paymentDraft: {
                  form: {
                    ...navigationState.paymentDraft.form,
                    wallet_id: createdWallet.id.toString(),
                  },
                  selectedExpenseIds: [],
                  newExpenses: [],
                  amountMode: navigationState.paymentIsEdit ? navigationState.paymentDraft.amountMode : 'expenses-total',
                  discrepancyMode: 'unexplained',
                },
              },
            })
            return
          }

          navigate(returnTo, {
            state: {
              expenseDraft: {
                ...navigationState?.expenseDraft,
                wallet_id: createdWallet.id.toString(),
              },
            },
          })
          return
        }
      }
      navigate('/wallets')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to save wallet'))
    } finally {
      setLoading(false)
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleClose() {
    if (returnTo) {
      if (navigationState?.paymentDraft) {
        navigate(returnTo, {
          state: {
            returnTo: navigationState.paymentReturnTo,
            paymentDraft: navigationState.paymentDraft,
          },
        })
        return
      }

      navigate(returnTo, {
        state: {
          expenseDraft: navigationState?.expenseDraft,
        },
      })
      return
    }

    navigate('/wallets')
  }

  if (initialLoading) {
    return (
      <div className="page">
        <div className="page__loading">
          <div className="loading-orb" />
        </div>
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
          <h1>{isEdit ? t('Edit Wallet') : t('New Wallet')}</h1>
          <p>{isEdit ? t('Update wallet configuration') : t('Create a new money source')}</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="alert alert--error">{error}</div>}

        {/* Name */}
        <div className="field">
          <label className="field__label">{t('Name')} *</label>
          <input
            className="field__input"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={t('e.g. Visa Gold, Cash Wallet')}
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

        {/* Type toggles */}
        <div className="field-row">
          <label className="field-check">
            <input
              type="checkbox"
              checked={form.is_credit}
              onChange={(e) => {
                set('is_credit', e.target.checked)
                if (e.target.checked) set('is_cash', false)
              }}
            />
            <span>{t('Credit wallet')}</span>
          </label>
          <label className="field-check">
            <input
              type="checkbox"
              checked={form.is_cash}
              onChange={(e) => {
                set('is_cash', e.target.checked)
                if (e.target.checked) set('is_credit', false)
              }}
            />
            <span>{t('Cash wallet')}</span>
          </label>
        </div>

        {/* Billing */}
        <div className="field-row">
          <div className="field field--flex1">
            <label className="field__label">{t('Billing Period')}</label>
            <select
              className="field__input"
              value={form.bill_period}
              onChange={(e) => set('bill_period', e.target.value)}
            >
              {BILL_PERIOD_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {t(o.label)}
                </option>
              ))}
            </select>
          </div>
          <div className="field field--flex1">
            <label className="field__label">{t('Due Day')}</label>
            <select
              className="field__input"
              value={form.bill_due_day}
              onChange={(e) => set('bill_due_day', Number(e.target.value))}
            >
              <option value={0}>{t('No specific day')}</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Default expense type */}
        <div className="field">
          <label className="field__label">{t('Default Expense Type')}</label>
          <select
            className="field__input"
            value={form.default_expense_type_id}
            onChange={(e) => set('default_expense_type_id', e.target.value)}
          >
            <option value="">{t('None')}</option>
            {expenseTypes.map((et) => (
              <option key={et.id} value={et.id}>
                {et.icon} {et.name}
              </option>
            ))}
          </select>
          <p className="field-hint">{t('Automatically used when recording expenses for this wallet')}</p>
        </div>

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
            <strong>{form.name || t('Wallet Name')}</strong>
            <span className="form-preview__sub">
              {form.is_credit ? t('Credit') : form.is_cash ? t('Cash') : t('Standard')}
              {form.bill_period !== 'none' &&
                ` · ${t(BILL_PERIOD_OPTIONS.find((o) => o.value === form.bill_period)?.label ?? form.bill_period)}`}
              {form.bill_due_day > 0 && ` · ${t('Due day')} ${form.bill_due_day}`}
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
            {loading ? t('Saving…') : isEdit ? t('Update Wallet') : t('Create Wallet')}
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
