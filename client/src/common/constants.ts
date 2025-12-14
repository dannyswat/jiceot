/**
 * Shared constants for the application
 * This file contains reusable constants to maintain consistency across the app
 */

// Color presets for bills and expense types
export const PRESET_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#84cc16', // Lime
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#6b7280', // Gray
  '#78716c', // Stone
];

// Icon presets for bills and expense types
export const PRESET_ICONS = [
  '💡', '⚡', '🏠', '🏢', '🚰', '💰', '💳', '🍽️', '🛒', 
  '🚗', '⛽', '🚌', '📱', '💻', '🌐', '📺', '🎵', '🎬',
  '🏥', '💊', '🦷', '👨‍⚕️', '🎓', '📚', '🏋️', '🏊', '✂️',
  '👕', '👞', '🛍️', '🎁', '🍕', '☕', '🎉', '🏖️', '✈️'
];

// Billing cycle options for bills and expense types
export const CYCLE_OPTIONS = [
  { value: 0, label: 'On-demand' },
  { value: 1, label: 'Monthly' },
  { value: 2, label: 'Bi-monthly' },
  { value: 3, label: 'Quarterly' },
  { value: 4, label: 'Every 4 months' },
  { value: 6, label: 'Semi-annually' },
  { value: 12, label: 'Annually' },
] as const;
