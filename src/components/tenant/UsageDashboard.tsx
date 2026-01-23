/**
 * Usage Dashboard Component
 *
 * Comprehensive usage monitoring interface with:
 * - Real-time usage metrics
 * - Usage history charts
 * - Limit management
 * - Alert configuration
 * - Export functionality
 */

'use client'

import React, { useState, useEffect } from 'react'
import { usageUtils } from '@/lib/usage-tracking'

interface UsageDashboardProps {
  organizationId: string
  className?: string
}

interface UsageMetrics {
  api_calls_total: number
  messages_sent: number
  messages_received: number
  storage_used: number
  bandwidth_in: number
  bandwidth_out: number
  contacts_total: number
  conversations_total: number
}

interface UsageLimit {
  id: string
  limit_type: string
  period_type: string
  soft_limit?: number
  hard_limit?: number
  current_usage: number
  alert_threshold_percentage: number
  is_active: boolean
}

interface UsageAlert {
  limitType: string
  currentUsage: number
  limit: number
  percentage: number
  alertType: 'warning' | 'critical' | 'exceeded'
  message: string
}

export default function UsageDashboard({ organizationId, className = '' }: UsageDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'limits' | 'alerts'>(
    'overview'
  )
  const [currentUsage, setCurrentUsage] = useState<UsageMetrics | null>(null)
  const [usageLimits, setUsageLimits] = useState<UsageLimit[]>([])
  const [usageAlerts, setUsageAlerts] = useState<UsageAlert[]>([])
  const [usageHistory, setUsageHistory] = useState<UsageMetrics[]>([])
  const [realTimeStats, setRealTimeStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly')

  useEffect(() => {
    loadUsageData()
    const interval = setInterval(loadRealTimeStats, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [organizationId, period])

  const loadUsageData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Load current usage
      const currentResponse = await fetch(`/api/tenant/usage?type=current&period=${period}`)
      if (currentResponse.ok) {
        const currentResult = await currentResponse.json()
        setCurrentUsage(currentResult.data)
      }

      // Load usage limits
      const limitsResponse = await fetch('/api/tenant/usage/limits')
      if (limitsResponse.ok) {
        const limitsResult = await limitsResponse.json()
        setUsageLimits(limitsResult.data)
      }

      // Load alerts
      const alertsResponse = await fetch('/api/tenant/usage?type=alerts')
      if (alertsResponse.ok) {
        const alertsResult = await alertsResponse.json()
        setUsageAlerts(alertsResult.data)
      }

      // Load usage history
      const historyResponse = await fetch('/api/tenant/usage?type=history&days=30')
      if (historyResponse.ok) {
        const historyResult = await historyResponse.json()
        setUsageHistory(historyResult.data)
      }

      loadRealTimeStats()
    } catch (error) {
      setError('Failed to load usage data')
      console.error('Error loading usage data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadRealTimeStats = async () => {
    try {
      const response = await fetch('/api/tenant/usage?type=realtime')
      if (response.ok) {
        const result = await response.json()
        setRealTimeStats(result.data)
      }
    } catch (error) {
      console.error('Error loading real-time stats:', error)
    }
  }

  const handleCreateLimit = async (limitData: {
    limitType: string
    periodType: string
    softLimit?: number
    hardLimit?: number
    alertThreshold?: number
  }) => {
    try {
      const response = await fetch('/api/tenant/usage/limits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(limitData),
      })

      if (!response.ok) {
        throw new Error('Failed to create usage limit')
      }

      const result = await response.json()
      setUsageLimits(prev => [...prev, result.data])
    } catch (error) {
      setError('Failed to create usage limit')
    }
  }

  const exportUsageData = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)
      const endDate = new Date()

      const response = await fetch(
        `/api/tenant/usage/export?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&format=${format}`
      )

      if (!response.ok) {
        throw new Error('Failed to export usage data')
      }

      const data = await response.text()
      const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `usage-data-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      setError('Failed to export usage data')
    }
  }

  if (isLoading) {
    return (
      <div className={`usage-dashboard ${className}`}>
        <div className='flex h-64 items-center justify-center'>
          <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600'></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`usage-dashboard ${className}`}>
      {/* Header */}
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900'>Usage Dashboard</h2>
          <p className='text-gray-600'>Monitor your resource usage and manage limits</p>
        </div>
        <div className='flex items-center space-x-3'>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as any)}
            className='rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500'
          >
            <option value='daily'>Daily</option>
            <option value='weekly'>Weekly</option>
            <option value='monthly'>Monthly</option>
          </select>
          <button
            onClick={() => exportUsageData('csv')}
            className='rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-50'
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className='mb-6 rounded-lg border border-red-200 bg-red-50 p-4'>
          <p className='text-red-800'>{error}</p>
        </div>
      )}

      {/* Alerts */}
      {usageAlerts.length > 0 && (
        <div className='mb-6 space-y-3'>
          {usageAlerts.map((alert, index) => (
            <div
              key={index}
              className={`rounded-lg border p-4 ${
                alert.alertType === 'exceeded'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : alert.alertType === 'critical'
                    ? 'border-orange-200 bg-orange-50 text-orange-800'
                    : 'border-yellow-200 bg-yellow-50 text-yellow-800'
              }`}
            >
              <div className='flex items-center justify-between'>
                <div>
                  <h4 className='font-medium'>{alert.message}</h4>
                  <p className='text-sm'>
                    {alert.currentUsage.toLocaleString()} / {alert.limit.toLocaleString()} (
                    {alert.percentage.toFixed(1)}%)
                  </p>
                </div>
                <div className='text-right'>
                  <span className='text-lg font-bold'>{alert.percentage.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Real-time Stats */}
      {realTimeStats && (
        <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-4'>
          <RealTimeStatCard
            title='API Calls (Last Hour)'
            value={realTimeStats.apiCallsLastHour}
            icon='api'
          />
          <RealTimeStatCard
            title='Messages (Last Hour)'
            value={realTimeStats.messagesLastHour}
            icon='message'
          />
          <RealTimeStatCard
            title='Active Connections'
            value={realTimeStats.activeConnections}
            icon='connection'
          />
          <RealTimeStatCard
            title='Response Time'
            value={`${realTimeStats.responseTime}ms`}
            icon='performance'
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div className='mb-6 flex space-x-1 border-b border-gray-200'>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'history', label: 'History' },
          { id: 'limits', label: 'Limits' },
          { id: 'alerts', label: 'Alerts' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className='rounded-lg border border-gray-200 bg-white'>
        {activeTab === 'overview' && (
          <OverviewTab currentUsage={currentUsage} usageLimits={usageLimits} period={period} />
        )}

        {activeTab === 'history' && <HistoryTab usageHistory={usageHistory} period={period} />}

        {activeTab === 'limits' && (
          <LimitsTab usageLimits={usageLimits} onCreateLimit={handleCreateLimit} />
        )}

        {activeTab === 'alerts' && (
          <AlertsTab usageAlerts={usageAlerts} usageLimits={usageLimits} />
        )}
      </div>
    </div>
  )
}

// Real-time Stat Card Component
function RealTimeStatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: string | number
  icon: string
}) {
  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'api':
        return (
          <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
            />
          </svg>
        )
      case 'message':
        return (
          <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
            />
          </svg>
        )
      case 'connection':
        return (
          <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
            />
          </svg>
        )
      case 'performance':
        return (
          <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M13 10V3L4 14h7v7l9-11h-7z'
            />
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className='rounded-lg border border-gray-200 bg-white p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm font-medium text-gray-600'>{title}</p>
          <p className='text-2xl font-bold text-gray-900'>{value}</p>
        </div>
        <div className='text-blue-600'>{getIcon(icon)}</div>
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab({
  currentUsage,
  usageLimits,
  period,
}: {
  currentUsage: UsageMetrics | null
  usageLimits: UsageLimit[]
  period: string
}) {
  if (!currentUsage) {
    return (
      <div className='p-8 text-center'>
        <p className='text-gray-500'>No usage data available for the selected period.</p>
      </div>
    )
  }

  const usageItems = [
    {
      label: 'API Calls',
      value: currentUsage.api_calls_total,
      type: 'api_calls',
      icon: 'api',
    },
    {
      label: 'Messages Sent',
      value: currentUsage.messages_sent,
      type: 'messages',
      icon: 'message',
    },
    {
      label: 'Messages Received',
      value: currentUsage.messages_received,
      type: 'messages',
      icon: 'message',
    },
    {
      label: 'Storage Used',
      value: usageUtils.formatBytes(currentUsage.storage_used),
      type: 'storage',
      icon: 'storage',
    },
    {
      label: 'Bandwidth In',
      value: usageUtils.formatBytes(currentUsage.bandwidth_in),
      type: 'bandwidth',
      icon: 'bandwidth',
    },
    {
      label: 'Bandwidth Out',
      value: usageUtils.formatBytes(currentUsage.bandwidth_out),
      type: 'bandwidth',
      icon: 'bandwidth',
    },
    {
      label: 'Total Contacts',
      value: currentUsage.contacts_total,
      type: 'contacts',
      icon: 'contacts',
    },
    {
      label: 'Total Conversations',
      value: currentUsage.conversations_total,
      type: 'conversations',
      icon: 'conversations',
    },
  ]

  return (
    <div className='p-6'>
      <div className='mb-6'>
        <h3 className='mb-2 text-lg font-medium text-gray-900'>Current Usage ({period})</h3>
        <p className='text-gray-600'>
          Your usage statistics for the current {period.toLowerCase()} period.
        </p>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
        {usageItems.map((item, index) => {
          const limit = usageLimits.find(l => l.limit_type === item.type)
          let percentage = 0
          let statusColor = 'gray'

          if (limit && limit.soft_limit) {
            const numericValue = typeof item.value === 'string' ? 0 : item.value
            percentage = usageUtils.calculateUsagePercentage(numericValue, limit.soft_limit)
            statusColor = usageUtils.getUsageStatusColor(percentage)
          }

          return (
            <div key={index} className='rounded-lg border border-gray-200 bg-white p-4'>
              <div className='mb-2 flex items-center justify-between'>
                <p className='text-sm font-medium text-gray-600'>{item.label}</p>
                {limit && (
                  <span
                    className={`rounded-full px-2 py-1 text-xs bg-${statusColor}-100 text-${statusColor}-800`}
                  >
                    {percentage.toFixed(0)}%
                  </span>
                )}
              </div>
              <p className='text-2xl font-bold text-gray-900'>{item.value}</p>
              {limit && (
                <div className='mt-2'>
                  <div className='mb-1 flex justify-between text-xs text-gray-500'>
                    <span>Used</span>
                    <span>Limit: {limit.soft_limit?.toLocaleString()}</span>
                  </div>
                  <div className='h-2 w-full rounded-full bg-gray-200'>
                    <div
                      className={`h-2 rounded-full bg-${statusColor}-500`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// History Tab Component
function HistoryTab({ usageHistory, period }: { usageHistory: UsageMetrics[]; period: string }) {
  // This would typically use a charting library like Chart.js or Recharts
  return (
    <div className='p-6'>
      <div className='mb-6'>
        <h3 className='mb-2 text-lg font-medium text-gray-900'>Usage History</h3>
        <p className='text-gray-600'>Historical usage data over the last 30 days.</p>
      </div>

      {usageHistory.length === 0 ? (
        <div className='py-8 text-center'>
          <p className='text-gray-500'>No historical data available.</p>
        </div>
      ) : (
        <div className='space-y-6'>
          {/* Simple table view - replace with charts in production */}
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    Date
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    API Calls
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    Messages
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    Storage
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    Bandwidth
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white'>
                {usageHistory.slice(-10).map((usage, index) => (
                  <tr key={index}>
                    <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-900'>
                      {new Date(usage.metric_date).toLocaleDateString()}
                    </td>
                    <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-900'>
                      {usage.api_calls_total.toLocaleString()}
                    </td>
                    <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-900'>
                      {(usage.messages_sent + usage.messages_received).toLocaleString()}
                    </td>
                    <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-900'>
                      {usageUtils.formatBytes(usage.storage_used)}
                    </td>
                    <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-900'>
                      {usageUtils.formatBytes(usage.bandwidth_in + usage.bandwidth_out)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// Limits Tab Component
function LimitsTab({
  usageLimits,
  onCreateLimit,
}: {
  usageLimits: UsageLimit[]
  onCreateLimit: (data: any) => void
}) {
  const [showAddLimit, setShowAddLimit] = useState(false)

  return (
    <div className='p-6'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h3 className='mb-2 text-lg font-medium text-gray-900'>Usage Limits</h3>
          <p className='text-gray-600'>
            Configure usage limits and thresholds for your organization.
          </p>
        </div>
        <button
          onClick={() => setShowAddLimit(true)}
          className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
        >
          Add Limit
        </button>
      </div>

      {usageLimits.length === 0 ? (
        <div className='py-8 text-center'>
          <p className='mb-4 text-gray-500'>No usage limits configured.</p>
          <button
            onClick={() => setShowAddLimit(true)}
            className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
          >
            Create Your First Limit
          </button>
        </div>
      ) : (
        <div className='space-y-4'>
          {usageLimits.map(limit => (
            <div key={limit.id} className='rounded-lg border border-gray-200 p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <h4 className='font-medium text-gray-900 capitalize'>
                    {limit.limit_type.replace('_', ' ')} ({limit.period_type})
                  </h4>
                  <div className='mt-1 flex items-center space-x-4 text-sm text-gray-600'>
                    <span>Soft Limit: {limit.soft_limit?.toLocaleString() || 'None'}</span>
                    <span>Hard Limit: {limit.hard_limit?.toLocaleString() || 'None'}</span>
                    <span>Alert at: {limit.alert_threshold_percentage}%</span>
                  </div>
                </div>
                <div className='text-right'>
                  <p className='text-lg font-bold text-gray-900'>
                    {limit.current_usage.toLocaleString()}
                  </p>
                  <p className='text-sm text-gray-600'>Current Usage</p>
                </div>
              </div>

              {limit.soft_limit && (
                <div className='mt-3'>
                  <div className='mb-1 flex justify-between text-xs text-gray-500'>
                    <span>Progress</span>
                    <span>
                      {usageUtils
                        .calculateUsagePercentage(limit.current_usage, limit.soft_limit)
                        .toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className='h-2 w-full rounded-full bg-gray-200'>
                    <div
                      className={`h-2 rounded-full ${
                        usageUtils.calculateUsagePercentage(limit.current_usage, limit.soft_limit) >
                        80
                          ? 'bg-red-500'
                          : usageUtils.calculateUsagePercentage(
                                limit.current_usage,
                                limit.soft_limit
                              ) > 60
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          usageUtils.calculateUsagePercentage(
                            limit.current_usage,
                            limit.soft_limit
                          ),
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddLimit && (
        <AddLimitModal
          onClose={() => setShowAddLimit(false)}
          onAdd={data => {
            onCreateLimit(data)
            setShowAddLimit(false)
          }}
        />
      )}
    </div>
  )
}

// Alerts Tab Component
function AlertsTab({
  usageAlerts,
  usageLimits,
}: {
  usageAlerts: UsageAlert[]
  usageLimits: UsageLimit[]
}) {
  return (
    <div className='p-6'>
      <div className='mb-6'>
        <h3 className='mb-2 text-lg font-medium text-gray-900'>Usage Alerts</h3>
        <p className='text-gray-600'>Current alerts and notifications about your usage.</p>
      </div>

      {usageAlerts.length === 0 ? (
        <div className='py-8 text-center'>
          <div className='mb-4 text-green-600'>
            <svg
              className='mx-auto h-12 w-12'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <h3 className='mb-2 text-lg font-medium text-gray-900'>All Good!</h3>
          <p className='text-gray-600'>No active alerts. Your usage is within configured limits.</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {usageAlerts.map((alert, index) => (
            <div
              key={index}
              className={`rounded-lg border p-4 ${
                alert.alertType === 'exceeded'
                  ? 'border-red-200 bg-red-50'
                  : alert.alertType === 'critical'
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-yellow-200 bg-yellow-50'
              }`}
            >
              <div className='flex items-start space-x-3'>
                <div
                  className={`flex-shrink-0 ${
                    alert.alertType === 'exceeded'
                      ? 'text-red-600'
                      : alert.alertType === 'critical'
                        ? 'text-orange-600'
                        : 'text-yellow-600'
                  }`}
                >
                  <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20'>
                    <path
                      fillRule='evenodd'
                      d='M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                </div>
                <div className='flex-1'>
                  <h4
                    className={`font-medium ${
                      alert.alertType === 'exceeded'
                        ? 'text-red-800'
                        : alert.alertType === 'critical'
                          ? 'text-orange-800'
                          : 'text-yellow-800'
                    }`}
                  >
                    {alert.message}
                  </h4>
                  <p
                    className={`mt-1 text-sm ${
                      alert.alertType === 'exceeded'
                        ? 'text-red-700'
                        : alert.alertType === 'critical'
                          ? 'text-orange-700'
                          : 'text-yellow-700'
                    }`}
                  >
                    Current usage: {alert.currentUsage.toLocaleString()} /{' '}
                    {alert.limit.toLocaleString()} ({alert.percentage.toFixed(1)}%)
                  </p>
                </div>
                <div
                  className={`text-right ${
                    alert.alertType === 'exceeded'
                      ? 'text-red-800'
                      : alert.alertType === 'critical'
                        ? 'text-orange-800'
                        : 'text-yellow-800'
                  }`}
                >
                  <span className='text-lg font-bold'>{alert.percentage.toFixed(0)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Add Limit Modal Component
function AddLimitModal({ onClose, onAdd }: { onClose: () => void; onAdd: (data: any) => void }) {
  const [limitType, setLimitType] = useState('api_calls')
  const [periodType, setPeriodType] = useState('monthly')
  const [softLimit, setSoftLimit] = useState('')
  const [hardLimit, setHardLimit] = useState('')
  const [alertThreshold, setAlertThreshold] = useState('80')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd({
      limitType,
      periodType,
      softLimit: softLimit ? parseInt(softLimit) : undefined,
      hardLimit: hardLimit ? parseInt(hardLimit) : undefined,
      alertThreshold: parseInt(alertThreshold),
    })
  }

  return (
    <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black'>
      <div className='mx-4 w-full max-w-md rounded-lg bg-white p-6'>
        <div className='mb-6 flex items-center justify-between'>
          <h3 className='text-lg font-medium text-gray-900'>Add Usage Limit</h3>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600'>
            <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M6 18L18 6M6 6l12 12'
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>Limit Type</label>
            <select
              value={limitType}
              onChange={e => setLimitType(e.target.value)}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500'
            >
              <option value='api_calls'>API Calls</option>
              <option value='messages'>Messages</option>
              <option value='storage'>Storage (bytes)</option>
              <option value='bandwidth'>Bandwidth (bytes)</option>
              <option value='contacts'>Contacts</option>
              <option value='users'>Users</option>
            </select>
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>Period</label>
            <select
              value={periodType}
              onChange={e => setPeriodType(e.target.value)}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500'
            >
              <option value='daily'>Daily</option>
              <option value='weekly'>Weekly</option>
              <option value='monthly'>Monthly</option>
              <option value='yearly'>Yearly</option>
            </select>
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>
              Soft Limit (Warning)
            </label>
            <input
              type='number'
              value={softLimit}
              onChange={e => setSoftLimit(e.target.value)}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500'
              placeholder='10000'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>
              Hard Limit (Block)
            </label>
            <input
              type='number'
              value={hardLimit}
              onChange={e => setHardLimit(e.target.value)}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500'
              placeholder='12000'
            />
          </div>

          <div>
            <label className='mb-2 block text-sm font-medium text-gray-700'>
              Alert Threshold (%)
            </label>
            <input
              type='number'
              min='1'
              max='100'
              value={alertThreshold}
              onChange={e => setAlertThreshold(e.target.value)}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500'
            />
          </div>

          <div className='flex items-center justify-end space-x-3 pt-4'>
            <button
              type='button'
              onClick={onClose}
              className='rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50'
            >
              Cancel
            </button>
            <button
              type='submit'
              className='rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700'
            >
              Add Limit
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
