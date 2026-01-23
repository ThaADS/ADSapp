'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProviderSelector, type WhatsAppCredentials, type WhatsAppProvider } from './ProviderSelector'
import { TeamInvitationStep, type TeamInvitation } from './TeamInvitationStep'

interface OnboardingData {
  // Step 1: Organization
  organizationName: string
  subdomain: string

  // Step 2: WhatsApp Business
  whatsappProvider: WhatsAppProvider | null
  whatsappPhoneNumberId: string
  whatsappBusinessAccountId: string
  whatsappAccessToken: string
  whatsappWebhookVerifyToken: string
  whatsappSkipped: boolean
  // Twilio specific
  twilioAccountSid?: string
  twilioAuthToken?: string
  twilioPhoneNumber?: string

  // Step 3: Profile
  fullName: string
  role: 'owner' | 'admin' | 'agent'

  // Step 4: Team Invitations
  teamInvitations: TeamInvitation[]
}

const STEPS = [
  { id: 1, name: 'Organization', description: 'Create your organization' },
  { id: 2, name: 'WhatsApp', description: 'Connect WhatsApp Business' },
  { id: 3, name: 'Profile', description: 'Complete your profile' },
  { id: 4, name: 'Team', description: 'Invite your team' },
]

export function OnboardingForm({ userEmail }: { userEmail: string }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState<OnboardingData>({
    organizationName: '',
    subdomain: '',
    whatsappProvider: null,
    whatsappPhoneNumberId: '',
    whatsappBusinessAccountId: '',
    whatsappAccessToken: '',
    whatsappWebhookVerifyToken: '',
    whatsappSkipped: false,
    fullName: '',
    role: 'owner',
    teamInvitations: [],
  })

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Generate slug from organization name
  const generateSubdomain = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))

    // Auto-generate subdomain from organization name
    if (name === 'organizationName') {
      setFormData(prev => ({
        ...prev,
        subdomain: generateSubdomain(value),
      }))
    }

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
  }

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {}

    if (step === 1) {
      if (!formData.organizationName.trim()) {
        errors.organizationName = 'Organization name is required'
      }
      if (!formData.subdomain.trim()) {
        errors.subdomain = 'Subdomain is required'
      } else if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
        errors.subdomain = 'Subdomain can only contain lowercase letters, numbers, and hyphens'
      }
    }

    if (step === 2) {
      // Step 2 validation is handled by WhatsAppSetupWizard component
      // Allow skip, so no required fields
    }

    if (step === 3) {
      if (!formData.fullName.trim()) {
        errors.fullName = 'Full name is required'
      }
      if (!formData.role) {
        errors.role = 'Role is required'
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
      setError(null)
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateStep(currentStep)) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Onboarding failed. Please try again.')
        return
      }

      // Success! Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      console.error('Onboarding error:', err)
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='w-full max-w-3xl'>
      {/* Progress Steps */}
      <nav aria-label='Progress' className='mb-8'>
        <ol className='flex items-center justify-between'>
          {STEPS.map((step, stepIdx) => (
            <li
              key={step.id}
              className={`relative ${stepIdx !== STEPS.length - 1 ? 'flex-1' : ''}`}
            >
              <div className='flex items-center'>
                <div className='relative flex items-center'>
                  <span
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                      step.id < currentStep
                        ? 'border-blue-600 bg-blue-600'
                        : step.id === currentStep
                          ? 'border-blue-600 bg-white'
                          : 'border-gray-300 bg-white'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <svg className='h-5 w-5 text-white' fill='currentColor' viewBox='0 0 20 20'>
                        <path
                          fillRule='evenodd'
                          d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                          clipRule='evenodd'
                        />
                      </svg>
                    ) : (
                      <span
                        className={`text-sm font-semibold ${
                          step.id === currentStep ? 'text-blue-600' : 'text-gray-500'
                        }`}
                      >
                        {step.id}
                      </span>
                    )}
                  </span>
                  <span className='ml-3 hidden text-sm font-medium sm:block'>
                    <span className={step.id === currentStep ? 'text-blue-600' : 'text-gray-500'}>
                      {step.name}
                    </span>
                  </span>
                </div>
                {stepIdx !== STEPS.length - 1 && (
                  <div
                    className={`mx-4 h-0.5 flex-1 ${
                      step.id < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>
      </nav>

      {/* Form */}
      <form onSubmit={handleSubmit} className='rounded-lg bg-white p-8 shadow-lg'>
        {/* Step 1: Organization */}
        {currentStep === 1 && (
          <div className='space-y-6'>
            <div>
              <h2 className='mb-2 text-2xl font-bold text-gray-900'>Create Your Organization</h2>
              <p className='text-gray-600'>
                Let&apos;s start by setting up your organization details.
              </p>
            </div>

            <div>
              <label
                htmlFor='organizationName'
                className='mb-1 block text-sm font-medium text-gray-700'
              >
                Organization Name *
              </label>
              <input
                type='text'
                id='organizationName'
                name='organizationName'
                value={formData.organizationName}
                onChange={handleInputChange}
                className={`block w-full appearance-none border px-3 py-2 ${
                  validationErrors.organizationName ? 'border-red-300' : 'border-gray-300'
                } rounded-md placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm`}
                placeholder='Acme Corporation'
              />
              {validationErrors.organizationName && (
                <p className='mt-1 text-sm text-red-600'>{validationErrors.organizationName}</p>
              )}
            </div>

            <div>
              <label htmlFor='subdomain' className='mb-1 block text-sm font-medium text-gray-700'>
                Subdomain *
              </label>
              <div className='mt-1 flex rounded-md shadow-sm'>
                <input
                  type='text'
                  id='subdomain'
                  name='subdomain'
                  value={formData.subdomain}
                  onChange={handleInputChange}
                  className={`block w-full min-w-0 flex-1 rounded-md border px-3 py-2 ${
                    validationErrors.subdomain ? 'border-red-300' : 'border-gray-300'
                  } focus:border-blue-500 focus:ring-blue-500 sm:text-sm`}
                  placeholder='acme-corp'
                />
              </div>
              <p className='mt-1 text-sm text-gray-500'>
                This will be used to identify your organization (lowercase, numbers, and hyphens
                only)
              </p>
              {validationErrors.subdomain && (
                <p className='mt-1 text-sm text-red-600'>{validationErrors.subdomain}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: WhatsApp Business Setup - Now with Provider Selection */}
        {currentStep === 2 && (
          <ProviderSelector
            onComplete={(credentials: WhatsAppCredentials) => {
              setFormData(prev => ({
                ...prev,
                whatsappProvider: credentials.provider,
                whatsappPhoneNumberId: credentials.phoneNumberId,
                whatsappBusinessAccountId: credentials.businessAccountId,
                whatsappAccessToken: credentials.accessToken,
                whatsappWebhookVerifyToken: credentials.webhookVerifyToken,
                whatsappSkipped: false,
                // Twilio specific
                twilioAccountSid: credentials.twilioAccountSid,
                twilioAuthToken: credentials.twilioAuthToken,
                twilioPhoneNumber: credentials.twilioPhoneNumber,
              }))
              setCurrentStep(3)
            }}
            onSkip={() => {
              setFormData(prev => ({
                ...prev,
                whatsappSkipped: true,
              }))
              setCurrentStep(3)
            }}
          />
        )}

        {/* Step 3: Profile Completion */}
        {currentStep === 3 && (
          <div className='space-y-6'>
            <div>
              <h2 className='mb-2 text-2xl font-bold text-gray-900'>Complete Your Profile</h2>
              <p className='text-gray-600'>Tell us a bit about yourself.</p>
            </div>

            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700'>Email</label>
              <input
                type='email'
                value={userEmail}
                disabled
                className='block w-full cursor-not-allowed appearance-none rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-gray-500 shadow-sm sm:text-sm'
              />
            </div>

            <div>
              <label htmlFor='fullName' className='mb-1 block text-sm font-medium text-gray-700'>
                Full Name *
              </label>
              <input
                type='text'
                id='fullName'
                name='fullName'
                value={formData.fullName}
                onChange={handleInputChange}
                className={`block w-full appearance-none border px-3 py-2 ${
                  validationErrors.fullName ? 'border-red-300' : 'border-gray-300'
                } rounded-md placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm`}
                placeholder='John Doe'
              />
              {validationErrors.fullName && (
                <p className='mt-1 text-sm text-red-600'>{validationErrors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor='role' className='mb-1 block text-sm font-medium text-gray-700'>
                Your Role *
              </label>
              <select
                id='role'
                name='role'
                value={formData.role}
                onChange={handleInputChange}
                className={`block w-full appearance-none border px-3 py-2 ${
                  validationErrors.role ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none sm:text-sm`}
              >
                <option value='owner'>Owner - Full access and billing control</option>
                <option value='admin'>Admin - Manage team and settings</option>
                <option value='agent'>Agent - Handle conversations</option>
              </select>
              {validationErrors.role && (
                <p className='mt-1 text-sm text-red-600'>{validationErrors.role}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Team Invitations */}
        {currentStep === 4 && (
          <TeamInvitationStep
            onComplete={async (invitations: TeamInvitation[]) => {
              // Update form data with invitations
              const updatedFormData = {
                ...formData,
                teamInvitations: invitations,
              }
              setFormData(updatedFormData)

              // Submit the form with updated data
              setIsLoading(true)
              setError(null)
              try {
                const response = await fetch('/api/onboarding', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updatedFormData),
                })
                const result = await response.json()
                if (!response.ok) {
                  setError(result.error || 'Onboarding failed. Please try again.')
                  return
                }
                router.push('/dashboard')
                router.refresh()
              } catch (err) {
                console.error('Onboarding error:', err)
                setError('An unexpected error occurred. Please try again.')
              } finally {
                setIsLoading(false)
              }
            }}
            onSkip={async () => {
              // Submit without team invitations
              setIsLoading(true)
              setError(null)
              try {
                const response = await fetch('/api/onboarding', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(formData),
                })
                const result = await response.json()
                if (!response.ok) {
                  setError(result.error || 'Onboarding failed. Please try again.')
                  return
                }
                router.push('/dashboard')
                router.refresh()
              } catch (err) {
                console.error('Onboarding error:', err)
                setError('An unexpected error occurred. Please try again.')
              } finally {
                setIsLoading(false)
              }
            }}
          />
        )}

        {/* Error Message */}
        {error && (
          <div className='mt-6 rounded-md bg-red-50 p-4'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <svg className='h-5 w-5 text-red-400' viewBox='0 0 20 20' fill='currentColor'>
                  <path
                    fillRule='evenodd'
                    d='M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z'
                    clipRule='evenodd'
                  />
                </svg>
              </div>
              <div className='ml-3'>
                <h3 className='text-sm font-medium text-red-800'>Error</h3>
                <div className='mt-2 text-sm text-red-700'>{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons - Hidden on Step 2 (ProviderSelector) and Step 4 (TeamInvitation) as they handle their own navigation */}
        {currentStep !== 2 && currentStep !== 4 && (
          <div className='mt-8 flex justify-between'>
            {currentStep > 1 ? (
              <button
                type='button'
                onClick={handleBack}
                disabled={isLoading}
                className='inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
              >
                <svg className='mr-2 h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 19l-7-7 7-7'
                  />
                </svg>
                Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < STEPS.length ? (
              <button
                type='button'
                onClick={handleNext}
                disabled={isLoading}
                className='inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
              >
                Next
                <svg className='ml-2 h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 5l7 7-7 7'
                  />
                </svg>
              </button>
            ) : (
              <button
                type='submit'
                disabled={isLoading}
                className='inline-flex items-center rounded-md border border-transparent bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isLoading ? (
                  <>
                    <svg
                      className='mr-3 -ml-1 h-4 w-4 animate-spin text-white'
                      xmlns='http://www.w3.org/2000/svg'
                      fill='none'
                      viewBox='0 0 24 24'
                    >
                      <circle
                        className='opacity-25'
                        cx='12'
                        cy='12'
                        r='10'
                        stroke='currentColor'
                        strokeWidth='4'
                      ></circle>
                      <path
                        className='opacity-75'
                        fill='currentColor'
                        d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                      ></path>
                    </svg>
                    Setting up...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </button>
            )}
          </div>
        )}
      </form>
    </div>
  )
}
