'use client'

import { useState } from 'react'
import { useTranslations } from '@/components/providers/translation-provider'
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

export function ProviderSelector({ onComplete, onSkip }: ProviderSelectorProps) {
  const t = useTranslations('onboarding')
  const [selectedProvider, setSelectedProvider] = useState<WhatsAppProvider | null>(null)
  const [showSetup, setShowSetup] = useState(false)

  const PROVIDERS = [
    {
      id: 'cloud-api' as WhatsAppProvider,
      name: t('whatsapp.provider.cloudApi.name'),
      description: t('whatsapp.provider.cloudApi.description'),
      icon: '☁️',
      features: [
        t('whatsapp.provider.cloudApi.features.0'),
        t('whatsapp.provider.cloudApi.features.1'),
        t('whatsapp.provider.cloudApi.features.2'),
        t('whatsapp.provider.cloudApi.features.3'),
      ],
      recommended: true,
    },
    {
      id: 'twilio' as WhatsAppProvider,
      name: t('whatsapp.provider.twilio.name'),
      description: t('whatsapp.provider.twilio.description'),
      icon: '🔗',
      features: [
        t('whatsapp.provider.twilio.features.0'),
        t('whatsapp.provider.twilio.features.1'),
        t('whatsapp.provider.twilio.features.2'),
        t('whatsapp.provider.twilio.features.3'),
      ],
      recommended: false,
    },
  ]

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
              type="button"
              onClick={handleBack}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              ← {t('provider.backToSelection')}
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
              type="button"
              onClick={handleBack}
              className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              ← {t('provider.backToSelection')}
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
        <h2 className="text-2xl font-bold text-gray-900">{t('whatsapp.provider.title')}</h2>
        <p className="mt-2 text-gray-600">{t('whatsapp.provider.description')}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PROVIDERS.map(provider => (
          <button
            type="button"
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
                {t('provider.recommended')}
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
                {t('provider.select')} →
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="text-center">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          {t('navigation.skip')}
        </button>
      </div>

      {/* Help Section */}
      <div className="rounded-lg bg-gray-50 p-6">
        <h4 className="mb-3 font-semibold text-gray-900">{t('whatsapp.provider.notSure')}</h4>
        <div className="space-y-3 text-sm text-gray-600">
          <p>{t('whatsapp.provider.recommendation')}</p>
        </div>
      </div>
    </div>
  )
}
