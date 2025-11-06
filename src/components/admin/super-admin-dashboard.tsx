'use client'

import { useEffect, useState } from 'react'
import {
  BuildingOfficeIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'

interface PlatformMetrics {
  total_organizations: number
  active_organizations: number
  total_users: number
  active_users: number
  total_messages: number
  total_conversations: number
  revenue_cents: number
  currency: string
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: {
    value: number
    isPositive: boolean
  }
}

function MetricCard({ title, value, subtitle, icon: Icon, trend }: MetricCardProps) {
  const iconColors = [
    {
      icon: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      text: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      icon: 'bg-gradient-to-br from-blue-500 to-blue-600',
      text: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      icon: 'bg-gradient-to-br from-purple-500 to-purple-600',
      text: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      icon: 'bg-gradient-to-br from-orange-500 to-orange-600',
      text: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ]

  const colorScheme = title.includes('Organizations')
    ? iconColors[0]
    : title.includes('Users')
      ? iconColors[1]
      : title.includes('Messages')
        ? iconColors[2]
        : iconColors[3]

  return (
    <div className='rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-900/5 transition-all duration-200 hover:shadow-md'>
      <div className='flex items-center gap-4'>
        <div className={`rounded-xl ${colorScheme.icon} p-3 shadow-lg`}>
          <Icon className='h-6 w-6 text-white' />
        </div>
        <div className='min-w-0 flex-1'>
          <p className='truncate text-sm font-medium text-slate-600'>{title}</p>
          <div className='mt-1 flex items-baseline gap-2'>
            <p className='text-2xl font-bold text-slate-900'>{value}</p>
            {trend && (
              <div
                className={`flex items-center gap-1 text-xs font-semibold ${
                  trend.isPositive ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {trend.isPositive ? (
                  <ArrowTrendingUpIcon className='h-3.5 w-3.5' />
                ) : (
                  <ArrowTrendingDownIcon className='h-3.5 w-3.5' />
                )}
                {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          {subtitle && <p className='mt-1 text-xs text-slate-500'>{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}

export function SuperAdminDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/dashboard')
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }
      const data = await response.json()
      setMetrics(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className='flex h-96 items-center justify-center'>
        <div className='text-center'>
          <div className='inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-600'></div>
          <p className='mt-4 text-sm text-slate-600'>Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className='rounded-xl bg-red-50 p-6 ring-1 ring-red-600/10'>
        <div className='flex'>
          <div className='flex-shrink-0'>
            <ExclamationTriangleIcon className='h-5 w-5 text-red-400' />
          </div>
          <div className='ml-3'>
            <h3 className='text-sm font-medium text-red-800'>Error loading dashboard</h3>
            <div className='mt-2 text-sm text-red-700'>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return <div>No data available</div>
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h2 className='text-2xl font-bold text-slate-900'>Platform Overview</h2>
        <p className='mt-2 text-sm text-slate-600'>
          Real-time metrics and insights for the entire platform
        </p>
      </div>

      {/* Metrics Grid */}
      <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4'>
        <MetricCard
          title='Total Organizations'
          value={metrics.total_organizations.toLocaleString()}
          subtitle={`${metrics.active_organizations} active`}
          icon={BuildingOfficeIcon}
        />
        <MetricCard
          title='Total Users'
          value={metrics.total_users.toLocaleString()}
          subtitle={`${metrics.active_users} active`}
          icon={UsersIcon}
        />
        <MetricCard
          title='Total Messages'
          value={metrics.total_messages.toLocaleString()}
          subtitle={`${metrics.total_conversations.toLocaleString()} conversations`}
          icon={ChatBubbleLeftRightIcon}
        />
        <MetricCard
          title='Revenue'
          value={`$${(metrics.revenue_cents / 100).toLocaleString()}`}
          subtitle={`${metrics.currency.toUpperCase()} - Total platform revenue`}
          icon={CurrencyDollarIcon}
        />
      </div>

      {/* Recent Activity */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        {/* Recent Organizations */}
        <div className='overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5'>
          <div className='border-b border-slate-200 p-6'>
            <h3 className='text-lg font-semibold text-slate-900'>Recent Organizations</h3>
            <p className='mt-1 text-sm text-slate-600'>Latest organization signups</p>
          </div>
          <div className='p-6'>
            <p className='text-sm text-slate-500'>Loading recent organizations...</p>
          </div>
        </div>

        {/* System Health */}
        <div className='overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5'>
          <div className='border-b border-slate-200 p-6'>
            <h3 className='text-lg font-semibold text-slate-900'>System Health</h3>
            <p className='mt-1 text-sm text-slate-600'>Infrastructure status</p>
          </div>
          <div className='p-6'>
            <div className='space-y-4'>
              <div className='flex items-center justify-between rounded-lg bg-emerald-50 p-3'>
                <span className='text-sm font-medium text-slate-900'>Database</span>
                <span className='inline-flex items-center gap-x-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20'>
                  <span className='h-1.5 w-1.5 rounded-full bg-emerald-600'></span>
                  Healthy
                </span>
              </div>
              <div className='flex items-center justify-between rounded-lg bg-slate-50 p-3'>
                <span className='text-sm font-medium text-slate-900'>API Response Time</span>
                <span className='text-sm font-bold text-slate-900'>~150ms</span>
              </div>
              <div className='flex items-center justify-between rounded-lg bg-slate-50 p-3'>
                <span className='text-sm font-medium text-slate-900'>Uptime</span>
                <span className='text-sm font-bold text-emerald-600'>99.9%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
