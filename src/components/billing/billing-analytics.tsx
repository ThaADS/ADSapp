'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { useTranslations } from '@/components/providers/translation-provider'

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
  const t = useTranslations('billing')
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
      const response = await fetch(
        `/api/billing/analytics/export?format=${format}&period=${selectedPeriod}`,
        {
          method: 'POST',
          headers: {
            'X-Organization-ID': organizationId,
          },
        }
      )

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
      <div className='space-y-6'>
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className='p-6'>
                <div className='animate-pulse'>
                  <div className='mb-2 h-4 w-3/4 rounded bg-gray-200'></div>
                  <div className='h-8 w-1/2 rounded bg-gray-200'></div>
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
        <CardContent className='p-6'>
          <div className='text-center text-red-600'>{error || t('errors.noDataAvailable')}</div>
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
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>{t('analytics.title')}</h2>
          <p className='text-muted-foreground'>
            {t('analytics.description')}
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className='w-32'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='7d'>{t('analytics.period.7d')}</SelectItem>
              <SelectItem value='30d'>{t('analytics.period.30d')}</SelectItem>
              <SelectItem value='90d'>{t('analytics.period.90d')}</SelectItem>
              <SelectItem value='1y'>{t('analytics.period.1y')}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant='outline'
            size='sm'
            onClick={() => exportData('csv')}
            className='flex items-center gap-2'
          >
            <Download className='h-4 w-4' />
            {t('analytics.exportCsv')}
          </Button>
          <Button
            variant='outline'
            size='sm'
            onClick={() => exportData('pdf')}
            className='flex items-center gap-2'
          >
            <Download className='h-4 w-4' />
            {t('analytics.exportPdf')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{t('analytics.totalRevenue')}</CardTitle>
            <DollarSign className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{formatCurrency(data.totalRevenue)}</div>
            <div className='text-muted-foreground flex items-center text-xs'>
              {data.revenueGrowth > 0 ? (
                <ArrowUpRight className='h-4 w-4 text-green-600' />
              ) : (
                <ArrowDownRight className='h-4 w-4 text-red-600' />
              )}
              <span className={data.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}>
                {t('analytics.fromLastPeriod', { change: formatPercentage(Math.abs(data.revenueGrowth)) })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{t('analytics.mrr')}</CardTitle>
            <TrendingUp className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{formatCurrency(data.monthlyRecurringRevenue)}</div>
            <div className='text-muted-foreground text-xs'>
              {t('analytics.arr', { amount: formatCurrency(data.annualRecurringRevenue) })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{t('analytics.activeSubscriptions')}</CardTitle>
            <Users className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{data.activeSubscriptions}</div>
            <div className='text-muted-foreground text-xs'>
              {t('analytics.newThisPeriod', { count: data.newSubscriptions })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>{t('analytics.paymentSuccessRate')}</CardTitle>
            <CreditCard className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{formatPercentage(data.paymentSuccessRate)}</div>
            <div className='text-muted-foreground text-xs'>
              {t('analytics.failedPayments', { count: data.failedPayments })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs value={selectedMetric} onValueChange={setSelectedMetric} className='space-y-4'>
        <TabsList>
          <TabsTrigger value='revenue'>{t('analytics.revenue')}</TabsTrigger>
          <TabsTrigger value='subscriptions'>{t('analytics.subscriptions')}</TabsTrigger>
          <TabsTrigger value='churn'>{t('analytics.churnAnalysis')}</TabsTrigger>
          <TabsTrigger value='plans'>{t('analytics.planDistribution')}</TabsTrigger>
        </TabsList>

        <TabsContent value='revenue' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.revenueTrend')}</CardTitle>
              <CardDescription>{t('analytics.trackRevenueGrowth')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width='100%' height={350}>
                <AreaChart data={data.revenueHistory}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='period' />
                  <YAxis tickFormatter={value => formatCurrency(value)} />
                  <Tooltip formatter={value => formatCurrency(value as number)} />
                  <Legend />
                  <Area
                    type='monotone'
                    dataKey='revenue'
                    stroke='#3b82f6'
                    fill='#3b82f6'
                    fillOpacity={0.2}
                    name={t('analytics.revenue')}
                  />
                  <Area
                    type='monotone'
                    dataKey='mrr'
                    stroke='#10b981'
                    fill='#10b981'
                    fillOpacity={0.2}
                    name='MRR'
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='subscriptions' className='space-y-4'>
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.subscriptionGrowth')}</CardTitle>
                <CardDescription>{t('analytics.subscriptionGrowthDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <BarChart data={data.revenueHistory}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='period' />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey='subscriptions' fill='#3b82f6' name={t('analytics.totalSubscriptions')} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.subscriptionHealth')}</CardTitle>
                <CardDescription>{t('analytics.subscriptionHealthDescription')}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>{t('analytics.totalSubscriptions')}</span>
                  <Badge variant='outline'>{data.totalSubscriptions}</Badge>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>{t('analytics.activeSubscriptions')}</span>
                  <Badge variant='default'>{data.activeSubscriptions}</Badge>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>{t('analytics.newThisLabel')}</span>
                  <Badge variant='secondary'>{data.newSubscriptions}</Badge>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>{t('analytics.churnedThisLabel')}</span>
                  <Badge variant='destructive'>{data.churnedSubscriptions}</Badge>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium'>{t('analytics.churnRate')}</span>
                  <Badge variant={data.churnRate > 5 ? 'destructive' : 'outline'}>
                    {formatPercentage(data.churnRate)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value='churn' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>{t('analytics.churnAnalysis')}</CardTitle>
              <CardDescription>{t('analytics.churnDescription')}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width='100%' height={350}>
                <LineChart data={data.revenueHistory}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='period' />
                  <YAxis tickFormatter={value => `${value}%`} />
                  <Tooltip formatter={value => `${value}%`} />
                  <Legend />
                  <Line
                    type='monotone'
                    dataKey='churn'
                    stroke='#ef4444'
                    strokeWidth={2}
                    name={t('analytics.churnRate')}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {data.churnRate > 5 && (
            <Card className='border-yellow-200 bg-yellow-50'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2 text-yellow-800'>
                  <AlertTriangle className='h-5 w-5' />
                  {t('analytics.highChurnAlert')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-yellow-800'>
                  {t('analytics.highChurnMessage', { rate: formatPercentage(data.churnRate) })}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value='plans' className='space-y-4'>
          <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
            <Card>
              <CardHeader>
                <CardTitle>{t('analytics.planDistribution')}</CardTitle>
                <CardDescription>{t('analytics.planBreakdown')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width='100%' height={300}>
                  <PieChart>
                    <Pie
                      data={data.planDistribution}
                      cx='50%'
                      cy='50%'
                      labelLine={false}
                      label={({ planId, percentage }) => `${planId} (${percentage}%)`}
                      outerRadius={80}
                      fill='#8884d8'
                      dataKey='count'
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
                <CardTitle>{t('analytics.revenueByPlan')}</CardTitle>
                <CardDescription>{t('analytics.revenueContribution')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {data.planDistribution.map((plan, index) => (
                    <div key={plan.planId} className='flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <div
                          className='h-3 w-3 rounded-full'
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className='text-sm font-medium capitalize'>{plan.planId}</span>
                      </div>
                      <div className='text-right'>
                        <div className='text-sm font-medium'>{formatCurrency(plan.revenue)}</div>
                        <div className='text-muted-foreground text-xs'>
                          {t('analytics.subscribers', { count: plan.count })}
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
            <CardTitle>{t('analytics.usageOverage')}</CardTitle>
            <CardDescription>{t('analytics.overageDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
              <div className='space-y-2'>
                <span className='text-sm font-medium'>{t('analytics.overageCharges')}</span>
                <div className='text-2xl font-bold text-orange-600'>
                  {formatCurrency(data.overageCharges)}
                </div>
              </div>
              {Object.entries(data.totalUsage).map(([metric, usage]) => (
                <div key={metric} className='space-y-2'>
                  <span className='text-sm font-medium capitalize'>{metric}</span>
                  <div className='text-lg font-semibold'>{usage.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Lifetime Value */}
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.customerLifetime')}</CardTitle>
          <CardDescription>{t('analytics.lifetimeDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-3'>
            <div className='text-center'>
              <div className='text-2xl font-bold'>
                {data.customerLifecycle.averageLifetime} {t('analytics.days')}
              </div>
              <div className='text-muted-foreground text-sm'>{t('analytics.averageLifetime')}</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold'>
                {formatCurrency(data.customerLifecycle.averageLifetimeValue)}
              </div>
              <div className='text-muted-foreground text-sm'>{t('analytics.averageLifetimeValue')}</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold'>{formatCurrency(data.averageInvoiceAmount)}</div>
              <div className='text-muted-foreground text-sm'>{t('analytics.averageInvoiceAmount')}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
