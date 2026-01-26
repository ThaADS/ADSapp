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
import { useTranslations } from '@/components/providers/translation-provider'

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

export default function CustomReportBuilder() {
  const t = useTranslations('analytics')

  const AVAILABLE_METRICS: ReportMetric[] = [
    { id: 'total_revenue', name: t('reports.metrics.total_revenue'), type: 'sum', field: 'amount', category: 'revenue' },
    { id: 'mrr', name: t('reports.metrics.mrr'), type: 'sum', field: 'recurring_amount', category: 'revenue' },
    {
      id: 'avg_deal_size',
      name: t('reports.metrics.avg_deal_size'),
      type: 'average',
      field: 'amount',
      category: 'revenue',
    },
    {
      id: 'conversion_rate',
      name: t('reports.metrics.conversion_rate'),
      type: 'percentage',
      field: 'converted',
      category: 'revenue',
    },

    {
      id: 'total_conversations',
      name: t('reports.metrics.total_conversations'),
      type: 'count',
      field: 'id',
      category: 'conversations',
    },
    {
      id: 'avg_response_time',
      name: t('reports.metrics.avg_response_time'),
      type: 'average',
      field: 'first_response_time',
      category: 'conversations',
    },
    {
      id: 'resolved_rate',
      name: t('reports.metrics.resolved_rate'),
      type: 'percentage',
      field: 'resolved',
      category: 'conversations',
    },

    {
      id: 'total_contacts',
      name: t('reports.metrics.total_contacts'),
      type: 'count',
      field: 'id',
      category: 'contacts',
    },
    {
      id: 'new_contacts',
      name: t('reports.metrics.new_contacts'),
      type: 'count',
      field: 'created_at',
      category: 'contacts',
    },
    {
      id: 'active_contacts',
      name: t('reports.metrics.active_contacts'),
      type: 'count',
      field: 'last_message_at',
      category: 'contacts',
    },

    {
      id: 'automation_triggers',
      name: t('reports.metrics.automation_triggers'),
      type: 'count',
      field: 'triggered_at',
      category: 'automation',
    },
    {
      id: 'automation_success',
      name: t('reports.metrics.automation_success'),
      type: 'percentage',
      field: 'success',
      category: 'automation',
    },
  ]

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
      alert(t('errors.loadFailed'))
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
          <h2 className='text-xl font-semibold text-gray-900'>{t('reports.title')}</h2>
        </div>

        {/* Basic Info */}
        <div className='mb-6 space-y-4'>
          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>{t('reports.nameLabel')}</label>
            <input
              type='text'
              value={config.name}
              onChange={e => setConfig({ ...config, name: e.target.value })}
              className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500'
              placeholder={t('reports.namePlaceholder')}
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>{t('reports.descriptionLabel')}</label>
            <textarea
              value={config.description}
              onChange={e => setConfig({ ...config, description: e.target.value })}
              rows={2}
              className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500'
              placeholder={t('reports.descriptionPlaceholder')}
            />
          </div>
        </div>

        {/* Date Range */}
        <div className='mb-6'>
          <label className='mb-2 block flex items-center gap-2 text-sm font-medium text-gray-700'>
            <CalendarIcon className='h-4 w-4' />
            {t('reports.dateRange')}
          </label>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <label className='mb-1 block text-xs text-gray-500'>{t('reports.from')}</label>
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
              <label className='mb-1 block text-xs text-gray-500'>{t('reports.to')}</label>
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
          <label className='mb-3 block text-sm font-medium text-gray-700'>{t('reports.selectMetrics')}</label>

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
                  {category === 'revenue' && t('reports.categories.revenue')}
                  {category === 'conversations' && t('reports.categories.conversations')}
                  {category === 'contacts' && t('reports.categories.contacts')}
                  {category === 'automation' && t('reports.categories.automation')}
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
              {t('reports.filters.title')}
            </label>
            <button
              onClick={addFilter}
              className='flex items-center gap-1 rounded-lg px-3 py-1 text-sm text-emerald-600 hover:bg-emerald-50'
            >
              <PlusIcon className='h-4 w-4' />
              {t('reports.filters.add')}
            </button>
          </div>

          {config.filters.length === 0 ? (
            <p className='text-sm text-gray-500 italic'>
              {t('reports.filters.noFilters')}
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
                    <option value=''>{t('reports.metrics.selectMetrics')}</option>
                    <option value='status'>{t('reports.filters.fields.status')}</option>
                    <option value='amount'>{t('reports.filters.fields.amount')}</option>
                    <option value='plan'>{t('reports.filters.fields.plan')}</option>
                    <option value='source'>{t('reports.filters.fields.source')}</option>
                  </select>

                  <select
                    value={filter.operator}
                    onChange={e => updateFilter(filter.id, { operator: e.target.value as any })}
                    className='rounded-lg border border-gray-300 px-3 py-2 text-sm'
                  >
                    <option value='equals'>{t('reports.filters.operators.equals')}</option>
                    <option value='contains'>{t('reports.filters.operators.contains')}</option>
                    <option value='greater'>{t('reports.filters.operators.greater')}</option>
                    <option value='less'>{t('reports.filters.operators.less')}</option>
                    <option value='between'>{t('reports.filters.operators.between')}</option>
                  </select>

                  <input
                    type='text'
                    value={typeof filter.value === 'string' ? filter.value : ''}
                    onChange={e => updateFilter(filter.id, { value: e.target.value })}
                    className='flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm'
                    placeholder={t('reports.filters.valuePlaceholder')}
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
            <label className='mb-2 block text-sm font-medium text-gray-700'>{t('reports.groupBy.label')}</label>
            <select
              value={config.groupBy}
              onChange={e => setConfig({ ...config, groupBy: e.target.value })}
              className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500'
            >
              <option value='hour'>{t('reports.groupBy.hour')}</option>
              <option value='day'>{t('reports.groupBy.day')}</option>
              <option value='week'>{t('reports.groupBy.week')}</option>
              <option value='month'>{t('reports.groupBy.month')}</option>
              <option value='quarter'>{t('reports.groupBy.quarter')}</option>
              <option value='year'>{t('reports.groupBy.year')}</option>
            </select>
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>{t('reports.visualization.label')}</label>
            <select
              value={config.visualization}
              onChange={e => setConfig({ ...config, visualization: e.target.value as any })}
              className='w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-emerald-500'
            >
              <option value='table'>{t('reports.visualization.table')}</option>
              <option value='bar'>{t('reports.visualization.bar')}</option>
              <option value='line'>{t('reports.visualization.line')}</option>
              <option value='pie'>{t('reports.visualization.pie')}</option>
              <option value='area'>{t('reports.visualization.area')}</option>
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
            {isGenerating ? t('reports.generating') : t('reports.generate')}
          </button>

          {reportData && (
            <div className='flex gap-2'>
              <button
                onClick={() => exportReport('csv')}
                className='rounded-lg border border-gray-300 px-4 py-3 transition-colors hover:bg-gray-50'
                title={t('exportAs', { format: 'CSV' }) || 'Export as CSV'}
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
          <h3 className='mb-4 text-lg font-semibold text-gray-900'>{t('reports.preview', { name: config.name })}</h3>
          {/* Report visualization hier */}
          <div className='text-sm text-gray-600'>{t('reports.previewPlaceholder')}</div>
        </div>
      )}
    </div>
  )
}
