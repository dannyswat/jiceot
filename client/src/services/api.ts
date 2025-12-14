/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for cookies
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Track if we're currently refreshing to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (error: Error) => void }[] = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Handle token expiration with automatic refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${String(token)}`;
          return api.request(originalRequest);
        }).catch((err: Error) => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        const response = await axios.post<AuthResponse>('/api/auth/refresh', {}, {
          withCredentials: true,
        });
        
        const { token, user } = response.data;
        
        // Update stored token and user
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Update the authorization header
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        
        // Process queued requests
        processQueue(null, token);
        
        isRefreshing = false;
        
        // Retry the original request
        return api.request(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        processQueue(refreshError as Error, null);
        isRefreshing = false;
        
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        
        return Promise.reject(refreshError as Error);
      }
    }
    
    // Extract error message from response
    const message = error.response?.data?.error || error.message || 'An error occurred';
    error.message = message;
    
    return Promise.reject(error as Error);
  }
);

export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  device_name?: string;
  device_type?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface AuthResponse {
  token: string;
  expires_at: string;
  user: User;
}

export interface BillType {
  id: number;
  name: string;
  icon: string;
  color: string;
  bill_day: number;
  bill_cycle: number;
  fixed_amount: string;
  stopped: boolean;
  expense_type_id?: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBillTypeRequest {
  name: string;
  icon?: string;
  color?: string;
  bill_day?: number;
  bill_cycle?: number;
  fixed_amount?: string;
  expense_type_id?: number;
}

export interface UpdateBillTypeRequest {
  name: string;
  icon?: string;
  color?: string;
  bill_day?: number;
  bill_cycle?: number;
  fixed_amount?: string;
  stopped?: boolean;
  expense_type_id?: number;
}

export interface BillTypeListResponse {
  bill_types: BillType[];
  total: number;
}

export interface BillPayment {
  id: number;
  bill_type_id: number;
  year: number;
  month: number;
  amount: string;
  note: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  bill_type?: BillType;
}

export interface CreateBillPaymentRequest {
  bill_type_id: number;
  year: number;
  month: number;
  amount: string;
  note?: string;
}

export interface UpdateBillPaymentRequest {
  amount: string;
  note?: string;
}

export interface BillPaymentListResponse {
  bill_payments: BillPayment[];
  total: number;
}

export interface MonthlyTotalResponse {
  year: number;
  month: number;
  total: string;
}

export interface ExpenseType {
  id: number;
  name: string;
  icon: string;
  color: string;
  bill_day: number;
  bill_cycle: number;
  fixed_amount: string;
  default_bill_type_id?: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseTypeRequest {
  name: string;
  icon?: string;
  color?: string;
  bill_day?: number;
  bill_cycle?: number;
  fixed_amount?: string;
  default_bill_type_id?: number;
}

export interface UpdateExpenseTypeRequest {
  name: string;
  icon?: string;
  color?: string;
  bill_day?: number;
  bill_cycle?: number;
  fixed_amount?: string;
  default_bill_type_id?: number;
}

export interface ExpenseTypeListResponse {
  expense_types: ExpenseType[];
  total: number;
}

// Expense Item interfaces
export interface ExpenseItem {
  id: number;
  bill_payment_id?: number;
  bill_type_id?: number;
  expense_type_id: number;
  year: number;
  month: number;
  amount: string;
  note: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  expense_type?: ExpenseType;
  bill_payment?: BillPayment;
  bill_type?: BillType;
}

export interface CreateExpenseItemRequest {
  bill_payment_id?: number;
  bill_type_id?: number;
  expense_type_id: number;
  year: number;
  month: number;
  amount: string;
  note: string;
}

export interface UpdateExpenseItemRequest {
  bill_payment_id?: number;
  bill_type_id?: number;
  expense_type_id: number;
  year: number;
  month: number;
  amount: string;
  note: string;
}

export interface ExpenseItemListResponse {
  expense_items: ExpenseItem[];
  total: number;
}

export interface ExpenseItemMonthlyResponse {
  expense_items: ExpenseItem[];
  total_amount: string;
  year: number;
  month: number;
}

export const authAPI = {
  // Login user
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  // Register new user
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', userData);
    return response.data;
  },

  // Get current user info
  me: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  // Logout user
  logout: async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/auth/logout');
    return response.data;
  },

  // Refresh access token
  refresh: async (): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/refresh');
    return response.data;
  },

  // Change password
  changePassword: async (passwordData: ChangePasswordRequest): Promise<{ message: string }> => {
    const response = await api.put<{ message: string }>('/auth/password', passwordData);
    return response.data;
  },

  // Delete user account
  deleteAccount: async (): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>('/user/account');
    return response.data;
  },
};

export const billTypeAPI = {
  // List bill types
  list: async (params?: { limit?: number; offset?: number; include_stopped?: boolean }): Promise<BillTypeListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.include_stopped) searchParams.append('include_stopped', 'true');
    
    const response = await api.get<BillTypeListResponse>(`/bill-types?${searchParams.toString()}`);
    return response.data;
  },

  // Get bill type by ID
  get: async (id: number): Promise<BillType> => {
    const response = await api.get<BillType>(`/bill-types/${id}`);
    return response.data;
  },

  // Create new bill type
  create: async (data: CreateBillTypeRequest): Promise<BillType> => {
    const response = await api.post<BillType>('/bill-types', data);
    return response.data;
  },

  // Update bill type
  update: async (id: number, data: UpdateBillTypeRequest): Promise<BillType> => {
    const response = await api.put<BillType>(`/bill-types/${id}`, data);
    return response.data;
  },

  // Delete bill type
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/bill-types/${id}`);
    return response.data;
  },

  // Toggle bill type (enable/disable)
  toggle: async (id: number): Promise<BillType> => {
    const response = await api.post<BillType>(`/bill-types/${id}/toggle`);
    return response.data;
  },

  // Get bill payments for a specific bill type
  getPayments: async (id: number): Promise<{ bill_payments: BillPayment[]; total: number }> => {
    const response = await api.get<{ bill_payments: BillPayment[]; total: number }>(`/bill-types/${id}/payments`);
    return response.data;
  },
};

export interface BillPaymentParams {
  limit?: number;
  offset?: number;
  bill_type_id?: number;
  year?: number;
  month?: number;
}

export const billPaymentAPI = {
  // List bill payments
  list: async (params?: BillPaymentParams): Promise<BillPaymentListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    if (params?.bill_type_id) searchParams.append('bill_type_id', params.bill_type_id.toString());
    if (params?.year) searchParams.append('year', params.year.toString());
    if (params?.month) searchParams.append('month', params.month.toString());

    const response = await api.get<BillPaymentListResponse>(`/bill-payments?${searchParams.toString()}`);
    return response.data;
  },
  create: async (data: CreateBillPaymentRequest): Promise<BillPayment> => {
    const response = await api.post<BillPayment>('/bill-payments', data);
    return response.data;
  },
  get: async (id: number): Promise<BillPayment> => {
    const response = await api.get<BillPayment>(`/bill-payments/${id}`);
    return response.data;
  },

  // Update bill payment
  update: async (id: number, data: UpdateBillPaymentRequest): Promise<BillPayment> => {
    const response = await api.put<BillPayment>(`/bill-payments/${id}`, data);
    return response.data;
  },

  // Delete bill payment
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/bill-payments/${id}`);
    return response.data;
  },

  // Get monthly total
  getMonthlyTotal: async (year: number, month: number): Promise<MonthlyTotalResponse> => {
    const response = await api.get<MonthlyTotalResponse>(`/bill-payments/monthly-total?year=${year}&month=${month}`);
    return response.data;
  },
};

export const expenseTypeAPI = {
  // List expense types
  list: async (params?: { limit?: number; offset?: number }): Promise<ExpenseTypeListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    
    const response = await api.get<ExpenseTypeListResponse>(`/expense-types?${searchParams.toString()}`);
    return response.data;
  },

  // Get expense type by ID
  get: async (id: number): Promise<ExpenseType> => {
    const response = await api.get<ExpenseType>(`/expense-types/${id}`);
    return response.data;
  },

  // Create new expense type
  create: async (data: CreateExpenseTypeRequest): Promise<ExpenseType> => {
    const response = await api.post<ExpenseType>('/expense-types', data);
    return response.data;
  },

  // Update expense type
  update: async (id: number, data: UpdateExpenseTypeRequest): Promise<ExpenseType> => {
    const response = await api.put<ExpenseType>(`/expense-types/${id}`, data);
    return response.data;
  },

  // Delete expense type
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/expense-types/${id}`);
    return response.data;
  },
};

export interface ExpenseItemParams {
  expense_type_id?: number;
  bill_payment_id?: number;
  bill_type_id?: number;
  unbilled_only?: boolean;
  year?: number;
  month?: number;
  limit?: number;
  offset?: number;
}

export const expenseItemAPI = {
  // List expense items with optional filters
  list: async (params?: ExpenseItemParams): Promise<ExpenseItemListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.expense_type_id) searchParams.append('expense_type_id', params.expense_type_id.toString());
    if (params?.bill_payment_id) searchParams.append('bill_payment_id', params.bill_payment_id.toString());
    if (params?.bill_type_id) searchParams.append('bill_type_id', params.bill_type_id.toString());
    if (params?.unbilled_only) searchParams.append('unbilled_only', 'true');
    if (params?.year) searchParams.append('year', params.year.toString());
    if (params?.month) searchParams.append('month', params.month.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());
    
    const response = await api.get<ExpenseItemListResponse>(`/expense-items?${searchParams.toString()}`);
    return response.data;
  },

  // Get expense item by ID
  get: async (id: number): Promise<ExpenseItem> => {
    const response = await api.get<ExpenseItem>(`/expense-items/${id}`);
    return response.data;
  },

  // Create new expense item
  create: async (data: CreateExpenseItemRequest): Promise<ExpenseItem> => {
    const response = await api.post<ExpenseItem>('/expense-items', data);
    return response.data;
  },

  // Update expense item
  update: async (id: number, data: UpdateExpenseItemRequest): Promise<ExpenseItem> => {
    const response = await api.put<ExpenseItem>(`/expense-items/${id}`, data);
    return response.data;
  },

  // Delete expense item
  delete: async (id: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/expense-items/${id}`);
    return response.data;
  },

  // Get expense items by month with total
  getByMonth: async (year: number, month: number): Promise<ExpenseItemMonthlyResponse> => {
    const response = await api.get<ExpenseItemMonthlyResponse>(`/expense-items/monthly/${year}/${month}`);
    return response.data;
  },
};

// Notification Settings API
export interface UserNotificationSetting {
  id: number;
  user_id: number;
  bark_api_url: string;
  bark_enabled: boolean;
  remind_hour: number;
  remind_days_before: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOrUpdateNotificationSettingRequest {
  bark_api_url: string;
  bark_enabled: boolean;
  remind_hour: number;
  remind_days_before: number;
}

export interface ManualReminderResponse {
  bills_due_count: number;
  days_before: number;
  target_date: string;
  sent: boolean;
  message: string;
}

export const notificationSettingsApi = {
  // Get user notification settings
  get: async (): Promise<UserNotificationSetting> => {
    const response = await api.get<UserNotificationSetting>('/notifications/settings');
    return response.data;
  },

  // Create or update notification settings
  createOrUpdate: async (data: CreateOrUpdateNotificationSettingRequest): Promise<UserNotificationSetting> => {
    const response = await api.put<UserNotificationSetting>('/notifications/settings', data);
    return response.data;
  },

  // Send test notification
  test: async (): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/notifications/test');
    return response.data;
  },

  // Trigger manual reminder
  triggerManualReminder: async (days?: number): Promise<ManualReminderResponse> => {
    const url = days !== undefined ? `/notifications/manual-reminder?days=${days}` : '/notifications/manual-reminder';
    const response = await api.post<ManualReminderResponse>(url);
    return response.data;
  },
};

// Dashboard API types
export interface UpcomingBill {
  id: number;
  name: string;
  icon: string;
  color: string;
  fixed_amount: string;
  next_due_date: string;
  days_until_due: number;
}

export interface UpcomingExpense {
  id: number;
  name: string;
  icon: string;
  color: string;
  fixed_amount: string;
  next_due_date: string;
  days_until_due: number;
}

export interface BillTypeInfo {
  id: number;
  name: string;
  icon: string;
  color: string;
  fixed_amount: string;
}

export interface DashboardStats {
  total_expenses: number;
  bills_paid: number;
  pending_bills: number;
  pending_expenses: number;
  categories: number;
  upcoming_bills: UpcomingBill[];
  upcoming_expenses: UpcomingExpense[];
  on_demand_bills: BillTypeInfo[];
}

export interface DueBill {
  id: number;
  name: string;
  icon: string;
  color: string;
  fixed_amount: string;
  bill_day: number;
  bill_cycle: number;
  next_due_date: string;
  days_until_due: number;
  status: 'overdue' | 'due_soon' | 'upcoming';
  has_current_payment: boolean;
  last_payment_year?: number;
  last_payment_month?: number;
  last_payment_amount?: string;
}

export interface DueBillsResponse {
  due_bills: DueBill[];
  year: number;
  month: number;
}

export interface DueExpense {
  id: number;
  name: string;
  icon: string;
  color: string;
  fixed_amount: string;
  bill_day: number;
  bill_cycle: number;
  next_due_date: string;
  days_until_due: number;
  status: 'overdue' | 'due_soon' | 'upcoming';
  has_current_expense: boolean;
  last_expense_year?: number;
  last_expense_month?: number;
  last_expense_amount?: string;
}

export interface DueExpensesResponse {
  due_expenses: DueExpense[];
  year: number;
  month: number;
}

export const dashboardAPI = {
  // Get dashboard stats
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },

  // Get due bills for a specific month
  getDueBills: async (year?: number, month?: number): Promise<DueBillsResponse> => {
    const searchParams = new URLSearchParams();
    if (year) searchParams.append('year', year.toString());
    if (month) searchParams.append('month', month.toString());
    const response = await api.get<DueBillsResponse>(`/dashboard/due-bills?${searchParams.toString()}`);
    return response.data;
  },

  // Get due expenses for a specific month
  getDueExpenses: async (year?: number, month?: number): Promise<DueExpensesResponse> => {
    const searchParams = new URLSearchParams();
    if (year) searchParams.append('year', year.toString());
    if (month) searchParams.append('month', month.toString());
    const response = await api.get<DueExpensesResponse>(`/dashboard/due-expenses?${searchParams.toString()}`);
    return response.data;
  },
};

// Reports API types
export interface TypeBreakdownItem {
  amount: number;
  count: number;
  color: string;
  icon: string;
}

export interface MonthlyReport {
  year: number;
  month: number;
  total_amount: number;
  expense_amount: number;
  bill_amount: number;
  unexplained_payment: number;
  expense_type_breakdown: Record<string, TypeBreakdownItem>;
  bill_type_breakdown: Record<string, TypeBreakdownItem>;
}

export interface YearlySummary {
  total_amount: number;
  total_expense_amount: number;
  total_bill_amount: number;
  average_monthly: number;
}

export interface YearlyReport {
  year: number;
  months: MonthlyReport[];
  summary: YearlySummary;
}

export interface UserDevice {
  id: number;
  device_name: string;
  device_type: string;
  ip_address: string;
  last_used_at: string;
  created_at: string;
  is_current: boolean;
}

export interface UserDevicesResponse {
  devices: UserDevice[];
  total: number;
}

export const reportsAPI = {
  // Get monthly report
  getMonthly: async (year: number, month: number): Promise<MonthlyReport> => {
    const response = await api.get<MonthlyReport>(`/reports/monthly?year=${year}&month=${month}`);
    return response.data;
  },

  // Get yearly report
  getYearly: async (year: number): Promise<YearlyReport> => {
    const response = await api.get<YearlyReport>(`/reports/yearly?year=${year}`);
    return response.data;
  },
};

export const deviceAPI = {
  // Get all user devices
  list: async (): Promise<UserDevicesResponse> => {
    const response = await api.get<UserDevicesResponse>('/devices');
    return response.data;
  },

  // Delete a specific device
  delete: async (deviceId: number): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/devices/${deviceId}`);
    return response.data;
  },

  // Delete all other devices
  deleteAll: async (): Promise<{ message: string; count: number }> => {
    const response = await api.delete<{ message: string; count: number }>('/devices');
    return response.data;
  },
};

export default api;
