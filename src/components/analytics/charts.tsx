'use client'

/**
 * Analytics Charts Component
 * Lazy-loaded via @/lib/lazy-imports for bundle optimization
 */

import { useMemo } from 'react'

interface ChartData {
  name: string
  value: number
  [key: string]: string | number
}

interface AnalyticsChartsProps {
  data?: ChartData[]
  type?: 'bar' | 'line' | 'pie' | 'area'
  title?: string
  className?: string
}

export function AnalyticsCharts({
  data = [],
  type = 'bar',
  title,
  className = '',
}: AnalyticsChartsProps) {
  const maxValue = useMemo(() => {
    if (data.length === 0) return 100
    return Math.max(...data.map((d) => d.value))
  }, [data])

  if (data.length === 0) {
    return (
      <div className={`rounded-lg border bg-white p-6 ${className}`}>
        <p className="text-center text-gray-500">Geen data beschikbaar</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border bg-white p-6 ${className}`}>
      {title && <h3 className="mb-4 text-lg font-semibold">{title}</h3>}

      {type === 'bar' && (
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <span className="w-24 text-sm text-gray-600 truncate">{item.name}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded transition-all duration-300"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
              <span className="w-16 text-right text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {type === 'line' && (
        <div className="h-64 flex items-end justify-between gap-1 border-b border-l border-gray-200 p-4">
          {data.map((item, index) => (
            <div key={index} className="flex flex-col items-center gap-1 flex-1">
              <div
                className="w-2 bg-blue-500 rounded-t transition-all duration-300"
                style={{ height: `${(item.value / maxValue) * 200}px` }}
              />
              <span className="text-xs text-gray-500 truncate max-w-full">{item.name}</span>
            </div>
          ))}
        </div>
      )}

      {type === 'pie' && (
        <div className="flex items-center justify-center gap-8">
          <div className="relative w-48 h-48">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-blue-500" />
            <div className="absolute inset-4 rounded-full bg-white flex items-center justify-center">
              <span className="text-2xl font-bold">
                {data.reduce((sum, d) => sum + d.value, 0)}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            {data.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`,
                  }}
                />
                <span className="text-sm">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {type === 'area' && (
        <div className="h-64 flex items-end gap-0.5 border-b border-l border-gray-200 p-4">
          {data.map((item, index) => (
            <div
              key={index}
              className="flex-1 bg-gradient-to-t from-emerald-200 to-emerald-400 rounded-t transition-all duration-300"
              style={{ height: `${(item.value / maxValue) * 100}%` }}
              title={`${item.name}: ${item.value}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default AnalyticsCharts
