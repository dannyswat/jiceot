import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Bars3BottomLeftIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
} from '@heroicons/react/24/outline'

import { expenseTypeAPI } from '../services/api'
import { daysUntil, formatDate } from '../common/date'
import { RECURRING_TYPE_OPTIONS, RECURRING_PERIOD_OPTIONS } from '../common/constants'
import type { ExpenseType, ExpenseTypeTreeNode } from '../types/expense'

type ViewMode = 'hierarchy' | 'list'

function HierarchyIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="5" cy="5" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="9.5" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15" cy="15" r="2.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M7.25 5H10c1.243 0 2.25 1.007 2.25 2.25v5.5M12.25 7.5h.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function ExpenseTypesPage() {
  const [tree, setTree] = useState<ExpenseTypeTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [includeStopped, setIncludeStopped] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('hierarchy')

  const loadTree = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await expenseTypeAPI.tree(includeStopped)
      setTree(res.tree)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load expense types')
    } finally {
      setLoading(false)
    }
  }, [includeStopped])

  useEffect(() => {
    void loadTree()
  }, [loadTree])

  useEffect(() => {
    if (menuOpenId === null) return

    function handleWindowClick(): void {
      setMenuOpenId(null)
    }

    window.addEventListener('click', handleWindowClick)
    return () => window.removeEventListener('click', handleWindowClick)
  }, [menuOpenId])

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handlePostpone(et: ExpenseType): Promise<void> {
    if (!et.next_due_day) return
    const nextDate = new Date(et.next_due_day)
    nextDate.setDate(nextDate.getDate() + 7)
    try {
      await expenseTypeAPI.postpone(et.id, {
        next_due_day: nextDate.toISOString().slice(0, 10),
      })
      await loadTree()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to postpone')
    }
  }

  async function handleToggle(et: ExpenseType): Promise<void> {
    try {
      setMenuOpenId(null)
      await expenseTypeAPI.toggle(et.id)
      await loadTree()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle')
    }
  }

  async function handleDelete(et: ExpenseType): Promise<void> {
    setMenuOpenId(null)
    if (!window.confirm(`Delete "${et.name}"? This cannot be undone.`)) return
    try {
      await expenseTypeAPI.delete(et.id)
      await loadTree()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const recurringLabel = (et: ExpenseType) => {
    if (et.recurring_type === 'none') return null
    const type = RECURRING_TYPE_OPTIONS.find((o) => o.value === et.recurring_type)?.label
    const period = RECURRING_PERIOD_OPTIONS.find((o) => o.value === et.recurring_period)?.label
    return `${type}${period && period !== 'None' ? ` · ${period}` : ''}`
  }

  const dueStatus = (et: ExpenseType) => {
    if (!et.next_due_day) return null
    const days = daysUntil(et.next_due_day)
    if (days < 0) return { label: `Overdue (${Math.abs(days)}d)`, cls: 'badge--red' }
    if (days <= 3) return { label: `Due soon (${days}d)`, cls: 'badge--orange' }
    return { label: `In ${days}d`, cls: 'badge--dim' }
  }

  const flatTypes = tree.flatMap((node) => [node.expense_type, ...node.children])

  function renderExpenseType(et: ExpenseType, options?: { isChild?: boolean; showParent?: boolean }) {
    const status = dueStatus(et)
    const recurring = recurringLabel(et)
    const isChild = options?.isChild ?? false
    const showParent = options?.showParent ?? false

    return (
      <div
        key={et.id}
        className={`tree-item${isChild ? ' tree-item--child' : ''}${et.stopped ? ' tree-item--stopped' : ''}${menuOpenId === et.id ? ' tree-item--menu-open' : ''}`}
      >
        <div className="tree-item__main">
          <div
            className="entity-card__icon entity-card__icon--sm"
            style={{ background: et.color || '#577590' }}
          >
            {et.icon || et.name.charAt(0).toUpperCase()}
          </div>
          <div className="tree-item__info">
            <span className="tree-item__name">{et.name}</span>
            <div className="tree-item__badges">
              {showParent && et.parent && <span className="badge badge--dim">{et.parent.name}</span>}
              {recurring && <span className="badge badge--blue">{recurring}</span>}
              {et.stopped && <span className="badge badge--dim">Stopped</span>}
              {status && <span className={`badge ${status.cls}`}>{status.label}</span>}
              {et.next_due_day && (
                <span className="tree-item__due-date">
                  Due: {formatDate(et.next_due_day)}
                </span>
              )}
            </div>
          </div>
          <div className="tree-item__actions">
            {et.recurring_type === 'flexible' && et.next_due_day && (
              <button
                type="button"
                className="icon-button"
                onClick={() => handlePostpone(et)}
                title="Postpone 7 days"
              >
                ⏭
              </button>
            )}
            <Link to={`/expense-types/${et.id}`} className="icon-button" title="Edit">
              <PencilIcon />
            </Link>
            <div
              className="wallet-card-menu"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="icon-button"
                onClick={() => setMenuOpenId((prev) => (prev === et.id ? null : et.id))}
                title="More actions"
                aria-haspopup="menu"
                aria-expanded={menuOpenId === et.id}
              >
                <EllipsisVerticalIcon />
              </button>
              {menuOpenId === et.id && (
                <div className="wallet-card-menu__panel" role="menu">
                  <button
                    className="wallet-card-menu__item"
                    onClick={() => handleToggle(et)}
                    role="menuitem"
                  >
                    {et.stopped ? 'Resume type' : 'Stop type'}
                  </button>
                  <button
                    className="wallet-card-menu__item wallet-card-menu__item--danger"
                    onClick={() => handleDelete(et)}
                    role="menuitem"
                  >
                    Delete type
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page__header">
        <h1>Expense Types</h1>
        <p>Hierarchy, defaults, and recurring logic</p>
      </div>

      <div className="entity-toolbar">
        <div className="entity-filters">
          <label className="filter-toggle">
            <input
              type="checkbox"
              checked={includeStopped}
              onChange={(e) => setIncludeStopped(e.target.checked)}
            />
            <span>Show stopped</span>
          </label>
          <div className="report-view-toggle expense-type-view-toggle" role="tablist" aria-label="Expense type view mode">
            <button
              type="button"
              className={`filter-chip expense-type-view-toggle__button${viewMode === 'hierarchy' ? ' filter-chip--active' : ''}`}
              onClick={() => setViewMode('hierarchy')}
              role="tab"
              aria-selected={viewMode === 'hierarchy'}
              aria-label="Hierarchy view"
              title="Hierarchy view"
            >
              <HierarchyIcon />
            </button>
            <button
              type="button"
              className={`filter-chip expense-type-view-toggle__button${viewMode === 'list' ? ' filter-chip--active' : ''}`}
              onClick={() => setViewMode('list')}
              role="tab"
              aria-selected={viewMode === 'list'}
              aria-label="List view"
              title="List view"
            >
              <Bars3BottomLeftIcon />
            </button>
          </div>
        </div>
        <Link to="/expense-types/new" className="btn btn--primary">
          <PlusIcon />
          <span>New Type</span>
        </Link>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading && (
        <div className="page__loading"><div className="loading-orb" /></div>
      )}

      {!loading && tree.length === 0 && (
        <div className="empty-state">
          <TagIcon />
          <p>No expense types yet</p>
          <Link to="/expense-types/new" className="btn btn--primary">
            <PlusIcon />
            <span>Create your first type</span>
          </Link>
        </div>
      )}

      {!loading && tree.length > 0 && viewMode === 'hierarchy' && (
        <div className="tree-list">
          {tree.map((node) => (
            <div key={node.expense_type.id} className="tree-group">
              {node.children.length > 0 && (
                <button
                  className="tree-expand"
                  onClick={() => toggleExpand(node.expense_type.id)}
                >
                  {expandedIds.has(node.expense_type.id) ? (
                    <ChevronDownIcon />
                  ) : (
                    <ChevronRightIcon />
                  )}
                </button>
              )}
              {renderExpenseType(node.expense_type)}
              {expandedIds.has(node.expense_type.id) &&
                node.children.map((child) => renderExpenseType(child, { isChild: true }))}
            </div>
          ))}
        </div>
      )}

      {!loading && tree.length > 0 && viewMode === 'list' && (
        <div className="tree-list tree-list--flat">
          {flatTypes.map((expenseType) => renderExpenseType(expenseType, { showParent: true }))}
        </div>
      )}
    </div>
  )
}
