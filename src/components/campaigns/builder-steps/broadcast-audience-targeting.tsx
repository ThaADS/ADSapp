'use client'

/**
 * Broadcast Audience Targeting Step
 * Step 2: Select target audience (all contacts, tags, custom filters, or CSV upload)
 */

import { useState } from 'react'
import {
  UserGroupIcon,
  TagIcon,
  FunnelIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { BroadcastCampaignData } from '../broadcast-campaign-builder'

interface Props {
  data: BroadcastCampaignData
  onChange: (updates: Partial<BroadcastCampaignData>) => void
}

export function BroadcastAudienceTargeting({ data, onChange }: Props) {
  const [newTag, setNewTag] = useState('')
  const [csvPreview, setCsvPreview] = useState<string[]>([])

  const targetingOptions = [
    {
      id: 'all' as const,
      name: 'Alle Contacten',
      description: 'Verstuur naar alle contacten in je database',
      icon: UserGroupIcon,
    },
    {
      id: 'tags' as const,
      name: 'Op Basis van Tags',
      description: 'Selecteer contacten met specifieke tags',
      icon: TagIcon,
    },
    {
      id: 'custom' as const,
      name: 'Custom Filters',
      description: 'Geavanceerde filtering op basis van contactgegevens',
      icon: FunnelIcon,
    },
    {
      id: 'csv' as const,
      name: 'CSV Upload',
      description: 'Upload een lijst met telefoonnummers',
      icon: ArrowUpTrayIcon,
    },
  ]

  const handleAddTag = () => {
    if (newTag.trim() && !data.targetTags.includes(newTag.trim())) {
      onChange({ targetTags: [...data.targetTags, newTag.trim()] })
      setNewTag('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    onChange({ targetTags: data.targetTags.filter(t => t !== tag) })
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = event => {
      const text = event.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      const contacts = lines.map(line => {
        const [phoneNumber, name] = line.split(',').map(s => s.trim())
        return { phoneNumber, name }
      })

      onChange({ csvContacts: contacts })
      setCsvPreview(lines.slice(0, 5))
    }
    reader.readAsText(file)
  }

  const addCustomFilter = () => {
    onChange({
      customFilters: [
        ...data.customFilters,
        { field: 'name', operator: 'contains', value: '' },
      ],
    })
  }

  const updateCustomFilter = (
    index: number,
    updates: Partial<{ field: string; operator: string; value: string }>
  ) => {
    const newFilters = [...data.customFilters]
    newFilters[index] = { ...newFilters[index], ...updates }
    onChange({ customFilters: newFilters })
  }

  const removeCustomFilter = (index: number) => {
    onChange({ customFilters: data.customFilters.filter((_, i) => i !== index) })
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Doelgroep Selecteren</h2>
        <p className="text-sm text-gray-500">
          Kies wie deze broadcast ontvangt
        </p>
      </div>

      {/* Targeting Type Selection */}
      <div className="grid grid-cols-2 gap-4">
        {targetingOptions.map(option => (
          <div
            key={option.id}
            onClick={() => onChange({ targetingType: option.id })}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              data.targetingType === option.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start">
              <option.icon
                className={`h-6 w-6 ${
                  data.targetingType === option.id ? 'text-blue-600' : 'text-gray-400'
                }`}
              />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900">{option.name}</h3>
                <p className="mt-1 text-xs text-gray-500">{option.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tags Configuration */}
      {data.targetingType === 'tags' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Selecteer Tags</h3>

          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleAddTag()}
                placeholder="Typ een tag naam..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={handleAddTag}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Toevoegen
              </button>
            </div>

            {data.targetTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {data.targetTags.map(tag => (
                  <div
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    <TagIcon className="h-4 w-4" />
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-blue-900"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-500">
              Contacten met minimaal één van deze tags worden geselecteerd
            </p>
          </div>
        </div>
      )}

      {/* Custom Filters */}
      {data.targetingType === 'custom' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Custom Filters</h3>
            <button
              onClick={addCustomFilter}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + Filter Toevoegen
            </button>
          </div>

          <div className="space-y-3">
            {data.customFilters.map((filter, index) => (
              <div key={index} className="flex gap-2">
                <select
                  value={filter.field}
                  onChange={e => updateCustomFilter(index, { field: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="name">Naam</option>
                  <option value="phone">Telefoonnummer</option>
                  <option value="email">Email</option>
                  <option value="custom_field">Custom Veld</option>
                </select>

                <select
                  value={filter.operator}
                  onChange={e => updateCustomFilter(index, { operator: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="contains">bevat</option>
                  <option value="equals">is gelijk aan</option>
                  <option value="starts_with">begint met</option>
                  <option value="ends_with">eindigt met</option>
                </select>

                <input
                  type="text"
                  value={filter.value}
                  onChange={e => updateCustomFilter(index, { value: e.target.value })}
                  placeholder="Waarde..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                />

                <button
                  onClick={() => removeCustomFilter(index)}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            ))}

            {data.customFilters.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                Voeg filters toe om je doelgroep te verfijnen
              </p>
            )}
          </div>
        </div>
      )}

      {/* CSV Upload */}
      {data.targetingType === 'csv' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Upload Contact Lijst</h3>

          <div className="space-y-3">
            <label className="block">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Klik om CSV bestand te uploaden
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Format: telefoonnummer,naam (één per regel)
                </p>
              </div>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleCsvUpload}
                className="hidden"
              />
            </label>

            {csvPreview.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">
                  Preview ({data.csvContacts.length} contacten geladen):
                </p>
                <div className="text-xs text-gray-600 font-mono">
                  {csvPreview.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                  {data.csvContacts.length > 5 && (
                    <div className="text-gray-400">
                      ... en {data.csvContacts.length - 5} meer
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Estimated Audience Size */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <UserGroupIcon className="h-6 w-6 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">Geschatte Doelgroep</p>
            <p className="text-xs text-blue-700 mt-1">
              {data.targetingType === 'csv'
                ? `${data.csvContacts.length} contacten uit CSV`
                : data.targetingType === 'all'
                ? 'Alle contacten in de database'
                : data.targetingType === 'tags'
                ? `Contacten met tags: ${data.targetTags.join(', ') || 'geen geselecteerd'}`
                : `${data.customFilters.length} actieve filter(s)`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
