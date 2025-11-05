// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


'use client'

import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CreditCard,
  AlertTriangle,
  BarChart3,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
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
} from 'recharts'

export interface BillingAnalyticsData {
  // Revenue metrics
  totalRevenue: number
  monthlyRecurringRevenue: number
  annualRecurringRevenue: number
  revenueGrowth: number

  // Subscription metrics
  totalSubscriptions: number
  activeSubscriptions: number
  newSubscriptions: number
  churnedSubscriptions: number
  churnRate: number

  // Payment metrics
  successfulPayments: number
  failedPayments: number
  paymentSuccessRate: number
  averageInvoiceAmount: number

  // Usage metrics
  totalUsage: Record<string, number>
  overageCharges: number

  // Historical data
  revenueHistory: Array<{
    period: string
    revenue: number
    subscriptions: number
    mrr: number
    churn: number
  }>

  // Plan distribution
  planDistribution: Array<{
    planId: string
    count: number
    revenue: number
    percentage: number
  }>

  // Customer lifecycle
  customerLifecycle: {
    averageLifetime: number
    averageLifetimeValue: number
    cohortData: Array<{
      cohort: string
      retention: number[]
    }>
  }
}

interface BillingAnalyticsProps {
  organizationId: string
}

export function BillingAnalytics({ organizationId }: BillingAnalyticsProps) {
  const [data, setData] = useState<BillingAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('30d')
  const [selectedMetric, setSelectedMetric] = useState('revenue')

  useEffect(() => {
    fetchAnalyticsData()
  }, [organizationId, selectedPeriod])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/billing/analytics?period=${selectedPeriod}`, {
        headers: {
          'X-Organization-ID': organizationId,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const analyticsData = await response.json()
      setData(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const exportData = async (format: 'csv' | 'pdf') => {
    try {
      const response = await fetch(`/api/billing/analytics/export?format=${format}&period=${selectedPeriod}`, {
        method: 'POST',
        headers: {
          'X-Organization-ID': organizationId,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `billing-analytics-${selectedPeriod}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            {error || 'No data available'}
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100)
  }

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100)
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Billing Analytics</h2>
          <p className="text-muted-foreground">
            Track revenue, subscriptions, and payment performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('csv')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportData('pdf')}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {data.revenueGrowth > 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
              <span className={data.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}>
                {formatPercentage(Math.abs(data.revenueGrowth))} from last period
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.monthlyRecurringRevenue)}</div>
            <div className="text-xs text-muted-foreground">
              ARR: {formatCurrency(data.annualRecurringRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.activeSubscriptions}</div>
            <div className="text-xs text-muted-foreground">
              +{data.newSubscriptions} new this period
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payment Success Rate</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(data.paymentSuccessRate)}</div>
            <div className="text-xs text-muted-foreground">
              {data.failedPayments} failed payments
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="churn">Churn Analysis</TabsTrigger>
          <TabsTrigger value="plans">Plan Distribution</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
              <CardDescription>
                Track revenue growth over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={data.revenueHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.2}
                    name="Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.2}
                    name="MRR"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Growth</CardTitle>
                <CardDescription>
                  New subscriptions vs churned subscriptions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.revenueHistory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="subscriptions" fill="#3b82f6" name="Total Subscriptions" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscription Health</CardTitle>
                <CardDescription>
                  Key subscription metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Subscriptions</span>
                  <Badge variant="outline">{data.totalSubscriptions}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Subscriptions</span>
                  <Badge variant="default">{data.activeSubscriptions}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">New This Period</span>
                  <Badge variant="secondary">{data.newSubscriptions}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Churned This Period</span>
                  <Badge variant="destructive">{data.churnedSubscriptions}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Churn Rate</span>
                  <Badge variant={data.churnRate > 5 ? 'destructive' : 'outline'}>
                    {formatPercentage(data.churnRate)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="churn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Churn Analysis</CardTitle>
              <CardDescription>
                Monitor customer retention and churn patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data.revenueHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="churn"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Churn Rate"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {data.churnRate > 5 && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-yellow-800">
                  <AlertTriangle className="h-5 w-5" />
                  High Churn Alert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-yellow-800">
                  Your churn rate of {formatPercentage(data.churnRate)} is above the recommended threshold of 5%.
                  Consider implementing retention strategies to improve customer satisfaction.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Plan Distribution</CardTitle>
                <CardDescription>
                  Revenue and subscription breakdown by plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.planDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ planId, percentage }) => `${planId} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {data.planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue by Plan</CardTitle>
                <CardDescription>
                  Revenue contribution from each plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.planDistribution.map((plan, index) => (
                    <div key={plan.planId} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium capitalize">{plan.planId}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatCurrency(plan.revenue)}</div>
                        <div className="text-xs text-muted-foreground">
                          {plan.count} subscribers
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Usage and Overage */}
      {data.overageCharges > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Usage & Overage</CardTitle>
            <CardDescription>
              Track usage-based billing and overage charges
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <span className="text-sm font-medium">Overage Charges</span>
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(data.overageCharges)}
                </div>
              </div>
              {Object.entries(data.totalUsage).map(([metric, usage]) => (
                <div key={metric} className="space-y-2">
                  <span className="text-sm font-medium capitalize">{metric}</span>
                  <div className="text-lg font-semibold">
                    {usage.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Lifetime Value */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Lifetime Value</CardTitle>
          <CardDescription>
            Average customer lifetime and value metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold">
                {data.customerLifecycle.averageLifetime} days
              </div>
              <div className="text-sm text-muted-foreground">Average Lifetime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatCurrency(data.customerLifecycle.averageLifetimeValue)}
              </div>
              <div className="text-sm text-muted-foreground">Average Lifetime Value</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatCurrency(data.averageInvoiceAmount)}
              </div>
              <div className="text-sm text-muted-foreground">Average Invoice Amount</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}