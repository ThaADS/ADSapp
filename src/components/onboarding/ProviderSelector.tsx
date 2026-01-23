'use client'

import { useState } from 'react'
import { WhatsAppSetupWizard } from './WhatsAppSetupWizard'
import { TwilioSetup } from './TwilioSetup'

export type WhatsAppProvider = 'cloud-api' | 'twilio'

interface ProviderSelectorProps {
  onComplete: (credentials: WhatsAppCredentials) => void
  onSkip: () => void
}

export interface WhatsAppCredentials {
  provider: WhatsAppProvider
  phoneNumberId: string
  businessAccountId: string
  accessToken: string
  webhookVerifyToken: string
  // Twilio specific
  twilioAccountSid?: string
  twilioAuthToken?: string
  twilioPhoneNumber?: string
}

const PROVIDERS = [
  {
    id: 'cloud-api' as WhatsAppProvider,
    name: 'WhatsApp Cloud API',
    description: 'Direct Meta/Facebook integration - Recommended for businesses',
    icon: '☁️',
    features: ['Official API', 'Best reliability', 'Full features', 'Direct support'],
    recommended: true,
  },
  {
    id: 'twilio' as WhatsAppProvider,
    name: 'Twilio WhatsApp',
    description: 'Via Twilio platform - For existing Twilio users',
    icon: '🔗',
    features: ['Twilio infrastructure', 'Easy scaling', 'Unified billing', 'SMS fallback'],
    recommended: false,
  },
]

export function ProviderSelector({ onComplete, onSkip }: ProviderSelectorProps) {
  const [selectedProvider, setSelectedProvider] = useState<WhatsAppProvider | null>(null)
  const [showSetup, setShowSetup] = useState(false)

  const handleProviderSelect = (provider: WhatsAppProvider) => {
    setSelectedProvider(provider)
    setShowSetup(true)
  }

  const handleBack = () => {
    setShowSetup(false)
    setSelectedProvider(null)
  }

  const handleComplete = (credentials: Omit<WhatsAppCredentials, 'provider'>) => {
    onComplete({
      ...credentials,
      provider: selectedProvider!,
    })
  }

  // Show provider-specific setup wizard
  if (showSetup && selectedProvider) {
    switch (selectedProvider) {
      case 'cloud-api':
        return (
          <div>
            <button
              onClick={handleBack}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              ← Back to provider selection
            </button>
            <WhatsAppSetupWizard
              onComplete={creds => handleComplete(creds)}
              onSkip={onSkip}
            />
          </div>
        )
      case 'twilio':
        return (
          <div>
            <button
              onClick={handleBack}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              ← Back to provider selection
            </button>
            <TwilioSetup
              onComplete={creds => handleComplete(creds)}
              onSkip={onSkip}
            />
          </div>
        )
    }
  }

  // Provider selection screen
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Connect WhatsApp</h2>
        <p className="mt-2 text-gray-600">
          Choose how you want to connect your WhatsApp Business account
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PROVIDERS.map(provider => (
          <button
            key={provider.id}
            onClick={() => handleProviderSelect(provider.id)}
            className={`relative flex flex-col rounded-xl border-2 p-6 text-left transition-all hover:border-blue-500 hover:shadow-lg ${
              provider.recommended
                ? 'border-blue-300 bg-blue-50'
                : 'border-gray-200 bg-white'
            }`}
          >
            {provider.recommended && (
              <span className="absolute -top-3 left-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                Recommended
              </span>
            )}

            <div className="mb-4 text-4xl">{provider.icon}</div>

            <h3 className="mb-2 text-lg font-semibold text-gray-900">{provider.name}</h3>

            <p className="mb-4 text-sm text-gray-600">{provider.description}</p>

            <ul className="mt-auto space-y-2">
              {provider.features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="text-green-500">✓</span>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-4 text-center">
              <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600">
                Select →
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={onSkip}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Skip for now - I'll set this up later
        </button>
      </div>

      {/* Help Section */}
      <div className="rounded-lg bg-gray-50 p-6">
        <h4 className="mb-3 font-semibold text-gray-900">Not sure which to choose?</h4>
        <div className="space-y-3 text-sm text-gray-600">
          <p>
            <strong>For businesses:</strong> Choose <span className="font-medium">Cloud API</span>{' '}
            for the official Meta integration with full features and best reliability.
          </p>
          <p>
            <strong>If you use Twilio:</strong> Choose <span className="font-medium">Twilio</span>{' '}
            to leverage your existing Twilio account and unified billing.
          </p>
        </div>
      </div>
    </div>
  )
}
