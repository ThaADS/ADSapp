'use client'

/**
 * AI Settings Panel Component
 * Lazy-loaded via @/lib/lazy-imports for bundle optimization
 */

import { useState, useCallback } from 'react'

interface AISettingsPanelProps {
  settings?: {
    enabled: boolean
    autoReply: boolean
    suggestResponses: boolean
    summarizeConversations: boolean
    sentimentAnalysis: boolean
    model: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3'
    maxTokens: number
    temperature: number
  }
  onSave?: (settings: AISettingsPanelProps['settings']) => void
  className?: string
}

export function AISettingsPanel({
  settings = {
    enabled: true,
    autoReply: false,
    suggestResponses: true,
    summarizeConversations: true,
    sentimentAnalysis: true,
    model: 'gpt-4',
    maxTokens: 1000,
    temperature: 0.7,
  },
  onSave,
  className = '',
}: AISettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState(settings)
  const [isSaving, setIsSaving] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const updateSetting = useCallback(<K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      await onSave?.(localSettings)
    } finally {
      setIsSaving(false)
    }
  }, [localSettings, onSave])

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(localSettings)

  return (
    <div className={`rounded-lg border bg-white ${className}`}>
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              🤖 AI Instellingen
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Configureer AI-assistentie voor je inbox
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.enabled}
              onChange={(e) => updateSetting('enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
          </label>
        </div>
      </div>

      {/* Content */}
      <div className={`p-6 space-y-6 ${!localSettings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Features */}
        <div className="space-y-4">
          <h4 className="font-medium">AI Functies</h4>

          <label className="flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={localSettings.suggestResponses}
              onChange={(e) => updateSetting('suggestResponses', e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-emerald-600"
            />
            <div>
              <p className="font-medium">Antwoordsuggesties</p>
              <p className="text-sm text-gray-500">
                AI suggereert relevante antwoorden gebaseerd op de context van het gesprek
              </p>
            </div>
          </label>

          <label className="flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={localSettings.autoReply}
              onChange={(e) => updateSetting('autoReply', e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-emerald-600"
            />
            <div>
              <p className="font-medium">Automatisch antwoorden</p>
              <p className="text-sm text-gray-500">
                AI beantwoordt eenvoudige vragen automatisch (met goedkeuring)
              </p>
              {localSettings.autoReply && (
                <p className="text-xs text-orange-600 mt-1">
                  ⚠️ Experimentele functie - menselijke controle aanbevolen
                </p>
              )}
            </div>
          </label>

          <label className="flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={localSettings.summarizeConversations}
              onChange={(e) => updateSetting('summarizeConversations', e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-emerald-600"
            />
            <div>
              <p className="font-medium">Gesprekssamenvattingen</p>
              <p className="text-sm text-gray-500">
                Automatisch samenvattingen genereren van lange gesprekken
              </p>
            </div>
          </label>

          <label className="flex items-start gap-4 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={localSettings.sentimentAnalysis}
              onChange={(e) => updateSetting('sentimentAnalysis', e.target.checked)}
              className="mt-1 w-4 h-4 rounded text-emerald-600"
            />
            <div>
              <p className="font-medium">Sentiment Analyse</p>
              <p className="text-sm text-gray-500">
                Detecteer de stemming van klanten (positief, neutraal, negatief)
              </p>
            </div>
          </label>
        </div>

        {/* Advanced Settings */}
        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
          >
            <span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
            Geavanceerde instellingen
          </button>

          {showAdvanced && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">AI Model</label>
                <select
                  value={localSettings.model}
                  onChange={(e) => updateSetting('model', e.target.value as typeof localSettings.model)}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  <option value="gpt-4">GPT-4 (Meest capabel)</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Sneller)</option>
                  <option value="claude-3">Claude 3 (Alternatief)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Tokens: {localSettings.maxTokens}
                </label>
                <input
                  type="range"
                  min={100}
                  max={4000}
                  step={100}
                  value={localSettings.maxTokens}
                  onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>100</span>
                  <span>4000</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Creativiteit: {localSettings.temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={localSettings.temperature}
                  onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Precies (0)</span>
                  <span>Creatief (1)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {hasChanges && (
        <div className="flex justify-end gap-2 border-t p-4 bg-yellow-50">
          <button
            onClick={() => setLocalSettings(settings)}
            className="px-4 py-2 border rounded-lg hover:bg-white transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Opslaan...' : 'Wijzigingen opslaan'}
          </button>
        </div>
      )}
    </div>
  )
}

export default AISettingsPanel
