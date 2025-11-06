'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
} from '@heroicons/react/24/outline'

// Mock data interfaces
interface MetricData {
  label: string
  value: number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  period: string
}

interface ChartDataPoint {
  date: string
  value: number
  label?: string
}

interface ConversationData {
  id: string
  contact: string
  messages: number
  lastActivity: string
  status: 'active' | 'resolved' | 'pending'
  assignee: string
}

interface DashboardWidget {
  id: string
  type: 'metric' | 'chart' | 'table' | 'funnel'
  title: string
  size: 'small' | 'medium' | 'large'
  position: { x: number; y: number }
  data: any
  config: Record<string, any>
}

// Sample data
const SAMPLE_METRICS: MetricData[] = [
  {
    label: 'Total Messages',
    value: 12847,
    change: 12.5,
    changeType: 'increase',
    period: 'vs last month',
  },
  {
    label: 'Active Conversations',
    value: 324,
    change: -3.2,
    changeType: 'decrease',
    period: 'vs last week',
  },
  {
    label: 'Response Time',
    value: 2.4,
    change: 8.1,
    changeType: 'decrease',
    period: 'minutes avg',
  },
  {
    label: 'Customer Satisfaction',
    value: 4.8,
    change: 5.3,
    changeType: 'increase',
    period: 'out of 5.0',
  },
]

const SAMPLE_CHART_DATA: ChartDataPoint[] = [
  { date: '2024-01-01', value: 120 },
  { date: '2024-01-02', value: 150 },
  { date: '2024-01-03', value: 180 },
  { date: '2024-01-04', value: 220 },
  { date: '2024-01-05', value: 190 },
  { date: '2024-01-06', value: 250 },
  { date: '2024-01-07', value: 280 },
]

const SAMPLE_CONVERSATIONS: ConversationData[] = [
  {
    id: '1',
    contact: 'John Smith',
    messages: 12,
    lastActivity: '2 min ago',
    status: 'active',
    assignee: 'Alice',
  },
  {
    id: '2',
    contact: 'Sarah Johnson',
    messages: 8,
    lastActivity: '15 min ago',
    status: 'pending',
    assignee: 'Bob',
  },
  {
    id: '3',
    contact: 'Mike Wilson',
    messages: 25,
    lastActivity: '1 hour ago',
    status: 'resolved',
    assignee: 'Charlie',
  },
]

// Widget types
const WIDGET_TYPES = [
  {
    id: 'metric',
    label: 'Metric Card',
    icon: ChartBarIcon,
    description: 'Display key performance indicators',
  },
  { id: 'chart', label: 'Line Chart', icon: ChartBarIcon, description: 'Show trends over time' },
  {
    id: 'table',
    label: 'Data Table',
    icon: ChatBubbleLeftRightIcon,
    description: 'List detailed information',
  },
  { id: 'funnel', label: 'Funnel Chart', icon: FunnelIcon, description: 'Show conversion stages' },
]

// Chart component for data visualization
const SimpleChart: React.FC<{ data: ChartDataPoint[]; height?: number }> = ({
  data,
  height = 200,
}) => {
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const range = maxValue - minValue

  return (
    <div className='relative' style={{ height }}>
      <svg width='100%' height='100%' className='overflow-visible'>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
          <line
            key={index}
            x1='0'
            y1={height * ratio}
            x2='100%'
            y2={height * ratio}
            stroke='#e5e7eb'
            strokeWidth='1'
            opacity='0.5'
          />
        ))}

        {/* Chart line */}
        <polyline
          fill='none'
          stroke='#3b82f6'
          strokeWidth='2'
          points={data
            .map((point, index) => {
              const x = (index / (data.length - 1)) * 100
              const y = height - ((point.value - minValue) / range) * height
              return `${x}%,${y}`
            })
            .join(' ')}
        />

        {/* Data points */}
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * 100
          const y = height - ((point.value - minValue) / range) * height
          return (
            <circle
              key={index}
              cx={`${x}%`}
              cy={y}
              r='4'
              fill='#3b82f6'
              className='hover:r-6 transition-all'
            />
          )
        })}
      </svg>

      {/* Value labels */}
      <div className='pointer-events-none absolute inset-0'>
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * 100
          const y = height - ((point.value - minValue) / range) * height
          return (
            <div
              key={index}
              className='absolute rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity hover:opacity-100'
              style={{ left: `${x}%`, top: y - 30, transform: 'translateX(-50%)' }}
            >
              {point.value}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Metric card component
const MetricCard: React.FC<{ metric: MetricData; className?: string }> = ({
  metric,
  className = '',
}) => {
  const changeIcon = metric.changeType === 'increase' ? ArrowUpIcon : ArrowDownIcon
  const changeColor =
    metric.changeType === 'increase'
      ? 'text-green-600'
      : metric.changeType === 'decrease'
        ? 'text-red-600'
        : 'text-gray-600'

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-6 ${className}`}>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm font-medium text-gray-600'>{metric.label}</p>
          <p className='mt-2 text-3xl font-bold text-gray-900'>
            {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
          </p>
        </div>
        <div className='text-right'>
          <div className={`flex items-center ${changeColor}`}>
            {React.createElement(changeIcon, { className: 'w-4 h-4 mr-1' })}
            <span className='text-sm font-medium'>{Math.abs(metric.change)}%</span>
          </div>
          <p className='mt-1 text-xs text-gray-500'>{metric.period}</p>
        </div>
      </div>
    </div>
  )
}

// Main dashboard component
export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState('7d')
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30) // seconds

  // Initialize default widgets
  useEffect(() => {
    const defaultWidgets: DashboardWidget[] = [
      {
        id: 'metrics-overview',
        type: 'metric',
        title: 'Key Metrics',
        size: 'large',
        position: { x: 0, y: 0 },
        data: SAMPLE_METRICS,
        config: { showComparison: true },
      },
      {
        id: 'message-trends',
        type: 'chart',
        title: 'Message Trends',
        size: 'medium',
        position: { x: 0, y: 1 },
        data: SAMPLE_CHART_DATA,
        config: { chartType: 'line', showGrid: true },
      },
      {
        id: 'active-conversations',
        type: 'table',
        title: 'Active Conversations',
        size: 'medium',
        position: { x: 1, y: 1 },
        data: SAMPLE_CONVERSATIONS,
        config: { pageSize: 10, sortable: true },
      },
    ]
    setWidgets(defaultWidgets)
  }, [])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Simulate data refresh
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  // Handle widget addition
  const addWidget = (type: string) => {
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: type as any,
      title: `New ${type}`,
      size: 'medium',
      position: { x: 0, y: widgets.length },
      data:
        type === 'metric'
          ? SAMPLE_METRICS.slice(0, 1)
          : type === 'chart'
            ? SAMPLE_CHART_DATA
            : SAMPLE_CONVERSATIONS,
      config: {},
    }

    setWidgets(prev => [...prev, newWidget])
  }

  // Handle widget removal
  const removeWidget = (widgetId: string) => {
    setWidgets(prev => prev.filter(w => w.id !== widgetId))
  }

  // Export functionality
  const exportData = (format: 'csv' | 'pdf' | 'png') => {
    // Simulate export

    setShowExportModal(false)
    // In real implementation, generate and download the file
  }

  // Render widget content
  const renderWidgetContent = (widget: DashboardWidget) => {
    switch (widget.type) {
      case 'metric':
        return (
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            {widget.data.map((metric: MetricData, index: number) => (
              <MetricCard key={index} metric={metric} />
            ))}
          </div>
        )

      case 'chart':
        return (
          <div className='p-4'>
            <SimpleChart data={widget.data} height={300} />
            <div className='mt-4 flex justify-between text-sm text-gray-600'>
              <span>Time Period: {dateRange}</span>
              <span>Last Updated: Just now</span>
            </div>
          </div>
        )

      case 'table':
        return (
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead className='bg-gray-50'>
                <tr>
                  <th className='px-4 py-3 text-left font-medium text-gray-900'>Contact</th>
                  <th className='px-4 py-3 text-left font-medium text-gray-900'>Messages</th>
                  <th className='px-4 py-3 text-left font-medium text-gray-900'>Last Activity</th>
                  <th className='px-4 py-3 text-left font-medium text-gray-900'>Status</th>
                  <th className='px-4 py-3 text-left font-medium text-gray-900'>Assignee</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200'>
                {widget.data.map((conversation: ConversationData) => (
                  <tr key={conversation.id} className='hover:bg-gray-50'>
                    <td className='px-4 py-3 font-medium text-gray-900'>{conversation.contact}</td>
                    <td className='px-4 py-3 text-gray-600'>{conversation.messages}</td>
                    <td className='px-4 py-3 text-gray-600'>{conversation.lastActivity}</td>
                    <td className='px-4 py-3'>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          conversation.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : conversation.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {conversation.status}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-gray-600'>{conversation.assignee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )

      case 'funnel':
        const stages = ['Visitors', 'Inquiries', 'Qualified', 'Customers']
        const values = [1000, 750, 400, 120]
        return (
          <div className='p-4'>
            <div className='space-y-4'>
              {stages.map((stage, index) => {
                const percentage = (values[index] / values[0]) * 100
                return (
                  <div key={stage} className='flex items-center space-x-4'>
                    <div className='w-20 text-sm font-medium text-gray-700'>{stage}</div>
                    <div className='h-8 flex-1 rounded-full bg-gray-200'>
                      <div
                        className='flex h-full items-center justify-center rounded-full bg-blue-500 text-sm font-medium text-white'
                        style={{ width: `${percentage}%` }}
                      >
                        {values[index]}
                      </div>
                    </div>
                    <div className='w-16 text-sm text-gray-600'>{percentage.toFixed(1)}%</div>
                  </div>
                )
              })}
            </div>
          </div>
        )

      default:
        return <div className='p-4 text-gray-500'>Widget type not supported</div>
    }
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='border-b border-gray-200 bg-white'>
        <div className='px-6 py-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-4'>
              <h1 className='text-2xl font-bold text-gray-900'>Analytics Dashboard</h1>
              <div className='flex items-center space-x-2'>
                <CalendarIcon className='h-5 w-5 text-gray-400' />
                <select
                  value={dateRange}
                  onChange={e => setDateRange(e.target.value)}
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

            <div className='flex items-center space-x-3'>
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
                    aria-label='Refresh interval'
                  >
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                    <option value={300}>5m</option>
                  </select>
                )}
              </div>

              <button
                onClick={() => setShowExportModal(true)}
                className='flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none'
                aria-label='Export dashboard'
              >
                <DocumentArrowDownIcon className='mr-2 h-4 w-4' />
                Export
              </button>

              <button
                onClick={() => setIsCustomizing(!isCustomizing)}
                className={`flex items-center rounded-md px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  isCustomizing
                    ? 'border border-blue-300 bg-blue-100 text-blue-700'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                }`}
                aria-label='Customize dashboard'
              >
                <Cog6ToothIcon className='mr-2 h-4 w-4' />
                Customize
              </button>

              <button
                onClick={() => window.location.reload()}
                className='flex items-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none'
                aria-label='Refresh dashboard'
              >
                <ArrowPathIcon className='mr-2 h-4 w-4' />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className='flex'>
        {/* Sidebar for customization */}
        {isCustomizing && (
          <div className='w-64 border-r border-gray-200 bg-white p-4'>
            <h3 className='mb-4 text-lg font-medium text-gray-900'>Add Widgets</h3>
            <div className='space-y-3'>
              {WIDGET_TYPES.map(type => {
                const IconComponent = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => addWidget(type.id)}
                    className='flex w-full items-center rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-blue-500 hover:bg-blue-50'
                  >
                    <IconComponent className='mr-3 h-5 w-5 text-gray-400' />
                    <div>
                      <div className='text-sm font-medium text-gray-900'>{type.label}</div>
                      <div className='text-xs text-gray-500'>{type.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className='flex-1 p-6'>
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3'>
            {widgets.map(widget => (
              <div
                key={widget.id}
                className={`rounded-lg border border-gray-200 bg-white shadow-sm ${
                  widget.size === 'large'
                    ? 'lg:col-span-2 xl:col-span-3'
                    : widget.size === 'medium'
                      ? 'lg:col-span-1'
                      : ''
                } ${selectedWidget === widget.id ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => setSelectedWidget(widget.id)}
                role='button'
                tabIndex={0}
                aria-label={`${widget.title} widget`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setSelectedWidget(widget.id)
                  }
                }}
              >
                {/* Widget header */}
                <div className='flex items-center justify-between border-b border-gray-200 p-4'>
                  <h3 className='text-lg font-medium text-gray-900'>{widget.title}</h3>
                  <div className='flex items-center space-x-2'>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        // Show widget settings
                      }}
                      className='text-gray-400 hover:text-gray-600'
                      aria-label='Widget settings'
                    >
                      <Cog6ToothIcon className='h-4 w-4' />
                    </button>
                    {isCustomizing && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          removeWidget(widget.id)
                        }}
                        className='text-red-400 hover:text-red-600'
                        aria-label='Remove widget'
                      >
                        <XMarkIcon className='h-4 w-4' />
                      </button>
                    )}
                  </div>
                </div>

                {/* Widget content */}
                <div className='p-0'>{renderWidgetContent(widget)}</div>
              </div>
            ))}

            {/* Add widget placeholder */}
            {isCustomizing && (
              <div className='rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400'>
                <PlusIcon className='mx-auto mb-2 h-8 w-8 text-gray-400' />
                <p className='text-sm text-gray-500'>Add a new widget</p>
              </div>
            )}
          </div>

          {/* Empty state */}
          {widgets.length === 0 && (
            <div className='py-12 text-center'>
              <ChartBarIcon className='mx-auto mb-4 h-12 w-12 text-gray-400' />
              <h3 className='mb-2 text-lg font-medium text-gray-900'>No widgets configured</h3>
              <p className='mb-4 text-gray-500'>Start building your dashboard by adding widgets</p>
              <button
                onClick={() => setIsCustomizing(true)}
                className='rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none'
              >
                Customize Dashboard
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black'>
          <div className='mx-4 w-full max-w-md rounded-lg bg-white shadow-xl'>
            <div className='flex items-center justify-between border-b border-gray-200 p-6'>
              <h2 className='text-lg font-medium text-gray-900'>Export Dashboard</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className='text-gray-400 hover:text-gray-600'
                aria-label='Close export modal'
              >
                <XMarkIcon className='h-5 w-5' />
              </button>
            </div>

            <div className='p-6'>
              <div className='space-y-4'>
                <button
                  onClick={() => exportData('csv')}
                  className='flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-500 hover:bg-blue-50'
                >
                  <div className='flex items-center'>
                    <DocumentArrowDownIcon className='mr-3 h-5 w-5 text-gray-400' />
                    <div className='text-left'>
                      <div className='font-medium text-gray-900'>CSV Export</div>
                      <div className='text-sm text-gray-500'>Export data as CSV file</div>
                    </div>
                  </div>
                  <ArrowDownIcon className='h-4 w-4 text-gray-400' />
                </button>

                <button
                  onClick={() => exportData('pdf')}
                  className='flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-500 hover:bg-blue-50'
                >
                  <div className='flex items-center'>
                    <PrinterIcon className='mr-3 h-5 w-5 text-gray-400' />
                    <div className='text-left'>
                      <div className='font-medium text-gray-900'>PDF Report</div>
                      <div className='text-sm text-gray-500'>Generate PDF report</div>
                    </div>
                  </div>
                  <ArrowDownIcon className='h-4 w-4 text-gray-400' />
                </button>

                <button
                  onClick={() => exportData('png')}
                  className='flex w-full items-center justify-between rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-500 hover:bg-blue-50'
                >
                  <div className='flex items-center'>
                    <EyeIcon className='mr-3 h-5 w-5 text-gray-400' />
                    <div className='text-left'>
                      <div className='font-medium text-gray-900'>Image Export</div>
                      <div className='text-sm text-gray-500'>Save dashboard as image</div>
                    </div>
                  </div>
                  <ArrowDownIcon className='h-4 w-4 text-gray-400' />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
