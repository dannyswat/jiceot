export interface PaymentWalletSummary {
  id: number
  name: string
  icon: string
  color: string
  is_credit: boolean
  is_cash: boolean
}

export interface Payment {
  id: number
  wallet_id: number
  amount: number
  date: string
  note: string
  user_id: number
  created_at: string
  updated_at: string
  wallet?: PaymentWalletSummary | null
}

export interface CreatePaymentRequest {
  wallet_id: number
  amount: number
  date: string
  note?: string
  expense_ids?: number[]
  auto_create_default_expense?: boolean
}

export type UpdatePaymentRequest = CreatePaymentRequest

export interface PaymentListResponse {
  payments: Payment[]
  total: number
}

export interface PaymentMonthlyTotalResponse {
  from: string
  to: string
  total: number
}