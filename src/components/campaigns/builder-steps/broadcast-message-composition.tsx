'use client'

/**
 * Broadcast Message Composition Step
 * Step 3: Compose message (text, template, or media)
 */

import { useState, useEffect } from 'react'
import {
  ChatBubbleLeftIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
} from '@heroicons/react/24/outline'
import { BroadcastCampaignData } from '../broadcast-campaign-builder'

interface Props {
  data: BroadcastCampaignData
  onChange: (updates: Partial<BroadcastCampaignData>) => void
}

interface Template {
  id: string
  name: string
  content: string
  variables: string[]
  status: 'approved' | 'pending' | 'rejected'
}

export function BroadcastMessageComposition({ data, onChange }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)

  useEffect(() => {
    if (data.messageType === 'template') {
      fetchTemplates()
    }
  }, [data.messageType])

  const fetchTemplates = async () => {
    setLoadingTemplates(true)
    try {
      const response = await fetch('/api/templates')
      const result = await response.json()
      if (response.ok) {
        setTemplates(result.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoadingTemplates(false)
    }
  }

  const messageTypes = [
    {
      id: 'text' as const,
      name: 'Tekstbericht',
      description: 'Verstuur een eenvoudig tekstbericht',
      icon: ChatBubbleLeftIcon,
    },
    {
      id: 'template' as const,
      name: 'WhatsApp Template',
      description: 'Gebruik een goedgekeurd WhatsApp template',
      icon: DocumentTextIcon,
    },
    {
      id: 'media' as const,
      name: 'Media Bericht',
      description: 'Verstuur een afbeelding, video of document',
      icon: PhotoIcon,
    },
  ]

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Determine media type
    let mediaType: 'image' | 'video' | 'document' = 'document'
    if (file.type.startsWith('image/')) mediaType = 'image'
    else if (file.type.startsWith('video/')) mediaType = 'video'

    // Create preview for images
    if (mediaType === 'image') {
      const reader = new FileReader()
      reader.onload = e => {
        setMediaPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }

    // In production, upload to storage and get URL
    // For now, simulate with filename
    onChange({
      mediaUrl: file.name,
      mediaType,
    })
  }

  const getVariablesFromTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    return template?.variables || []
  }

  const updateTemplateVariable = (variable: string, value: string) => {
    onChange({
      templateVariables: {
        ...data.templateVariables,
        [variable]: value,
      },
    })
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Bericht Samenstellen</h2>
        <p className="text-sm text-gray-500">
          Kies het type bericht en stel de inhoud samen
        </p>
      </div>

      {/* Message Type Selection */}
      <div className="grid grid-cols-3 gap-4">
        {messageTypes.map(type => (
          <div
            key={type.id}
            onClick={() => onChange({ messageType: type.id })}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              data.messageType === type.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <type.icon
              className={`h-8 w-8 mx-auto mb-2 ${
                data.messageType === type.id ? 'text-blue-600' : 'text-gray-400'
              }`}
            />
            <h3 className="text-sm font-medium text-gray-900 text-center">{type.name}</h3>
            <p className="mt-1 text-xs text-gray-500 text-center">{type.description}</p>
          </div>
        ))}
      </div>

      {/* Text Message */}
      {data.messageType === 'text' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bericht Tekst <span className="text-red-500">*</span>
            </label>
            <textarea
              value={data.messageContent}
              onChange={e => onChange({ messageContent: e.target.value })}
              placeholder="Typ je bericht hier..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            />
            <div className="flex justify-between mt-1">
              <p className="text-xs text-gray-500">
                Gebruik personalisatie variabelen: {'{'}naam{'}'}, {'{'}email{'}'}, {'{'}custom{'}'}
              </p>
              <p className="text-xs text-gray-500">{data.messageContent.length} tekens</p>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-700 mb-2">Preview:</p>
            <div className="bg-white rounded-lg p-3 shadow-sm">
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {data.messageContent || 'Je bericht verschijnt hier...'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Template Message */}
      {data.messageType === 'template' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecteer Template <span className="text-red-500">*</span>
            </label>

            {loadingTemplates ? (
              <div className="text-center py-8 text-gray-500">Templates laden...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Geen goedgekeurde templates gevonden
              </div>
            ) : (
              <div className="grid gap-3">
                {templates
                  .filter(t => t.status === 'approved')
                  .map(template => (
                    <div
                      key={template.id}
                      onClick={() => {
                        onChange({ templateId: template.id, messageContent: template.content })
                      }}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        data.templateId === template.id
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{template.name}</h3>
                          <p className="mt-1 text-xs text-gray-600">{template.content}</p>
                          {template.variables.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {template.variables.map(v => (
                                <span
                                  key={v}
                                  className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                                >
                                  {'{'}
                                  {v}
                                  {'}'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            template.status === 'approved'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {template.status === 'approved' ? 'Goedgekeurd' : 'In behandeling'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Template Variables */}
          {data.templateId && getVariablesFromTemplate(data.templateId).length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Template Variabelen</p>
              <div className="space-y-3">
                {getVariablesFromTemplate(data.templateId).map(variable => (
                  <div key={variable}>
                    <label className="block text-xs text-gray-600 mb-1">
                      {'{'}
                      {variable}
                      {'}'}
                    </label>
                    <input
                      type="text"
                      value={data.templateVariables?.[variable] || ''}
                      onChange={e => updateTemplateVariable(variable, e.target.value)}
                      placeholder={`Waarde voor ${variable}...`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Media Message */}
      {data.messageType === 'media' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Media <span className="text-red-500">*</span>
            </label>
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                {mediaPreview ? (
                  <div>
                    <img src={mediaPreview} alt="Preview" className="max-h-48 mx-auto rounded" />
                    <p className="mt-2 text-sm text-gray-600">{data.mediaUrl}</p>
                  </div>
                ) : (
                  <>
                    <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">Klik om media te uploaden</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Afbeeldingen, video's of documenten (max 16MB)
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleMediaUpload}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bijschrift <span className="text-red-500">*</span>
            </label>
            <textarea
              value={data.messageContent}
              onChange={e => onChange({ messageContent: e.target.value })}
              placeholder="Voeg een bijschrift toe bij je media..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* Settings */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Bericht Instellingen</h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={data.settings.trackOpens}
              onChange={e =>
                onChange({
                  settings: { ...data.settings, trackOpens: e.target.checked },
                })
              }
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Volg wanneer berichten worden gelezen
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={data.settings.trackClicks}
              onChange={e =>
                onChange({
                  settings: { ...data.settings, trackClicks: e.target.checked },
                })
              }
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">Volg link clicks in berichten</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={data.settings.respectOptOuts}
              onChange={e =>
                onChange({
                  settings: { ...data.settings, respectOptOuts: e.target.checked },
                })
              }
              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Respecteer opt-outs (aanbevolen)
            </span>
          </label>
        </div>
      </div>

      {/* WhatsApp Guidelines */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-900">Belangrijke opmerking</h3>
            <p className="mt-1 text-xs text-yellow-700">
              Voor berichten buiten de 24-uurs sessie window moet je een goedgekeurd WhatsApp
              template gebruiken. Tekstberichten werken alleen binnen actieve conversaties.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
