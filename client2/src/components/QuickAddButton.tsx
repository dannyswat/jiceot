import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline'

import { walletAPI, expenseTypeAPI } from '../services/api'
import type { Wallet } from '../types/wallet'
import type { ExpenseType } from '../types/expense'

export default function QuickAddButton() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<'expenses' | 'wallets'>('expenses')
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    let active = true

    async function load(): Promise<void> {
      setLoading(true)
      try {
        const [etRes, wRes] = await Promise.all([
          expenseTypeAPI.list(),
          walletAPI.list({ includeStopped: false }),
        ])
        if (active) {
          setExpenseTypes(etRes.expense_types)
          setWallets(wRes.wallets)
        }
      } catch {
        // silently fail — data is optional for quick-add
      } finally {
        if (active) setLoading(false)
      }
    }

    void load()
    return () => { active = false }
  }, [isOpen])

  function selectExpenseType(id: number): void {
    const today = new Date().toISOString().slice(0, 10)
    navigate(`/expenses/new?expense_type_id=${id}&date=${today}`)
    setIsOpen(false)
  }

  function selectWallet(wallet: Wallet): void {
    const today = new Date().toISOString().slice(0, 10)
    navigate(`/payments/new?wallet_id=${wallet.id}&date=${today}`)
    setIsOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className="quick-add-fab"
        onClick={() => setIsOpen(true)}
        aria-label="Quick Add"
      >
        <PlusIcon />
      </button>

      {isOpen && (
        <>
          <div className="modal-backdrop" onClick={() => setIsOpen(false)} />
          <div className="modal-wrap">
            <div className="modal quick-add__modal">
              <div className="modal__header">
                <h3>Quick Add</h3>
                <button type="button" onClick={() => setIsOpen(false)}>
                  <XMarkIcon />
                </button>
              </div>

              {/* Tabs */}
              <div className="quick-add__tabs">
                <button
                  type="button"
                  className={tab === 'expenses' ? 'active' : ''}
                  onClick={() => setTab('expenses')}
                >
                  Expenses
                </button>
                <button
                  type="button"
                  className={tab === 'wallets' ? 'active' : ''}
                  onClick={() => setTab('wallets')}
                >
                  Wallets
                </button>
              </div>

              <div className="quick-add__body">
                {loading ? (
                  <div className="quick-add__loading">
                    <div className="loading-orb loading-orb--sm" />
                  </div>
                ) : tab === 'expenses' ? (
                  expenseTypes.length === 0 ? (
                    <div className="quick-add__empty">
                      <p>No expense types yet.</p>
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => { navigate('/expense-types/new'); setIsOpen(false) }}
                      >
                        Create one
                      </button>
                    </div>
                  ) : (
                    <div className="quick-add__grid">
                      {expenseTypes.map((et) => (
                        <button
                          key={et.id}
                          type="button"
                          className="quick-add__item"
                          onClick={() => selectExpenseType(et.id)}
                        >
                          <span
                            className="quick-add__icon"
                            style={{ backgroundColor: `${et.color || '#577590'}22` }}
                          >
                            {et.icon || '📝'}
                          </span>
                          <span className="quick-add__label">{et.name}</span>
                        </button>
                      ))}
                    </div>
                  )
                ) : wallets.length === 0 ? (
                  <div className="quick-add__empty">
                    <p>No wallets yet.</p>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => { navigate('/wallets/new'); setIsOpen(false) }}
                    >
                      Create one
                    </button>
                  </div>
                ) : (
                  <div className="quick-add__grid">
                    {wallets.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        className="quick-add__item"
                        onClick={() => selectWallet(w)}
                      >
                        <span
                          className="quick-add__icon"
                          style={{ backgroundColor: `${w.color || '#577590'}22` }}
                        >
                          {w.icon || '💳'}
                        </span>
                        <span className="quick-add__label">{w.name}</span>
                        {w.is_credit && <span className="quick-add__badge">Credit</span>}
                        {w.is_cash && <span className="quick-add__badge">Cash</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}
