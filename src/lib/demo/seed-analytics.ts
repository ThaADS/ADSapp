/**
 * Seed Analytics Data for Demo Organization
 * Creates 90 days of realistic analytics metrics
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { DEMO_ORG_ID, DEMO_USERS } from './dutch-data'

// Daily metrics data structure
interface DailyMetrics {
  date: string
  organization_id: string
  conversations_total: number
  conversations_new: number
  conversations_resolved: number
  messages_inbound: number
  messages_outbound: number
  avg_response_time_minutes: number
  avg_resolution_time_hours: number
  satisfaction_score: number
  template_usage_rate: number
  automation_triggered: number
  unique_contacts: number
  returning_contacts: number
  peak_hour: number
  metadata: Record<string, unknown>
}

// Generate realistic analytics data with trends and patterns
function generateDailyMetrics(daysAgo: number): DailyMetrics {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const dayOfWeek = date.getDay() // 0 = Sunday

  // Weekend vs weekday adjustment
  const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.3 : 1.0

  // Trend: gradual growth over time (older = less traffic)
  const trendMultiplier = 0.7 + (0.3 * (90 - daysAgo) / 90)

  // Seasonal variation (simulate Black Friday period ~30 days ago)
  const blackFridayBoost = (daysAgo >= 28 && daysAgo <= 32) ? 1.8 : 1.0

  // Random daily variation
  const randomVariation = 0.8 + Math.random() * 0.4

  const baseConversations = 35
  const conversations = Math.floor(
    baseConversations * weekendMultiplier * trendMultiplier * blackFridayBoost * randomVariation
  )

  const newConversations = Math.floor(conversations * (0.3 + Math.random() * 0.2))
  const resolvedConversations = Math.floor(conversations * (0.7 + Math.random() * 0.2))

  const messagesInbound = Math.floor(conversations * (3 + Math.random() * 2))
  const messagesOutbound = Math.floor(messagesInbound * (1.2 + Math.random() * 0.3))

  // Response time varies by day of week (Monday slower due to weekend backlog)
  const baseResponseTime = dayOfWeek === 1 ? 15 : 8
  const avgResponseTime = baseResponseTime + Math.random() * 10

  // Resolution time in hours
  const avgResolutionTime = 2 + Math.random() * 4

  // Satisfaction score (generally high, but varies)
  const satisfactionScore = 4.0 + Math.random() * 0.9

  // Template usage rate
  const templateUsageRate = 0.35 + Math.random() * 0.25

  // Automation triggers
  const automationTriggered = Math.floor(conversations * (0.4 + Math.random() * 0.3))

  // Unique vs returning contacts
  const uniqueContacts = Math.floor(conversations * (0.6 + Math.random() * 0.2))
  const returningContacts = Math.floor(conversations * (0.2 + Math.random() * 0.2))

  // Peak hour (business hours weighted)
  const peakHours = [9, 10, 11, 14, 15, 16]
  const peakHour = peakHours[Math.floor(Math.random() * peakHours.length)]

  return {
    date: date.toISOString().split('T')[0],
    organization_id: DEMO_ORG_ID,
    conversations_total: conversations,
    conversations_new: newConversations,
    conversations_resolved: resolvedConversations,
    messages_inbound: messagesInbound,
    messages_outbound: messagesOutbound,
    avg_response_time_minutes: Math.round(avgResponseTime * 10) / 10,
    avg_resolution_time_hours: Math.round(avgResolutionTime * 10) / 10,
    satisfaction_score: Math.round(satisfactionScore * 100) / 100,
    template_usage_rate: Math.round(templateUsageRate * 100) / 100,
    automation_triggered: automationTriggered,
    unique_contacts: uniqueContacts,
    returning_contacts: returningContacts,
    peak_hour: peakHour,
    metadata: {
      is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
      day_of_week: ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'][dayOfWeek],
      ...(blackFridayBoost > 1 && { special_event: 'Black Friday' }),
    },
  }
}

// Agent performance metrics
interface AgentMetrics {
  date: string
  organization_id: string
  user_id: string
  conversations_handled: number
  messages_sent: number
  avg_response_time_minutes: number
  satisfaction_score: number
  resolution_rate: number
  templates_used: number
}

function generateAgentMetrics(daysAgo: number, userId: string): AgentMetrics {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  const dayOfWeek = date.getDay()

  // Weekend = no activity
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      date: date.toISOString().split('T')[0],
      organization_id: DEMO_ORG_ID,
      user_id: userId,
      conversations_handled: 0,
      messages_sent: 0,
      avg_response_time_minutes: 0,
      satisfaction_score: 0,
      resolution_rate: 0,
      templates_used: 0,
    }
  }

  // Agent performance varies by role
  let performanceMultiplier = 1.0
  if (userId === DEMO_USERS.owner) performanceMultiplier = 0.7 // Owner has less time
  if (userId === DEMO_USERS.admin) performanceMultiplier = 1.0
  if (userId === DEMO_USERS.agent) performanceMultiplier = 1.2 // Agent handles most

  const conversations = Math.floor((8 + Math.random() * 12) * performanceMultiplier)
  const messages = Math.floor(conversations * (4 + Math.random() * 3))

  return {
    date: date.toISOString().split('T')[0],
    organization_id: DEMO_ORG_ID,
    user_id: userId,
    conversations_handled: conversations,
    messages_sent: messages,
    avg_response_time_minutes: Math.round((5 + Math.random() * 10) * 10) / 10,
    satisfaction_score: Math.round((4.2 + Math.random() * 0.6) * 100) / 100,
    resolution_rate: Math.round((0.75 + Math.random() * 0.2) * 100) / 100,
    templates_used: Math.floor(messages * (0.3 + Math.random() * 0.2)),
  }
}

// Campaign analytics
interface CampaignMetrics {
  campaign_id: string
  campaign_name: string
  campaign_type: 'broadcast' | 'drip'
  organization_id: string
  sent_count: number
  delivered_count: number
  read_count: number
  clicked_count: number
  replied_count: number
  unsubscribed_count: number
  failed_count: number
  sent_at: string
  metadata: Record<string, unknown>
}

export async function seedAnalytics(supabase: SupabaseClient): Promise<void> {
  console.log('Seeding analytics data...')

  // Check if analytics already exist
  const { data: existingAnalytics } = await supabase
    .from('analytics_daily')
    .select('id')
    .eq('organization_id', DEMO_ORG_ID)
    .limit(1)

  if (existingAnalytics && existingAnalytics.length > 0) {
    console.log('Analytics already exist for demo org, skipping...')
    return
  }

  // Generate 90 days of daily metrics
  const dailyMetrics: DailyMetrics[] = []
  for (let i = 0; i < 90; i++) {
    dailyMetrics.push(generateDailyMetrics(i))
  }

  // Insert daily metrics
  const { error: dailyError } = await supabase
    .from('analytics_daily')
    .insert(dailyMetrics)

  if (dailyError) {
    console.warn('Could not seed daily analytics (table may not exist):', dailyError.message)
  } else {
    console.log(`Successfully seeded ${dailyMetrics.length} days of daily analytics`)
  }

  // Generate agent metrics
  const agentMetrics: AgentMetrics[] = []
  for (const userId of Object.values(DEMO_USERS)) {
    for (let i = 0; i < 90; i++) {
      agentMetrics.push(generateAgentMetrics(i, userId))
    }
  }

  // Insert agent metrics (filter out zero-activity days)
  const activeAgentMetrics = agentMetrics.filter(m => m.conversations_handled > 0)
  const { error: agentError } = await supabase
    .from('analytics_agent')
    .insert(activeAgentMetrics)

  if (agentError) {
    console.warn('Could not seed agent analytics (table may not exist):', agentError.message)
  } else {
    console.log(`Successfully seeded ${activeAgentMetrics.length} agent analytics records`)
  }

  // Generate summary statistics
  const totalConversations = dailyMetrics.reduce((sum, d) => sum + d.conversations_total, 0)
  const totalMessages = dailyMetrics.reduce((sum, d) => sum + d.messages_inbound + d.messages_outbound, 0)
  const avgResponseTime = dailyMetrics.reduce((sum, d) => sum + d.avg_response_time_minutes, 0) / dailyMetrics.length
  const avgSatisfaction = dailyMetrics.reduce((sum, d) => sum + d.satisfaction_score, 0) / dailyMetrics.length

  console.log('Analytics Summary:')
  console.log(`  Total conversations (90 days): ${totalConversations}`)
  console.log(`  Total messages: ${totalMessages}`)
  console.log(`  Avg response time: ${avgResponseTime.toFixed(1)} minutes`)
  console.log(`  Avg satisfaction: ${avgSatisfaction.toFixed(2)}/5`)
}

// Seed conversation analytics (aggregated stats per conversation)
export async function seedConversationAnalytics(
  supabase: SupabaseClient,
  conversationIds: string[]
): Promise<void> {
  console.log('Seeding conversation analytics...')

  const conversationStats = conversationIds.map(convId => ({
    conversation_id: convId,
    organization_id: DEMO_ORG_ID,
    first_response_time_seconds: Math.floor(60 + Math.random() * 600), // 1-11 minutes
    total_response_time_seconds: Math.floor(120 + Math.random() * 1200), // 2-22 minutes
    message_count: Math.floor(4 + Math.random() * 8),
    agent_message_count: Math.floor(2 + Math.random() * 5),
    contact_message_count: Math.floor(2 + Math.random() * 5),
    resolution_time_seconds: Math.floor(600 + Math.random() * 3600), // 10-70 minutes
    satisfaction_rating: Math.random() > 0.3 ? Math.floor(3 + Math.random() * 3) : null,
    tags_applied: Math.floor(Math.random() * 3),
    templates_used: Math.floor(Math.random() * 4),
    automation_triggered: Math.random() > 0.5,
    created_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('conversation_analytics')
    .insert(conversationStats)

  if (error) {
    console.warn('Could not seed conversation analytics (table may not exist):', error.message)
  } else {
    console.log(`Successfully seeded ${conversationStats.length} conversation analytics records`)
  }
}
