export interface TypeBreakdownItem {
  amount: number
  count: number
  color: string
  icon: string
}

export interface WalletBreakdownItem {
  amount: number
  count: number
  color: string
  icon: string
  is_credit: boolean
  is_cash: boolean
}

export interface MonthlyReport {
  year: number
  month: number
  from: string
  to: string
  total_expenses: number
  total_payments: number
  expense_type_breakdown: Record<string, TypeBreakdownItem>
  parent_type_breakdown: Record<string, TypeBreakdownItem>
  wallet_breakdown: Record<string, WalletBreakdownItem>
}

export interface YearlySummary {
  total_expenses: number
  total_payments: number
  average_monthly_expenses: number
  average_monthly_payments: number
}

export interface YearlyReport {
  year: number
  months: MonthlyReport[]
  summary: YearlySummary
}