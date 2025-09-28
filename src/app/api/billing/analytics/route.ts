import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'
    const organizationId = request.headers.get('X-Organization-ID')

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get organization data
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id, subscription_tier')
      .eq('id', organizationId)
      .single()

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(endDate.getDate() - 30)
    }

    // Get invoice data
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Get subscription data
    const { data: subscriptionHistory } = await supabase
      .from('subscription_changes')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('effective_date', startDate.toISOString())
      .lte('effective_date', endDate.toISOString())
      .order('effective_date', { ascending: true })

    // Get usage data
    const { data: usageData } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('period_start', startDate.toISOString())
      .order('period_start', { ascending: true })

    // Calculate revenue metrics
    const paidInvoices = invoices?.filter(inv => inv.status === 'paid') || []
    const failedInvoices = invoices?.filter(inv =>
      inv.status === 'uncollectible' ||
      (inv.status === 'open' && inv.attempt_count >= 3)
    ) || []

    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0)
    const averageInvoiceAmount = invoices?.length ?
      invoices.reduce((sum, inv) => sum + inv.amount, 0) / invoices.length : 0

    const paymentSuccessRate = invoices?.length ?
      (paidInvoices.length / invoices.length) * 100 : 100

    // Calculate MRR/ARR (simplified - assumes subscription is active)
    const currentPlan = await getPlanDetails(org.subscription_tier)
    const monthlyRecurringRevenue = currentPlan?.price || 0
    const annualRecurringRevenue = monthlyRecurringRevenue * 12

    // Calculate revenue growth (compare with previous period)
    const previousStartDate = new Date(startDate)
    const previousEndDate = new Date(startDate)
    const periodDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    previousStartDate.setDate(previousStartDate.getDate() - periodDays)

    const { data: previousInvoices } = await supabase
      .from('invoices')
      .select('amount, status')
      .eq('organization_id', organizationId)
      .gte('created_at', previousStartDate.toISOString())
      .lte('created_at', previousEndDate.toISOString())

    const previousRevenue = previousInvoices?.filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0) || 0

    const revenueGrowth = previousRevenue > 0 ?
      ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

    // Generate historical data
    const revenueHistory = generateRevenueHistory(invoices || [], period, startDate, endDate)

    // Calculate plan distribution
    const planDistribution = calculatePlanDistribution(subscriptionHistory || [], currentPlan)

    // Calculate usage totals
    const totalUsage = usageData?.reduce((acc, usage) => ({
      messages: acc.messages + (usage.messages_sent || 0),
      users: acc.users + (usage.users_active || 0),
      contacts: acc.contacts + (usage.contacts_managed || 0),
      automations: acc.automations + (usage.automation_runs || 0),
      apiCalls: acc.apiCalls + (usage.api_calls || 0),
      storage: acc.storage + (usage.storage_used || 0),
    }), {
      messages: 0,
      users: 0,
      contacts: 0,
      automations: 0,
      apiCalls: 0,
      storage: 0,
    }) || {
      messages: 0,
      users: 0,
      contacts: 0,
      automations: 0,
      apiCalls: 0,
      storage: 0,
    }

    const overageCharges = usageData?.reduce((sum, usage) =>
      sum + (usage.overage_charges || 0), 0) || 0

    // Calculate customer lifecycle (simplified)
    const customerLifetime = 365 // Default to 1 year
    const customerLifetimeValue = monthlyRecurringRevenue * 12

    const analyticsData = {
      totalRevenue,
      monthlyRecurringRevenue,
      annualRecurringRevenue,
      revenueGrowth,
      totalSubscriptions: 1, // Single organization
      activeSubscriptions: org.subscription_tier !== 'cancelled' ? 1 : 0,
      newSubscriptions: subscriptionHistory?.filter(s => s.reason === 'upgrade').length || 0,
      churnedSubscriptions: subscriptionHistory?.filter(s => s.reason === 'cancellation').length || 0,
      churnRate: 0, // Would need more historical data to calculate properly
      successfulPayments: paidInvoices.length,
      failedPayments: failedInvoices.length,
      paymentSuccessRate,
      averageInvoiceAmount,
      totalUsage,
      overageCharges,
      revenueHistory,
      planDistribution,
      customerLifecycle: {
        averageLifetime: customerLifetime,
        averageLifetimeValue: customerLifetimeValue,
        cohortData: [], // Would need more complex calculations
      },
    }

    return NextResponse.json(analyticsData)
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions
async function getPlanDetails(planId: string) {
  const plans = {
    starter: { price: 0 },
    professional: { price: 2900 }, // $29/month in cents
    enterprise: { price: 9900 }, // $99/month in cents
  }
  return plans[planId as keyof typeof plans] || plans.starter
}

function generateRevenueHistory(
  invoices: any[],
  period: string,
  startDate: Date,
  endDate: Date
) {
  const history = []
  const periodLength = period === '7d' ? 1 : period === '30d' ? 7 : period === '90d' ? 7 : 30

  let currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const periodEnd = new Date(currentDate)
    periodEnd.setDate(periodEnd.getDate() + periodLength)

    const periodInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.created_at)
      return invDate >= currentDate && invDate < periodEnd
    })

    const revenue = periodInvoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.amount, 0)

    const subscriptions = 1 // Simplified for single organization
    const mrr = revenue // Simplified
    const churn = 0 // Simplified

    history.push({
      period: currentDate.toISOString().split('T')[0],
      revenue,
      subscriptions,
      mrr,
      churn,
    })

    currentDate = new Date(periodEnd)
  }

  return history
}

function calculatePlanDistribution(subscriptionHistory: any[], currentPlan: any) {
  // Simplified for single organization
  return [
    {
      planId: 'professional', // Current plan
      count: 1,
      revenue: currentPlan?.price || 0,
      percentage: 100,
    },
  ]
}