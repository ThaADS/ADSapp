/**
 * Smart Assignment Algorithm
 * Intelligently assign conversations to the best available agent based on multiple factors
 */

import { createClient } from '@/lib/supabase/server'

export interface AssignmentFactors {
  agentId: string
  agentName: string
  score: number
  factors: {
    skillMatch: number // 0-100
    workload: number // 0-100 (inverted - lower is better)
    availability: number // 0-100
    languageMatch: number // 0-100
    customerHistory: number // 0-100
    responseTime: number // 0-100
  }
  currentWorkload: number
  isAvailable: boolean
}

export interface AssignmentRequest {
  organizationId: string
  conversationId: string
  requiredSkills?: string[]
  language?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  contactId?: string
}

export interface AssignmentResult {
  assignedTo: string
  agentName: string
  confidence: number
  reasoning: string
  alternativeAgents: Array<{ agentId: string; agentName: string; score: number }>
}

/**
 * Find the best agent to assign a conversation to
 */
export async function findBestAgent(
  request: AssignmentRequest
): Promise<AssignmentResult | null> {
  const supabase = await createClient()

  // Get all eligible agents
  const { data: agents } = await supabase
    .from('profiles')
    .select(
      `
      id,
      full_name,
      role,
      is_active,
      languages,
      created_at
    `
    )
    .eq('organization_id', request.organizationId)
    .in('role', ['agent', 'admin', 'owner'])
    .eq('is_active', true)

  if (!agents || agents.length === 0) {
    return null
  }

  // Score each agent
  const scoredAgents = await Promise.all(
    agents.map(agent => scoreAgent(agent, request, supabase))
  )

  // Filter out unavailable agents (unless priority is urgent)
  const availableAgents =
    request.priority === 'urgent'
      ? scoredAgents
      : scoredAgents.filter(agent => agent.isAvailable)

  if (availableAgents.length === 0) {
    // No one available, assign to highest scored agent anyway
    scoredAgents.sort((a, b) => b.score - a.score)
    const bestAgent = scoredAgents[0]

    return {
      assignedTo: bestAgent.agentId,
      agentName: bestAgent.agentName,
      confidence: bestAgent.score / 100,
      reasoning: `Geen agents beschikbaar. ${bestAgent.agentName} heeft de beste score gebaseerd op skills en werkbelasting.`,
      alternativeAgents: scoredAgents.slice(1, 4).map(a => ({
        agentId: a.agentId,
        agentName: a.agentName,
        score: a.score,
      })),
    }
  }

  // Sort by score and select best
  availableAgents.sort((a, b) => b.score - a.score)
  const bestAgent = availableAgents[0]

  // Generate reasoning
  const topFactors = Object.entries(bestAgent.factors)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([factor, score]) => {
      const factorNames: Record<string, string> = {
        skillMatch: 'skill match',
        workload: 'lage werkbelasting',
        availability: 'beschikbaarheid',
        languageMatch: 'taal match',
        customerHistory: 'klant historie',
        responseTime: 'snelle responstijd',
      }
      return factorNames[factor]
    })

  return {
    assignedTo: bestAgent.agentId,
    agentName: bestAgent.agentName,
    confidence: bestAgent.score / 100,
    reasoning: `${bestAgent.agentName} geselecteerd op basis van: ${topFactors.join(' en ')}.`,
    alternativeAgents: availableAgents.slice(1, 4).map(a => ({
      agentId: a.agentId,
      agentName: a.agentName,
      score: a.score,
    })),
  }
}

/**
 * Score an individual agent for assignment
 */
async function scoreAgent(
  agent: any,
  request: AssignmentRequest,
  supabase: any
): Promise<AssignmentFactors> {
  const factors = {
    skillMatch: 0,
    workload: 0,
    availability: 0,
    languageMatch: 0,
    customerHistory: 0,
    responseTime: 0,
  }

  // 1. Skill Match (30% weight)
  if (request.requiredSkills && request.requiredSkills.length > 0) {
    const { data: agentSkills } = await supabase
      .from('agent_skills')
      .select('skill_name, skill_level')
      .eq('profile_id', agent.id)

    if (agentSkills && agentSkills.length > 0) {
      const skillNames = agentSkills.map((s: any) => s.skill_name.toLowerCase())
      const matchedSkills = request.requiredSkills.filter(skill =>
        skillNames.includes(skill.toLowerCase())
      )
      factors.skillMatch = (matchedSkills.length / request.requiredSkills.length) * 100
    }
  } else {
    factors.skillMatch = 50 // Neutral if no skills required
  }

  // 2. Workload (25% weight)
  const { data: activeConversations } = await supabase
    .from('conversations')
    .select('id')
    .eq('assigned_to', agent.id)
    .in('status', ['open', 'pending'])

  const currentWorkload = activeConversations?.length || 0
  const maxWorkload = 20 // Configurable
  factors.workload = Math.max(0, 100 - (currentWorkload / maxWorkload) * 100)

  // 3. Availability (20% weight)
  // Check if agent is currently online and within business hours
  const now = new Date()
  const currentHour = now.getHours()
  const isBusinessHours = currentHour >= 9 && currentHour < 18 // 9 AM - 6 PM

  // In real implementation, check last activity timestamp
  const isOnline = agent.is_active // Simplified
  factors.availability = isBusinessHours && isOnline ? 100 : 30

  // 4. Language Match (15% weight)
  if (request.language) {
    const agentLanguages = agent.languages || ['nl'] // Default to Dutch
    factors.languageMatch = agentLanguages.includes(request.language) ? 100 : 50
  } else {
    factors.languageMatch = 100
  }

  // 5. Customer History (5% weight)
  if (request.contactId) {
    const { data: previousConversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', request.contactId)
      .eq('assigned_to', agent.id)
      .limit(1)

    factors.customerHistory = previousConversations && previousConversations.length > 0 ? 100 : 0
  } else {
    factors.customerHistory = 50
  }

  // 6. Response Time (5% weight)
  const { data: recentConversations } = await supabase
    .from('conversations')
    .select('first_agent_response_at, created_at')
    .eq('assigned_to', agent.id)
    .not('first_agent_response_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(10)

  if (recentConversations && recentConversations.length > 0) {
    const avgResponseTime =
      recentConversations.reduce((sum: number, conv: any) => {
        const responseTime =
          new Date(conv.first_agent_response_at).getTime() - new Date(conv.created_at).getTime()
        return sum + responseTime / 1000 / 60 // Convert to minutes
      }, 0) / recentConversations.length

    // Score based on response time (< 5 min = 100, > 30 min = 0)
    factors.responseTime = Math.max(0, Math.min(100, 100 - (avgResponseTime / 30) * 100))
  } else {
    factors.responseTime = 70 // Default for new agents
  }

  // Calculate weighted total score
  const weights = {
    skillMatch: 0.3,
    workload: 0.25,
    availability: 0.2,
    languageMatch: 0.15,
    customerHistory: 0.05,
    responseTime: 0.05,
  }

  const totalScore =
    factors.skillMatch * weights.skillMatch +
    factors.workload * weights.workload +
    factors.availability * weights.availability +
    factors.languageMatch * weights.languageMatch +
    factors.customerHistory * weights.customerHistory +
    factors.responseTime * weights.responseTime

  return {
    agentId: agent.id,
    agentName: agent.full_name || 'Unnamed Agent',
    score: Math.round(totalScore),
    factors,
    currentWorkload,
    isAvailable: factors.availability > 50,
  }
}

/**
 * Auto-assign a conversation to the best agent
 */
export async function autoAssignConversation(
  conversationId: string,
  organizationId: string,
  options?: {
    requiredSkills?: string[]
    language?: string
    priority?: 'low' | 'normal' | 'high' | 'urgent'
  }
): Promise<{ success: boolean; assignedTo?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // Get conversation details
    const { data: conversation } = await supabase
      .from('conversations')
      .select('contact_id, assigned_to')
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      return { success: false, error: 'Conversation not found' }
    }

    // If already assigned, skip
    if (conversation.assigned_to) {
      return { success: true, assignedTo: conversation.assigned_to }
    }

    // Find best agent
    const assignment = await findBestAgent({
      organizationId,
      conversationId,
      contactId: conversation.contact_id,
      ...options,
    })

    if (!assignment) {
      return { success: false, error: 'No available agents found' }
    }

    // Assign the conversation
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        assigned_to: assignment.assignedTo,
        status: 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    if (updateError) {
      throw updateError
    }

    // Log the assignment
    await supabase.from('conversation_events').insert({
      conversation_id: conversationId,
      event_type: 'assignment',
      event_data: {
        assigned_to: assignment.assignedTo,
        agent_name: assignment.agentName,
        confidence: assignment.confidence,
        reasoning: assignment.reasoning,
        method: 'auto',
      },
      created_at: new Date().toISOString(),
    })

    return {
      success: true,
      assignedTo: assignment.assignedTo,
    }
  } catch (error) {
    console.error('Auto-assignment error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Assignment failed',
    }
  }
}

/**
 * Round-robin assignment (simpler fallback)
 */
export async function roundRobinAssignment(
  organizationId: string,
  conversationId: string
): Promise<{ success: boolean; assignedTo?: string; error?: string }> {
  try {
    const supabase = await createClient()

    // Get all active agents
    const { data: agents } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', organizationId)
      .in('role', ['agent', 'admin', 'owner'])
      .eq('is_active', true)
      .order('created_at')

    if (!agents || agents.length === 0) {
      return { success: false, error: 'No active agents found' }
    }

    // Get current workload for each agent
    const workloads = await Promise.all(
      agents.map(async agent => {
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id')
          .eq('assigned_to', agent.id)
          .in('status', ['open', 'pending'])

        return {
          agentId: agent.id,
          agentName: agent.full_name,
          workload: conversations?.length || 0,
        }
      })
    )

    // Assign to agent with lowest workload
    workloads.sort((a, b) => a.workload - b.workload)
    const selectedAgent = workloads[0]

    // Update conversation
    const { error: updateError } = await supabase
      .from('conversations')
      .update({
        assigned_to: selectedAgent.agentId,
        status: 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    if (updateError) {
      throw updateError
    }

    return {
      success: true,
      assignedTo: selectedAgent.agentId,
    }
  } catch (error) {
    console.error('Round-robin assignment error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Assignment failed',
    }
  }
}

/**
 * Reassign conversation if current agent is overloaded
 */
export async function rebalanceWorkload(organizationId: string): Promise<{
  success: boolean
  reassignments: number
  errors: string[]
}> {
  const supabase = await createClient()
  let reassignments = 0
  const errors: string[] = []

  try {
    // Get all agents with their workloads
    const { data: agents } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('organization_id', organizationId)
      .in('role', ['agent', 'admin', 'owner'])
      .eq('is_active', true)

    if (!agents) return { success: false, reassignments: 0, errors: ['No agents found'] }

    const workloads = await Promise.all(
      agents.map(async agent => {
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id')
          .eq('assigned_to', agent.id)
          .in('status', ['open', 'pending'])

        return {
          agentId: agent.id,
          conversations: conversations || [],
          workload: conversations?.length || 0,
        }
      })
    )

    // Find overloaded agents (> 15 conversations)
    const overloadedAgents = workloads.filter(w => w.workload > 15)
    const underloadedAgents = workloads.filter(w => w.workload < 10).sort((a, b) => a.workload - b.workload)

    if (overloadedAgents.length === 0 || underloadedAgents.length === 0) {
      return { success: true, reassignments: 0, errors: [] }
    }

    // Reassign conversations from overloaded to underloaded agents
    for (const overloaded of overloadedAgents) {
      const conversationsToMove = Math.ceil((overloaded.workload - 15) / 2)

      for (let i = 0; i < conversationsToMove && i < overloaded.conversations.length; i++) {
        const targetAgent = underloadedAgents[reassignments % underloadedAgents.length]

        const { error } = await supabase
          .from('conversations')
          .update({ assigned_to: targetAgent.agentId })
          .eq('id', overloaded.conversations[i].id)

        if (error) {
          errors.push(`Failed to reassign conversation ${overloaded.conversations[i].id}`)
        } else {
          reassignments++
          targetAgent.workload++
        }
      }
    }

    return { success: true, reassignments, errors }
  } catch (error) {
    console.error('Workload rebalance error:', error)
    return {
      success: false,
      reassignments,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}
