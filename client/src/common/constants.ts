import type { RecurringPeriod, RecurringType } from '../types/expense'
import type { WalletTypeFilter } from '../types/wallet'

export const PRESET_COLORS = [
  '#d94f3d',
	'#ef4444',
	'#dc2626',
  '#f48c06',
	'#f59e0b',
	'#f97316',
	'#eab308',
  '#2a9d8f',
	'#10b981',
	'#059669',
	'#14b8a6',
  '#277da1',
	'#0ea5e9',
	'#0284c7',
	'#06b6d4',
  '#577590',
	'#3b82f6',
	'#2563eb',
	'#6366f1',
	'#4f46e5',
	'#8b5cf6',
  '#3d405b',
	'#7c3aed',
	'#9333ea',
	'#c026d3',
	'#db2777',
	'#ec4899',
  '#81b29a',
  '#e07a5f',
  '#f2cc8f',
  '#7f5539',
  '#588157',
  '#bc4749',
	'#65a30d',
	'#84cc16',
	'#0f766e',
	'#6b7280',
	'#475569',
	'#1f2937',
] as const

export const PRESET_ICONS = [
  '💳', '💵', '🏦', '🧾', '🍽️', '🛒', '🚗', '🏠', '📱', '💡', '🎓', '🏥',
  '🧳', '🎁', '🛠️', '🧴', '☕', '🎧', '🧺', '🪴', '🧠', '🧮', '📦', '🪙',
] as const

export const WALLET_TYPE_OPTIONS: { value: WalletTypeFilter; label: string }[] = [
	{ value: 'all', label: 'All' },
	{ value: 'credit', label: 'Credit' },
	{ value: 'cash', label: 'Cash' },
	{ value: 'normal', label: 'Standard' },
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