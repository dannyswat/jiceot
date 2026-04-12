import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

import type {
	AuthResponse,
	ChangePasswordRequest,
	DeleteDevicesResponse,
	DeviceListResponse,
	LoginRequest,
	MessageResponse,
	RegisterRequest,
	UpdateCurrencySymbolRequest,
	User,
} from '../types/auth'
import type { DashboardStats, DueExpensesResponse, DueWalletsResponse } from '../types/dashboard'
import type {
	CreateExpenseRequest,
	CreateExpenseTypeRequest,
	Expense,
	ExpenseListResponse,
	ExpenseType,
	ExpenseTypeListResponse,
	ExpenseTypeTreeResponse,
	PostponeExpenseTypeRequest,
	UpdateExpenseRequest,
	UpdateExpenseTypeRequest,
} from '../types/expense'
import type { Payment, PaymentListResponse, PaymentMonthlyTotalResponse, CreatePaymentRequest, UpdatePaymentRequest } from '../types/payment'
import type { MonthlyReport, YearlyReport } from '../types/report'
import type { CreateWalletRequest, UpdateWalletRequest, Wallet, WalletListResponse } from '../types/wallet'
import type { NotificationSetting, UpdateNotificationSettingRequest } from '../types/notification'

export interface ApiError extends Error {
	status?: number
}

type RetryableRequestConfig = InternalAxiosRequestConfig & {
	_retry?: boolean
}

const api = axios.create({
	baseURL: '/api',
	headers: {
		'Content-Type': 'application/json',
	},
	withCredentials: true,
})

const TOKEN_KEY = 'jiceot.token'
const USER_KEY = 'jiceot.user'

let unauthorizedHandler: (() => void) | null = null
let refreshPromise: Promise<string> | null = null

export function registerUnauthorizedHandler(handler: (() => void) | null): void {
	unauthorizedHandler = handler
}

export function getStoredToken(): string | null {
	return window.localStorage.getItem(TOKEN_KEY)
}

export function getStoredUser(): User | null {
	const stored = window.localStorage.getItem(USER_KEY)
	if (!stored) {
		return null
	}
	try {
		return JSON.parse(stored) as User
	} catch {
		return null
	}
}

export function storeUser(user: User): void {
	window.localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function storeAuthSession(response: AuthResponse): void {
	window.localStorage.setItem(TOKEN_KEY, response.token)
	storeUser(response.user)
	api.defaults.headers.common.Authorization = `Bearer ${response.token}`
}

export function clearStoredAuth(): void {
	window.localStorage.removeItem(TOKEN_KEY)
	window.localStorage.removeItem(USER_KEY)
	delete api.defaults.headers.common.Authorization
}

function toApiError(error: unknown): ApiError {
	if (error instanceof AxiosError) {
		const responseData: unknown = error.response?.data
		const message = isErrorPayload(responseData) ? responseData.error ?? error.message : error.message
		const apiError = new Error(message) as ApiError
		apiError.status = error.response?.status
		return apiError
	}

	return error instanceof Error ? error : new Error('Unexpected API error')
}

function isErrorPayload(value: unknown): value is { error?: string } {
	return typeof value === 'object' && value !== null && (!('error' in value) || typeof (value as { error?: unknown }).error === 'string')
}

async function refreshAccessToken(): Promise<string> {
	if (refreshPromise) {
		return refreshPromise
	}

	refreshPromise = axios
		.post<AuthResponse>('/api/auth/refresh', {}, { withCredentials: true })
		.then(({ data }) => {
			storeAuthSession(data)
			return data.token
		})
		.finally(() => {
			refreshPromise = null
		})

	return refreshPromise
}

api.interceptors.request.use((config) => {
	const token = getStoredToken()
	if (token) {
		config.headers.set('Authorization', `Bearer ${token}`)
	}
	return config
})

api.interceptors.response.use(
	(response) => response,
	async (error: AxiosError<{ error?: string }>) => {
		const originalRequest = error.config as RetryableRequestConfig | undefined
		const status = error.response?.status
		const isRefreshAttempt = originalRequest?.url?.includes('/auth/refresh') ?? false

		if (status === 401 && originalRequest && !originalRequest._retry && !isRefreshAttempt) {
			originalRequest._retry = true
			try {
				const token = await refreshAccessToken()
				originalRequest.headers.set('Authorization', `Bearer ${token}`)
				return api.request(originalRequest)
			} catch (refreshError) {
				clearStoredAuth()
				unauthorizedHandler?.()
				return Promise.reject(toApiError(refreshError))
			}
		}

		return Promise.reject(toApiError(error))
	},
)

const queryString = (params: Record<string, string | number | boolean | undefined | null>): string => {
	const searchParams = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === '') {
			continue
		}
		searchParams.set(key, String(value))
	}
	const built = searchParams.toString()
	return built ? `?${built}` : ''
}

export const authAPI = {
	login: async (payload: LoginRequest): Promise<AuthResponse> => (await api.post<AuthResponse>('/auth/login', payload)).data,
	register: async (payload: RegisterRequest): Promise<AuthResponse> => (await api.post<AuthResponse>('/auth/register', payload)).data,
	me: async (): Promise<User> => (await api.get<User>('/auth/me')).data,
	logout: async (): Promise<MessageResponse> => (await api.post<MessageResponse>('/auth/logout')).data,
	refresh: async (): Promise<AuthResponse> => (await api.post<AuthResponse>('/auth/refresh')).data,
	changePassword: async (payload: ChangePasswordRequest): Promise<MessageResponse> =>
		(await api.put<MessageResponse>('/auth/password', payload)).data,
	deleteAccount: async (): Promise<MessageResponse> => (await api.delete<MessageResponse>('/user/account')).data,
}

export const userAPI = {
	updateCurrencySymbol: async (payload: UpdateCurrencySymbolRequest): Promise<User> =>
		(await api.put<User>('/user/preferences/currency', payload)).data,
}

export const deviceAPI = {
	list: async (): Promise<DeviceListResponse> => (await api.get<DeviceListResponse>('/devices')).data,
	delete: async (deviceId: number): Promise<MessageResponse> => (await api.delete<MessageResponse>(`/devices/${deviceId}`)).data,
	deleteAll: async (): Promise<DeleteDevicesResponse> => (await api.delete<DeleteDevicesResponse>('/devices')).data,
}

export const walletAPI = {
	list: async (params?: {
		type?: string
		includeStopped?: boolean
		limit?: number
		offset?: number
	}): Promise<WalletListResponse> => (await api.get<WalletListResponse>(`/wallets${queryString({ type: params?.type, include_stopped: params?.includeStopped, limit: params?.limit, offset: params?.offset })}`)).data,
	get: async (walletId: number): Promise<Wallet> => (await api.get<Wallet>(`/wallets/${walletId}`)).data,
	create: async (payload: CreateWalletRequest): Promise<Wallet> => (await api.post<Wallet>('/wallets', payload)).data,
	update: async (walletId: number, payload: UpdateWalletRequest): Promise<Wallet> => (await api.put<Wallet>(`/wallets/${walletId}`, payload)).data,
	delete: async (walletId: number): Promise<MessageResponse> => (await api.delete<MessageResponse>(`/wallets/${walletId}`)).data,
	toggle: async (walletId: number): Promise<Wallet> => (await api.post<Wallet>(`/wallets/${walletId}/toggle`)).data,
	getPayments: async (walletId: number): Promise<{ payments: Payment[]; total: number }> =>
		(await api.get<{ payments: Payment[]; total: number }>(`/wallets/${walletId}/payments`)).data,
	getUnbilledExpenses: async (walletId: number): Promise<{ expenses: Expense[]; total: number }> =>
		(await api.get<{ expenses: Expense[]; total: number }>(`/wallets/${walletId}/unbilled-expenses`)).data,
}

export const paymentAPI = {
	list: async (params?: {
		walletId?: number
		from?: string
		to?: string
		limit?: number
		offset?: number
	}): Promise<PaymentListResponse> =>
		(await api.get<PaymentListResponse>(`/payments${queryString({ wallet_id: params?.walletId, from: params?.from, to: params?.to, limit: params?.limit, offset: params?.offset })}`)).data,
	get: async (paymentId: number): Promise<Payment> => (await api.get<Payment>(`/payments/${paymentId}`)).data,
	create: async (payload: CreatePaymentRequest): Promise<Payment> => (await api.post<Payment>('/payments', payload)).data,
	update: async (paymentId: number, payload: UpdatePaymentRequest): Promise<Payment> => (await api.put<Payment>(`/payments/${paymentId}`, payload)).data,
	delete: async (paymentId: number): Promise<MessageResponse> => (await api.delete<MessageResponse>(`/payments/${paymentId}`)).data,
	getMonthlyTotal: async (params: { from?: string; to?: string; year?: number; month?: number }): Promise<PaymentMonthlyTotalResponse> =>
		(await api.get<PaymentMonthlyTotalResponse>(`/payments/monthly-total${queryString({ from: params.from, to: params.to, year: params.year, month: params.month })}`)).data,
}

export const expenseTypeAPI = {
	list: async (params?: { includeStopped?: boolean; limit?: number; offset?: number }): Promise<ExpenseTypeListResponse> =>
		(await api.get<ExpenseTypeListResponse>(`/expense-types${queryString({ include_stopped: params?.includeStopped, limit: params?.limit, offset: params?.offset })}`)).data,
	get: async (expenseTypeId: number): Promise<ExpenseType> => (await api.get<ExpenseType>(`/expense-types/${expenseTypeId}`)).data,
	create: async (payload: CreateExpenseTypeRequest): Promise<ExpenseType> => (await api.post<ExpenseType>('/expense-types', payload)).data,
	update: async (expenseTypeId: number, payload: UpdateExpenseTypeRequest): Promise<ExpenseType> =>
		(await api.put<ExpenseType>(`/expense-types/${expenseTypeId}`, payload)).data,
	delete: async (expenseTypeId: number): Promise<MessageResponse> => (await api.delete<MessageResponse>(`/expense-types/${expenseTypeId}`)).data,
	tree: async (includeStopped = false): Promise<ExpenseTypeTreeResponse> => {
		const response = (await api.get<ExpenseTypeTreeResponse>(`/expense-types/tree${queryString({ include_stopped: includeStopped })}`)).data
		return {
			...response,
			tree: response.tree.map((node) => ({
				...node,
				children: node.children ?? [],
			})),
		}
	},
	postpone: async (expenseTypeId: number, payload: PostponeExpenseTypeRequest): Promise<ExpenseType> =>
		(await api.put<ExpenseType>(`/expense-types/${expenseTypeId}/postpone`, payload)).data,
	toggle: async (expenseTypeId: number): Promise<ExpenseType> => (await api.post<ExpenseType>(`/expense-types/${expenseTypeId}/toggle`)).data,
}

export const expenseAPI = {
	list: async (params?: {
		expenseTypeId?: number
		walletId?: number
		paymentId?: number
		from?: string
		to?: string
		unbilledOnly?: boolean
		limit?: number
		offset?: number
	}): Promise<ExpenseListResponse> =>
		(await api.get<ExpenseListResponse>(`/expenses${queryString({ expense_type_id: params?.expenseTypeId, wallet_id: params?.walletId, payment_id: params?.paymentId, from: params?.from, to: params?.to, unbilled_only: params?.unbilledOnly, limit: params?.limit, offset: params?.offset })}`)).data,
	byDate: async (from: string, to: string): Promise<ExpenseListResponse> =>
		(await api.get<ExpenseListResponse>(`/expenses/by-date${queryString({ from, to })}`)).data,
	get: async (expenseId: number): Promise<Expense> => (await api.get<Expense>(`/expenses/${expenseId}`)).data,
	create: async (payload: CreateExpenseRequest): Promise<Expense> => (await api.post<Expense>('/expenses', payload)).data,
	update: async (expenseId: number, payload: UpdateExpenseRequest): Promise<Expense> => (await api.put<Expense>(`/expenses/${expenseId}`, payload)).data,
	delete: async (expenseId: number): Promise<MessageResponse> => (await api.delete<MessageResponse>(`/expenses/${expenseId}`)).data,
}

export const dashboardAPI = {
	stats: async (): Promise<DashboardStats> => (await api.get<DashboardStats>('/dashboard/stats')).data,
	dueWallets: async (year?: number, month?: number): Promise<DueWalletsResponse> =>
		(await api.get<DueWalletsResponse>(`/dashboard/due-wallets${queryString({ year, month })}`)).data,
	dueExpenses: async (year?: number, month?: number): Promise<DueExpensesResponse> =>
		(await api.get<DueExpensesResponse>(`/dashboard/due-expenses${queryString({ year, month })}`)).data,
}

export const reportsAPI = {
	monthly: async (year: number, month: number): Promise<MonthlyReport> =>
		(await api.get<MonthlyReport>(`/reports/monthly${queryString({ year, month })}`)).data,
	yearly: async (year: number): Promise<YearlyReport> => (await api.get<YearlyReport>(`/reports/yearly${queryString({ year })}`)).data,
}

export const notificationAPI = {
	getSettings: async (): Promise<NotificationSetting> =>
		(await api.get<NotificationSetting>('/notification-settings')).data,
	updateSettings: async (payload: UpdateNotificationSettingRequest): Promise<NotificationSetting> =>
		(await api.put<NotificationSetting>('/notification-settings', payload)).data,
	test: async (): Promise<MessageResponse> =>
		(await api.post<MessageResponse>('/notification-settings/test')).data,
}

const storedToken = getStoredToken()
if (storedToken) {
	api.defaults.headers.common.Authorization = `Bearer ${storedToken}`
}

export { api }