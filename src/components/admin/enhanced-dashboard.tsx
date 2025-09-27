'use client'

import { useEffect, useState } from 'react'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ServerIcon,
  UsersIcon,
  BuildingOfficeIcon,
  BoltIcon,
  DocumentChartBarIcon,
  ShieldCheckIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface DashboardMetrics {
  revenue: {
    current: number
    growth: number
    mrr: number
    churn_rate: number
    forecast_next_month: number
  }
  growth: {
    revenue_growth: number
    user_growth: number
    retention_rate: number
  }
  users: {
    total_active: number
    monthly_active: number
    retention_rates: {
      day_1: number
      day_7: number
      day_30: number
      day_90: number
    }
    avg_session_duration: number
  }
  performance: {
    uptime: number
    response_time: number
    error_rate: number
    throughput: number
  }
  alerts: Array<{
    type: string
    category: string
    message: string
    severity: string
  }>
  system_health: {
    overall_status: string
    health_score: number
    components: Array<{
      name: string
      status: string
      health_score: number
    }>
  }
  billing_reconciliation: {
    discrepancy_amount: number
    discrepancy_percentage: number
    transactions_matched: number
    transactions_pending: number
  }
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
  status?: 'healthy' | 'warning' | 'critical'
  onClick?: () => void
}

function EnhancedMetricCard({ title, value, subtitle, icon: Icon, trend, status, onClick }: MetricCardProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'border-green-200 bg-green-50'
      case 'warning': return 'border-yellow-200 bg-yellow-50'
      case 'critical': return 'border-red-200 bg-red-50'
      default: return 'border-gray-200 bg-white'
    }
  }

  const getIconColor = () => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-400'
    }
  }

  return (
    <div
      className={`rounded-lg border-2 shadow-sm p-6 transition-all hover:shadow-md ${getStatusColor()} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className={`h-8 w-8 ${getIconColor()}`} />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-700 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              {trend && (
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span className="mr-1">{trend.isPositive ? '↗' : '↘'}</span>
                  {Math.abs(trend.value)}%
                </div>
              )}
            </dd>
            {subtitle && (
              <dd className="text-sm text-gray-600 mt-1">{subtitle}</dd>
            )}
          </dl>
        </div>
      </div>
    </div>
  )
}

interface AlertPanelProps {
  alerts: DashboardMetrics['alerts']
}

function AlertPanel({ alerts }: AlertPanelProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return ExclamationTriangleIcon
      default:
        return CheckCircleIcon
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Active Alerts</h3>
          <span className="text-sm text-gray-500">{alerts.length} total</span>
        </div>
      </div>
      <div className="p-6">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
            <p className="text-gray-500">No active alerts</p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.slice(0, 5).map((alert, index) => {
              const Icon = getSeverityIcon(alert.severity)
              return (
                <div key={index} className="flex items-start space-x-3">
                  <div className={`flex-shrink-0 p-1 rounded-full ${getSeverityColor(alert.severity)}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                    <p className="text-xs text-gray-500 capitalize">{alert.category} • {alert.severity}</p>
                  </div>
                </div>
              )
            })}
            {alerts.length > 5 && (
              <div className="text-center pt-4">
                <button className="text-sm text-indigo-600 hover:text-indigo-500">
                  View all {alerts.length} alerts →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface SystemHealthPanelProps {
  systemHealth: DashboardMetrics['system_health']
  performance: DashboardMetrics['performance']
}

function SystemHealthPanel({ systemHealth, performance }: SystemHealthPanelProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'outage': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              systemHealth.overall_status === 'healthy' ? 'bg-green-400' :
              systemHealth.overall_status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
            }`}></div>
            <span className={`text-sm font-medium ${getStatusColor(systemHealth.overall_status)}`}>
              {systemHealth.overall_status.charAt(0).toUpperCase() + systemHealth.overall_status.slice(1)}
            </span>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getHealthScoreColor(systemHealth.health_score)}`}>
              {systemHealth.health_score}
            </div>
            <div className="text-sm text-gray-500">Health Score</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{performance.uptime.toFixed(2)}%</div>
            <div className="text-sm text-gray-500">Uptime (24h)</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Response Time</span>
            <span className={`text-sm font-medium ${performance.response_time < 200 ? 'text-green-600' : 'text-yellow-600'}`}>
              {performance.response_time}ms
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Error Rate</span>
            <span className={`text-sm font-medium ${performance.error_rate < 1 ? 'text-green-600' : 'text-red-600'}`}>
              {performance.error_rate.toFixed(2)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Throughput</span>
            <span className="text-sm font-medium text-gray-900">{performance.throughput.toLocaleString()} req/min</span>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Components</h4>
          {systemHealth.components.slice(0, 3).map((component, index) => (
            <div key={index} className="flex justify-between items-center py-1">
              <span className="text-sm text-gray-600">{component.name}</span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">{component.health_score}%</span>
                <span className={`text-xs font-medium ${getStatusColor(component.status)}`}>
                  {component.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface RevenueChartProps {
  revenue: DashboardMetrics['revenue']
}

function RevenueChart({ revenue }: RevenueChartProps) {
  // Sample data - in real implementation, this would come from API
  const chartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Monthly Revenue',
        data: [45000, 52000, 48000, 61000, 55000, revenue.current],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Forecast',
        data: [null, null, null, null, null, revenue.current, revenue.forecast_next_month],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return '$' + (value / 1000).toFixed(0) + 'k'
          }
        }
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Revenue Trends</h3>
      </div>
      <div className="p-6">
        <div style={{ height: '300px' }}>
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  )
}

interface UserEngagementProps {
  users: DashboardMetrics['users']
}

function UserEngagementChart({ users }: UserEngagementProps) {
  const retentionData = {
    labels: ['Day 1', 'Day 7', 'Day 30', 'Day 90'],
    datasets: [
      {
        label: 'Retention Rate (%)',
        data: [
          users.retention_rates.day_1,
          users.retention_rates.day_7,
          users.retention_rates.day_30,
          users.retention_rates.day_90
        ],
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderColor: 'rgba(34, 197, 94, 1)',
        borderWidth: 1,
      }
    ]
  }

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value + '%'
          }
        }
      }
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">User Retention</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{users.total_active.toLocaleString()}</div>
            <div className="text-sm text-gray-500">Total Active Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{Math.round(users.avg_session_duration)}m</div>
            <div className="text-sm text-gray-500">Avg Session Duration</div>
          </div>
        </div>
        <div style={{ height: '200px' }}>
          <Bar data={retentionData} options={options} />
        </div>
      </div>
    </div>
  )
}

interface BillingReconciliationProps {
  billing: DashboardMetrics['billing_reconciliation']
}

function BillingReconciliationPanel({ billing }: BillingReconciliationProps) {
  const getDiscrepancyStatus = () => {
    const absPercentage = Math.abs(billing.discrepancy_percentage)
    if (absPercentage < 1) return 'healthy'
    if (absPercentage < 5) return 'warning'
    return 'critical'
  }

  const status = getDiscrepancyStatus()

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Billing Reconciliation</h3>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            status === 'healthy' ? 'bg-green-100 text-green-800' :
            status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {status.toUpperCase()}
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              Math.abs(billing.discrepancy_amount) < 100 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${Math.abs(billing.discrepancy_amount / 100).toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">Discrepancy Amount</div>
          </div>
          <div className="text-center">
            <div className={`text-2xl font-bold ${
              Math.abs(billing.discrepancy_percentage) < 1 ? 'text-green-600' : 'text-red-600'
            }`}>
              {Math.abs(billing.discrepancy_percentage).toFixed(2)}%
            </div>
            <div className="text-sm text-gray-500">Discrepancy %</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Matched Transactions</span>
            <span className="text-sm font-medium text-green-600">{billing.transactions_matched}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Pending Review</span>
            <span className="text-sm font-medium text-yellow-600">{billing.transactions_pending}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Match Rate</span>
            <span className="text-sm font-medium text-gray-900">
              {((billing.transactions_matched / (billing.transactions_matched + billing.transactions_pending)) * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="mt-6">
          <button className="w-full px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors">
            View Reconciliation Report →
          </button>
        </div>
      </div>
    </div>
  )
}

export function EnhancedAdminDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    fetchMetrics()

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/admin/enhanced-dashboard')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics')
      }

      const data = await response.json()
      setMetrics(data)
      setLastUpdated(new Date())
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
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Admin Dashboard</h1>
          <div className="animate-pulse">
            <div className="w-32 h-8 bg-gray-200 rounded"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
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
        <h1 className="text-3xl font-bold text-gray-900">Enhanced Admin Dashboard</h1>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              <div className="mt-4">
                <button
                  onClick={fetchMetrics}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Enhanced Admin Dashboard</h1>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={fetchMetrics}
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <BoltIcon className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <EnhancedMetricCard
          title="Monthly Revenue"
          value={`$${(metrics.revenue.current / 100).toLocaleString()}`}
          subtitle={`$${(metrics.revenue.mrr / 100).toLocaleString()} MRR`}
          icon={CurrencyDollarIcon}
          trend={{ value: metrics.revenue.growth, isPositive: metrics.revenue.growth > 0 }}
          status={metrics.revenue.growth > 0 ? 'healthy' : 'warning'}
        />

        <EnhancedMetricCard
          title="System Health"
          value={`${metrics.system_health.health_score}%`}
          subtitle={metrics.system_health.overall_status}
          icon={ServerIcon}
          status={
            metrics.system_health.health_score > 90 ? 'healthy' :
            metrics.system_health.health_score > 70 ? 'warning' : 'critical'
          }
        />

        <EnhancedMetricCard
          title="Active Users"
          value={metrics.users.total_active.toLocaleString()}
          subtitle={`${metrics.users.retention_rates.day_30.toFixed(1)}% 30-day retention`}
          icon={UsersIcon}
          trend={{ value: metrics.growth.user_growth, isPositive: metrics.growth.user_growth > 0 }}
          status={metrics.users.retention_rates.day_30 > 70 ? 'healthy' : 'warning'}
        />

        <EnhancedMetricCard
          title="System Uptime"
          value={`${metrics.performance.uptime.toFixed(2)}%`}
          subtitle={`${metrics.performance.response_time}ms avg response`}
          icon={CheckCircleIcon}
          status={
            metrics.performance.uptime > 99.5 ? 'healthy' :
            metrics.performance.uptime > 99 ? 'warning' : 'critical'
          }
        />

        <EnhancedMetricCard
          title="Error Rate"
          value={`${metrics.performance.error_rate.toFixed(2)}%`}
          subtitle={`${metrics.performance.throughput.toLocaleString()} req/min`}
          icon={ExclamationTriangleIcon}
          status={
            metrics.performance.error_rate < 1 ? 'healthy' :
            metrics.performance.error_rate < 5 ? 'warning' : 'critical'
          }
        />

        <EnhancedMetricCard
          title="Churn Rate"
          value={`${metrics.revenue.churn_rate.toFixed(1)}%`}
          subtitle="Monthly churn"
          icon={UsersIcon}
          status={
            metrics.revenue.churn_rate < 5 ? 'healthy' :
            metrics.revenue.churn_rate < 10 ? 'warning' : 'critical'
          }
        />

        <EnhancedMetricCard
          title="Billing Health"
          value={`${Math.abs(metrics.billing_reconciliation.discrepancy_percentage).toFixed(2)}%`}
          subtitle="Reconciliation accuracy"
          icon={DocumentChartBarIcon}
          status={
            Math.abs(metrics.billing_reconciliation.discrepancy_percentage) < 1 ? 'healthy' :
            Math.abs(metrics.billing_reconciliation.discrepancy_percentage) < 5 ? 'warning' : 'critical'
          }
        />

        <EnhancedMetricCard
          title="Alerts"
          value={metrics.alerts.length}
          subtitle={`${metrics.alerts.filter(a => a.severity === 'critical').length} critical`}
          icon={BoltIcon}
          status={
            metrics.alerts.filter(a => a.severity === 'critical').length === 0 ? 'healthy' :
            metrics.alerts.filter(a => a.severity === 'critical').length < 3 ? 'warning' : 'critical'
          }
        />
      </div>

      {/* Charts and Detailed Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart revenue={metrics.revenue} />
        <UserEngagementChart users={metrics.users} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <SystemHealthPanel
          systemHealth={metrics.system_health}
          performance={metrics.performance}
        />
        <BillingReconciliationPanel billing={metrics.billing_reconciliation} />
        <AlertPanel alerts={metrics.alerts} />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <a
              href="/admin/reporting"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
            >
              <ChartBarIcon className="h-6 w-6 text-gray-400 group-hover:text-indigo-600 mr-3" />
              <div>
                <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-900">Advanced Reports</div>
                <div className="text-xs text-gray-500">Revenue analytics & forecasting</div>
              </div>
            </a>

            <a
              href="/admin/billing-reconciliation"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
            >
              <DocumentChartBarIcon className="h-6 w-6 text-gray-400 group-hover:text-indigo-600 mr-3" />
              <div>
                <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-900">Billing Reconciliation</div>
                <div className="text-xs text-gray-500">Stripe & payment management</div>
              </div>
            </a>

            <a
              href="/admin/system-health"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
            >
              <ServerIcon className="h-6 w-6 text-gray-400 group-hover:text-indigo-600 mr-3" />
              <div>
                <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-900">System Health</div>
                <div className="text-xs text-gray-500">Monitoring & alerts</div>
              </div>
            </a>

            <a
              href="/admin/compliance"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
            >
              <ShieldCheckIcon className="h-6 w-6 text-gray-400 group-hover:text-indigo-600 mr-3" />
              <div>
                <div className="text-sm font-medium text-gray-900 group-hover:text-indigo-900">Compliance</div>
                <div className="text-xs text-gray-500">GDPR, SOC2 & audit tools</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}