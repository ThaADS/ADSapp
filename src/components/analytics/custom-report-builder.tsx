'use client'

import { useState } from 'react'
import {
  ChartBarIcon,
  CalendarIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface ReportMetric {
  id: string
  name: string
  type: 'count' | 'sum' | 'average' | 'percentage'
  field: string
  category: 'revenue' | 'conversations' | 'contacts' | 'automation'
}

interface ReportFilter {
  id: string
  field: string
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between'
  value: string | [string, string]
}

interface CustomReportConfig {
  name: string
  description: string
  dateRange: {
    from: string
    to: string
  }
  metrics: ReportMetric[]
  filters: ReportFilter[]
  groupBy: string
  visualization: 'table' | 'bar' | 'line' | 'pie' | 'area'
}

const AVAILABLE_METRICS: ReportMetric[] = [
  { id: 'total_revenue', name: 'Totale Omzet', type: 'sum', field: 'amount', category: 'revenue' },
  { id: 'mrr', name: 'MRR', type: 'sum', field: 'recurring_amount', category: 'revenue' },
  {
    id: 'avg_deal_size',
    name: 'Gemiddelde Deal',
    type: 'average',
    field: 'amount',
    category: 'revenue',
  },
  {
    id: 'conversion_rate',
    name: 'Conversie Ratio',
    type: 'percentage',
    field: 'converted',
    category: 'revenue',
  },

  {
    id: 'total_conversations',
    name: 'Totaal Gesprekken',
    type: 'count',
    field: 'id',
    category: 'conversations',
  },
  {
    id: 'avg_response_time',
    name: 'Gemiddelde Reactietijd',
    type: 'average',
    field: 'first_response_time',
    category: 'conversations',
  },
  {
    id: 'resolved_rate',
    name: 'Oplospercentage',
    type: 'percentage',
    field: 'resolved',
    category: 'conversations',
  },

  {
    id: 'total_contacts',
    name: 'Totaal Contacten',
    type: 'count',
    field: 'id',
    category: 'contacts',
  },
  {
    id: 'new_contacts',
    name: 'Nieuwe Contacten',
    type: 'count',
    field: 'created_at',
    category: 'contacts',
  },
  {
    id: 'active_contacts',
    name: 'Actieve Contacten',
    type: 'count',
    field: 'last_message_at',
    category: 'contacts',
  },

  {
    id: 'automation_triggers',
    name: 'Automation Triggers',
    type: 'count',
    field: 'triggered_at',
    category: 'automation',
  },
  {
    id: 'automation_success',
    name: 'Succesvolle Automations',
    type: 'percentage',
    field: 'success',
    category: 'automation',
  },
]

export default function CustomReportBuilder() {
  const [config, setConfig] = useState<CustomReportConfig>({
    name: '',
    description: '',
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
    },
    metrics: [],
    filters: [],
    groupBy: 'day',
    visualization: 'table',
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [reportData, setReportData] = useState<any>(null)

  const addMetric = (metric: ReportMetric) => {
    if (!config.metrics.find(m => m.id === metric.id)) {
      setConfig({ ...config, metrics: [...config.metrics, metric] })
    }
  }

  const removeMetric = (metricId: string) => {
    setConfig({ ...config, metrics: config.metrics.filter(m => m.id !== metricId) })
  }

  const addFilter = () => {
    const newFilter: ReportFilter = {
      id: `filter_${Date.now()}`,
      field: '',
      operator: 'equals',
      value: '',
    }
    setConfig({ ...config, filters: [...config.filters, newFilter] })
  }

  const updateFilter = (filterId: string, updates: Partial<ReportFilter>) => {
    setConfig({
      ...config,
      filters: config.filters.map(f => (f.id === filterId ? { ...f, ...updates } : f)),
    })
  }

  const removeFilter = (filterId: string) => {
    setConfig({ ...config, filters: config.filters.filter(f => f.id !== filterId) })
  }

  const generateReport = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/analytics/custom-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const data = await response.json()
      setReportData(data.report)
    } catch (error) {
      console.error('Failed to generate report:', error)
      alert('Fout bij genereren van rapport')
    } finally {
      setIsGenerating(false)
    }
  }

  const exportReport = (format: 'csv' | 'excel' | 'pdf') => {
    // Export logic hier
    console.log('Exporting as:', format)
  }

  return (
    <div className='space-y-6'>
      {/* Report Configuration */}
      <div className='rounded-lg bg-white p-6 shadow'>
        <div className='mb-6 flex items-center gap-3'>
          <ChartBarIcon className='h-6 w-6 text-emerald-600' />
          <h2 className='text-xl font-semibold text-gray-900'>Custom Report Builder</h2>
        </div>

        {/* Basic Info */}
        <div className='mb-6 space-y-4'>
          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>Rapport Naam</label>
            <input
              type='text'
              value={config.name}
              onChange={e => setConfig({ ...config, name: e.target.value })}
              className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500'
              placeholder='Geef uw rapport een naam...'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>Beschrijving</label>
            <textarea
              value={config.description}
              onChange={e => setConfig({ ...config, description: e.target.value })}
              rows={2}
              className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500'
              placeholder='Optionele beschrijving...'
            />
          </div>
        </div>

        {/* Date Range */}
        <div className='mb-6'>
          <label className='mb-2 block flex items-center gap-2 text-sm font-medium text-gray-700'>
            <CalendarIcon className='h-4 w-4' />
            Datumbereik
          </label>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='mb-1 block text-xs text-gray-500'>Van</label>
              <input
                type='date'
                value={config.dateRange.from}
                onChange={e =>
                  setConfig({
                    ...config,
                    dateRange: { ...config.dateRange, from: e.target.value },
                  })
                }
                className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500'
              />
            </div>
            <div>
              <label className='mb-1 block text-xs text-gray-500'>Tot</label>
              <input
                type='date'
                value={config.dateRange.to}
                onChange={e =>
                  setConfig({
                    ...config,
                    dateRange: { ...config.dateRange, to: e.target.value },
                  })
                }
                className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500'
              />
            </div>
          </div>
        </div>

        {/* Metrics Selection */}
        <div className='mb-6'>
          <label className='mb-3 block text-sm font-medium text-gray-700'>Selecteer Metrics</label>

          {/* Selected Metrics */}
          {config.metrics.length > 0 && (
            <div className='mb-4 flex flex-wrap gap-2'>
              {config.metrics.map(metric => (
                <div
                  key={metric.id}
                  className='inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-700'
                >
                  <span>{metric.name}</span>
                  <button
                    onClick={() => removeMetric(metric.id)}
                    className='hover:text-emerald-900'
                  >
                    <XMarkIcon className='h-4 w-4' />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Available Metrics by Category */}
          <div className='grid grid-cols-2 gap-4'>
            {['revenue', 'conversations', 'contacts', 'automation'].map(category => (
              <div key={category} className='rounded-lg border border-gray-200 p-3'>
                <h4 className='mb-2 text-xs font-medium text-gray-500 uppercase'>
                  {category === 'revenue' && '💰 Revenue'}
                  {category === 'conversations' && '💬 Gesprekken'}
                  {category === 'contacts' && '👥 Contacten'}
                  {category === 'automation' && '🤖 Automation'}
                </h4>
                <div className='space-y-1'>
                  {AVAILABLE_METRICS.filter(m => m.category === category).map(metric => (
                    <button
                      key={metric.id}
                      onClick={() => addMetric(metric)}
                      disabled={config.metrics.find(m => m.id === metric.id) !== undefined}
                      className='w-full rounded px-2 py-1 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
                    >
                      {metric.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className='mb-6'>
          <div className='mb-3 flex items-center justify-between'>
            <label className='block flex items-center gap-2 text-sm font-medium text-gray-700'>
              <FunnelIcon className='h-4 w-4' />
              Filters
            </label>
            <button
              onClick={addFilter}
              className='flex items-center gap-1 rounded-lg px-3 py-1 text-sm text-emerald-600 hover:bg-emerald-50'
            >
              <PlusIcon className='h-4 w-4' />
              Filter toevoegen
            </button>
          </div>

          {config.filters.length === 0 ? (
            <p className='text-sm text-gray-500 italic'>
              Geen filters toegepast - alle data wordt getoond
            </p>
          ) : (
            <div className='space-y-3'>
              {config.filters.map(filter => (
                <div key={filter.id} className='flex items-center gap-3 rounded-lg bg-gray-50 p-3'>
                  <select
                    value={filter.field}
                    onChange={e => updateFilter(filter.id, { field: e.target.value })}
                    className='rounded-lg border border-gray-300 px-3 py-2 text-sm'
                  >
                    <option value=''>Selecteer veld...</option>
                    <option value='status'>Status</option>
                    <option value='amount'>Bedrag</option>
                    <option value='plan'>Plan</option>
                    <option value='source'>Bron</option>
                  </select>

                  <select
                    value={filter.operator}
                    onChange={e => updateFilter(filter.id, { operator: e.target.value as any })}
                    className='rounded-lg border border-gray-300 px-3 py-2 text-sm'
                  >
                    <option value='equals'>Is gelijk aan</option>
                    <option value='contains'>Bevat</option>
                    <option value='greater'>Groter dan</option>
                    <option value='less'>Kleiner dan</option>
                    <option value='between'>Tussen</option>
                  </select>

                  <input
                    type='text'
                    value={typeof filter.value === 'string' ? filter.value : ''}
                    onChange={e => updateFilter(filter.id, { value: e.target.value })}
                    className='flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm'
                    placeholder='Waarde...'
                  />

                  <button
                    onClick={() => removeFilter(filter.id)}
                    className='rounded-lg p-2 text-red-600 hover:bg-red-50'
                  >
                    <XMarkIcon className='h-5 w-5' />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group By & Visualization */}
        <div className='mb-6 grid grid-cols-2 gap-4'>
          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>Groeperen per</label>
            <select
              value={config.groupBy}
              onChange={e => setConfig({ ...config, groupBy: e.target.value })}
              className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500'
            >
              <option value='hour'>Uur</option>
              <option value='day'>Dag</option>
              <option value='week'>Week</option>
              <option value='month'>Maand</option>
              <option value='quarter'>Kwartaal</option>
              <option value='year'>Jaar</option>
            </select>
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>Visualisatie</label>
            <select
              value={config.visualization}
              onChange={e => setConfig({ ...config, visualization: e.target.value as any })}
              className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500'
            >
              <option value='table'>Tabel</option>
              <option value='bar'>Bar Chart</option>
              <option value='line'>Line Chart</option>
              <option value='pie'>Pie Chart</option>
              <option value='area'>Area Chart</option>
            </select>
          </div>
        </div>

        {/* Generate Button */}
        <div className='flex items-center gap-3'>
          <button
            onClick={generateReport}
            disabled={isGenerating || config.metrics.length === 0}
            className='flex-1 rounded-lg bg-emerald-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300'
          >
            {isGenerating ? 'Rapport genereren...' : 'Rapport Genereren'}
          </button>

          {reportData && (
            <div className='flex gap-2'>
              <button
                onClick={() => exportReport('csv')}
                className='rounded-lg border border-gray-300 px-4 py-3 transition-colors hover:bg-gray-50'
                title='Export als CSV'
              >
                <ArrowDownTrayIcon className='h-5 w-5 text-gray-600' />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report Preview */}
      {reportData && (
        <div className='rounded-lg bg-white p-6 shadow'>
          <h3 className='mb-4 text-lg font-semibold text-gray-900'>Rapport: {config.name}</h3>
          {/* Report visualization hier */}
          <div className='text-sm text-gray-600'>Rapport preview komt hier...</div>
        </div>
      )}
    </div>
  )
}
