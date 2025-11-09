'use client'

/**
 * Campaign Analytics Dashboard
 * Main analytics component with charts and metrics
 */

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  EyeIcon,
  CursorArrowRaysIcon,
} from '@heroicons/react/24/outline'
import { CampaignPerformanceChart } from './campaign-performance-chart'
import { CampaignComparisonChart } from './campaign-comparison-chart'
import { MessageEngagementChart } from './message-engagement-chart'

interface CampaignStats {
  totalCampaigns: number
  activeCampaigns: number
  messagesSent: number
  messagesDelivered: number
  messagesRead: number
  clicks: number
  deliveryRate: number
  openRate: number
  clickRate: number
  enrollments: number
  completionRate: number
}

export function CampaignAnalyticsDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<CampaignStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    messagesSent: 0,
    messagesDelivered: 0,
    messagesRead: 0,
    clicks: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0,
    enrollments: 0,
    completionRate: 0,
  })
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [dateRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/campaigns?range=${dateRange}`)
      const data = await response.json()

      if (response.ok) {
        setStats(data.stats || stats)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const metricCards = [
    {
      name: 'Berichten Verzonden',
      value: stats.messagesSent.toLocaleString('nl-NL'),
      icon: EnvelopeIcon,
      change: '+12.5%',
      changeType: 'positive' as const,
      color: 'blue',
    },
    {
      name: 'Aflevering Rate',
      value: `${stats.deliveryRate.toFixed(1)}%`,
      icon: CheckCircleIcon,
      change: '+2.3%',
      changeType: 'positive' as const,
      color: 'green',
    },
    {
      name: 'Open Rate',
      value: `${stats.openRate.toFixed(1)}%`,
      icon: EyeIcon,
      change: '-0.5%',
      changeType: 'negative' as const,
      color: 'purple',
    },
    {
      name: 'Click Rate',
      value: `${stats.clickRate.toFixed(1)}%`,
      icon: CursorArrowRaysIcon,
      change: '+4.1%',
      changeType: 'positive' as const,
      color: 'orange',
    },
  ]

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Analytics laden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Prestatie Overzicht</h2>
          <p className="text-sm text-gray-500">Volg je campagne prestaties in real-time</p>
        </div>

        <div className="flex gap-2">
          {[
            { value: '7d' as const, label: '7 dagen' },
            { value: '30d' as const, label: '30 dagen' },
            { value: '90d' as const, label: '90 dagen' },
            { value: 'all' as const, label: 'Alles' },
          ].map(range => (
            <button
              key={range.value}
              onClick={() => setDateRange(range.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                dateRange === range.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${colorClasses[metric.color]}`}>
                <metric.icon className="h-6 w-6" />
              </div>
              <span
                className={`text-sm font-medium ${
                  metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {metric.change}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{metric.value}</h3>
            <p className="text-sm text-gray-500 mt-1">{metric.name}</p>
          </div>
        ))}
      </div>

      {/* Campaign Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <ChartBarIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-500">Totaal Campagnes</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalCampaigns}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.activeCampaigns} actief op dit moment
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <ArrowTrendingUpIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-500">Inschrijvingen</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.enrollments}</p>
          <p className="text-xs text-gray-500 mt-1">
            {stats.completionRate.toFixed(1)}% voltooiingspercentage
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircleIcon className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-500">Berichten Afgeleverd</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {stats.messagesDelivered.toLocaleString('nl-NL')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            van {stats.messagesSent.toLocaleString('nl-NL')} verzonden
          </p>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Campagne Prestaties Over Tijd
        </h3>
        <CampaignPerformanceChart dateRange={dateRange} />
      </div>

      {/* Engagement Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Bericht Betrokkenheid</h3>
        <MessageEngagementChart />
      </div>

      {/* Campaign Comparison */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Campagne Vergelijking</h3>
        <CampaignComparisonChart />
      </div>

      {/* Top Performing Campaigns */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Best Presterende Campagnes</h3>
        <div className="space-y-3">
          {[
            {
              name: 'Welkom Reeks',
              type: 'Drip',
              sent: 1543,
              openRate: 78.5,
              clickRate: 12.3,
            },
            {
              name: 'Zomer Actie 2024',
              type: 'Broadcast',
              sent: 8921,
              openRate: 65.2,
              clickRate: 8.7,
            },
            {
              name: 'Product Update',
              type: 'Drip',
              sent: 2341,
              openRate: 82.1,
              clickRate: 15.4,
            },
          ].map((campaign, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div>
                <h4 className="text-sm font-medium text-gray-900">{campaign.name}</h4>
                <p className="text-xs text-gray-500">
                  {campaign.type} • {campaign.sent.toLocaleString('nl-NL')} verzonden
                </p>
              </div>
              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{campaign.openRate}%</p>
                  <p className="text-xs text-gray-500">Open Rate</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-gray-900">{campaign.clickRate}%</p>
                  <p className="text-xs text-gray-500">Click Rate</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
