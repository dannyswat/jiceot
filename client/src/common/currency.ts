export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
	if (!Number.isFinite(amount)) {
		return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(0)
	}

	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(Math.round(amount))
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