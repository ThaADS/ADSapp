import 'server-only'
import type { Locale } from '@/../i18n.config'

// Dictionary types for type safety
export type Dictionary = {
  [key: string]: string | Dictionary
}

// Available namespaces
export const namespaces = [
  'admin',
  'auth',
  'common',
  'dashboard',
  'billing',
  'onboarding',
  'inbox',
  'workflow',
  'analytics',
] as const

export type Namespace = (typeof namespaces)[number]

// Full dictionary loaders - nl is default, en is fallback
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  nl: () => import('@/locales/nl/index').then(module => module.default),
  en: () => import('@/locales/en/index').then(module => module.default),
}

/**
 * Get all translations for a locale
 */
export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  return dictionaries[locale]()
}

/**
 * Get translations for a specific namespace
 */
export const getNamespaceDictionary = async (
  locale: Locale,
  namespace: Namespace
): Promise<Dictionary> => {
  const dict = await getDictionary(locale)
  return (dict[namespace] as Dictionary) || {}
}

/**
 * Get translations for multiple namespaces
 */
export const getNamespacesDictionary = async (
  locale: Locale,
  namespaceList: Namespace[]
): Promise<Record<Namespace, Dictionary>> => {
  const dict = await getDictionary(locale)
  const result: Partial<Record<Namespace, Dictionary>> = {}

  for (const ns of namespaceList) {
    result[ns] = (dict[ns] as Dictionary) || {}
  }

  return result as Record<Namespace, Dictionary>
}
