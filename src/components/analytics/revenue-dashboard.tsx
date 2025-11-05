// @ts-nocheck - Database types need regeneration
'use client'

import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import {
  CurrencyDollarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  UsersIcon,
  ShoppingCartIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface RevenueMetrics {
  totalRevenue: number
  monthlyRecurringRevenue: number
  averageRevenuePerUser: number
  customerLifetimeValue: number
  conversionRate: number
  churnRate: number
  growthRate: number
  revenueGrowth: {
    current: number
    previous: number
    percentageChange: number
  }
  revenueByMonth: Array<{
    month: string
    revenue: number
    subscriptions: number
    customers: number
  }>
  revenueByPlan: Array<{
    name: string
    value: number
    count: number
  }>
  revenueBySource: Array<{
    source: string
    amount: number
    percentage: number
  }>
  customerAcquisitionCost: number
  paybackPeriod: number
}

interface RevenueDashboardProps {
  organizationId: string
  timeRange?: '7d' | '30d' | '90d' | '12m'
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function RevenueDashboard({
  organizationId,
  timeRange = '30d'
}: RevenueDashboardProps) {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRange, setSelectedRange] = useState(timeRange)

  useEffect(() => {
    loadRevenueMetrics()
  }, [selectedRange])

  const loadRevenueMetrics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/analytics/revenue?range=${selectedRange}`)
      const data = await response.json()
      setMetrics(data.metrics)
    } catch (error) {
      console.error('Failed to load revenue metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Geen revenue data beschikbaar</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Revenue Analytics</h2>
        <div className="flex gap-2">
          {['7d', '30d', '90d', '12m'].map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedRange === range
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {range === '7d' && 'Laatste 7 dagen'}
              {range === '30d' && 'Laatste 30 dagen'}
              {range === '90d' && 'Laatste 90 dagen'}
              {range === '12m' && 'Laatste 12 maanden'}
            </button>
          ))}
          <button
            onClick={loadRevenueMetrics}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title="Ververs data"
          >
            <ArrowPathIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Totale Omzet</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(metrics.totalRevenue)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                {metrics.revenueGrowth.percentageChange >= 0 ? (
                  <TrendingUpIcon className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDownIcon className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  metrics.revenueGrowth.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(Math.abs(metrics.revenueGrowth.percentageChange))}
                </span>
                <span className="text-xs text-gray-500">vs vorige periode</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <CurrencyDollarIcon className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* MRR */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Recurring Revenue</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(metrics.monthlyRecurringRevenue)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Groei: {formatPercentage(metrics.growthRate)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUpIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* ARPU */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Average Revenue Per User</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatCurrency(metrics.averageRevenuePerUser)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                LTV: {formatCurrency(metrics.customerLifetimeValue)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <UsersIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Conversie Ratio</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {formatPercentage(metrics.conversionRate)}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Churn: {formatPercentage(metrics.churnRate)}
              </p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <ShoppingCartIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Omzet Ontwikkeling</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={metrics.revenueByMonth}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px'
              }}
              formatter={(value: number) => [formatCurrency(value), 'Omzet']}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Plan */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Omzet per Abonnement</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={metrics.revenueByPlan}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {metrics.revenueByPlan.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {metrics.revenueByPlan.map((plan, index) => (
              <div key={plan.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-gray-700">{plan.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">{plan.count} klanten</span>
                  <span className="font-medium text-gray-900">{formatCurrency(plan.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Source */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Omzet per Bron</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.revenueBySource}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="source"
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px'
                }}
                formatter={(value: number) => [formatCurrency(value), 'Omzet']}
              />
              <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Customer Acquisition Cost</h4>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(metrics.customerAcquisitionCost)}
          </p>
          <p className="text-xs text-gray-500 mt-2">Per nieuwe klant</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Customer Lifetime Value</h4>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(metrics.customerLifetimeValue)}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            LTV:CAC ratio {(metrics.customerLifetimeValue / metrics.customerAcquisitionCost).toFixed(2)}x
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Payback Period</h4>
          <p className="text-2xl font-bold text-gray-900">
            {metrics.paybackPeriod} maanden
          </p>
          <p className="text-xs text-gray-500 mt-2">Tijd om CAC terug te verdienen</p>
        </div>
      </div>
    </div>
  )
}
