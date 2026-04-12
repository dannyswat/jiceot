import { DEFAULT_CURRENCY_SYMBOL } from './constants'
import { getStoredUser } from '../services/api'

function resolveCurrencySymbol(currencySymbol?: string): string {
	const candidate = currencySymbol?.trim() || getStoredUser()?.currency_symbol?.trim()
	return candidate || DEFAULT_CURRENCY_SYMBOL
}

export function formatCurrency(amount: number, currencySymbol?: string, locale = 'en-US'): string {
	const symbol = resolveCurrencySymbol(currencySymbol)
	const roundedAmount = Number.isFinite(amount) ? Math.round(amount) : 0
	const prefix = roundedAmount < 0 ? '-' : ''
	const formattedAmount = new Intl.NumberFormat(locale, {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(Math.abs(roundedAmount))

	return `${prefix}${symbol}${formattedAmount}`
}

export function parseCurrencyInput(value: string): number {
	const normalized = value.replace(/[^\d.-]/g, '')
	const parsed = Number.parseFloat(normalized)
	return Number.isFinite(parsed) ? Math.round(parsed) : 0
}

export function normalizeCurrencyInput(value: string): string {
	const digitsOnly = value.replace(/\D/g, '')
	if (!digitsOnly) {
		return ''
	}

	return digitsOnly.replace(/^0+(?=\d)/, '')
}