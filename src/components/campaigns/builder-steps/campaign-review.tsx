'use client'

/**
 * Step 4: Review & Confirm
 */

import { CheckCircleIcon, ClockIcon, BoltIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

interface CampaignReviewProps {
  data: {
    name: string
    description: string
    triggerType: string
    triggerConfig: {
      tags?: string[]
    }
    stopOnReply: boolean
    respectBusinessHours: boolean
    maxContactsPerDay: number
    steps: Array<{
      stepOrder: number
      name: string
      delayType: string
      delayValue: number
      messageType: string
      messageContent?: string
    }>
  }
}

export function CampaignReview({ data }: CampaignReviewProps) {
  const getTriggerLabel = () => {
    const labels: Record<string, string> = {
      manual: 'Handmatig',
      contact_created: 'Nieuw Contact',
      tag_added: 'Tag Toegevoegd',
      custom_event: 'Custom Event',
      api: 'API Trigger',
    }
    return labels[data.triggerType] || data.triggerType
  }

  const getDelayLabel = (step: any) => {
    if (step.delayValue === 0) return 'Direct'
    const unit =
      step.delayValue === 1 ? step.delayType.slice(0, -1) : step.delayType
    return `${step.delayValue} ${unit} later`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <CheckCircleIcon className="h-6 w-6 text-green-600" />
          Controleer & Activeer
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Bekijk je campagne configuratie voordat je deze activeert
        </p>
      </div>

      {/* Basic Info Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Basis Informatie</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">Naam</p>
            <p className="mt-1 text-sm text-gray-900">{data.name}</p>
          </div>
          {data.description && (
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase font-medium">Omschrijving</p>
              <p className="mt-1 text-sm text-gray-900">{data.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Trigger Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <BoltIcon className="h-5 w-5 text-blue-600" />
          Trigger Instellingen
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">Trigger Type</p>
            <p className="mt-1 text-sm text-gray-900">{getTriggerLabel()}</p>
          </div>

          {data.triggerType === 'tag_added' && data.triggerConfig.tags && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-medium">Tags</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.triggerConfig.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 pt-3 border-t">
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded ${
                  data.stopOnReply ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                {data.stopOnReply && <CheckCircleIcon className="text-white" />}
              </div>
              <span className="text-sm text-gray-700">Stop bij reactie</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-4 h-4 rounded ${
                  data.respectBusinessHours ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                {data.respectBusinessHours && <CheckCircleIcon className="text-white" />}
              </div>
              <span className="text-sm text-gray-700">Respecteer kantooruren</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase font-medium">
              Max. contacten per dag
            </p>
            <p className="mt-1 text-sm text-gray-900">{data.maxContactsPerDay}</p>
          </div>
        </div>
      </div>

      {/* Steps Timeline */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <EnvelopeIcon className="h-5 w-5 text-blue-600" />
          Berichten Reeks ({data.steps.length} stappen)
        </h3>

        <div className="space-y-3">
          {data.steps.map((step, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {step.stepOrder}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-gray-900">{step.name}</h4>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <ClockIcon className="h-3.5 w-3.5" />
                    {getDelayLabel(step)}
                  </span>
                </div>
                {step.messageContent && (
                  <p className="text-sm text-gray-600 line-clamp-2">{step.messageContent}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {step.messageType === 'text' && 'Tekstbericht'}
                  {step.messageType === 'template' && 'WhatsApp Template'}
                  {step.messageType === 'media' && 'Media bericht'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-green-50 border border-green-200 p-4">
        <div className="flex gap-3">
          <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-green-900">Klaar om te activeren!</p>
            <p className="mt-1 text-green-800">
              Je campagne is compleet. Klik op "Opslaan & Activeren" om de campagne live te zetten,
              of kies "Opslaan als Draft" om later verder te gaan.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
