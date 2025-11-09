'use client'

/**
 * Step 2: Trigger Configuration
 */

import { useState } from 'react'
import { BoltIcon, UserPlusIcon, TagIcon, CodeBracketIcon, CursorArrowRaysIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface CampaignTriggerSetupProps {
  data: {
    triggerType: 'manual' | 'contact_created' | 'tag_added' | 'custom_event' | 'api'
    triggerConfig: {
      tags?: string[]
      events?: string[]
    }
    stopOnReply: boolean
    respectBusinessHours: boolean
    maxContactsPerDay: number
  }
  onChange: (updates: any) => void
}

const TRIGGER_TYPES = [
  {
    id: 'manual' as const,
    name: 'Handmatig',
    description: 'Start de campagne handmatig voor geselecteerde contacten',
    icon: CursorArrowRaysIcon,
  },
  {
    id: 'contact_created' as const,
    name: 'Nieuw Contact',
    description: 'Automatisch starten wanneer een nieuw contact wordt toegevoegd',
    icon: UserPlusIcon,
  },
  {
    id: 'tag_added' as const,
    name: 'Tag Toegevoegd',
    description: 'Starten wanneer een specifieke tag aan een contact wordt toegevoegd',
    icon: TagIcon,
    requiresConfig: true,
  },
  {
    id: 'custom_event' as const,
    name: 'Custom Event',
    description: 'Triggeren op basis van aangepaste events in je systeem',
    icon: BoltIcon,
    advanced: true,
  },
  {
    id: 'api' as const,
    name: 'API Trigger',
    description: 'Via API aanroepen vanuit externe systemen',
    icon: CodeBracketIcon,
    advanced: true,
  },
]

export function CampaignTriggerSetup({ data, onChange }: CampaignTriggerSetupProps) {
  const [newTag, setNewTag] = useState('')

  const handleAddTag = () => {
    if (newTag.trim()) {
      const tags = data.triggerConfig.tags || []
      onChange({
        triggerConfig: {
          ...data.triggerConfig,
          tags: [...tags, newTag.trim()],
        },
      })
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    const tags = data.triggerConfig.tags || []
    onChange({
      triggerConfig: {
        ...data.triggerConfig,
        tags: tags.filter(t => t !== tagToRemove),
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Wanneer Starten?</h2>
        <p className="mt-1 text-sm text-gray-500">
          Kies wanneer contacten automatisch in deze campagne terechtkomen
        </p>
      </div>

      {/* Trigger Type Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Trigger Type <span className="text-red-500">*</span>
        </label>
        {TRIGGER_TYPES.map(trigger => (
          <button
            key={trigger.id}
            onClick={() => onChange({ triggerType: trigger.id })}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
              data.triggerType === trigger.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-start gap-4">
              <div
                className={`p-2 rounded-lg ${
                  data.triggerType === trigger.id ? 'bg-blue-600' : 'bg-gray-100'
                }`}
              >
                <trigger.icon
                  className={`h-6 w-6 ${
                    data.triggerType === trigger.id ? 'text-white' : 'text-gray-600'
                  }`}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{trigger.name}</h3>
                  {trigger.advanced && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      Geavanceerd
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">{trigger.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Tag Configuration (for tag_added trigger) */}
      {data.triggerType === 'tag_added' && (
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Welke Tags? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddTag()}
                placeholder="Tag naam..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Toevoegen
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              De campagne start wanneer één van deze tags aan een contact wordt toegevoegd
            </p>
          </div>

          {/* Selected Tags */}
          {(data.triggerConfig.tags?.length || 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.triggerConfig.tags?.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  <TagIcon className="h-4 w-4" />
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-blue-900"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campaign Settings */}
      <div className="space-y-4 pt-4 border-t">
        <h3 className="text-sm font-medium text-gray-900">Campagne Instellingen</h3>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.stopOnReply}
            onChange={e => onChange({ stopOnReply: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Stop bij reactie</span>
            <p className="text-xs text-gray-500">
              Stop automatisch berichten sturen als de klant reageert
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.respectBusinessHours}
            onChange={e => onChange({ respectBusinessHours: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <span className="text-sm font-medium text-gray-700">Respecteer kantooruren</span>
            <p className="text-xs text-gray-500">
              Verstuur berichten alleen tijdens ingestelde kantooruren
            </p>
          </div>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Maximaal aantal nieuwe contacten per dag
          </label>
          <input
            type="number"
            value={data.maxContactsPerDay}
            onChange={e => onChange({ maxContactsPerDay: parseInt(e.target.value) || 1000 })}
            min={1}
            max={10000}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Voorkomt te veel nieuwe enrollments op één dag (aanbevolen: 1000)
          </p>
        </div>
      </div>
    </div>
  )
}
