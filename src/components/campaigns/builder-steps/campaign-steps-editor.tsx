'use client'

/**
 * Step 3: Campaign Steps Editor (Timeline)
 */

import { useState } from 'react'
import { PlusIcon, TrashIcon, ClockIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

interface Step {
  stepOrder: number
  name: string
  delayType: 'minutes' | 'hours' | 'days' | 'weeks'
  delayValue: number
  messageType: 'text' | 'template' | 'media'
  templateId?: string
  messageContent?: string
  mediaUrl?: string
}

interface CampaignStepsEditorProps {
  data: {
    steps: Step[]
  }
  onChange: (updates: any) => void
}

export function CampaignStepsEditor({ data, onChange }: CampaignStepsEditorProps) {
  const [editingStep, setEditingStep] = useState<number | null>(null)

  const addStep = () => {
    const newStep: Step = {
      stepOrder: data.steps.length + 1,
      name: `Stap ${data.steps.length + 1}`,
      delayType: 'days',
      delayValue: data.steps.length === 0 ? 0 : 1,
      messageType: 'text',
      messageContent: '',
    }
    onChange({ steps: [...data.steps, newStep] })
    setEditingStep(data.steps.length)
  }

  const updateStep = (index: number, updates: Partial<Step>) => {
    const newSteps = [...data.steps]
    newSteps[index] = { ...newSteps[index], ...updates }
    onChange({ steps: newSteps })
  }

  const removeStep = (index: number) => {
    const newSteps = data.steps.filter((_, i) => i !== index)
    // Reorder remaining steps
    newSteps.forEach((step, i) => {
      step.stepOrder = i + 1
    })
    onChange({ steps: newSteps })
    setEditingStep(null)
  }

  const getDelayLabel = (step: Step) => {
    if (step.delayValue === 0) return 'Direct'
    const unit = step.delayValue === 1 ?
      step.delayType.slice(0, -1) : // Remove 's' for singular
      step.delayType
    return `${step.delayValue} ${unit} later`
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Berichten Reeks</h2>
        <p className="mt-1 text-sm text-gray-500">
          Bepaal welke berichten wanneer verstuurd worden
        </p>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {data.steps.map((step, index) => (
          <div key={index} className="relative">
            {/* Timeline Line */}
            {index < data.steps.length - 1 && (
              <div className="absolute left-5 top-16 bottom-0 w-0.5 bg-blue-200" />
            )}

            {/* Step Card */}
            <div
              className={`relative bg-white border-2 rounded-lg p-4 transition-all ${
                editingStep === index ? 'border-blue-500 shadow-lg' : 'border-gray-200'
              }`}
            >
              {/* Step Header */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                </div>

                <div className="flex-1">
                  {editingStep === index ? (
                    // Edit Mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Stap Naam
                          </label>
                          <input
                            type="text"
                            value={step.name}
                            onChange={e => updateStep(index, { name: e.target.value })}
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Wachttijd
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={step.delayValue}
                              onChange={e =>
                                updateStep(index, {
                                  delayValue: parseInt(e.target.value) || 0,
                                })
                              }
                              min={0}
                              className="w-20 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                            <select
                              value={step.delayType}
                              onChange={e =>
                                updateStep(index, {
                                  delayType: e.target.value as any,
                                })
                              }
                              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                            >
                              <option value="minutes">Minuten</option>
                              <option value="hours">Uren</option>
                              <option value="days">Dagen</option>
                              <option value="weeks">Weken</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Bericht Type
                        </label>
                        <div className="flex gap-2 mb-3">
                          {['text', 'template', 'media'].map(type => (
                            <button
                              key={type}
                              onClick={() => updateStep(index, { messageType: type as any })}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                step.messageType === type
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {type === 'text' && 'Tekst'}
                              {type === 'template' && 'Template'}
                              {type === 'media' && 'Media'}
                            </button>
                          ))}
                        </div>

                        {step.messageType === 'text' && (
                          <textarea
                            value={step.messageContent || ''}
                            onChange={e => updateStep(index, { messageContent: e.target.value })}
                            placeholder="Typ je bericht hier..."
                            rows={4}
                            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        )}

                        {step.messageType === 'template' && (
                          <div className="text-sm text-gray-500 italic p-3 bg-gray-50 rounded border border-gray-200">
                            Template selector komt hier (selecteer uit goedgekeurde WhatsApp templates)
                          </div>
                        )}

                        {step.messageType === 'media' && (
                          <div className="space-y-2">
                            <input
                              type="url"
                              value={step.mediaUrl || ''}
                              onChange={e => updateStep(index, { mediaUrl: e.target.value })}
                              placeholder="https://example.com/image.jpg"
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                            <textarea
                              value={step.messageContent || ''}
                              onChange={e => updateStep(index, { messageContent: e.target.value })}
                              placeholder="Optioneel bijschrift..."
                              rows={2}
                              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingStep(null)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                        >
                          Opslaan
                        </button>
                        <button
                          onClick={() => setEditingStep(null)}
                          className="px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium"
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">{step.name}</h3>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingStep(index)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Bewerken
                          </button>
                          {data.steps.length > 1 && (
                            <button
                              onClick={() => {
                                if (confirm('Weet je zeker dat je deze stap wilt verwijderen?')) {
                                  removeStep(index)
                                }
                              }}
                              className="text-sm text-red-600 hover:text-red-700"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {getDelayLabel(step)}
                        </span>
                        <span className="flex items-center gap-1">
                          <EnvelopeIcon className="h-4 w-4" />
                          {step.messageType === 'text' && 'Tekstbericht'}
                          {step.messageType === 'template' && 'WhatsApp Template'}
                          {step.messageType === 'media' && 'Media bericht'}
                        </span>
                      </div>

                      {step.messageContent && (
                        <div className="text-sm text-gray-600 bg-gray-50 rounded p-3 border border-gray-200 line-clamp-3">
                          {step.messageContent}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add Step Button */}
        <button
          onClick={addStep}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-blue-600"
        >
          <PlusIcon className="h-5 w-5" />
          <span className="font-medium">Voeg Stap Toe</span>
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
        <p className="text-sm text-blue-900">
          <strong>Totaal {data.steps.length} stappen</strong> in deze campagne. Contacten doorlopen
          deze sequentie automatisch na enrollment.
        </p>
      </div>
    </div>
  )
}
