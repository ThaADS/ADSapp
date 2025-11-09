'use client'

/**
 * Broadcast Campaign Basic Info Step
 * Step 1: Campaign name, description, and type
 */

import { BroadcastCampaignData } from '../broadcast-campaign-builder'

interface Props {
  data: BroadcastCampaignData
  onChange: (updates: Partial<BroadcastCampaignData>) => void
}

export function BroadcastBasicInfo({ data, onChange }: Props) {
  const campaignTypes = [
    {
      id: 'one_time' as const,
      name: 'Eenmalig',
      description: 'Verstuur een bericht één keer naar de doelgroep',
    },
    {
      id: 'scheduled' as const,
      name: 'Gepland',
      description: 'Plan een bericht voor een specifiek tijdstip',
    },
    {
      id: 'recurring' as const,
      name: 'Terugkerend',
      description: 'Verstuur regelmatig berichten (dagelijks/wekelijks/maandelijks)',
    },
  ]

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Basis Informatie</h2>
        <p className="text-sm text-gray-500">
          Geef je broadcast campagne een naam en beschrijving
        </p>
      </div>

      <div className="space-y-4">
        {/* Campaign Name */}
        <div>
          <label htmlFor="campaign-name" className="block text-sm font-medium text-gray-700 mb-1">
            Campagne Naam <span className="text-red-500">*</span>
          </label>
          <input
            id="campaign-name"
            type="text"
            value={data.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="Bijv. Zomer Actie 2024"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Kies een duidelijke naam die de campagne beschrijft
          </p>
        </div>

        {/* Campaign Description */}
        <div>
          <label htmlFor="campaign-description" className="block text-sm font-medium text-gray-700 mb-1">
            Beschrijving
          </label>
          <textarea
            id="campaign-description"
            value={data.description}
            onChange={e => onChange({ description: e.target.value })}
            placeholder="Beschrijf het doel en de inhoud van deze campagne..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Optioneel: voeg extra context toe voor je team
          </p>
        </div>

        {/* Campaign Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type Campagne <span className="text-red-500">*</span>
          </label>
          <div className="grid gap-3">
            {campaignTypes.map(type => (
              <div
                key={type.id}
                onClick={() => onChange({ type: type.id })}
                className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  data.type === type.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start">
                  <div
                    className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center ${
                      data.type === type.id
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300'
                    }`}
                  >
                    {data.type === type.id && (
                      <div className="h-2 w-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-900">{type.name}</h3>
                    <p className="mt-1 text-xs text-gray-500">{type.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-900">WhatsApp Broadcast Richtlijnen</h3>
              <div className="mt-2 text-xs text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li>Gebruik goedgekeurde templates voor berichten buiten de 24-uurs sessie</li>
                  <li>Respecteer opt-outs en privacy instellingen van contacten</li>
                  <li>Houd je aan WhatsApp's rate limits (standaard 100 berichten/seconde)</li>
                  <li>Test je bericht eerst met een kleine testgroep</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
