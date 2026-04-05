import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'

import AmountInput from '../components/AmountInput'
import ExpenseTypePicker from '../components/ExpenseTypePicker'
import { expenseAPI, expenseTypeAPI, walletAPI } from '../services/api'
import { toDateInputValue } from '../common/date'
import type { ExpenseType } from '../types/expense'
import type { Wallet } from '../types/wallet'

export default function ExpenseFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
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
  const [walletPickerOpen, setWalletPickerOpen] = useState(!isEdit)

  useEffect(() => {
    expenseTypeAPI
      .list({ includeStopped: false })
      .then((r) => setExpenseTypes(r.expense_types))
      .catch((err) => { console.error(err) })
    walletAPI
      .list({ includeStopped: false })
      .then((r) => setWallets(r.wallets))
      .catch((err) => { console.error(err) })
  }, [])

  // Apply query params for preselection (expense_type_id, wallet_id, date)
  useEffect(() => {
    if (isEdit) return
    const typeId = searchParams.get('expense_type_id')
    const walletId = searchParams.get('wallet_id')
    const date = searchParams.get('date')

    if (typeId) {
      if (expenseTypes.length > 0) {
        handleExpenseTypeSelect(typeId)
      }
    }
    if (walletId) {
      set('wallet_id', walletId)
      setWalletPickerOpen(false)
    }
    if (date) set('date', date)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, searchParams, expenseTypes]) // re-run when expenseTypes load

  useEffect(() => {
    if (!isEdit || !id) return
    setInitialLoading(true)
    expenseAPI
      .get(Number(id))
      .then((exp) => {
        setForm({
          expense_type_id: exp.expense_type_id.toString(),
          wallet_id: exp.wallet_id?.toString() ?? '',
          amount: Math.round(exp.amount).toString(),
          date: toDateInputValue(exp.date),
          note: exp.note,
        })
        setWalletPickerOpen(false)
      })
      .catch(() => setError('Failed to load expense'))
      .finally(() => setInitialLoading(false))
  }, [isEdit, id])

  function handleExpenseTypeSelect(typeId: string) {
    set('expense_type_id', typeId)
    if (isEdit || !typeId) return
    const et = expenseTypes.find((t) => t.id === Number(typeId))
    if (!et) return
    if (et.default_amount && !form.amount) {
      set('amount', Math.round(et.default_amount).toString())
    }
    if (et.default_wallet_id && !form.wallet_id) {
      set('wallet_id', et.default_wallet_id.toString())
      setWalletPickerOpen(false)
    }
  }

  function handleWalletSelect(walletId: string) {
    set('wallet_id', walletId)
    setWalletPickerOpen(false)
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
  const selectedWallet = wallets.find((wallet) => wallet.id === Number(form.wallet_id))

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

        {/* Expense Type - popup trigger */}
        <div className="field">
          <label className="field__label">Expense Type *</label>
          <ExpenseTypePicker
            expenseTypes={expenseTypes}
            selectedTypeId={form.expense_type_id}
            onSelect={handleExpenseTypeSelect}
            title="Select Expense Type"
          />
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
            <AmountInput
              value={form.amount}
              onChange={(value) => set('amount', value)}
              placeholder={selectedType?.default_amount ? `Default: ${Math.round(selectedType.default_amount)}` : '0'}
              title="Expense amount"
            />
          </div>
        </div>

        {/* Wallet - visual grid */}
        <div className="field">
          <div className="field__label-row">
            <label className="field__label">Wallet</label>
            {selectedWallet && !walletPickerOpen && (
              <button type="button" className="link-button" onClick={() => setWalletPickerOpen(true)}>
                Select other
              </button>
            )}
          </div>
          {selectedWallet && !walletPickerOpen ? (
            <div className="wallet-select-grid">
              <button
                type="button"
                className="wallet-select-item wallet-select-item--active"
                onClick={() => setWalletPickerOpen(true)}
              >
                <span className="wallet-select-item__icon" style={{ background: selectedWallet.color || '#577590' }}>
                  {selectedWallet.icon || selectedWallet.name.charAt(0).toUpperCase()}
                </span>
                <span className="wallet-select-item__name">{selectedWallet.name}</span>
                {(selectedWallet.is_credit || selectedWallet.is_cash) && (
                  <span className="wallet-select-item__badge">
                    {selectedWallet.is_credit ? 'Credit' : 'Cash'}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="wallet-select-grid">
              <button
                type="button"
                className={`wallet-select-item${form.wallet_id === '' ? ' wallet-select-item--active' : ''}`}
                onClick={() => handleWalletSelect('')}
              >
                <span className="wallet-select-item__icon" style={{ background: '#3d405b' }}>—</span>
                <span className="wallet-select-item__name">None</span>
              </button>
              {wallets.map((wallet) => (
                <button
                  key={wallet.id}
                  type="button"
                  className={`wallet-select-item${form.wallet_id === wallet.id.toString() ? ' wallet-select-item--active' : ''}`}
                  onClick={() => handleWalletSelect(wallet.id.toString())}
                >
                  <span className="wallet-select-item__icon" style={{ background: wallet.color || '#577590' }}>
                    {wallet.icon || wallet.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="wallet-select-item__name">{wallet.name}</span>
                  {(wallet.is_credit || wallet.is_cash) && (
                    <span className="wallet-select-item__badge">
                      {wallet.is_credit ? 'Credit' : 'Cash'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
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
