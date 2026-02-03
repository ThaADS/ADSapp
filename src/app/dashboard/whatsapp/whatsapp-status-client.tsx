'use client'

import { useState, useEffect } from 'react'
import WhatsAppSetupWizard from '@/components/inbox/whatsapp-setup-wizard'
import TwilioSetupWizard from '@/components/inbox/twilio-setup-wizard'
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

type ProviderTab = 'cloud-api' | 'twilio'

interface WhatsAppStatus {
  connected: boolean
  phoneNumber?: string
  businessAccountId?: string
  lastSync?: string
  messagesThisMonth?: number
  responseRate?: number
}

interface TwilioStatus {
  connected: boolean
  phoneNumber?: string
  accountSid?: string
  friendlyName?: string
  lastVerified?: string
}

interface WhatsAppStatusClientProps {
  organizationId: string
}

export default function WhatsAppStatusClient({ organizationId }: WhatsAppStatusClientProps) {
  const [activeTab, setActiveTab] = useState<ProviderTab>('twilio')
  const [showCloudApiWizard, setShowCloudApiWizard] = useState(false)
  const [showTwilioWizard, setShowTwilioWizard] = useState(false)
  const [cloudApiStatus, setCloudApiStatus] = useState<WhatsAppStatus>({
    connected: false,
  })
  const [twilioStatus, setTwilioStatus] = useState<TwilioStatus>({
    connected: false,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    setIsLoading(true)
    try {
      // Check both Cloud API and Twilio status
      const [cloudApiResponse, twilioResponse] = await Promise.all([
        fetch('/api/whatsapp/status').catch(() => null),
        fetch('/api/integrations/twilio-whatsapp/connect').catch(() => null),
      ])

      if (cloudApiResponse?.ok) {
        const data = await cloudApiResponse.json()
        setCloudApiStatus(data)
      }

      if (twilioResponse?.ok) {
        const data = await twilioResponse.json()
        setTwilioStatus({
          connected: data.connected,
          phoneNumber: data.whatsappNumber,
          accountSid: data.connectionId ? 'AC...' : undefined,
          friendlyName: data.friendlyName,
          lastVerified: data.lastVerifiedAt,
        })
      }
    } catch (error) {
      console.error('Failed to check WhatsApp status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloudApiSetupComplete = () => {
    setShowCloudApiWizard(false)
    checkConnection()
  }

  const handleTwilioSetupComplete = () => {
    setShowTwilioWizard(false)
    checkConnection()
  }

  if (showCloudApiWizard) {
    return (
      <WhatsAppSetupWizard
        organizationId={organizationId}
        onComplete={handleCloudApiSetupComplete}
        onCancel={() => setShowCloudApiWizard(false)}
      />
    )
  }

  if (showTwilioWizard) {
    return (
      <TwilioSetupWizard
        organizationId={organizationId}
        onComplete={handleTwilioSetupComplete}
        onCancel={() => setShowTwilioWizard(false)}
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
            Beheer je WhatsApp Business API integratie en configuratie.
          </p>
        </div>
        <button
          onClick={checkConnection}
          disabled={isLoading}
          className='inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50'
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Vernieuwen
        </button>
      </div>

      {/* Provider Tabs */}
      <div className='border-b border-gray-200'>
        <nav className='-mb-px flex space-x-8'>
          <button
            onClick={() => setActiveTab('twilio')}
            className={`flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'twilio'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <div className='mr-2 flex h-6 w-6 items-center justify-center rounded bg-red-100'>
              <span className='text-xs font-bold text-red-600'>T</span>
            </div>
            Twilio WhatsApp
            {twilioStatus.connected && (
              <CheckCircle className='ml-2 h-4 w-4 text-emerald-500' />
            )}
          </button>
          <button
            onClick={() => setActiveTab('cloud-api')}
            className={`flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'cloud-api'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            <div className='mr-2 flex h-6 w-6 items-center justify-center rounded bg-green-100'>
              <MessageSquare className='h-4 w-4 text-green-600' />
            </div>
            Meta Cloud API
            {cloudApiStatus.connected && (
              <CheckCircle className='ml-2 h-4 w-4 text-emerald-500' />
            )}
          </button>
        </nav>
      </div>

      {/* Twilio Tab Content */}
      {activeTab === 'twilio' && (
        <div className='space-y-6'>
          {/* Connection Status Card */}
          <div className='overflow-hidden rounded-lg bg-white shadow'>
            <div className='p-6'>
              <div className='mb-6 flex items-center justify-between'>
                <div className='flex items-center space-x-3'>
                  <div
                    className={`rounded-lg p-2 ${twilioStatus.connected ? 'bg-emerald-100' : 'bg-red-100'}`}
                  >
                    <div className='flex h-6 w-6 items-center justify-center'>
                      <span className={`text-lg font-bold ${twilioStatus.connected ? 'text-emerald-600' : 'text-red-600'}`}>T</span>
                    </div>
                  </div>
                  <div>
                    <h2 className='text-lg font-semibold text-gray-900'>Twilio WhatsApp</h2>
                    <div className='mt-1 flex items-center space-x-2'>
                      {twilioStatus.connected ? (
                        <>
                          <CheckCircle className='h-4 w-4 text-emerald-600' />
                          <span className='text-sm font-medium text-emerald-600'>Verbonden</span>
                        </>
                      ) : (
                        <>
                          <XCircle className='h-4 w-4 text-red-600' />
                          <span className='text-sm font-medium text-red-600'>Niet Verbonden</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowTwilioWizard(true)}
                  className='inline-flex items-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700'
                >
                  <Settings className='mr-2 h-4 w-4' />
                  {twilioStatus.connected ? 'Configuratie Wijzigen' : 'Twilio Instellen'}
                </button>
              </div>

              {twilioStatus.connected ? (
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='rounded-lg bg-gray-50 p-4'>
                    <div className='mb-2 flex items-center space-x-2'>
                      <Phone className='h-4 w-4 text-gray-500' />
                      <span className='text-sm font-medium text-gray-700'>WhatsApp Nummer</span>
                    </div>
                    <p className='text-lg font-semibold text-gray-900'>
                      {twilioStatus.phoneNumber || 'Niet geconfigureerd'}
                    </p>
                  </div>

                  <div className='rounded-lg bg-gray-50 p-4'>
                    <div className='mb-2 flex items-center space-x-2'>
                      <Settings className='h-4 w-4 text-gray-500' />
                      <span className='text-sm font-medium text-gray-700'>Account SID</span>
                    </div>
                    <p className='text-lg font-semibold text-gray-900'>
                      {twilioStatus.accountSid ? `${twilioStatus.accountSid.slice(0, 8)}...` : 'Niet geconfigureerd'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className='rounded-lg border border-amber-200 bg-amber-50 p-4'>
                  <div className='flex items-start space-x-3'>
                    <AlertCircle className='mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600' />
                    <div>
                      <h3 className='text-sm font-medium text-amber-900'>Twilio WhatsApp Niet Geconfigureerd</h3>
                      <p className='mt-1 text-sm text-amber-700'>
                        Verbind je Twilio account om WhatsApp berichten te verzenden en ontvangen.
                        Klik op "Twilio Instellen" om te beginnen met de configuratie.
                      </p>
                      <div className='mt-3'>
                        <h4 className='text-sm font-medium text-amber-900'>Wat je nodig hebt:</h4>
                        <ul className='mt-1 list-inside list-disc text-sm text-amber-700'>
                          <li>Twilio Account SID</li>
                          <li>Twilio Auth Token</li>
                          <li>WhatsApp Sandbox of Business nummer</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Twilio Statistics (only show if connected) */}
          {twilioStatus.connected && (
            <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
              <div className='rounded-lg bg-white p-6 shadow'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600'>Laatst Geverifieerd</p>
                    <p className='mt-2 text-lg font-semibold text-gray-900'>
                      {twilioStatus.lastVerified
                        ? new Date(twilioStatus.lastVerified).toLocaleString('nl-NL')
                        : 'Nooit'}
                    </p>
                  </div>
                  <div className='rounded-lg bg-emerald-100 p-3'>
                    <CheckCircle className='h-6 w-6 text-emerald-600' />
                  </div>
                </div>
              </div>

              <div className='rounded-lg bg-white p-6 shadow'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600'>Friendly Name</p>
                    <p className='mt-2 text-lg font-semibold text-gray-900'>
                      {twilioStatus.friendlyName || 'Niet ingesteld'}
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
                    <p className='text-sm font-medium text-gray-600'>Provider</p>
                    <p className='mt-2 text-lg font-semibold text-gray-900'>Twilio</p>
                  </div>
                  <div className='rounded-lg bg-red-100 p-3'>
                    <Zap className='h-6 w-6 text-red-600' />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cloud API Tab Content */}
      {activeTab === 'cloud-api' && (
        <div className='space-y-6'>
          {/* Connection Status Card */}
          <div className='overflow-hidden rounded-lg bg-white shadow'>
            <div className='p-6'>
              <div className='mb-6 flex items-center justify-between'>
                <div className='flex items-center space-x-3'>
                  <div
                    className={`rounded-lg p-2 ${cloudApiStatus.connected ? 'bg-emerald-100' : 'bg-red-100'}`}
                  >
                    <MessageSquare
                      className={`h-6 w-6 ${cloudApiStatus.connected ? 'text-emerald-600' : 'text-red-600'}`}
                    />
                  </div>
                  <div>
                    <h2 className='text-lg font-semibold text-gray-900'>Meta Cloud API</h2>
                    <div className='mt-1 flex items-center space-x-2'>
                      {cloudApiStatus.connected ? (
                        <>
                          <CheckCircle className='h-4 w-4 text-emerald-600' />
                          <span className='text-sm font-medium text-emerald-600'>Verbonden</span>
                        </>
                      ) : (
                        <>
                          <XCircle className='h-4 w-4 text-red-600' />
                          <span className='text-sm font-medium text-red-600'>Niet Verbonden</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowCloudApiWizard(true)}
                  className='inline-flex items-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700'
                >
                  <Settings className='mr-2 h-4 w-4' />
                  {cloudApiStatus.connected ? 'Configuratie Wijzigen' : 'Cloud API Instellen'}
                </button>
              </div>

              {cloudApiStatus.connected ? (
                <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                  <div className='rounded-lg bg-gray-50 p-4'>
                    <div className='mb-2 flex items-center space-x-2'>
                      <Phone className='h-4 w-4 text-gray-500' />
                      <span className='text-sm font-medium text-gray-700'>Telefoonnummer</span>
                    </div>
                    <p className='text-lg font-semibold text-gray-900'>
                      {cloudApiStatus.phoneNumber || 'Niet geconfigureerd'}
                    </p>
                  </div>

                  <div className='rounded-lg bg-gray-50 p-4'>
                    <div className='mb-2 flex items-center space-x-2'>
                      <MessageSquare className='h-4 w-4 text-gray-500' />
                      <span className='text-sm font-medium text-gray-700'>Business Account ID</span>
                    </div>
                    <p className='text-lg font-semibold text-gray-900'>
                      {cloudApiStatus.businessAccountId || 'Niet geconfigureerd'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className='rounded-lg border border-amber-200 bg-amber-50 p-4'>
                  <div className='flex items-start space-x-3'>
                    <AlertCircle className='mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600' />
                    <div>
                      <h3 className='text-sm font-medium text-amber-900'>Meta Cloud API Niet Geconfigureerd</h3>
                      <p className='mt-1 text-sm text-amber-700'>
                        Verbind je Meta WhatsApp Business API om berichten te verzenden en ontvangen.
                        Klik op "Cloud API Instellen" om te beginnen met de configuratie.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Statistics (only show if connected) */}
          {cloudApiStatus.connected && (
            <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
              <div className='rounded-lg bg-white p-6 shadow'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-600'>Berichten Deze Maand</p>
                    <p className='mt-2 text-3xl font-semibold text-gray-900'>
                      {cloudApiStatus.messagesThisMonth?.toLocaleString() || '0'}
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
                      {cloudApiStatus.responseRate || 0}%
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
                    <p className='text-sm font-medium text-gray-600'>Laatste Sync</p>
                    <p className='mt-2 text-lg font-semibold text-gray-900'>
                      {cloudApiStatus.lastSync ? new Date(cloudApiStatus.lastSync).toLocaleString('nl-NL') : 'Nooit'}
                    </p>
                  </div>
                  <div className='rounded-lg bg-purple-100 p-3'>
                    <RefreshCw className='h-6 w-6 text-purple-600' />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
