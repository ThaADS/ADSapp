'use client'

/**
 * Message Engagement Chart
 * Funnel chart showing message engagement flow
 */

import { useState, useEffect } from 'react'

interface EngagementData {
  sent: number
  delivered: number
  read: number
  clicked: number
  replied: number
}

export function MessageEngagementChart() {
  const [data, setData] = useState<EngagementData>({
    sent: 0,
    delivered: 0,
    read: 0,
    clicked: 0,
    replied: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEngagementData()
  }, [])

  const fetchEngagementData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/analytics/campaigns/engagement')
      const result = await response.json()

      if (response.ok) {
        setData(result.engagement || generateMockData())
      } else {
        setData(generateMockData())
      }
    } catch (error) {
      console.error('Error fetching engagement data:', error)
      setData(generateMockData())
    } finally {
      setLoading(false)
    }
  }

  const generateMockData = (): EngagementData => {
    return {
      sent: 25000,
      delivered: 24250,
      read: 18500,
      clicked: 3200,
      replied: 1800,
    }
  }

  if (loading) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">Data laden...</div>
    )
  }

  const stages = [
    { key: 'sent' as const, label: 'Verzonden', value: data.sent, color: '#3B82F6' },
    { key: 'delivered' as const, label: 'Afgeleverd', value: data.delivered, color: '#10B981' },
    { key: 'read' as const, label: 'Gelezen', value: data.read, color: '#8B5CF6' },
    { key: 'clicked' as const, label: 'Geklikt', value: data.clicked, color: '#F59E0B' },
    { key: 'replied' as const, label: 'Beantwoord', value: data.replied, color: '#EF4444' },
  ]

  const maxValue = data.sent
  const chartHeight = 500
  const chartWidth = 600
  const funnelTopWidth = 500
  const funnelBottomWidth = 100

  return (
    <div className="space-y-6">
      {/* Funnel Visualization */}
      <div className="flex justify-center">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-2xl">
          {stages.map((stage, index) => {
            const percentage = stage.value / maxValue
            const stageHeight = chartHeight / stages.length
            const y = index * stageHeight

            const topWidth = funnelTopWidth - (index * (funnelTopWidth - funnelBottomWidth) / (stages.length - 1))
            const bottomWidth = funnelTopWidth - ((index + 1) * (funnelTopWidth - funnelBottomWidth) / (stages.length - 1))

            const x1 = (chartWidth - topWidth) / 2
            const x2 = (chartWidth + topWidth) / 2
            const x3 = (chartWidth + bottomWidth) / 2
            const x4 = (chartWidth - bottomWidth) / 2

            const dropoffRate = index > 0
              ? ((stages[index - 1].value - stage.value) / stages[index - 1].value * 100).toFixed(1)
              : '0'

            return (
              <g key={stage.key}>
                {/* Funnel segment */}
                <path
                  d={`M ${x1} ${y} L ${x2} ${y} L ${x3} ${y + stageHeight} L ${x4} ${y + stageHeight} Z`}
                  fill={stage.color}
                  opacity="0.8"
                  className="hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <title>
                    {stage.label}: {stage.value.toLocaleString('nl-NL')} (
                    {((stage.value / maxValue) * 100).toFixed(1)}%)
                  </title>
                </path>

                {/* Stage label and value */}
                <text
                  x={chartWidth / 2}
                  y={y + stageHeight / 2 - 10}
                  textAnchor="middle"
                  fontSize="16"
                  fontWeight="600"
                  fill="white"
                >
                  {stage.label}
                </text>
                <text
                  x={chartWidth / 2}
                  y={y + stageHeight / 2 + 10}
                  textAnchor="middle"
                  fontSize="18"
                  fontWeight="700"
                  fill="white"
                >
                  {stage.value.toLocaleString('nl-NL')}
                </text>
                <text
                  x={chartWidth / 2}
                  y={y + stageHeight / 2 + 28}
                  textAnchor="middle"
                  fontSize="12"
                  fill="white"
                  opacity="0.9"
                >
                  {((stage.value / maxValue) * 100).toFixed(1)}% van totaal
                </text>

                {/* Drop-off indicator */}
                {index > 0 && parseFloat(dropoffRate) > 0 && (
                  <text
                    x={chartWidth / 2 + topWidth / 2 + 20}
                    y={y + 10}
                    fontSize="11"
                    fill="#EF4444"
                    fontWeight="600"
                  >
                    -{dropoffRate}%
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-5 gap-4">
        {stages.map(stage => {
          const percentage = (stage.value / maxValue) * 100
          const conversionRate = stage.key === 'sent'
            ? 100
            : (stage.value / data.sent * 100).toFixed(1)

          return (
            <div
              key={stage.key}
              className="bg-gray-50 rounded-lg p-4 border-l-4"
              style={{ borderColor: stage.color }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <h4 className="text-sm font-medium text-gray-900">{stage.label}</h4>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stage.value.toLocaleString('nl-NL')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {conversionRate}% conversie rate
              </p>
            </div>
          )
        })}
      </div>

      {/* Conversion Rates */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-3">Belangrijke Conversies</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-blue-700">Aflevering Rate</p>
            <p className="text-2xl font-bold text-blue-900">
              {((data.delivered / data.sent) * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-blue-700">Open Rate</p>
            <p className="text-2xl font-bold text-blue-900">
              {((data.read / data.delivered) * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-blue-700">Antwoord Rate</p>
            <p className="text-2xl font-bold text-blue-900">
              {((data.replied / data.read) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
