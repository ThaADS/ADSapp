'use client'

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react'
import {
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  PlusIcon,
  FunnelIcon,
  ArrowPathIcon,
  ShareIcon,
  PrinterIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

// Enhanced interfaces
interface MetricData {
  id: string
  label: string
  value: number
  previousValue?: number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  period: string
  target?: number
  unit?: string
  trend: number[]
  status: 'good' | 'warning' | 'danger' | 'neutral'
  description?: string
}

interface ChartDataPoint {
  date: string
  value: number
  label?: string
  category?: string
  metadata?: Record<string, any>
}

interface TimeSeriesData {
  id: string
  name: string
  data: ChartDataPoint[]
  color: string
  type: 'line' | 'bar' | 'area'
}

interface GeographicData {
  country: string
  countryCode: string
  value: number
  percentage: number
  coordinates: [number, number]
}

interface DeviceData {
  device: string
  icon: React.ComponentType<any>
  value: number
  percentage: number
  color: string
}

interface AlertData {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  actions?: Array<{
    label: string
    action: () => void
    style: 'primary' | 'secondary' | 'danger'
  }>
}

interface AnalyticsApiResponse {
  conversationMetrics: {
    volumeTrend: Array<{ date: string; count: number; resolved: number; pending: number }>
    peakHours: Array<{ hour: number; count: number }>
    responseTimeByHour: Array<{ hour: number; avgMinutes: number }>
    statusDistribution: Array<{ status: string; count: number }>
  }
  customerJourney: {
    touchpoints: Array<{ stage: string; count: number; conversionRate: number }>
    funnel: Array<{ stage: string; count: number; dropoff: number }>
    cohortRetention: Array<{ week: number; retention: number }>
  }
  agentPerformance: {
    leaderboard: Array<{
      agentName: string
      messagesHandled: number
      avgResponseTime: number
      satisfaction: number
    }>
    workloadDistribution: Array<{ agentName: string; workload: number }>
    productivityTrend: Array<{ date: string; productivity: number }>
  }
  campaignROI: {
    comparison: Array<{
      campaign: string
      sent: number
      opened: number
      clicked: number
      converted: number
      roi: number
    }>
    revenueByChannel: Array<{ channel: string; revenue: number }>
  }
  predictive: {
    volumeForecast: Array<{ date: string; actual?: number; forecast: number }>
    churnRisk: Array<{ segment: string; risk: number }>
  }
}

// Default empty data for fallback
const DEFAULT_deviceData: DeviceData[] = [
  { device: 'Mobile', icon: DevicePhoneMobileIcon, value: 0, percentage: 0, color: '#3b82f6' },
  { device: 'Desktop', icon: ComputerDesktopIcon, value: 0, percentage: 0, color: '#10b981' },
  { device: 'Tablet', icon: DevicePhoneMobileIcon, value: 0, percentage: 0, color: '#f59e0b' },
]

interface EnhancedAnalyticsDashboardProps {
  organizationId: string
}

// ⚡ PERFORMANCE: Memoized sparkline component
const Sparkline = memo(({
  data,
  color = '#3b82f6',
  width = 80,
  height = 24,
}: {
  data: number[]
  color?: string
  width?: number
  height?: number
}) => {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  return (
    <svg width={width} height={height} className='inline-block'>
      <polyline
        fill='none'
        stroke={color}
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        points={data
          .map((value, index) => {
            const x = (index / (data.length - 1 || 1)) * width
            const y = height - ((value - min) / range) * height
            return `${x},${y}`
          })
          .join(' ')}
      />
    </svg>
  )
})
Sparkline.displayName = 'Sparkline'

function EnhancedAnalyticsDashboardInner({
  organizationId,
}: EnhancedAnalyticsDashboardProps) {
  const [selectedDateRange, setSelectedDateRange] = useState('30d')
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'total-messages',
    'active-conversations',
    'avg-response-time',
  ])
  const [showFilters, setShowFilters] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [selectedChart, setSelectedChart] = useState<string>('messages')
  const [alerts, setAlerts] = useState<AlertData[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview', 'trends'])
  )
  const [chartViewType, setChartViewType] = useState<'combined' | 'individual'>('combined')
  const [showComparisons, setShowComparisons] = useState(true)

  // Real data state
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsApiResponse | null>(null)
  const [metrics, setMetrics] = useState<MetricData[]>([])
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([])
  const [geographicData, setGeographicData] = useState<GeographicData[]>([])
  const [deviceData, setDeviceData] = useState<DeviceData[]>(DEFAULT_deviceData)

  // Fetch real analytics data from API
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/advanced?range=${selectedDateRange}`)

      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }

      const data: AnalyticsApiResponse = await response.json()
      setAnalyticsData(data)

      // Transform API data to component format
      transformDataToMetrics(data)
      transformDataToTimeSeries(data)
      generateAlerts(data)

    } catch {
      // Analytics fetch failed - component will show loading/empty state
    } finally {
      setLoading(false)
    }
  }, [selectedDateRange])

  // Transform API data to metrics format
  const transformDataToMetrics = (data: AnalyticsApiResponse) => {
    const volumeTrend = data.conversationMetrics.volumeTrend
    const totalMessages = volumeTrend.reduce((sum, day) => sum + day.count, 0)
    const previousMessages = volumeTrend.slice(0, Math.floor(volumeTrend.length / 2))
      .reduce((sum, day) => sum + day.count, 0)
    const messageChange = previousMessages > 0
      ? ((totalMessages - previousMessages * 2) / (previousMessages * 2)) * 100
      : 0

    const statusDist = data.conversationMetrics.statusDistribution
    const activeConvs = statusDist
      .filter(s => s.status === 'open' || s.status === 'assigned')
      .reduce((sum, s) => sum + s.count, 0)

    const avgResponseTime = data.conversationMetrics.responseTimeByHour
      .reduce((sum, h) => sum + h.avgMinutes, 0) /
      Math.max(data.conversationMetrics.responseTimeByHour.length, 1)

    const agentSatisfaction = data.agentPerformance.leaderboard.length > 0
      ? data.agentPerformance.leaderboard.reduce((sum, a) => sum + a.satisfaction, 0) /
        data.agentPerformance.leaderboard.length / 2 // Scale from 10 to 5
      : 0

    const funnel = data.customerJourney.funnel
    const conversionRate = funnel.length >= 2
      ? (funnel[funnel.length - 1].count / Math.max(funnel[0].count, 1)) * 100
      : 0

    const resolvedCount = statusDist
      .filter(s => s.status === 'resolved')
      .reduce((sum, s) => sum + s.count, 0)
    const totalConvs = statusDist.reduce((sum, s) => sum + s.count, 0)
    const resolutionRate = totalConvs > 0 ? (resolvedCount / totalConvs) * 100 : 0

    const transformedMetrics: MetricData[] = [
      {
        id: 'total-messages',
        label: 'Total Messages',
        value: totalMessages,
        previousValue: previousMessages * 2,
        change: Math.abs(messageChange),
        changeType: messageChange >= 0 ? 'increase' : 'decrease',
        period: 'vs previous period',
        target: Math.round(totalMessages * 1.1),
        unit: 'messages',
        trend: volumeTrend.slice(-5).map(d => d.count),
        status: messageChange >= 0 ? 'good' : 'warning',
        description: 'Total messages sent and received across all conversations',
      },
      {
        id: 'active-conversations',
        label: 'Active Conversations',
        value: activeConvs,
        change: 0,
        changeType: 'neutral',
        period: 'current',
        target: Math.round(activeConvs * 1.2),
        unit: 'conversations',
        trend: volumeTrend.slice(-5).map(d => d.pending),
        status: activeConvs > 0 ? 'good' : 'neutral',
        description: 'Currently active conversation threads',
      },
      {
        id: 'avg-response-time',
        label: 'Avg Response Time',
        value: Math.round(avgResponseTime * 10) / 10,
        change: 0,
        changeType: 'neutral',
        period: 'minutes',
        target: 5.0,
        unit: 'minutes',
        trend: data.conversationMetrics.responseTimeByHour.slice(-5).map(h => h.avgMinutes),
        status: avgResponseTime < 5 ? 'good' : avgResponseTime < 10 ? 'warning' : 'danger',
        description: 'Average time to respond to customer messages',
      },
      {
        id: 'customer-satisfaction',
        label: 'Customer Satisfaction',
        value: Math.round(agentSatisfaction * 10) / 10,
        change: 0,
        changeType: 'neutral',
        period: 'out of 5.0',
        target: 4.5,
        unit: 'rating',
        trend: data.agentPerformance.leaderboard.slice(-5).map(a => a.satisfaction / 2),
        status: agentSatisfaction >= 4.5 ? 'good' : agentSatisfaction >= 4.0 ? 'warning' : 'danger',
        description: 'Average customer satisfaction rating',
      },
      {
        id: 'conversion-rate',
        label: 'Conversion Rate',
        value: Math.round(conversionRate * 10) / 10,
        change: 0,
        changeType: 'neutral',
        period: 'funnel completion',
        target: 15.0,
        unit: '%',
        trend: data.customerJourney.touchpoints.slice(-5).map(t => t.conversionRate),
        status: conversionRate >= 15 ? 'good' : conversionRate >= 10 ? 'warning' : 'danger',
        description: 'Percentage of conversations that result in conversions',
      },
      {
        id: 'resolution-rate',
        label: 'First Contact Resolution',
        value: Math.round(resolutionRate * 10) / 10,
        change: 0,
        changeType: 'neutral',
        period: 'resolved rate',
        target: 85.0,
        unit: '%',
        trend: data.customerJourney.cohortRetention.slice(-5).map(c => c.retention),
        status: resolutionRate >= 80 ? 'good' : resolutionRate >= 60 ? 'warning' : 'danger',
        description: 'Percentage of issues resolved on first contact',
      },
    ]

    setMetrics(transformedMetrics)
  }

  // Transform API data to time series format
  const transformDataToTimeSeries = (data: AnalyticsApiResponse) => {
    const volumeTrend = data.conversationMetrics.volumeTrend
    const productivityTrend = data.agentPerformance.productivityTrend
    const responseTimeByHour = data.conversationMetrics.responseTimeByHour

    const transformed: TimeSeriesData[] = [
      {
        id: 'messages',
        name: 'Messages',
        color: '#3b82f6',
        type: 'line',
        data: volumeTrend.map(d => ({
          date: d.date,
          value: d.count,
        })),
      },
      {
        id: 'conversations',
        name: 'New Conversations',
        color: '#10b981',
        type: 'area',
        data: volumeTrend.map(d => ({
          date: d.date,
          value: d.resolved + d.pending,
        })),
      },
      {
        id: 'response-time',
        name: 'Response Time (min)',
        color: '#f59e0b',
        type: 'bar',
        data: responseTimeByHour.map((h, i) => ({
          date: productivityTrend[i]?.date || `Hour ${h.hour}`,
          value: h.avgMinutes,
        })),
      },
    ]

    setTimeSeriesData(transformed)
  }

  // Generate alerts based on data
  const generateAlerts = (data: AnalyticsApiResponse) => {
    const newAlerts: AlertData[] = []

    // Check for high response time
    const avgResponseTime = data.conversationMetrics.responseTimeByHour
      .reduce((sum, h) => sum + h.avgMinutes, 0) /
      Math.max(data.conversationMetrics.responseTimeByHour.length, 1)

    if (avgResponseTime > 10) {
      newAlerts.push({
        id: 'response-time-alert',
        type: 'warning',
        title: 'Response Time Alert',
        message: `Average response time is ${avgResponseTime.toFixed(1)} minutes, which is above the recommended threshold`,
        timestamp: new Date(),
        isRead: false,
      })
    }

    // Check for high churn risk
    const highChurnSegments = data.predictive.churnRisk.filter(s => s.risk > 50)
    if (highChurnSegments.length > 0) {
      newAlerts.push({
        id: 'churn-risk-alert',
        type: 'error',
        title: 'High Churn Risk Detected',
        message: `${highChurnSegments.length} customer segments have churn risk above 50%`,
        timestamp: new Date(),
        isRead: false,
      })
    }

    // Check for agent satisfaction
    const avgSatisfaction = data.agentPerformance.leaderboard.length > 0
      ? data.agentPerformance.leaderboard.reduce((sum, a) => sum + a.satisfaction, 0) /
        data.agentPerformance.leaderboard.length
      : 0

    if (avgSatisfaction >= 8) {
      newAlerts.push({
        id: 'satisfaction-success',
        type: 'success',
        title: 'Goal Achieved',
        message: 'Customer satisfaction target has been exceeded!',
        timestamp: new Date(),
        isRead: false,
      })
    }

    setAlerts(newAlerts)
  }

  // Initial data fetch
  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  // Real-time data updates
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchAnalytics()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchAnalytics])

  // Filter metrics based on selection
  const filteredMetrics = useMemo(() => {
    return metrics.filter(metric => selectedMetrics.includes(metric.id))
  }, [selectedMetrics, metrics])

  // Get metric status icon and color
  const getMetricStatusIcon = (status: MetricData['status']) => {
    switch (status) {
      case 'good':
        return <CheckCircleIcon className='h-4 w-4 text-green-600' />
      case 'warning':
        return <ExclamationTriangleIcon className='h-4 w-4 text-yellow-600' />
      case 'danger':
        return <ExclamationTriangleIcon className='h-4 w-4 text-red-600' />
      default:
        return <InformationCircleIcon className='h-4 w-4 text-gray-600' />
    }
  }

  const getMetricStatusColor = (status: MetricData['status']) => {
    switch (status) {
      case 'good':
        return 'border-green-200 bg-green-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'danger':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-gray-200 bg-white'
    }
  }

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }, [])

  // Enhanced chart component
  const EnhancedChart = ({
    data,
    height = 300,
    type = 'line',
  }: {
    data: ChartDataPoint[]
    height?: number
    type?: 'line' | 'bar' | 'area'
  }) => {
    const maxValue = Math.max(...data.map(d => d.value))
    const minValue = Math.min(...data.map(d => d.value))
    const range = maxValue - minValue

    return (
      <div className='relative' style={{ height }}>
        <svg width='100%' height='100%' className='overflow-visible'>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
            <g key={index}>
              <line
                x1='0'
                y1={height * ratio}
                x2='100%'
                y2={height * ratio}
                stroke='#e5e7eb'
                strokeWidth='1'
                opacity='0.5'
              />
              <text x='10' y={height * ratio - 5} fontSize='10' fill='#6b7280'>
                {Math.round(maxValue - ratio * range)}
              </text>
            </g>
          ))}

          {/* Vertical grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
            <line
              key={index}
              x1={`${ratio * 100}%`}
              y1='0'
              x2={`${ratio * 100}%`}
              y2='100%'
              stroke='#e5e7eb'
              strokeWidth='1'
              opacity='0.3'
            />
          ))}

          {type === 'area' && (
            <defs>
              <linearGradient id='areaGradient' x1='0%' y1='0%' x2='0%' y2='100%'>
                <stop offset='0%' stopColor='#3b82f6' stopOpacity='0.3' />
                <stop offset='100%' stopColor='#3b82f6' stopOpacity='0.05' />
              </linearGradient>
            </defs>
          )}

          {type === 'area' && (
            <polygon
              fill='url(#areaGradient)'
              points={`0,${height} ${data
                .map((point, index) => {
                  const x = (index / (data.length - 1)) * 100
                  const y = height - ((point.value - minValue) / range) * height
                  return `${x}%,${y}`
                })
                .join(' ')} 100%,${height}`}
            />
          )}

          {type === 'bar' ? (
            data.map((point, index) => {
              const x = (index / data.length) * 100
              const barWidth = (100 / data.length) * 0.8
              const y = height - ((point.value - minValue) / range) * height
              const barHeight = ((point.value - minValue) / range) * height

              return (
                <rect
                  key={index}
                  x={`${x + (100 / data.length) * 0.1}%`}
                  y={y}
                  width={`${barWidth}%`}
                  height={barHeight}
                  fill='#3b82f6'
                  opacity='0.8'
                  rx='2'
                />
              )
            })
          ) : (
            <polyline
              fill='none'
              stroke='#3b82f6'
              strokeWidth='3'
              strokeLinecap='round'
              strokeLinejoin='round'
              points={data
                .map((point, index) => {
                  const x = (index / (data.length - 1)) * 100
                  const y = height - ((point.value - minValue) / range) * height
                  return `${x}%,${y}`
                })
                .join(' ')}
            />
          )}

          {/* Data points */}
          {type !== 'bar' &&
            data.map((point, index) => {
              const x = (index / (data.length - 1)) * 100
              const y = height - ((point.value - minValue) / range) * height
              return (
                <circle
                  key={index}
                  cx={`${x}%`}
                  cy={y}
                  r='4'
                  fill='#3b82f6'
                  className='hover:r-6 cursor-pointer transition-all'
                  onMouseEnter={e => {
                    // Show tooltip
                    const tooltip = document.getElementById('chart-tooltip')
                    if (tooltip) {
                      tooltip.style.display = 'block'
                      tooltip.style.left = `${x}%`
                      tooltip.style.top = `${y - 40}px`
                      tooltip.textContent = `${point.value} (${point.date})`
                    }
                  }}
                  onMouseLeave={() => {
                    const tooltip = document.getElementById('chart-tooltip')
                    if (tooltip) {
                      tooltip.style.display = 'none'
                    }
                  }}
                />
              )
            })}
        </svg>

        {/* Tooltip */}
        <div
          id='chart-tooltip'
          className='pointer-events-none absolute rounded bg-gray-800 px-2 py-1 text-xs text-white'
          style={{ display: 'none', transform: 'translateX(-50%)' }}
        />

        {/* X-axis labels */}
        <div className='absolute right-0 bottom-0 left-0 mt-2 flex justify-between text-xs text-gray-500'>
          {data
            .filter((_, index) => index % Math.ceil(data.length / 5) === 0)
            .map((point, index) => (
              <span key={index}>{new Date(point.date).toLocaleDateString()}</span>
            ))}
        </div>
      </div>
    )
  }

  // Loading state
  if (loading && metrics.length === 0) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600'></div>
          <p className='mt-4 text-gray-600'>Loading analytics data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='border-b border-gray-200 bg-white'>
        <div className='px-6 py-4'>
          <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between'>
            <div className='flex items-center space-x-4'>
              <h1 className='text-2xl font-bold text-gray-900'>Enhanced Analytics</h1>
              <div className='flex items-center space-x-2'>
                <CalendarIcon className='h-5 w-5 text-gray-400' />
                <select
                  value={selectedDateRange}
                  onChange={e => setSelectedDateRange(e.target.value)}
                  className='rounded-md border border-gray-300 px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
                  aria-label='Select date range'
                >
                  <option value='1d'>Last 24 hours</option>
                  <option value='7d'>Last 7 days</option>
                  <option value='30d'>Last 30 days</option>
                  <option value='90d'>Last 90 days</option>
                  <option value='custom'>Custom range</option>
                </select>
              </div>
            </div>

            <div className='mt-4 flex items-center space-x-3 lg:mt-0'>
              {/* Auto-refresh toggle */}
              <div className='flex items-center space-x-2'>
                <label className='flex items-center'>
                  <input
                    type='checkbox'
                    checked={autoRefresh}
                    onChange={e => setAutoRefresh(e.target.checked)}
                    className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                  />
                  <span className='ml-2 text-sm text-gray-700'>Auto-refresh</span>
                </label>
                {autoRefresh && (
                  <select
                    value={refreshInterval}
                    onChange={e => setRefreshInterval(Number(e.target.value))}
                    className='rounded-md border border-gray-300 px-2 py-1 text-xs'
                  >
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                    <option value={300}>5m</option>
                  </select>
                )}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                  showFilters
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FunnelIcon className='mr-2 h-4 w-4' />
                Filters
              </button>

              <button className='flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'>
                <DocumentArrowDownIcon className='mr-2 h-4 w-4' />
                Export
              </button>

              <button className='flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700'>
                <ArrowPathIcon className='mr-2 h-4 w-4' />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className='mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    Metrics to Display
                  </label>
                  <div className='space-y-1'>
                    {metrics.map(metric => (
                      <label key={metric.id} className='flex items-center'>
                        <input
                          type='checkbox'
                          checked={selectedMetrics.includes(metric.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedMetrics(prev => [...prev, metric.id])
                            } else {
                              setSelectedMetrics(prev => prev.filter(id => id !== metric.id))
                            }
                          }}
                          className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                        />
                        <span className='ml-2 text-sm text-gray-700'>{metric.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>Chart Type</label>
                  <select
                    value={chartViewType}
                    onChange={e => setChartViewType(e.target.value as any)}
                    className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm'
                  >
                    <option value='combined'>Combined View</option>
                    <option value='individual'>Individual Charts</option>
                  </select>

                  <label className='mt-3 flex items-center'>
                    <input
                      type='checkbox'
                      checked={showComparisons}
                      onChange={e => setShowComparisons(e.target.checked)}
                      className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                    />
                    <span className='ml-2 text-sm text-gray-700'>Show Comparisons</span>
                  </label>
                </div>

                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    Alert Filters
                  </label>
                  <div className='space-y-1'>
                    {['info', 'warning', 'error', 'success'].map(type => (
                      <label key={type} className='flex items-center'>
                        <input
                          type='checkbox'
                          defaultChecked
                          className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                        />
                        <span className='ml-2 text-sm text-gray-700 capitalize'>{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className='p-6'>
        {/* Alerts Section */}
        {alerts.filter(alert => !alert.isRead).length > 0 && (
          <div className='mb-6'>
            <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
              <button
                onClick={() => toggleSection('alerts')}
                className='flex w-full items-center justify-between p-4 text-left'
              >
                <h2 className='text-lg font-medium text-gray-900'>Active Alerts</h2>
                {expandedSections.has('alerts') ? (
                  <ChevronUpIcon className='h-5 w-5 text-gray-400' />
                ) : (
                  <ChevronDownIcon className='h-5 w-5 text-gray-400' />
                )}
              </button>

              {expandedSections.has('alerts') && (
                <div className='px-4 pb-4'>
                  <div className='space-y-3'>
                    {alerts
                      .filter(alert => !alert.isRead)
                      .map(alert => (
                        <div
                          key={alert.id}
                          className={`rounded-lg border-l-4 p-4 ${
                            alert.type === 'error'
                              ? 'border-red-500 bg-red-50'
                              : alert.type === 'warning'
                                ? 'border-yellow-500 bg-yellow-50'
                                : alert.type === 'success'
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-blue-500 bg-blue-50'
                          }`}
                        >
                          <div className='flex items-start justify-between'>
                            <div className='flex-1'>
                              <h4 className='font-medium text-gray-900'>{alert.title}</h4>
                              <p className='mt-1 text-sm text-gray-600'>{alert.message}</p>
                              <p className='mt-2 text-xs text-gray-500'>
                                {alert.timestamp.toLocaleString()}
                              </p>
                            </div>

                            {alert.actions && (
                              <div className='ml-4 flex items-center space-x-2'>
                                {alert.actions.map((action, index) => (
                                  <button
                                    key={index}
                                    onClick={action.action}
                                    className={`rounded px-3 py-1 text-xs font-medium ${
                                      action.style === 'primary'
                                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                                        : action.style === 'danger'
                                          ? 'bg-red-600 text-white hover:bg-red-700'
                                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overview Metrics */}
        <div className='mb-6'>
          <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
            <button
              onClick={() => toggleSection('overview')}
              className='flex w-full items-center justify-between p-4 text-left'
            >
              <h2 className='text-lg font-medium text-gray-900'>Key Metrics Overview</h2>
              {expandedSections.has('overview') ? (
                <ChevronUpIcon className='h-5 w-5 text-gray-400' />
              ) : (
                <ChevronDownIcon className='h-5 w-5 text-gray-400' />
              )}
            </button>

            {expandedSections.has('overview') && (
              <div className='p-4'>
                <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
                  {filteredMetrics.map(metric => (
                    <div
                      key={metric.id}
                      className={`rounded-lg border-2 p-6 ${getMetricStatusColor(metric.status)}`}
                    >
                      <div className='mb-4 flex items-center justify-between'>
                        <div className='flex items-center space-x-2'>
                          {getMetricStatusIcon(metric.status)}
                          <h3 className='text-sm font-medium text-gray-700'>{metric.label}</h3>
                        </div>
                        <Sparkline
                          data={metric.trend}
                          color={
                            metric.status === 'good'
                              ? '#10b981'
                              : metric.status === 'danger'
                                ? '#ef4444'
                                : '#f59e0b'
                          }
                        />
                      </div>

                      <div className='mb-4'>
                        <div className='flex items-baseline space-x-2'>
                          <span className='text-3xl font-bold text-gray-900'>
                            {typeof metric.value === 'number'
                              ? metric.value.toLocaleString()
                              : metric.value}
                          </span>
                          {metric.unit && (
                            <span className='text-sm text-gray-500'>{metric.unit}</span>
                          )}
                        </div>

                        {showComparisons && metric.previousValue && (
                          <div className='mt-1 text-xs text-gray-500'>
                            vs {metric.previousValue.toLocaleString()} {metric.period}
                          </div>
                        )}
                      </div>

                      <div className='flex items-center justify-between'>
                        <div
                          className={`flex items-center space-x-1 ${
                            metric.changeType === 'increase'
                              ? 'text-green-600'
                              : metric.changeType === 'decrease'
                                ? 'text-red-600'
                                : 'text-gray-600'
                          }`}
                        >
                          {metric.changeType === 'increase' ? (
                            <TrendingUpIcon className='h-4 w-4' />
                          ) : metric.changeType === 'decrease' ? (
                            <TrendingDownIcon className='h-4 w-4' />
                          ) : (
                            <MinusIcon className='h-4 w-4' />
                          )}
                          <span className='text-sm font-medium'>{Math.abs(metric.change)}%</span>
                        </div>

                        {metric.target && (
                          <div className='text-xs text-gray-500'>
                            Target: {metric.target.toLocaleString()}
                            {metric.unit && ` ${metric.unit}`}
                          </div>
                        )}
                      </div>

                      {metric.target && (
                        <div className='mt-3'>
                          <div className='mb-1 flex items-center justify-between text-xs text-gray-500'>
                            <span>Progress to target</span>
                            <span>{Math.round((metric.value / metric.target) * 100)}%</span>
                          </div>
                          <div className='h-2 w-full rounded-full bg-gray-200'>
                            <div
                              className={`h-2 rounded-full ${
                                metric.value >= metric.target
                                  ? 'bg-green-500'
                                  : metric.value >= metric.target * 0.8
                                    ? 'bg-yellow-500'
                                    : 'bg-red-500'
                              }`}
                              style={{
                                width: `${Math.min((metric.value / metric.target) * 100, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {metric.description && (
                        <p className='mt-3 text-xs text-gray-600'>{metric.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trends Section */}
        <div className='mb-6'>
          <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
            <button
              onClick={() => toggleSection('trends')}
              className='flex w-full items-center justify-between p-4 text-left'
            >
              <h2 className='text-lg font-medium text-gray-900'>Trends & Analytics</h2>
              {expandedSections.has('trends') ? (
                <ChevronUpIcon className='h-5 w-5 text-gray-400' />
              ) : (
                <ChevronDownIcon className='h-5 w-5 text-gray-400' />
              )}
            </button>

            {expandedSections.has('trends') && (
              <div className='p-4'>
                <div className='mb-4 flex items-center space-x-4'>
                  <select
                    value={selectedChart}
                    onChange={e => setSelectedChart(e.target.value)}
                    className='rounded-md border border-gray-300 px-3 py-2 text-sm'
                  >
                    {timeSeriesData.map(series => (
                      <option key={series.id} value={series.id}>
                        {series.name}
                      </option>
                    ))}
                  </select>

                  <div className='flex items-center space-x-2'>
                    {timeSeriesData.map(series => (
                      <button
                        key={series.id}
                        onClick={() => setSelectedChart(series.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${
                          selectedChart === series.id
                            ? 'border-blue-300 bg-blue-100 text-blue-700'
                            : 'border-gray-300 bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {series.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className='h-80'>
                  <EnhancedChart
                    data={timeSeriesData.find(s => s.id === selectedChart)?.data || []}
                    height={300}
                    type={timeSeriesData.find(s => s.id === selectedChart)?.type || 'line'}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Geographic & Device Analytics */}
        <div className='mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2'>
          {/* Geographic Distribution */}
          <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
            <button
              onClick={() => toggleSection('geographic')}
              className='flex w-full items-center justify-between p-4 text-left'
            >
              <h2 className='text-lg font-medium text-gray-900'>Geographic Distribution</h2>
              {expandedSections.has('geographic') ? (
                <ChevronUpIcon className='h-5 w-5 text-gray-400' />
              ) : (
                <ChevronDownIcon className='h-5 w-5 text-gray-400' />
              )}
            </button>

            {expandedSections.has('geographic') && (
              <div className='p-4'>
                {geographicData.length === 0 ? (
                  <div className='py-8 text-center text-gray-500'>
                    <MapPinIcon className='mx-auto h-12 w-12 text-gray-300' />
                    <p className='mt-2'>Geographic data is not available yet.</p>
                    <p className='text-sm'>This feature requires additional tracking setup.</p>
                  </div>
                ) : (
                <div className='space-y-3'>
                  {geographicData.map(country => (
                    <div key={country.countryCode} className='flex items-center justify-between'>
                      <div className='flex items-center space-x-3'>
                        <MapPinIcon className='h-4 w-4 text-gray-400' />
                        <span className='text-sm font-medium text-gray-900'>{country.country}</span>
                      </div>
                      <div className='flex items-center space-x-3'>
                        <div className='h-2 w-24 rounded-full bg-gray-200'>
                          <div
                            className='h-2 rounded-full bg-blue-600'
                            style={{ width: `${country.percentage}%` }}
                          />
                        </div>
                        <span className='w-16 text-right text-sm text-gray-600'>
                          {country.value.toLocaleString()}
                        </span>
                        <span className='w-12 text-right text-xs text-gray-500'>
                          {country.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            )}
          </div>

          {/* Device Analytics */}
          <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
            <button
              onClick={() => toggleSection('devices')}
              className='flex w-full items-center justify-between p-4 text-left'
            >
              <h2 className='text-lg font-medium text-gray-900'>Device Analytics</h2>
              {expandedSections.has('devices') ? (
                <ChevronUpIcon className='h-5 w-5 text-gray-400' />
              ) : (
                <ChevronDownIcon className='h-5 w-5 text-gray-400' />
              )}
            </button>

            {expandedSections.has('devices') && (
              <div className='p-4'>
                <div className='space-y-4'>
                  {deviceData.map(device => {
                    const IconComponent = device.icon
                    return (
                      <div key={device.device} className='flex items-center justify-between'>
                        <div className='flex items-center space-x-3'>
                          <div
                            className='rounded-lg p-2'
                            style={{ backgroundColor: `${device.color}20` }}
                          >
                            <IconComponent className='h-5 w-5' style={{ color: device.color }} />
                          </div>
                          <span className='text-sm font-medium text-gray-900'>{device.device}</span>
                        </div>
                        <div className='flex items-center space-x-3'>
                          <div className='h-3 w-32 rounded-full bg-gray-200'>
                            <div
                              className='h-3 rounded-full'
                              style={{
                                backgroundColor: device.color,
                                width: `${device.percentage}%`,
                              }}
                            />
                          </div>
                          <span className='w-16 text-right text-sm text-gray-600'>
                            {device.value.toLocaleString()}
                          </span>
                          <span className='w-12 text-right text-xs text-gray-500'>
                            {device.percentage}%
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className='mt-6 rounded-lg bg-gray-50 p-4'>
                  <h4 className='mb-2 text-sm font-medium text-gray-900'>Device Insights</h4>
                  <ul className='space-y-1 text-xs text-gray-600'>
                    <li>• Mobile usage has increased 15% this month</li>
                    <li>• Desktop users have higher conversion rates (18% vs 12%)</li>
                    <li>• Tablet usage peaks during weekend hours</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ⚡ PERFORMANCE: Memoize the entire dashboard component
const EnhancedAnalyticsDashboard = memo(EnhancedAnalyticsDashboardInner)
EnhancedAnalyticsDashboard.displayName = 'EnhancedAnalyticsDashboard'

export default EnhancedAnalyticsDashboard
