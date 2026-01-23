'use client'

/**
 * Analytics Exporter Component
 * Lazy-loaded via @/lib/lazy-imports for bundle optimization
 */

import { useState, useCallback } from 'react'

interface ExportField {
  key: string
  label: string
  selected: boolean
}

interface AnalyticsExporterProps {
  availableFields?: ExportField[]
  onExport?: (options: {
    format: 'csv' | 'xlsx' | 'json' | 'pdf'
    fields: string[]
    dateRange: { start: string; end: string }
  }) => void
  onCancel?: () => void
  className?: string
}

export function AnalyticsExporter({
  availableFields = [
    { key: 'date', label: 'Datum', selected: true },
    { key: 'messages_sent', label: 'Verzonden berichten', selected: true },
    { key: 'messages_received', label: 'Ontvangen berichten', selected: true },
    { key: 'conversations', label: 'Gesprekken', selected: true },
    { key: 'response_time', label: 'Responstijd', selected: true },
    { key: 'contacts_created', label: 'Nieuwe contacten', selected: false },
    { key: 'templates_used', label: 'Gebruikte templates', selected: false },
    { key: 'automations_triggered', label: 'Automaties uitgevoerd', selected: false },
  ],
  onExport,
  onCancel,
  className = '',
}: AnalyticsExporterProps) {
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'json' | 'pdf'>('csv')
  const [fields, setFields] = useState<ExportField[]>(availableFields)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [isExporting, setIsExporting] = useState(false)

  const toggleField = useCallback((key: string) => {
    setFields((prev) =>
      prev.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f))
    )
  }, [])

  const selectAll = useCallback(() => {
    setFields((prev) => prev.map((f) => ({ ...f, selected: true })))
  }, [])

  const deselectAll = useCallback(() => {
    setFields((prev) => prev.map((f) => ({ ...f, selected: false })))
  }, [])

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      await onExport?.({
        format,
        fields: fields.filter((f) => f.selected).map((f) => f.key),
        dateRange,
      })
    } finally {
      setIsExporting(false)
    }
  }, [format, fields, dateRange, onExport])

  const selectedCount = fields.filter((f) => f.selected).length

  const formatOptions: { value: typeof format; label: string; icon: string }[] = [
    { value: 'csv', label: 'CSV', icon: '📊' },
    { value: 'xlsx', label: 'Excel', icon: '📗' },
    { value: 'json', label: 'JSON', icon: '📋' },
    { value: 'pdf', label: 'PDF Rapport', icon: '📄' },
  ]

  return (
    <div className={`rounded-lg border bg-white ${className}`}>
      {/* Header */}
      <div className="border-b p-4">
        <h3 className="font-semibold">Analytics Exporteren</h3>
        <p className="text-sm text-gray-500 mt-1">
          Download je analytics data in het gewenste formaat
        </p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium mb-2">Periode</label>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            <span className="text-gray-400">tot</span>
            <div className="flex-1">
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            {['7 dagen', '30 dagen', '90 dagen', 'Dit jaar'].map((preset, i) => {
              const days = [7, 30, 90, 365][i]
              return (
                <button
                  key={preset}
                  onClick={() =>
                    setDateRange({
                      start: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split('T')[0],
                      end: new Date().toISOString().split('T')[0],
                    })
                  }
                  className="px-3 py-1 text-sm border rounded-full hover:bg-gray-50 transition-colors"
                >
                  {preset}
                </button>
              )
            })}
          </div>
        </div>

        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Exportformaat</label>
          <div className="grid grid-cols-4 gap-2">
            {formatOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFormat(option.value)}
                className={`p-3 border rounded-lg text-center transition-all
                  ${format === option.value
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'hover:border-gray-300'
                  }
                `}
              >
                <div className="text-2xl mb-1">{option.icon}</div>
                <div className="text-sm font-medium">{option.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Field Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">
              Velden ({selectedCount}/{fields.length} geselecteerd)
            </label>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-emerald-600 hover:text-emerald-700"
              >
                Alles selecteren
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={deselectAll}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Alles deselecteren
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {fields.map((field) => (
              <label
                key={field.key}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all
                  ${field.selected ? 'border-emerald-500 bg-emerald-50' : 'hover:bg-gray-50'}
                `}
              >
                <input
                  type="checkbox"
                  checked={field.selected}
                  onChange={() => toggleField(field.key)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm">{field.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Preview Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Export preview:</strong> {selectedCount} velden, formaat {format.toUpperCase()},
            periode {dateRange.start} tot {dateRange.end}
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between border-t p-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          Annuleren
        </button>
        <button
          onClick={handleExport}
          disabled={selectedCount === 0 || isExporting}
          className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2
            ${selectedCount > 0 && !isExporting
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {isExporting ? (
            <>
              <span className="animate-spin">⏳</span>
              Exporteren...
            </>
          ) : (
            <>
              📥 Exporteren
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default AnalyticsExporter
