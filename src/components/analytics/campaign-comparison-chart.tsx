'use client'

/**
 * Campaign Comparison Chart
 * Bar chart comparing different campaigns
 */

import { useState, useEffect } from 'react'

interface CampaignComparison {
  id: string
  name: string
  type: 'drip' | 'broadcast'
  messagesSent: number
  deliveryRate: number
  openRate: number
  clickRate: number
}

export function CampaignComparisonChart() {
  const [campaigns, setCampaigns] = useState<CampaignComparison[]>([])
  const [loading, setLoading] = useState(true)
  const [metric, setMetric] = useState<'messagesSent' | 'deliveryRate' | 'openRate' | 'clickRate'>(
    'messagesSent'
  )

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/analytics/campaigns/comparison')
      const result = await response.json()

      if (response.ok) {
        setCampaigns(result.campaigns || generateMockData())
      } else {
        setCampaigns(generateMockData())
      }
    } catch (error) {
      console.error('Error fetching campaign comparison:', error)
      setCampaigns(generateMockData())
    } finally {
      setLoading(false)
    }
  }

  const generateMockData = (): CampaignComparison[] => {
    return [
      {
        id: '1',
        name: 'Welkom Reeks',
        type: 'drip',
        messagesSent: 1543,
        deliveryRate: 96.5,
        openRate: 78.5,
        clickRate: 12.3,
      },
      {
        id: '2',
        name: 'Zomer Actie 2024',
        type: 'broadcast',
        messagesSent: 8921,
        deliveryRate: 94.2,
        openRate: 65.2,
        clickRate: 8.7,
      },
      {
        id: '3',
        name: 'Product Update',
        type: 'drip',
        messagesSent: 2341,
        deliveryRate: 97.8,
        openRate: 82.1,
        clickRate: 15.4,
      },
      {
        id: '4',
        name: 'Newsletter Week 12',
        type: 'broadcast',
        messagesSent: 5432,
        deliveryRate: 95.1,
        openRate: 71.3,
        clickRate: 9.2,
      },
      {
        id: '5',
        name: 'Onboarding Flow',
        type: 'drip',
        messagesSent: 987,
        deliveryRate: 98.2,
        openRate: 85.6,
        clickRate: 18.9,
      },
    ]
  }

  const metricOptions = [
    { key: 'messagesSent' as const, label: 'Berichten Verzonden', isPercentage: false },
    { key: 'deliveryRate' as const, label: 'Aflevering Rate', isPercentage: true },
    { key: 'openRate' as const, label: 'Open Rate', isPercentage: true },
    { key: 'clickRate' as const, label: 'Click Rate', isPercentage: true },
  ]

  if (loading || campaigns.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        {loading ? 'Data laden...' : 'Geen campagnes om te vergelijken'}
      </div>
    )
  }

  const maxValue = Math.max(...campaigns.map(c => c[metric]))
  const chartHeight = 400
  const barWidth = 60
  const barGap = 20
  const chartWidth = campaigns.length * (barWidth + barGap) + 100

  const currentMetric = metricOptions.find(m => m.key === metric)!

  return (
    <div className="space-y-4">
      {/* Metric Selector */}
      <div className="flex gap-2">
        {metricOptions.map(option => (
          <button
            key={option.key}
            onClick={() => setMetric(option.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              metric === option.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full"
          style={{ minWidth: '600px' }}
        >
          {campaigns.map((campaign, index) => {
            const x = index * (barWidth + barGap) + 50
            const barHeight = (campaign[metric] / maxValue) * (chartHeight - 100)
            const y = chartHeight - barHeight - 60

            return (
              <g key={campaign.id}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={campaign.type === 'drip' ? '#3B82F6' : '#10B981'}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                  rx="4"
                >
                  <title>
                    {campaign.name}: {campaign[metric]}
                    {currentMetric.isPercentage ? '%' : ''}
                  </title>
                </rect>

                {/* Value label */}
                <text
                  x={x + barWidth / 2}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="#1F2937"
                >
                  {currentMetric.isPercentage
                    ? `${campaign[metric].toFixed(1)}%`
                    : campaign[metric].toLocaleString('nl-NL')}
                </text>

                {/* Campaign name */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 40}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6B7280"
                  className="max-w-[60px]"
                >
                  {campaign.name.length > 12
                    ? campaign.name.substring(0, 12) + '...'
                    : campaign.name}
                </text>

                {/* Campaign type badge */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 25}
                  textAnchor="middle"
                  fontSize="9"
                  fill="#9CA3AF"
                >
                  {campaign.type === 'drip' ? 'Drip' : 'Broadcast'}
                </text>
              </g>
            )
          })}

          {/* Y-axis */}
          <line x1="40" y1="0" x2="40" y2={chartHeight - 60} stroke="#E5E7EB" strokeWidth="2" />

          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartHeight - 60 - ratio * (chartHeight - 100)
            const value = maxValue * ratio
            return (
              <text key={i} x="35" y={y + 4} textAnchor="end" fontSize="11" fill="#6B7280">
                {currentMetric.isPercentage
                  ? `${value.toFixed(0)}%`
                  : value.toFixed(0)}
              </text>
            )
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 pt-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-600"></div>
          <span className="text-sm text-gray-700">Drip Campagnes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-600"></div>
          <span className="text-sm text-gray-700">Broadcast Campagnes</span>
        </div>
      </div>
    </div>
  )
}
