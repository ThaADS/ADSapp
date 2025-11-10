/**
 * Create New Drip Campaign Page
 * Multi-step wizard for creating automated message sequences
 */

import { Metadata } from 'next'
import { DripCampaignBuilder } from '@/components/campaigns/drip-campaign-builder'

export const metadata: Metadata = {
  title: 'Nieuwe Drip Campagne | Adsapp',
  description: 'Maak een nieuwe geautomatiseerde berichtenreeks aan',
}

export default function NewDripCampaignPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <DripCampaignBuilder />
    </div>
  )
}
