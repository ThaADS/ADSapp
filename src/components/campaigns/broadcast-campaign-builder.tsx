'use client'

/**
 * Broadcast Campaign Builder
 * Multi-step wizard for creating broadcast campaigns
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { BroadcastBasicInfo } from './builder-steps/broadcast-basic-info'
import { BroadcastAudienceTargeting } from './builder-steps/broadcast-audience-targeting'
import { BroadcastMessageComposition } from './builder-steps/broadcast-message-composition'
import { BroadcastScheduling } from './builder-steps/broadcast-scheduling'
import { BroadcastReview } from './builder-steps/broadcast-review'
import { useTranslations } from '@/components/providers/translation-provider'

export interface BroadcastCampaignData {
  name: string
  description: string
  type: 'one_time' | 'scheduled' | 'recurring'

  // Audience
  targetingType: 'all' | 'tags' | 'custom' | 'csv'
  targetTags: string[]
  customFilters: Array<{
    field: string
    operator: string
    value: string
  }>
  csvContacts: Array<{
    phoneNumber: string
    name?: string
    variables?: Record<string, string>
  }>

  // Message
  messageType: 'text' | 'template' | 'media'
  messageContent: string
  templateId?: string
  templateVariables?: Record<string, string>
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'

  // Scheduling
  schedulingType: 'immediate' | 'scheduled' | 'recurring'
  scheduledAt?: Date
  recurringConfig?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    dayOfWeek?: number
    dayOfMonth?: number
    time: string
  }

  // Settings
  settings: {
    sendRateLimit: number
    respectOptOuts: boolean
    trackClicks: boolean
    trackOpens: boolean
  }
}

export function BroadcastCampaignBuilder() {
  const router = useRouter()
  const t = useTranslations('campaigns')
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const STEPS = [
    { id: 1, name: t('builder.steps.basicInfo'), icon: '📋' },
    { id: 2, name: t('builder.steps.audience'), icon: '👥' },
    { id: 3, name: t('builder.steps.message'), icon: '💬' },
    { id: 4, name: t('builder.steps.scheduling'), icon: '📅' },
    { id: 5, name: t('builder.steps.review'), icon: '✅' },
  ]

  const [campaignData, setCampaignData] = useState<BroadcastCampaignData>({
    name: '',
    description: '',
    type: 'one_time',
    targetingType: 'all',
    targetTags: [],
    customFilters: [],
    csvContacts: [],
    messageType: 'text',
    messageContent: '',
    schedulingType: 'immediate',
    settings: {
      sendRateLimit: 100,
      respectOptOuts: true,
      trackClicks: true,
      trackOpens: true,
    },
  })

  const updateCampaignData = (updates: Partial<BroadcastCampaignData>) => {
    setCampaignData(prev => ({ ...prev, ...updates }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return campaignData.name.trim().length > 0
      case 2:
        if (campaignData.targetingType === 'tags') {
          return campaignData.targetTags.length > 0
        }
        if (campaignData.targetingType === 'custom') {
          return campaignData.customFilters.length > 0
        }
        if (campaignData.targetingType === 'csv') {
          return campaignData.csvContacts.length > 0
        }
        return true // 'all' is always valid
      case 3:
        if (campaignData.messageType === 'template') {
          return !!campaignData.templateId
        }
        if (campaignData.messageType === 'media') {
          return !!campaignData.mediaUrl && !!campaignData.messageContent
        }
        return campaignData.messageContent.trim().length > 0
      case 4:
        if (campaignData.schedulingType === 'scheduled') {
          return !!campaignData.scheduledAt
        }
        if (campaignData.schedulingType === 'recurring') {
          return !!campaignData.recurringConfig?.frequency && !!campaignData.recurringConfig?.time
        }
        return true
      case 5:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (canProceed() && currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/bulk/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campaignData,
          status: 'draft',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/dashboard/broadcast')
      } else {
        alert(`${t('builder.errors.generic')}: ${data.error || t('builder.errors.saveFailed')}`)
      }
    } catch (error) {
      console.error('Error saving campaign:', error)
      alert(t('builder.errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  const handleSchedule = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/bulk/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campaignData,
          status: campaignData.schedulingType === 'immediate' ? 'running' : 'scheduled',
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // If immediate, also trigger send
        if (campaignData.schedulingType === 'immediate') {
          await fetch(`/api/bulk/campaigns/${data.id}/send`, {
            method: 'POST',
          })
        }

        router.push('/dashboard/broadcast')
      } else {
        alert(`${t('builder.errors.generic')}: ${data.error || t('builder.errors.scheduleFailed')}`)
      }
    } catch (error) {
      console.error('Error scheduling campaign:', error)
      alert(t('builder.errors.generic'))
    } finally {
      setSaving(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <BroadcastBasicInfo data={campaignData} onChange={updateCampaignData} />
      case 2:
        return <BroadcastAudienceTargeting data={campaignData} onChange={updateCampaignData} />
      case 3:
        return <BroadcastMessageComposition data={campaignData} onChange={updateCampaignData} />
      case 4:
        return <BroadcastScheduling data={campaignData} onChange={updateCampaignData} />
      case 5:
        return <BroadcastReview data={campaignData} onChange={updateCampaignData} />
      default:
        return null
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Progress Steps */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${currentStep > step.id
                    ? 'bg-green-600 border-green-600 text-white'
                    : currentStep === step.id
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-500'
                    }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    <span className="text-lg">{step.icon}</span>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${currentStep === step.id ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                    {t('common.step', { step: step.id })}
                  </p>
                  <p className="text-xs text-gray-500">{step.name}</p>
                </div>
              </div>

              {index < STEPS.length - 1 && (
                <div className={`w-16 h-0.5 mx-4 ${currentStep > step.id ? 'bg-green-600' : 'bg-gray-300'
                  }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="p-6 min-h-[500px]">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="border-t px-6 py-4 flex items-center justify-between bg-gray-50">
        <div>
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrevious}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              {t('builder.buttons.previous')}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
            {saving ? t('builder.buttons.saving') : t('builder.buttons.saveDraft')}
          </Button>

          {currentStep < STEPS.length ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2"
            >
              {t('builder.buttons.next')}
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSchedule}
              disabled={saving || !canProceed()}
            >
              {saving
                ? t('builder.buttons.scheduling')
                : campaignData.schedulingType === 'immediate'
                  ? t('builder.buttons.sendNow')
                  : t('builder.buttons.schedule')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
