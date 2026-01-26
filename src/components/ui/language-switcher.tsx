'use client'

import { useState, useRef, useEffect } from 'react'
import { locales, localeNames, localeFlags, type Locale } from '@/../i18n.config'

const LOCALE_COOKIE = 'NEXT_LOCALE'

interface LanguageSwitcherProps {
  /** Current locale */
  currentLocale?: Locale
  /** Compact mode - only shows flag */
  compact?: boolean
  /** Custom class name */
  className?: string
}

/**
 * Get current locale from cookie
 */
function getLocaleFromCookie(): Locale {
  if (typeof document === 'undefined') return 'nl'

  const cookie = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${LOCALE_COOKIE}=`))
  const locale = cookie?.split('=')[1] as Locale

  if (locale && locales.includes(locale)) {
    return locale
  }

  return 'nl'
}

/**
 * Set locale cookie and reload page
 */
function setLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  window.location.reload()
}

export function LanguageSwitcher({
  currentLocale,
  compact = false,
  className = '',
}: LanguageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [locale, setLocaleState] = useState<Locale>(currentLocale || 'nl')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get locale from cookie on mount
  useEffect(() => {
    if (!currentLocale) {
      setLocaleState(getLocaleFromCookie())
    }
  }, [currentLocale])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLocaleChange = (newLocale: Locale) => {
    if (newLocale !== locale) {
      setLocale(newLocale)
    }
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          compact ? 'px-2' : ''
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label="Select language"
      >
        <span className="text-lg">{localeFlags[locale]}</span>
        {!compact && (
          <>
            <span>{localeNames[locale]}</span>
            <svg
              className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </>
        )}
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-2 w-40 origin-top-right rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          role="listbox"
          aria-label="Available languages"
        >
          {locales.map(l => (
            <button
              key={l}
              type="button"
              role="option"
              aria-selected={l === locale}
              onClick={() => handleLocaleChange(l)}
              className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors ${
                l === locale
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-lg">{localeFlags[l]}</span>
              <span className="font-medium">{localeNames[l]}</span>
              {l === locale && (
                <svg className="ml-auto h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Inline language switcher - simple text links
 */
export function InlineLanguageSwitcher({ currentLocale, className = '' }: LanguageSwitcherProps) {
  const [locale, setLocaleState] = useState<Locale>(currentLocale || 'nl')

  useEffect(() => {
    if (!currentLocale) {
      setLocaleState(getLocaleFromCookie())
    }
  }, [currentLocale])

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      {locales.map((l, index) => (
        <span key={l} className="flex items-center gap-2">
          {index > 0 && <span className="text-gray-300">|</span>}
          <button
            type="button"
            onClick={() => l !== locale && setLocale(l)}
            className={`transition-colors ${
              l === locale
                ? 'font-medium text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-current={l === locale ? 'true' : undefined}
          >
            {localeFlags[l]} {localeNames[l]}
          </button>
        </span>
      ))}
    </div>
  )
}

export default LanguageSwitcher
