'use client'

import { createContext, useContext, useCallback, useMemo } from 'react'
import { locales, defaultLocale, localeNames, localeFlags, type Locale } from '@/../i18n.config'

const LOCALE_COOKIE = 'NEXT_LOCALE'

// Translation context type
type TranslationContextType = {
  locale: Locale
  t: (key: string, params?: Record<string, string | number>) => string
  setLocale: (locale: Locale) => void
  locales: typeof locales
  localeNames: typeof localeNames
  localeFlags: typeof localeFlags
}

// Nested dictionary type
type NestedDictionary = {
  [key: string]: string | NestedDictionary
}

// Create context
const TranslationContext = createContext<TranslationContextType | null>(null)

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: NestedDictionary, path: string): string | undefined {
  const keys = path.split('.')
  let current: NestedDictionary | string | undefined = obj

  for (const key of keys) {
    if (current === undefined || typeof current === 'string') {
      return undefined
    }
    current = current[key]
  }

  return typeof current === 'string' ? current : undefined
}

/**
 * Interpolate parameters into a translation string
 * Supports {param} syntax
 */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text

  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key]?.toString() ?? match
  })
}

/**
 * Hook to access translations in client components
 */
export function useTranslations(namespace?: string) {
  const context = useContext(TranslationContext)

  if (!context) {
    throw new Error('useTranslations must be used within a TranslationProvider')
  }

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key
      return context.t(fullKey, params)
    },
    [context, namespace]
  )

  return t
}

/**
 * Hook to access the current locale
 */
export function useLocale(): Locale {
  const context = useContext(TranslationContext)

  if (!context) {
    // Fallback to cookie or default if not in provider
    if (typeof document !== 'undefined') {
      const cookie = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${LOCALE_COOKIE}=`))
      const locale = cookie?.split('=')[1] as Locale
      if (locale && locales.includes(locale)) {
        return locale
      }
    }
    return defaultLocale
  }

  return context.locale
}

/**
 * Hook to change the current locale
 */
export function useSetLocale() {
  const context = useContext(TranslationContext)

  const setLocale = useCallback(
    (newLocale: Locale) => {
      // Set cookie
      document.cookie = `${LOCALE_COOKIE}=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`

      // Use context setter if available, otherwise reload
      if (context?.setLocale) {
        context.setLocale(newLocale)
      }

      // Reload to apply new locale
      window.location.reload()
    },
    [context]
  )

  return setLocale
}

/**
 * Hook to get all i18n utilities
 */
export function useI18n() {
  const context = useContext(TranslationContext)

  if (!context) {
    throw new Error('useI18n must be used within a TranslationProvider')
  }

  return {
    locale: context.locale,
    t: context.t,
    setLocale: context.setLocale,
    locales: context.locales,
    localeNames: context.localeNames,
    localeFlags: context.localeFlags,
  }
}

/**
 * Get current locale from cookie (client-side)
 */
export function getClientLocale(): Locale {
  if (typeof document === 'undefined') return defaultLocale

  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${LOCALE_COOKIE}=`))
  const locale = cookie?.split('=')[1] as Locale

  if (locale && locales.includes(locale)) {
    return locale
  }

  return defaultLocale
}

/**
 * Set locale cookie (client-side)
 */
export function setClientLocale(locale: Locale): void {
  if (typeof document === 'undefined') return

  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
}

// Export context for provider
export { TranslationContext }
export type { TranslationContextType, NestedDictionary }
