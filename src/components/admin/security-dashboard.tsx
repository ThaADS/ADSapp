// @ts-nocheck - Database types need regeneration
'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Lock, Users, Activity, CheckCircle, XCircle } from 'lucide-react'

interface SecurityMetrics {
  failedLogins: {
    total: number
    last24h: number
    topIPs: Array<{ ip: string; count: number }>
  }
  mfaAdoption: {
    enabled: number
    total: number
    percentage: number
  }
  suspiciousActivity: Array<{
    id: string
    type: string
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    timestamp: string
    ip?: string
    user?: string
  }>
  recentAlerts: Array<{
    id: string
    message: string
    type: 'info' | 'warning' | 'error'
    timestamp: string
  }>
  complianceScore: {
    overall: number
    categories: {
      authentication: number
      dataProtection: number
      accessControl: number
      auditLogging: number
    }
  }
}

export default function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h')

  useEffect(() => {
    loadMetrics()
    // Refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000)
    return () => clearInterval(interval)
  }, [timeRange])

  const loadMetrics = async () => {
    try {
      const response = await fetch(`/api/admin/security/metrics?range=${timeRange}`)
      const data = await response.json()
      setMetrics(data.metrics)
    } catch (error) {
      console.error('Failed to load security metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-50 border-red-200'
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      default: return 'bg-blue-50 border-blue-200'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-emerald-600" />
            Security Dashboard
          </h1>
          <p className="text-gray-600 mt-1">Monitor security metrics and threats in real-time</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeRange('24h')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === '24h'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            24h
          </button>
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === '7d'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            7d
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-4 py-2 rounded-lg font-medium ${
              timeRange === '30d'
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            30d
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Failed Logins */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed Login Attempts</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {metrics?.failedLogins.last24h || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Last 24 hours</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        {/* MFA Adoption */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">MFA Adoption Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {metrics?.mfaAdoption.percentage.toFixed(1) || 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics?.mfaAdoption.enabled || 0} of {metrics?.mfaAdoption.total || 0} users
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Lock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Suspicious Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Suspicious Events</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {metrics?.suspiciousActivity.length || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {metrics?.suspiciousActivity.filter(a => a.severity === 'critical').length || 0} critical
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Compliance Score */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Compliance Score</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {metrics?.complianceScore.overall || 0}/100
              </p>
              <p className="text-xs text-gray-500 mt-1">Overall security posture</p>
            </div>
            <div className={`p-3 rounded-lg ${
              (metrics?.complianceScore.overall || 0) >= 80
                ? 'bg-green-100'
                : (metrics?.complianceScore.overall || 0) >= 60
                ? 'bg-yellow-100'
                : 'bg-red-100'
            }`}>
              <CheckCircle className={`w-6 h-6 ${
                (metrics?.complianceScore.overall || 0) >= 80
                  ? 'text-green-600'
                  : (metrics?.complianceScore.overall || 0) >= 60
                  ? 'text-yellow-600'
                  : 'text-red-600'
              }`} />
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Alerts */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Real-Time Security Alerts
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {metrics?.recentAlerts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No active security alerts</p>
            </div>
          ) : (
            metrics?.recentAlerts.map((alert) => (
              <div key={alert.id} className={`p-4 ${getAlertColor(alert.type)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {alert.type === 'error' ? (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    ) : alert.type === 'warning' ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    ) : (
                      <Activity className="w-5 h-5 text-blue-600 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{alert.message}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {new Date(alert.timestamp).toLocaleString('nl-NL')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Suspicious Activity Feed */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Suspicious Activity
          </h2>
        </div>
        <div className="divide-y divide-gray-200">
          {metrics?.suspiciousActivity.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No suspicious activity detected</p>
            </div>
          ) : (
            metrics?.suspiciousActivity.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${getSeverityColor(activity.severity)}`}>
                        {activity.severity.toUpperCase()}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{activity.type}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{activity.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span>{new Date(activity.timestamp).toLocaleString('nl-NL')}</span>
                      {activity.ip && <span>IP: {activity.ip}</span>}
                      {activity.user && <span>User: {activity.user}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Failed Login Attempts by IP */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Failed Logins by IP Address
          </h2>
        </div>
        <div className="p-6">
          {metrics?.failedLogins.topIPs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No failed login attempts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {metrics?.failedLogins.topIPs.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-red-600">{index + 1}</span>
                    </div>
                    <span className="font-mono text-sm text-gray-900">{item.ip}</span>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded">
                    {item.count} attempts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Compliance Score Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Compliance Score Breakdown
          </h2>
        </div>
        <div className="p-6 space-y-4">
          {Object.entries(metrics?.complianceScore.categories || {}).map(([category, score]) => (
            <div key={category}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {category.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="text-sm font-bold text-gray-900">{score}/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    score >= 80 ? 'bg-green-600' : score >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
