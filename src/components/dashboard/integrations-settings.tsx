'use client'

import { useState, useEffect, useCallback, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircleIcon,
  XCircleIcon,
  KeyIcon,
  TrashIcon,
  PlusIcon,
  ClipboardDocumentIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import type { Profile } from '@/types/database'

interface IntegrationsSettingsProps {
  profile: Profile
}

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  status: 'connected' | 'not_connected' | 'error'
  configUrl?: string
  statusMessage?: string
  details?: Record<string, unknown>
}

interface ApiKey {
  id: string
  name: string
  key: string
  lastUsed: string | null
  createdAt: string
}

function IntegrationsSettingsComponent({ profile }: IntegrationsSettingsProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [showNewKeyModal, setShowNewKeyModal] = useState(false)
  const [showDeleteKeyModal, setShowDeleteKeyModal] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const loadIntegrations = useCallback(async () => {
    try {
      setRefreshing(true)

      // Fetch real-time integration status from API
      const response = await fetch('/api/integrations/status')

      if (!response.ok) {
        throw new Error('Failed to fetch integration status')
      }

      const data = await response.json()

      // Map API response to UI integrations
      const statusIntegrations: Integration[] = [
        {
          id: 'whatsapp',
          name: 'WhatsApp Business API',
          description: 'Connect your WhatsApp Business account to send and receive messages.',
          icon: '💬',
          status: data.integrations.whatsapp.healthy
            ? 'connected'
            : data.integrations.whatsapp.status === 'not_configured'
            ? 'not_connected'
            : 'error',
          statusMessage: data.integrations.whatsapp.message,
          details: data.integrations.whatsapp.details,
          configUrl: '/dashboard/settings/integrations/whatsapp',
        },
        {
          id: 'stripe',
          name: 'Stripe',
          description: 'Manage subscription billing and payments through Stripe.',
          icon: '💳',
          status: data.integrations.stripe.healthy
            ? 'connected'
            : data.integrations.stripe.status === 'not_configured'
            ? 'not_connected'
            : 'error',
          statusMessage: data.integrations.stripe.message,
          details: data.integrations.stripe.details,
          configUrl: '/dashboard/settings/billing',
        },
        {
          id: 'email',
          name: 'Email Service (Resend)',
          description: 'Send transactional emails and notifications.',
          icon: '📧',
          status: data.integrations.email.healthy
            ? 'connected'
            : data.integrations.email.status === 'not_configured'
            ? 'not_connected'
            : 'error',
          statusMessage: data.integrations.email.message,
          configUrl: '/dashboard/settings/integrations/email',
        },
        {
          id: 'database',
          name: 'Database (Supabase)',
          description: 'PostgreSQL database connectivity and health.',
          icon: '🗄️',
          status: data.integrations.database.healthy ? 'connected' : 'error',
          statusMessage: data.integrations.database.message,
        },
      ]

      setIntegrations(statusIntegrations)
    } catch (err) {
      setError('Failed to load integrations')
      console.error('Integration status error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [profile.organization_id])

  const loadApiKeys = useCallback(async () => {
    // Mock API keys - in production, load from database
    setApiKeys([
      {
        id: '1',
        name: 'Production API Key',
        key: 'adp_••••••••••••••••••••••••1234',
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: '2',
        name: 'Development API Key',
        key: 'adp_••••••••••••••••••••••••5678',
        lastUsed: null,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ])
  }, [])

  useEffect(() => {
    loadIntegrations()
    loadApiKeys()

    // Auto-refresh integration status every 60 seconds
    const intervalId = setInterval(() => {
      loadIntegrations()
    }, 60000)

    return () => clearInterval(intervalId)
  }, [loadIntegrations, loadApiKeys])

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    try {
      // Generate a random API key
      const key = `adp_${Array.from({ length: 32 }, () =>
        Math.random().toString(36)[2]
      ).join('')}`

      setGeneratedKey(key)

      // Add to list (in production, save to database)
      const newKey: ApiKey = {
        id: Date.now().toString(),
        name: newKeyName,
        key,
        lastUsed: null,
        createdAt: new Date().toISOString(),
      }

      setApiKeys([...apiKeys, newKey])
      setMessage('API key generated successfully. Make sure to copy it now!')
    } catch (err) {
      setError('Failed to generate API key')
    }
  }

  const handleDeleteKey = async () => {
    if (!selectedKey) return

    try {
      setApiKeys(apiKeys.filter((k) => k.id !== selectedKey.id))
      setMessage('API key revoked successfully')
      setShowDeleteKeyModal(false)
      setSelectedKey(null)
    } catch (err) {
      setError('Failed to revoke API key')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setMessage('Copied to clipboard')
    setTimeout(() => setMessage(''), 2000)
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'Never'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatLastUsed = (date: string | null) => {
    if (!date) return 'Never used'
    const now = new Date()
    const lastUsed = new Date(date)
    const diff = now.getTime() - lastUsed.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))

    if (hours < 1) return 'Used just now'
    if (hours < 24) return `Used ${hours}h ago`
    if (hours < 48) return 'Used yesterday'
    return `Used ${Math.floor(hours / 24)}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading integrations...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-sm text-emerald-700">{message}</div>
        </div>
      )}

      {/* Available Integrations */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-gray-900">
            Available Integrations
          </h2>
          <button
            onClick={() => loadIntegrations()}
            disabled={refreshing}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh integration status"
          >
            <ArrowPathIcon
              className={`h-4 w-4 mr-1.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="bg-white shadow-sm rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="text-3xl">{integration.icon}</div>
                    <div className="flex-1">
                      <h3 className="text-base font-medium text-gray-900">
                        {integration.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {integration.description}
                      </p>
                      {integration.statusMessage && (
                        <p className="mt-1.5 text-xs text-gray-600 italic">
                          {integration.statusMessage}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center">
                    {integration.status === 'connected' ? (
                      <>
                        <CheckCircleIcon className="h-5 w-5 text-emerald-500 mr-1" />
                        <span className="text-sm font-medium text-emerald-700">
                          Connected
                        </span>
                      </>
                    ) : integration.status === 'error' ? (
                      <>
                        <XCircleIcon className="h-5 w-5 text-red-500 mr-1" />
                        <span className="text-sm font-medium text-red-700">
                          Error
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircleIcon className="h-5 w-5 text-gray-400 mr-1" />
                        <span className="text-sm font-medium text-gray-500">
                          Not Connected
                        </span>
                      </>
                    )}
                  </div>

                  <button
                    className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                      integration.status === 'connected'
                        ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-emerald-500'
                        : 'text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'
                    }`}
                  >
                    {integration.status === 'connected' ? 'Configure' : 'Connect'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Keys Section */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <KeyIcon className="h-6 w-6 text-emerald-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">
                API Keys
              </h3>
            </div>
            <button
              onClick={() => setShowNewKeyModal(true)}
              className="inline-flex items-center px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-sm font-medium"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              Generate New Key
            </button>
          </div>

          <p className="text-sm text-gray-500 mb-4">
            Use API keys to authenticate requests to the ADSapp API.
          </p>

          <div className="space-y-3">
            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <KeyIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">
                        {apiKey.name}
                      </div>
                      <div className="text-sm text-gray-500 font-mono">
                        {apiKey.key}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Created {formatDate(apiKey.createdAt)} •{' '}
                        {formatLastUsed(apiKey.lastUsed)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => copyToClipboard(apiKey.key)}
                    className="p-2 text-gray-400 hover:text-gray-600"
                    title="Copy to clipboard"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedKey(apiKey)
                      setShowDeleteKeyModal(true)
                    }}
                    className="p-2 text-red-400 hover:text-red-600"
                    title="Revoke key"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}

            {apiKeys.length === 0 && (
              <div className="text-center py-8">
                <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No API keys yet</p>
                <p className="text-xs text-gray-400">
                  Generate your first API key to get started
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate API Key Modal */}
      {showNewKeyModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Generate New API Key
              </h3>
            </div>

            {!generatedKey ? (
              <form onSubmit={handleGenerateKey} className="px-6 py-4 space-y-4">
                <div>
                  <label
                    htmlFor="key-name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Key Name
                  </label>
                  <input
                    type="text"
                    id="key-name"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm px-3 py-2"
                    placeholder="e.g., Production API Key"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Choose a descriptive name to identify this key
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewKeyModal(false)
                      setNewKeyName('')
                    }}
                    className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-sm font-medium"
                  >
                    Generate Key
                  </button>
                </div>
              </form>
            ) : (
              <div className="px-6 py-4 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800 font-medium mb-2">
                    Important: Copy your API key now!
                  </p>
                  <p className="text-xs text-amber-700">
                    For security reasons, you won't be able to see this key again.
                    Store it securely.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your API Key
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedKey}
                      className="flex-1 block border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm px-3 py-2"
                    />
                    <button
                      onClick={() => copyToClipboard(generatedKey)}
                      className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <ClipboardDocumentIcon className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      setShowNewKeyModal(false)
                      setNewKeyName('')
                      setGeneratedKey('')
                    }}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-sm font-medium"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete API Key Modal */}
      {showDeleteKeyModal && selectedKey && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Revoke API Key</h3>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-500">
                Are you sure you want to revoke the API key{' '}
                <span className="font-medium text-gray-900">
                  "{selectedKey.name}"
                </span>
                ? Any applications using this key will no longer be able to
                authenticate.
              </p>

              <div className="flex justify-end space-x-3 pt-6">
                <button
                  onClick={() => {
                    setShowDeleteKeyModal(false)
                    setSelectedKey(null)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteKey}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm font-medium"
                >
                  Revoke Key
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const IntegrationsSettings = memo(IntegrationsSettingsComponent)
