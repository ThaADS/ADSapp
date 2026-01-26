'use client'

/**
 * AI Analytics Dashboard Component
 * Display AI usage statistics and cost tracking
 */

import { useState, useEffect } from 'react'
import { useTranslations } from '@/components/providers/translation-provider'

interface AIUsageStats {
  period: {
    days: number
    startDate: string
    endDate: string
  }
  summary: {
    totalRequests: number
    totalTokens: number
    totalCostUsd: number
    avgLatencyMs: number
    acceptanceRate: number | null
  }
  byFeature: Record<
    string,
    {
      count: number
      cost: number
      tokens: number
    }
  >
  byDate: Record<
    string,
    {
      count: number
      cost: number
    }
  >
  modelUsage: Record<string, number>
  budgetStatus: {
    budget: number
    currentSpend: number
    percentUsed: number
    remaining: number
    isOverBudget: boolean
    isNearLimit: boolean
    alertThreshold: number
  } | null
}

interface AIAnalyticsProps {
  organizationId: string
}

export function AIAnalytics({ organizationId }: AIAnalyticsProps) {
  const t = useTranslations('analytics')
  const [stats, setStats] = useState<AIUsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('30') // days

  useEffect(() => {
    loadStats()
  }, [organizationId, period])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/ai/usage?period=${period}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || t('errors.loadFailed'))
      }

      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.loadFailed'))
      console.error('Load analytics error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    // Ideally this should use the user's locale, but for now we default to Dutch formatting for USD
    // matching the original implementation but customizable if needed
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('nl-NL').format(num)
  }

  const getFeatureLabel = (feature: string) => {
    const key = `features.${feature}`
    return t(key as any) || feature
  }

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'draft':
        return '✏️'
      case 'auto_response':
        return '🤖'
      case 'sentiment':
        return '😊'
      case 'summary':
        return '📝'
      case 'template':
        return '📋'
      default:
        return '🔧'
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center p-12'>
        <div className='h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600'></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='rounded-lg border border-red-200 bg-red-50 p-4'>
        <p className='text-red-800'>{error}</p>
        <button
          onClick={loadStats}
          className='mt-2 text-sm text-red-600 underline hover:text-red-800'
        >
          {t('errors.retry')}
        </button>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className='space-y-6'>
      {/* Header with Period Selector */}
      <div className='flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>{t('ai.title')}</h2>
          <p className='mt-1 text-sm text-gray-600'>{t('aiDescription')}</p>
        </div>
        <select
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className='rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500'
        >
          <option value='7'>{t('dateRange.last7Days')}</option>
          <option value='30'>{t('dateRange.last30Days')}</option>
          <option value='90'>{t('dateRange.last90Days', { defaultValue: 'Laatste 90 dagen' })}</option>
        </select>
      </div>

      {/* Budget Alert */}
      {stats.budgetStatus && stats.budgetStatus.isNearLimit && (
        <div
          className={`rounded-lg border p-4 ${stats.budgetStatus.isOverBudget ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'}`}
        >
          <div className='flex'>
            <div className='flex-shrink-0'>
              <svg
                className={`h-5 w-5 ${stats.budgetStatus.isOverBudget ? 'text-red-400' : 'text-yellow-400'}`}
                viewBox='0 0 20 20'
                fill='currentColor'
              >
                <path
                  fillRule='evenodd'
                  d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                  clipRule='evenodd'
                />
              </svg>
            </div>
            <div className='ml-3'>
              <h3
                className={`text-sm font-medium ${stats.budgetStatus.isOverBudget ? 'text-red-800' : 'text-yellow-800'}`}
              >
                {stats.budgetStatus.isOverBudget ? t('budget.overBudget') : t('budget.limitReached')}
              </h3>
              <div
                className={`mt-2 text-sm ${stats.budgetStatus.isOverBudget ? 'text-red-700' : 'text-yellow-700'}`}
              >
                <p>
                  {t('budget.spendDescription', {
                    spend: formatCurrency(stats.budgetStatus.currentSpend),
                    budget: formatCurrency(stats.budgetStatus.budget),
                    percent: stats.budgetStatus.percentUsed.toFixed(1)
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <div className='rounded-lg bg-white p-6 shadow'>
          <div className='flex items-center justify-between'>
            <p className='text-sm font-medium text-gray-600'>{t('aiMetrics.totalRequests')}</p>
            <span className='text-2xl'>📊</span>
          </div>
          <p className='mt-2 text-3xl font-semibold text-gray-900'>
            {formatNumber(stats.summary.totalRequests)}
          </p>
          <p className='mt-1 text-xs text-gray-500'>{t('aiMetrics.requestsDescription', { days: period })}</p>
        </div>

        <div className='rounded-lg bg-white p-6 shadow'>
          <div className='flex items-center justify-between'>
            <p className='text-sm font-medium text-gray-600'>{t('aiMetrics.totalCost')}</p>
            <span className='text-2xl'>💰</span>
          </div>
          <p className='mt-2 text-3xl font-semibold text-gray-900'>
            {formatCurrency(stats.summary.totalCostUsd)}
          </p>
          <p className='mt-1 text-xs text-gray-500'>{t('aiMetrics.costDescription', { days: period })}</p>
        </div>

        <div className='rounded-lg bg-white p-6 shadow'>
          <div className='flex items-center justify-between'>
            <p className='text-sm font-medium text-gray-600'>{t('aiMetrics.avgLatency')}</p>
            <span className='text-2xl'>⚡</span>
          </div>
          <p className='mt-2 text-3xl font-semibold text-gray-900'>
            {Math.round(stats.summary.avgLatencyMs)}ms
          </p>
          <p className='mt-1 text-xs text-gray-500'>{t('aiMetrics.latencyDescription')}</p>
        </div>

        <div className='rounded-lg bg-white p-6 shadow'>
          <div className='flex items-center justify-between'>
            <p className='text-sm font-medium text-gray-600'>{t('aiMetrics.acceptance')}</p>
            <span className='text-2xl'>✅</span>
          </div>
          <p className='mt-2 text-3xl font-semibold text-gray-900'>
            {stats.summary.acceptanceRate !== null
              ? `${stats.summary.acceptanceRate.toFixed(1)}%`
              : t('notAvailable') || 'N/A'}
          </p>
          <p className='mt-1 text-xs text-gray-500'>{t('aiMetrics.acceptanceDescription')}</p>
        </div>
      </div>

      {/* Feature Breakdown */}
      <div className='rounded-lg bg-white shadow'>
        <div className='border-b border-gray-200 px-6 py-4'>
          <h3 className='text-lg font-medium text-gray-900'>{t('perFeature')}</h3>
        </div>
        <div className='p-6'>
          <div className='space-y-4'>
            {Object.entries(stats.byFeature).map(([feature, data]) => (
              <div
                key={feature}
                className='flex items-center justify-between rounded-lg bg-gray-50 p-4'
              >
                <div className='flex items-center space-x-3'>
                  <span className='text-2xl'>{getFeatureIcon(feature)}</span>
                  <div>
                    <p className='font-medium text-gray-900'>{getFeatureLabel(feature)}</p>
                    <p className='text-sm text-gray-600'>
                      {formatNumber(data.count)} {t('requests')} · {formatNumber(data.tokens)} {t('tokens')}
                    </p>
                  </div>
                </div>
                <div className='text-right'>
                  <p className='font-semibold text-gray-900'>{formatCurrency(data.cost)}</p>
                  <p className='text-xs text-gray-500'>
                    {((data.count / stats.summary.totalRequests) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage Over Time Chart */}
      <div className='rounded-lg bg-white shadow'>
        <div className='border-b border-gray-200 px-6 py-4'>
          <h3 className='text-lg font-medium text-gray-900'>{t('usageOverTime')}</h3>
        </div>
        <div className='p-6'>
          <div className='space-y-2'>
            {Object.entries(stats.byDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, data]) => {
                const maxCount = Math.max(...Object.values(stats.byDate).map(d => d.count))
                const width = (data.count / maxCount) * 100

                return (
                  <div key={date} className='flex items-center space-x-4'>
                    <div className='w-24 text-sm text-gray-600'>
                      {new Date(date).toLocaleDateString('nl-NL', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className='flex-1'>
                      <div className='relative h-8 rounded bg-gray-100'>
                        <div
                          className='absolute flex h-full items-center justify-end rounded bg-blue-500 pr-2'
                          style={{ width: `${width}%` }}
                        >
                          <span className='text-xs font-medium text-white'>{data.count}</span>
                        </div>
                      </div>
                    </div>
                    <div className='w-20 text-right text-sm text-gray-600'>
                      {formatCurrency(data.cost)}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Model Usage */}
      <div className='rounded-lg bg-white shadow'>
        <div className='border-b border-gray-200 px-6 py-4'>
          <h3 className='text-lg font-medium text-gray-900'>{t('modelUsage')}</h3>
        </div>
        <div className='p-6'>
          <div className='space-y-3'>
            {Object.entries(stats.modelUsage)
              .sort(([, a], [, b]) => b - a)
              .map(([model, count]) => {
                const percentage = (count / stats.summary.totalRequests) * 100

                return (
                  <div key={model}>
                    <div className='mb-1 flex justify-between text-sm'>
                      <span className='font-medium text-gray-700'>{model}</span>
                      <span className='text-gray-600'>
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className='h-2 w-full rounded-full bg-gray-200'>
                      <div
                        className='h-2 rounded-full bg-blue-600'
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Budget Status */}
      {stats.budgetStatus && (
        <div className='rounded-lg bg-white shadow'>
          <div className='border-b border-gray-200 px-6 py-4'>
            <h3 className='text-lg font-medium text-gray-900'>{t('budget.status')}</h3>
          </div>
          <div className='p-6'>
            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600'>{t('budget.monthlyBudget')}</span>
                <span className='font-semibold text-gray-900'>
                  {formatCurrency(stats.budgetStatus.budget)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600'>{t('budget.currentSpend')}</span>
                <span className='font-semibold text-gray-900'>
                  {formatCurrency(stats.budgetStatus.currentSpend)}
                </span>
              </div>
              <div className='flex items-center justify-between'>
                <span className='text-sm text-gray-600'>{t('budget.remaining')}</span>
                <span
                  className={`font-semibold ${stats.budgetStatus.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {formatCurrency(Math.abs(stats.budgetStatus.remaining))}
                  {stats.budgetStatus.remaining < 0 && t('budget.overBudgetSuffix')}
                </span>
              </div>

              <div className='border-t pt-4'>
                <div className='mb-2 flex justify-between text-sm'>
                  <span className='text-gray-600'>{t('budget.progress')}</span>
                  <span className='font-medium text-gray-900'>
                    {stats.budgetStatus.percentUsed.toFixed(1)}%
                  </span>
                </div>
                <div className='relative h-3 w-full overflow-hidden rounded-full bg-gray-200'>
                  <div
                    className={`h-full rounded-full transition-all ${stats.budgetStatus.isOverBudget
                      ? 'bg-red-600'
                      : stats.budgetStatus.isNearLimit
                        ? 'bg-yellow-500'
                        : 'bg-green-600'
                      }`}
                    style={{ width: `${Math.min(stats.budgetStatus.percentUsed, 100)}%` }}
                  />
                  {/* Alert threshold marker */}
                  <div
                    className='absolute top-0 bottom-0 w-0.5 bg-orange-400'
                    style={{ left: `${stats.budgetStatus.alertThreshold}%` }}
                  />
                </div>
                <p className='mt-2 text-xs text-gray-500'>
                  {t('budget.warningThreshold', { threshold: stats.budgetStatus.alertThreshold })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
