'use client'

/**
 * Campaign Performance Chart
 * Line chart showing campaign metrics over time
 */

import { useState, useEffect } from 'react'

interface PerformanceData {
  date: string
  sent: number
  delivered: number
  read: number
  clicked: number
}

interface Props {
  dateRange: '7d' | '30d' | '90d' | 'all'
}

export function CampaignPerformanceChart({ dateRange }: Props) {
  const [data, setData] = useState<PerformanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeMetric, setActiveMetric] = useState<'sent' | 'delivered' | 'read' | 'clicked'>('sent')

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/campaigns/performance?range=${dateRange}`)
      const result = await response.json()

      if (response.ok) {
        setData(result.data || generateMockData())
      } else {
        setData(generateMockData())
      }
    } catch (error) {
      console.error('Error fetching performance data:', error)
      setData(generateMockData())
    } finally {
      setLoading(false)
    }
  }

  const generateMockData = (): PerformanceData[] => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
    const result: PerformanceData[] = []
    const today = new Date()

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      result.push({
        date: date.toISOString().split('T')[0],
        sent: Math.floor(Math.random() * 1000) + 500,
        delivered: Math.floor(Math.random() * 900) + 450,
        read: Math.floor(Math.random() * 600) + 300,
        clicked: Math.floor(Math.random() * 150) + 50,
      })
    }
    return result
  }

  const metrics = [
    { key: 'sent' as const, label: 'Verzonden', color: '#3B82F6' },
    { key: 'delivered' as const, label: 'Afgeleverd', color: '#10B981' },
    { key: 'read' as const, label: 'Gelezen', color: '#8B5CF6' },
    { key: 'clicked' as const, label: 'Geklikt', color: '#F59E0B' },
  ]

  if (loading || data.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center text-gray-500">
        {loading ? 'Data laden...' : 'Geen data beschikbaar'}
      </div>
    )
  }

  const maxValue = Math.max(...data.map(d => d[activeMetric]))
  const chartHeight = 300
  const chartWidth = 800
  const padding = 40

  const getX = (index: number) => {
    return (index / (data.length - 1)) * (chartWidth - 2 * padding) + padding
  }

  const getY = (value: number) => {
    return chartHeight - (value / maxValue) * (chartHeight - 2 * padding) - padding
  }

  const pathData = data
    .map((point, index) => {
      const x = getX(index)
      const y = getY(point[activeMetric])
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  return (
    <div className="space-y-4">
      {/* Metric Selector */}
      <div className="flex gap-2">
        {metrics.map(metric => (
          <button
            key={metric.key}
            onClick={() => setActiveMetric(metric.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeMetric === metric.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span
              className="inline-block w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: metric.color }}
            />
            {metric.label}
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
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = chartHeight - ratio * (chartHeight - 2 * padding) - padding
            return (
              <g key={i}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeWidth="1"
                />
                <text
                  x={padding - 10}
                  y={y + 5}
                  textAnchor="end"
                  fontSize="12"
                  fill="#6B7280"
                >
                  {Math.round(maxValue * ratio)}
                </text>
              </g>
            )
          })}

          {/* Line chart */}
          <path
            d={pathData}
            fill="none"
            stroke={metrics.find(m => m.key === activeMetric)?.color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((point, index) => {
            const x = getX(index)
            const y = getY(point[activeMetric])
            return (
              <g key={index}>
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill={metrics.find(m => m.key === activeMetric)?.color}
                  className="hover:r-6 transition-all cursor-pointer"
                />
                <title>
                  {point.date}: {point[activeMetric].toLocaleString('nl-NL')}
                </title>
              </g>
            )
          })}

          {/* X-axis labels */}
          {data
            .filter((_, i) => i % Math.ceil(data.length / 7) === 0)
            .map((point, i, arr) => {
              const index = data.indexOf(point)
              const x = getX(index)
              const dateLabel = new Date(point.date).toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'short',
              })
              return (
                <text
                  key={i}
                  x={x}
                  y={chartHeight - padding + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6B7280"
                >
                  {dateLabel}
                </text>
              )
            })}
        </svg>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4 pt-4 border-t">
        {metrics.map(metric => {
          const total = data.reduce((sum, d) => sum + d[metric.key], 0)
          return (
            <div key={metric.key} className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {total.toLocaleString('nl-NL')}
              </p>
              <p className="text-xs text-gray-500 mt-1">{metric.label}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
