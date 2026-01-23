'use client'

/**
 * Broadcast Campaign Creator Component
 * Lazy-loaded via @/lib/lazy-imports for bundle optimization
 */

import { useState, useCallback } from 'react'

interface BroadcastSegment {
  id: string
  name: string
  contactCount: number
}

interface BroadcastCampaignCreatorProps {
  segments?: BroadcastSegment[]
  templates?: { id: string; name: string; content: string }[]
  onSend?: (campaign: {
    name: string
    segmentId: string
    templateId: string
    scheduledAt?: Date
  }) => void
  onCancel?: () => void
  className?: string
}

export function BroadcastCampaignCreator({
  segments = [],
  templates = [],
  onSend,
  onCancel,
  className = '',
}: BroadcastCampaignCreatorProps) {
  const [campaignName, setCampaignName] = useState('')
  const [selectedSegment, setSelectedSegment] = useState<string>('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [step, setStep] = useState<1 | 2 | 3>(1)

  const selectedSegmentData = segments.find((s) => s.id === selectedSegment)
  const selectedTemplateData = templates.find((t) => t.id === selectedTemplate)

  const canProceed = useCallback(() => {
    switch (step) {
      case 1:
        return campaignName.trim() && selectedSegment
      case 2:
        return selectedTemplate
      case 3:
        return scheduleType === 'now' || (scheduledDate && scheduledTime)
      default:
        return false
    }
  }, [step, campaignName, selectedSegment, selectedTemplate, scheduleType, scheduledDate, scheduledTime])

  const handleSend = useCallback(() => {
    const campaign = {
      name: campaignName,
      segmentId: selectedSegment,
      templateId: selectedTemplate,
      scheduledAt:
        scheduleType === 'later' && scheduledDate && scheduledTime
          ? new Date(`${scheduledDate}T${scheduledTime}`)
          : undefined,
    }
    onSend?.(campaign)
  }, [campaignName, selectedSegment, selectedTemplate, scheduleType, scheduledDate, scheduledTime, onSend])

  return (
    <div className={`rounded-lg border bg-white ${className}`}>
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="font-semibold">Nieuwe Broadcast Campagne</h3>
        <div className="flex items-center gap-4 mt-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step >= s ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'}
                `}
              >
                {step > s ? '✓' : s}
              </div>
              {s < 3 && <div className={`w-16 h-0.5 ml-2 ${step > s ? 'bg-emerald-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Step 1: Audience */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Campagne naam</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="Bijv. Nieuwjaarsaanbieding 2024"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Selecteer doelgroep</label>
              {segments.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                  Geen segmenten beschikbaar. Maak eerst een segment aan.
                </div>
              ) : (
                <div className="space-y-2">
                  {segments.map((segment) => (
                    <div
                      key={segment.id}
                      onClick={() => setSelectedSegment(segment.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all
                        ${selectedSegment === segment.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{segment.name}</span>
                        <span className="text-sm text-gray-500">
                          {segment.contactCount.toLocaleString('nl-NL')} contacten
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Template */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Selecteer template</label>
              {templates.length === 0 ? (
                <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                  Geen templates beschikbaar. Maak eerst een template aan.
                </div>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-all
                        ${selectedTemplate === template.id
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'hover:border-gray-300'
                        }
                      `}
                    >
                      <p className="font-medium">{template.name}</p>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedTemplateData && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <div className="p-3 bg-white rounded border text-sm whitespace-pre-wrap">
                  {selectedTemplateData.content}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Wanneer versturen?</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setScheduleType('now')}
                  className={`flex-1 p-4 border rounded-lg transition-all
                    ${scheduleType === 'now'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'hover:border-gray-300'
                    }
                  `}
                >
                  <div className="text-2xl mb-2">🚀</div>
                  <p className="font-medium">Direct versturen</p>
                  <p className="text-sm text-gray-500">Start meteen met verzenden</p>
                </button>
                <button
                  onClick={() => setScheduleType('later')}
                  className={`flex-1 p-4 border rounded-lg transition-all
                    ${scheduleType === 'later'
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'hover:border-gray-300'
                    }
                  `}
                >
                  <div className="text-2xl mb-2">📅</div>
                  <p className="font-medium">Inplannen</p>
                  <p className="text-sm text-gray-500">Kies datum en tijd</p>
                </button>
              </div>
            </div>

            {scheduleType === 'later' && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Datum</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">Tijd</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="font-medium text-blue-800 mb-2">Samenvatting</p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>📋 Campagne: {campaignName}</li>
                <li>👥 Doelgroep: {selectedSegmentData?.name} ({selectedSegmentData?.contactCount} contacten)</li>
                <li>📝 Template: {selectedTemplateData?.name}</li>
                <li>
                  ⏰ {scheduleType === 'now'
                    ? 'Direct versturen'
                    : `Ingepland: ${scheduledDate} om ${scheduledTime}`
                  }
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-between border-t p-4">
        <button
          onClick={() => (step === 1 ? onCancel?.() : setStep((step - 1) as 1 | 2))}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          {step === 1 ? 'Annuleren' : 'Terug'}
        </button>
        <button
          onClick={() => (step === 3 ? handleSend() : setStep((step + 1) as 2 | 3))}
          disabled={!canProceed()}
          className={`px-6 py-2 rounded-lg font-medium transition-colors
            ${canProceed()
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {step === 3 ? (scheduleType === 'now' ? 'Versturen' : 'Inplannen') : 'Volgende'}
        </button>
      </div>
    </div>
  )
}

export default BroadcastCampaignCreator
