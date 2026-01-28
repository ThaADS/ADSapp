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
 * Get locale with database priority for authenticated users
 * Priority: 1. Database (preferred_language) 2. Cookie 3. Header 4. Default
 */
export async function getServerLocaleWithUser(userId?: string): Promise<Locale> {
  // If we have a user ID, check database first
  if (userId) {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()

      const { data: profile } = await supabase
        .from('profiles')
        .select('preferred_language')
        .eq('id', userId)
        .single()

      if (profile?.preferred_language && locales.includes(profile.preferred_language as Locale)) {
        return profile.preferred_language as Locale
      }
    } catch (error) {
      // Database lookup failed, fall back to cookie/header
      console.warn('Failed to get language preference from database:', error)
    }
  }

  // Fall back to existing logic
  return getServerLocale()
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
