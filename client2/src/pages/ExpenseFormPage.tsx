import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

import { expenseAPI, expenseTypeAPI, walletAPI } from '../services/api'
import { toDateInputValue } from '../common/date'
import type { ExpenseType } from '../types/expense'
import type { Wallet } from '../types/wallet'

export default function ExpenseFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    expense_type_id: '' as string,
    wallet_id: '' as string,
    amount: '',
    date: toDateInputValue(new Date()),
    note: '',
  })
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEdit)
  const [error, setError] = useState('')

  useEffect(() => {
    expenseTypeAPI
      .list({ includeStopped: false })
      .then((r) => setExpenseTypes(r.expense_types))
      .catch(() => {})
    walletAPI
      .list({ includeStopped: false })
      .then((r) => setWallets(r.wallets))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit || !id) return
    setInitialLoading(true)
    expenseAPI
      .get(Number(id))
      .then((exp) => {
        setForm({
          expense_type_id: exp.expense_type_id.toString(),
          wallet_id: exp.wallet_id?.toString() ?? '',
          amount: exp.amount.toString(),
          date: toDateInputValue(exp.date),
          note: exp.note,
        })
      })
      .catch(() => setError('Failed to load expense'))
      .finally(() => setInitialLoading(false))
  }, [isEdit, id])

  // Auto-fill defaults when expense type changes (new only)
  function handleExpenseTypeChange(typeId: string) {
    set('expense_type_id', typeId)
    if (isEdit || !typeId) return
    const et = expenseTypes.find((t) => t.id === Number(typeId))
    if (!et) return
    if (et.default_amount && !form.amount) {
      set('amount', et.default_amount.toString())
    }
    if (et.default_wallet_id && !form.wallet_id) {
      set('wallet_id', et.default_wallet_id.toString())
    }
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        expense_type_id: Number(form.expense_type_id),
        wallet_id: form.wallet_id ? Number(form.wallet_id) : null,
        amount: Number(form.amount),
        date: form.date,
        note: form.note || undefined,
      }
      if (isEdit && id) {
        await expenseAPI.update(Number(id), payload)
      } else {
        await expenseAPI.create(payload)
      }
      navigate('/expenses')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expense')
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

  const selectedType = expenseTypes.find((et) => et.id === Number(form.expense_type_id))

  return (
    <div className="page">
      <div className="page__header page__header--with-back">
        <button className="back-button" onClick={() => navigate('/expenses')}>
          <ArrowLeftIcon />
        </button>
        <div>
          <h1>{isEdit ? 'Edit Expense' : 'New Expense'}</h1>
          <p>{isEdit ? 'Update expense details' : 'Record a new expense'}</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="alert alert--error">{error}</div>}

        {/* Expense Type */}
        <div className="field">
          <label className="field__label">Expense Type *</label>
          <select
            className="field__input"
            required
            value={form.expense_type_id}
            onChange={(e) => handleExpenseTypeChange(e.target.value)}
          >
            <option value="">Select a type</option>
            {expenseTypes.map((et) => (
              <option key={et.id} value={et.id}>
                {et.icon} {et.name}
                {et.parent ? ` (${et.parent.name})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Date & Amount */}
        <div className="field-row">
          <div className="field field--flex1">
            <label className="field__label">Date *</label>
            <input
              className="field__input"
              type="date"
              required
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <div className="field field--flex1">
            <label className="field__label">Amount *</label>
            <input
              className="field__input"
              type="number"
              step="0.01"
              min="0"
              required
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder={selectedType?.default_amount ? `Default: ${selectedType.default_amount}` : '0.00'}
            />
          </div>
        </div>

        {/* Wallet */}
        <div className="field">
          <label className="field__label">Wallet</label>
          <select
            className="field__input"
            value={form.wallet_id}
            onChange={(e) => set('wallet_id', e.target.value)}
          >
            <option value="">No wallet</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.icon} {w.name}
                {w.is_credit ? ' (Credit)' : w.is_cash ? ' (Cash)' : ''}
              </option>
            ))}
          </select>
          <p className="field-hint">Link this expense to a wallet for billing tracking</p>
        </div>

        {/* Note */}
        <div className="field">
          <label className="field__label">Note</label>
          <input
            className="field__input"
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder="Optional note"
          />
        </div>

        {/* Preview */}
        {selectedType && (
          <div className="form-preview">
            <div
              className="entity-card__icon"
              style={{ background: selectedType.color || '#577590' }}
            >
              {selectedType.icon || selectedType.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <strong>{selectedType.name}</strong>
              <span className="form-preview__sub">
                {form.amount ? `$${form.amount}` : 'No amount'}
                {form.date && ` · ${form.date}`}
                {form.wallet_id && (() => {
                  const w = wallets.find((w) => w.id === Number(form.wallet_id))
                  return w ? ` · ${w.icon} ${w.name}` : ''
                })()}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={loading || !form.expense_type_id || !form.amount}
          >
            {loading ? 'Saving…' : isEdit ? 'Update Expense' : 'Create Expense'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate('/expenses')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
