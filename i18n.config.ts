// Supported locales - add new languages here
export const locales = ['nl', 'en'] as const;

// Default locale is Dutch, fallback for non-Dutch browsers is English
export const defaultLocale = 'nl' as const;
export const fallbackLocale = 'en' as const;

export type Locale = (typeof locales)[number];

// Human-readable names for each locale
export const localeNames: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
};

// Flag emojis for language switcher UI
export const localeFlags: Record<Locale, string> = {
  nl: '🇳🇱',
  en: '🇬🇧',
};

// Browser language codes that map to our locales
// Used for automatic language detection
export const browserLanguageMap: Record<string, Locale> = {
  // Dutch
  nl: 'nl',
  'nl-NL': 'nl',
  'nl-BE': 'nl',
  // English (and fallback for all others)
  en: 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'en-AU': 'en',
  'en-CA': 'en',
};

/**
 * Detect the best locale based on browser's Accept-Language header
 * Returns 'nl' for Dutch browsers, 'en' for all others
 */
export function detectLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return fallbackLocale;

  // Parse Accept-Language header (e.g., "nl-NL,nl;q=0.9,en;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: code.trim(),
        quality: qValue ? parseFloat(qValue) : 1.0,
      };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find the first matching locale
  for (const { code } of languages) {
    // Check exact match first
    if (browserLanguageMap[code]) {
      return browserLanguageMap[code];
    }
    // Check language prefix (e.g., 'nl' from 'nl-NL')
    const prefix = code.split('-')[0];
    if (browserLanguageMap[prefix]) {
      return browserLanguageMap[prefix];
    }
  }

  // Default to English for non-Dutch browsers
  return fallbackLocale;
}

/**
 * Check if a locale is valid
 */
export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}