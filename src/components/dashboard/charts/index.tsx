'use client'

/**
 * Dashboard Charts Component
 * Lazy-loaded via @/lib/lazy-imports for bundle optimization
 */

import { useMemo } from 'react'

interface DataPoint {
  label: string
  value: number
  color?: string
}

interface DashboardChartsProps {
  data?: DataPoint[]
  variant?: 'overview' | 'detailed' | 'minimal'
  showLegend?: boolean
  className?: string
}

export function DashboardCharts({
  data = [],
  variant = 'overview',
  showLegend = true,
  className = '',
}: DashboardChartsProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data])
  const maxValue = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data])

  const defaultColors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500',
  ]

  if (data.length === 0) {
    return (
      <div className={`rounded-lg border bg-white p-6 ${className}`}>
        <p className="text-center text-gray-500">Geen dashboard data</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border bg-white p-6 ${className}`}>
      {variant === 'overview' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {data.map((item, index) => (
            <div
              key={index}
              className="p-4 rounded-lg bg-gray-50 border border-gray-100"
            >
              <p className="text-sm text-gray-600">{item.label}</p>
              <p className="text-2xl font-bold mt-1">{item.value.toLocaleString('nl-NL')}</p>
              <div className="mt-2 h-1 bg-gray-200 rounded">
                <div
                  className={`h-full rounded ${defaultColors[index % defaultColors.length]}`}
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === 'detailed' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Overzicht</h4>
            <span className="text-sm text-gray-500">Totaal: {total.toLocaleString('nl-NL')}</span>
          </div>
          <div className="space-y-3">
            {data.map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${defaultColors[index % defaultColors.length]}`}
                />
                <span className="flex-1 text-sm">{item.label}</span>
                <span className="font-medium">{item.value.toLocaleString('nl-NL')}</span>
                <span className="text-sm text-gray-500 w-12 text-right">
                  {total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {variant === 'minimal' && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden flex">
            {data.map((item, index) => (
              <div
                key={index}
                className={`h-full ${defaultColors[index % defaultColors.length]} transition-all`}
                style={{ width: `${(item.value / total) * 100}%` }}
                title={`${item.label}: ${item.value}`}
              />
            ))}
          </div>
        </div>
      )}

      {showLegend && variant !== 'detailed' && (
        <div className="mt-4 flex flex-wrap gap-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${defaultColors[index % defaultColors.length]}`}
              />
              <span className="text-sm text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default DashboardCharts
