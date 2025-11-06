/**
 * Intelligent Load Balancer for Conversation Routing
 * Implements multiple routing strategies with agent capacity tracking
 *
 * NOTE: This file uses 'as any' type assertions for database tables (agent_capacity, routing_rules, etc.)
 * that don't exist in the current database.ts types. These assertions will be removed once
 * the database migrations are applied and types are regenerated with: npx supabase gen types typescript
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { createClient } from '@/lib/supabase/server'

export type RoutingStrategy =
  | 'round_robin' // Rotate through available agents
  | 'least_loaded' // Assign to agent with fewest conversations
  | 'skill_based' // Match based on required skills
  | 'priority_based' // Queue with urgency sorting
  | 'custom' // Custom rule-based routing

export interface Agent {
  id: string
  name: string
  email: string
  currentLoad: number
  maxLoad: number
  loadPercentage: number
  skills: string[]
  languages: string[]
  status: 'available' | 'busy' | 'away' | 'offline'
  avgResponseTime: number
  satisfactionScore: number
}

export interface RoutingRequirements {
  requiredSkills?: string[]
  requiredLanguage?: string
  preferredAgentId?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export interface RoutingResult {
  success: boolean
  assignedAgentId?: string
  assignedAgentName?: string
  strategy: RoutingStrategy
  reason: string
  queuePosition?: number
  estimatedWaitTime?: number
  alternativeAgents?: Agent[]
}

export class ConversationRouter {
  private supabase: Awaited<ReturnType<typeof createClient>>
  private lastRoundRobinIndex: Map<string, number> = new Map()

  private constructor(supabase: Awaited<ReturnType<typeof createClient>>) {
    this.supabase = supabase
  }

  static async create(): Promise<ConversationRouter> {
    const supabase = await createClient()
    return new ConversationRouter(supabase)
  }

  /**
   * Main routing method - assigns conversation to best available agent
   */
  async routeConversation(
    conversationId: string,
    organizationId: string,
    requirements: RoutingRequirements = {},
    strategy?: RoutingStrategy
  ): Promise<RoutingResult> {
    try {
      // Get routing rules for organization if strategy not specified
      if (!strategy) {
        strategy = await this.getDefaultStrategy(organizationId, requirements)
      }

      // Get available agents
      const agents = await this.getAvailableAgents(organizationId, requirements)

      if (agents.length === 0) {
        return await this.handleNoAgentsAvailable(conversationId, organizationId, requirements)
      }

      // Apply routing strategy
      let selectedAgent: Agent | null = null

      switch (strategy) {
        case 'round_robin':
          selectedAgent = this.selectRoundRobin(agents, organizationId)
          break

        case 'least_loaded':
          selectedAgent = this.selectLeastLoaded(agents)
          break

        case 'skill_based':
          selectedAgent = this.selectBySkills(agents, requirements)
          break

        case 'priority_based':
          selectedAgent = this.selectByPriority(agents, requirements)
          break

        case 'custom':
          selectedAgent = await this.selectCustom(agents, organizationId, requirements)
          break

        default:
          selectedAgent = this.selectLeastLoaded(agents)
      }

      if (!selectedAgent) {
        return await this.handleNoAgentsAvailable(conversationId, organizationId, requirements)
      }

      // Assign conversation
      const assignmentSuccess = await this.assignConversation(
        conversationId,
        selectedAgent.id,
        strategy
      )

      if (!assignmentSuccess) {
        throw new Error('Failed to assign conversation')
      }

      // Log routing decision
      await this.logRoutingDecision(
        conversationId,
        organizationId,
        selectedAgent.id,
        strategy,
        agents,
        `Selected based on ${strategy} strategy`
      )

      return {
        success: true,
        assignedAgentId: selectedAgent.id,
        assignedAgentName: selectedAgent.name,
        strategy,
        reason: `Assigned using ${strategy} strategy. Current load: ${selectedAgent.currentLoad}/${selectedAgent.maxLoad}`,
        alternativeAgents: agents.slice(0, 3).filter(a => a.id !== selectedAgent.id),
      }
    } catch (error) {
      console.error('Routing error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        strategy: strategy || 'round_robin',
        reason: `Routing failed: ${errorMessage}`,
      }
    }
  }

  /**
   * Get available agents for organization with optional filtering
   */
  private async getAvailableAgents(
    organizationId: string,
    requirements: RoutingRequirements = {}
  ): Promise<Agent[]> {
    const query = (this.supabase as any)
      .from('agent_capacity')
      .select(
        `
        agent_id,
        current_active_conversations,
        max_concurrent_conversations,
        status,
        skills,
        languages,
        avg_response_time_seconds,
        customer_satisfaction_score,
        profiles!inner(id, full_name, email)
      `
      )
      .eq('organization_id', organizationId)
      .eq('auto_assign_enabled', true)
      .in('status', ['available', 'busy'])

    const { data, error } = await query

    if (error || !data) {
      console.error('Failed to fetch agents:', error)
      return []
    }

    // Filter and transform to Agent objects
    let agents: Agent[] = data
      .filter(ac => ac.current_active_conversations < ac.max_concurrent_conversations)
      .map(ac => ({
        id: ac.agent_id,
        name: ac.profiles?.full_name || ac.profiles?.email || 'Unknown',
        email: ac.profiles?.email || '',
        currentLoad: ac.current_active_conversations,
        maxLoad: ac.max_concurrent_conversations,
        loadPercentage: (ac.current_active_conversations / ac.max_concurrent_conversations) * 100,
        skills: Array.isArray(ac.skills) ? ac.skills : [],
        languages: Array.isArray(ac.languages) ? ac.languages : ['nl'],
        status: ac.status,
        avgResponseTime: ac.avg_response_time_seconds || 60,
        satisfactionScore: parseFloat(ac.customer_satisfaction_score) || 4.5,
      }))

    // Apply skill filtering
    if (requirements.requiredSkills && requirements.requiredSkills.length > 0) {
      agents = agents.filter(agent =>
        requirements.requiredSkills!.some(skill => agent.skills.includes(skill))
      )
    }

    // Apply language filtering
    if (requirements.requiredLanguage) {
      agents = agents.filter(agent => agent.languages.includes(requirements.requiredLanguage!))
    }

    // Prefer specified agent if available
    if (requirements.preferredAgentId) {
      const preferredAgent = agents.find(a => a.id === requirements.preferredAgentId)
      if (preferredAgent) {
        return [preferredAgent, ...agents.filter(a => a.id !== preferredAgent.id)]
      }
    }

    return agents
  }

  /**
   * Round-robin selection (fair distribution)
   */
  private selectRoundRobin(agents: Agent[], organizationId: string): Agent {
    if (agents.length === 1) return agents[0]

    const lastIndex = this.lastRoundRobinIndex.get(organizationId) || 0
    const nextIndex = (lastIndex + 1) % agents.length

    this.lastRoundRobinIndex.set(organizationId, nextIndex)

    return agents[nextIndex]
  }

  /**
   * Least-loaded selection (lowest workload first)
   */
  private selectLeastLoaded(agents: Agent[]): Agent {
    return agents.reduce((best, current) =>
      current.loadPercentage < best.loadPercentage ? current : best
    )
  }

  /**
   * Skill-based selection (best skill match + lowest load)
   */
  private selectBySkills(agents: Agent[], requirements: RoutingRequirements): Agent {
    if (!requirements.requiredSkills || requirements.requiredSkills.length === 0) {
      return this.selectLeastLoaded(agents)
    }

    // Score agents by skill match count
    const scoredAgents = agents.map(agent => {
      const matchingSkills = requirements.requiredSkills!.filter(skill =>
        agent.skills.includes(skill)
      ).length

      return {
        agent,
        score: matchingSkills * 100 - agent.loadPercentage, // Prioritize skills, then low load
      }
    })

    scoredAgents.sort((a, b) => b.score - a.score)

    return scoredAgents[0].agent
  }

  /**
   * Priority-based selection (urgent → experienced agents)
   */
  private selectByPriority(agents: Agent[], requirements: RoutingRequirements): Agent {
    if (requirements.priority === 'urgent' || requirements.priority === 'high') {
      // For high-priority, prefer agents with high satisfaction and low response time
      const sortedAgents = [...agents].sort((a, b) => {
        const scoreA = a.satisfactionScore * 100 - a.avgResponseTime - a.loadPercentage
        const scoreB = b.satisfactionScore * 100 - b.avgResponseTime - b.loadPercentage
        return scoreB - scoreA
      })

      return sortedAgents[0]
    }

    // For low priority, just use least loaded
    return this.selectLeastLoaded(agents)
  }

  /**
   * Custom selection based on organization rules
   * @param _requirements - Reserved for future custom rule implementations
   */
  private async selectCustom(
    agents: Agent[],
    organizationId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _requirements: RoutingRequirements
  ): Promise<Agent> {
    // Fetch custom routing rules
    const { data: rules } = await (this.supabase as any)
      .from('routing_rules')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single()

    if (rules && rules.strategy_config) {
      // Apply custom logic based on config
      // TODO: Implement custom rule logic using requirements parameter
      // For now, fallback to least_loaded
      return this.selectLeastLoaded(agents)
    }

    return this.selectLeastLoaded(agents)
  }

  /**
   * Get default strategy for organization
   */
  private async getDefaultStrategy(
    organizationId: string,
    requirements: RoutingRequirements
  ): Promise<RoutingStrategy> {
    const { data: rules } = await (this.supabase as any)
      .from('routing_rules')
      .select('strategy')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .limit(1)
      .single()

    if (rules && rules.strategy) {
      return rules.strategy as RoutingStrategy
    }

    // Default strategies based on requirements
    if (requirements.requiredSkills && requirements.requiredSkills.length > 0) {
      return 'skill_based'
    }

    if (requirements.priority === 'urgent' || requirements.priority === 'high') {
      return 'priority_based'
    }

    return 'least_loaded' // Default to least loaded
  }

  /**
   * Assign conversation to agent
   */
  private async assignConversation(
    conversationId: string,
    agentId: string,
    strategy: RoutingStrategy
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('conversations')
      .update({
        assigned_to: agentId,
        status: 'open',
      })
      .eq('id', conversationId)

    if (error) {
      console.error('Assignment error:', error)
      return false
    }

    // Update queue record if exists
    await (this.supabase as any)
      .from('conversation_queue')
      .update({
        assigned_to: agentId,
        assigned_at: new Date().toISOString(),
        assignment_method: `auto_${strategy}`,
      })
      .eq('conversation_id', conversationId)
      .is('assigned_at', null)

    return true
  }

  /**
   * Handle case when no agents are available
   */
  private async handleNoAgentsAvailable(
    conversationId: string,
    organizationId: string,
    requirements: RoutingRequirements
  ): Promise<RoutingResult> {
    // Calculate queue position
    const { data: queueData } = await (this.supabase as any)
      .from('conversation_queue')
      .select('id')
      .eq('organization_id', organizationId)
      .is('assigned_at', null)
      .order('priority', { ascending: true })
      .order('queued_at', { ascending: true })

    const queuePosition = (queueData?.length || 0) + 1

    // Add to queue
    const priority = this.getPriorityValue(requirements.priority)

    await (this.supabase as any).from('conversation_queue').upsert({
      conversation_id: conversationId,
      organization_id: organizationId,
      priority,
      required_skills: requirements.requiredSkills || [],
      required_language: requirements.requiredLanguage,
      preferred_agent_id: requirements.preferredAgentId,
    })

    return {
      success: false,
      strategy: 'round_robin',
      reason: 'No agents currently available. Conversation added to queue.',
      queuePosition,
      estimatedWaitTime: queuePosition * 5, // Rough estimate: 5 min per position
    }
  }

  /**
   * Log routing decision for analytics
   */
  private async logRoutingDecision(
    conversationId: string,
    organizationId: string,
    assignedTo: string,
    strategy: RoutingStrategy,
    availableAgents: Agent[],
    reason: string
  ) {
    const workloadScores = Object.fromEntries(availableAgents.map(a => [a.id, a.loadPercentage]))

    await (this.supabase as any).from('routing_history').insert({
      conversation_id: conversationId,
      organization_id: organizationId,
      assigned_to: assignedTo,
      routing_strategy: strategy,
      available_agents: availableAgents.map(a => a.id),
      workload_scores: workloadScores,
      selection_reason: reason,
      accepted: true,
    })
  }

  /**
   * Rebalance load across agents (periodic optimization)
   */
  async rebalanceLoad(organizationId: string): Promise<{
    rebalanced: number
    details: string[]
  }> {
    // Get all agents
    const agents = await this.getAvailableAgents(organizationId)

    if (agents.length < 2) {
      return { rebalanced: 0, details: ['Not enough agents for rebalancing'] }
    }

    // Calculate average load
    const avgLoad = agents.reduce((sum, a) => sum + a.loadPercentage, 0) / agents.length
    const threshold = 30 // 30% difference triggers rebalance

    // Find overloaded and underloaded agents
    const overloaded = agents.filter(a => a.loadPercentage > avgLoad + threshold)
    const underloaded = agents.filter(a => a.loadPercentage < avgLoad - threshold)

    if (overloaded.length === 0 || underloaded.length === 0) {
      return { rebalanced: 0, details: ['Load is balanced'] }
    }

    const details: string[] = []
    let rebalancedCount = 0

    // Move conversations from overloaded to underloaded
    for (const overAgent of overloaded) {
      const { data: conversations } = await this.supabase
        .from('conversations')
        .select('id')
        .eq('assigned_to', overAgent.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(2)

      if (conversations && conversations.length > 0) {
        const underAgent = underloaded[rebalancedCount % underloaded.length]

        for (const conv of conversations) {
          await this.assignConversation(conv.id, underAgent.id, 'custom')
          rebalancedCount++
          details.push(`Moved conversation ${conv.id} from ${overAgent.name} to ${underAgent.name}`)
        }
      }
    }

    return { rebalanced: rebalancedCount, details }
  }

  /**
   * Helper: Convert priority string to numeric value
   */
  private getPriorityValue(priority?: string): number {
    switch (priority) {
      case 'urgent':
        return 1
      case 'high':
        return 3
      case 'medium':
        return 5
      case 'low':
        return 7
      default:
        return 5
    }
  }
}

/**
 * Convenience function for quick routing
 */
export async function autoAssignConversation(
  conversationId: string,
  organizationId: string,
  requirements: RoutingRequirements = {}
): Promise<RoutingResult> {
  const router = await ConversationRouter.create()
  return await router.routeConversation(conversationId, organizationId, requirements)
}
