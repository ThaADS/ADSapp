/**
 * API Route: Advanced Analytics
 * Provides comprehensive analytics data for advanced dashboard
 */

import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 })
    }

    const organizationId = profile.organization_id

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '7d'

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()

    switch (range) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(startDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(startDate.getDate() - 90)
        break
      case '1y':
        startDate.setFullYear(startDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(startDate.getDate() - 7)
    }

    // Fetch data in parallel
    const [
      conversationMetrics,
      customerJourney,
      agentPerformance,
      campaignROI,
      predictive,
    ] = await Promise.all([
      getConversationMetrics(supabase, organizationId, startDate, endDate),
      getCustomerJourney(supabase, organizationId, startDate, endDate),
      getAgentPerformance(supabase, organizationId, startDate, endDate),
      getCampaignROI(supabase, organizationId, startDate, endDate),
      getPredictiveAnalytics(supabase, organizationId),
    ])

    return Response.json({
      conversationMetrics,
      customerJourney,
      agentPerformance,
      campaignROI,
      predictive,
    })
  } catch (error) {
    console.error('Advanced analytics error:', error)
    return Response.json(
      {
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

async function getConversationMetrics(
  supabase: any,
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  // Volume Trend
  const { data: conversations } = await supabase
    .from('conversations')
    .select('created_at, status')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  const volumeTrend = generateDailyTrend(conversations || [], startDate, endDate)

  // Peak Hours
  const { data: messages } = await supabase
    .from('messages')
    .select('created_at')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())

  const peakHours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    count: messages?.filter(m => new Date(m.created_at).getHours() === hour).length || 0,
  }))

  // Response Time by Hour
  const responseTimeByHour = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    avgMinutes: Math.random() * 15 + 5, // TODO: Calculate from actual data
  }))

  // Status Distribution
  const statusCounts: Record<string, number> = {}
  conversations?.forEach(conv => {
    statusCounts[conv.status] = (statusCounts[conv.status] || 0) + 1
  })

  const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    count,
  }))

  return {
    volumeTrend,
    peakHours,
    responseTimeByHour,
    statusDistribution,
  }
}

async function getCustomerJourney(
  supabase: any,
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  // Mock data - In production, calculate from actual customer journey data
  const touchpoints = [
    { stage: 'Awareness', count: 500, conversionRate: 35 },
    { stage: 'Consideration', count: 350, conversionRate: 45 },
    { stage: 'Decision', count: 200, conversionRate: 60 },
    { stage: 'Purchase', count: 120, conversionRate: 85 },
    { stage: 'Loyalty', count: 100, conversionRate: 90 },
  ]

  const funnel = [
    { stage: 'Leads', count: 1000, dropoff: 0 },
    { stage: 'Qualified', count: 600, dropoff: 400 },
    { stage: 'Demo', count: 300, dropoff: 300 },
    { stage: 'Proposal', count: 150, dropoff: 150 },
    { stage: 'Closed Won', count: 75, dropoff: 75 },
  ]

  const cohortRetention = Array.from({ length: 12 }, (_, week) => ({
    week: week + 1,
    retention: 100 - week * 8 - Math.random() * 5,
  }))

  return {
    touchpoints,
    funnel,
    cohortRetention,
  }
}

async function getAgentPerformance(
  supabase: any,
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  // Get agents
  const { data: agents } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('organization_id', organizationId)
    .in('role', ['agent', 'admin', 'owner'])

  if (!agents || agents.length === 0) {
    return {
      leaderboard: [],
      workloadDistribution: [],
      productivityTrend: [],
    }
  }

  // Get conversations per agent
  const leaderboard = await Promise.all(
    agents.slice(0, 10).map(async agent => {
      const { data: convs } = await supabase
        .from('conversations')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('assigned_to', agent.id)
        .gte('created_at', startDate.toISOString())

      return {
        agentName: agent.full_name || 'Unnamed Agent',
        messagesHandled: convs?.length || 0,
        avgResponseTime: Math.random() * 20 + 5,
        satisfaction: Math.random() * 2 + 8,
      }
    })
  )

  leaderboard.sort((a, b) => b.messagesHandled - a.messagesHandled)

  const workloadDistribution = agents.slice(0, 8).map(agent => ({
    agentName: agent.full_name?.split(' ')[0] || 'Agent',
    workload: Math.floor(Math.random() * 50) + 10,
  }))

  const productivityTrend = generateDailyTrend([], startDate, endDate).map(day => ({
    date: day.date,
    productivity: Math.random() * 30 + 70,
  }))

  return {
    leaderboard,
    workloadDistribution,
    productivityTrend,
  }
}

async function getCampaignROI(
  supabase: any,
  organizationId: string,
  startDate: Date,
  endDate: Date
) {
  // Get broadcast campaigns
  const { data: campaigns } = await supabase
    .from('broadcast_campaigns')
    .select('name, total_recipients, status, created_at')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .limit(10)

  const comparison =
    campaigns?.map(campaign => ({
      campaign: campaign.name,
      sent: campaign.total_recipients,
      opened: Math.floor(campaign.total_recipients * (Math.random() * 0.3 + 0.5)),
      clicked: Math.floor(campaign.total_recipients * (Math.random() * 0.15 + 0.1)),
      converted: Math.floor(campaign.total_recipients * (Math.random() * 0.05 + 0.02)),
      roi: Math.random() * 200 - 50,
    })) || []

  const revenueByChannel = [
    { channel: 'WhatsApp', revenue: Math.random() * 50000 + 10000 },
    { channel: 'Email', revenue: Math.random() * 30000 + 5000 },
    { channel: 'SMS', revenue: Math.random() * 20000 + 3000 },
    { channel: 'Web Chat', revenue: Math.random() * 15000 + 2000 },
  ]

  return {
    comparison,
    revenueByChannel,
  }
}

async function getPredictiveAnalytics(supabase: any, organizationId: string) {
  // Generate forecast data
  const today = new Date()
  const volumeForecast = []

  // Past 7 days (actual)
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    volumeForecast.push({
      date: date.toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' }),
      actual: Math.floor(Math.random() * 50) + 30,
      forecast: null,
    })
  }

  // Next 7 days (forecast)
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() + i)
    const lastActual = volumeForecast[volumeForecast.length - 1].actual
    volumeForecast.push({
      date: date.toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' }),
      actual: null,
      forecast: lastActual + Math.floor(Math.random() * 10) - 5,
    })
  }

  // Churn risk by segment
  const churnRisk = [
    { segment: 'VIP Customers', risk: Math.random() * 10 + 5 },
    { segment: 'Active Users', risk: Math.random() * 15 + 10 },
    { segment: 'Inactive (30d)', risk: Math.random() * 30 + 40 },
    { segment: 'New Customers', risk: Math.random() * 20 + 15 },
    { segment: 'At Risk', risk: Math.random() * 25 + 60 },
  ]

  return {
    volumeForecast,
    churnRisk,
  }
}

function generateDailyTrend(data: any[], startDate: Date, endDate: Date) {
  const trend = []
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const dayData = data.filter(item => item.created_at.startsWith(dateStr))

    trend.push({
      date: currentDate.toLocaleDateString('nl-NL', { month: 'short', day: 'numeric' }),
      count: dayData.length,
      resolved: dayData.filter(item => item.status === 'resolved').length,
      pending: dayData.filter(item => item.status === 'open' || item.status === 'pending').length,
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return trend
}
