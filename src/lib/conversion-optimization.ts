import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { BusinessScenario, DemoEvent } from '@/types/demo'
import { Database } from '@/types/database'
import { AdvancedDemoAnalytics, UserJourney, FeatureEngagement } from './demo-analytics-advanced'
import { ABTestingFramework, ABTest, ABTestVariant } from './ab-testing'

type SupabaseClient = ReturnType<typeof createClient<Database>>

// Conversion Optimization Types
export interface ConversionFunnel {
  id: string
  name: string
  business_scenario: BusinessScenario
  steps: ConversionStep[]
  overall_conversion_rate: number
  total_sessions: number
  bottlenecks: Bottleneck[]
  optimization_opportunities: OptimizationOpportunity[]
  created_at: string
  updated_at: string
}

export interface ConversionStep {
  id: string
  name: string
  step_order: number
  page_path: string
  required_action: string
  entry_count: number
  completion_count: number
  conversion_rate: number
  average_time_spent: number
  drop_off_count: number
  drop_off_rate: number
  improvement_potential: number
}

export interface Bottleneck {
  step_id: string
  step_name: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  impact_score: number
  drop_off_rate: number
  suggested_improvements: string[]
  estimated_improvement: number
  priority: number
}

export interface OptimizationOpportunity {
  id: string
  type: 'ui_improvement' | 'copy_change' | 'flow_optimization' | 'feature_enhancement' | 'technical_fix'
  title: string
  description: string
  impact_level: 'low' | 'medium' | 'high'
  effort_level: 'low' | 'medium' | 'high'
  roi_score: number
  affected_steps: string[]
  success_metrics: string[]
  implementation_details: string[]
  ab_test_suggestions: ABTestSuggestion[]
  created_at: string
}

export interface ABTestSuggestion {
  test_name: string
  hypothesis: string
  variants: VariantSuggestion[]
  primary_metric: string
  expected_improvement: number
  estimated_duration_days: number
  traffic_allocation: number
}

export interface VariantSuggestion {
  name: string
  description: string
  changes: Change[]
  expected_impact: number
}

export interface Change {
  element: string
  property: string
  current_value: string
  new_value: string
  rationale: string
}

export interface LeadScore {
  session_id: string
  total_score: number
  category_scores: {
    engagement: number
    intent: number
    fit: number
    timing: number
  }
  scoring_factors: ScoringFactor[]
  conversion_probability: number
  recommended_actions: string[]
  sales_readiness: 'cold' | 'warm' | 'hot' | 'qualified'
  last_calculated: string
}

export interface ScoringFactor {
  factor: string
  value: number
  weight: number
  contribution: number
  explanation: string
}

export interface ConversionSegment {
  id: string
  name: string
  description: string
  criteria: SegmentCriteria
  session_count: number
  conversion_rate: number
  average_engagement_score: number
  top_converting_features: string[]
  optimization_strategies: string[]
}

export interface SegmentCriteria {
  business_scenario?: BusinessScenario[]
  traffic_source?: string[]
  device_type?: string[]
  engagement_score_range?: { min: number; max: number }
  session_duration_range?: { min: number; max: number }
  features_used?: string[]
  geographic_location?: string[]
  time_of_day?: string[]
}

export interface PersonalizationRule {
  id: string
  name: string
  description: string
  segment_id: string
  trigger_conditions: TriggerCondition[]
  actions: PersonalizationAction[]
  is_active: boolean
  performance_metrics: {
    impressions: number
    clicks: number
    conversions: number
    lift: number
  }
  created_at: string
}

export interface TriggerCondition {
  type: 'page_visit' | 'time_spent' | 'feature_interaction' | 'engagement_score' | 'lead_score'
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'in_range'
  value: any
  weight: number
}

export interface PersonalizationAction {
  type: 'show_popup' | 'highlight_feature' | 'change_cta' | 'show_testimonial' | 'offer_demo_extension'
  target_element: string
  content: Record<string, any>
  timing: 'immediate' | 'delayed' | 'on_exit_intent'
  delay_seconds?: number
}

export interface OptimizationInsight {
  id: string
  type: 'trend' | 'anomaly' | 'opportunity' | 'alert'
  severity: 'info' | 'warning' | 'critical'
  title: string
  description: string
  affected_metrics: string[]
  time_period: string
  data_points: any[]
  recommendations: string[]
  auto_actionable: boolean
  created_at: string
}

/**
 * Conversion Optimization Engine
 * Provides comprehensive funnel analysis, lead scoring, and optimization recommendations
 */
export class ConversionOptimizationEngine {
  private supabase: SupabaseClient
  private analytics: AdvancedDemoAnalytics
  private abTesting: ABTestingFramework

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
    this.analytics = new AdvancedDemoAnalytics(supabaseClient)
    this.abTesting = new ABTestingFramework(supabaseClient)
  }

  /**
   * Analyze conversion funnel and identify bottlenecks
   */
  async analyzeFunnel(
    businessScenario: BusinessScenario,
    timeRange?: { start: string; end: string }
  ): Promise<ConversionFunnel> {
    try {
      // Define funnel steps for the business scenario
      const funnelSteps = this.getFunnelStepsForScenario(businessScenario)

      // Get session data for analysis
      const sessionData = await this.getSessionDataForFunnel(businessScenario, timeRange)

      // Calculate metrics for each step
      const analyzedSteps: ConversionStep[] = []
      let previousStepCompletions = sessionData.length

      for (const step of funnelSteps) {
        const stepAnalysis = await this.analyzeStep(step, sessionData, previousStepCompletions)
        analyzedSteps.push(stepAnalysis)
        previousStepCompletions = stepAnalysis.completion_count
      }

      // Calculate overall metrics
      const totalSessions = sessionData.length
      const finalConversions = analyzedSteps[analyzedSteps.length - 1]?.completion_count || 0
      const overallConversionRate = totalSessions > 0 ? (finalConversions / totalSessions) * 100 : 0

      // Identify bottlenecks
      const bottlenecks = this.identifyBottlenecks(analyzedSteps)

      // Generate optimization opportunities
      const optimizationOpportunities = await this.generateOptimizationOpportunities(
        analyzedSteps,
        bottlenecks,
        businessScenario
      )

      const funnel: ConversionFunnel = {
        id: uuidv4(),
        name: `${businessScenario} Conversion Funnel`,
        business_scenario: businessScenario,
        steps: analyzedSteps,
        overall_conversion_rate: overallConversionRate,
        total_sessions: totalSessions,
        bottlenecks,
        optimization_opportunities: optimizationOpportunities,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Store funnel analysis
      await this.storeFunnelAnalysis(funnel)

      return funnel
    } catch (error) {
      console.error('Error analyzing conversion funnel:', error)
      throw error
    }
  }

  /**
   * Calculate lead score for a session
   */
  async calculateLeadScore(sessionId: string): Promise<LeadScore> {
    try {
      // Get session data and user journey
      const userJourney = await this.analytics.buildUserJourney(sessionId)
      if (!userJourney) {
        throw new Error('No user journey found for session')
      }

      const sessionActivities = await this.getSessionActivities(sessionId)

      // Calculate category scores
      const engagementScore = this.calculateEngagementScore(userJourney, sessionActivities)
      const intentScore = this.calculateIntentScore(sessionActivities)
      const fitScore = await this.calculateFitScore(sessionId, sessionActivities)
      const timingScore = this.calculateTimingScore(sessionActivities)

      // Calculate scoring factors
      const scoringFactors = this.calculateScoringFactors(
        userJourney,
        sessionActivities,
        { engagementScore, intentScore, fitScore, timingScore }
      )

      // Calculate total weighted score
      const totalScore = this.calculateTotalScore(scoringFactors)

      // Calculate conversion probability
      const conversionProbability = this.calculateConversionProbability(totalScore, scoringFactors)

      // Determine sales readiness
      const salesReadiness = this.determineSalesReadiness(totalScore, conversionProbability)

      // Generate recommended actions
      const recommendedActions = this.generateRecommendedActions(
        scoringFactors,
        salesReadiness,
        sessionActivities
      )

      const leadScore: LeadScore = {
        session_id: sessionId,
        total_score: totalScore,
        category_scores: {
          engagement: engagementScore,
          intent: intentScore,
          fit: fitScore,
          timing: timingScore
        },
        scoring_factors: scoringFactors,
        conversion_probability: conversionProbability,
        recommended_actions: recommendedActions,
        sales_readiness: salesReadiness,
        last_calculated: new Date().toISOString()
      }

      // Store lead score
      await this.storeLeadScore(leadScore)

      return leadScore
    } catch (error) {
      console.error('Error calculating lead score:', error)
      throw error
    }
  }

  /**
   * Segment users for targeted optimization
   */
  async createConversionSegments(
    businessScenario?: BusinessScenario,
    timeRange?: { start: string; end: string }
  ): Promise<ConversionSegment[]> {
    try {
      // Get all session data
      const sessions = await this.getAllSessionsForSegmentation(businessScenario, timeRange)

      // Define segmentation criteria
      const segmentationCriteria = this.getSegmentationCriteria()

      const segments: ConversionSegment[] = []

      for (const criteria of segmentationCriteria) {
        const segment = await this.createSegment(criteria, sessions)
        segments.push(segment)
      }

      // Store segments
      await this.storeConversionSegments(segments)

      return segments
    } catch (error) {
      console.error('Error creating conversion segments:', error)
      return []
    }
  }

  /**
   * Generate personalized optimization recommendations
   */
  async generatePersonalizationRules(
    segmentId: string
  ): Promise<PersonalizationRule[]> {
    try {
      const segment = await this.getConversionSegment(segmentId)
      if (!segment) return []

      const rules: PersonalizationRule[] = []

      // Generate rules based on segment characteristics
      if (segment.average_engagement_score < 50) {
        // Low engagement segment
        rules.push(await this.createEngagementBoostRule(segment))
      }

      if (segment.conversion_rate < 5) {
        // Low conversion segment
        rules.push(await this.createConversionBoostRule(segment))
      }

      // Feature-specific rules
      for (const feature of segment.top_converting_features) {
        rules.push(await this.createFeatureHighlightRule(segment, feature))
      }

      // Store rules
      await this.storePersonalizationRules(rules)

      return rules
    } catch (error) {
      console.error('Error generating personalization rules:', error)
      return []
    }
  }

  /**
   * Monitor for optimization insights and anomalies
   */
  async generateOptimizationInsights(
    businessScenario?: BusinessScenario,
    timeRange?: { start: string; end: string }
  ): Promise<OptimizationInsight[]> {
    try {
      const insights: OptimizationInsight[] = []

      // Check for conversion rate trends
      const conversionTrends = await this.analyzeConversionTrends(businessScenario, timeRange)
      insights.push(...conversionTrends)

      // Check for funnel anomalies
      const funnelAnomalies = await this.detectFunnelAnomalies(businessScenario, timeRange)
      insights.push(...funnelAnomalies)

      // Check for optimization opportunities
      const opportunities = await this.detectOptimizationOpportunities(businessScenario, timeRange)
      insights.push(...opportunities)

      // Check for performance alerts
      const alerts = await this.checkPerformanceAlerts(businessScenario, timeRange)
      insights.push(...alerts)

      // Store insights
      await this.storeOptimizationInsights(insights)

      return insights
    } catch (error) {
      console.error('Error generating optimization insights:', error)
      return []
    }
  }

  /**
   * Create A/B test suggestions based on optimization opportunities
   */
  async createABTestSuggestions(
    optimizationOpportunities: OptimizationOpportunity[]
  ): Promise<ABTestSuggestion[]> {
    const suggestions: ABTestSuggestion[] = []

    for (const opportunity of optimizationOpportunities) {
      if (opportunity.impact_level === 'high' && opportunity.effort_level !== 'high') {
        const suggestion = this.createTestSuggestionFromOpportunity(opportunity)
        suggestions.push(suggestion)
      }
    }

    return suggestions
  }

  // Private helper methods

  private getFunnelStepsForScenario(scenario: BusinessScenario): any[] {
    const commonSteps = [
      { name: 'Landing Page Visit', page_path: '/', action: 'page_view' },
      { name: 'Demo Start', page_path: '/demo', action: 'demo_session_created' },
      { name: 'Feature Exploration', page_path: '/demo/dashboard', action: 'feature_interaction' },
      { name: 'Signup Intent', page_path: '/demo', action: 'signup_clicked' },
      { name: 'Account Creation', page_path: '/signup', action: 'form_submission' }
    ]

    const scenarioSpecificSteps: Record<BusinessScenario, any[]> = {
      retail: [
        ...commonSteps,
        { name: 'Product Catalog View', page_path: '/demo/products', action: 'page_view' },
        { name: 'Order Management', page_path: '/demo/orders', action: 'feature_interaction' }
      ],
      restaurant: [
        ...commonSteps,
        { name: 'Menu Sharing', page_path: '/demo/menu', action: 'feature_interaction' },
        { name: 'Reservation System', page_path: '/demo/reservations', action: 'feature_interaction' }
      ],
      // Add more scenarios as needed
      generic: commonSteps
    }

    return scenarioSpecificSteps[scenario] || scenarioSpecificSteps.generic
  }

  private async getSessionDataForFunnel(
    scenario: BusinessScenario,
    timeRange?: { start: string; end: string }
  ): Promise<any[]> {
    let query = this.supabase
      .from('demo_sessions')
      .select(`
        id,
        created_at,
        demo_session_activities(*)
      `)
      .eq('business_scenario', scenario)

    if (timeRange) {
      query = query
        .gte('created_at', timeRange.start)
        .lte('created_at', timeRange.end)
    }

    const { data, error } = await query

    return error ? [] : data || []
  }

  private async analyzeStep(
    step: any,
    sessionData: any[],
    previousStepCompletions: number
  ): Promise<ConversionStep> {
    // Calculate step metrics
    const sessionsReachingStep = sessionData.filter(session =>
      session.demo_session_activities?.some((activity: any) =>
        activity.page_path === step.page_path || activity.activity_type === step.action
      )
    )

    const entryCount = sessionsReachingStep.length
    const completionCount = sessionsReachingStep.filter(session =>
      session.demo_session_activities?.some((activity: any) =>
        activity.activity_type === step.action
      )
    ).length

    const conversionRate = entryCount > 0 ? (completionCount / entryCount) * 100 : 0
    const dropOffCount = entryCount - completionCount
    const dropOffRate = entryCount > 0 ? (dropOffCount / entryCount) * 100 : 0

    // Calculate average time spent
    const averageTimeSpent = this.calculateAverageTimeSpent(sessionsReachingStep, step)

    // Calculate improvement potential
    const improvementPotential = this.calculateImprovementPotential(conversionRate, dropOffRate)

    return {
      id: uuidv4(),
      name: step.name,
      step_order: step.order || 0,
      page_path: step.page_path,
      required_action: step.action,
      entry_count: entryCount,
      completion_count: completionCount,
      conversion_rate: conversionRate,
      average_time_spent: averageTimeSpent,
      drop_off_count: dropOffCount,
      drop_off_rate: dropOffRate,
      improvement_potential: improvementPotential
    }
  }

  private identifyBottlenecks(steps: ConversionStep[]): Bottleneck[] {
    const bottlenecks: Bottleneck[] = []

    for (const step of steps) {
      if (step.drop_off_rate > 50) {
        bottlenecks.push({
          step_id: step.id,
          step_name: step.name,
          severity: step.drop_off_rate > 80 ? 'critical' : step.drop_off_rate > 65 ? 'high' : 'medium',
          impact_score: step.drop_off_rate * step.entry_count / 100,
          drop_off_rate: step.drop_off_rate,
          suggested_improvements: this.getSuggestedImprovements(step),
          estimated_improvement: this.estimateImprovement(step),
          priority: this.calculatePriority(step)
        })
      }
    }

    return bottlenecks.sort((a, b) => b.priority - a.priority)
  }

  private async generateOptimizationOpportunities(
    steps: ConversionStep[],
    bottlenecks: Bottleneck[],
    scenario: BusinessScenario
  ): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = []

    // Generate opportunities from bottlenecks
    for (const bottleneck of bottlenecks) {
      const opportunity = await this.createOpportunityFromBottleneck(bottleneck, scenario)
      opportunities.push(opportunity)
    }

    // Generate general optimization opportunities
    const generalOpportunities = await this.generateGeneralOpportunities(steps, scenario)
    opportunities.push(...generalOpportunities)

    return opportunities
  }

  private calculateEngagementScore(
    journey: UserJourney,
    activities: any[]
  ): number {
    let score = 0

    // Time spent weight: 30%
    const timeScore = Math.min(journey.total_duration_seconds / 300, 1) * 30 // 5 minutes = max

    // Interactions weight: 40%
    const interactionScore = Math.min(activities.length / 20, 1) * 40 // 20 interactions = max

    // Feature exploration weight: 30%
    const uniqueFeatures = new Set(
      activities
        .filter(a => a.activity_type === 'feature_interaction')
        .map(a => a.activity_data?.feature)
    ).size
    const featureScore = Math.min(uniqueFeatures / 5, 1) * 30 // 5 features = max

    return Math.round(timeScore + interactionScore + featureScore)
  }

  private calculateIntentScore(activities: any[]): number {
    let score = 0

    // Signup-related actions
    const signupActions = activities.filter(a =>
      a.activity_type === 'signup_clicked' ||
      a.page_path?.includes('signup') ||
      a.activity_type === 'form_submission'
    ).length
    score += Math.min(signupActions * 20, 60)

    // Demo extension requests
    const extensionRequests = activities.filter(a =>
      a.activity_type === 'demo_extended'
    ).length
    score += Math.min(extensionRequests * 15, 30)

    // Contact form interactions
    const contactInteractions = activities.filter(a =>
      a.page_path?.includes('contact') ||
      a.activity_data?.action?.includes('contact')
    ).length
    score += Math.min(contactInteractions * 10, 20)

    return Math.min(score, 100)
  }

  private async calculateFitScore(sessionId: string, activities: any[]): Promise<number> {
    // This would typically analyze company size, industry, use case, etc.
    // For demo purposes, we'll use engagement patterns
    let score = 50 // Default neutral score

    // Analyze feature usage patterns
    const businessFeatures = activities.filter(a =>
      a.activity_data?.feature && [
        'team_collaboration',
        'automation_rules',
        'analytics_dashboard',
        'integrations'
      ].includes(a.activity_data.feature)
    ).length

    score += Math.min(businessFeatures * 10, 30)

    // Analyze depth of exploration
    const pagesVisited = new Set(activities.map(a => a.page_path)).size
    score += Math.min(pagesVisited * 5, 20)

    return Math.min(score, 100)
  }

  private calculateTimingScore(activities: any[]): number {
    let score = 50 // Default neutral score

    // Check for immediate engagement
    const firstActivity = activities[0]
    if (firstActivity) {
      const timeSinceStart = new Date().getTime() - new Date(firstActivity.created_at).getTime()
      const daysSinceStart = timeSinceStart / (1000 * 60 * 60 * 24)

      if (daysSinceStart < 1) score += 30 // Very recent
      else if (daysSinceStart < 3) score += 20 // Recent
      else if (daysSinceStart < 7) score += 10 // Somewhat recent
    }

    // Check for repeated visits
    const uniqueDays = new Set(
      activities.map(a => new Date(a.created_at).toDateString())
    ).size
    score += Math.min(uniqueDays * 5, 20)

    return Math.min(score, 100)
  }

  private calculateScoringFactors(
    journey: UserJourney,
    activities: any[],
    categoryScores: any
  ): ScoringFactor[] {
    return [
      {
        factor: 'Session Duration',
        value: journey.total_duration_seconds,
        weight: 0.15,
        contribution: (journey.total_duration_seconds / 300) * 15,
        explanation: 'Time spent in demo session indicates interest level'
      },
      {
        factor: 'Feature Interactions',
        value: activities.filter(a => a.activity_type === 'feature_interaction').length,
        weight: 0.20,
        contribution: categoryScores.engagementScore * 0.20,
        explanation: 'Number of features explored shows product evaluation depth'
      },
      {
        factor: 'Signup Intent',
        value: activities.filter(a => a.activity_type === 'signup_clicked').length,
        weight: 0.25,
        contribution: categoryScores.intentScore * 0.25,
        explanation: 'Clicking signup buttons indicates purchase intent'
      },
      {
        factor: 'Business Fit',
        value: categoryScores.fitScore,
        weight: 0.20,
        contribution: categoryScores.fitScore * 0.20,
        explanation: 'Usage patterns indicate product-market fit'
      },
      {
        factor: 'Timing',
        value: categoryScores.timingScore,
        weight: 0.20,
        contribution: categoryScores.timingScore * 0.20,
        explanation: 'Recent and repeated engagement indicates active evaluation'
      }
    ]
  }

  private calculateTotalScore(factors: ScoringFactor[]): number {
    return Math.round(factors.reduce((sum, factor) => sum + factor.contribution, 0))
  }

  private calculateConversionProbability(
    totalScore: number,
    factors: ScoringFactor[]
  ): number {
    // Use logistic regression-like formula
    const x = (totalScore - 50) / 50 // Normalize around 50
    return Math.round((1 / (1 + Math.exp(-x))) * 100)
  }

  private determineSalesReadiness(
    totalScore: number,
    conversionProbability: number
  ): 'cold' | 'warm' | 'hot' | 'qualified' {
    if (totalScore >= 80 && conversionProbability >= 70) return 'qualified'
    if (totalScore >= 65 && conversionProbability >= 50) return 'hot'
    if (totalScore >= 45 && conversionProbability >= 30) return 'warm'
    return 'cold'
  }

  private generateRecommendedActions(
    factors: ScoringFactor[],
    salesReadiness: string,
    activities: any[]
  ): string[] {
    const actions: string[] = []

    if (salesReadiness === 'qualified') {
      actions.push('Contact immediately for demo call')
      actions.push('Send personalized proposal')
    } else if (salesReadiness === 'hot') {
      actions.push('Schedule follow-up demo')
      actions.push('Send case study relevant to their use case')
    } else if (salesReadiness === 'warm') {
      actions.push('Send nurturing email with additional resources')
      actions.push('Invite to upcoming webinar')
    } else {
      actions.push('Add to nurturing campaign')
      actions.push('Send educational content')
    }

    // Factor-specific recommendations
    const lowEngagementFactor = factors.find(f => f.factor === 'Feature Interactions' && f.value < 3)
    if (lowEngagementFactor) {
      actions.push('Send guided tour video')
    }

    return actions
  }

  private async storeLeadScore(leadScore: LeadScore): Promise<void> {
    await this.supabase
      .from('demo_lead_scores')
      .upsert({
        session_id: leadScore.session_id,
        total_score: leadScore.total_score,
        category_scores: leadScore.category_scores,
        scoring_factors: leadScore.scoring_factors,
        conversion_probability: leadScore.conversion_probability,
        recommended_actions: leadScore.recommended_actions,
        sales_readiness: leadScore.sales_readiness,
        last_calculated: leadScore.last_calculated
      })
  }

  private async storeFunnelAnalysis(funnel: ConversionFunnel): Promise<void> {
    await this.supabase
      .from('conversion_funnels')
      .upsert({
        id: funnel.id,
        name: funnel.name,
        business_scenario: funnel.business_scenario,
        steps: funnel.steps,
        overall_conversion_rate: funnel.overall_conversion_rate,
        total_sessions: funnel.total_sessions,
        bottlenecks: funnel.bottlenecks,
        optimization_opportunities: funnel.optimization_opportunities,
        created_at: funnel.created_at,
        updated_at: funnel.updated_at
      })
  }

  private async getSessionActivities(sessionId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('demo_session_activities')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })

    return error ? [] : data || []
  }

  private calculateAverageTimeSpent(sessions: any[], step: any): number {
    // Calculate average time spent on this step
    const stepDurations = sessions
      .map(session => {
        const stepActivity = session.demo_session_activities?.find((activity: any) =>
          activity.page_path === step.page_path
        )
        return stepActivity?.duration_seconds || 0
      })
      .filter(duration => duration > 0)

    return stepDurations.length > 0
      ? stepDurations.reduce((sum, duration) => sum + duration, 0) / stepDurations.length
      : 0
  }

  private calculateImprovementPotential(conversionRate: number, dropOffRate: number): number {
    // Higher drop-off rate means higher improvement potential
    const dropOffPotential = dropOffRate * 0.6
    // Lower conversion rate means higher improvement potential
    const conversionPotential = (100 - conversionRate) * 0.4
    return Math.round(dropOffPotential + conversionPotential)
  }

  private getSuggestedImprovements(step: ConversionStep): string[] {
    const improvements: string[] = []

    if (step.drop_off_rate > 70) {
      improvements.push('Simplify the step - reduce cognitive load')
      improvements.push('Add clear value proposition')
      improvements.push('Improve visual hierarchy')
    }

    if (step.average_time_spent > 120) {
      improvements.push('Reduce time required to complete action')
      improvements.push('Add progress indicators')
      improvements.push('Provide clearer instructions')
    }

    if (step.name.includes('Signup')) {
      improvements.push('Reduce form fields')
      improvements.push('Add social proof')
      improvements.push('Clarify value proposition')
    }

    return improvements
  }

  private estimateImprovement(step: ConversionStep): number {
    // Estimate potential improvement based on step characteristics
    const baseImprovement = step.drop_off_rate * 0.3 // Conservative 30% of drop-off could be recovered
    const confidenceMultiplier = step.entry_count > 100 ? 1 : 0.7 // Lower confidence with smaller sample
    return Math.round(baseImprovement * confidenceMultiplier)
  }

  private calculatePriority(step: ConversionStep): number {
    // Priority = Impact * Confidence
    const impact = step.drop_off_rate * step.entry_count / 100
    const confidence = step.entry_count > 50 ? 1 : step.entry_count / 50
    return Math.round(impact * confidence)
  }

  private async createOpportunityFromBottleneck(
    bottleneck: Bottleneck,
    scenario: BusinessScenario
  ): Promise<OptimizationOpportunity> {
    const abTestSuggestions = [
      {
        test_name: `Improve ${bottleneck.step_name} Conversion`,
        hypothesis: `Implementing suggested improvements will reduce drop-off rate by ${bottleneck.estimated_improvement}%`,
        variants: [
          {
            name: 'Control',
            description: 'Current version',
            changes: [],
            expected_impact: 0
          },
          {
            name: 'Optimized',
            description: 'Improved version with suggested changes',
            changes: bottleneck.suggested_improvements.map(improvement => ({
              element: bottleneck.step_name,
              property: 'implementation',
              current_value: 'current',
              new_value: improvement,
              rationale: `Reduce drop-off at ${bottleneck.step_name}`
            })),
            expected_impact: bottleneck.estimated_improvement
          }
        ],
        primary_metric: 'conversion_rate',
        expected_improvement: bottleneck.estimated_improvement,
        estimated_duration_days: 14,
        traffic_allocation: 100
      }
    ]

    return {
      id: uuidv4(),
      type: 'flow_optimization',
      title: `Optimize ${bottleneck.step_name}`,
      description: `Address ${bottleneck.severity} bottleneck with ${bottleneck.drop_off_rate.toFixed(1)}% drop-off rate`,
      impact_level: bottleneck.severity === 'critical' ? 'high' : bottleneck.severity === 'high' ? 'high' : 'medium',
      effort_level: 'medium',
      roi_score: this.calculateROIScore(bottleneck.estimated_improvement, 'medium'),
      affected_steps: [bottleneck.step_id],
      success_metrics: ['conversion_rate', 'drop_off_rate', 'time_to_complete'],
      implementation_details: bottleneck.suggested_improvements,
      ab_test_suggestions: abTestSuggestions,
      created_at: new Date().toISOString()
    }
  }

  private async generateGeneralOpportunities(
    steps: ConversionStep[],
    scenario: BusinessScenario
  ): Promise<OptimizationOpportunity[]> {
    // This would generate additional opportunities based on best practices
    // For now, return empty array
    return []
  }

  private calculateROIScore(improvement: number, effort: string): number {
    const effortMultiplier = effort === 'low' ? 3 : effort === 'medium' ? 2 : 1
    return Math.round(improvement * effortMultiplier)
  }

  private createTestSuggestionFromOpportunity(opportunity: OptimizationOpportunity): ABTestSuggestion {
    return opportunity.ab_test_suggestions[0] // Return the first suggestion for simplicity
  }

  // Additional methods for segmentation, personalization, and insights would go here
  private async getAllSessionsForSegmentation(scenario?: BusinessScenario, timeRange?: any): Promise<any[]> {
    // Implementation would fetch all relevant sessions
    return []
  }

  private getSegmentationCriteria(): SegmentCriteria[] {
    // Return predefined segmentation criteria
    return []
  }

  private async createSegment(criteria: SegmentCriteria, sessions: any[]): Promise<ConversionSegment> {
    // Implementation would create segments based on criteria
    return {} as ConversionSegment
  }

  private async storeConversionSegments(segments: ConversionSegment[]): Promise<void> {
    // Implementation would store segments
  }

  private async getConversionSegment(segmentId: string): Promise<ConversionSegment | null> {
    // Implementation would retrieve segment
    return null
  }

  private async createEngagementBoostRule(segment: ConversionSegment): Promise<PersonalizationRule> {
    // Implementation would create engagement boosting rule
    return {} as PersonalizationRule
  }

  private async createConversionBoostRule(segment: ConversionSegment): Promise<PersonalizationRule> {
    // Implementation would create conversion boosting rule
    return {} as PersonalizationRule
  }

  private async createFeatureHighlightRule(segment: ConversionSegment, feature: string): Promise<PersonalizationRule> {
    // Implementation would create feature highlighting rule
    return {} as PersonalizationRule
  }

  private async storePersonalizationRules(rules: PersonalizationRule[]): Promise<void> {
    // Implementation would store personalization rules
  }

  private async analyzeConversionTrends(scenario?: BusinessScenario, timeRange?: any): Promise<OptimizationInsight[]> {
    // Implementation would analyze conversion trends
    return []
  }

  private async detectFunnelAnomalies(scenario?: BusinessScenario, timeRange?: any): Promise<OptimizationInsight[]> {
    // Implementation would detect funnel anomalies
    return []
  }

  private async detectOptimizationOpportunities(scenario?: BusinessScenario, timeRange?: any): Promise<OptimizationInsight[]> {
    // Implementation would detect optimization opportunities
    return []
  }

  private async checkPerformanceAlerts(scenario?: BusinessScenario, timeRange?: any): Promise<OptimizationInsight[]> {
    // Implementation would check performance alerts
    return []
  }

  private async storeOptimizationInsights(insights: OptimizationInsight[]): Promise<void> {
    // Implementation would store insights
  }
}

/**
 * Conversion Optimization Utilities
 */
export const ConversionOptimizationUtils = {
  /**
   * Format lead score for display
   */
  formatLeadScore(score: LeadScore): {
    scoreDisplay: string
    readinessColor: string
    topFactors: string[]
  } {
    const scoreDisplay = `${score.total_score}/100 (${score.conversion_probability}% likely to convert)`

    const readinessColors = {
      qualified: 'green',
      hot: 'orange',
      warm: 'yellow',
      cold: 'gray'
    }

    const readinessColor = readinessColors[score.sales_readiness]

    const topFactors = score.scoring_factors
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 3)
      .map(f => f.factor)

    return { scoreDisplay, readinessColor, topFactors }
  },

  /**
   * Calculate funnel efficiency
   */
  calculateFunnelEfficiency(funnel: ConversionFunnel): {
    efficiency: number
    worstStep: string
    improvementPotential: number
  } {
    const steps = funnel.steps
    const efficiency = steps.reduce((sum, step) => sum + step.conversion_rate, 0) / steps.length

    const worstStep = steps.reduce((worst, current) =>
      current.conversion_rate < worst.conversion_rate ? current : worst
    ).name

    const improvementPotential = steps.reduce((sum, step) => sum + step.improvement_potential, 0) / steps.length

    return { efficiency, worstStep, improvementPotential }
  },

  /**
   * Prioritize optimization opportunities
   */
  prioritizeOpportunities(opportunities: OptimizationOpportunity[]): OptimizationOpportunity[] {
    return opportunities.sort((a, b) => {
      // Sort by ROI score, then by impact level
      if (b.roi_score !== a.roi_score) {
        return b.roi_score - a.roi_score
      }

      const impactWeights = { high: 3, medium: 2, low: 1 }
      return impactWeights[b.impact_level] - impactWeights[a.impact_level]
    })
  },

  /**
   * Generate optimization summary
   */
  generateOptimizationSummary(
    funnel: ConversionFunnel,
    leadScores: LeadScore[],
    opportunities: OptimizationOpportunity[]
  ): {
    conversionRate: number
    averageLeadScore: number
    topOpportunity: string
    potentialImprovement: number
  } {
    const conversionRate = funnel.overall_conversion_rate
    const averageLeadScore = leadScores.reduce((sum, score) => sum + score.total_score, 0) / leadScores.length
    const topOpportunity = opportunities.length > 0 ? opportunities[0].title : 'No opportunities found'
    const potentialImprovement = opportunities.reduce((sum, opp) => sum + (opp.ab_test_suggestions[0]?.expected_improvement || 0), 0)

    return {
      conversionRate,
      averageLeadScore,
      topOpportunity,
      potentialImprovement
    }
  }
}