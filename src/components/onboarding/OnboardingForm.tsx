'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WhatsAppSetupWizard } from './WhatsAppSetupWizard'

interface OnboardingData {
  // Step 1: Organization
  organizationName: string
  subdomain: string

  // Step 2: WhatsApp Business
  whatsappPhoneNumberId: string
  whatsappBusinessAccountId: string
  whatsappAccessToken: string
  whatsappWebhookVerifyToken: string
  whatsappSkipped: boolean

  // Step 3: Profile
  fullName: string
  role: 'owner' | 'admin' | 'agent'
}

const STEPS = [
  { id: 1, name: 'Organization', description: 'Create your organization' },
  { id: 2, name: 'WhatsApp Setup', description: 'Connect WhatsApp Business' },
  { id: 3, name: 'Profile', description: 'Complete your profile' },
]

export function OnboardingForm({ userEmail }: { userEmail: string }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const [formData, setFormData] = useState<OnboardingData>({
    organizationName: '',
    subdomain: '',
    whatsappPhoneNumberId: '',
    whatsappBusinessAccountId: '',
    whatsappAccessToken: '',
    whatsappWebhookVerifyToken: '',
    whatsappSkipped: false,
    fullName: '',
    role: 'owner',
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
    <div className="w-full max-w-3xl">
      {/* Progress Steps */}
      <nav aria-label="Progress" className="mb-8">
        <ol className="flex items-center justify-between">
          {STEPS.map((step, stepIdx) => (
            <li key={step.id} className={`relative ${stepIdx !== STEPS.length - 1 ? 'flex-1' : ''}`}>
              <div className="flex items-center">
                <div className="flex items-center relative">
                  <span
                    className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                      step.id < currentStep
                        ? 'bg-blue-600 border-blue-600'
                        : step.id === currentStep
                        ? 'border-blue-600 bg-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
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
                  <span className="ml-3 text-sm font-medium hidden sm:block">
                    <span className={step.id === currentStep ? 'text-blue-600' : 'text-gray-500'}>
                      {step.name}
                    </span>
                  </span>
                </div>
                {stepIdx !== STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
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
      <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-8">
        {/* Step 1: Organization */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Organization</h2>
              <p className="text-gray-600">Let&apos;s start by setting up your organization details.</p>
            </div>

            <div>
              <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name *
              </label>
              <input
                type="text"
                id="organizationName"
                name="organizationName"
                value={formData.organizationName}
                onChange={handleInputChange}
                className={`appearance-none block w-full px-3 py-2 border ${
                  validationErrors.organizationName ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="Acme Corporation"
              />
              {validationErrors.organizationName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.organizationName}</p>
              )}
            </div>

            <div>
              <label htmlFor="subdomain" className="block text-sm font-medium text-gray-700 mb-1">
                Subdomain *
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  id="subdomain"
                  name="subdomain"
                  value={formData.subdomain}
                  onChange={handleInputChange}
                  className={`flex-1 min-w-0 block w-full px-3 py-2 rounded-md border ${
                    validationErrors.subdomain ? 'border-red-300' : 'border-gray-300'
                  } focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                  placeholder="acme-corp"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                This will be used to identify your organization (lowercase, numbers, and hyphens only)
              </p>
              {validationErrors.subdomain && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.subdomain}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 2: WhatsApp Business Setup */}
        {currentStep === 2 && (
          <WhatsAppSetupWizard
            onComplete={(credentials) => {
              setFormData(prev => ({
                ...prev,
                whatsappPhoneNumberId: credentials.phoneNumberId,
                whatsappBusinessAccountId: credentials.businessAccountId,
                whatsappAccessToken: credentials.accessToken,
                whatsappWebhookVerifyToken: credentials.webhookVerifyToken,
                whatsappSkipped: false,
              }));
              setCurrentStep(3);
            }}
            onSkip={() => {
              setFormData(prev => ({
                ...prev,
                whatsappSkipped: true,
              }));
              setCurrentStep(3);
            }}
          />
        )}

        {/* Step 3: Profile Completion */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h2>
              <p className="text-gray-600">Tell us a bit about yourself.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={userEmail}
                disabled
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                className={`appearance-none block w-full px-3 py-2 border ${
                  validationErrors.fullName ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
                placeholder="John Doe"
              />
              {validationErrors.fullName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.fullName}</p>
              )}
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Your Role *
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className={`appearance-none block w-full px-3 py-2 border ${
                  validationErrors.role ? 'border-red-300' : 'border-gray-300'
                } rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm`}
              >
                <option value="owner">Owner - Full access and billing control</option>
                <option value="admin">Admin - Manage team and settings</option>
                <option value="agent">Agent - Handle conversations</option>
              </select>
              {validationErrors.role && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.role}</p>
              )}
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-6 rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-8 flex justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < STEPS.length ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-6 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
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
      </form>
    </div>
  )
}