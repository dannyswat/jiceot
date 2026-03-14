import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  TagIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

import { expenseTypeAPI } from '../services/api'
import { daysUntil, formatDate } from '../common/date'
import { RECURRING_TYPE_OPTIONS, RECURRING_PERIOD_OPTIONS } from '../common/constants'
import type { ExpenseType, ExpenseTypeTreeNode } from '../types/expense'

export default function ExpenseTypesPage() {
  const [tree, setTree] = useState<ExpenseTypeTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [includeStopped, setIncludeStopped] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    void loadTree()
  }, [includeStopped])

  async function loadTree() {
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
  }

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
      await expenseTypeAPI.toggle(et.id)
      await loadTree()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle')
    }
  }

  async function handleDelete(et: ExpenseType): Promise<void> {
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

  function renderExpenseType(et: ExpenseType, isChild = false) {
    const status = dueStatus(et)
    const recurring = recurringLabel(et)

    return (
      <div
        key={et.id}
        className={`tree-item${isChild ? ' tree-item--child' : ''}${et.stopped ? ' tree-item--stopped' : ''}`}
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
                className="icon-button"
                onClick={() => handlePostpone(et)}
                title="Postpone 7 days"
              >
                ⏭
              </button>
            )}
            <button
              className="icon-button"
              onClick={() => handleToggle(et)}
              title={et.stopped ? 'Resume' : 'Stop'}
            >
              {et.stopped ? '▶' : '⏸'}
            </button>
            <Link to={`/expense-types/${et.id}`} className="icon-button" title="Edit">
              <PencilIcon />
            </Link>
            <button
              className="icon-button icon-button--danger"
              onClick={() => handleDelete(et)}
              title="Delete"
            >
              <TrashIcon />
            </button>
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

      {!loading && tree.length > 0 && (
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
                node.children.map((child) => renderExpenseType(child, true))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
