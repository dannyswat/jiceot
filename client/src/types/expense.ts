export type RecurringType = 'none' | 'fixed_day' | 'flexible'
export type RecurringPeriod =
  | 'none'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'fourmonths'
  | 'semiannually'
  | 'annually'

export interface ExpenseTypeParentSummary {
  id: number
  name: string
  icon: string
  color: string
}

export interface ExpenseTypeWalletSummary {
  id: number
  name: string
  icon: string
  color: string
  is_credit: boolean
  is_cash: boolean
}

export interface ExpenseType {
  id: number
  parent_id?: number | null
  name: string
  icon: string
  color: string
  description: string
  default_amount: number
  default_wallet_id?: number | null
  recurring_type: RecurringType
  recurring_period: RecurringPeriod
  recurring_due_day: number
  next_due_day?: string | null
  stopped: boolean
  user_id: number
  created_at: string
  updated_at: string
  parent?: ExpenseTypeParentSummary | null
  default_wallet?: ExpenseTypeWalletSummary | null
}

export interface CreateExpenseTypeRequest {
  parent_id?: number | null
  name: string
  icon?: string
  color?: string
  description?: string
  default_amount?: number
  default_wallet_id?: number | null
  recurring_type?: RecurringType
  recurring_period?: RecurringPeriod
  recurring_due_day?: number
  next_due_day?: string | null
  stopped?: boolean
}

export type UpdateExpenseTypeRequest = CreateExpenseTypeRequest

export interface PostponeExpenseTypeRequest {
  next_due_day: string
}

export interface ExpenseTypeListResponse {
  expense_types: ExpenseType[]
  total: number
}

export interface ExpenseTypeTreeNode {
  expense_type: ExpenseType
  children: ExpenseType[]
}

export interface ExpenseTypeTreeResponse {
  tree: ExpenseTypeTreeNode[]
  total: number
}

export interface ExpenseWalletSummary {
  id: number
  name: string
  icon: string
  color: string
  is_credit: boolean
  is_cash: boolean
}

export interface ExpensePaymentSummary {
  id: number
  wallet_id: number
  amount: number
  date: string
  note: string
}

export interface Expense {
  id: number
  expense_type_id: number
  wallet_id?: number | null
  payment_id?: number | null
  amount: number
  date: string
  note: string
  user_id: number
  created_at: string
  updated_at: string
  expense_type?: ExpenseType | null
  wallet?: ExpenseWalletSummary | null
  payment?: ExpensePaymentSummary | null
}

export interface CreateExpenseRequest {
  expense_type_id: number
  wallet_id?: number | null
  payment_id?: number | null
  amount: number
  date: string
  note?: string
}

export type UpdateExpenseRequest = CreateExpenseRequest

export interface ExpenseListResponse {
  expenses: Expense[]
  total: number
}