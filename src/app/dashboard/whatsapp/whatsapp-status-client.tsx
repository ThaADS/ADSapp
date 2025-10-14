'use client'

import { useState, useEffect } from 'react'
import WhatsAppSetupWizard from '@/components/inbox/whatsapp-setup-wizard'
import {
  MessageSquare,
  Phone,
  CheckCircle,
  XCircle,
  Settings,
  RefreshCw,
  AlertCircle,
  Zap
} from 'lucide-react'

interface WhatsAppStatus {
  connected: boolean
  phoneNumber?: string
  businessAccountId?: string
  lastSync?: string
  messagesThisMonth?: number
  responseRate?: number
}

interface WhatsAppStatusClientProps {
  organizationId: string
}

export default function WhatsAppStatusClient({ organizationId }: WhatsAppStatusClientProps) {
  const [showWizard, setShowWizard] = useState(false)
  const [status, setStatus] = useState<WhatsAppStatus>({
    connected: false
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setIsLoading(true)
    try {
      // Check WhatsApp connection status
      const response = await fetch('/api/whatsapp/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to check WhatsApp status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSetupComplete = () => {
    setShowWizard(false)
    checkConnection()
  }

  if (showWizard) {
    return (
      <WhatsAppSetupWizard
        organizationId={organizationId}
        onComplete={handleSetupComplete}
        onCancel={() => setShowWizard(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Business</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your WhatsApp Business API integration and configuration.
          </p>
        </div>
        <button
          onClick={checkConnection}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Connection Status Card */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${
                status.connected ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
                <MessageSquare className={`w-6 h-6 ${
                  status.connected ? 'text-emerald-600' : 'text-red-600'
                }`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Connection Status</h2>
                <div className="flex items-center space-x-2 mt-1">
                  {status.connected ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm text-emerald-600 font-medium">Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm text-red-600 font-medium">Not Connected</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {!status.connected && (
              <button
                onClick={() => setShowWizard(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                Setup WhatsApp
              </button>
            )}
          </div>

          {status.connected ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Phone Number</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {status.phoneNumber || 'Not configured'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Business Account ID</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {status.businessAccountId || 'Not configured'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-amber-900">WhatsApp Not Connected</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    Connect your WhatsApp Business API to start receiving and sending messages.
                    Click the "Setup WhatsApp" button to begin the configuration process.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistics (only show if connected) */}
      {status.connected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Messages This Month</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {status.messagesThisMonth?.toLocaleString() || '0'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Response Rate</p>
                <p className="mt-2 text-3xl font-semibold text-gray-900">
                  {status.responseRate || 0}%
                </p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-lg">
                <Zap className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Sync</p>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  {status.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <RefreshCw className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Options (only show if connected) */}
      {status.connected && (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowWizard(true)}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">API Configuration</p>
                    <p className="text-xs text-gray-500">Update your WhatsApp Business API credentials</p>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </button>

              <button
                onClick={checkConnection}
                className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <RefreshCw className="w-5 h-5 text-gray-500" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">Test Connection</p>
                    <p className="text-xs text-gray-500">Verify your WhatsApp API connection</p>
                  </div>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}