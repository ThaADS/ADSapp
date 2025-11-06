import { NextRequest } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

type TypedSupabaseClient = SupabaseClient<Database>

interface RealtimeMetrics {
  activeConversations: number
  todayMessages: {
    total: number
    inbound: number
    outbound: number
    conversations: number
  }
  activeAgents: number
  pendingConversations: number
  unreadMessages: number
  averageResponseTime: number
  medianResponseTime: number
}

interface TrendData {
  messages: number
  conversations: number
  responseTime: number
}

interface HourlyData {
  hour: number
  count: number
}

interface AgentStats {
  id: string
  name: string
  messageCount: number
}

interface ActivityItem {
  id: string
  type: 'incoming' | 'outgoing'
  preview: string
  contactName: string
  agentName?: string
  timestamp: string
}

export async function GET(_request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const supabase = await createClient()

    // Get real-time metrics
    const [
      activeConversations,
      todayMessages,
      activeAgents,
      pendingConversations,
      unreadMessages,
      responseTimeData,
    ] = await Promise.all([
      getActiveConversations(supabase, profile.organization_id!),
      getTodayMessages(supabase, profile.organization_id!),
      getActiveAgents(supabase, profile.organization_id!),
      getPendingConversations(supabase, profile.organization_id!),
      getUnreadMessages(supabase, profile.organization_id!),
      getRecentResponseTimes(supabase, profile.organization_id!),
    ])

    // Calculate trends (last 24h vs previous 24h)
    const trends = await calculateTrends(supabase, profile.organization_id!)

    return createSuccessResponse({
      timestamp: new Date().toISOString(),
      metrics: {
        activeConversations,
        todayMessages,
        activeAgents,
        pendingConversations,
        unreadMessages,
        averageResponseTime: responseTimeData.average,
        medianResponseTime: responseTimeData.median,
      },
      trends,
      liveData: {
        conversationsToday: todayMessages.conversations,
        messagesPerHour: await getMessagesPerHour(supabase, profile.organization_id!),
        topActiveAgents: await getTopActiveAgents(supabase, profile.organization_id!),
        recentActivity: await getRecentActivity(supabase, profile.organization_id!),
      },
    })
  } catch (error) {
    console.error('Real-time analytics error:', error)
    return createErrorResponse(error)
  }
}

async function getActiveConversations(
  supabase: TypedSupabaseClient,
  organizationId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('organization_id', organizationId)
    .in('status', ['open', 'pending'])

  if (error) throw error
  return data?.length || 0
}

async function getTodayMessages(
  supabase: TypedSupabaseClient,
  organizationId: string
): Promise<{ total: number; inbound: number; outbound: number; conversations: number }> {
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('messages')
    .select('sender_type, conversation_id')
    .eq('organization_id', organizationId)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .lte('created_at', `${today}T23:59:59.999Z`)

  if (error) throw error

  const messages = data || []
  const conversations = new Set(messages.map(m => m.conversation_id))

  return {
    total: messages.length,
    inbound: messages.filter(m => m.sender_type === 'contact').length,
    outbound: messages.filter(m => m.sender_type === 'agent').length,
    conversations: conversations.size,
  }
}

async function getActiveAgents(
  supabase: TypedSupabaseClient,
  organizationId: string
): Promise<number> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, last_seen_at')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .gte('last_seen_at', fifteenMinutesAgo)

  if (error) throw error
  return data?.length || 0
}

async function getPendingConversations(
  supabase: TypedSupabaseClient,
  organizationId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')

  if (error) throw error
  return data?.length || 0
}

async function getUnreadMessages(
  supabase: TypedSupabaseClient,
  organizationId: string
): Promise<number> {
  const { data, error } = await supabase
    .from('messages')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('sender_type', 'contact')
    .eq('is_read', false)

  if (error) throw error
  return data?.length || 0
}

async function getRecentResponseTimes(
  supabase: TypedSupabaseClient,
  organizationId: string
): Promise<{ average: number; median: number; sampleSize: number }> {
  // Get recent agent responses with their corresponding incoming messages
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { data: agentMessages, error } = await supabase
    .from('messages')
    .select('conversation_id, created_at')
    .eq('organization_id', organizationId)
    .eq('sender_type', 'agent')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: true })

  if (error) throw error

  const responseTimes = []

  for (const agentMsg of agentMessages || []) {
    // Find the most recent contact message before this agent message
    const { data: contactMsg } = await supabase
      .from('messages')
      .select('created_at')
      .eq('conversation_id', agentMsg.conversation_id)
      .eq('sender_type', 'contact')
      .lt('created_at', agentMsg.created_at)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (contactMsg) {
      const responseTime =
        new Date(agentMsg.created_at).getTime() - new Date(contactMsg.created_at).getTime()
      responseTimes.push(responseTime)
    }
  }

  const average =
    responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

  const sorted = [...responseTimes].sort((a, b) => a - b)
  const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0

  return {
    average: Math.round(average / (1000 * 60)), // minutes
    median: Math.round(median / (1000 * 60)), // minutes
    sampleSize: responseTimes.length,
  }
}

async function calculateTrends(
  supabase: TypedSupabaseClient,
  organizationId: string
): Promise<TrendData> {
  const now = new Date()
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const previous24h = new Date(now.getTime() - 48 * 60 * 60 * 1000)

  const [currentPeriod, previousPeriod] = await Promise.all([
    getPeriodMetrics(supabase, organizationId, last24h, now),
    getPeriodMetrics(supabase, organizationId, previous24h, last24h),
  ])

  return {
    messages: calculatePercentageChange(currentPeriod.messages, previousPeriod.messages),
    conversations: calculatePercentageChange(
      currentPeriod.conversations,
      previousPeriod.conversations
    ),
    responseTime: calculatePercentageChange(
      previousPeriod.responseTime,
      currentPeriod.responseTime
    ), // Inverted for response time
  }
}

async function getPeriodMetrics(
  supabase: TypedSupabaseClient,
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<{ messages: number; conversations: number; responseTime: number }> {
  const [messagesData, conversationsData] = await Promise.all([
    supabase
      .from('messages')
      .select('id, conversation_id')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString()),

    supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', organizationId)
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString()),
  ])

  const messages = messagesData.data || []
  const conversations = conversationsData.data || []

  return {
    messages: messages.length,
    conversations: conversations.length,
    responseTime: 0, // Simplified for now
  }
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 100)
}

async function getMessagesPerHour(
  supabase: TypedSupabaseClient,
  organizationId: string
): Promise<HourlyData[]> {
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const { data: messages } = await supabase
    .from('messages')
    .select('created_at')
    .eq('organization_id', organizationId)
    .gte('created_at', last24Hours.toISOString())

  const hourlyData: Record<number, number> = {}
  const now = new Date()

  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
    const hourKey = hour.getHours()
    hourlyData[hourKey] = 0
  }

  for (const message of messages || []) {
    const hour = new Date(message.created_at).getHours()
    hourlyData[hour] = (hourlyData[hour] || 0) + 1
  }

  return Object.entries(hourlyData).map(([hour, count]) => ({
    hour: parseInt(hour),
    count: count as number,
  }))
}

async function getTopActiveAgents(
  supabase: TypedSupabaseClient,
  organizationId: string
): Promise<AgentStats[]> {
  const today = new Date().toISOString().split('T')[0]

  const { data: agents } = await supabase
    .from('profiles')
    .select(
      `
      id,
      full_name,
      messages!inner (
        id
      )
    `
    )
    .eq('organization_id', organizationId)
    .gte('messages.created_at', `${today}T00:00:00.000Z`)
    .eq('messages.sender_type', 'agent')

  const agentStats: Record<string, AgentStats> = {}

  for (const agent of agents || []) {
    if (!agentStats[agent.id]) {
      agentStats[agent.id] = {
        id: agent.id,
        name: agent.full_name || 'Unknown Agent',
        messageCount: 0,
      }
    }
    agentStats[agent.id].messageCount += (agent.messages as unknown[]).length
  }

  return Object.values(agentStats)
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 5)
}

async function getRecentActivity(
  supabase: TypedSupabaseClient,
  organizationId: string
): Promise<ActivityItem[]> {
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

  const { data: activities } = await supabase
    .from('messages')
    .select(
      `
      id,
      content,
      sender_type,
      created_at,
      conversations (
        contacts (
          name
        )
      ),
      profiles (
        full_name
      )
    `
    )
    .eq('organization_id', organizationId)
    .gte('created_at', thirtyMinutesAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  return (activities || []).map(activity => ({
    id: activity.id,
    type: activity.sender_type === 'contact' ? 'incoming' : 'outgoing',
    preview: activity.content.substring(0, 50) + (activity.content.length > 50 ? '...' : ''),
    contactName:
      (activity.conversations as { contacts?: { name?: string } } | null)?.contacts?.name ||
      'Unknown',
    agentName: (activity.profiles as { full_name?: string } | null)?.full_name,
    timestamp: activity.created_at,
  }))
}
