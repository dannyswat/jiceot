import axios from 'axios';

const API_BASE_URL = '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Extract error message from response
    const message = error.response?.data?.error || error.message || 'An error occurred';
    error.message = message;
    
    return Promise.reject(error);
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

  // Change password
  changePassword: async (passwordData: ChangePasswordRequest): Promise<{ message: string }> => {
    const response = await api.put<{ message: string }>('/auth/password', passwordData);
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
};

export default api;
