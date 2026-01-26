import 'server-only'
import { cookies, headers } from 'next/headers'
import { locales, defaultLocale, type Locale } from '@/../i18n.config'

const LOCALE_COOKIE = 'NEXT_LOCALE'

/**
 * Get the current locale on the server
 * Priority: 1. Cookie 2. Header (set by middleware) 3. Default
 */
export async function getServerLocale(): Promise<Locale> {
  // Try to get from cookie first
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value

  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return cookieLocale as Locale
  }

  // Try to get from header (set by middleware)
  const headerStore = await headers()
  const headerLocale = headerStore.get('x-locale')

  if (headerLocale && locales.includes(headerLocale as Locale)) {
    return headerLocale as Locale
  }

  return defaultLocale
}

/**
 * Load translations for a specific namespace
 */
export async function getTranslations(namespace?: string) {
  const locale = await getServerLocale()

  // Dynamic import of translation files
  const translations = await import(`@/locales/${locale}/${namespace || 'common'}.json`)
    .then(m => m.default)
    .catch(() => ({}))

  return {
    locale,
    t: (key: string, params?: Record<string, string | number>): string => {
      const keys = key.split('.')
      let value: unknown = translations

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = (value as Record<string, unknown>)[k]
        } else {
          return key // Return key if translation not found
        }
      }

      if (typeof value !== 'string') {
        return key
      }

      // Interpolate parameters
      if (params) {
        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
          return params[paramKey]?.toString() ?? match
        })
      }

      return value
    },
  }
}

/**
 * Load all translations for multiple namespaces
 */
export async function getAllTranslations(namespaces: string[] = ['common']) {
  const locale = await getServerLocale()
  const translations: Record<string, Record<string, unknown>> = {}

  for (const namespace of namespaces) {
    translations[namespace] = await import(`@/locales/${locale}/${namespace}.json`)
      .then(m => m.default)
      .catch(() => ({}))
  }

  return {
    locale,
    translations,
  }
}
