/**
 * Campaign Analytics Dashboard
 * Comprehensive analytics for drip and broadcast campaigns
 */

import { Metadata } from 'next'
import { CampaignAnalyticsDashboard } from '@/components/analytics/campaign-analytics-dashboard'

export const metadata: Metadata = {
  title: 'Campagne Analytics | Adsapp',
  description: 'Gedetailleerde analytics voor je WhatsApp campagnes',
}

export default function CampaignAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campagne Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gedetailleerde prestatie-inzichten voor je drip en broadcast campagnes
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <CampaignAnalyticsDashboard />
      </div>
    </div>
  )
}
