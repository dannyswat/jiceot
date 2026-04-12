export interface User {
  id: number
  email: string
  name: string
  currency_symbol: string
  language: 'en' | 'zh-Hant' | 'zh-Hans'
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  token: string
  refresh_token?: string
  expires_at: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
  device_name?: string
  device_type?: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface ChangePasswordRequest {
  current_password: string
  new_password: string
}

export interface UpdateCurrencySymbolRequest {
	currency_symbol: string
}

export interface UpdateLanguageRequest {
  language: 'en' | 'zh-Hant' | 'zh-Hans'
}

export interface UserDevice {
  id: number
  device_name: string
  device_type: string
  ip_address: string
  last_used_at: string
  created_at: string
  is_current: boolean
}

export interface DeviceListResponse {
  devices: UserDevice[]
  total: number
}

export interface MessageResponse {
  message: string
}

export interface DeleteDevicesResponse extends MessageResponse {
  count: number
}

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  changePassword: (currentPassword: string, nextPassword: string) => Promise<void>
  updateCurrencySymbol: (currencySymbol: string) => Promise<void>
  updateLanguage: (language: 'en' | 'zh-Hant' | 'zh-Hans') => Promise<void>
  deleteAccount: () => Promise<void>
  refreshSession: () => Promise<void>
}