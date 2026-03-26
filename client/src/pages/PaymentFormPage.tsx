import { useEffect, useState, type ChangeEvent } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeftIcon, PlusIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

import { paymentAPI, walletAPI, expenseAPI, expenseTypeAPI } from '../services/api'
import { formatCurrency } from '../common/currency'
import { toDateInputValue, formatDate } from '../common/date'
import type { Wallet } from '../types/wallet'
import type { Expense, ExpenseType } from '../types/expense'

interface NewExpenseEntry {
  tempId: number
  expense_type_id: string
  amount: string
  note: string
}

type AmountMode = 'expenses-total' | 'manual'
type DiscrepancyMode = 'default-expense' | 'unexplained'

function mergeExpenses(linkedExpenses: Expense[], unbilledExpenses: Expense[]): Expense[] {
  const map = new Map<number, Expense>()
  for (const expense of linkedExpenses) {
    map.set(expense.id, expense)
  }
  for (const expense of unbilledExpenses) {
    map.set(expense.id, expense)
  }
  return Array.from(map.values())
}

function formatAmountInput(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return ''
  }
  return Math.round(amount).toString()
}

function normalizeAmountInput(value: string): string {
  const digitsOnly = value.replace(/\D/g, '')
  if (!digitsOnly) {
    return ''
  }

  return digitsOnly.replace(/^0+(?=\d)/, '')
}

export default function PaymentFormPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)
  const presetWalletId = searchParams.get('wallet_id') ?? ''
  const presetDate = searchParams.get('date') ?? ''
  const navigationState = location.state as { returnTo?: string } | null
  const returnTo = !isEdit ? navigationState?.returnTo ?? '/payments' : '/payments'

  const [form, setForm] = useState({
    wallet_id: '' as string,
    amount: '',
    date: toDateInputValue(new Date()),
    note: '',
  })
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [unbilledExpenses, setUnbilledExpenses] = useState<Expense[]>([])
  const [linkedExpenses, setLinkedExpenses] = useState<Expense[]>([])
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<number[]>([])
  const [newExpenses, setNewExpenses] = useState<NewExpenseEntry[]>([])
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEdit)
  const [error, setError] = useState('')
  const [walletPickerOpen, setWalletPickerOpen] = useState(!isEdit)
  const [amountMode, setAmountMode] = useState<AmountMode>(isEdit ? 'manual' : 'expenses-total')
  const [discrepancyMode, setDiscrepancyMode] = useState<DiscrepancyMode>('unexplained')

  // Type picker state for new expense
  const [typePickerOpen, setTypePickerOpen] = useState(false)
  const [typePickerTarget, setTypePickerTarget] = useState<number | null>(null)
  const [typeSearch, setTypeSearch] = useState('')

  const selectedWallet = wallets.find((w) => w.id === Number(form.wallet_id))
  const allExpenses = mergeExpenses(linkedExpenses, unbilledExpenses)
  const linkedTotal = allExpenses
    .filter((expense) => selectedExpenseIds.includes(expense.id))
    .reduce((sum, expense) => sum + expense.amount, 0)
  const validNewExpenses = newExpenses.filter((expense) => expense.expense_type_id && Number(expense.amount) > 0)
  const newTotal = validNewExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0)
  const expenseGrandTotal = Math.round(linkedTotal + newTotal)
  const paymentAmount = Number(form.amount) || 0
  const discrepancy = paymentAmount - expenseGrandTotal
  const hasExpenses = selectedExpenseIds.length > 0 || newExpenses.length > 0
  const canCreateDefaultDiscrepancyExpense = discrepancy > 0 && Boolean(selectedWallet?.default_expense_type_id) && !selectedWallet?.is_cash
  const defaultExpenseType = selectedWallet?.default_expense_type_id
    ? expenseTypes.find((type) => type.id === selectedWallet.default_expense_type_id)
    : undefined

  useEffect(() => {
    walletAPI
      .list({ includeStopped: false })
      .then((r) => setWallets(r.wallets))
      .catch((err) => { console.error(err) })
    expenseTypeAPI
      .list({ includeStopped: false })
      .then((r) => setExpenseTypes(r.expense_types))
      .catch((err) => { console.error(err) })
  }, [])

  useEffect(() => {
    if (isEdit) return
    setForm((prev) => ({
      ...prev,
      wallet_id: presetWalletId || prev.wallet_id,
      date: presetDate || prev.date,
    }))
    if (presetWalletId) {
      setWalletPickerOpen(false)
    }
  }, [isEdit, presetDate, presetWalletId])

  // Load unbilled expenses when wallet selected
  useEffect(() => {
    if (!selectedWallet) {
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
          amount: Math.round(p.amount).toString(),
          date: toDateInputValue(p.date),
          note: p.note,
        })
        setAmountMode('manual')
        setWalletPickerOpen(false)
        // Load existing linked expenses for edit
        return expenseAPI.list({ paymentId: p.id })
      })
      .then((r) => {
        if (r.expenses.length > 0) {
          setLinkedExpenses(r.expenses)
          setSelectedExpenseIds(r.expenses.map((e) => e.id))
        }
      })
      .catch(() => setError('Failed to load payment'))
      .finally(() => setInitialLoading(false))
  }, [isEdit, id])

  useEffect(() => {
    if (amountMode !== 'expenses-total') {
      return
    }

    const nextAmount = formatAmountInput(expenseGrandTotal)
    setForm((prev) => (prev.amount === nextAmount ? prev : { ...prev, amount: nextAmount }))
  }, [amountMode, expenseGrandTotal])

  useEffect(() => {
    if (canCreateDefaultDiscrepancyExpense && discrepancyMode === 'unexplained' && !hasExpenses) {
      setDiscrepancyMode('default-expense')
      return
    }

    if (!canCreateDefaultDiscrepancyExpense && discrepancyMode === 'default-expense') {
      setDiscrepancyMode('unexplained')
    }
  }, [canCreateDefaultDiscrepancyExpense, discrepancyMode, hasExpenses])

  function toggleExpense(expenseId: number) {
    setSelectedExpenseIds((prev) =>
      prev.includes(expenseId) ? prev.filter((i) => i !== expenseId) : [...prev, expenseId],
    )
  }

  function selectAllExpenses() {
    setSelectedExpenseIds(allExpenses.map((e) => e.id))
  }

  function deselectAllExpenses() {
    setSelectedExpenseIds([])
  }

  function handleWalletSelect(walletId: string) {
    if (walletId === form.wallet_id) {
      setWalletPickerOpen(false)
      return
    }

    setForm((prev) => ({ ...prev, wallet_id: walletId }))
    setLinkedExpenses([])
    setUnbilledExpenses([])
    setSelectedExpenseIds([])
    setNewExpenses([])
    setDiscrepancyMode('unexplained')
    if (!isEdit) {
      setAmountMode('expenses-total')
    }
    setWalletPickerOpen(false)
  }

  function addNewExpense() {
    const defaultTypeId = selectedWallet?.default_expense_type_id
    const entry: NewExpenseEntry = {
      tempId: Date.now(),
      expense_type_id: defaultTypeId ? defaultTypeId.toString() : '',
      amount: '',
      note: '',
    }
    // If wallet has a default expense type, pre-fill amount from it
    if (defaultTypeId) {
      const et = expenseTypes.find((t) => t.id === defaultTypeId)
      if (et?.default_amount) {
        entry.amount = Math.round(et.default_amount).toString()
      }
    }
    setNewExpenses((prev) => [...prev, entry])
  }

  function updateNewExpense(tempId: number, field: keyof Omit<NewExpenseEntry, 'tempId'>, value: string) {
    setNewExpenses((prev) =>
      prev.map((e) => (e.tempId === tempId ? { ...e, [field]: value } : e)),
    )
  }

  function removeNewExpense(tempId: number) {
    setNewExpenses((prev) => prev.filter((e) => e.tempId !== tempId))
  }

  function openTypePicker(tempId: number) {
    setTypePickerTarget(tempId)
    setTypePickerOpen(true)
    setTypeSearch('')
  }

  function handleTypeSelect(typeId: string) {
    if (typePickerTarget !== null) {
      updateNewExpense(typePickerTarget, 'expense_type_id', typeId)
      // Auto-fill amount from default
      const et = expenseTypes.find((t) => t.id === Number(typeId))
      if (et?.default_amount) {
        const entry = newExpenses.find((e) => e.tempId === typePickerTarget)
        if (entry && !entry.amount) {
          updateNewExpense(typePickerTarget, 'amount', Math.round(et.default_amount).toString())
        }
      }
    }
    setTypePickerOpen(false)
    setTypePickerTarget(null)
    setTypeSearch('')
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Create new expenses first, collect their IDs
      const createdIds: number[] = []
      for (const ne of validNewExpenses) {
        const created = await expenseAPI.create({
          expense_type_id: Number(ne.expense_type_id),
          wallet_id: Number(form.wallet_id),
          amount: Number(ne.amount),
          date: form.date,
          note: ne.note || undefined,
        })
        createdIds.push(created.id)
      }

      if (canCreateDefaultDiscrepancyExpense && discrepancyMode === 'default-expense' && selectedWallet?.default_expense_type_id) {
        const created = await expenseAPI.create({
          expense_type_id: selectedWallet.default_expense_type_id,
          wallet_id: Number(form.wallet_id),
          amount: discrepancy,
          date: form.date,
          note: form.note || undefined,
        })
        createdIds.push(created.id)
      }

      const allExpenseIds = [...selectedExpenseIds, ...createdIds]
      const payload = {
        wallet_id: Number(form.wallet_id),
        amount: Number(form.amount),
        date: form.date,
        note: form.note || undefined,
        expense_ids: allExpenseIds.length > 0 ? allExpenseIds : undefined,
        auto_create_default_expense: false,
      }
      if (isEdit && id) {
        await paymentAPI.update(Number(id), payload)
      } else {
        await paymentAPI.create(payload)
      }
      navigate(returnTo, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payment')
    } finally {
      setLoading(false)
    }
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleReturn(): void {
    navigate(returnTo, { replace: true })
  }

  if (initialLoading) {
    return (
      <div className="page">
        <div className="page__loading"><div className="loading-orb" /></div>
      </div>
    )
  }

  const selectedType = (tempId: number) => {
    const entry = newExpenses.find((e) => e.tempId === tempId)
    return entry ? expenseTypes.find((et) => et.id === Number(entry.expense_type_id)) : undefined
  }

  const topLevel = expenseTypes.filter((et) => !et.parent_id)
  const filteredTypes = typeSearch
    ? expenseTypes.filter((et) =>
        et.name.toLowerCase().includes(typeSearch.toLowerCase())
      )
    : null

  return (
    <div className="page">
      <div className="page__header page__header--with-back">
        <button className="back-button" onClick={handleReturn}>
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
          <div className="field__label-row">
            <label className="field__label">Wallet *</label>
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
              {wallets.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className={`wallet-select-item${form.wallet_id === w.id.toString() ? ' wallet-select-item--active' : ''}`}
                  onClick={() => handleWalletSelect(w.id.toString())}
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
          )}
          <p className="field-hint">Choose the wallet this payment belongs to</p>
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
            <div className="field__label-row">
              <label className="field__label">Amount *</label>
              {hasExpenses && amountMode === 'manual' && (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setAmountMode('expenses-total')}
                >
                  Use expenses total
                </button>
              )}
            </div>
            <input
              className="field__input"
              type="number"
              step="1"
              min="0"
              required
              value={form.amount}
              onChange={(e: ChangeEvent<HTMLInputElement>) => {
                setAmountMode('manual')
                set('amount', normalizeAmountInput(e.currentTarget.value))
              }}
              placeholder="0"
            />
            {hasExpenses && (
              <p className="field-hint">
                Expenses total {formatCurrency(expenseGrandTotal)}
                {amountMode === 'expenses-total' ? ' · amount tracks expense changes' : ''}
              </p>
            )}
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

        {/* Linked Expenses Section */}
        {selectedWallet && (
          <div className="field">
            <div className="field__label-row">
              <label className="field__label">Expenses</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {allExpenses.length > 0 && (
                  <button
                    type="button"
                    className="link-button"
                    onClick={selectedExpenseIds.length === allExpenses.length ? deselectAllExpenses : selectAllExpenses}
                  >
                    {selectedExpenseIds.length === allExpenses.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}
                <button type="button" className="link-button" onClick={addNewExpense}>
                  <PlusIcon style={{ width: '0.875rem', height: '0.875rem' }} /> Add new
                </button>
              </div>
            </div>

            {/* Existing expenses (linked + unbilled) */}
            {allExpenses.length > 0 && (
              <div className="expense-checklist">
                {allExpenses.map((exp) => (
                  <label key={exp.id} className="expense-checklist__item">
                    <input
                      type="checkbox"
                      checked={selectedExpenseIds.includes(exp.id)}
                      onChange={() => toggleExpense(exp.id)}
                    />
                    <span className="expense-checklist__info">
                      <span>{exp.expense_type?.icon} {exp.expense_type?.name ?? 'Expense'}</span>
                      <small>{formatDate(exp.date)}{exp.note ? ` · ${exp.note}` : ''}</small>
                    </span>
                    <span className="expense-checklist__amount">{formatCurrency(exp.amount)}</span>
                  </label>
                ))}
              </div>
            )}

            {/* New expense entries */}
            {newExpenses.map((ne) => {
              const et = selectedType(ne.tempId)
              return (
                <div key={ne.tempId} className="new-expense-row">
                  <button
                    type="button"
                    className="field__input type-picker-trigger new-expense-row__type"
                    onClick={() => openTypePicker(ne.tempId)}
                  >
                    {et ? (
                      <span className="type-picker-trigger__value">
                        <span className="type-picker-trigger__icon" style={{ background: et.color || '#577590' }}>
                          {et.icon || et.name.charAt(0).toUpperCase()}
                        </span>
                        {et.name}
                      </span>
                    ) : (
                      <span className="type-picker-trigger__placeholder">Type…</span>
                    )}
                  </button>
                  <input
                    className="field__input new-expense-row__amount"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Amount"
                    value={ne.amount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => updateNewExpense(ne.tempId, 'amount', normalizeAmountInput(e.currentTarget.value))}
                  />
                  <input
                    className="field__input new-expense-row__note"
                    placeholder="Note"
                    value={ne.note}
                    onChange={(e) => updateNewExpense(ne.tempId, 'note', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn--icon btn--ghost"
                    onClick={() => removeNewExpense(ne.tempId)}
                    title="Remove"
                  >
                    <TrashIcon />
                  </button>
                </div>
              )
            })}

            {hasExpenses && (
              <p className="field-hint">
                {selectedExpenseIds.length > 0 &&
                  `${selectedExpenseIds.length} linked`}
                {selectedExpenseIds.length > 0 && newExpenses.length > 0 && ' + '}
                {newExpenses.length > 0 &&
                  `${newExpenses.length} new`}
                {' · '}Total: {formatCurrency(expenseGrandTotal)}
              </p>
            )}

            {form.amount && discrepancy !== 0 && (
              <div className="alert alert--info">
                <strong>
                  {discrepancy > 0
                    ? `Payment exceeds expenses by ${formatCurrency(discrepancy)}`
                    : `Expenses exceed payment by ${formatCurrency(Math.abs(discrepancy))}`}
                </strong>
                {canCreateDefaultDiscrepancyExpense ? (
                  <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.5rem' }}>
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <input
                        type="radio"
                        name="payment-discrepancy"
                        checked={discrepancyMode === 'default-expense'}
                        onChange={() => setDiscrepancyMode('default-expense')}
                      />
                      <span>
                        Add {defaultExpenseType?.name ?? 'default expense'} for {formatCurrency(discrepancy)}
                      </span>
                    </label>
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <input
                        type="radio"
                        name="payment-discrepancy"
                        checked={discrepancyMode === 'unexplained'}
                        onChange={() => setDiscrepancyMode('unexplained')}
                      />
                      <span>Leave the discrepancy unexplained</span>
                    </label>
                  </div>
                ) : (
                  <p style={{ marginTop: '0.75rem' }}>
                    {discrepancy > 0 && selectedWallet?.default_expense_type_id == null
                      ? 'This wallet has no default expense type, so the difference will stay unexplained.'
                      : 'This difference will stay unexplained unless you adjust the payment amount or expense list.'}
                  </p>
                )}
              </div>
            )}

            {!hasExpenses && allExpenses.length === 0 && (
              <p className="field-hint">No unbilled expenses for this wallet. Add new ones above.</p>
            )}
          </div>
        )}

        {/* Type Picker Modal */}
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
                          className={`type-picker__item${typePickerTarget !== null && newExpenses.find((e) => e.tempId === typePickerTarget)?.expense_type_id === et.id.toString() ? ' type-picker__item--active' : ''}`}
                          onClick={() => handleTypeSelect(et.id.toString())}
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
                            className={`type-picker__item${typePickerTarget !== null && newExpenses.find((e) => e.tempId === typePickerTarget)?.expense_type_id === parent.id.toString() ? ' type-picker__item--active' : ''}`}
                            onClick={() => handleTypeSelect(parent.id.toString())}
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
                              className={`type-picker__item type-picker__item--child${typePickerTarget !== null && newExpenses.find((e) => e.tempId === typePickerTarget)?.expense_type_id === child.id.toString() ? ' type-picker__item--active' : ''}`}
                              onClick={() => handleTypeSelect(child.id.toString())}
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
            onClick={handleReturn}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
