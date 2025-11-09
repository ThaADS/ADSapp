/**
 * Agent Performance Analytics Page
 * Performance metrics and insights for team members
 */

import { Metadata } from 'next'
import { AgentPerformanceDashboard } from '@/components/analytics/agent-performance-dashboard'

export const metadata: Metadata = {
  title: 'Agent Performance | Adsapp',
  description: 'Team prestatie-inzichten en analytics',
}

export default function AgentPerformancePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Prestaties</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor individuele en team prestaties
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <AgentPerformanceDashboard />
      </div>
    </div>
  )
}
