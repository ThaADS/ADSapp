'use client'

/**
 * Drip Campaign Builder
 * Multi-step wizard for creating and editing drip campaigns
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { CampaignBasicInfo } from './builder-steps/campaign-basic-info'
import { CampaignTriggerSetup } from './builder-steps/campaign-trigger-setup'
import { CampaignStepsEditor } from './builder-steps/campaign-steps-editor'
import { CampaignReview } from './builder-steps/campaign-review'
import { useTranslations } from '@/components/providers/translation-provider'

interface CampaignData {
  // Basic Info
  name: string
  description: string

  // Trigger
  triggerType: 'manual' | 'contact_created' | 'tag_added' | 'custom_event' | 'api'
  triggerConfig: {
    tags?: string[]
    events?: string[]
  }

  // Settings
  stopOnReply: boolean
  respectBusinessHours: boolean
  maxContactsPerDay: number

  // Steps
  steps: Array<{
    stepOrder: number
    name: string
    delayType: 'minutes' | 'hours' | 'days' | 'weeks'
    delayValue: number
    messageType: 'text' | 'template' | 'media'
    templateId?: string
    messageContent?: string
    mediaUrl?: string
  }>
}

export function DripCampaignBuilder() {
  const router = useRouter()
  const t = useTranslations('campaigns')
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const STEPS = [
    { id: 1, name: t('drip.builder.steps.basicInfo'), icon: '📋' },
    { id: 2, name: t('drip.builder.steps.trigger'), icon: '⚡' },
    { id: 3, name: t('drip.builder.steps.sequence'), icon: '📨' },
    { id: 4, name: t('drip.builder.steps.review'), icon: '✅' },
  ]

  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    description: '',
    triggerType: 'manual',
    triggerConfig: {},
    stopOnReply: true,
    respectBusinessHours: false,
    maxContactsPerDay: 1000,
    steps: [
      {
        stepOrder: 1,
        name: t('drip.builder.defaults.welcomeMessage'),
        delayType: 'minutes',
        delayValue: 0,
        messageType: 'text',
        messageContent: '',
      },
    ],
  })

  const updateCampaignData = (updates: Partial<CampaignData>) => {
    setCampaignData(prev => ({ ...prev, ...updates }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return campaignData.name.trim().length > 0
      case 2:
        if (campaignData.triggerType === 'tag_added') {
          return (campaignData.triggerConfig.tags?.length || 0) > 0
        }
        return true
      case 3:
        return (
          campaignData.steps.length > 0 &&
          campaignData.steps.every(step => step.messageContent || step.templateId)
        )
      case 4:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveDraft = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/drip-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignData.name,
          description: campaignData.description,
          triggerType: campaignData.triggerType,
          triggerConfig: campaignData.triggerConfig,
          settings: {
            stopOnReply: campaignData.stopOnReply,
            respectBusinessHours: campaignData.respectBusinessHours,
            maxContactsPerDay: campaignData.maxContactsPerDay,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('builder.errors.saveFailed'))
      }

      // Save steps
      for (const step of campaignData.steps) {
        await fetch(`/api/drip-campaigns/${data.id}/steps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(step),
        })
      }

      router.push('/dashboard/drip-campaigns')
    } catch (error) {
      console.error('Error saving campaign:', error)
      alert(error instanceof Error ? error.message : t('builder.errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndActivate = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/drip-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignData.name,
          description: campaignData.description,
          triggerType: campaignData.triggerType,
          triggerConfig: campaignData.triggerConfig,
          settings: {
            stopOnReply: campaignData.stopOnReply,
            respectBusinessHours: campaignData.respectBusinessHours,
            maxContactsPerDay: campaignData.maxContactsPerDay,
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('builder.errors.saveFailed'))
      }

      // Save steps
      for (const step of campaignData.steps) {
        await fetch(`/api/drip-campaigns/${data.id}/steps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(step),
        })
      }

      // Activate
      await fetch(`/api/drip-campaigns/${data.id}/activate`, {
        method: 'POST',
      })

      router.push('/dashboard/drip-campaigns')
    } catch (error) {
      console.error('Error saving campaign:', error)
      alert(error instanceof Error ? error.message : t('builder.errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <SparklesIcon className="h-6 w-6 text-blue-600" />
                  {t('drip.builder.title')}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {t('drip.builder.description', { steps: STEPS.length })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-4">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-between">
              {STEPS.map((step, index) => (
                <li key={step.id} className="relative flex-1">
                  <div className="flex items-center">
                    {index !== 0 && (
                      <div
                        className={`absolute left-0 right-0 top-4 h-0.5 -ml-4 ${currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        style={{ width: 'calc(100% - 2rem)', marginLeft: '-50%' }}
                      />
                    )}
                    <div
                      className={`relative flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${currentStep > step.id
                        ? 'bg-blue-600 border-blue-600'
                        : currentStep === step.id
                          ? 'bg-white border-blue-600'
                          : 'bg-white border-gray-300'
                        }`}
                    >
                      {currentStep > step.id ? (
                        <CheckCircleIcon className="h-6 w-6 text-white" />
                      ) : (
                        <span
                          className={`text-lg ${currentStep === step.id ? 'text-blue-600' : 'text-gray-400'
                            }`}
                        >
                          {step.icon}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={`text-xs font-medium ${currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                        }`}
                    >
                      {step.name}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </div>

      {/* Step Content */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {currentStep === 1 && (
            <CampaignBasicInfo data={campaignData} onChange={updateCampaignData} />
          )}
          {currentStep === 2 && (
            <CampaignTriggerSetup data={campaignData} onChange={updateCampaignData} />
          )}
          {currentStep === 3 && (
            <CampaignStepsEditor data={campaignData} onChange={updateCampaignData} />
          )}
          {currentStep === 4 && <CampaignReview data={campaignData} />}

          {/* Navigation */}
          <div className="mt-8 pt-6 border-t flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              {t('builder.buttons.previous')}
            </Button>

            <div className="flex items-center gap-3">
              {currentStep === STEPS.length ? (
                <>
                  <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
                    {saving ? t('builder.buttons.saving') : t('drip.builder.buttons.saveDraft')}
                  </Button>
                  <Button onClick={handleSaveAndActivate} disabled={saving || !canProceed()}>
                    {saving ? t('drip.builder.buttons.activating') : t('drip.builder.buttons.activate')}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex items-center gap-2"
                >
                  {t('builder.buttons.next')}
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
