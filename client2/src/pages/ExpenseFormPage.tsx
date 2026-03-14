import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeftIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

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
  const [typePickerOpen, setTypePickerOpen] = useState(false)
  const [typeSearch, setTypeSearch] = useState('')

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
      // Defer to after expenseTypes are loaded so handleExpenseTypeSelect can apply defaults
      if (expenseTypes.length > 0) {
        handleExpenseTypeSelect(typeId)
      }
    }
    if (walletId) set('wallet_id', walletId)
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
      })
      .catch(() => setError('Failed to load expense'))
      .finally(() => setInitialLoading(false))
  }, [isEdit, id])

  function handleExpenseTypeSelect(typeId: string) {
    set('expense_type_id', typeId)
    setTypePickerOpen(false)
    setTypeSearch('')
    if (isEdit || !typeId) return
    const et = expenseTypes.find((t) => t.id === Number(typeId))
    if (!et) return
    if (et.default_amount && !form.amount) {
      set('amount', Math.round(et.default_amount).toString())
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

  // Group expense types by parent
  const topLevel = expenseTypes.filter((et) => !et.parent_id)
  const filteredTypes = typeSearch
    ? expenseTypes.filter((et) =>
        et.name.toLowerCase().includes(typeSearch.toLowerCase())
      )
    : null

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
          <button
            type="button"
            className="field__input type-picker-trigger"
            onClick={() => setTypePickerOpen(true)}
          >
            {selectedType ? (
              <span className="type-picker-trigger__value">
                <span className="type-picker-trigger__icon" style={{ background: selectedType.color || '#577590' }}>
                  {selectedType.icon || selectedType.name.charAt(0).toUpperCase()}
                </span>
                {selectedType.name}
                {selectedType.parent ? ` (${selectedType.parent.name})` : ''}
              </span>
            ) : (
              <span className="type-picker-trigger__placeholder">Select a type…</span>
            )}
          </button>
        </div>

        {/* Expense Type Picker Modal */}
        {typePickerOpen && (
          <>
            <div className="modal-backdrop" onClick={() => { setTypePickerOpen(false); setTypeSearch('') }} />
            <div className="modal-wrap">
              <div className="modal type-picker__modal">
                <div className="modal__header">
                  <h3>Select Expense Type</h3>
                  <button type="button" onClick={() => { setTypePickerOpen(false); setTypeSearch('') }}>
                    <XMarkIcon />
                  </button>
                </div>
                <div className="type-picker__search">
                  <MagnifyingGlassIcon />
                  <input
                    type="text"
                    value={typeSearch}
                    onChange={(e) => setTypeSearch(e.target.value)}
                    placeholder="Search types…"
                  />
                </div>
                <div className="type-picker__list">
                  {filteredTypes ? (
                    filteredTypes.length > 0 ? (
                      filteredTypes.map((et) => (
                        <button
                          key={et.id}
                          type="button"
                          className={`type-picker__item${form.expense_type_id === et.id.toString() ? ' type-picker__item--active' : ''}`}
                          onClick={() => handleExpenseTypeSelect(et.id.toString())}
                        >
                          <span className="type-picker__item-icon" style={{ background: et.color || '#577590' }}>
                            {et.icon || et.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="type-picker__item-name">{et.name}</span>
                          {et.parent && <span className="type-picker__item-parent">{et.parent.name}</span>}
                        </button>
                      ))
                    ) : (
                      <p className="type-picker__empty">No types match "{typeSearch}"</p>
                    )
                  ) : (
                    topLevel.map((parent) => {
                      const children = expenseTypes.filter((et) => et.parent_id === parent.id)
                      return (
                        <div key={parent.id} className="type-picker__group">
                          <button
                            type="button"
                            className={`type-picker__item${form.expense_type_id === parent.id.toString() ? ' type-picker__item--active' : ''}`}
                            onClick={() => handleExpenseTypeSelect(parent.id.toString())}
                          >
                            <span className="type-picker__item-icon" style={{ background: parent.color || '#577590' }}>
                              {parent.icon || parent.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="type-picker__item-name">{parent.name}</span>
                          </button>
                          {children.map((child) => (
                            <button
                              key={child.id}
                              type="button"
                              className={`type-picker__item type-picker__item--child${form.expense_type_id === child.id.toString() ? ' type-picker__item--active' : ''}`}
                              onClick={() => handleExpenseTypeSelect(child.id.toString())}
                            >
                              <span className="type-picker__item-icon" style={{ background: child.color || '#577590' }}>
                                {child.icon || child.name.charAt(0).toUpperCase()}
                              </span>
                              <span className="type-picker__item-name">{child.name}</span>
                            </button>
                          ))}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </>
        )}

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
              step="1"
              min="0"
              required
              value={form.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder={selectedType?.default_amount ? `Default: ${Math.round(selectedType.default_amount)}` : '0'}
            />
          </div>
        </div>

        {/* Wallet - visual grid */}
        <div className="field">
          <label className="field__label">Wallet</label>
          <div className="wallet-select-grid">
            <button
              type="button"
              className={`wallet-select-item${form.wallet_id === '' ? ' wallet-select-item--active' : ''}`}
              onClick={() => set('wallet_id', '')}
            >
              <span className="wallet-select-item__icon" style={{ background: '#3d405b' }}>—</span>
              <span className="wallet-select-item__name">None</span>
            </button>
            {wallets.map((w) => (
              <button
                key={w.id}
                type="button"
                className={`wallet-select-item${form.wallet_id === w.id.toString() ? ' wallet-select-item--active' : ''}`}
                onClick={() => set('wallet_id', w.id.toString())}
              >
                <span className="wallet-select-item__icon" style={{ background: w.color || '#577590' }}>
                  {w.icon || w.name.charAt(0).toUpperCase()}
                </span>
                <span className="wallet-select-item__name">{w.name}</span>
                {(w.is_credit || w.is_cash) && (
                  <span className="wallet-select-item__badge">
                    {w.is_credit ? 'Credit' : 'Cash'}
                  </span>
                )}
              </button>
            ))}
          </div>
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
