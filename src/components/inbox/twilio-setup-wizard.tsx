'use client'

import { useState } from 'react'
import {
  Check,
  X,
  AlertCircle,
  Loader2,
  Phone,
  Key,
  Shield,
  Zap,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  Copy,
  CheckCircle2,
} from 'lucide-react'

interface TwilioSetupWizardProps {
  organizationId: string
  onComplete: () => void
  onCancel: () => void
}

interface TwilioConfig {
  accountSid: string
  authToken: string
  whatsappNumber: string
  friendlyName: string
}

interface SetupStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  error?: string
}

export default function TwilioSetupWizard({
  organizationId,
  onComplete,
  onCancel,
}: TwilioSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [config, setConfig] = useState<TwilioConfig>({
    accountSid: '',
    authToken: '',
    whatsappNumber: '',
    friendlyName: '',
  })
  const [setupSteps, setSetupSteps] = useState<SetupStep[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const steps = [
    {
      title: 'Credentials',
      description: 'Twilio gegevens',
      icon: Key,
    },
    {
      title: 'Verificatie',
      description: 'Valideren',
      icon: Shield,
    },
    {
      title: 'Voltooid',
      description: 'Gereed',
      icon: Zap,
    },
  ]

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const validateConfig = (): string[] => {
    const errors: string[] = []

    if (!config.accountSid) {
      errors.push('Account SID is verplicht')
    } else if (!config.accountSid.startsWith('AC')) {
      errors.push('Account SID moet beginnen met "AC"')
    }

    if (!config.authToken) {
      errors.push('Auth Token is verplicht')
    }

    if (!config.whatsappNumber) {
      errors.push('WhatsApp nummer is verplicht')
    } else if (!config.whatsappNumber.match(/^\+?[1-9]\d{1,14}$/)) {
      errors.push('WhatsApp nummer moet in E.164 formaat zijn (bijv. +14155238886)')
    }

    return errors
  }

  const runSetup = async () => {
    const errors = validateConfig()
    if (errors.length > 0) {
      setError(errors.join('. '))
      return
    }

    setError(null)
    setIsRunning(true)
    setCurrentStep(1)

    const steps: SetupStep[] = [
      {
        id: 'verify_credentials',
        title: 'Credentials Verifiëren',
        description: 'Controleren of de Twilio credentials geldig zijn',
        status: 'in_progress',
      },
      {
        id: 'save_config',
        title: 'Configuratie Opslaan',
        description: 'Credentials veilig opslaan in de database',
        status: 'pending',
      },
    ]
    setSetupSteps(steps)

    try {
      // Step 1: Verify credentials
      const verifyResponse = await fetch('/api/integrations/twilio-whatsapp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid: config.accountSid,
          authToken: config.authToken,
          whatsappNumber: config.whatsappNumber,
        }),
      })

      const verifyData = await verifyResponse.json()

      if (!verifyResponse.ok || !verifyData.valid) {
        setSetupSteps(prev =>
          prev.map(s =>
            s.id === 'verify_credentials'
              ? { ...s, status: 'failed', error: verifyData.error || 'Ongeldige credentials' }
              : s
          )
        )
        setIsRunning(false)
        return
      }

      setSetupSteps(prev =>
        prev.map(s =>
          s.id === 'verify_credentials'
            ? { ...s, status: 'completed' }
            : s.id === 'save_config'
              ? { ...s, status: 'in_progress' }
              : s
        )
      )

      // Step 2: Save configuration
      const saveResponse = await fetch('/api/integrations/twilio-whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid: config.accountSid,
          authToken: config.authToken,
          whatsappNumber: config.whatsappNumber,
          friendlyName: config.friendlyName || undefined,
        }),
      })

      const saveData = await saveResponse.json()

      if (!saveResponse.ok) {
        setSetupSteps(prev =>
          prev.map(s =>
            s.id === 'save_config'
              ? { ...s, status: 'failed', error: saveData.error || 'Kon configuratie niet opslaan' }
              : s
          )
        )
        setIsRunning(false)
        return
      }

      setSetupSteps(prev =>
        prev.map(s => (s.id === 'save_config' ? { ...s, status: 'completed' } : s))
      )

      // Success - move to completion step
      setCurrentStep(2)
      setTimeout(() => {
        onComplete()
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden')
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: SetupStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className='h-5 w-5 text-emerald-500' />
      case 'failed':
        return <X className='h-5 w-5 text-red-500' />
      case 'in_progress':
        return <Loader2 className='h-5 w-5 animate-spin text-red-500' />
      default:
        return <div className='h-5 w-5 rounded-full border-2 border-gray-300' />
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8'>
      <div className='mx-auto max-w-2xl'>
        {/* Back Button */}
        <button
          onClick={onCancel}
          className='mb-6 inline-flex items-center text-sm text-gray-600 transition-colors hover:text-gray-900'
        >
          <ArrowLeft className='mr-2 h-4 w-4' />
          Terug naar WhatsApp instellingen
        </button>

        {/* Main Card */}
        <div className='overflow-hidden rounded-2xl bg-white shadow-xl'>
          {/* Header */}
          <div className='relative bg-gradient-to-r from-red-600 to-red-700 px-8 py-8'>
            <div className='absolute right-0 top-0 h-full w-1/2 opacity-10'>
              <svg viewBox='0 0 100 100' className='h-full w-full'>
                <circle cx='80' cy='20' r='40' fill='white' />
                <circle cx='100' cy='80' r='30' fill='white' />
              </svg>
            </div>
            <div className='relative flex items-center gap-4'>
              <div className='flex h-14 w-14 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm'>
                <span className='text-2xl font-bold text-white'>T</span>
              </div>
              <div>
                <h1 className='text-2xl font-bold text-white'>Twilio WhatsApp</h1>
                <p className='text-red-100'>Verbind je Twilio account</p>
              </div>
            </div>
          </div>

          {/* Progress Steps */}
          <div className='border-b border-gray-100 bg-gray-50/50 px-8 py-4'>
            <div className='flex items-center justify-between'>
              {steps.map((step, index) => (
                <div key={index} className='flex items-center'>
                  <div className='flex items-center gap-3'>
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                        index < currentStep
                          ? 'bg-emerald-500 text-white'
                          : index === currentStep
                            ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                            : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {index < currentStep ? (
                        <Check className='h-5 w-5' />
                      ) : (
                        <step.icon className='h-5 w-5' />
                      )}
                    </div>
                    <div className='hidden sm:block'>
                      <p
                        className={`text-sm font-medium ${
                          index <= currentStep ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {step.title}
                      </p>
                      <p className='text-xs text-gray-500'>{step.description}</p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`mx-4 h-0.5 w-12 rounded-full transition-colors ${
                        index < currentStep ? 'bg-emerald-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className='p-8'>
            {/* Step 0: Credentials Form */}
            {currentStep === 0 && (
              <div className='space-y-6'>
                <div>
                  <h2 className='text-xl font-semibold text-gray-900'>Account Configuratie</h2>
                  <p className='mt-1 text-sm text-gray-600'>
                    Vind je credentials in de{' '}
                    <a
                      href='https://console.twilio.com'
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center font-medium text-red-600 hover:text-red-700'
                    >
                      Twilio Console
                      <ExternalLink className='ml-1 h-3 w-3' />
                    </a>
                  </p>
                </div>

                {error && (
                  <div className='flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4'>
                    <AlertCircle className='mt-0.5 h-5 w-5 flex-shrink-0 text-red-500' />
                    <p className='text-sm text-red-800'>{error}</p>
                  </div>
                )}

                <div className='space-y-5'>
                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700'>
                      Account SID <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='text'
                      value={config.accountSid}
                      onChange={e => setConfig({ ...config, accountSid: e.target.value })}
                      className='w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20'
                      placeholder='ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                    />
                    <p className='mt-1.5 text-xs text-gray-500'>
                      Begint met "AC", te vinden op je Twilio Console dashboard
                    </p>
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700'>
                      Auth Token <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='password'
                      value={config.authToken}
                      onChange={e => setConfig({ ...config, authToken: e.target.value })}
                      className='w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20'
                      placeholder='••••••••••••••••••••••••••••••••'
                    />
                    <p className='mt-1.5 text-xs text-gray-500'>
                      Geheime token, klik op "Show" in Twilio Console om deze te zien
                    </p>
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700'>
                      WhatsApp Nummer <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='text'
                      value={config.whatsappNumber}
                      onChange={e => setConfig({ ...config, whatsappNumber: e.target.value })}
                      className='w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20'
                      placeholder='+14155238886'
                    />
                    <p className='mt-1.5 text-xs text-gray-500'>
                      E.164 formaat met landcode (bijv. +31612345678)
                    </p>
                  </div>

                  <div>
                    <label className='mb-2 block text-sm font-medium text-gray-700'>
                      Friendly Name <span className='text-gray-400'>(optioneel)</span>
                    </label>
                    <input
                      type='text'
                      value={config.friendlyName}
                      onChange={e => setConfig({ ...config, friendlyName: e.target.value })}
                      className='w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition-all focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20'
                      placeholder='Mijn WhatsApp Business'
                    />
                  </div>
                </div>

                {/* Sandbox Info */}
                <div className='rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5'>
                  <h3 className='mb-2 flex items-center gap-2 font-medium text-blue-900'>
                    <Phone className='h-4 w-4' />
                    WhatsApp Sandbox voor testen
                  </h3>
                  <p className='mb-3 text-sm text-blue-800'>
                    Nog geen WhatsApp Business nummer? Gebruik de Twilio Sandbox:
                  </p>
                  <ol className='space-y-2 text-sm text-blue-800'>
                    <li className='flex items-start gap-2'>
                      <span className='flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-medium text-blue-700'>
                        1
                      </span>
                      <span>
                        Ga naar{' '}
                        <a
                          href='https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn'
                          target='_blank'
                          rel='noopener noreferrer'
                          className='font-medium underline'
                        >
                          Twilio WhatsApp Sandbox
                        </a>
                      </span>
                    </li>
                    <li className='flex items-start gap-2'>
                      <span className='flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-medium text-blue-700'>
                        2
                      </span>
                      <span>Stuur de join code naar het Sandbox nummer</span>
                    </li>
                    <li className='flex items-start gap-2'>
                      <span className='flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-medium text-blue-700'>
                        3
                      </span>
                      <div className='flex items-center gap-2'>
                        <span>Gebruik nummer:</span>
                        <code className='rounded bg-blue-200/50 px-2 py-0.5 font-mono text-xs'>
                          +14155238886
                        </code>
                        <button
                          onClick={() => copyToClipboard('+14155238886', 'sandbox')}
                          className='text-blue-600 hover:text-blue-800'
                        >
                          {copiedField === 'sandbox' ? (
                            <Check className='h-4 w-4' />
                          ) : (
                            <Copy className='h-4 w-4' />
                          )}
                        </button>
                      </div>
                    </li>
                  </ol>
                </div>

                {/* Actions */}
                <div className='flex items-center justify-between border-t border-gray-100 pt-6'>
                  <button
                    type='button'
                    onClick={onCancel}
                    className='rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50'
                  >
                    Annuleren
                  </button>
                  <button
                    type='button'
                    onClick={runSetup}
                    disabled={isRunning}
                    className='inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700 disabled:opacity-50'
                  >
                    Verbinden
                    <ArrowRight className='h-4 w-4' />
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Verification */}
            {currentStep === 1 && (
              <div className='space-y-6'>
                <div>
                  <h2 className='text-xl font-semibold text-gray-900'>Verificatie</h2>
                  <p className='mt-1 text-sm text-gray-600'>
                    We verifiëren je Twilio credentials en slaan de configuratie veilig op.
                  </p>
                </div>

                <div className='space-y-4'>
                  {setupSteps.map(step => (
                    <div
                      key={step.id}
                      className={`flex items-start gap-4 rounded-xl border p-5 transition-all ${
                        step.status === 'in_progress'
                          ? 'border-red-200 bg-red-50'
                          : step.status === 'completed'
                            ? 'border-emerald-200 bg-emerald-50'
                            : step.status === 'failed'
                              ? 'border-red-300 bg-red-50'
                              : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className='mt-0.5'>{getStatusIcon(step.status)}</div>
                      <div className='flex-1'>
                        <h3
                          className={`font-medium ${
                            step.status === 'completed'
                              ? 'text-emerald-700'
                              : step.status === 'failed'
                                ? 'text-red-700'
                                : step.status === 'in_progress'
                                  ? 'text-red-700'
                                  : 'text-gray-500'
                          }`}
                        >
                          {step.title}
                        </h3>
                        <p className='mt-0.5 text-sm text-gray-600'>{step.description}</p>
                        {step.error && (
                          <div className='mt-3 flex items-start gap-2 rounded-lg bg-red-100 p-3'>
                            <AlertCircle className='mt-0.5 h-4 w-4 flex-shrink-0 text-red-600' />
                            <p className='text-sm text-red-700'>{step.error}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {setupSteps.some(s => s.status === 'failed') && (
                  <div className='flex justify-end border-t border-gray-100 pt-6'>
                    <button
                      type='button'
                      onClick={() => {
                        setCurrentStep(0)
                        setSetupSteps([])
                        setIsRunning(false)
                      }}
                      className='inline-flex items-center gap-2 rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50'
                    >
                      <ArrowLeft className='h-4 w-4' />
                      Terug naar configuratie
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Success */}
            {currentStep === 2 && (
              <div className='py-8 text-center'>
                <div className='mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200'>
                  <Check className='h-10 w-10 text-white' />
                </div>

                <h2 className='mb-2 text-2xl font-bold text-gray-900'>Setup Voltooid!</h2>
                <p className='mb-8 text-gray-600'>
                  Je Twilio WhatsApp integratie is succesvol geconfigureerd.
                </p>

                <div className='mx-auto max-w-md rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 text-left'>
                  <h3 className='mb-4 font-medium text-emerald-900'>Wat je nu kunt doen:</h3>
                  <ul className='space-y-3'>
                    <li className='flex items-start gap-3 text-sm text-emerald-800'>
                      <CheckCircle2 className='mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500' />
                      <span>WhatsApp berichten ontvangen in je Inbox</span>
                    </li>
                    <li className='flex items-start gap-3 text-sm text-emerald-800'>
                      <CheckCircle2 className='mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500' />
                      <span>Berichten versturen naar contacten die jou eerst bereiken</span>
                    </li>
                    <li className='flex items-start gap-3 text-sm text-emerald-800'>
                      <Phone className='mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500' />
                      <span>Test door een WhatsApp bericht te sturen naar je nummer</span>
                    </li>
                  </ul>
                </div>

                <p className='mt-6 text-sm text-gray-500'>
                  Je wordt automatisch doorgestuurd...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
