'use client'

import { useEffect, useState } from 'react'
import { PlatformMetrics } from '@/lib/super-admin'
import {
  BuildingOfficeIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  CloudIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline'

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
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-gray-400" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
              {trend && (
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trend.isPositive ? (
                    <TrendingUpIcon className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDownIcon className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(trend.value)}%
                </div>
              )}
            </dd>
            {subtitle && (
              <dd className="text-sm text-gray-500">{subtitle}</dd>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMetrics()
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/dashboard')

      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }

      const data = await response.json()
      setMetrics(data.metrics)
    } catch (error) {
      console.error('Error fetching metrics:', error)
      setError('Failed to load dashboard metrics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="ml-5 flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-700">{error}</div>
          <button
            onClick={fetchMetrics}
            className="mt-2 text-red-600 hover:text-red-500 text-sm font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <button
          onClick={fetchMetrics}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Organizations"
          value={metrics.total_organizations.toLocaleString()}
          subtitle={`${metrics.active_organizations} active`}
          icon={BuildingOfficeIcon}
        />
        <MetricCard
          title="Total Users"
          value={metrics.total_users.toLocaleString()}
          icon={UsersIcon}
        />
        <MetricCard
          title="Messages Today"
          value={metrics.messages_today.toLocaleString()}
          subtitle={`${metrics.messages_this_month.toLocaleString()} this month`}
          icon={ChatBubbleLeftRightIcon}
        />
        <MetricCard
          title="Storage Used"
          value={`${metrics.storage_used_gb} GB`}
          subtitle={`${metrics.api_calls_today.toLocaleString()} API calls today`}
          icon={CloudIcon}
        />
      </div>

      {/* Recent Activity and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Organizations */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Organizations</h3>
          </div>
          <div className="p-6">
            <div className="text-sm text-gray-500">
              View and manage organizations in the Organizations section
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">System Health</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <span className="text-sm font-medium text-green-600">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Response Time</span>
                <span className="text-sm font-medium text-green-600">&lt; 200ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Storage</span>
                <span className="text-sm font-medium text-yellow-600">Monitor</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/admin/organizations"
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <BuildingOfficeIcon className="h-6 w-6 text-gray-400 mb-2" />
              <div className="text-sm font-medium text-gray-900">Manage Organizations</div>
              <div className="text-xs text-gray-500">View, suspend, or configure organizations</div>
            </a>
            <a
              href="/admin/support"
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-400 mb-2" />
              <div className="text-sm font-medium text-gray-900">Support Tickets</div>
              <div className="text-xs text-gray-500">Handle customer support requests</div>
            </a>
            <a
              href="/admin/billing"
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-400 mb-2" />
              <div className="text-sm font-medium text-gray-900">Billing Overview</div>
              <div className="text-xs text-gray-500">Monitor subscriptions and revenue</div>
            </a>
            <a
              href="/admin/settings"
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-gray-400 mb-2" />
              <div className="text-sm font-medium text-gray-900">System Settings</div>
              <div className="text-xs text-gray-500">Configure platform settings</div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}