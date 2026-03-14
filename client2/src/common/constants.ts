import type { RecurringPeriod, RecurringType } from '../types/expense'
import type { WalletTypeFilter } from '../types/wallet'

export const PRESET_COLORS = [
  '#d94f3d',
  '#f48c06',
  '#2a9d8f',
  '#277da1',
  '#577590',
  '#3d405b',
  '#81b29a',
  '#e07a5f',
  '#f2cc8f',
  '#7f5539',
  '#588157',
  '#bc4749',
] as const

export const PRESET_ICONS = [
  '💳', '💵', '🏦', '🧾', '🍽️', '🛒', '🚗', '🏠', '📱', '💡', '🎓', '🏥',
  '🧳', '🎁', '🛠️', '🧴', '☕', '🎧', '🧺', '🪴', '🧠', '🧮', '📦', '🪙',
] as const

export const WALLET_TYPE_OPTIONS: { value: WalletTypeFilter; label: string }[] = [
	{ value: 'all', label: 'All wallets' },
	{ value: 'credit', label: 'Credit wallets' },
	{ value: 'cash', label: 'Cash wallets' },
	{ value: 'normal', label: 'Standard wallets' },
]

export const BILL_PERIOD_OPTIONS = [
	{ value: 'none', label: 'No billing cycle' },
	{ value: 'monthly', label: 'Monthly' },
	{ value: 'bimonthly', label: 'Every 2 months' },
	{ value: 'quarterly', label: 'Quarterly' },
	{ value: 'fourmonths', label: 'Every 4 months' },
	{ value: 'semiannually', label: 'Twice a year' },
	{ value: 'annually', label: 'Annually' },
] as const

export const RECURRING_TYPE_OPTIONS: { value: RecurringType; label: string }[] = [
	{ value: 'none', label: 'No recurrence' },
	{ value: 'fixed_day', label: 'Fixed day' },
	{ value: 'flexible', label: 'Flexible' },
]

export const RECURRING_PERIOD_OPTIONS: { value: RecurringPeriod; label: string }[] = [
	{ value: 'none', label: 'None' },
	{ value: 'weekly', label: 'Weekly' },
	{ value: 'biweekly', label: 'Biweekly' },
	{ value: 'monthly', label: 'Monthly' },
	{ value: 'bimonthly', label: 'Every 2 months' },
	{ value: 'quarterly', label: 'Quarterly' },
	{ value: 'fourmonths', label: 'Every 4 months' },
	{ value: 'semiannually', label: 'Twice a year' },
	{ value: 'annually', label: 'Annually' },
] as const

export const APP_SECTIONS = [
	{ label: 'Dashboard', path: '/dashboard', description: 'Overview, due items, and recent financial motion.' },
	{ label: 'Due Items', path: '/due-items', description: 'Fixed and flexible obligations lined up by urgency.' },
	{ label: 'Wallets', path: '/wallets', description: 'Credit, cash, and standard money sources.' },
	{ label: 'Payments', path: '/payments', description: 'Ledger of wallet-linked outgoing payments.' },
	{ label: 'Expense Types', path: '/expense-types', description: 'Hierarchy, defaults, and recurring logic.' },
	{ label: 'Expenses', path: '/expenses', description: 'Day-by-day spend records linked to wallets and payments.' },
	{ label: 'Reports', path: '/reports', description: 'Monthly and yearly breakdowns by type and wallet.' },
	{ label: 'Settings', path: '/settings', description: 'Profile, password, and device session management.' },
] as const