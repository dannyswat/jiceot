import { useState, useEffect, type ChangeEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

import { expenseTypeAPI, walletAPI } from '../services/api'
import {
  RECURRING_TYPE_OPTIONS,
  RECURRING_PERIOD_OPTIONS,
} from '../common/constants'
import IconPicker from '../components/IconPicker'
import ColorPicker from '../components/ColorPicker'
import type { ExpenseType, RecurringPeriod, RecurringType } from '../types/expense'
import type { Wallet } from '../types/wallet'

function normalizeAmountInput(value: string): string {
  const digitsOnly = value.replace(/\D/g, '')
  if (!digitsOnly) {
    return ''
  }

  return digitsOnly.replace(/^0+(?=\d)/, '')
}

export default function ExpenseTypeFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    parent_id: '' as string,
    name: '',
    icon: '',
    color: '#d94f3d',
    description: '',
    default_amount: '',
    default_wallet_id: '' as string,
    recurring_type: 'none' as RecurringType,
    recurring_period: 'none' as RecurringPeriod,
    recurring_due_day: 0,
    stopped: false,
  })
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
        setForm({
          parent_id: et.parent_id?.toString() ?? '',
          name: et.name,
          icon: et.icon,
          color: et.color || '#d94f3d',
          description: et.description,
          default_amount: et.default_amount ? Math.round(et.default_amount).toString() : '',
          default_wallet_id: et.default_wallet_id?.toString() ?? '',
          recurring_type: et.recurring_type,
          recurring_period: et.recurring_period,
          recurring_due_day: et.recurring_due_day,
          stopped: et.stopped,
        })
      })
      .catch(() => setError('Failed to load expense type'))
      .finally(() => setInitialLoading(false))
  }, [isEdit, id])

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
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        default_amount: form.default_amount ? Number(form.default_amount) : undefined,
        default_wallet_id: form.default_wallet_id ? Number(form.default_wallet_id) : null,
        recurring_type: form.recurring_type,
        recurring_period: form.recurring_type !== 'none' ? form.recurring_period : ('none' as RecurringPeriod),
        recurring_due_day: form.recurring_type === 'fixed_day' ? form.recurring_due_day : 0,
        ...(isEdit ? { stopped: form.stopped } : {}),
      }
      if (isEdit && id) {
        await expenseTypeAPI.update(Number(id), payload)
      } else {
        await expenseTypeAPI.create(payload)
      }
      navigate('/expense-types')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense type')
    } finally {
      setLoading(false)
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
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
        <button className="back-button" onClick={() => navigate('/expense-types')}>
          <ArrowLeftIcon />
        </button>
        <div>
          <h1>{isEdit ? 'Edit Expense Type' : 'New Expense Type'}</h1>
          <p>{isEdit ? 'Update expense type settings' : 'Create a new expense category'}</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="alert alert--error">{error}</div>}

        {/* Parent */}
        <div className="field">
          <label className="field__label">Parent Type</label>
          <select
            className="field__input"
            value={form.parent_id}
            onChange={(e) => set('parent_id', e.target.value)}
          >
            <option value="">None (top-level)</option>
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
          <label className="field__label">Name *</label>
          <input
            className="field__input"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Groceries, Electricity"
          />
        </div>

        {/* Icon & Color */}
        <div className="field-row">
          <div className="field field--flex1">
            <label className="field__label">Icon</label>
            <IconPicker value={form.icon} onChange={(v) => set('icon', v)} />
          </div>
          <div className="field field--flex1">
            <label className="field__label">Color</label>
            <ColorPicker value={form.color} onChange={(v) => set('color', v)} />
          </div>
        </div>

        {/* Description */}
        <div className="field">
          <label className="field__label">Description</label>
          <input
            className="field__input"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Optional description"
          />
        </div>

        {/* Default amount & wallet */}
        <div className="field-row">
          <div className="field field--flex1">
            <label className="field__label">Default Amount</label>
            <input
              className="field__input"
              type="number"
              step="1"
              min="0"
              value={form.default_amount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => set('default_amount', normalizeAmountInput(e.currentTarget.value))}
              placeholder="0"
            />
          </div>
          <div className="field field--flex1">
            <label className="field__label">Default Wallet</label>
            <select
              className="field__input"
              value={form.default_wallet_id}
              onChange={(e) => set('default_wallet_id', e.target.value)}
            >
              <option value="">None</option>
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
          <label className="field__label">Recurring Type</label>
          <select
            className="field__input"
            value={form.recurring_type}
            onChange={(e) => set('recurring_type', e.target.value as RecurringType)}
          >
            {RECURRING_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {form.recurring_type !== 'none' && (
          <>
            <div className="field-row">
              <div className="field field--flex1">
                <label className="field__label">Recurring Period</label>
                <select
                  className="field__input"
                  value={form.recurring_period}
                  onChange={(e) => set('recurring_period', e.target.value as RecurringPeriod)}
                >
                  {RECURRING_PERIOD_OPTIONS.filter((o) => o.value !== 'none').map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {form.recurring_type === 'fixed_day' && (
                <div className="field field--flex1">
                  <label className="field__label">Due Day</label>
                  <select
                    className="field__input"
                    value={form.recurring_due_day}
                    onChange={(e) => set('recurring_due_day', Number(e.target.value))}
                  >
                    <option value={0}>No specific day</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
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
            <span>Mark as stopped</span>
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
            <strong>{form.name || 'Expense Type Name'}</strong>
            <span className="form-preview__sub">
              {RECURRING_TYPE_OPTIONS.find((o) => o.value === form.recurring_type)?.label}
              {form.recurring_type !== 'none' &&
                form.recurring_period !== 'none' &&
                ` · ${RECURRING_PERIOD_OPTIONS.find((o) => o.value === form.recurring_period)?.label}`}
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
            {loading ? 'Saving…' : isEdit ? 'Update Type' : 'Create Type'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate('/expense-types')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
