'use client'

import { createContext, useContext, useMemo, useState, useCallback, type ReactNode } from 'react'
import { locales, localeNames, localeFlags, defaultLocale, type Locale } from '@/../i18n.config'

const LOCALE_COOKIE = 'NEXT_LOCALE'

// Types
type NestedDictionary = {
  [key: string]: string | NestedDictionary
}

type TranslationContextType = {
  locale: Locale
  t: (key: string, params?: Record<string, string | number>) => string
  setLocale: (locale: Locale) => void
  locales: typeof locales
  localeNames: typeof localeNames
  localeFlags: typeof localeFlags
}

// Context
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

interface TranslationProviderProps {
  children: ReactNode
  locale: Locale
  translations: NestedDictionary
}

/**
 * Translation provider for client components
 * Wrap your app with this provider to enable translations
 */
export function TranslationProvider({
  children,
  locale: initialLocale,
  translations,
}: TranslationProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)

  const setLocale = useCallback((newLocale: Locale) => {
    // Set cookie
    document.cookie = `${LOCALE_COOKIE}=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    setLocaleState(newLocale)
    // Reload to get new translations
    window.location.reload()
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const value = getNestedValue(translations, key)
      if (!value) {
        // Return key as fallback (helps identify missing translations)
        console.warn(`Missing translation: ${key}`)
        return key
      }
      return interpolate(value, params)
    },
    [translations]
  )

  const contextValue = useMemo<TranslationContextType>(
    () => ({
      locale,
      t,
      setLocale,
      locales,
      localeNames,
      localeFlags,
    }),
    [locale, t, setLocale]
  )

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  )
}

/**
 * Hook to access translations in client components
 * @param namespace Optional namespace to prefix all keys
 */
export function useTranslations(namespace?: string) {
  const context = useContext(TranslationContext)

  if (!context) {
    // Return a fallback function that returns the key
    return (key: string, _params?: Record<string, string | number>) => {
      const fullKey = namespace ? `${namespace}.${key}` : key
      return fullKey
    }
  }

  return (key: string, params?: Record<string, string | number>) => {
    const fullKey = namespace ? `${namespace}.${key}` : key
    return context.t(fullKey, params)
  }
}

/**
 * Hook to access the current locale
 */
export function useLocale(): Locale {
  const context = useContext(TranslationContext)

  if (!context) {
    // Fallback to cookie or default
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
 * Hook to change the locale
 */
export function useSetLocale() {
  const context = useContext(TranslationContext)

  return useCallback(
    (newLocale: Locale) => {
      if (context?.setLocale) {
        context.setLocale(newLocale)
      } else {
        // Fallback: set cookie and reload
        document.cookie = `${LOCALE_COOKIE}=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
        window.location.reload()
      }
    },
    [context]
  )
}

/**
 * Hook to get all i18n utilities
 */
export function useI18n() {
  const context = useContext(TranslationContext)

  if (!context) {
    return {
      locale: defaultLocale,
      t: (key: string) => key,
      setLocale: () => {},
      locales,
      localeNames,
      localeFlags,
    }
  }

  return context
}

export { TranslationContext }
