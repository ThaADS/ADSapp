'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from '@/components/providers/translation-provider'
import { createClient } from '@/lib/supabase/client'

interface LanguageSettingsProps {
  userId: string
  currentPreference: 'nl' | 'en' | null
}

export function LanguageSettings({ userId, currentPreference }: LanguageSettingsProps) {
  const t = useTranslations('settings')
  const locale = useLocale()

  const [selectedLanguage, setSelectedLanguage] = useState<'nl' | 'en'>(
    currentPreference || locale as 'nl' | 'en'
  )
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')

    try {
      const supabase = createClient()

      // Update user's preferred_language in database
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: selectedLanguage })
        .eq('id', userId)

      if (error) throw error

      setSaveStatus('success')

      // Set locale cookie for the new language
      document.cookie = `NEXT_LOCALE=${selectedLanguage}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`

      // Reload page to apply new language throughout the app
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('Failed to save language preference:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Title and description */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          {t('language.title', 'Language Preference')}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {t('language.description', 'Choose your preferred language for the ADSapp interface.')}
        </p>
      </div>

      {/* Language selection */}
      <div className="space-y-3">
        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="language"
            value="en"
            checked={selectedLanguage === 'en'}
            onChange={(e) => setSelectedLanguage(e.target.value as 'en')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-2xl">🇬🇧</span>
          <span className="text-sm font-medium text-gray-900">English</span>
        </label>

        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="language"
            value="nl"
            checked={selectedLanguage === 'nl'}
            onChange={(e) => setSelectedLanguage(e.target.value as 'nl')}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-2xl">🇳🇱</span>
          <span className="text-sm font-medium text-gray-900">Nederlands</span>
        </label>
      </div>

      {/* Save button and status messages */}
      <div className="space-y-2">
        <button
          onClick={handleSave}
          disabled={isSaving || selectedLanguage === currentPreference}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving
            ? t('language.saving', 'Saving...')
            : t('language.save', 'Save Preference')}
        </button>

        {saveStatus === 'success' && (
          <p className="text-sm text-green-600">
            {t('language.saved', 'Language preference saved!')}
          </p>
        )}

        {saveStatus === 'error' && (
          <p className="text-sm text-red-600">
            {t('language.error', 'Failed to save. Please try again.')}
          </p>
        )}

        <p className="text-xs text-gray-500">
          {t('language.note', 'The page will reload to apply your new language preference.')}
        </p>
      </div>
    </div>
  )
}
