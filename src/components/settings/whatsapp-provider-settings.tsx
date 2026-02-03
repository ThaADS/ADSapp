'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from '@/components/providers/translation-provider'
import type {
  WhatsAppProvider,
  ProviderSettingsResponse,
  ProviderHealthStatus,
} from '@/types/whatsapp-settings'

interface WhatsAppProviderSettingsProps {
  organizationId: string
  userRole: 'owner' | 'admin' | 'agent' | 'viewer'
}

export function WhatsAppProviderSettings({
  organizationId,
  userRole,
}: WhatsAppProviderSettingsProps) {
  const t = useTranslations('settings')

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [settings, setSettings] = useState<ProviderSettingsResponse | null>(null)
  const [health, setHealth] = useState<ProviderHealthStatus | null>(null)

  // Form state
  const [activeProvider, setActiveProvider] = useState<WhatsAppProvider>('cloud_api')
  const [fallbackEnabled, setFallbackEnabled] = useState(false)

  const canEdit = ['owner', 'admin'].includes(userRole)

  // Load settings
  useEffect(() => {
    loadSettings()
  }, [organizationId])

  // Load health periodically
  useEffect(() => {
    loadHealth()
    const interval = setInterval(loadHealth, 30000) // Every 30 seconds
    return () => clearInterval(interval)
  }, [organizationId])

  async function loadSettings() {
    try {
      setIsLoading(true)
      const response = await fetch('/api/integrations/whatsapp/provider')

      if (!response.ok) {
        throw new Error('Failed to load settings')
      }

      const data: ProviderSettingsResponse = await response.json()
      setSettings(data)
      setActiveProvider(data.settings.activeProvider)
      setFallbackEnabled(data.settings.fallbackEnabled)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  async function loadHealth() {
    try {
      const response = await fetch('/api/integrations/whatsapp/provider/health')
      if (response.ok) {
        const data: ProviderHealthStatus = await response.json()
        setHealth(data)
      }
    } catch {
      // Ignore health check errors
    }
  }

  async function handleSave() {
    if (!canEdit) return

    setIsSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await fetch('/api/integrations/whatsapp/provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeProvider,
          fallbackEnabled,
          fallbackProvider: fallbackEnabled
            ? (activeProvider === 'cloud_api' ? 'twilio' : 'cloud_api')
            : null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save settings')
      }

      const data: ProviderSettingsResponse = await response.json()
      setSettings(data)
      setSuccessMessage(t('whatsapp.provider.saved', 'Settings saved successfully'))

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">
          {t('whatsapp.provider.title', 'WhatsApp Provider')}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {t(
            'whatsapp.provider.description',
            'Choose which WhatsApp API provider to use for sending and receiving messages.'
          )}
        </p>
      </div>

      {/* Error/Success messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      {successMessage && (
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm text-green-700">{successMessage}</p>
        </div>
      )}

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cloud API Card */}
        <ProviderCard
          name="Meta Cloud API"
          description={t(
            'whatsapp.provider.cloudApi.description',
            'Direct connection to Meta WhatsApp Business API'
          )}
          isActive={activeProvider === 'cloud_api'}
          isConnected={settings?.connections.cloudApi.connected || false}
          isHealthy={health?.cloudApi.healthy || false}
          latency={health?.cloudApi.latency || null}
          phoneNumber={settings?.connections.cloudApi.phoneNumber || null}
          businessName={settings?.connections.cloudApi.businessName || null}
          onSelect={() => canEdit && setActiveProvider('cloud_api')}
          disabled={!canEdit || !settings?.connections.cloudApi.connected}
        />

        {/* Twilio Card */}
        <ProviderCard
          name="Twilio"
          description={t(
            'whatsapp.provider.twilio.description',
            'WhatsApp via Twilio Business API'
          )}
          isActive={activeProvider === 'twilio'}
          isConnected={settings?.connections.twilio.connected || false}
          isHealthy={health?.twilio.healthy || false}
          latency={health?.twilio.latency || null}
          phoneNumber={settings?.connections.twilio.whatsappNumber || null}
          businessName={settings?.connections.twilio.friendlyName || null}
          onSelect={() => canEdit && setActiveProvider('twilio')}
          disabled={!canEdit || !settings?.connections.twilio.connected}
        />
      </div>

      {/* Fallback Toggle */}
      {settings?.connections.cloudApi.connected && settings?.connections.twilio.connected && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              {t('whatsapp.provider.fallback.title', 'Enable Fallback Provider')}
            </h4>
            <p className="text-sm text-gray-500">
              {t(
                'whatsapp.provider.fallback.description',
                'Automatically switch to the other provider if the active provider fails.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => canEdit && setFallbackEnabled(!fallbackEnabled)}
            disabled={!canEdit}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
              fallbackEnabled ? 'bg-green-600' : 'bg-gray-200'
            } ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}
            role="switch"
            aria-checked={fallbackEnabled}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                fallbackEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      )}

      {/* Save Button */}
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {t('common.saving', 'Saving...')}
              </>
            ) : (
              t('common.save', 'Save Changes')
            )}
          </button>
        </div>
      )}

      {/* Read-only notice */}
      {!canEdit && (
        <p className="text-sm text-gray-500 italic">
          {t(
            'whatsapp.provider.readonly',
            'You need admin permissions to change provider settings.'
          )}
        </p>
      )}
    </div>
  )
}

// =============================================================================
// Provider Card Component
// =============================================================================

interface ProviderCardProps {
  name: string
  description: string
  isActive: boolean
  isConnected: boolean
  isHealthy: boolean
  latency: number | null
  phoneNumber: string | null
  businessName: string | null
  onSelect: () => void
  disabled: boolean
}

function ProviderCard({
  name,
  description,
  isActive,
  isConnected,
  isHealthy,
  latency,
  phoneNumber,
  businessName,
  onSelect,
  disabled,
}: ProviderCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`relative flex flex-col p-4 rounded-lg border-2 text-left transition-all ${
        isActive
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {/* Active badge */}
      {isActive && (
        <span className="absolute top-2 right-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Active
        </span>
      )}

      {/* Provider name */}
      <h4 className="text-base font-medium text-gray-900">{name}</h4>

      {/* Description */}
      <p className="mt-1 text-sm text-gray-500">{description}</p>

      {/* Connection status */}
      <div className="mt-3 flex items-center gap-2">
        <span
          className={`inline-flex h-2 w-2 rounded-full ${
            isConnected
              ? isHealthy
                ? 'bg-green-500'
                : 'bg-yellow-500'
              : 'bg-gray-300'
          }`}
        />
        <span className="text-xs text-gray-600">
          {isConnected ? (isHealthy ? 'Connected' : 'Degraded') : 'Not connected'}
        </span>
        {latency && (
          <span className="text-xs text-gray-400">{latency}ms</span>
        )}
      </div>

      {/* Phone number */}
      {isConnected && phoneNumber && (
        <div className="mt-2 text-sm text-gray-600">
          <span className="font-medium">{phoneNumber}</span>
          {businessName && (
            <span className="text-gray-400 ml-1">({businessName})</span>
          )}
        </div>
      )}

      {/* Not connected message */}
      {!isConnected && (
        <p className="mt-2 text-xs text-gray-400">
          Connect this provider in integrations settings
        </p>
      )}
    </button>
  )
}
