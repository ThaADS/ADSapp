/**
 * Contact Scoring System
 * Calculate lead scores and engagement metrics for contacts
 */

import { createClient } from '@/lib/supabase/server'

export interface ContactScore {
  contactId: string
  leadScore: number // 0-100
  engagementScore: number // 0-100
  lifetimeValue: number
  scoreBreakdown: {
    recency: number // 0-25
    frequency: number // 0-25
    monetary: number // 0-25
    engagement: number // 0-25
  }
  lastUpdated: string
}

export interface ScoringCriteria {
  recencyWeight: number // default 0.25
  frequencyWeight: number // default 0.25
  monetaryWeight: number // default 0.25
  engagementWeight: number // default 0.25
}

const DEFAULT_CRITERIA: ScoringCriteria = {
  recencyWeight: 0.25,
  frequencyWeight: 0.25,
  monetaryWeight: 0.25,
  engagementWeight: 0.25,
}

/**
 * Calculate comprehensive score for a contact
 */
export async function calculateContactScore(
  contactId: string,
  criteria: ScoringCriteria = DEFAULT_CRITERIA
): Promise<ContactScore | null> {
  try {
    const supabase = await createClient()

    // Get contact info
    const { data: contact } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single()

    if (!contact) {
      return null
    }

    // Get conversation metrics
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, created_at, status, last_message_at')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })

    const conversationCount = conversations?.length || 0

    // Get message metrics
    const { data: messages } = await supabase
      .from('messages')
      .select('id, created_at, is_from_contact')
      .in(
        'conversation_id',
        conversations?.map(c => c.id) || []
      )

    // Calculate score components

    // 1. Recency (0-25 points)
    const recencyScore = calculateRecencyScore(conversations || [])

    // 2. Frequency (0-25 points)
    const frequencyScore = calculateFrequencyScore(conversationCount)

    // 3. Monetary (0-25 points)
    // In real implementation, integrate with order/revenue data
    const monetaryScore = contact.customer_lifetime_value
      ? Math.min(25, (contact.customer_lifetime_value / 1000) * 25)
      : 0

    // 4. Engagement (0-25 points)
    const engagementScore = calculateEngagementScore(messages || [], conversationCount)

    // Calculate weighted total
    const leadScore = Math.round(
      recencyScore * criteria.recencyWeight * 4 +
        frequencyScore * criteria.frequencyWeight * 4 +
        monetaryScore * criteria.monetaryWeight * 4 +
        engagementScore * criteria.engagementWeight * 4
    )

    const result: ContactScore = {
      contactId,
      leadScore: Math.min(100, leadScore),
      engagementScore: Math.round(engagementScore * 4), // Convert to 0-100
      lifetimeValue: contact.customer_lifetime_value || 0,
      scoreBreakdown: {
        recency: recencyScore,
        frequency: frequencyScore,
        monetary: monetaryScore,
        engagement: engagementScore,
      },
      lastUpdated: new Date().toISOString(),
    }

    // Update contact record
    await supabase
      .from('contacts')
      .update({
        lead_score: result.leadScore,
        engagement_score: result.engagementScore,
        last_engagement_at: conversations?.[0]?.last_message_at || contact.created_at,
      })
      .eq('id', contactId)

    return result
  } catch (error) {
    console.error('Failed to calculate contact score:', error)
    return null
  }
}

/**
 * Calculate recency score based on last interaction
 */
function calculateRecencyScore(conversations: any[]): number {
  if (conversations.length === 0) return 0

  const lastConversation = conversations[0]
  const lastMessageDate = new Date(lastConversation.last_message_at || lastConversation.created_at)
  const daysSinceLastMessage = (Date.now() - lastMessageDate.getTime()) / (1000 * 60 * 60 * 24)

  // Score based on days since last message
  if (daysSinceLastMessage < 1) return 25 // Within 24 hours
  if (daysSinceLastMessage < 7) return 20 // Within a week
  if (daysSinceLastMessage < 30) return 15 // Within a month
  if (daysSinceLastMessage < 90) return 10 // Within 3 months
  if (daysSinceLastMessage < 180) return 5 // Within 6 months
  return 0 // Older than 6 months
}

/**
 * Calculate frequency score based on conversation count
 */
function calculateFrequencyScore(conversationCount: number): number {
  // Score based on total conversations
  if (conversationCount >= 50) return 25
  if (conversationCount >= 20) return 20
  if (conversationCount >= 10) return 15
  if (conversationCount >= 5) return 10
  if (conversationCount >= 2) return 5
  if (conversationCount >= 1) return 2
  return 0
}

/**
 * Calculate engagement score based on message activity
 */
function calculateEngagementScore(messages: any[], conversationCount: number): number {
  if (messages.length === 0) return 0

  // Calculate response rate
  const customerMessages = messages.filter(m => m.is_from_contact)
  const agentMessages = messages.filter(m => !m.is_from_contact)

  let score = 0

  // High message volume = engaged
  if (customerMessages.length > 100) score += 10
  else if (customerMessages.length > 50) score += 8
  else if (customerMessages.length > 20) score += 6
  else if (customerMessages.length > 10) score += 4
  else if (customerMessages.length > 5) score += 2

  // Good back-and-forth = engaged
  const avgMessagesPerConversation = messages.length / Math.max(1, conversationCount)
  if (avgMessagesPerConversation > 10) score += 8
  else if (avgMessagesPerConversation > 5) score += 5
  else if (avgMessagesPerConversation > 2) score += 3

  // Active participation (customer asks questions)
  const questionMessages = customerMessages.filter(
    m => m.content && (m.content.includes('?') || m.content.toLowerCase().includes('kan ik'))
  )
  if (questionMessages.length > 20) score += 7
  else if (questionMessages.length > 10) score += 5
  else if (questionMessages.length > 5) score += 3

  return Math.min(25, score)
}

/**
 * Batch calculate scores for multiple contacts
 */
export async function batchCalculateScores(
  contactIds: string[],
  criteria?: ScoringCriteria
): Promise<{
  success: number
  failed: number
  results: Array<{ contactId: string; score: ContactScore | null; error?: string }>
}> {
  let success = 0
  let failed = 0
  const results = []

  for (const contactId of contactIds) {
    try {
      const score = await calculateContactScore(contactId, criteria)
      if (score) {
        success++
        results.push({ contactId, score })
      } else {
        failed++
        results.push({ contactId, score: null, error: 'Failed to calculate score' })
      }
    } catch (error) {
      failed++
      results.push({
        contactId,
        score: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return { success, failed, results }
}

/**
 * Auto-recalculate scores for all contacts (run periodically)
 */
export async function recalculateAllScores(
  organizationId: string,
  limit: number = 100
): Promise<{
  processed: number
  updated: number
  errors: number
}> {
  const supabase = await createClient()
  let processed = 0
  let updated = 0
  let errors = 0

  try {
    // Get contacts that need score updates
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id')
      .eq('organization_id', organizationId)
      .order('updated_at', { ascending: true })
      .limit(limit)

    if (!contacts) {
      return { processed: 0, updated: 0, errors: 0 }
    }

    for (const contact of contacts) {
      processed++
      try {
        const score = await calculateContactScore(contact.id)
        if (score) {
          updated++
        }
      } catch (error) {
        errors++
        console.error(`Failed to update score for contact ${contact.id}:`, error)
      }
    }

    return { processed, updated, errors }
  } catch (error) {
    console.error('Failed to recalculate all scores:', error)
    return { processed, updated, errors }
  }
}

/**
 * Get score distribution for organization
 */
export async function getScoreDistribution(organizationId: string): Promise<{
  ranges: Array<{ range: string; count: number; percentage: number }>
  average: number
  median: number
}> {
  try {
    const supabase = await createClient()

    const { data: contacts } = await supabase
      .from('contacts')
      .select('lead_score')
      .eq('organization_id', organizationId)
      .not('lead_score', 'is', null)

    if (!contacts || contacts.length === 0) {
      return {
        ranges: [],
        average: 0,
        median: 0,
      }
    }

    const scores = contacts.map(c => c.lead_score).sort((a, b) => a - b)
    const total = scores.length

    // Calculate ranges
    const ranges = [
      { range: '0-20 (Cold)', min: 0, max: 20, count: 0 },
      { range: '21-40 (Warm)', min: 21, max: 40, count: 0 },
      { range: '41-60 (Qualified)', min: 41, max: 60, count: 0 },
      { range: '61-80 (Hot)', min: 61, max: 80, count: 0 },
      { range: '81-100 (Very Hot)', min: 81, max: 100, count: 0 },
    ]

    scores.forEach(score => {
      const range = ranges.find(r => score >= r.min && score <= r.max)
      if (range) range.count++
    })

    const rangesWithPercentage = ranges.map(r => ({
      range: r.range,
      count: r.count,
      percentage: (r.count / total) * 100,
    }))

    // Calculate average
    const average = scores.reduce((sum, score) => sum + score, 0) / total

    // Calculate median
    const median = scores[Math.floor(total / 2)]

    return {
      ranges: rangesWithPercentage,
      average: Math.round(average),
      median,
    }
  } catch (error) {
    console.error('Failed to get score distribution:', error)
    return {
      ranges: [],
      average: 0,
      median: 0,
    }
  }
}

/**
 * Get top contacts by score
 */
export async function getTopContacts(
  organizationId: string,
  limit: number = 50
): Promise<
  Array<{
    id: string
    name: string
    email?: string
    phone: string
    leadScore: number
    engagementScore: number
    lastEngagement: string
  }>
> {
  try {
    const supabase = await createClient()

    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, name, email, phone, lead_score, engagement_score, last_engagement_at')
      .eq('organization_id', organizationId)
      .not('lead_score', 'is', null)
      .order('lead_score', { ascending: false })
      .limit(limit)

    if (!contacts) {
      return []
    }

    return contacts.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      leadScore: c.lead_score,
      engagementScore: c.engagement_score || 0,
      lastEngagement: c.last_engagement_at || c.created_at,
    }))
  } catch (error) {
    console.error('Failed to get top contacts:', error)
    return []
  }
}
