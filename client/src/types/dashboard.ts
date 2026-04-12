export interface DueWallet {
  id: number
  name: string
  icon: string
  color: string
  bill_period: string
  bill_due_day: number
  next_due_date: string
  days_until_due: number
  status: 'overdue' | 'due_soon' | 'upcoming'
  has_payment: boolean
  last_paid_at?: string | null
}

export interface DueExpense {
  id: number
  name: string
  icon: string
  color: string
  default_amount: number
  recurring_type: string
  recurring_period: string
  reminder_type: string
  next_due_date: string
  days_until_due: number
  status: 'overdue' | 'due_soon' | 'upcoming' | 'suggested'
}

export interface DashboardStats {
  total_expenses: number
  payments_made: number
  pending_wallets: number
  pending_expenses: number
  categories: number
  due_wallets: DueWallet[]
  fixed_expenses: DueExpense[]
  flexible_expenses: DueExpense[]
}

export interface DueWalletsResponse {
  due_wallets: DueWallet[]
  year: number
  month: number
}

export interface DueExpensesResponse {
  fixed_due: DueExpense[]
  flexible_suggested: DueExpense[]
  year: number
  month: number
}