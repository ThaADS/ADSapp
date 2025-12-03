'use client'

import { useState } from 'react'

interface TwilioSetupProps {
  onComplete: (credentials: TwilioCredentials) => void
  onSkip: () => void
}

interface TwilioCredentials {
  phoneNumberId: string
  businessAccountId: string
  accessToken: string
  webhookVerifyToken: string
  twilioAccountSid: string
  twilioAuthToken: string
  twilioPhoneNumber: string
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid'

export function TwilioSetup({ onComplete, onSkip }: TwilioSetupProps) {
  const [step, setStep] = useState(1)
  const [credentials, setCredentials] = useState({
    accountSid: '',
    authToken: '',
    phoneNumber: '',
  })
  const [validation, setValidation] = useState<ValidationStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleFieldChange = (field: string, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }))
    setError(null)
    setValidation('idle')
  }

  const validateCredentials = async () => {
    setValidation('validating')
    setError(null)

    try {
      const response = await fetch('/api/whatsapp/twilio/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Validation failed')
      }

      setValidation('valid')
      return true
    } catch (err) {
      setValidation('invalid')
      setError(err instanceof Error ? err.message : 'Failed to validate credentials')
      return false
    }
  }

  const handleComplete = async () => {
    const isValid = await validateCredentials()

    if (isValid) {
      onComplete({
        phoneNumberId: `twilio-${credentials.phoneNumber}`,
        businessAccountId: credentials.accountSid,
        accessToken: credentials.authToken,
        webhookVerifyToken: `twilio-verify-${Date.now()}`,
        twilioAccountSid: credentials.accountSid,
        twilioAuthToken: credentials.authToken,
        twilioPhoneNumber: credentials.phoneNumber,
      })
    }
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return credentials.accountSid.length > 0 && credentials.authToken.length > 0
      case 2:
        return credentials.phoneNumber.length > 0
      default:
        return true
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Connect via Twilio</h2>
        <p className="mt-2 text-gray-600">
          Use your existing Twilio account for WhatsApp messaging
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center justify-center gap-4">
        {[1, 2].map(stepNumber => (
          <div key={stepNumber} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                stepNumber < step
                  ? 'bg-green-500 text-white'
                  : stepNumber === step
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {stepNumber < step ? '✓' : stepNumber}
            </div>
            <span className={`text-sm ${stepNumber === step ? 'font-medium' : 'text-gray-500'}`}>
              {stepNumber === 1 ? 'Account' : 'Phone Number'}
            </span>
            {stepNumber < 2 && <div className="h-px w-8 bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="rounded-xl border-2 border-gray-200 bg-white p-8">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xl font-semibold">Step 1: Twilio Account Credentials</h3>
              <p className="text-gray-600">
                Enter your Twilio Account SID and Auth Token from the Twilio Console
              </p>
            </div>

            {/* Where to find */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-2 font-semibold text-blue-900">Where to find these:</h4>
              <ol className="space-y-2 text-sm text-blue-800">
                <li>1. Log in to your Twilio Console at console.twilio.com</li>
                <li>2. Your Account SID and Auth Token are shown on the dashboard</li>
                <li>3. Click the eye icon to reveal your Auth Token</li>
              </ol>
              <a
                href="https://console.twilio.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Open Twilio Console →
              </a>
            </div>

            {/* Account SID */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Account SID
              </label>
              <input
                type="text"
                value={credentials.accountSid}
                onChange={e => handleFieldChange('accountSid', e.target.value)}
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Starts with "AC" followed by 32 characters</p>
            </div>

            {/* Auth Token */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Auth Token
              </label>
              <input
                type="password"
                value={credentials.authToken}
                onChange={e => handleFieldChange('authToken', e.target.value)}
                placeholder="••••••••••••••••••••••••••••••••"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xl font-semibold">Step 2: WhatsApp Phone Number</h3>
              <p className="text-gray-600">
                Enter your Twilio WhatsApp-enabled phone number
              </p>
            </div>

            {/* Setup Notice */}
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <h4 className="mb-2 font-semibold text-yellow-900">⚠️ WhatsApp Sandbox vs Production</h4>
              <div className="space-y-2 text-sm text-yellow-800">
                <p>
                  <strong>For testing:</strong> Use Twilio's WhatsApp Sandbox number (+14155238886)
                </p>
                <p>
                  <strong>For production:</strong> You need a Twilio phone number with WhatsApp enabled
                </p>
                <a
                  href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-yellow-700 underline"
                >
                  Learn about WhatsApp on Twilio →
                </a>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                WhatsApp Phone Number
              </label>
              <input
                type="text"
                value={credentials.phoneNumber}
                onChange={e => handleFieldChange('phoneNumber', e.target.value)}
                placeholder="+1234567890"
                className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">Include country code (e.g., +1 for US)</p>
            </div>

            {/* Validation Status */}
            {validation === 'validating' && (
              <div className="flex items-center gap-2 text-blue-600">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <span>Validating credentials...</span>
              </div>
            )}

            {validation === 'valid' && (
              <div className="flex items-center gap-2 text-green-600">
                <span>✓</span>
                <span>Credentials validated successfully!</span>
              </div>
            )}

            {validation === 'invalid' && error && (
              <div className="rounded-lg bg-red-50 p-3 text-red-700">
                <strong>Validation failed:</strong> {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded-lg bg-gray-100 px-6 py-2 text-gray-700 transition-colors hover:bg-gray-200"
              >
                ← Back
              </button>
            )}
            <button
              onClick={onSkip}
              className="px-6 py-2 text-gray-600 underline hover:text-gray-800"
            >
              Skip for now
            </button>
          </div>

          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="rounded-lg bg-blue-600 px-8 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed() || validation === 'validating'}
              className="rounded-lg bg-green-600 px-8 py-3 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {validation === 'validating' ? 'Validating...' : 'Connect Twilio ✓'}
            </button>
          )}
        </div>
      </div>

      {/* Twilio Benefits */}
      <div className="rounded-lg bg-gray-50 p-6">
        <h4 className="mb-3 font-semibold text-gray-900">Why use Twilio for WhatsApp?</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔗</span>
            <div>
              <h5 className="font-medium text-gray-900">Unified Platform</h5>
              <p className="text-sm text-gray-600">
                Manage SMS, WhatsApp, and Voice in one place
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">📊</span>
            <div>
              <h5 className="font-medium text-gray-900">Detailed Analytics</h5>
              <p className="text-sm text-gray-600">
                Track message delivery and engagement
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <h5 className="font-medium text-gray-900">Pay-as-you-go</h5>
              <p className="text-sm text-gray-600">
                Only pay for messages you send
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <h5 className="font-medium text-gray-900">Enterprise Security</h5>
              <p className="text-sm text-gray-600">
                SOC 2, HIPAA, and GDPR compliant
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Don't have Twilio? */}
      <div className="text-center">
        <p className="text-sm text-gray-500">
          Don't have a Twilio account?{' '}
          <a
            href="https://www.twilio.com/try-twilio"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            Sign up for free
          </a>
        </p>
      </div>
    </div>
  )
}
