import {
	createContext,
	startTransition,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react'

import { authAPI, clearStoredAuth, getStoredToken, getStoredUser, registerUnauthorizedHandler, storeAuthSession, storeUser, userAPI } from '../services/api'
import type { AuthContextValue, ChangePasswordRequest, LoginRequest, RegisterRequest, User } from '../types/auth'

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(() => getStoredUser())
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		registerUnauthorizedHandler(() => {
			startTransition(() => {
				setUser(null)
				setIsLoading(false)
			})
		})

		return () => {
			registerUnauthorizedHandler(null)
		}
	}, [])

	useEffect(() => {
		async function bootstrap(): Promise<void> {
			const token = getStoredToken()
			if (!token) {
				setIsLoading(false)
				return
			}

			try {
				const currentUser = await authAPI.me()
				storeUser(currentUser)
				startTransition(() => setUser(currentUser))
			} catch {
				clearStoredAuth()
				startTransition(() => setUser(null))
			} finally {
				setIsLoading(false)
			}
		}

		void bootstrap()
	}, [])

	const value = useMemo<AuthContextValue>(() => ({
		user,
		isAuthenticated: user !== null,
		isLoading,
		login: async (email: string, password: string) => {
			setIsLoading(true)
			try {
				const payload: LoginRequest = {
					email,
					password,
					device_name: detectBrowserName(),
					device_type: 'web',
				}
				const response = await authAPI.login(payload)
				storeAuthSession(response)
				startTransition(() => setUser(response.user))
			} finally {
				setIsLoading(false)
			}
		},
		register: async (name: string, email: string, password: string) => {
			setIsLoading(true)
			try {
				const payload: RegisterRequest = { name, email, password }
				const response = await authAPI.register(payload)
				storeAuthSession(response)
				startTransition(() => setUser(response.user))
			} finally {
				setIsLoading(false)
			}
		},
		logout: async () => {
			setIsLoading(true)
			try {
				await authAPI.logout()
			} finally {
				clearStoredAuth()
				startTransition(() => setUser(null))
				setIsLoading(false)
			}
		},
		changePassword: async (currentPassword: string, nextPassword: string) => {
			setIsLoading(true)
			try {
				const payload: ChangePasswordRequest = {
					current_password: currentPassword,
					new_password: nextPassword,
				}
				await authAPI.changePassword(payload)
			} finally {
				setIsLoading(false)
			}
		},
		updateCurrencySymbol: async (currencySymbol: string) => {
			setIsLoading(true)
			try {
				const updatedUser = await userAPI.updateCurrencySymbol({
					currency_symbol: currencySymbol,
				})
				storeUser(updatedUser)
				startTransition(() => setUser(updatedUser))
			} finally {
				setIsLoading(false)
			}
		},
		deleteAccount: async () => {
			setIsLoading(true)
			try {
				await authAPI.deleteAccount()
			} finally {
				clearStoredAuth()
				startTransition(() => setUser(null))
				setIsLoading(false)
			}
		},
		refreshSession: async () => {
			const currentUser = await authAPI.me()
			storeUser(currentUser)
			startTransition(() => setUser(currentUser))
		},
	}), [isLoading, user])

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
	const context = useContext(AuthContext)
	if (context === null) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}

function detectBrowserName(): string {
	const agent = window.navigator.userAgent
	if (agent.includes('Firefox')) {
		return 'Firefox'
	}
	if (agent.includes('Edg')) {
		return 'Edge'
	}
	if (agent.includes('Chrome')) {
		return 'Chrome'
	}
	if (agent.includes('Safari')) {
		return 'Safari'
	}
	return 'Web Browser'
}