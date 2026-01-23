import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const organizationId = profile.organization_id
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'

    // Calculate date thresholds
    const now = new Date()
    const thresholds = {
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      '12m': new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
    }

    const startDate = thresholds[range as keyof typeof thresholds] || thresholds['30d']
    const previousStartDate = new Date(startDate.getTime() - (now.getTime() - startDate.getTime()))

    // Fetch subscriptions data for the current period
    const { data: currentSubscriptions, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())

    if (subsError) throw subsError

    // Fetch subscriptions data for the previous period (for comparison)
    const { data: previousSubscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', previousStartDate.toISOString())
      .lt('created_at', startDate.toISOString())

    // Fetch all active subscriptions
    const { data: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'active')

    // Fetch organization contacts (customers)
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, created_at, metadata')
      .eq('organization_id', organizationId)

    // Calculate Total Revenue
    const totalRevenue = (currentSubscriptions || []).reduce((sum, sub) => {
      return sum + (parseFloat(sub.amount) || 0)
    }, 0)

    const previousRevenue = (previousSubscriptions || []).reduce((sum, sub) => {
      return sum + (parseFloat(sub.amount) || 0)
    }, 0)

    const revenueGrowth = {
      current: totalRevenue,
      previous: previousRevenue,
      percentageChange:
        previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0,
    }

    // Calculate MRR (Monthly Recurring Revenue)
    const monthlyRecurringRevenue = (activeSubscriptions || []).reduce((sum, sub) => {
      const amount = parseFloat(sub.amount) || 0

      // Convert to monthly
      if (sub.billing_interval === 'month') return sum + amount
      if (sub.billing_interval === 'year') return sum + amount / 12
      if (sub.billing_interval === 'quarter') return sum + amount / 3

      return sum + amount
    }, 0)

    // Calculate Growth Rate (MRR growth)
    const previousMRR = (previousSubscriptions || []).reduce((sum, sub) => {
      const amount = parseFloat(sub.amount) || 0
      if (sub.billing_interval === 'month') return sum + amount
      if (sub.billing_interval === 'year') return sum + amount / 12
      return sum + amount
    }, 0)

    const growthRate =
      previousMRR > 0 ? ((monthlyRecurringRevenue - previousMRR) / previousMRR) * 100 : 0

    // Calculate ARPU (Average Revenue Per User)
    const totalCustomers = (contacts || []).length
    const averageRevenuePerUser = totalCustomers > 0 ? monthlyRecurringRevenue / totalCustomers : 0

    // Calculate Customer Lifetime Value (CLV)
    // CLV = ARPU * Average Customer Lifespan / Churn Rate
    const averageLifespanMonths = 24 // Assumption: 2 years average
    const customerLifetimeValue = averageRevenuePerUser * averageLifespanMonths

    // Calculate Churn Rate
    const cancelledSubscriptions = (currentSubscriptions || []).filter(
      sub => sub.status === 'cancelled' || sub.status === 'expired'
    ).length
    const totalActiveSubscriptions = (activeSubscriptions || []).length
    const churnRate =
      totalActiveSubscriptions > 0 ? (cancelledSubscriptions / totalActiveSubscriptions) * 100 : 0

    // Calculate Conversion Rate
    // Conversion Rate = (Paying Customers / Total Contacts) * 100
    const payingCustomers = totalActiveSubscriptions
    const conversionRate = totalCustomers > 0 ? (payingCustomers / totalCustomers) * 100 : 0

    // Revenue by Month
    const revenueByMonth = generateMonthlyRevenue(currentSubscriptions || [], range)

    // Revenue by Plan
    const planRevenue: Record<string, { value: number; count: number }> = {}

    ;(activeSubscriptions || []).forEach(sub => {
      const planName = sub.plan_name || 'Unknown Plan'
      const amount = parseFloat(sub.amount) || 0

      if (!planRevenue[planName]) {
        planRevenue[planName] = { value: 0, count: 0 }
      }

      planRevenue[planName].value += amount
      planRevenue[planName].count += 1
    })

    const revenueByPlan = Object.entries(planRevenue).map(([name, data]) => ({
      name,
      value: data.value,
      count: data.count,
    }))

    // Revenue by Source
    const sourceRevenue: Record<string, number> = {}

    ;(currentSubscriptions || []).forEach(sub => {
      const source = (sub.metadata as any)?.source || 'Direct'
      const amount = parseFloat(sub.amount) || 0
      sourceRevenue[source] = (sourceRevenue[source] || 0) + amount
    })

    const revenueBySource = Object.entries(sourceRevenue).map(([source, amount]) => ({
      source,
      amount,
      percentage: totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0,
    }))

    // Customer Acquisition Cost (CAC)
    // Simplified calculation: Total Marketing Spend / New Customers
    // For this demo, we'll use an estimated CAC based on plan prices
    const customerAcquisitionCost = averageRevenuePerUser * 0.3 // Assume 30% of ARPU

    // Payback Period (months)
    // Payback Period = CAC / ARPU
    const paybackPeriod =
      averageRevenuePerUser > 0 ? Math.round(customerAcquisitionCost / averageRevenuePerUser) : 0

    const metrics: RevenueMetrics = {
      totalRevenue,
      monthlyRecurringRevenue,
      averageRevenuePerUser,
      customerLifetimeValue,
      conversionRate,
      churnRate,
      growthRate,
      revenueGrowth,
      revenueByMonth,
      revenueByPlan,
      revenueBySource,
      customerAcquisitionCost,
      paybackPeriod,
    }

    return NextResponse.json({ metrics }, { status: 200 })
  } catch (error) {
    console.error('Revenue analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch revenue analytics' }, { status: 500 })
  }
}

// Helper function to generate monthly revenue data
function generateMonthlyRevenue(
  subscriptions: any[],
  range: string
): Array<{
  month: string
  revenue: number
  subscriptions: number
  customers: number
}> {
  const monthsToShow = range === '7d' ? 1 : range === '30d' ? 3 : range === '90d' ? 6 : 12
  const monthlyData: Record<
    string,
    { revenue: number; subscriptions: Set<string>; customers: Set<string> }
  > = {}

  // Initialize months
  const now = new Date()
  for (let i = monthsToShow - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = date.toLocaleDateString('nl-NL', { year: 'numeric', month: 'short' })
    monthlyData[monthKey] = { revenue: 0, subscriptions: new Set(), customers: new Set() }
  }

  // Aggregate subscription data by month
  subscriptions.forEach(sub => {
    const subDate = new Date(sub.created_at)
    const monthKey = subDate.toLocaleDateString('nl-NL', { year: 'numeric', month: 'short' })

    if (monthlyData[monthKey]) {
      monthlyData[monthKey].revenue += parseFloat(sub.amount) || 0
      monthlyData[monthKey].subscriptions.add(sub.id)
      if (sub.organization_id) {
        monthlyData[monthKey].customers.add(sub.organization_id)
      }
    }
  })

  // Convert to array format
  return Object.entries(monthlyData).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    subscriptions: data.subscriptions.size,
    customers: data.customers.size,
  }))
}
