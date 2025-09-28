'use client'

import { useState, useEffect } from 'react'
import { Alert, AlertRule } from '@/lib/monitoring/alerts'

interface MonitoringDashboardProps {
  isAdmin: boolean
}

export function MonitoringDashboard({ isAdmin }: MonitoringDashboardProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [rules, setRules] = useState<AlertRule[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules' | 'metrics'>('alerts')
  const [metrics, setMetrics] = useState<any>({})

  useEffect(() => {
    fetchAlerts()
    fetchMetrics()
    if (isAdmin) {
      fetchRules()
    }

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchAlerts()
      fetchMetrics()
    }, 30000)

    return () => clearInterval(interval)
  }, [isAdmin])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts?resolved=false')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts)
      }
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRules = async () => {
    try {
      const response = await fetch('/api/alerts/rules')
      if (response.ok) {
        const data = await response.json()
        setRules(data.rules)
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error)
    }
  }

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/health')
      if (response.ok) {
        const data = await response.json()
        setMetrics(data)
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts?id=${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true })
      })

      if (response.ok) {
        setAlerts(alerts.filter(alert => alert.id !== alertId))
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-600'
      case 'down': return 'text-red-600'
      case 'degraded': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">System Healthy</span>
          </div>
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['alerts', 'metrics', 'rules'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'alerts' && alerts.length > 0 && (
                <span className="ml-2 bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">
                  {alerts.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Active Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-green-500 text-4xl mb-2">✅</div>
              <h3 className="text-lg font-medium text-gray-900">No Active Alerts</h3>
              <p className="text-gray-500">All systems are operating normally</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 border rounded-lg ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="font-medium">{alert.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{alert.type}</span>
                    </div>
                    <p className="text-sm mb-2">{alert.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="ml-4 px-3 py-1 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* System Status */}
          <div className="bg-white p-6 border rounded-lg">
            <h3 className="text-lg font-medium mb-4">System Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Uptime</span>
                <span className="font-medium">{Math.floor(metrics.uptime / 3600)}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Environment</span>
                <span className="font-medium">{metrics.environment}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Version</span>
                <span className="font-medium">{metrics.version}</span>
              </div>
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-white p-6 border rounded-lg">
            <h3 className="text-lg font-medium mb-4">Memory Usage</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Used</span>
                <span className="font-medium">{metrics.system?.memory?.used}MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total</span>
                <span className="font-medium">{metrics.system?.memory?.total}MB</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${metrics.system?.memory?.percentage || 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Services Status */}
          <div className="bg-white p-6 border rounded-lg">
            <h3 className="text-lg font-medium mb-4">Services</h3>
            <div className="space-y-3">
              {Object.entries(metrics.services || {}).map(([service, status]: [string, any]) => (
                <div key={service} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 capitalize">{service}</span>
                  <span className={`font-medium ${getStatusColor(status.status)}`}>
                    {status.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Response Times */}
          <div className="bg-white p-6 border rounded-lg">
            <h3 className="text-lg font-medium mb-4">Response Times</h3>
            <div className="space-y-3">
              {Object.entries(metrics.services || {}).map(([service, status]: [string, any]) => (
                status.responseTime && (
                  <div key={service} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 capitalize">{service}</span>
                    <span className="font-medium">{status.responseTime}ms</span>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rules Tab (Admin Only) */}
      {activeTab === 'rules' && isAdmin && (
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{rule.name}</h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {rule.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getSeverityColor(rule.severity)}`}>
                    {rule.severity.toUpperCase()}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Type: {rule.type}</span>
                <span>Cooldown: {rule.cooldown} minutes</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}