// @ts-nocheck - Type definitions need review
import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { DemoSession, DemoEvent, BusinessScenario } from '@/types/demo'
import { Database } from '@/types/database'

type SupabaseClient = ReturnType<typeof createClient<Database>>

// Advanced Analytics Types
export interface HeatMapData {
  element_id: string
  page_path: string
  x_position: number
  y_position: number
  click_count: number
  hover_duration_seconds: number
  element_type: string
  element_text?: string
  viewport_width: number
  viewport_height: number
  timestamp: string
}

export interface UserJourney {
  session_id: string
  journey_id: string
  steps: UserJourneyStep[]
  total_duration_seconds: number
  conversion_completed: boolean
  drop_off_point?: string
  engagement_score: number
  created_at: string
}

export interface UserJourneyStep {
  step_id: string
  page_path: string
  action_type: string
  timestamp: string
  duration_seconds: number
  success: boolean
  metadata?: Record<string, any>
}

export interface DropOffAnalysis {
  page_path: string
  step_name: string
  total_visitors: number
  dropped_off: number
  drop_off_rate: number
  next_actions: { action: string; count: number }[]
  common_exit_points: string[]
  improvement_suggestions: string[]
}

export interface FeatureEngagement {
  feature_name: string
  total_interactions: number
  unique_users: number
  average_time_spent: number
  completion_rate: number
  popular_paths: string[]
  engagement_score: number
  correlation_with_conversion: number
}

export interface PredictiveModel {
  model_id: string
  model_type: 'conversion_probability' | 'engagement_score' | 'churn_risk'
  features: string[]
  accuracy: number
  last_trained: string
  predictions: PredictiveScore[]
}

export interface PredictiveScore {
  session_id: string
  score: number
  confidence: number
  factors: { factor: string; weight: number }[]
  timestamp: string
}

export interface ConversionFunnel {
  funnel_id: string
  name: string
  steps: FunnelStep[]
  business_scenario: BusinessScenario
  conversion_rate: number
  average_time_to_convert: number
  bottlenecks: string[]
}

export interface FunnelStep {
  step_id: string
  name: string
  order: number
  total_entries: number
  completions: number
  conversion_rate: number
  average_time_seconds: number
  drop_off_reasons: string[]
}

export interface RealTimeMetrics {
  active_sessions: number
  current_conversions: number
  live_interactions: LiveInteraction[]
  trending_features: string[]
  alert_conditions: AlertCondition[]
  performance_indicators: PerformanceIndicator[]
}

export interface LiveInteraction {
  session_id: string
  page_path: string
  action: string
  timestamp: string
  user_agent: string
  country?: string
}

export interface AlertCondition {
  condition_id: string
  type: 'drop_off_spike' | 'conversion_drop' | 'error_increase' | 'performance_issue'
  threshold: number
  current_value: number
  triggered: boolean
  message: string
}

export interface PerformanceIndicator {
  metric: string
  current_value: number
  target_value: number
  trend: 'improving' | 'stable' | 'declining'
  change_percentage: number
}

/**
 * Advanced Demo Analytics System
 * Provides comprehensive tracking, analysis, and predictive capabilities
 */
export class AdvancedDemoAnalytics {
  private supabase: SupabaseClient
  private realTimeSubscriptions: Map<string, any> = new Map()

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  /**
   * Track detailed user interactions with heat mapping data
   */
  async trackHeatMapInteraction(
    sessionId: string,
    elementId: string,
    pagePath: string,
    position: { x: number; y: number },
    interactionType: 'click' | 'hover' | 'scroll',
    duration?: number,
    elementData?: {
      type: string
      text?: string
      tagName?: string
      className?: string
    },
    viewportSize?: { width: number; height: number }
  ): Promise<string | null> {
    try {
      const heatMapData: HeatMapData = {
        element_id: elementId,
        page_path: pagePath,
        x_position: position.x,
        y_position: position.y,
        click_count: interactionType === 'click' ? 1 : 0,
        hover_duration_seconds: interactionType === 'hover' ? (duration || 0) : 0,
        element_type: elementData?.type || 'unknown',
        element_text: elementData?.text,
        viewport_width: viewportSize?.width || 1920,
        viewport_height: viewportSize?.height || 1080,
        timestamp: new Date().toISOString()
      }

      const { data, error } = await this.supabase
        .from('demo_heatmap_data')
        .insert({
          session_id: sessionId,
          ...heatMapData,
          interaction_type: interactionType,
          element_metadata: elementData || {}
        })
        .select()
        .single()

      if (error) throw error

      return data.id
    } catch (error) {
      console.error('Error tracking heat map interaction:', error)
      return null
    }
  }

  /**
   * Build comprehensive user journey from session events
   */
  async buildUserJourney(sessionId: string): Promise<UserJourney | null> {
    try {
      // Get all events for the session
      const { data: events, error } = await this.supabase
        .from('demo_session_activities')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error
      if (!events || events.length === 0) return null

      const steps: UserJourneyStep[] = events.map((event, index) => ({
        step_id: event.id,
        page_path: event.page_path || '',
        action_type: event.activity_type,
        timestamp: event.created_at,
        duration_seconds: event.duration_seconds || 0,
        success: this.isSuccessfulAction(event.activity_type),
        metadata: event.activity_data || {}
      }))

      const totalDuration = this.calculateTotalDuration(steps)
      const conversionCompleted = this.checkConversionCompletion(events)
      const dropOffPoint = this.identifyDropOffPoint(steps)
      const engagementScore = this.calculateEngagementScore(steps, totalDuration)

      const journey: UserJourney = {
        session_id: sessionId,
        journey_id: uuidv4(),
        steps,
        total_duration_seconds: totalDuration,
        conversion_completed: conversionCompleted,
        drop_off_point: dropOffPoint,
        engagement_score: engagementScore,
        created_at: new Date().toISOString()
      }

      // Store the journey for future analysis
      await this.storeUserJourney(journey)

      return journey
    } catch (error) {
      console.error('Error building user journey:', error)
      return null
    }
  }

  /**
   * Analyze drop-off points across all demo sessions
   */
  async analyzeDropOffPoints(
    businessScenario?: BusinessScenario,
    timeRange?: { start: string; end: string }
  ): Promise<DropOffAnalysis[]> {
    try {
      let query = this.supabase
        .from('demo_session_activities')
        .select(`
          *,
          demo_sessions!inner(business_scenario, status)
        `)

      if (businessScenario) {
        query = query.eq('demo_sessions.business_scenario', businessScenario)
      }

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start)
          .lte('created_at', timeRange.end)
      }

      const { data: activities, error } = await query

      if (error) throw error

      // Group by page and analyze patterns
      const pageGroups = this.groupActivitiesByPage(activities || [])
      const dropOffAnalysis: DropOffAnalysis[] = []

      for (const [pagePath, pageActivities] of Object.entries(pageGroups)) {
        const analysis = await this.analyzePageDropOff(pagePath, pageActivities)
        dropOffAnalysis.push(analysis)
      }

      return dropOffAnalysis.sort((a, b) => b.drop_off_rate - a.drop_off_rate)
    } catch (error) {
      console.error('Error analyzing drop-off points:', error)
      return []
    }
  }

  /**
   * Calculate feature engagement scores
   */
  async calculateFeatureEngagement(
    businessScenario?: BusinessScenario,
    timeRange?: { start: string; end: string }
  ): Promise<FeatureEngagement[]> {
    try {
      let query = this.supabase
        .from('demo_session_activities')
        .select(`
          *,
          demo_sessions!inner(business_scenario, status)
        `)
        .eq('activity_type', 'feature_interaction')

      if (businessScenario) {
        query = query.eq('demo_sessions.business_scenario', businessScenario)
      }

      if (timeRange) {
        query = query
          .gte('created_at', timeRange.start)
          .lte('created_at', timeRange.end)
      }

      const { data: featureActivities, error } = await query

      if (error) throw error

      // Group by feature and calculate metrics
      const featureGroups = this.groupActivitiesByFeature(featureActivities || [])
      const engagementScores: FeatureEngagement[] = []

      for (const [featureName, activities] of Object.entries(featureGroups)) {
        const engagement = await this.calculateFeatureMetrics(featureName, activities)
        engagementScores.push(engagement)
      }

      return engagementScores.sort((a, b) => b.engagement_score - a.engagement_score)
    } catch (error) {
      console.error('Error calculating feature engagement:', error)
      return []
    }
  }

  /**
   * Generate predictive conversion scores using ML models
   */
  async generatePredictiveScores(sessionId: string): Promise<PredictiveScore[]> {
    try {
      // Get session data and behavior patterns
      const sessionData = await this.getSessionAnalyticsData(sessionId)
      if (!sessionData) return []

      const scores: PredictiveScore[] = []

      // Conversion Probability Model
      const conversionScore = await this.predictConversionProbability(sessionData)
      scores.push(conversionScore)

      // Engagement Score Model
      const engagementScore = await this.predictEngagementScore(sessionData)
      scores.push(engagementScore)

      // Churn Risk Model
      const churnScore = await this.predictChurnRisk(sessionData)
      scores.push(churnScore)

      // Store predictions for tracking accuracy
      await this.storePredictiveScores(sessionId, scores)

      return scores
    } catch (error) {
      console.error('Error generating predictive scores:', error)
      return []
    }
  }

  /**
   * Get real-time metrics and alerts
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const [
        activeSessions,
        currentConversions,
        liveInteractions,
        trendingFeatures,
        alerts,
        performanceIndicators
      ] = await Promise.all([
        this.getActiveSessionsCount(),
        this.getCurrentConversions(),
        this.getLiveInteractions(),
        this.getTrendingFeatures(),
        this.checkAlertConditions(),
        this.getPerformanceIndicators()
      ])

      return {
        active_sessions: activeSessions,
        current_conversions: currentConversions,
        live_interactions: liveInteractions,
        trending_features: trendingFeatures,
        alert_conditions: alerts,
        performance_indicators: performanceIndicators
      }
    } catch (error) {
      console.error('Error getting real-time metrics:', error)
      return {
        active_sessions: 0,
        current_conversions: 0,
        live_interactions: [],
        trending_features: [],
        alert_conditions: [],
        performance_indicators: []
      }
    }
  }

  /**
   * Start real-time monitoring with WebSocket subscriptions
   */
  async startRealTimeMonitoring(
    callback: (metrics: RealTimeMetrics) => void,
    interval: number = 5000
  ): Promise<string> {
    const monitoringId = uuidv4()

    // Set up real-time subscription for session activities
    const subscription = this.supabase
      .channel('demo_analytics')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'demo_session_activities'
        },
        async () => {
          const metrics = await this.getRealTimeMetrics()
          callback(metrics)
        }
      )
      .subscribe()

    this.realTimeSubscriptions.set(monitoringId, subscription)

    // Also set up periodic updates
    const intervalId = setInterval(async () => {
      const metrics = await this.getRealTimeMetrics()
      callback(metrics)
    }, interval)

    // Store interval ID for cleanup
    this.realTimeSubscriptions.set(`${monitoringId}_interval`, intervalId)

    return monitoringId
  }

  /**
   * Stop real-time monitoring
   */
  async stopRealTimeMonitoring(monitoringId: string): Promise<void> {
    const subscription = this.realTimeSubscriptions.get(monitoringId)
    const intervalId = this.realTimeSubscriptions.get(`${monitoringId}_interval`)

    if (subscription) {
      await this.supabase.removeChannel(subscription)
      this.realTimeSubscriptions.delete(monitoringId)
    }

    if (intervalId) {
      clearInterval(intervalId)
      this.realTimeSubscriptions.delete(`${monitoringId}_interval`)
    }
  }

  // Private helper methods

  private isSuccessfulAction(actionType: string): boolean {
    const successActions = [
      'message_sent',
      'contact_viewed',
      'conversation_opened',
      'template_used',
      'automation_triggered',
      'signup_clicked'
    ]
    return successActions.includes(actionType)
  }

  private calculateTotalDuration(steps: UserJourneyStep[]): number {
    if (steps.length === 0) return 0
    return steps.reduce((total, step) => total + step.duration_seconds, 0)
  }

  private checkConversionCompletion(events: any[]): boolean {
    return events.some(event =>
      event.activity_type === 'signup_clicked' ||
      event.activity_type === 'conversion'
    )
  }

  private identifyDropOffPoint(steps: UserJourneyStep[]): string | undefined {
    // Find the last unsuccessful step or the step before the user left
    for (let i = steps.length - 1; i >= 0; i--) {
      if (!steps[i].success) {
        return steps[i].page_path
      }
    }
    return undefined
  }

  private calculateEngagementScore(
    steps: UserJourneyStep[],
    totalDuration: number
  ): number {
    if (steps.length === 0) return 0

    const interactionScore = Math.min(steps.length * 10, 100)
    const timeScore = Math.min(totalDuration / 60 * 5, 100) // 5 points per minute, max 100
    const successScore = steps.filter(s => s.success).length / steps.length * 100

    return Math.round((interactionScore + timeScore + successScore) / 3)
  }

  private async storeUserJourney(journey: UserJourney): Promise<void> {
    try {
      await this.supabase
        .from('demo_user_journeys')
        .insert({
          session_id: journey.session_id,
          journey_id: journey.journey_id,
          steps: journey.steps,
          total_duration_seconds: journey.total_duration_seconds,
          conversion_completed: journey.conversion_completed,
          drop_off_point: journey.drop_off_point,
          engagement_score: journey.engagement_score
        })
    } catch (error) {
      console.error('Error storing user journey:', error)
    }
  }

  private groupActivitiesByPage(activities: any[]): Record<string, any[]> {
    return activities.reduce((groups, activity) => {
      const page = activity.page_path || 'unknown'
      if (!groups[page]) groups[page] = []
      groups[page].push(activity)
      return groups
    }, {})
  }

  private async analyzePageDropOff(
    pagePath: string,
    activities: any[]
  ): Promise<DropOffAnalysis> {
    const totalVisitors = new Set(activities.map(a => a.session_id)).size
    const sessionsWithNextAction = new Set()
    const nextActions: Record<string, number> = {}

    // Analyze what users did after visiting this page
    for (const activity of activities) {
      // Check if there are subsequent activities
      const hasNext = activities.some(a =>
        a.session_id === activity.session_id &&
        new Date(a.created_at) > new Date(activity.created_at)
      )

      if (hasNext) {
        sessionsWithNextAction.add(activity.session_id)
        // Count next actions
        const nextActivity = activities.find(a =>
          a.session_id === activity.session_id &&
          new Date(a.created_at) > new Date(activity.created_at)
        )
        if (nextActivity) {
          nextActions[nextActivity.activity_type] = (nextActions[nextActivity.activity_type] || 0) + 1
        }
      }
    }

    const droppedOff = totalVisitors - sessionsWithNextAction.size
    const dropOffRate = totalVisitors > 0 ? (droppedOff / totalVisitors) * 100 : 0

    return {
      page_path: pagePath,
      step_name: this.getStepNameFromPath(pagePath),
      total_visitors: totalVisitors,
      dropped_off: droppedOff,
      drop_off_rate: dropOffRate,
      next_actions: Object.entries(nextActions).map(([action, count]) => ({ action, count })),
      common_exit_points: this.identifyCommonExitPoints(activities),
      improvement_suggestions: this.generateImprovementSuggestions(pagePath, dropOffRate)
    }
  }

  private groupActivitiesByFeature(activities: any[]): Record<string, any[]> {
    return activities.reduce((groups, activity) => {
      const feature = activity.activity_data?.feature || 'unknown'
      if (!groups[feature]) groups[feature] = []
      groups[feature].push(activity)
      return groups
    }, {})
  }

  private async calculateFeatureMetrics(
    featureName: string,
    activities: any[]
  ): Promise<FeatureEngagement> {
    const totalInteractions = activities.length
    const uniqueUsers = new Set(activities.map(a => a.session_id)).size
    const averageTimeSpent = activities.reduce((sum, a) => sum + (a.duration_seconds || 0), 0) / activities.length

    // Calculate completion rate based on successful interactions
    const completedInteractions = activities.filter(a =>
      a.activity_data?.completed === true ||
      a.activity_data?.success === true
    ).length
    const completionRate = totalInteractions > 0 ? (completedInteractions / totalInteractions) * 100 : 0

    // Analyze popular paths to this feature
    const popularPaths = this.extractPopularPaths(activities)

    // Calculate engagement score
    const engagementScore = this.calculateFeatureEngagementScore(
      totalInteractions,
      uniqueUsers,
      averageTimeSpent,
      completionRate
    )

    // Calculate correlation with conversion
    const correlationWithConversion = await this.calculateConversionCorrelation(featureName, activities)

    return {
      feature_name: featureName,
      total_interactions: totalInteractions,
      unique_users: uniqueUsers,
      average_time_spent: averageTimeSpent,
      completion_rate: completionRate,
      popular_paths: popularPaths,
      engagement_score: engagementScore,
      correlation_with_conversion: correlationWithConversion
    }
  }

  private async getSessionAnalyticsData(sessionId: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('demo_session_activities')
      .select('*')
      .eq('session_id', sessionId)

    return error ? null : data
  }

  private async predictConversionProbability(sessionData: any[]): Promise<PredictiveScore> {
    // Simple ML model based on engagement patterns
    const features = this.extractConversionFeatures(sessionData)
    const score = this.calculateConversionScore(features)

    return {
      session_id: sessionData[0]?.session_id || '',
      score: score,
      confidence: this.calculateConfidence(features),
      factors: this.identifyKeyFactors(features),
      timestamp: new Date().toISOString()
    }
  }

  private async predictEngagementScore(sessionData: any[]): Promise<PredictiveScore> {
    const features = this.extractEngagementFeatures(sessionData)
    const score = this.calculateEngagementPredictionScore(features)

    return {
      session_id: sessionData[0]?.session_id || '',
      score: score,
      confidence: this.calculateConfidence(features),
      factors: this.identifyEngagementFactors(features),
      timestamp: new Date().toISOString()
    }
  }

  private async predictChurnRisk(sessionData: any[]): Promise<PredictiveScore> {
    const features = this.extractChurnFeatures(sessionData)
    const score = this.calculateChurnScore(features)

    return {
      session_id: sessionData[0]?.session_id || '',
      score: score,
      confidence: this.calculateConfidence(features),
      factors: this.identifyChurnFactors(features),
      timestamp: new Date().toISOString()
    }
  }

  private async storePredictiveScores(sessionId: string, scores: PredictiveScore[]): Promise<void> {
    try {
      for (const score of scores) {
        await this.supabase
          .from('demo_predictive_scores')
          .insert({
            session_id: sessionId,
            model_type: this.getModelType(score),
            score: score.score,
            confidence: score.confidence,
            factors: score.factors,
            timestamp: score.timestamp
          })
      }
    } catch (error) {
      console.error('Error storing predictive scores:', error)
    }
  }

  private async getActiveSessionsCount(): Promise<number> {
    const { count, error } = await this.supabase
      .from('demo_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())

    return error ? 0 : count || 0
  }

  private async getCurrentConversions(): Promise<number> {
    const { count, error } = await this.supabase
      .from('demo_session_activities')
      .select('*', { count: 'exact', head: true })
      .eq('activity_type', 'signup_clicked')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    return error ? 0 : count || 0
  }

  private async getLiveInteractions(): Promise<LiveInteraction[]> {
    const { data, error } = await this.supabase
      .from('demo_session_activities')
      .select(`
        session_id,
        page_path,
        activity_type,
        created_at,
        demo_sessions(user_agent)
      `)
      .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) return []

    return (data || []).map(item => ({
      session_id: item.session_id,
      page_path: item.page_path || '',
      action: item.activity_type,
      timestamp: item.created_at,
      user_agent: (item.demo_sessions as any)?.user_agent || ''
    }))
  }

  private async getTrendingFeatures(): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('demo_session_activities')
      .select('activity_data')
      .eq('activity_type', 'feature_interaction')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if (error) return []

    const featureCounts: Record<string, number> = {}
    data?.forEach(item => {
      const feature = item.activity_data?.feature
      if (feature) {
        featureCounts[feature] = (featureCounts[feature] || 0) + 1
      }
    })

    return Object.entries(featureCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([feature]) => feature)
  }

  private async checkAlertConditions(): Promise<AlertCondition[]> {
    // Implementation for checking various alert conditions
    return []
  }

  private async getPerformanceIndicators(): Promise<PerformanceIndicator[]> {
    // Implementation for calculating performance indicators
    return []
  }

  // Additional helper methods for ML calculations
  private extractConversionFeatures(sessionData: any[]): Record<string, number> {
    return {
      pageViews: sessionData.filter(d => d.activity_type === 'page_view').length,
      interactions: sessionData.filter(d => d.activity_type === 'feature_interaction').length,
      timeSpent: sessionData.reduce((sum, d) => sum + (d.duration_seconds || 0), 0),
      signupClicks: sessionData.filter(d => d.activity_type === 'signup_clicked').length
    }
  }

  private calculateConversionScore(features: Record<string, number>): number {
    // Simple scoring algorithm - replace with actual ML model
    let score = 0
    score += Math.min(features.pageViews * 10, 40)
    score += Math.min(features.interactions * 15, 30)
    score += Math.min(features.timeSpent / 60 * 20, 20)
    score += features.signupClicks * 10
    return Math.min(score, 100)
  }

  private calculateConfidence(features: Record<string, number>): number {
    // Calculate confidence based on data quality and quantity
    const dataPoints = Object.values(features).reduce((sum, val) => sum + (val > 0 ? 1 : 0), 0)
    return Math.min(dataPoints * 20, 100)
  }

  private identifyKeyFactors(features: Record<string, number>): { factor: string; weight: number }[] {
    return Object.entries(features)
      .map(([factor, value]) => ({ factor, weight: value / 100 }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
  }

  private extractEngagementFeatures(sessionData: any[]): Record<string, number> {
    return {
      sessionLength: sessionData.length,
      uniquePages: new Set(sessionData.map(d => d.page_path)).size,
      repeatActions: sessionData.length - new Set(sessionData.map(d => d.activity_type)).size
    }
  }

  private calculateEngagementPredictionScore(features: Record<string, number>): number {
    let score = 0
    score += Math.min(features.sessionLength * 5, 40)
    score += Math.min(features.uniquePages * 20, 40)
    score += Math.min(features.repeatActions * 10, 20)
    return Math.min(score, 100)
  }

  private identifyEngagementFactors(features: Record<string, number>): { factor: string; weight: number }[] {
    return Object.entries(features)
      .map(([factor, value]) => ({ factor, weight: value / 100 }))
      .sort((a, b) => b.weight - a.weight)
  }

  private extractChurnFeatures(sessionData: any[]): Record<string, number> {
    const now = new Date()
    const lastActivity = sessionData.length > 0 ? new Date(sessionData[sessionData.length - 1].created_at) : now
    const timeSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60) // minutes

    return {
      timeSinceLastActivity,
      errorCount: sessionData.filter(d => d.activity_type === 'error').length,
      incompleteActions: sessionData.filter(d => d.activity_data?.completed === false).length
    }
  }

  private calculateChurnScore(features: Record<string, number>): number {
    let score = 0
    score += Math.min(features.timeSinceLastActivity * 2, 50)
    score += features.errorCount * 20
    score += features.incompleteActions * 10
    return Math.min(score, 100)
  }

  private identifyChurnFactors(features: Record<string, number>): { factor: string; weight: number }[] {
    return Object.entries(features)
      .map(([factor, value]) => ({ factor, weight: value / 100 }))
      .sort((a, b) => b.weight - a.weight)
  }

  private getModelType(score: PredictiveScore): string {
    // Determine model type based on factors
    if (score.factors.some(f => f.factor.includes('conversion'))) return 'conversion_probability'
    if (score.factors.some(f => f.factor.includes('engagement'))) return 'engagement_score'
    return 'churn_risk'
  }

  private getStepNameFromPath(pagePath: string): string {
    const pathMapping: Record<string, string> = {
      '/dashboard': 'Dashboard Overview',
      '/inbox': 'Inbox Management',
      '/contacts': 'Contact Management',
      '/analytics': 'Analytics View',
      '/settings': 'Settings Configuration'
    }
    return pathMapping[pagePath] || 'Unknown Step'
  }

  private identifyCommonExitPoints(activities: any[]): string[] {
    // Identify where users commonly exit
    const exitPoints: Record<string, number> = {}

    activities.forEach(activity => {
      if (activity.activity_type === 'page_view') {
        exitPoints[activity.page_path] = (exitPoints[activity.page_path] || 0) + 1
      }
    })

    return Object.entries(exitPoints)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([path]) => path)
  }

  private generateImprovementSuggestions(pagePath: string, dropOffRate: number): string[] {
    const suggestions: string[] = []

    if (dropOffRate > 50) {
      suggestions.push('High drop-off rate detected - consider simplifying this step')
      suggestions.push('Add progress indicators to show users how far they have progressed')
    }

    if (pagePath.includes('signup')) {
      suggestions.push('Reduce form fields to minimize friction')
      suggestions.push('Add social proof or testimonials')
    }

    if (pagePath.includes('dashboard')) {
      suggestions.push('Improve onboarding with guided tour')
      suggestions.push('Highlight key features more prominently')
    }

    return suggestions
  }

  private extractPopularPaths(activities: any[]): string[] {
    const pathCounts: Record<string, number> = {}

    activities.forEach(activity => {
      const path = activity.page_path || 'unknown'
      pathCounts[path] = (pathCounts[path] || 0) + 1
    })

    return Object.entries(pathCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([path]) => path)
  }

  private calculateFeatureEngagementScore(
    totalInteractions: number,
    uniqueUsers: number,
    averageTimeSpent: number,
    completionRate: number
  ): number {
    const interactionScore = Math.min(totalInteractions / 10 * 25, 25)
    const userScore = Math.min(uniqueUsers / 5 * 25, 25)
    const timeScore = Math.min(averageTimeSpent / 30 * 25, 25)
    const completionScore = completionRate / 100 * 25

    return Math.round(interactionScore + userScore + timeScore + completionScore)
  }

  private async calculateConversionCorrelation(
    featureName: string,
    activities: any[]
  ): Promise<number> {
    // Calculate how much this feature correlates with conversions
    const sessionsWithFeature = new Set(activities.map(a => a.session_id))

    const { data: conversions, error } = await this.supabase
      .from('demo_session_activities')
      .select('session_id')
      .eq('activity_type', 'signup_clicked')
      .in('session_id', Array.from(sessionsWithFeature))

    if (error) return 0

    const conversionRate = conversions?.length / sessionsWithFeature.size || 0
    return Math.round(conversionRate * 100)
  }
}

/**
 * Demo Analytics Utilities
 */
export const DemoAnalyticsUtils = {
  /**
   * Format engagement score for display
   */
  formatEngagementScore(score: number): string {
    if (score >= 80) return 'High'
    if (score >= 60) return 'Medium'
    if (score >= 40) return 'Low'
    return 'Very Low'
  },

  /**
   * Get color for engagement score
   */
  getEngagementColor(score: number): string {
    if (score >= 80) return 'green'
    if (score >= 60) return 'yellow'
    if (score >= 40) return 'orange'
    return 'red'
  },

  /**
   * Format duration for display
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  },

  /**
   * Calculate conversion rate
   */
  calculateConversionRate(totalSessions: number, conversions: number): number {
    return totalSessions > 0 ? (conversions / totalSessions) * 100 : 0
  },

  /**
   * Generate analytics summary
   */
  generateAnalyticsSummary(journeys: UserJourney[]): {
    totalSessions: number
    averageEngagement: number
    conversionRate: number
    averageDuration: number
    topDropOffPoints: string[]
  } {
    const totalSessions = journeys.length
    const averageEngagement = journeys.reduce((sum, j) => sum + j.engagement_score, 0) / totalSessions
    const conversions = journeys.filter(j => j.conversion_completed).length
    const conversionRate = this.calculateConversionRate(totalSessions, conversions)
    const averageDuration = journeys.reduce((sum, j) => sum + j.total_duration_seconds, 0) / totalSessions

    const dropOffCounts: Record<string, number> = {}
    journeys.forEach(j => {
      if (j.drop_off_point) {
        dropOffCounts[j.drop_off_point] = (dropOffCounts[j.drop_off_point] || 0) + 1
      }
    })

    const topDropOffPoints = Object.entries(dropOffCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([point]) => point)

    return {
      totalSessions,
      averageEngagement: Math.round(averageEngagement),
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageDuration: Math.round(averageDuration),
      topDropOffPoints
    }
  }
}