'use client'

/**
 * Drip Campaign Builder Component
 * Lazy-loaded via @/lib/lazy-imports for bundle optimization
 */

import { useState, useCallback } from 'react'

interface CampaignStep {
  id: string
  type: 'email' | 'sms' | 'whatsapp' | 'delay' | 'condition'
  name: string
  delay?: number
  delayUnit?: 'minutes' | 'hours' | 'days'
  content?: string
  templateId?: string
}

interface DripCampaignBuilderProps {
  steps?: CampaignStep[]
  onStepsChange?: (steps: CampaignStep[]) => void
  onSave?: (steps: CampaignStep[]) => void
  readOnly?: boolean
  className?: string
}

export function DripCampaignBuilder({
  steps = [],
  onStepsChange,
  onSave,
  readOnly = false,
  className = '',
}: DripCampaignBuilderProps) {
  const [localSteps, setLocalSteps] = useState<CampaignStep[]>(steps)
  const [selectedStep, setSelectedStep] = useState<string | null>(null)

  const getStepIcon = (type: CampaignStep['type']) => {
    switch (type) {
      case 'email':
        return '📧'
      case 'sms':
        return '💬'
      case 'whatsapp':
        return '📱'
      case 'delay':
        return '⏰'
      case 'condition':
        return '🔀'
      default:
        return '📋'
    }
  }

  const getStepColor = (type: CampaignStep['type']) => {
    switch (type) {
      case 'email':
        return 'border-blue-500 bg-blue-50'
      case 'sms':
        return 'border-green-500 bg-green-50'
      case 'whatsapp':
        return 'border-emerald-500 bg-emerald-50'
      case 'delay':
        return 'border-orange-500 bg-orange-50'
      case 'condition':
        return 'border-purple-500 bg-purple-50'
      default:
        return 'border-gray-500 bg-gray-50'
    }
  }

  const addStep = useCallback((type: CampaignStep['type']) => {
    if (readOnly) return

    const newStep: CampaignStep = {
      id: `step-${Date.now()}`,
      type,
      name: `Nieuwe ${type} stap`,
      delay: type === 'delay' ? 1 : undefined,
      delayUnit: type === 'delay' ? 'days' : undefined,
    }

    const updatedSteps = [...localSteps, newStep]
    setLocalSteps(updatedSteps)
    onStepsChange?.(updatedSteps)
  }, [localSteps, onStepsChange, readOnly])

  const removeStep = useCallback((stepId: string) => {
    if (readOnly) return

    const updatedSteps = localSteps.filter((s) => s.id !== stepId)
    setLocalSteps(updatedSteps)
    onStepsChange?.(updatedSteps)
    if (selectedStep === stepId) {
      setSelectedStep(null)
    }
  }, [localSteps, onStepsChange, selectedStep, readOnly])

  const handleSave = useCallback(() => {
    onSave?.(localSteps)
  }, [localSteps, onSave])

  return (
    <div className={`rounded-lg border bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">Campagne Builder</h3>
        {!readOnly && (
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Opslaan
          </button>
        )}
      </div>

      {/* Step Types Palette */}
      {!readOnly && (
        <div className="border-b p-4 bg-gray-50">
          <p className="text-sm text-gray-600 mb-3">Klik om stap toe te voegen:</p>
          <div className="flex flex-wrap gap-2">
            {(['whatsapp', 'email', 'sms', 'delay', 'condition'] as const).map((type) => (
              <button
                key={type}
                onClick={() => addStep(type)}
                className={`px-3 py-2 rounded-lg border-2 text-sm font-medium capitalize transition-all hover:shadow ${getStepColor(type)}`}
              >
                {getStepIcon(type)} {type}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Campaign Steps */}
      <div className="p-4">
        {localSteps.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">📭</div>
            <p>Geen stappen in deze campagne</p>
            {!readOnly && (
              <p className="text-sm mt-2">Klik hierboven om stappen toe te voegen</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {localSteps.map((step, index) => (
              <div key={step.id} className="relative">
                {/* Connection Line */}
                {index > 0 && (
                  <div className="absolute left-6 -top-4 w-0.5 h-4 bg-gray-300" />
                )}

                {/* Step Card */}
                <div
                  className={`relative p-4 rounded-lg border-2 transition-all cursor-pointer
                    ${getStepColor(step.type)}
                    ${selectedStep === step.id ? 'ring-2 ring-blue-500' : ''}
                  `}
                  onClick={() => setSelectedStep(step.id === selectedStep ? null : step.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getStepIcon(step.type)}</span>
                      <div>
                        <p className="font-medium">{step.name}</p>
                        <p className="text-sm text-gray-600 capitalize">{step.type}</p>
                        {step.delay && (
                          <p className="text-sm text-orange-600 mt-1">
                            Wacht {step.delay} {step.delayUnit}
                          </p>
                        )}
                      </div>
                    </div>

                    {!readOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          removeStep(step.id)
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Step Number Badge */}
                  <div className="absolute -left-3 top-4 w-6 h-6 rounded-full bg-gray-700 text-white text-xs flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t p-4 bg-gray-50 flex justify-between text-sm text-gray-600">
        <span>{localSteps.length} stappen</span>
        <span>
          {localSteps.filter((s) => s.type === 'whatsapp').length} WhatsApp,{' '}
          {localSteps.filter((s) => s.type === 'email').length} Email,{' '}
          {localSteps.filter((s) => s.type === 'sms').length} SMS
        </span>
      </div>
    </div>
  )
}

export default DripCampaignBuilder
