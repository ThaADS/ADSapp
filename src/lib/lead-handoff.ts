import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { LeadScore } from './conversion-optimization'
import { BusinessScenario } from '@/types/demo'
import { Database } from '@/types/database'

type SupabaseClient = ReturnType<typeof createClient<Database>>

// Lead Handoff Types
export interface Lead {
  id: string
  session_id: string
  email?: string
  name?: string
  company?: string
  phone?: string
  business_scenario: BusinessScenario
  lead_score: LeadScore
  status: LeadStatus
  source: LeadSource
  utm_data?: UTMData
  session_data: SessionData
  engagement_timeline: EngagementEvent[]
  sales_notes: SalesNote[]
  follow_up_actions: FollowUpAction[]
  assigned_to?: string
  created_at: string
  updated_at: string
  last_activity_at: string
  conversion_probability: number
  estimated_value?: number
  lifecycle_stage: LifecycleStage
}

export interface SessionData {
  duration_seconds: number
  pages_visited: string[]
  features_explored: string[]
  total_interactions: number
  conversion_events: ConversionEvent[]
  demo_completion_percentage: number
  user_agent: string
  referrer?: string
  country?: string
  device_type: 'desktop' | 'mobile' | 'tablet'
  ab_test_variant?: string
}

export interface ConversionEvent {
  event_type: string
  timestamp: string
  page_path: string
  element_clicked?: string
  form_data?: Record<string, any>
  value?: number
}

export interface EngagementEvent {
  id: string
  event_type:
    | 'demo_start'
    | 'feature_use'
    | 'signup_click'
    | 'form_fill'
    | 'email_open'
    | 'link_click'
    | 'meeting_booked'
  timestamp: string
  description: string
  metadata?: Record<string, any>
  engagement_score_impact: number
}

export interface SalesNote {
  id: string
  note: string
  created_by: string
  created_at: string
  note_type: 'call' | 'email' | 'meeting' | 'demo' | 'general'
  sentiment: 'positive' | 'neutral' | 'negative'
  next_action?: string
}

export interface FollowUpAction {
  id: string
  action_type: 'email' | 'call' | 'demo' | 'meeting' | 'content_send' | 'trial_setup'
  title: string
  description: string
  due_date: string
  assigned_to: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  automation_trigger?: AutomationTrigger
  completion_data?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface AutomationTrigger {
  trigger_type: 'time_based' | 'score_based' | 'activity_based'
  conditions: TriggerCondition[]
  delay_hours?: number
}

export interface TriggerCondition {
  field: string
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains'
  value: any
}

export interface UTMData {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
}

export interface CRMIntegration {
  id: string
  provider: 'salesforce' | 'hubspot' | 'pipedrive' | 'custom'
  configuration: CRMConfig
  field_mappings: FieldMapping[]
  sync_rules: SyncRule[]
  last_sync_at?: string
  is_active: boolean
}

export interface CRMConfig {
  api_endpoint: string
  api_key?: string
  oauth_token?: string
  organization_id?: string
  pipeline_id?: string
  lead_source_id?: string
}

export interface FieldMapping {
  source_field: string
  target_field: string
  transformation?: 'uppercase' | 'lowercase' | 'format_phone' | 'format_date'
  default_value?: string
}

export interface SyncRule {
  condition: string
  action: 'create' | 'update' | 'skip'
  priority: number
}

export interface LeadHandoffRule {
  id: string
  name: string
  description: string
  conditions: HandoffCondition[]
  actions: HandoffAction[]
  is_active: boolean
  priority: number
  created_at: string
  trigger_count: number
  success_rate: number
}

export interface HandoffCondition {
  field:
    | 'lead_score'
    | 'engagement_score'
    | 'conversion_probability'
    | 'demo_completion'
    | 'feature_usage'
  operator: 'greater_than' | 'less_than' | 'equals' | 'in_range'
  value: any
  weight: number
}

export interface HandoffAction {
  action_type:
    | 'assign_sales_rep'
    | 'send_email'
    | 'create_task'
    | 'schedule_demo'
    | 'add_to_sequence'
  parameters: Record<string, any>
  delay_minutes?: number
}

export interface MarketingAutomation {
  id: string
  name: string
  description: string
  trigger_conditions: TriggerCondition[]
  workflow_steps: WorkflowStep[]
  is_active: boolean
  performance_metrics: {
    total_triggers: number
    completion_rate: number
    conversion_rate: number
    roi: number
  }
}

export interface WorkflowStep {
  id: string
  step_type: 'email' | 'sms' | 'delay' | 'condition' | 'webhook'
  step_order: number
  configuration: StepConfiguration
  success_criteria?: string
  failure_action?: string
}

export interface StepConfiguration {
  template_id?: string
  subject?: string
  content?: string
  delay_hours?: number
  condition_field?: string
  condition_operator?: string
  condition_value?: any
  webhook_url?: string
}

export type LeadStatus =
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'demo_scheduled'
  | 'proposal_sent'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost'
  | 'nurturing'
export type LeadSource =
  | 'website_demo'
  | 'landing_page'
  | 'referral'
  | 'advertising'
  | 'social_media'
  | 'content'
  | 'direct'
export type LifecycleStage =
  | 'visitor'
  | 'lead'
  | 'marketing_qualified_lead'
  | 'sales_qualified_lead'
  | 'opportunity'
  | 'customer'

/**
 * Lead Scoring and Handoff System
 * Manages lead qualification, scoring, and sales handoff processes
 */
export class LeadHandoffSystem {
  private supabase: SupabaseClient
  private crmIntegrations: Map<string, CRMIntegration> = new Map()
  private handoffRules: LeadHandoffRule[] = []
  private automationWorkflows: MarketingAutomation[] = []

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
    this.loadConfigurations()
  }

  /**
   * Create a new lead from demo session
   */
  async createLead(
    sessionId: string,
    contactInfo: {
      email?: string
      name?: string
      company?: string
      phone?: string
    },
    leadScore: LeadScore,
    sessionData: SessionData,
    utmData?: UTMData
  ): Promise<{ lead: Lead; error?: string }> {
    try {
      const leadId = uuidv4()
      const now = new Date().toISOString()

      // Determine business scenario from session
      const { data: session } = await this.supabase
        .from('demo_sessions')
        .select('business_scenario')
        .eq('id', sessionId)
        .single()

      const businessScenario = session?.business_scenario || 'generic'

      // Create engagement timeline from session activities
      const engagementTimeline = await this.buildEngagementTimeline(sessionId)

      // Determine lifecycle stage based on lead score
      const lifecycleStage = this.determineLifecycleStage(leadScore, contactInfo)

      // Estimate lead value
      const estimatedValue = this.estimateLeadValue(leadScore, businessScenario, sessionData)

      const lead: Lead = {
        id: leadId,
        session_id: sessionId,
        email: contactInfo.email,
        name: contactInfo.name,
        company: contactInfo.company,
        phone: contactInfo.phone,
        business_scenario: businessScenario as BusinessScenario,
        lead_score: leadScore,
        status: 'new',
        source: this.determineLeadSource(utmData, sessionData),
        utm_data: utmData,
        session_data: sessionData,
        engagement_timeline: engagementTimeline,
        sales_notes: [],
        follow_up_actions: [],
        created_at: now,
        updated_at: now,
        last_activity_at: now,
        conversion_probability: leadScore.conversion_probability,
        estimated_value: estimatedValue,
        lifecycle_stage: lifecycleStage,
      }

      // Store lead in database
      await this.storeLead(lead)

      // Process handoff rules
      await this.processHandoffRules(lead)

      // Sync with CRM if configured
      await this.syncWithCRM(lead)

      // Trigger marketing automation
      await this.triggerMarketingAutomation(lead)

      return { lead }
    } catch (error) {
      console.error('Error creating lead:', error)
      return {
        lead: null as any,
        error: error instanceof Error ? error.message : 'Failed to create lead',
      }
    }
  }

  /**
   * Update lead score and trigger re-evaluation
   */
  async updateLeadScore(
    leadId: string,
    newScore: LeadScore,
    activityData?: Record<string, any>
  ): Promise<boolean> {
    try {
      const lead = await this.getLead(leadId)
      if (!lead) return false

      const previousScore = lead.lead_score.total_score
      const scoreChange = newScore.total_score - previousScore

      // Update lead
      lead.lead_score = newScore
      lead.conversion_probability = newScore.conversion_probability
      lead.updated_at = new Date().toISOString()
      lead.last_activity_at = new Date().toISOString()

      // Add engagement event for score change
      if (Math.abs(scoreChange) > 5) {
        const engagementEvent: EngagementEvent = {
          id: uuidv4(),
          event_type: scoreChange > 0 ? 'feature_use' : 'signup_click',
          timestamp: new Date().toISOString(),
          description: `Lead score ${scoreChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(scoreChange)} points`,
          metadata: {
            previous_score: previousScore,
            new_score: newScore.total_score,
            activity_data: activityData,
          },
          engagement_score_impact: scoreChange,
        }
        lead.engagement_timeline.push(engagementEvent)
      }

      // Update database
      await this.updateLead(lead)

      // Re-evaluate handoff rules if score changed significantly
      if (Math.abs(scoreChange) > 10) {
        await this.processHandoffRules(lead)
      }

      return true
    } catch (error) {
      console.error('Error updating lead score:', error)
      return false
    }
  }

  /**
   * Assign lead to sales representative
   */
  async assignLeadToSalesRep(
    leadId: string,
    salesRepId: string,
    reason: string,
    autoGenerateTasks: boolean = true
  ): Promise<boolean> {
    try {
      const lead = await this.getLead(leadId)
      if (!lead) return false

      // Update assignment
      lead.assigned_to = salesRepId
      lead.status = 'contacted'
      lead.updated_at = new Date().toISOString()

      // Add sales note about assignment
      const assignmentNote: SalesNote = {
        id: uuidv4(),
        note: `Lead assigned to sales rep. Reason: ${reason}`,
        created_by: 'system',
        created_at: new Date().toISOString(),
        note_type: 'general',
        sentiment: 'neutral',
        next_action: 'Initial contact within 24 hours',
      }
      lead.sales_notes.push(assignmentNote)

      // Generate follow-up tasks if requested
      if (autoGenerateTasks) {
        const followUpTasks = await this.generateFollowUpTasks(lead, salesRepId)
        lead.follow_up_actions.push(...followUpTasks)
      }

      // Update database
      await this.updateLead(lead)

      // Notify sales rep
      await this.notifySalesRep(salesRepId, lead)

      return true
    } catch (error) {
      console.error('Error assigning lead to sales rep:', error)
      return false
    }
  }

  /**
   * Create follow-up action for lead
   */
  async createFollowUpAction(
    leadId: string,
    action: Omit<FollowUpAction, 'id' | 'created_at' | 'updated_at'>
  ): Promise<string | null> {
    try {
      const lead = await this.getLead(leadId)
      if (!lead) return null

      const followUpAction: FollowUpAction = {
        ...action,
        id: uuidv4(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      lead.follow_up_actions.push(followUpAction)
      lead.updated_at = new Date().toISOString()

      await this.updateLead(lead)

      // Schedule automation if configured
      if (followUpAction.automation_trigger) {
        await this.scheduleAutomation(leadId, followUpAction)
      }

      return followUpAction.id
    } catch (error) {
      console.error('Error creating follow-up action:', error)
      return null
    }
  }

  /**
   * Add sales note to lead
   */
  async addSalesNote(leadId: string, note: Omit<SalesNote, 'id' | 'created_at'>): Promise<boolean> {
    try {
      const lead = await this.getLead(leadId)
      if (!lead) return false

      const salesNote: SalesNote = {
        ...note,
        id: uuidv4(),
        created_at: new Date().toISOString(),
      }

      lead.sales_notes.push(salesNote)
      lead.updated_at = new Date().toISOString()
      lead.last_activity_at = new Date().toISOString()

      await this.updateLead(lead)
      return true
    } catch (error) {
      console.error('Error adding sales note:', error)
      return false
    }
  }

  /**
   * Get leads by criteria
   */
  async getLeads(
    criteria: {
      status?: LeadStatus[]
      assigned_to?: string
      business_scenario?: BusinessScenario
      min_score?: number
      max_score?: number
      lifecycle_stage?: LifecycleStage[]
      created_after?: string
      created_before?: string
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<Lead[]> {
    try {
      let query = this.supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (criteria.status) {
        query = query.in('status', criteria.status)
      }

      if (criteria.assigned_to) {
        query = query.eq('assigned_to', criteria.assigned_to)
      }

      if (criteria.business_scenario) {
        query = query.eq('business_scenario', criteria.business_scenario)
      }

      if (criteria.min_score) {
        query = query.gte('lead_score->total_score', criteria.min_score)
      }

      if (criteria.max_score) {
        query = query.lte('lead_score->total_score', criteria.max_score)
      }

      if (criteria.lifecycle_stage) {
        query = query.in('lifecycle_stage', criteria.lifecycle_stage)
      }

      if (criteria.created_after) {
        query = query.gte('created_at', criteria.created_after)
      }

      if (criteria.created_before) {
        query = query.lte('created_at', criteria.created_before)
      }

      const { data, error } = await query

      return error ? [] : data || []
    } catch (error) {
      console.error('Error getting leads:', error)
      return []
    }
  }

  /**
   * Get lead analytics and insights
   */
  async getLeadAnalytics(timeRange?: { start: string; end: string }): Promise<{
    total_leads: number
    conversion_rate: number
    average_score: number
    lead_by_source: Record<string, number>
    lead_by_stage: Record<string, number>
    score_distribution: { range: string; count: number }[]
    top_performing_scenarios: { scenario: string; conversion_rate: number }[]
  }> {
    try {
      let query = this.supabase.from('leads').select('*')

      if (timeRange) {
        query = query.gte('created_at', timeRange.start).lte('created_at', timeRange.end)
      }

      const { data: leads, error } = await query

      if (error || !leads) {
        return {
          total_leads: 0,
          conversion_rate: 0,
          average_score: 0,
          lead_by_source: {},
          lead_by_stage: {},
          score_distribution: [],
          top_performing_scenarios: [],
        }
      }

      // Calculate metrics
      const totalLeads = leads.length
      const convertedLeads = leads.filter(lead => lead.status === 'closed_won').length
      const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0
      const averageScore =
        leads.reduce((sum, lead) => sum + (lead.lead_score?.total_score || 0), 0) / totalLeads

      // Group by source
      const leadBySource = leads.reduce(
        (acc, lead) => {
          acc[lead.source] = (acc[lead.source] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      // Group by lifecycle stage
      const leadByStage = leads.reduce(
        (acc, lead) => {
          acc[lead.lifecycle_stage] = (acc[lead.lifecycle_stage] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      // Score distribution
      const scoreRanges = ['0-20', '21-40', '41-60', '61-80', '81-100']
      const scoreDistribution = scoreRanges.map(range => {
        const [min, max] = range.split('-').map(Number)
        const count = leads.filter(lead => {
          const score = lead.lead_score?.total_score || 0
          return score >= min && score <= max
        }).length
        return { range, count }
      })

      // Top performing scenarios
      const scenarioStats = leads.reduce(
        (acc, lead) => {
          const scenario = lead.business_scenario
          if (!acc[scenario]) {
            acc[scenario] = { total: 0, converted: 0 }
          }
          acc[scenario].total++
          if (lead.status === 'closed_won') {
            acc[scenario].converted++
          }
          return acc
        },
        {} as Record<string, { total: number; converted: number }>
      )

      const topPerformingScenarios = Object.entries(scenarioStats)
        .map(([scenario, stats]) => ({
          scenario,
          conversion_rate: stats.total > 0 ? (stats.converted / stats.total) * 100 : 0,
        }))
        .sort((a, b) => b.conversion_rate - a.conversion_rate)

      return {
        total_leads: totalLeads,
        conversion_rate: conversionRate,
        average_score: averageScore,
        lead_by_source: leadBySource,
        lead_by_stage: leadByStage,
        score_distribution: scoreDistribution,
        top_performing_scenarios: topPerformingScenarios,
      }
    } catch (error) {
      console.error('Error getting lead analytics:', error)
      return {
        total_leads: 0,
        conversion_rate: 0,
        average_score: 0,
        lead_by_source: {},
        lead_by_stage: {},
        score_distribution: [],
        top_performing_scenarios: [],
      }
    }
  }

  // Private helper methods

  private async loadConfigurations(): Promise<void> {
    try {
      // Load CRM integrations
      const { data: crmData } = await this.supabase
        .from('crm_integrations')
        .select('*')
        .eq('is_active', true)

      crmData?.forEach(integration => {
        this.crmIntegrations.set(integration.id, integration)
      })

      // Load handoff rules
      const { data: rulesData } = await this.supabase
        .from('lead_handoff_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false })

      this.handoffRules = rulesData || []

      // Load marketing automation workflows
      const { data: automationData } = await this.supabase
        .from('marketing_automations')
        .select('*')
        .eq('is_active', true)

      this.automationWorkflows = automationData || []
    } catch (error) {
      console.error('Error loading configurations:', error)
    }
  }

  private async buildEngagementTimeline(sessionId: string): Promise<EngagementEvent[]> {
    const { data: activities } = await this.supabase
      .from('demo_session_activities')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    const timeline: EngagementEvent[] = []

    activities?.forEach(activity => {
      const event: EngagementEvent = {
        id: uuidv4(),
        event_type: this.mapActivityToEngagementType(activity.activity_type),
        timestamp: activity.created_at,
        description: this.generateEventDescription(activity),
        metadata: activity.activity_data,
        engagement_score_impact: this.calculateEngagementImpact(activity.activity_type),
      }
      timeline.push(event)
    })

    return timeline
  }

  private mapActivityToEngagementType(activityType: string): EngagementEvent['event_type'] {
    const mapping: Record<string, EngagementEvent['event_type']> = {
      demo_session_created: 'demo_start',
      feature_interaction: 'feature_use',
      signup_clicked: 'signup_click',
      form_submission: 'form_fill',
    }
    return mapping[activityType] || 'feature_use'
  }

  private generateEventDescription(activity: any): string {
    switch (activity.activity_type) {
      case 'demo_session_created':
        return 'Started demo session'
      case 'feature_interaction':
        return `Explored ${activity.activity_data?.feature || 'feature'}`
      case 'signup_clicked':
        return 'Clicked signup button'
      case 'form_submission':
        return 'Submitted contact form'
      default:
        return `Performed ${activity.activity_type}`
    }
  }

  private calculateEngagementImpact(activityType: string): number {
    const impacts: Record<string, number> = {
      demo_session_created: 10,
      feature_interaction: 5,
      signup_clicked: 15,
      form_submission: 20,
      page_view: 2,
    }
    return impacts[activityType] || 1
  }

  private determineLifecycleStage(
    leadScore: LeadScore,
    contactInfo: { email?: string; name?: string; company?: string }
  ): LifecycleStage {
    if (leadScore.sales_readiness === 'qualified') return 'sales_qualified_lead'
    if (leadScore.sales_readiness === 'hot') return 'marketing_qualified_lead'
    if (contactInfo.email || contactInfo.name) return 'lead'
    return 'visitor'
  }

  private estimateLeadValue(
    leadScore: LeadScore,
    businessScenario: BusinessScenario,
    sessionData: SessionData
  ): number {
    const baseValues: Record<BusinessScenario, number> = {
      retail: 500,
      restaurant: 300,
      real_estate: 2000,
      healthcare: 1500,
      education: 800,
      ecommerce: 1000,
      automotive: 3000,
      travel: 600,
      fitness: 400,
      generic: 750,
    }

    const baseValue = baseValues[businessScenario] || 750
    const scoreMultiplier = leadScore.total_score / 100
    const engagementMultiplier = Math.min(sessionData.duration_seconds / 600, 2) // Max 2x for 10+ minutes

    return Math.round(baseValue * scoreMultiplier * engagementMultiplier)
  }

  private determineLeadSource(utmData?: UTMData, sessionData?: SessionData): LeadSource {
    if (utmData?.utm_source === 'google' && utmData?.utm_medium === 'cpc') return 'advertising'
    if (utmData?.utm_source?.includes('social')) return 'social_media'
    if (utmData?.utm_medium === 'referral') return 'referral'
    if (sessionData?.referrer?.includes('landing')) return 'landing_page'
    if (sessionData?.referrer) return 'referral'
    return 'website_demo'
  }

  private async storeLead(lead: Lead): Promise<void> {
    await this.supabase.from('leads').insert({
      id: lead.id,
      session_id: lead.session_id,
      email: lead.email,
      name: lead.name,
      company: lead.company,
      phone: lead.phone,
      business_scenario: lead.business_scenario,
      lead_score: lead.lead_score,
      status: lead.status,
      source: lead.source,
      utm_data: lead.utm_data,
      session_data: lead.session_data,
      engagement_timeline: lead.engagement_timeline,
      sales_notes: lead.sales_notes,
      follow_up_actions: lead.follow_up_actions,
      assigned_to: lead.assigned_to,
      created_at: lead.created_at,
      updated_at: lead.updated_at,
      last_activity_at: lead.last_activity_at,
      conversion_probability: lead.conversion_probability,
      estimated_value: lead.estimated_value,
      lifecycle_stage: lead.lifecycle_stage,
    })
  }

  private async updateLead(lead: Lead): Promise<void> {
    await this.supabase
      .from('leads')
      .update({
        lead_score: lead.lead_score,
        status: lead.status,
        engagement_timeline: lead.engagement_timeline,
        sales_notes: lead.sales_notes,
        follow_up_actions: lead.follow_up_actions,
        assigned_to: lead.assigned_to,
        updated_at: lead.updated_at,
        last_activity_at: lead.last_activity_at,
        conversion_probability: lead.conversion_probability,
        lifecycle_stage: lead.lifecycle_stage,
      })
      .eq('id', lead.id)
  }

  private async getLead(leadId: string): Promise<Lead | null> {
    const { data, error } = await this.supabase.from('leads').select('*').eq('id', leadId).single()

    return error ? null : data
  }

  private async processHandoffRules(lead: Lead): Promise<void> {
    for (const rule of this.handoffRules) {
      const shouldTrigger = this.evaluateHandoffConditions(lead, rule.conditions)

      if (shouldTrigger) {
        await this.executeHandoffActions(lead, rule.actions)

        // Update rule trigger count
        await this.supabase
          .from('lead_handoff_rules')
          .update({ trigger_count: rule.trigger_count + 1 })
          .eq('id', rule.id)

        break // Stop after first matching rule
      }
    }
  }

  private evaluateHandoffConditions(lead: Lead, conditions: HandoffCondition[]): boolean {
    return conditions.every(condition => {
      const value = this.getLeadFieldValue(lead, condition.field)

      switch (condition.operator) {
        case 'greater_than':
          return value > condition.value
        case 'less_than':
          return value < condition.value
        case 'equals':
          return value === condition.value
        case 'in_range':
          return value >= condition.value.min && value <= condition.value.max
        default:
          return false
      }
    })
  }

  private getLeadFieldValue(lead: Lead, field: string): any {
    switch (field) {
      case 'lead_score':
        return lead.lead_score.total_score
      case 'engagement_score':
        return lead.lead_score.category_scores.engagement
      case 'conversion_probability':
        return lead.conversion_probability
      case 'demo_completion':
        return lead.session_data.demo_completion_percentage
      case 'feature_usage':
        return lead.session_data.features_explored.length
      default:
        return 0
    }
  }

  private async executeHandoffActions(lead: Lead, actions: HandoffAction[]): Promise<void> {
    for (const action of actions) {
      switch (action.action_type) {
        case 'assign_sales_rep':
          await this.assignLeadToSalesRep(
            lead.id,
            action.parameters.sales_rep_id,
            action.parameters.reason || 'Automatic assignment via handoff rule'
          )
          break
        case 'send_email':
          await this.sendEmail(lead, action.parameters)
          break
        case 'create_task':
          await this.createFollowUpAction(lead.id, {
            action_type: 'call',
            title: action.parameters.title,
            description: action.parameters.description,
            due_date: new Date(Date.now() + (action.delay_minutes || 0) * 60000).toISOString(),
            assigned_to: action.parameters.assigned_to,
            status: 'pending',
            priority: action.parameters.priority || 'medium',
          })
          break
      }
    }
  }

  private async generateFollowUpTasks(lead: Lead, salesRepId: string): Promise<FollowUpAction[]> {
    const tasks: FollowUpAction[] = []
    const now = new Date()

    // Initial contact task
    tasks.push({
      id: uuidv4(),
      action_type: 'call',
      title: 'Initial contact with new lead',
      description: `Contact ${lead.name || lead.email} for initial qualification call`,
      due_date: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      assigned_to: salesRepId,
      status: 'pending',
      priority: lead.lead_score.sales_readiness === 'qualified' ? 'high' : 'medium',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })

    // Follow-up email task
    tasks.push({
      id: uuidv4(),
      action_type: 'email',
      title: 'Send follow-up email',
      description: 'Send personalized follow-up email with relevant resources',
      due_date: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(), // 48 hours
      assigned_to: salesRepId,
      status: 'pending',
      priority: 'medium',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    })

    // Demo task if high-intent lead
    if (
      lead.lead_score.sales_readiness === 'qualified' ||
      lead.lead_score.sales_readiness === 'hot'
    ) {
      tasks.push({
        id: uuidv4(),
        action_type: 'demo',
        title: 'Schedule product demo',
        description: 'Schedule a personalized product demo',
        due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        assigned_to: salesRepId,
        status: 'pending',
        priority: 'high',
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
    }

    return tasks
  }

  private async syncWithCRM(lead: Lead): Promise<void> {
    for (const [id, integration] of this.crmIntegrations) {
      try {
        await this.syncLeadToCRM(lead, integration)
      } catch (error) {
        console.error(`Error syncing lead to CRM ${integration.provider}:`, error)
      }
    }
  }

  private async syncLeadToCRM(lead: Lead, integration: CRMIntegration): Promise<void> {
    // Transform lead data according to field mappings
    const crmData: Record<string, any> = {}

    integration.field_mappings.forEach(mapping => {
      let sourceValue = this.getLeadFieldValue(lead, mapping.source_field)

      // Apply transformations
      if (mapping.transformation && sourceValue) {
        sourceValue = this.applyTransformation(sourceValue, mapping.transformation)
      }

      crmData[mapping.target_field] = sourceValue || mapping.default_value
    })

    // Make API call to CRM
    switch (integration.provider) {
      case 'salesforce':
        await this.syncToSalesforce(crmData, integration.configuration)
        break
      case 'hubspot':
        await this.syncToHubspot(crmData, integration.configuration)
        break
      case 'pipedrive':
        await this.syncToPipedrive(crmData, integration.configuration)
        break
    }
  }

  private applyTransformation(value: any, transformation: string): any {
    switch (transformation) {
      case 'uppercase':
        return String(value).toUpperCase()
      case 'lowercase':
        return String(value).toLowerCase()
      case 'format_phone':
        return this.formatPhoneNumber(String(value))
      case 'format_date':
        return new Date(value).toISOString()
      default:
        return value
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Basic phone number formatting
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  private async syncToSalesforce(data: any, config: CRMConfig): Promise<void> {
    // Salesforce API integration implementation
  }

  private async syncToHubspot(data: any, config: CRMConfig): Promise<void> {
    // HubSpot API integration implementation
  }

  private async syncToPipedrive(data: any, config: CRMConfig): Promise<void> {
    // Pipedrive API integration implementation
  }

  private async triggerMarketingAutomation(lead: Lead): Promise<void> {
    for (const workflow of this.automationWorkflows) {
      const shouldTrigger = this.evaluateAutomationConditions(lead, workflow.trigger_conditions)

      if (shouldTrigger) {
        await this.executeAutomationWorkflow(lead, workflow)
      }
    }
  }

  private evaluateAutomationConditions(lead: Lead, conditions: TriggerCondition[]): boolean {
    return conditions.every(condition => {
      const value = this.getLeadFieldValue(lead, condition.field)

      switch (condition.operator) {
        case 'equals':
          return value === condition.value
        case 'greater_than':
          return value > condition.value
        case 'less_than':
          return value < condition.value
        case 'contains':
          return String(value).toLowerCase().includes(String(condition.value).toLowerCase())
        default:
          return false
      }
    })
  }

  private async executeAutomationWorkflow(
    lead: Lead,
    workflow: MarketingAutomation
  ): Promise<void> {
    // Execute workflow steps in sequence
    for (const step of workflow.workflow_steps.sort((a, b) => a.step_order - b.step_order)) {
      await this.executeWorkflowStep(lead, step)
    }
  }

  private async executeWorkflowStep(lead: Lead, step: WorkflowStep): Promise<void> {
    switch (step.step_type) {
      case 'email':
        await this.sendWorkflowEmail(lead, step.configuration)
        break
      case 'delay':
        // For immediate execution, we skip delays
        // In production, this would be handled by a job queue
        break
      case 'webhook':
        await this.callWebhook(lead, step.configuration)
        break
    }
  }

  private async sendEmail(lead: Lead, parameters: any): Promise<void> {
    // Email sending implementation
  }

  private async sendWorkflowEmail(lead: Lead, config: StepConfiguration): Promise<void> {
    // Workflow email implementation
  }

  private async callWebhook(lead: Lead, config: StepConfiguration): Promise<void> {
    // Webhook call implementation
    if (config.webhook_url) {
      try {
        await fetch(config.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead),
        })
      } catch (error) {
        console.error('Error calling webhook:', error)
      }
    }
  }

  private async notifySalesRep(salesRepId: string, lead: Lead): Promise<void> {
    // Sales rep notification implementation
  }

  private async scheduleAutomation(leadId: string, action: FollowUpAction): Promise<void> {
    // Automation scheduling implementation
  }
}

/**
 * Lead Handoff Utilities
 */
export const LeadHandoffUtils = {
  /**
   * Format lead score for display
   */
  formatLeadDisplay(lead: Lead): {
    scoreColor: string
    statusBadge: string
    priorityLevel: number
    nextAction: string
  } {
    const scoreColors = {
      qualified: 'green',
      hot: 'orange',
      warm: 'yellow',
      cold: 'gray',
    }

    const statusBadges = {
      new: 'New Lead',
      contacted: 'Contacted',
      qualified: 'Qualified',
      demo_scheduled: 'Demo Scheduled',
      closed_won: 'Customer',
      closed_lost: 'Lost',
    }

    const scoreColor = scoreColors[lead.lead_score.sales_readiness]
    const statusBadge = statusBadges[lead.status]
    const priorityLevel = lead.lead_score.total_score

    const nextAction =
      lead.follow_up_actions
        .filter(action => action.status === 'pending')
        .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0]
        ?.title || 'No actions scheduled'

    return { scoreColor, statusBadge, priorityLevel, nextAction }
  },

  /**
   * Calculate lead velocity
   */
  calculateLeadVelocity(leads: Lead[]): {
    averageDaysToContact: number
    averageDaysToQualify: number
    averageDaysToClose: number
  } {
    const contactedLeads = leads.filter(lead => lead.status !== 'new')
    const qualifiedLeads = leads.filter(lead =>
      [
        'qualified',
        'demo_scheduled',
        'proposal_sent',
        'negotiation',
        'closed_won',
        'closed_lost',
      ].includes(lead.status)
    )
    const closedLeads = leads.filter(lead => ['closed_won', 'closed_lost'].includes(lead.status))

    const averageDaysToContact =
      contactedLeads.length > 0
        ? contactedLeads.reduce((sum, lead) => {
            const createdDate = new Date(lead.created_at)
            const contactedDate = new Date(lead.updated_at) // Simplified
            return sum + (contactedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
          }, 0) / contactedLeads.length
        : 0

    const averageDaysToQualify =
      qualifiedLeads.length > 0
        ? qualifiedLeads.reduce((sum, lead) => {
            const createdDate = new Date(lead.created_at)
            const qualifiedDate = new Date(lead.updated_at) // Simplified
            return sum + (qualifiedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
          }, 0) / qualifiedLeads.length
        : 0

    const averageDaysToClose =
      closedLeads.length > 0
        ? closedLeads.reduce((sum, lead) => {
            const createdDate = new Date(lead.created_at)
            const closedDate = new Date(lead.updated_at) // Simplified
            return sum + (closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
          }, 0) / closedLeads.length
        : 0

    return {
      averageDaysToContact: Math.round(averageDaysToContact * 10) / 10,
      averageDaysToQualify: Math.round(averageDaysToQualify * 10) / 10,
      averageDaysToClose: Math.round(averageDaysToClose * 10) / 10,
    }
  },
}
