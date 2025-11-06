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

interface OverviewMetrics {
  totalMessages: number
  inboundMessages: number
  outboundMessages: number
  newConversations: number
  resolvedConversations: number
  newContacts: number
  activeUsers: number
}

interface ConversationMetrics {
  total: number
  statusDistribution: Record<string, number>
  assigned: number
  unassigned: number
  assignmentRate: number
}

interface MessageTrend {
  period: string
  inbound: number
  outbound: number
  total: number
}

interface ResponseTimes {
  averageMinutes: number
  medianMinutes: number
  sampleSize: number
}

interface AgentStats {
  id: string
  name: string
  messageCount: number
}

interface ContactSource {
  source: string
  count: number
}

interface DashboardResponse {
  timeframe: string
  dateRange: {
    start: string
    end: string
  }
  metrics: OverviewMetrics
  conversationMetrics: ConversationMetrics
  messageTrends: MessageTrend[]
  responseTimes: ResponseTimes
  topAgents: AgentStats[]
  contactSources: ContactSource[]
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '7d'
    // const timezone = searchParams.get('timezone') || 'UTC' // TODO: Implement timezone support

    const supabase = await createClient()

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()

    switch (timeframe) {
      case '1d':
        startDate.setDate(endDate.getDate() - 1)
        break
      case '7d':
        startDate.setDate(endDate.getDate() - 7)
        break
      case '30d':
        startDate.setDate(endDate.getDate() - 30)
        break
      case '90d':
        startDate.setDate(endDate.getDate() - 90)
        break
      default:
        startDate.setDate(endDate.getDate() - 7)
    }

    // Get overview metrics
    const metrics = await getOverviewMetrics(supabase, profile.organization_id!, startDate, endDate)

    // Get conversation metrics
    const conversationMetrics = await getConversationMetrics(
      supabase,
      profile.organization_id!,
      startDate,
      endDate
    )

    // Get message trends
    const messageTrends = await getMessageTrends(
      supabase,
      profile.organization_id!,
      startDate,
      endDate,
      timeframe
    )

    // Get response times
    const responseTimes = await getResponseTimes(
      supabase,
      profile.organization_id!,
      startDate,
      endDate
    )

    // Get top agents
    const topAgents = await getTopAgents(supabase, profile.organization_id!, startDate, endDate)

    // Get contact sources
    const contactSources = await getContactSources(
      supabase,
      profile.organization_id!,
      startDate,
      endDate
    )

    return createSuccessResponse({
      timeframe,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      metrics,
      conversationMetrics,
      messageTrends,
      responseTimes,
      topAgents,
      contactSources,
    })
  } catch (error) {
    console.error('Analytics dashboard error:', error)
    return createErrorResponse(error)
  }
}

async function getOverviewMetrics(
  supabase: TypedSupabaseClient,
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<OverviewMetrics> {
  const [messagesResult, conversationsResult, contactsResult, activeUsersResult] =
    await Promise.all([
      // Total messages in period
      supabase
        .from('messages')
        .select('sender_type, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),

      // Conversations in period
      supabase
        .from('conversations')
        .select('status, created_at, last_message_at')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),

      // New contacts in period
      supabase
        .from('contacts')
        .select('created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),

      // Active users
      supabase
        .from('profiles')
        .select('last_seen_at')
        .eq('organization_id', organizationId)
        .gte('last_seen_at', startDate.toISOString()),
    ])

  const messages = messagesResult.data || []
  const conversations = conversationsResult.data || []
  const contacts = contactsResult.data || []
  const activeUsers = activeUsersResult.data || []

  const inboundMessages = messages.filter(m => m.sender_type === 'contact').length
  const outboundMessages = messages.filter(m => m.sender_type === 'agent').length

  return {
    totalMessages: messages.length,
    inboundMessages,
    outboundMessages,
    newConversations: conversations.length,
    resolvedConversations: conversations.filter(c => c.status === 'resolved').length,
    newContacts: contacts.length,
    activeUsers: activeUsers.length,
  }
}

async function getConversationMetrics(
  supabase: TypedSupabaseClient,
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<ConversationMetrics> {
  const { data: conversations } = await supabase
    .from('conversations')
    .select('status, created_at, last_message_at, assigned_to')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  const convs = conversations || []

  const statusDistribution = convs.reduce(
    (acc, conv) => {
      acc[conv.status] = (acc[conv.status] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  const assigned = convs.filter(c => c.assigned_to).length
  const unassigned = convs.length - assigned

  return {
    total: convs.length,
    statusDistribution,
    assigned,
    unassigned,
    assignmentRate: convs.length > 0 ? Math.round((assigned / convs.length) * 100) : 0,
  }
}

async function getMessageTrends(
  supabase: TypedSupabaseClient,
  organizationId: string,
  startDate: Date,
  endDate: Date,
  timeframe: string
): Promise<MessageTrend[]> {
  const { data: messages } = await supabase
    .from('messages')
    .select('sender_type, created_at')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true })

  const msgs = messages || []

  // Group messages by time period
  const groupBy = timeframe === '1d' ? 'hour' : 'day'
  const trends = msgs.reduce(
    (acc, msg) => {
      const date = new Date(msg.created_at)
      const key =
        groupBy === 'hour'
          ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      if (!acc[key]) {
        acc[key] = { inbound: 0, outbound: 0, total: 0 }
      }

      if (msg.sender_type === 'contact') {
        acc[key].inbound++
      } else if (msg.sender_type === 'agent') {
        acc[key].outbound++
      }
      acc[key].total++

      return acc
    },
    {} as Record<string, { inbound: number; outbound: number; total: number }>
  )

  return Object.entries(trends)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      period,
      ...data,
    }))
}

async function getResponseTimes(
  supabase: TypedSupabaseClient,
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<ResponseTimes> {
  // This is a simplified version - in production, you'd want to track actual response times
  const { data: conversations } = await supabase
    .from('conversations')
    .select('created_at, last_message_at, assigned_to')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .not('assigned_to', 'is', null)

  const convs = conversations || []

  const responseTimes = convs
    .filter(conv => conv.last_message_at) // Filter out null values
    .map(conv => {
      const created = new Date(conv.created_at).getTime()
      const lastMessage = new Date(conv.last_message_at!).getTime()
      return lastMessage - created
    })
    .filter(time => time > 0)

  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0

  const medianResponseTime =
    responseTimes.length > 0
      ? responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length / 2)]
      : 0

  return {
    averageMinutes: Math.round(avgResponseTime / (1000 * 60)),
    medianMinutes: Math.round(medianResponseTime / (1000 * 60)),
    sampleSize: responseTimes.length,
  }
}

async function getTopAgents(
  supabase: TypedSupabaseClient,
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<AgentStats[]> {
  const { data: messages } = await supabase
    .from('messages')
    .select('sender_id, profiles(full_name)')
    .eq('sender_type', 'agent')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .not('sender_id', 'is', null)

  const msgs = messages || []

  const agentStats = msgs.reduce(
    (acc, msg) => {
      const agentId = msg.sender_id
      if (agentId && !acc[agentId]) {
        acc[agentId] = {
          id: agentId,
          name: (msg.profiles as { full_name?: string } | null)?.full_name || 'Unknown',
          messageCount: 0,
        }
      }
      if (agentId) {
        acc[agentId].messageCount++
      }
      return acc
    },
    {} as Record<string, AgentStats>
  )

  return Object.values(agentStats)
    .sort((a, b) => b.messageCount - a.messageCount)
    .slice(0, 10)
}

async function getContactSources(
  supabase: TypedSupabaseClient,
  organizationId: string,
  startDate: Date,
  endDate: Date
): Promise<ContactSource[]> {
  // TODO: Phase 3 - Add metadata column to contacts table for source tracking
  // For now, return count of all contacts as 'direct' source
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())

  const totalCount = contacts?.length || 0

  // Return all contacts as 'direct' source until metadata tracking is implemented
  return totalCount > 0 ? [{ source: 'direct', count: totalCount }] : []
}
