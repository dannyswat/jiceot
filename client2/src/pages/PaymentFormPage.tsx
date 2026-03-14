import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

import { paymentAPI, walletAPI } from '../services/api'
import { formatCurrency } from '../common/currency'
import { toDateInputValue, formatDate } from '../common/date'
import type { Wallet } from '../types/wallet'
import type { Expense } from '../types/expense'

export default function PaymentFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const [form, setForm] = useState({
    wallet_id: '' as string,
    amount: '',
    date: toDateInputValue(new Date()),
    note: '',
  })
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [unbilledExpenses, setUnbilledExpenses] = useState<Expense[]>([])
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEdit)
  const [error, setError] = useState('')

  const selectedWallet = wallets.find((w) => w.id === Number(form.wallet_id))

  useEffect(() => {
    walletAPI
      .list({ includeStopped: false })
      .then((r) => setWallets(r.wallets))
      .catch(() => {})
  }, [])

  // Load unbilled expenses when credit wallet selected
  useEffect(() => {
    if (!selectedWallet?.is_credit) {
      setUnbilledExpenses([])
      setSelectedExpenseIds([])
      return
    }
    walletAPI
      .getUnbilledExpenses(selectedWallet.id)
      .then((r) => setUnbilledExpenses(r.expenses))
      .catch(() => setUnbilledExpenses([]))
  }, [selectedWallet])

  useEffect(() => {
    if (!isEdit || !id) return
    setInitialLoading(true)
    paymentAPI
      .get(Number(id))
      .then((p) => {
        setForm({
          wallet_id: p.wallet_id.toString(),
          amount: p.amount.toString(),
          date: toDateInputValue(p.date),
          note: p.note,
        })
      })
      .catch(() => setError('Failed to load payment'))
      .finally(() => setInitialLoading(false))
  }, [isEdit, id])

  // Auto-calculate amount from selected expenses
  useEffect(() => {
    if (selectedExpenseIds.length === 0) return
    const total = unbilledExpenses
      .filter((e) => selectedExpenseIds.includes(e.id))
      .reduce((s, e) => s + e.amount, 0)
    setForm((prev) => ({ ...prev, amount: total.toString() }))
  }, [selectedExpenseIds, unbilledExpenses])

  function toggleExpense(expenseId: number) {
    setSelectedExpenseIds((prev) =>
      prev.includes(expenseId) ? prev.filter((i) => i !== expenseId) : [...prev, expenseId],
    )
  }

  function selectAllExpenses() {
    setSelectedExpenseIds(unbilledExpenses.map((e) => e.id))
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        wallet_id: Number(form.wallet_id),
        amount: Number(form.amount),
        date: form.date,
        note: form.note || undefined,
        expense_ids: selectedExpenseIds.length > 0 ? selectedExpenseIds : undefined,
      }
      if (isEdit && id) {
        await paymentAPI.update(Number(id), payload)
      } else {
        await paymentAPI.create(payload)
      }
      navigate('/payments')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment')
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
        <button className="back-button" onClick={() => navigate('/payments')}>
          <ArrowLeftIcon />
        </button>
        <div>
          <h1>{isEdit ? 'Edit Payment' : 'New Payment'}</h1>
          <p>{isEdit ? 'Update payment details' : 'Record a wallet payment'}</p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        {error && <div className="alert alert--error">{error}</div>}

        {/* Wallet */}
        <div className="field">
          <label className="field__label">Wallet *</label>
          <select
            className="field__input"
            required
            value={form.wallet_id}
            onChange={(e) => set('wallet_id', e.target.value)}
          >
            <option value="">Select a wallet</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.icon} {w.name}
                {w.is_credit ? ' (Credit)' : w.is_cash ? ' (Cash)' : ''}
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
              placeholder="0.00"
            />
          </div>
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

        {/* Unbilled expenses for credit wallets */}
        {selectedWallet?.is_credit && unbilledExpenses.length > 0 && (
          <div className="field">
            <div className="field__label-row">
              <label className="field__label">Link Unbilled Expenses</label>
              <button type="button" className="link-button" onClick={selectAllExpenses}>
                Select all
              </button>
            </div>
            <div className="expense-checklist">
              {unbilledExpenses.map((exp) => (
                <label key={exp.id} className="expense-checklist__item">
                  <input
                    type="checkbox"
                    checked={selectedExpenseIds.includes(exp.id)}
                    onChange={() => toggleExpense(exp.id)}
                  />
                  <span className="expense-checklist__info">
                    <span>{exp.expense_type?.icon} {exp.expense_type?.name ?? 'Expense'}</span>
                    <small>{formatDate(exp.date)}</small>
                  </span>
                  <span className="expense-checklist__amount">{formatCurrency(exp.amount)}</span>
                </label>
              ))}
            </div>
            {selectedExpenseIds.length > 0 && (
              <p className="field-hint">
                {selectedExpenseIds.length} expense{selectedExpenseIds.length !== 1 ? 's' : ''} selected
                {' · '}Total: {formatCurrency(
                  unbilledExpenses
                    .filter((e) => selectedExpenseIds.includes(e.id))
                    .reduce((s, e) => s + e.amount, 0),
                )}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn--primary"
            disabled={loading || !form.wallet_id || !form.amount}
          >
            {loading ? 'Saving…' : isEdit ? 'Update Payment' : 'Create Payment'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate('/payments')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
