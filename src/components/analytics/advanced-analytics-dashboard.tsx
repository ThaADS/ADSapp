'use client'

/**
 * Advanced Analytics Dashboard Component
 * Comprehensive analytics with multiple chart types and insights
 */

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts'

// Inline SVG Icons
const ChatBubbleLeftRightIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
)

const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const UserGroupIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
)

const ChartBarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const LightBulbIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
)

interface AnalyticsData {
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

const COLORS = {
  primary: '#4F46E5',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  teal: '#14B8A6',
}

const PIE_COLORS = [COLORS.primary, COLORS.success, COLORS.warning, COLORS.danger, COLORS.info]

export function AdvancedAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('7d')
  const [activeTab, setActiveTab] = useState<
    'conversations' | 'journey' | 'agents' | 'campaigns' | 'predictive'
  >('conversations')

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  async function loadAnalytics() {
    setLoading(true)
    try {
      const response = await fetch(`/api/analytics/advanced?range=${dateRange}`)
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      }
    } catch (error) {
      console.error('Failed to load analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'conversations', name: 'Gesprekken', icon: ChatBubbleLeftRightIcon },
    { id: 'journey', name: 'Customer Journey', icon: TrendingUpIcon },
    { id: 'agents', name: 'Team Prestaties', icon: UserGroupIcon },
    { id: 'campaigns', name: 'Campaign ROI', icon: ChartBarIcon },
    { id: 'predictive', name: 'Predictive', icon: LightBulbIcon },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Geen analytics data beschikbaar</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </div>

        <select
          value={dateRange}
          onChange={e => setDateRange(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="7d">Afgelopen 7 dagen</option>
          <option value="30d">Afgelopen 30 dagen</option>
          <option value="90d">Afgelopen 90 dagen</option>
          <option value="1y">Afgelopen jaar</option>
        </select>
      </div>

      {/* Conversation Analytics */}
      {activeTab === 'conversations' && (
        <div className="space-y-6">
          {/* Volume Trend */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gesprek Volume Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.conversationMetrics.volumeTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="count"
                  stackId="1"
                  stroke={COLORS.primary}
                  fill={COLORS.primary}
                  name="Totaal"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stackId="2"
                  stroke={COLORS.success}
                  fill={COLORS.success}
                  name="Opgelost"
                />
                <Area
                  type="monotone"
                  dataKey="pending"
                  stackId="2"
                  stroke={COLORS.warning}
                  fill={COLORS.warning}
                  name="In behandeling"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Hours Heatmap */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Piek Uren</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.conversationMetrics.peakHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={hour => `${hour}:00`}
                  />
                  <YAxis />
                  <Tooltip labelFormatter={hour => `${hour}:00 uur`} />
                  <Bar dataKey="count" fill={COLORS.primary} name="Gesprekken" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Response Time by Hour */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Reactietijd per Uur
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.conversationMetrics.responseTimeByHour}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={hour => `${hour}:00`}
                  />
                  <YAxis label={{ value: 'Minuten', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    labelFormatter={hour => `${hour}:00 uur`}
                    formatter={(value: number) => [`${value.toFixed(1)} min`, 'Gem. reactietijd']}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgMinutes"
                    stroke={COLORS.info}
                    strokeWidth={2}
                    dot={{ fill: COLORS.info }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Verdeling</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.conversationMetrics.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={entry => entry.status}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.conversationMetrics.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Customer Journey Analytics */}
      {activeTab === 'journey' && (
        <div className="space-y-6">
          {/* Touchpoints */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Touchpoints</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.customerJourney.touchpoints} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="stage" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.primary} name="Aantal" />
                <Bar dataKey="conversionRate" fill={COLORS.success} name="Conversie %" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
            <div className="space-y-2">
              {data.customerJourney.funnel.map((stage, index) => {
                const prevStage = index > 0 ? data.customerJourney.funnel[index - 1] : null
                const dropoffRate = prevStage
                  ? ((prevStage.count - stage.count) / prevStage.count) * 100
                  : 0

                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                      <span className="text-sm text-gray-500">
                        {stage.count} ({dropoffRate > 0 && `-${dropoffRate.toFixed(1)}%`})
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-8">
                      <div
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 h-8 rounded-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all"
                        style={{
                          width: `${(stage.count / data.customerJourney.funnel[0].count) * 100}%`,
                        }}
                      >
                        {stage.count}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Cohort Retention */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Cohort Retentie</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.customerJourney.cohortRetention}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" label={{ value: 'Week', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Retentie %', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Line
                  type="monotone"
                  dataKey="retention"
                  stroke={COLORS.purple}
                  strokeWidth={3}
                  dot={{ fill: COLORS.purple, r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Agent Performance */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          {/* Leaderboard */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Leaderboard</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Agent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Afgehandeld
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Gem. Reactietijd
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tevredenheid
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.agentPerformance.leaderboard.map((agent, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold">
                            {agent.agentName.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {agent.agentName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agent.messagesHandled}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agent.avgResponseTime.toFixed(1)} min
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-900 mr-2">
                            {agent.satisfaction.toFixed(1)}
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${agent.satisfaction * 10}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workload Distribution */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Werkbelasting Verdeling</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.agentPerformance.workloadDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="agentName" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="workload" fill={COLORS.info} name="Gesprekken" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Productivity Trend */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Productiviteit Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.agentPerformance.productivityTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="productivity"
                    stroke={COLORS.success}
                    strokeWidth={2}
                    dot={{ fill: COLORS.success }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Campaign ROI */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Campaign Comparison */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Vergelijking</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Campagne
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Verzonden
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Geopend
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Geklikt
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Geconverteerd
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ROI
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.campaignROI.comparison.map((campaign, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {campaign.campaign}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.sent}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.opened} ({((campaign.opened / campaign.sent) * 100).toFixed(1)}%)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.clicked} ({((campaign.clicked / campaign.opened) * 100).toFixed(1)}
                        %)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.converted}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            campaign.roi > 100
                              ? 'bg-green-100 text-green-800'
                              : campaign.roi > 0
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {campaign.roi.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue by Channel */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Omzet per Kanaal</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.campaignROI.revenueByChannel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="channel" />
                <YAxis />
                <Tooltip formatter={(value: number) => `€${value.toLocaleString()}`} />
                <Bar dataKey="revenue" fill={COLORS.success} name="Omzet" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Predictive Analytics */}
      {activeTab === 'predictive' && (
        <div className="space-y-6">
          {/* Volume Forecast */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Volume Voorspelling</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.predictive.volumeForecast}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke={COLORS.primary}
                  strokeWidth={2}
                  name="Werkelijk"
                  dot={{ fill: COLORS.primary }}
                />
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke={COLORS.warning}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Voorspelling"
                  dot={{ fill: COLORS.warning }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Churn Risk */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Churn Risico per Segment</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.predictive.churnRisk} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis dataKey="segment" type="category" width={150} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                <Bar dataKey="risk" fill={COLORS.danger} name="Risico %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
