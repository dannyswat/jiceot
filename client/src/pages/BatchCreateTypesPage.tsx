import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeftIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

import AmountInput from '../components/AmountInput'
import { walletAPI, expenseTypeAPI } from '../services/api'
import { PRESET_COLORS, BILL_PERIOD_OPTIONS } from '../common/constants'
import type { RecurringType, RecurringPeriod } from '../types/expense'

interface WalletRow {
  key: number
  name: string
  icon: string
  color: string
  is_credit: boolean
  is_cash: boolean
  bill_period: string
  bill_due_day: number
}

interface ExpenseTypeRow {
  key: number
  name: string
  icon: string
  color: string
  recurring_type: RecurringType
  recurring_period: RecurringPeriod
  automatic: boolean
  default_amount: string
}

let nextKey = 1

function newWalletRow(): WalletRow {
  return {
    key: nextKey++,
    name: '',
    icon: '',
    color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
    is_credit: false,
    is_cash: false,
    bill_period: 'none',
    bill_due_day: 0,
  }
}

function newExpenseTypeRow(): ExpenseTypeRow {
  return {
    key: nextKey++,
    name: '',
    icon: '',
    color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
    recurring_type: 'none',
    recurring_period: 'none',
    automatic: false,
    default_amount: '',
  }
}

export default function BatchCreateTypesPage() {
  const navigate = useNavigate()
  const [walletRows, setWalletRows] = useState<WalletRow[]>([newWalletRow()])
  const [expenseTypeRows, setExpenseTypeRows] = useState<ExpenseTypeRow[]>([newExpenseTypeRow()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ wallets: number; types: number } | null>(null)

  function updateWallet<K extends keyof WalletRow>(idx: number, key: K, value: WalletRow[K]) {
    setWalletRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)))
  }

  function updateExpenseType<K extends keyof ExpenseTypeRow>(idx: number, key: K, value: ExpenseTypeRow[K]) {
    setExpenseTypeRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [key]: value } : r)))
  }

  function removeWallet(idx: number) {
    setWalletRows((rows) => rows.filter((_, i) => i !== idx))
  }

  function removeExpenseType(idx: number) {
    setExpenseTypeRows((rows) => rows.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    setError('')
    setSaving(true)
    setResult(null)

    let walletsCreated = 0
    let typesCreated = 0

    try {
      // Create wallets
      for (const row of walletRows) {
        if (!row.name.trim()) continue
        await walletAPI.create({
          name: row.name.trim(),
          icon: row.icon || undefined,
          color: row.color || undefined,
          is_credit: row.is_credit,
          is_cash: row.is_cash,
          bill_period: row.bill_period !== 'none' ? row.bill_period : undefined,
          bill_due_day: row.bill_due_day || undefined,
        })
        walletsCreated++
      }

      // Create expense types
      for (const row of expenseTypeRows) {
        if (!row.name.trim()) continue
        await expenseTypeAPI.create({
          name: row.name.trim(),
          icon: row.icon || undefined,
          color: row.color || undefined,
          recurring_type: row.recurring_type,
          recurring_period: row.recurring_type !== 'none' ? row.recurring_period : undefined,
          automatic: row.recurring_type !== 'none' ? row.automatic : false,
          default_amount: row.default_amount ? Number(row.default_amount) : undefined,
        })
        typesCreated++
      }

      setResult({ wallets: walletsCreated, types: typesCreated })
    } catch (err) {
      setError(
        `Created ${walletsCreated} wallet(s) and ${typesCreated} type(s) before error: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <div className="page__header page__header--with-back">
        <button className="back-button" onClick={() => navigate('/settings')}>
          <ArrowLeftIcon />
        </button>
        <div>
          <h1>Batch Create</h1>
          <p>Quickly set up multiple wallets and expense types</p>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {result && (
        <div className="alert alert--success">
          Created {result.wallets} wallet{result.wallets !== 1 ? 's' : ''} and{' '}
          {result.types} expense type{result.types !== 1 ? 's' : ''} successfully!
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Wallets section */}
        <div className="batch-section">
          <div className="batch-section__header">
            <h2>Wallets</h2>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setWalletRows((r) => [...r, newWalletRow()])}
            >
              <PlusIcon /> Add Row
            </button>
          </div>

          <div className="batch-table">
            <div className="batch-table__head">
              <span>Name</span>
              <span>Icon</span>
              <span>Color</span>
              <span>Credit</span>
              <span>Cash</span>
              <span>Period</span>
              <span>Due Day</span>
              <span></span>
            </div>
            {walletRows.map((row, idx) => (
              <div key={row.key} className="batch-table__row">
                <input
                  className="field__input field__input--compact"
                  value={row.name}
                  onChange={(e) => updateWallet(idx, 'name', e.target.value)}
                  placeholder="Wallet name"
                />
                <input
                  className="field__input field__input--compact field__input--icon"
                  value={row.icon}
                  onChange={(e) => updateWallet(idx, 'icon', e.target.value)}
                  placeholder="💳"
                />
                <div className="batch-color">
                  <div className="batch-color__preview" style={{ background: row.color }} />
                  <input
                    className="field__input field__input--compact"
                    value={row.color}
                    onChange={(e) => updateWallet(idx, 'color', e.target.value)}
                  />
                </div>
                <input
                  type="checkbox"
                  checked={row.is_credit}
                  onChange={(e) => {
                    updateWallet(idx, 'is_credit', e.target.checked)
                    if (e.target.checked) updateWallet(idx, 'is_cash', false)
                  }}
                />
                <input
                  type="checkbox"
                  checked={row.is_cash}
                  onChange={(e) => {
                    updateWallet(idx, 'is_cash', e.target.checked)
                    if (e.target.checked) updateWallet(idx, 'is_credit', false)
                  }}
                />
                <select
                  className="field__input field__input--compact"
                  value={row.bill_period}
                  onChange={(e) => updateWallet(idx, 'bill_period', e.target.value)}
                >
                  {BILL_PERIOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <select
                  className="field__input field__input--compact"
                  value={row.bill_due_day}
                  onChange={(e) => updateWallet(idx, 'bill_due_day', Number(e.target.value))}
                >
                  <option value={0}>—</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="icon-button icon-button--danger"
                  onClick={() => removeWallet(idx)}
                  disabled={walletRows.length <= 1}
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Expense types section */}
        <div className="batch-section">
          <div className="batch-section__header">
            <h2>Expense Types</h2>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setExpenseTypeRows((r) => [...r, newExpenseTypeRow()])}
            >
              <PlusIcon /> Add Row
            </button>
          </div>

          <div className="batch-table">
            <div className="batch-table__head">
              <span>Name</span>
              <span>Icon</span>
              <span>Color</span>
              <span>Recurring</span>
              <span>Period</span>
              <span>Auto</span>
              <span>Amount</span>
              <span></span>
            </div>
            {expenseTypeRows.map((row, idx) => (
              <div key={row.key} className="batch-table__row">
                <input
                  className="field__input field__input--compact"
                  value={row.name}
                  onChange={(e) => updateExpenseType(idx, 'name', e.target.value)}
                  placeholder="Type name"
                />
                <input
                  className="field__input field__input--compact field__input--icon"
                  value={row.icon}
                  onChange={(e) => updateExpenseType(idx, 'icon', e.target.value)}
                  placeholder="🍽️"
                />
                <div className="batch-color">
                  <div className="batch-color__preview" style={{ background: row.color }} />
                  <input
                    className="field__input field__input--compact"
                    value={row.color}
                    onChange={(e) => updateExpenseType(idx, 'color', e.target.value)}
                  />
                </div>
                <select
                  className="field__input field__input--compact"
                  value={row.recurring_type}
                  onChange={(e) => updateExpenseType(idx, 'recurring_type', e.target.value as RecurringType)}
                >
                  <option value="none">None</option>
                  <option value="fixed_day">Fixed day</option>
                  <option value="flexible">Flexible</option>
                </select>
                <select
                  className="field__input field__input--compact"
                  value={row.recurring_period}
                  onChange={(e) => updateExpenseType(idx, 'recurring_period', e.target.value as RecurringPeriod)}
                  disabled={row.recurring_type === 'none'}
                >
                  <option value="none">—</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="bimonthly">Bimonthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="annually">Annually</option>
                </select>
                <input
                  type="checkbox"
                  checked={row.automatic}
                  onChange={(e) => updateExpenseType(idx, 'automatic', e.target.checked)}
                  disabled={row.recurring_type === 'none'}
                />
                <AmountInput
                  value={row.default_amount}
                  onChange={(value) => updateExpenseType(idx, 'default_amount', value)}
                  placeholder="0"
                  title="Default amount"
                  triggerClassName="field__input--compact"
                />
                <button
                  type="button"
                  className="icon-button icon-button--danger"
                  onClick={() => removeExpenseType(idx)}
                  disabled={expenseTypeRows.length <= 1}
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions" style={{ marginTop: 20 }}>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create All'}
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => navigate('/settings')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
