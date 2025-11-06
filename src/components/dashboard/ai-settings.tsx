'use client'

/**
 * AI Settings Component
 * Configure AI features for organization
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AISettings } from '@/types/ai'

export default function AISettingsComponent() {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [settings, setSettings] = useState<Partial<AISettings> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load organization ID and settings on mount
  useEffect(() => {
    loadOrganizationId()
  }, [])

  useEffect(() => {
    if (organizationId) {
      loadSettings()
    }
  }, [organizationId])

  const loadOrganizationId = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError('Not authenticated')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id)
      }
    } catch (err) {
      console.error('Load organization error:', err)
      setError('Failed to load organization')
    }
  }

  const loadSettings = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/ai/settings')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load settings')
      }

      setSettings(data.settings)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
      console.error('Load settings error:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return

    try {
      setSaving(true)
      setError(null)
      setSuccessMessage(null)

      const response = await fetch('/api/ai/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }

      setSettings(data.settings)
      setSuccessMessage('Instellingen succesvol opgeslagen')

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
      console.error('Save settings error:', err)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, value: unknown) => {
    setSettings(prev => {
      if (!prev) return null

      // Handle nested features_enabled updates
      if (
        key === 'draft_suggestions' ||
        key === 'auto_response' ||
        key === 'sentiment_analysis' ||
        key === 'summarization'
      ) {
        return {
          ...prev,
          features_enabled: {
            ...prev.features_enabled,
            [key]: value,
          },
        }
      }

      // Handle top-level updates
      return { ...prev, [key]: value }
    })
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600'></div>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className='rounded-lg border border-red-200 bg-red-50 p-4'>
        <p className='text-red-800'>Kon AI instellingen niet laden.</p>
        <button
          onClick={loadSettings}
          className='mt-2 text-sm text-red-600 underline hover:text-red-800'
        >
          Opnieuw proberen
        </button>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h2 className='text-2xl font-bold text-gray-900'>AI Instellingen</h2>
        <p className='mt-1 text-sm text-gray-600'>
          Configureer AI-functies voor automatisering en intelligente assistentie
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-4'>
          <p className='text-sm text-red-800'>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className='rounded-lg border border-green-200 bg-green-50 p-4'>
          <p className='text-sm text-green-800'>{successMessage}</p>
        </div>
      )}

      {/* Main Settings */}
      <div className='divide-y divide-gray-200 rounded-lg bg-white shadow'>
        {/* AI Features Toggle */}
        <div className='p-6'>
          <h3 className='mb-4 text-lg font-medium text-gray-900'>AI Features</h3>

          <div className='space-y-4'>
            {/* Master AI Toggle */}
            <div className='flex items-center justify-between'>
              <div>
                <label htmlFor='enabled' className='font-medium text-gray-700'>
                  AI Inschakelen
                </label>
                <p className='text-sm text-gray-500'>Schakel alle AI-functies in of uit</p>
              </div>
              <button
                id='enabled'
                type='button'
                onClick={() => updateSetting('enabled', !settings.enabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none ${
                  settings.enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    settings.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Individual Feature Toggles */}
            {settings.enabled && (
              <>
                <div className='flex items-center justify-between border-l-2 border-gray-200 pl-4'>
                  <div>
                    <label
                      htmlFor='draft_suggestions'
                      className='text-sm font-medium text-gray-700'
                    >
                      Concept Suggesties
                    </label>
                    <p className='text-xs text-gray-500'>
                      AI genereert antwoord suggesties voor agenten
                    </p>
                  </div>
                  <button
                    id='draft_suggestions'
                    type='button'
                    onClick={() =>
                      updateSetting(
                        'draft_suggestions',
                        !settings.features_enabled?.draft_suggestions
                      )
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      settings.features_enabled?.draft_suggestions ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ${
                        settings.features_enabled?.draft_suggestions
                          ? 'translate-x-5'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className='flex items-center justify-between border-l-2 border-gray-200 pl-4'>
                  <div>
                    <label htmlFor='auto_response' className='text-sm font-medium text-gray-700'>
                      Auto-Antwoorden
                    </label>
                    <p className='text-xs text-gray-500'>
                      Automatische antwoorden buiten kantooruren
                    </p>
                  </div>
                  <button
                    id='auto_response'
                    type='button'
                    onClick={() =>
                      updateSetting('auto_response', !settings.features_enabled?.auto_response)
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      settings.features_enabled?.auto_response ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ${
                        settings.features_enabled?.auto_response ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className='flex items-center justify-between border-l-2 border-gray-200 pl-4'>
                  <div>
                    <label
                      htmlFor='sentiment_analysis'
                      className='text-sm font-medium text-gray-700'
                    >
                      Sentiment Analyse
                    </label>
                    <p className='text-xs text-gray-500'>Detecteer klanttevredenheid en urgentie</p>
                  </div>
                  <button
                    id='sentiment_analysis'
                    type='button'
                    onClick={() =>
                      updateSetting(
                        'sentiment_analysis',
                        !settings.features_enabled?.sentiment_analysis
                      )
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      settings.features_enabled?.sentiment_analysis ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ${
                        settings.features_enabled?.sentiment_analysis
                          ? 'translate-x-5'
                          : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className='flex items-center justify-between border-l-2 border-gray-200 pl-4'>
                  <div>
                    <label htmlFor='summarization' className='text-sm font-medium text-gray-700'>
                      Samenvatten
                    </label>
                    <p className='text-xs text-gray-500'>Automatische conversatie samenvattingen</p>
                  </div>
                  <button
                    id='summarization'
                    type='button'
                    onClick={() =>
                      updateSetting('summarization', !settings.features_enabled?.summarization)
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      settings.features_enabled?.summarization ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ${
                        settings.features_enabled?.summarization ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Model Configuration */}
        {settings.enabled && (
          <div className='p-6'>
            <h3 className='mb-4 text-lg font-medium text-gray-900'>Model Configuratie</h3>

            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='preferred_model'
                  className='mb-1 block text-sm font-medium text-gray-700'
                >
                  Primair Model
                </label>
                <select
                  id='default_model'
                  value={settings.default_model}
                  onChange={e => updateSetting('default_model', e.target.value)}
                  className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                >
                  <option value='anthropic/claude-3.5-sonnet'>
                    Claude 3.5 Sonnet (Aanbevolen)
                  </option>
                  <option value='anthropic/claude-3-opus'>Claude 3 Opus (Geavanceerd)</option>
                  <option value='anthropic/claude-3-haiku'>Claude 3 Haiku (Snel & Goedkoop)</option>
                  <option value='openai/gpt-4-turbo'>GPT-4 Turbo</option>
                  <option value='openai/gpt-3.5-turbo'>GPT-3.5 Turbo</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor='fallback_model'
                  className='mb-1 block text-sm font-medium text-gray-700'
                >
                  Fallback Model
                </label>
                <select
                  id='fallback_model'
                  value={settings.fallback_model}
                  onChange={e => updateSetting('fallback_model', e.target.value)}
                  className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                >
                  <option value='anthropic/claude-3-haiku'>Claude 3 Haiku (Aanbevolen)</option>
                  <option value='anthropic/claude-3.5-sonnet'>Claude 3.5 Sonnet</option>
                  <option value='openai/gpt-3.5-turbo'>GPT-3.5 Turbo</option>
                </select>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label
                    htmlFor='max_tokens'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Max Tokens
                  </label>
                  <input
                    type='number'
                    id='max_tokens'
                    min='100'
                    max='4000'
                    step='100'
                    value={settings.max_tokens}
                    onChange={e => updateSetting('max_tokens', parseInt(e.target.value))}
                    className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                  />
                </div>

                <div>
                  <label
                    htmlFor='temperature'
                    className='mb-1 block text-sm font-medium text-gray-700'
                  >
                    Temperature (0-2)
                  </label>
                  <input
                    type='number'
                    id='temperature'
                    min='0'
                    max='2'
                    step='0.1'
                    value={settings.temperature}
                    onChange={e => updateSetting('temperature', parseFloat(e.target.value))}
                    className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Budget Management */}
        {settings.enabled && (
          <div className='p-6'>
            <h3 className='mb-4 text-lg font-medium text-gray-900'>Budget Beheer</h3>

            <div className='space-y-4'>
              <div>
                <label
                  htmlFor='monthly_budget_usd'
                  className='mb-1 block text-sm font-medium text-gray-700'
                >
                  Maandelijks Budget (USD)
                </label>
                <input
                  type='number'
                  id='monthly_budget_usd'
                  min='0'
                  step='5'
                  value={settings.monthly_budget_usd || ''}
                  onChange={e =>
                    updateSetting(
                      'monthly_budget_usd',
                      e.target.value ? parseFloat(e.target.value) : null
                    )
                  }
                  placeholder='Onbeperkt'
                  className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                />
                <p className='mt-1 text-xs text-gray-500'>Laat leeg voor onbeperkt budget</p>
              </div>

              <div>
                <label
                  htmlFor='budget_alert_threshold'
                  className='mb-1 block text-sm font-medium text-gray-700'
                >
                  Budget Waarschuwing (%)
                </label>
                <input
                  type='number'
                  id='budget_alert_threshold'
                  min='0'
                  max='100'
                  step='5'
                  value={(settings.alert_threshold || 0.8) * 100}
                  onChange={e => updateSetting('alert_threshold', parseInt(e.target.value) / 100)}
                  className='block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm'
                />
                <p className='mt-1 text-xs text-gray-500'>
                  Ontvang waarschuwing bij dit percentage van het budget
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className='flex justify-end'>
        <button
          onClick={saveSettings}
          disabled={saving}
          className='inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-400'
        >
          {saving ? 'Opslaan...' : 'Instellingen Opslaan'}
        </button>
      </div>
    </div>
  )
}
