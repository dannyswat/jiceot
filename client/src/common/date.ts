import { getLocaleForLanguage, getStoredLanguage } from '../contexts/I18nContext'

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const MONTH_ABBREVIATIONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatDate(date: string | Date, locale = 'en-US'): string {
	void locale
	const resolved = typeof date === 'string' ? new Date(date) : date
	if (Number.isNaN(resolved.getTime())) {
		return ''
	}

	const day = resolved.getDate()
	const month = MONTH_ABBREVIATIONS[resolved.getMonth()]
	const year = String(resolved.getFullYear()).slice(-2)

	return `${day}-${month}-${year}`
}

export function formatMonthYear(date: string | Date, locale = 'en-US'): string {
	const resolved = typeof date === 'string' ? new Date(date) : date
	return new Intl.DateTimeFormat(locale === 'en-US' ? getLocaleForLanguage(getStoredLanguage()) : locale, { month: 'long', year: 'numeric' }).format(resolved)
}

export function toDateInputValue(date: string | Date): string {
	if (typeof date === 'string' && DATE_ONLY.test(date)) {
		return date
	}
	const resolved = typeof date === 'string' ? new Date(date) : date
	return resolved.toISOString().slice(0, 10)
}

export function daysUntil(date: string | Date): number {
	const resolved = typeof date === 'string' ? new Date(date) : date
	const today = new Date()
	const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
	const end = new Date(resolved.getFullYear(), resolved.getMonth(), resolved.getDate())
	return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

export function startOfMonth(year: number, month: number): string {
	return new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10)
}

export function endOfMonth(year: number, month: number): string {
	return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
}