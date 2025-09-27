'use client'

import { useState, useEffect } from 'react'
import { Check, X, AlertCircle, Loader2, Phone, MessageSquare, Settings, Zap, Shield } from 'lucide-react'
import { WhatsAppBusinessAPI, WhatsAppSetupStep, BusinessProfile } from '@/lib/whatsapp/business-api'

interface SetupWizardProps {
  organizationId: string
  onComplete: () => void
  onCancel: () => void
}

interface ConfigForm {
  accessToken: string
  appId: string
  appSecret: string
  businessAccountId: string
  phoneNumberId: string
  phoneNumber: string
  webhookVerifyToken: string
}

interface StepProps {
  step: WhatsAppSetupStep
  isActive: boolean
  isCompleted: boolean
}

function SetupStep({ step, isActive, isCompleted }: StepProps) {
  const getStatusIcon = () => {
    if (isCompleted || step.status === 'completed') {
      return <Check className="w-5 h-5 text-green-600" />
    } else if (step.status === 'failed') {
      return <X className="w-5 h-5 text-red-600" />
    } else if (step.status === 'in_progress') {
      return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
    } else {
      return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
    }
  }

  const getStatusColor = () => {
    if (isCompleted || step.status === 'completed') {
      return 'text-green-600'
    } else if (step.status === 'failed') {
      return 'text-red-600'
    } else if (step.status === 'in_progress') {
      return 'text-blue-600'
    } else {
      return 'text-gray-500'
    }
  }

  return (
    <div className={`flex items-start space-x-3 p-4 rounded-lg ${
      isActive ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
    }`}>
      <div className="flex-shrink-0 mt-0.5">
        {getStatusIcon()}
      </div>
      <div className="flex-1">
        <h3 className={`text-sm font-medium ${getStatusColor()}`}>
          {step.title}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {step.description}
        </p>
        {step.error && (
          <div className="mt-2 flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{step.error}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function WhatsAppSetupWizard({
  organizationId,
  onComplete,
  onCancel
}: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [config, setConfig] = useState<ConfigForm>({
    accessToken: '',
    appId: '',
    appSecret: '',
    businessAccountId: '',
    phoneNumberId: '',
    phoneNumber: '',
    webhookVerifyToken: ''
  })
  const [setupSteps, setSetupSteps] = useState<WhatsAppSetupStep[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const steps = [
    {
      title: 'Configuration',
      description: 'Enter your WhatsApp Business API credentials',
      icon: Settings
    },
    {
      title: 'Verification',
      description: 'Verify and test your configuration',
      icon: Shield
    },
    {
      title: 'Business Profile',
      description: 'Set up your business profile',
      icon: MessageSquare
    },
    {
      title: 'Complete',
      description: 'Your WhatsApp integration is ready',
      icon: Zap
    }
  ]

  const validateConfig = () => {
    const errors: string[] = []

    if (!config.accessToken) errors.push('Access Token is required')
    if (!config.appId) errors.push('App ID is required')
    if (!config.appSecret) errors.push('App Secret is required')
    if (!config.businessAccountId) errors.push('Business Account ID is required')
    if (!config.phoneNumberId) errors.push('Phone Number ID is required')
    if (!config.webhookVerifyToken) errors.push('Webhook Verify Token is required')

    return errors
  }

  const runSetup = async () => {
    const errors = validateConfig()
    if (errors.length > 0) {
      alert(`Please fix the following errors:\n${errors.join('\n')}`)
      return
    }

    setIsRunning(true)
    try {
      const api = new WhatsAppBusinessAPI(config)
      const steps = await api.runSetupWizard(organizationId)
      setSetupSteps(steps)

      // Check if setup completed successfully
      const allCompleted = steps.every(step => step.status === 'completed')
      if (allCompleted) {
        // Load business profile
        const profile = await api.getBusinessProfile()
        setBusinessProfile(profile)
        setCurrentStep(2)
      }
    } catch (error) {
      console.error('Setup failed:', error)
      alert(`Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunning(false)
    }
  }

  const updateBusinessProfile = async (updates: Partial<BusinessProfile>) => {
    if (!businessProfile) return

    try {
      const api = new WhatsAppBusinessAPI(config)
      await api.updateBusinessProfile(updates)
      setBusinessProfile({ ...businessProfile, ...updates })
    } catch (error) {
      console.error('Failed to update business profile:', error)
      alert('Failed to update business profile')
    }
  }

  const completeSetup = () => {
    setCurrentStep(3)
    setTimeout(() => {
      onComplete()
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="bg-green-600 text-white p-6">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">WhatsApp Business Setup</h1>
              <p className="text-green-100">Configure your WhatsApp Business API integration</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white border-b border-gray-200">
          <div className="flex">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex-1 p-4 text-center ${
                  index <= currentStep ? 'bg-blue-50 text-blue-600' : 'text-gray-400'
                }`}
              >
                <step.icon className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs">{step.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  WhatsApp Business API Configuration
                </h2>
                <p className="text-gray-600 mb-6">
                  Enter your WhatsApp Business API credentials. You can find these in your Meta for Developers account.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">Basic Configuration</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Access Token *
                    </label>
                    <input
                      type="password"
                      value={config.accessToken}
                      onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your access token"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Account ID *
                    </label>
                    <input
                      type="text"
                      value={config.businessAccountId}
                      onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your business account ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number ID *
                    </label>
                    <input
                      type="text"
                      value={config.phoneNumberId}
                      onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your phone number ID"
                    />
                  </div>
                </div>

                {/* Advanced Configuration */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Advanced Configuration</h3>
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {showAdvanced ? 'Hide' : 'Show'} Advanced
                    </button>
                  </div>

                  {showAdvanced && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          App ID *
                        </label>
                        <input
                          type="text"
                          value={config.appId}
                          onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your app ID"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          App Secret *
                        </label>
                        <input
                          type="password"
                          value={config.appSecret}
                          onChange={(e) => setConfig({ ...config, appSecret: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter your app secret"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone Number
                        </label>
                        <input
                          type="text"
                          value={config.phoneNumber}
                          onChange={(e) => setConfig({ ...config, phoneNumber: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="e.g., +1234567890"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Webhook Verify Token *
                        </label>
                        <input
                          type="text"
                          value={config.webhookVerifyToken}
                          onChange={(e) => setConfig({ ...config, webhookVerifyToken: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Enter webhook verify token"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setCurrentStep(1)
                    runSetup()
                  }}
                  disabled={isRunning}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isRunning ? 'Verifying...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Verification & Testing
                </h2>
                <p className="text-gray-600 mb-6">
                  We're verifying your configuration and testing the connection to WhatsApp Business API.
                </p>
              </div>

              <div className="space-y-3">
                {setupSteps.map((step, index) => (
                  <SetupStep
                    key={step.id}
                    step={step}
                    isActive={false}
                    isCompleted={step.status === 'completed'}
                  />
                ))}
              </div>

              {setupSteps.length > 0 && setupSteps.every(s => s.status === 'completed') && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-green-800 font-medium">
                      Verification completed successfully!
                    </span>
                  </div>
                  <p className="text-green-700 text-sm mt-1">
                    Your WhatsApp Business API is properly configured and ready to use.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setCurrentStep(0)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!setupSteps.every(s => s.status === 'completed')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Business Profile Setup
                </h2>
                <p className="text-gray-600 mb-6">
                  Configure your business profile information that customers will see.
                </p>
              </div>

              {businessProfile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name
                      </label>
                      <input
                        type="text"
                        value={businessProfile.name || ''}
                        onChange={(e) => updateBusinessProfile({ name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Your business name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={businessProfile.category || ''}
                        onChange={(e) => updateBusinessProfile({ category: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select category</option>
                        <option value="Business">Business</option>
                        <option value="Retail">Retail</option>
                        <option value="Restaurant">Restaurant</option>
                        <option value="Health">Health</option>
                        <option value="Education">Education</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={businessProfile.description || ''}
                        onChange={(e) => updateBusinessProfile({ description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe your business"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={businessProfile.email || ''}
                        onChange={(e) => updateBusinessProfile({ email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="business@company.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <input
                        type="url"
                        value={businessProfile.websites?.[0] || ''}
                        onChange={(e) => updateBusinessProfile({ websites: [e.target.value] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={completeSetup}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Complete Setup
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Setup Complete!
                </h2>
                <p className="text-gray-600 mb-6">
                  Your WhatsApp Business API integration is now ready. You can start receiving and sending messages.
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">What's Next?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Start receiving WhatsApp messages in your inbox</li>
                  <li>• Create message templates for faster responses</li>
                  <li>• Set up automation rules for common inquiries</li>
                  <li>• Invite team members to help manage conversations</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}