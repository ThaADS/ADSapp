/**
 * Advanced Analytics Dashboard
 * Comprehensive analytics with conversation, customer journey, agent performance, and predictive insights
 */

import { Metadata } from 'next'
import { AdvancedAnalyticsDashboard } from '@/components/analytics/advanced-analytics-dashboard'

export const metadata: Metadata = {
  title: 'Advanced Analytics | ADSapp',
  description: 'Geavanceerde analytics met customer journey, predictive insights en ROI tracking',
}

export default function AdvancedAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
              <p className="mt-1 text-sm text-gray-500">
                Diepgaande inzichten in conversaties, customer journey en prestaties
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4 space-x-3">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                Exporteer Data
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                Custom Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <AdvancedAnalyticsDashboard />
      </div>
    </div>
  )
}
