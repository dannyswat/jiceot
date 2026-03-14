export type WalletTypeFilter = 'all' | 'credit' | 'cash' | 'normal'

export interface WalletDefaultExpenseType {
  id: number
  name: string
  icon: string
  color: string
  recurring_type: string
  recurring_period: string
}

export interface Wallet {
  id: number
  name: string
  icon: string
  color: string
  description: string
  is_credit: boolean
  is_cash: boolean
  bill_period: string
  bill_due_day: number
  stopped: boolean
  default_expense_type_id?: number | null
  user_id: number
  created_at: string
  updated_at: string
  default_expense_type?: WalletDefaultExpenseType | null
}

export interface CreateWalletRequest {
  name: string
  icon?: string
  color?: string
  description?: string
  is_credit?: boolean
  is_cash?: boolean
  bill_period?: string
  bill_due_day?: number
  default_expense_type_id?: number | null
}

export interface UpdateWalletRequest extends CreateWalletRequest {
  stopped?: boolean
}

export interface WalletListResponse {
  wallets: Wallet[]
  total: number
}