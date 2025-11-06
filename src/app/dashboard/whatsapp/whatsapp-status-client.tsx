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
  Zap,
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
    connected: false,
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
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>WhatsApp Business</h1>
          <p className='mt-1 text-sm text-gray-600'>
            Manage your WhatsApp Business API integration and configuration.
          </p>
        </div>
        <button
          onClick={checkConnection}
          disabled={isLoading}
          className='inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50'
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Connection Status Card */}
      <div className='overflow-hidden rounded-lg bg-white shadow'>
        <div className='p-6'>
          <div className='mb-6 flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <div
                className={`rounded-lg p-2 ${status.connected ? 'bg-emerald-100' : 'bg-red-100'}`}
              >
                <MessageSquare
                  className={`h-6 w-6 ${status.connected ? 'text-emerald-600' : 'text-red-600'}`}
                />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>Connection Status</h2>
                <div className='mt-1 flex items-center space-x-2'>
                  {status.connected ? (
                    <>
                      <CheckCircle className='h-4 w-4 text-emerald-600' />
                      <span className='text-sm font-medium text-emerald-600'>Connected</span>
                    </>
                  ) : (
                    <>
                      <XCircle className='h-4 w-4 text-red-600' />
                      <span className='text-sm font-medium text-red-600'>Not Connected</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {!status.connected && (
              <button
                onClick={() => setShowWizard(true)}
                className='inline-flex items-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700'
              >
                <Settings className='mr-2 h-4 w-4' />
                Setup WhatsApp
              </button>
            )}
          </div>

          {status.connected ? (
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div className='rounded-lg bg-gray-50 p-4'>
                <div className='mb-2 flex items-center space-x-2'>
                  <Phone className='h-4 w-4 text-gray-500' />
                  <span className='text-sm font-medium text-gray-700'>Phone Number</span>
                </div>
                <p className='text-lg font-semibold text-gray-900'>
                  {status.phoneNumber || 'Not configured'}
                </p>
              </div>

              <div className='rounded-lg bg-gray-50 p-4'>
                <div className='mb-2 flex items-center space-x-2'>
                  <MessageSquare className='h-4 w-4 text-gray-500' />
                  <span className='text-sm font-medium text-gray-700'>Business Account ID</span>
                </div>
                <p className='text-lg font-semibold text-gray-900'>
                  {status.businessAccountId || 'Not configured'}
                </p>
              </div>
            </div>
          ) : (
            <div className='rounded-lg border border-amber-200 bg-amber-50 p-4'>
              <div className='flex items-start space-x-3'>
                <AlertCircle className='mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600' />
                <div>
                  <h3 className='text-sm font-medium text-amber-900'>WhatsApp Not Connected</h3>
                  <p className='mt-1 text-sm text-amber-700'>
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
        <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
          <div className='rounded-lg bg-white p-6 shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Messages This Month</p>
                <p className='mt-2 text-3xl font-semibold text-gray-900'>
                  {status.messagesThisMonth?.toLocaleString() || '0'}
                </p>
              </div>
              <div className='rounded-lg bg-blue-100 p-3'>
                <MessageSquare className='h-6 w-6 text-blue-600' />
              </div>
            </div>
          </div>

          <div className='rounded-lg bg-white p-6 shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Response Rate</p>
                <p className='mt-2 text-3xl font-semibold text-gray-900'>
                  {status.responseRate || 0}%
                </p>
              </div>
              <div className='rounded-lg bg-emerald-100 p-3'>
                <Zap className='h-6 w-6 text-emerald-600' />
              </div>
            </div>
          </div>

          <div className='rounded-lg bg-white p-6 shadow'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Last Sync</p>
                <p className='mt-2 text-lg font-semibold text-gray-900'>
                  {status.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never'}
                </p>
              </div>
              <div className='rounded-lg bg-purple-100 p-3'>
                <RefreshCw className='h-6 w-6 text-purple-600' />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Options (only show if connected) */}
      {status.connected && (
        <div className='overflow-hidden rounded-lg bg-white shadow'>
          <div className='p-6'>
            <h2 className='mb-4 text-lg font-semibold text-gray-900'>Configuration</h2>
            <div className='space-y-3'>
              <button
                onClick={() => setShowWizard(true)}
                className='flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50'
              >
                <div className='flex items-center space-x-3'>
                  <Settings className='h-5 w-5 text-gray-500' />
                  <div className='text-left'>
                    <p className='text-sm font-medium text-gray-900'>API Configuration</p>
                    <p className='text-xs text-gray-500'>
                      Update your WhatsApp Business API credentials
                    </p>
                  </div>
                </div>
                <span className='text-gray-400'>→</span>
              </button>

              <button
                onClick={checkConnection}
                className='flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50'
              >
                <div className='flex items-center space-x-3'>
                  <RefreshCw className='h-5 w-5 text-gray-500' />
                  <div className='text-left'>
                    <p className='text-sm font-medium text-gray-900'>Test Connection</p>
                    <p className='text-xs text-gray-500'>Verify your WhatsApp API connection</p>
                  </div>
                </div>
                <span className='text-gray-400'>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
