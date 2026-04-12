import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'

import { useAuth } from './AuthContext'
import enTranslations from '../locales/en.json'
import zhHansTranslations from '../locales/zh-Hans.json'
import zhHantTranslations from '../locales/zh-Hant.json'
import { getStoredUser } from '../services/api'

export type SupportedLanguage = 'en' | 'zh-Hant' | 'zh-Hans'

export interface LanguageOption {
  value: SupportedLanguage
  label: string
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'zh-Hant', label: '繁體中文' },
  { value: 'zh-Hans', label: '简体中文' },
]

const LANGUAGE_STORAGE_KEY = 'jiceot.language'

const LOCALE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  en: 'en-US',
  'zh-Hant': 'zh-HK',
  'zh-Hans': 'zh-CN',
}

type TranslationTable = Record<string, string>

const translations: Record<SupportedLanguage, TranslationTable> = {
  en: enTranslations,
  'zh-Hant': zhHantTranslations,
  'zh-Hans': zhHansTranslations,
}

interface I18nContextValue {
  language: SupportedLanguage
  locale: string
  t: (key: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function normalizeLanguage(value: string | null | undefined): SupportedLanguage {
  if (value === 'zh-Hant' || value === 'zh-Hans' || value === 'en') {
    return value
  }

  if (value?.startsWith('zh')) {
    return value.toLowerCase().includes('hans') || value.toLowerCase().includes('cn') || value.toLowerCase().includes('sg')
      ? 'zh-Hans'
      : 'zh-Hant'
  }

  return 'en'
}

function detectPreferredLanguage(): SupportedLanguage {
  const stored = typeof window !== 'undefined' ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY) : null
  if (stored) {
    return normalizeLanguage(stored)
  }

  return normalizeLanguage(typeof navigator !== 'undefined' ? navigator.language : 'en')
}

export function getLocaleForLanguage(language: SupportedLanguage): string {
  return LOCALE_BY_LANGUAGE[language]
}

export function getStoredLanguage(): SupportedLanguage {
  const storedUser = getStoredUser()
  const storedLanguage: unknown = storedUser ? (storedUser as { language?: unknown }).language : undefined
  if (typeof storedLanguage === 'string') {
    return normalizeLanguage(storedLanguage)
  }

  return detectPreferredLanguage()
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) {
    return template
  }

  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(params[key] ?? `{${key}}`))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const language = useMemo<SupportedLanguage>(() => {
    const userLanguage: unknown = user ? (user as { language?: unknown }).language : undefined
    return typeof userLanguage === 'string' ? normalizeLanguage(userLanguage) : getStoredLanguage()
  }, [user])

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  }, [language])

  const value = useMemo<I18nContextValue>(() => ({
    language,
    locale: getLocaleForLanguage(language),
    t: (key, params) => {
      const table = translations[language] as Record<string, string>
      return interpolate(table[key] ?? key, params)
    },
  }), [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}