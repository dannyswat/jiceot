import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDaysIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline'

import { reportsAPI } from '../services/api'
import { formatCurrency } from '../common/currency'
import { formatMonthYear } from '../common/date'
import type { MonthlyReport, YearlyReport, TypeBreakdownItem, WalletBreakdownItem } from '../types/report'

const currentYear = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1

type ViewMode = 'monthly' | 'yearly'

export default function ReportsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('monthly')
  const [year, setYear] = useState(currentYear)
  const [month, setMonth] = useState(currentMonth)

  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null)
  const [yearlyReport, setYearlyReport] = useState<YearlyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReport = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (viewMode === 'monthly') {
        const data = await reportsAPI.monthly(year, month)
        setMonthlyReport(data)
      } else {
        const data = await reportsAPI.yearly(year)
        setYearlyReport(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report')
    } finally {
      setLoading(false)
    }
  }, [viewMode, year, month])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const years = Array.from({ length: 6 }, (_, i) => currentYear - 5 + i)
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString('default', { month: 'long' }),
  }))

  return (
    <div className="page">
      <div className="page__header">
        <h1>Reports</h1>
        <p>Monthly and yearly breakdowns by type and wallet</p>
      </div>

      {/* Controls */}
      <div className="entity-toolbar entity-toolbar--wrap">
        <div className="entity-filters">
          <div className="report-view-toggle">
            <button
              className={`filter-chip${viewMode === 'monthly' ? ' filter-chip--active' : ''}`}
              onClick={() => setViewMode('monthly')}
            >
              Monthly
            </button>
            <button
              className={`filter-chip${viewMode === 'yearly' ? ' filter-chip--active' : ''}`}
              onClick={() => setViewMode('yearly')}
            >
              Yearly
            </button>
          </div>
          <CalendarDaysIcon className="filter-icon" />
          <select
            className="field__input field__input--compact"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {viewMode === 'monthly' && (
            <select
              className="field__input field__input--compact"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {loading && (
        <div className="page__loading"><div className="loading-orb" /></div>
      )}

      {!loading && viewMode === 'monthly' && monthlyReport && (
        <MonthlyView report={monthlyReport} />
      )}

      {!loading && viewMode === 'yearly' && yearlyReport && (
        <YearlyView report={yearlyReport} />
      )}
    </div>
  )
}

/* ── Monthly View ──────────────────────────────── */

function MonthlyView({ report }: { report: MonthlyReport }) {
  const expenseEntries = Object.entries(report.expense_type_breakdown)
  const parentEntries = Object.entries(report.parent_type_breakdown)
  const walletEntries = Object.entries(report.wallet_breakdown)

  return (
    <>
      {/* Summary cards */}
      <div className="dash-stats">
        <div className="stat-card stat-card--warm">
          <p>Expenses</p>
          <strong>{formatCurrency(report.total_expenses)}</strong>
        </div>
        <div className="stat-card stat-card--teal">
          <p>Payments</p>
          <strong>{formatCurrency(report.total_payments)}</strong>
        </div>
      </div>

      {/* Parent group breakdown */}
      {parentEntries.length > 0 && (
        <div className="report-section">
          <h2 className="report-section__title">By Category Group</h2>
          <BreakdownBarList
            entries={parentEntries}
            total={report.total_expenses}
          />
        </div>
      )}

      {/* Detailed type breakdown */}
      {expenseEntries.length > 0 && (
        <div className="report-section">
          <h2 className="report-section__title">By Expense Type</h2>
          <BreakdownBarList
            entries={expenseEntries}
            total={report.total_expenses}
          />
        </div>
      )}

      {/* Wallet breakdown */}
      {walletEntries.length > 0 && (
        <div className="report-section">
          <h2 className="report-section__title">By Wallet</h2>
          <WalletBreakdownList
            entries={walletEntries}
            total={report.total_expenses}
          />
        </div>
      )}

      {expenseEntries.length === 0 && walletEntries.length === 0 && (
        <div className="empty-state">
          <ChartBarIcon />
          <p>No data for this period</p>
        </div>
      )}
    </>
  )
}

/* ── Yearly View ───────────────────────────────── */

function YearlyView({ report }: { report: YearlyReport }) {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null)

  return (
    <>
      {/* Summary */}
      <div className="dash-stats">
        <div className="stat-card stat-card--warm">
          <p>Year Total Expenses</p>
          <strong>{formatCurrency(report.summary.total_expenses)}</strong>
        </div>
        <div className="stat-card stat-card--teal">
          <p>Year Total Payments</p>
          <strong>{formatCurrency(report.summary.total_payments)}</strong>
        </div>
        <div className="stat-card stat-card--ink">
          <p>Avg Monthly Expenses</p>
          <strong>{formatCurrency(report.summary.average_monthly_expenses)}</strong>
        </div>
        <div className="stat-card stat-card--sand">
          <p>Avg Monthly Payments</p>
          <strong>{formatCurrency(report.summary.average_monthly_payments)}</strong>
        </div>
      </div>

      {/* Monthly summary rows */}
      <div className="report-section">
        <h2 className="report-section__title">Monthly Breakdown</h2>
        <div className="report-months">
          {report.months.map((m) => {
            const isExpanded = expandedMonth === m.month
            const expenseEntries = Object.entries(m.expense_type_breakdown)
            const walletEntries = Object.entries(m.wallet_breakdown)

            return (
              <div key={m.month} className="report-month">
                <button
                  className="report-month__header"
                  onClick={() => setExpandedMonth(isExpanded ? null : m.month)}
                >
                  <div className="report-month__label">
                    {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                    <span>{formatMonthYear(`${m.year}-${String(m.month).padStart(2, '0')}-01`)}</span>
                  </div>
                  <div className="report-month__totals">
                    <span className="report-month__expense">
                      {formatCurrency(m.total_expenses)}
                    </span>
                    <span className="report-month__payment">
                      {formatCurrency(m.total_payments)}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="report-month__detail">
                    {expenseEntries.length > 0 && (
                      <div className="report-subsection">
                        <h3>By Type</h3>
                        <BreakdownBarList
                          entries={expenseEntries}
                          total={m.total_expenses}
                        />
                      </div>
                    )}
                    {walletEntries.length > 0 && (
                      <div className="report-subsection">
                        <h3>By Wallet</h3>
                        <WalletBreakdownList
                          entries={walletEntries}
                          total={m.total_expenses}
                        />
                      </div>
                    )}
                    {expenseEntries.length === 0 && (
                      <p className="report-empty">No expenses this month</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

/* ── Shared breakdown components ───────────────── */

function BreakdownBarList({
  entries,
  total,
}: {
  entries: [string, TypeBreakdownItem][]
  total: number
}) {
  const sorted = [...entries].sort((a, b) => b[1].amount - a[1].amount)

  return (
    <div className="breakdown-list">
      {sorted.map(([name, item]) => {
        const pct = total > 0 ? (item.amount / total) * 100 : 0
        return (
          <div key={name} className="breakdown-row">
            <div className="breakdown-row__header">
              <div className="breakdown-row__label">
                <span
                  className="breakdown-row__dot"
                  style={{ background: item.color || '#577590' }}
                />
                <span className="breakdown-row__icon">{item.icon}</span>
                <span className="breakdown-row__name">{name}</span>
                <span className="breakdown-row__count">{item.count}×</span>
              </div>
              <div className="breakdown-row__values">
                <span className="breakdown-row__amount">{formatCurrency(item.amount)}</span>
                <span className="breakdown-row__pct">{pct.toFixed(1)}%</span>
              </div>
            </div>
            <div className="breakdown-row__bar-track">
              <div
                className="breakdown-row__bar-fill"
                style={{
                  width: `${Math.max(pct, 0.5)}%`,
                  background: item.color || '#577590',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function walletTypeLabel(item: WalletBreakdownItem): string {
  if (item.is_credit) return 'Credit'
  if (item.is_cash) return 'Cash'
  return 'Standard'
}

function WalletBreakdownList({
  entries,
  total,
}: {
  entries: [string, WalletBreakdownItem][]
  total: number
}) {
  const sorted = [...entries].sort((a, b) => b[1].amount - a[1].amount)

  return (
    <div className="breakdown-list">
      {sorted.map(([name, item]) => {
        const pct = total > 0 ? (item.amount / total) * 100 : 0
        return (
          <div key={name} className="breakdown-row">
            <div className="breakdown-row__header">
              <div className="breakdown-row__label">
                <span
                  className="breakdown-row__dot"
                  style={{ background: item.color || '#577590' }}
                />
                <span className="breakdown-row__icon">{item.icon}</span>
                <span className="breakdown-row__name">{name}</span>
                <span className="badge badge--dim">{walletTypeLabel(item)}</span>
                <span className="breakdown-row__count">{item.count}×</span>
              </div>
              <div className="breakdown-row__values">
                <span className="breakdown-row__amount">{formatCurrency(item.amount)}</span>
                <span className="breakdown-row__pct">{pct.toFixed(1)}%</span>
              </div>
            </div>
            <div className="breakdown-row__bar-track">
              <div
                className="breakdown-row__bar-fill"
                style={{
                  width: `${Math.max(pct, 0.5)}%`,
                  background: item.color || '#577590',
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
