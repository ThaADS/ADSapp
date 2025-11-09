/**
 * New Broadcast Campaign Page
 * Multi-step wizard for creating broadcast campaigns
 */

import { Metadata } from 'next'
import { BroadcastCampaignBuilder } from '@/components/campaigns/broadcast-campaign-builder'

export const metadata: Metadata = {
  title: 'Nieuwe Broadcast Campagne | Adsapp',
  description: 'Maak een nieuwe broadcast campagne aan',
}

export default function NewBroadcastCampaignPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nieuwe Broadcast Campagne</h1>
            <p className="mt-1 text-sm text-gray-500">
              Stuur een bulkbericht naar een geselecteerde doelgroep
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <BroadcastCampaignBuilder />
      </div>
    </div>
  )
}
