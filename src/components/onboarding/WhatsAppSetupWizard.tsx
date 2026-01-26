'use client'

import { useState } from 'react'
import { useTranslations } from '@/components/providers/translation-provider'

interface WhatsAppSetupWizardProps {
  onComplete: (credentials: WhatsAppCredentials) => void
  onSkip: () => void
}

interface WhatsAppCredentials {
  phoneNumberId: string
  businessAccountId: string
  accessToken: string
  webhookVerifyToken: string
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid'

interface FieldValidation {
  phoneNumberId: ValidationStatus
  businessAccountId: ValidationStatus
  accessToken: ValidationStatus
}

export function WhatsAppSetupWizard({ onComplete, onSkip }: WhatsAppSetupWizardProps) {
  const t = useTranslations('onboarding')
  const [step, setStep] = useState(1)
  const [credentials, setCredentials] = useState<WhatsAppCredentials>({
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    webhookVerifyToken: '',
  })
  const [validation, setValidation] = useState<FieldValidation>({
    phoneNumberId: 'idle',
    businessAccountId: 'idle',
    accessToken: 'idle',
  })
  const [showVideo, setShowVideo] = useState(false)

  const validatePhoneNumberId = async (value: string) => {
    if (!value || value.length < 10) {
      setValidation(prev => ({ ...prev, phoneNumberId: 'idle' }))
      return
    }

    setValidation(prev => ({ ...prev, phoneNumberId: 'validating' }))

    try {
      const response = await fetch('/api/onboarding/validate-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumberId: value }),
      })

      const data = await response.json()
      setValidation(prev => ({
        ...prev,
        phoneNumberId: data.valid ? 'valid' : 'invalid',
      }))
    } catch (error) {
      setValidation(prev => ({ ...prev, phoneNumberId: 'invalid' }))
    }
  }

  const handleFieldChange = (field: keyof WhatsAppCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }))

    if (field === 'phoneNumberId') {
      const timeoutId = setTimeout(() => validatePhoneNumberId(value), 500)
      return () => clearTimeout(timeoutId)
    }
  }

  const canProceedToNextStep = () => {
    switch (step) {
      case 1:
        return credentials.phoneNumberId.length > 0
      case 2:
        return credentials.businessAccountId.length > 0
      case 3:
        return credentials.accessToken.length > 0
      default:
        return true
    }
  }

  const handleComplete = () => {
    onComplete(credentials)
  }

  // Instructions arrays for translations
  const step1Instructions = [
    t('whatsapp.step1.instructions.0'),
    t('whatsapp.step1.instructions.1'),
    t('whatsapp.step1.instructions.2'),
    t('whatsapp.step1.instructions.3'),
  ]

  const step2Instructions = [
    t('whatsapp.step2.instructions.0'),
    t('whatsapp.step2.instructions.1'),
    t('whatsapp.step2.instructions.2'),
  ]

  const step3Instructions = [
    t('whatsapp.step3.instructions.0'),
    t('whatsapp.step3.instructions.1'),
    t('whatsapp.step3.instructions.2'),
    t('whatsapp.step3.instructions.3'),
    t('whatsapp.step3.instructions.4'),
    t('whatsapp.step3.instructions.5'),
  ]

  return (
    <div className='mx-auto max-w-4xl space-y-6 p-6'>
      {/* Header */}
      <div className='text-center'>
        <h2 className='text-2xl font-bold text-gray-900'>{t('whatsapp.title')}</h2>
        <p className='mt-2 text-gray-600'>{t('whatsapp.description')}</p>
      </div>

      {/* Progress Bar */}
      <div className='mb-8 flex items-center justify-between'>
        {[1, 2, 3].map(stepNumber => (
          <div key={stepNumber} className='flex flex-1 items-center'>
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                stepNumber < step
                  ? 'bg-green-500 text-white'
                  : stepNumber === step
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {stepNumber < step ? '✓' : stepNumber}
            </div>
            {stepNumber < 3 && (
              <div
                className={`mx-2 h-1 flex-1 ${stepNumber < step ? 'bg-green-500' : 'bg-gray-200'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Video Tutorial */}
      {showVideo && (
        <div className='mb-6 rounded-lg bg-gray-50 p-6'>
          <div className='mb-4 flex items-start justify-between'>
            <h3 className='text-lg font-semibold'>Video Tutorial</h3>
            <button
              onClick={() => setShowVideo(false)}
              className='text-gray-500 hover:text-gray-700'
            >
              ✕
            </button>
          </div>
          <div className='flex aspect-video items-center justify-center rounded-lg bg-gray-900'>
            <video
              controls
              poster='/images/whatsapp-tutorial-thumbnail.jpg'
              className='h-full w-full rounded-lg'
            >
              <source src='/tutorials/whatsapp-setup.mp4' type='video/mp4' />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className='rounded-lg border border-gray-200 bg-white p-8 shadow-sm'>
        {/* Step 1: Phone Number ID */}
        {step === 1 && (
          <div className='space-y-6'>
            <div>
              <h3 className='mb-2 text-xl font-semibold'>{t('whatsapp.step1.title')}</h3>
              <p className='text-gray-600'>{t('whatsapp.step1.description')}</p>
            </div>

            {/* Visual Helper with Screenshot */}
            <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
              <div className='flex items-start gap-4'>
                <div className='flex-shrink-0'>
                  <div className='flex h-12 w-12 items-center justify-center rounded-full bg-blue-500 text-xl text-white'>
                    ℹ️
                  </div>
                </div>
                <div className='flex-1'>
                  <h4 className='mb-2 font-semibold text-blue-900'>{t('whatsapp.step1.whereToFind')}</h4>
                  <ol className='space-y-2 text-sm text-blue-800'>
                    {step1Instructions.map((instruction, idx) => (
                      <li key={idx}>{idx + 1}. {instruction}</li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            {/* Input Field with Live Validation */}
            <div>
              <label
                htmlFor='phoneNumberId'
                className='mb-2 block text-sm font-medium text-gray-700'
              >
                Phone Number ID
              </label>
              <div className='relative'>
                <input
                  id='phoneNumberId'
                  type='text'
                  value={credentials.phoneNumberId}
                  onChange={e => handleFieldChange('phoneNumberId', e.target.value)}
                  placeholder={t('whatsapp.step1.placeholder')}
                  className={`w-full rounded-lg border px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                    validation.phoneNumberId === 'valid'
                      ? 'border-green-500 bg-green-50'
                      : validation.phoneNumberId === 'invalid'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300'
                  }`}
                />
                {validation.phoneNumberId === 'validating' && (
                  <div className='absolute top-1/2 right-3 -translate-y-1/2 transform'>
                    <div className='h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent' />
                  </div>
                )}
                {validation.phoneNumberId === 'valid' && (
                  <div className='absolute top-1/2 right-3 -translate-y-1/2 transform text-green-500'>
                    ✓ {t('whatsapp.step1.valid')}
                  </div>
                )}
                {validation.phoneNumberId === 'invalid' && (
                  <div className='absolute top-1/2 right-3 -translate-y-1/2 transform text-red-500'>
                    ✕ {t('whatsapp.step1.invalid')}
                  </div>
                )}
              </div>
            </div>

            {/* Help Links */}
            <div className='space-y-2 rounded-lg bg-gray-50 p-4'>
              <h4 className='font-semibold text-gray-900'>{t('whatsapp.help.title')}</h4>
              <ul className='space-y-2'>
                <li>
                  <button
                    onClick={() => setShowVideo(!showVideo)}
                    className='flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700'
                  >
                    <span>📹</span>
                    {t('whatsapp.help.watchVideo')}
                  </button>
                </li>
                <li>
                  <a
                    href='/docs/whatsapp-setup'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700'
                  >
                    <span>📚</span>
                    {t('whatsapp.help.readGuide')}
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => {
                      // TODO: Open support chat
                    }}
                    className='flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700'
                  >
                    <span>💬</span>
                    {t('whatsapp.help.chatSupport')}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Business Account ID */}
        {step === 2 && (
          <div className='space-y-6'>
            <div>
              <h3 className='mb-2 text-xl font-semibold'>{t('whatsapp.step2.title')}</h3>
              <p className='text-gray-600'>{t('whatsapp.step2.description')}</p>
            </div>

            <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
              <h4 className='mb-2 font-semibold text-blue-900'>{t('whatsapp.step2.whereToFind')}</h4>
              <ol className='space-y-2 text-sm text-blue-800'>
                {step2Instructions.map((instruction, idx) => (
                  <li key={idx}>{idx + 1}. {instruction}</li>
                ))}
              </ol>
            </div>

            <div>
              <label
                htmlFor='businessAccountId'
                className='mb-2 block text-sm font-medium text-gray-700'
              >
                Business Account ID
              </label>
              <input
                id='businessAccountId'
                type='text'
                value={credentials.businessAccountId}
                onChange={e => handleFieldChange('businessAccountId', e.target.value)}
                placeholder={t('whatsapp.step2.placeholder')}
                className='w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500'
              />
            </div>
          </div>
        )}

        {/* Step 3: Access Token */}
        {step === 3 && (
          <div className='space-y-6'>
            <div>
              <h3 className='mb-2 text-xl font-semibold'>{t('whatsapp.step3.title')}</h3>
              <p className='text-gray-600'>{t('whatsapp.step3.description')}</p>
            </div>

            <div className='rounded-lg border border-yellow-200 bg-yellow-50 p-4'>
              <div className='flex items-start gap-2'>
                <span className='text-yellow-600'>⚠️</span>
                <div className='flex-1'>
                  <h4 className='mb-1 font-semibold text-yellow-900'>{t('whatsapp.step3.securityNotice')}</h4>
                  <p className='text-sm text-yellow-800'>{t('whatsapp.step3.securityWarning')}</p>
                </div>
              </div>
            </div>

            <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
              <h4 className='mb-2 font-semibold text-blue-900'>{t('whatsapp.step3.howToGenerate')}</h4>
              <ol className='space-y-2 text-sm text-blue-800'>
                {step3Instructions.map((instruction, idx) => (
                  <li key={idx}>{idx + 1}. {instruction}</li>
                ))}
              </ol>
            </div>

            <div>
              <label htmlFor='accessToken' className='mb-2 block text-sm font-medium text-gray-700'>
                Access Token
              </label>
              <textarea
                id='accessToken'
                value={credentials.accessToken}
                onChange={e => handleFieldChange('accessToken', e.target.value)}
                placeholder={t('whatsapp.step3.placeholder')}
                rows={4}
                className='w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500'
              />
            </div>

            <div>
              <label
                htmlFor='webhookVerifyToken'
                className='mb-2 block text-sm font-medium text-gray-700'
              >
                {t('whatsapp.step3.webhookToken')}
              </label>
              <input
                id='webhookVerifyToken'
                type='text'
                value={credentials.webhookVerifyToken}
                onChange={e => handleFieldChange('webhookVerifyToken', e.target.value)}
                placeholder={t('whatsapp.step3.webhookTokenPlaceholder')}
                className='w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500'
              />
              <p className='mt-1 text-sm text-gray-500'>{t('whatsapp.step3.webhookTokenHelper')}</p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className='mt-8 flex items-center justify-between border-t border-gray-200 pt-6'>
          <div className='flex gap-3'>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className='rounded-lg bg-gray-100 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-200'
              >
                ← {t('navigation.back')}
              </button>
            )}
            <button
              onClick={onSkip}
              className='px-6 py-2 text-gray-600 underline hover:text-gray-800'
            >
              {t('navigation.skip')}
            </button>
          </div>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceedToNextStep()}
              className='rounded-lg bg-blue-600 px-8 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300'
            >
              {t('navigation.continue')} →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceedToNextStep()}
              className='rounded-lg bg-green-600 px-8 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300'
            >
              {t('navigation.finish')} ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
