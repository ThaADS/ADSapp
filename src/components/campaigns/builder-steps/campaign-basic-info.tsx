'use client'

/**
 * Step 1: Basic Campaign Information
 */

import { InformationCircleIcon } from '@heroicons/react/24/outline'

interface CampaignBasicInfoProps {
  data: {
    name: string
    description: string
  }
  onChange: (updates: any) => void
}

export function CampaignBasicInfo({ data, onChange }: CampaignBasicInfoProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Basis Informatie</h2>
        <p className="mt-1 text-sm text-gray-500">
          Geef je campagne een duidelijke naam en omschrijving
        </p>
      </div>

      <div className="space-y-4">
        {/* Campaign Name */}
        <div>
          <label htmlFor="campaign-name" className="block text-sm font-medium text-gray-700">
            Campagne Naam <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="campaign-name"
            value={data.name}
            onChange={e => onChange({ name: e.target.value })}
            placeholder="bijv. Nieuwe Lead Opvolging"
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Deze naam wordt alleen intern gebruikt en is niet zichtbaar voor klanten
          </p>
        </div>

        {/* Campaign Description */}
        <div>
          <label htmlFor="campaign-description" className="block text-sm font-medium text-gray-700">
            Omschrijving (optioneel)
          </label>
          <textarea
            id="campaign-description"
            value={data.description}
            onChange={e => onChange({ description: e.target.value })}
            placeholder="Beschrijf het doel van deze campagne..."
            rows={4}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-4 py-2.5 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Helpt je team begrijpen waarvoor deze campagne bedoeld is
          </p>
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <div className="flex gap-3">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium">Tip voor betere resultaten</p>
              <p className="mt-1 text-blue-800">
                Kies een naam die duidelijk maakt wat de campagne doet, bijvoorbeeld: "Welkom Nieuwe Klanten", "Verlaten Winkelwagen Opvolging" of "Product Launch Announcement".
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
