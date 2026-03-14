export function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
	if (!Number.isFinite(amount)) {
		return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(0)
	}

	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		maximumFractionDigits: 2,
	}).format(amount)
}

export function parseCurrencyInput(value: string): number {
	const normalized = value.replace(/[^\d.-]/g, '')
	const parsed = Number.parseFloat(normalized)
	return Number.isFinite(parsed) ? parsed : 0
}