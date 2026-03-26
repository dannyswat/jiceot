import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  EllipsisVerticalIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  PlusIcon,
  WalletIcon,
} from '@heroicons/react/24/outline'

import { walletAPI } from '../services/api'
import { WALLET_TYPE_OPTIONS, BILL_PERIOD_OPTIONS } from '../common/constants'
import type { Wallet, WalletTypeFilter } from '../types/wallet'

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<WalletTypeFilter>('all')
  const [includeStopped, setIncludeStopped] = useState(false)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Wallet | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  const loadWallets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await walletAPI.list({
        type: typeFilter === 'all' ? undefined : typeFilter,
        includeStopped,
      })
      setWallets(res.wallets)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallets')
    } finally {
      setLoading(false)
    }
  }, [typeFilter, includeStopped])

  useEffect(() => {
    void loadWallets()
  }, [loadWallets])

  useEffect(() => {
    if (menuOpenId === null) return

    function handleWindowClick(): void {
      setMenuOpenId(null)
    }

    window.addEventListener('click', handleWindowClick)
    return () => window.removeEventListener('click', handleWindowClick)
  }, [menuOpenId])

  async function handleToggle(wallet: Wallet): Promise<void> {
    setMenuOpenId(null)
    setTogglingId(wallet.id)
    try {
      await walletAPI.toggle(wallet.id)
      await loadWallets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle wallet')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(): Promise<void> {
    if (!deleteTarget) return
    try {
      await walletAPI.delete(deleteTarget.id)
      setDeleteTarget(null)
      await loadWallets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete wallet')
    }
  }

  const periodLabel = (period: string) =>
    BILL_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period

  return (
    <div className="page">
      <div className="page__header">
        <h1>Wallets</h1>
        <p>Credit, cash, and standard money sources</p>
      </div>

      {/* Toolbar */}
      <div className="entity-toolbar">
        <div className="entity-filters">
          {WALLET_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`filter-chip${typeFilter === opt.value ? ' filter-chip--active' : ''}`}
              onClick={() => setTypeFilter(opt.value)}
            >
              {opt.label}
            </button>
          ))}
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={includeStopped}
              onChange={(e) => setIncludeStopped(e.target.checked)}
            />
            <span>Show stopped</span>
          </label>
        </div>
        <Link to="/wallets/new" className="btn btn--primary">
          <PlusIcon />
          <span>New Wallet</span>
        </Link>
      </div>

      {/* Error */}
      {error && <div className="alert alert--error">{error}</div>}

      {/* Loading */}
      {loading && (
        <div className="page__loading">
          <div className="loading-orb" />
        </div>
      )}

      {/* Empty */}
      {!loading && wallets.length === 0 && (
        <div className="empty-state">
          <WalletIcon />
          <p>No wallets found</p>
          <Link to="/wallets/new" className="btn btn--primary">
            <PlusIcon />
            <span>Add your first wallet</span>
          </Link>
        </div>
      )}

      {/* Wallet cards */}
      {!loading && wallets.length > 0 && (
        <div className="entity-grid">
          {wallets.map((w) => (
            <div
              key={w.id}
              className={`entity-card${w.stopped ? ' entity-card--stopped' : ''}${menuOpenId === w.id ? ' entity-card--menu-open' : ''}`}
            >
              <div className="entity-card__header">
                <div
                  className="entity-card__icon"
                  style={{ background: w.color || '#577590' }}
                >
                  {w.icon || w.name.charAt(0).toUpperCase()}
                </div>
                <div className="entity-card__title">
                  <span>{w.name}</span>
                  <div className="entity-card__badges">
                    {w.is_credit && <span className="badge badge--blue">Credit</span>}
                    {w.is_cash && <span className="badge badge--green">Cash</span>}
                    {w.stopped && <span className="badge badge--dim">Stopped</span>}
                  </div>
                </div>
              </div>

              {w.description && (
                <p className="entity-card__desc">{w.description}</p>
              )}

              <div className="entity-card__meta">
                {w.bill_period && w.bill_period !== 'none' && (
                  <span>{periodLabel(w.bill_period)}</span>
                )}
                {w.bill_due_day > 0 && <span>Due day {w.bill_due_day}</span>}
                {w.default_expense_type && (
                  <span>
                    {w.default_expense_type.icon} {w.default_expense_type.name}
                  </span>
                )}
              </div>

              <div className="entity-card__actions">
                <Link to={`/wallets/${w.id}`} className="icon-button" title="Edit">
                  <PencilIcon />
                </Link>
                <div
                  className="wallet-card-menu"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="icon-button"
                    onClick={() => setMenuOpenId((prev) => (prev === w.id ? null : w.id))}
                    title="More actions"
                    aria-haspopup="menu"
                    aria-expanded={menuOpenId === w.id}
                  >
                    <EllipsisVerticalIcon />
                  </button>
                  {menuOpenId === w.id && (
                    <div className="wallet-card-menu__panel" role="menu">
                      <button
                        className="wallet-card-menu__item"
                        disabled={togglingId === w.id}
                        onClick={() => handleToggle(w)}
                        role="menuitem"
                      >
                        {w.stopped ? 'Resume wallet' : 'Stop wallet'}
                      </button>
                      <button
                        className="wallet-card-menu__item wallet-card-menu__item--danger"
                        onClick={() => {
                          setMenuOpenId(null)
                          setDeleteTarget(w)
                        }}
                        role="menuitem"
                      >
                        Delete wallet
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <>
          <div className="modal-backdrop" onClick={() => setDeleteTarget(null)} />
          <div className="modal-wrap">
            <div className="modal modal--narrow">
              <div className="modal__header">
                <div className="modal__header-icon modal__header-icon--danger">
                  <ExclamationTriangleIcon />
                </div>
                <div>
                  <h3>Delete Wallet</h3>
                  <p>
                    Delete <strong>{deleteTarget.name}</strong>? This cannot be undone.
                  </p>
                </div>
              </div>
              <div className="modal__actions">
                <button
                  className="btn btn--ghost"
                  onClick={() => setDeleteTarget(null)}
                >
                  Cancel
                </button>
                <button className="danger-button" onClick={handleDelete}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
