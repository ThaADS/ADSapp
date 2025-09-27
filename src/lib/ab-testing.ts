import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { BusinessScenario } from '@/types/demo'
import { Database } from '@/types/database'

type SupabaseClient = ReturnType<typeof createClient<Database>>

// A/B Testing Types
export interface ABTest {
  id: string
  name: string
  description: string
  business_scenario: BusinessScenario
  status: ABTestStatus
  start_date: string
  end_date?: string
  traffic_allocation: number // Percentage of traffic to include in test
  variants: ABTestVariant[]
  metrics: ABTestMetric[]
  results?: ABTestResults
  statistical_significance?: StatisticalSignificance
  winner_variant_id?: string
  confidence_level: number
  minimum_sample_size: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface ABTestVariant {
  id: string
  name: string
  description: string
  traffic_split: number // Percentage of test traffic
  configuration: Record<string, any>
  is_control: boolean
  session_count: number
  conversion_count: number
  conversion_rate: number
  metrics_data: Record<string, number>
}

export interface ABTestMetric {
  name: string
  type: 'conversion' | 'engagement' | 'revenue' | 'time_spent' | 'custom'
  goal: 'increase' | 'decrease'
  primary: boolean
  weight: number
  baseline_value?: number
  target_improvement?: number
}

export interface ABTestResults {
  test_id: string
  total_sessions: number
  total_conversions: number
  overall_conversion_rate: number
  variant_results: VariantResult[]
  statistical_significance: StatisticalSignificance
  recommendations: string[]
  confidence_intervals: ConfidenceInterval[]
  effect_size: number
  generated_at: string
}

export interface VariantResult {
  variant_id: string
  variant_name: string
  sessions: number
  conversions: number
  conversion_rate: number
  confidence_interval: { lower: number; upper: number }
  statistical_significance: number
  improvement_over_control: number
  metrics_performance: Record<string, number>
}

export interface StatisticalSignificance {
  p_value: number
  confidence_level: number
  is_significant: boolean
  power: number
  effect_size: number
  sample_size_recommendation: number
  time_to_significance_days?: number
}

export interface ConfidenceInterval {
  metric: string
  variant_id: string
  lower_bound: number
  upper_bound: number
  confidence_level: number
}

export interface ABTestAssignment {
  session_id: string
  test_id: string
  variant_id: string
  assigned_at: string
  user_agent?: string
  ip_address?: string
  conversion_completed: boolean
  conversion_value?: number
  session_metrics: Record<string, number>
}

export interface BayesianTestResult {
  probability_of_beating_control: number
  expected_loss: number
  posterior_distribution: PosteriorDistribution
  credible_interval: { lower: number; upper: number }
  recommendation: 'deploy' | 'continue_testing' | 'stop_test'
}

export interface PosteriorDistribution {
  alpha: number
  beta: number
  mean: number
  variance: number
}

export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed' | 'cancelled'

export interface TestConfiguration {
  homepage_layout?: 'v1' | 'v2' | 'v3'
  cta_button_color?: string
  cta_button_text?: string
  signup_form_fields?: string[]
  onboarding_flow?: 'standard' | 'interactive' | 'minimal'
  pricing_display?: 'table' | 'cards' | 'list'
  demo_scenarios?: BusinessScenario[]
  feature_highlights?: string[]
  testimonial_placement?: 'top' | 'bottom' | 'sidebar' | 'none'
  trial_length_days?: number
}

/**
 * A/B Testing Framework for Demo Scenarios
 * Provides comprehensive testing capabilities with statistical analysis
 */
export class ABTestingFramework {
  private supabase: SupabaseClient
  private activeTests: Map<string, ABTest> = new Map()

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  /**
   * Create a new A/B test
   */
  async createTest(
    testConfig: {
      name: string
      description: string
      business_scenario: BusinessScenario
      variants: Omit<ABTestVariant, 'id' | 'session_count' | 'conversion_count' | 'conversion_rate' | 'metrics_data'>[]
      metrics: ABTestMetric[]
      traffic_allocation: number
      confidence_level: number
      minimum_sample_size: number
      estimated_duration_days?: number
    },
    createdBy: string
  ): Promise<{ test: ABTest; error?: string }> {
    try {
      // Validate test configuration
      const validation = this.validateTestConfiguration(testConfig)
      if (!validation.valid) {
        return { test: null as any, error: validation.error }
      }

      const testId = uuidv4()
      const now = new Date().toISOString()

      // Prepare variants with IDs
      const variants: ABTestVariant[] = testConfig.variants.map(variant => ({
        ...variant,
        id: uuidv4(),
        session_count: 0,
        conversion_count: 0,
        conversion_rate: 0,
        metrics_data: {}
      }))

      // Ensure traffic splits add up to 100%
      this.normalizeTrafficSplits(variants)

      const test: ABTest = {
        id: testId,
        name: testConfig.name,
        description: testConfig.description,
        business_scenario: testConfig.business_scenario,
        status: 'draft',
        start_date: now,
        traffic_allocation: testConfig.traffic_allocation,
        variants,
        metrics: testConfig.metrics,
        confidence_level: testConfig.confidence_level,
        minimum_sample_size: testConfig.minimum_sample_size,
        created_by: createdBy,
        created_at: now,
        updated_at: now
      }

      // Store test in database
      const { data, error } = await this.supabase
        .from('ab_tests')
        .insert({
          id: test.id,
          name: test.name,
          description: test.description,
          business_scenario: test.business_scenario,
          status: test.status,
          start_date: test.start_date,
          traffic_allocation: test.traffic_allocation,
          variants: test.variants,
          metrics: test.metrics,
          confidence_level: test.confidence_level,
          minimum_sample_size: test.minimum_sample_size,
          created_by: test.created_by
        })
        .select()
        .single()

      if (error) throw error

      return { test }
    } catch (error) {
      console.error('Error creating A/B test:', error)
      return {
        test: null as any,
        error: error instanceof Error ? error.message : 'Failed to create test'
      }
    }
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const test = await this.getTest(testId)
      if (!test) {
        return { success: false, error: 'Test not found' }
      }

      if (test.status !== 'draft') {
        return { success: false, error: 'Test can only be started from draft status' }
      }

      // Validate test is ready to start
      const readinessCheck = this.checkTestReadiness(test)
      if (!readinessCheck.ready) {
        return { success: false, error: readinessCheck.error }
      }

      // Update test status and start date
      const { error } = await this.supabase
        .from('ab_tests')
        .update({
          status: 'running',
          start_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', testId)

      if (error) throw error

      // Cache active test
      test.status = 'running'
      test.start_date = new Date().toISOString()
      this.activeTests.set(testId, test)

      return { success: true }
    } catch (error) {
      console.error('Error starting A/B test:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start test'
      }
    }
  }

  /**
   * Assign a session to an A/B test variant
   */
  async assignToTest(
    sessionId: string,
    businessScenario: BusinessScenario,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ assignment: ABTestAssignment | null; variant: ABTestVariant | null }> {
    try {
      // Get active tests for the business scenario
      const activeTests = await this.getActiveTestsForScenario(businessScenario)

      if (activeTests.length === 0) {
        return { assignment: null, variant: null }
      }

      // Select test based on traffic allocation
      const selectedTest = this.selectTestForSession(activeTests)
      if (!selectedTest) {
        return { assignment: null, variant: null }
      }

      // Assign to variant using deterministic hash
      const assignedVariant = this.assignToVariant(sessionId, selectedTest)

      // Create assignment record
      const assignment: ABTestAssignment = {
        session_id: sessionId,
        test_id: selectedTest.id,
        variant_id: assignedVariant.id,
        assigned_at: new Date().toISOString(),
        user_agent: userAgent,
        ip_address: ipAddress,
        conversion_completed: false,
        session_metrics: {}
      }

      // Store assignment
      await this.storeAssignment(assignment)

      // Update variant session count
      await this.incrementVariantSessions(selectedTest.id, assignedVariant.id)

      return { assignment, variant: assignedVariant }
    } catch (error) {
      console.error('Error assigning to A/B test:', error)
      return { assignment: null, variant: null }
    }
  }

  /**
   * Track conversion for an A/B test
   */
  async trackConversion(
    sessionId: string,
    conversionValue?: number,
    additionalMetrics?: Record<string, number>
  ): Promise<boolean> {
    try {
      // Get assignment for session
      const assignment = await this.getAssignmentBySession(sessionId)
      if (!assignment) return false

      // Update assignment with conversion
      await this.supabase
        .from('ab_test_assignments')
        .update({
          conversion_completed: true,
          conversion_value: conversionValue,
          session_metrics: { ...assignment.session_metrics, ...additionalMetrics },
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId)

      // Update variant conversion count
      await this.incrementVariantConversions(assignment.test_id, assignment.variant_id)

      // Check if test should be auto-stopped
      await this.checkAutoStopConditions(assignment.test_id)

      return true
    } catch (error) {
      console.error('Error tracking conversion:', error)
      return false
    }
  }

  /**
   * Calculate test results with statistical analysis
   */
  async calculateResults(testId: string): Promise<ABTestResults | null> {
    try {
      const test = await this.getTest(testId)
      if (!test) return null

      // Get all assignments for the test
      const assignments = await this.getTestAssignments(testId)

      // Calculate basic metrics
      const totalSessions = assignments.length
      const totalConversions = assignments.filter(a => a.conversion_completed).length
      const overallConversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0

      // Calculate variant results
      const variantResults: VariantResult[] = []

      for (const variant of test.variants) {
        const variantAssignments = assignments.filter(a => a.variant_id === variant.id)
        const variantSessions = variantAssignments.length
        const variantConversions = variantAssignments.filter(a => a.conversion_completed).length
        const conversionRate = variantSessions > 0 ? (variantConversions / variantSessions) * 100 : 0

        // Calculate confidence interval
        const confidenceInterval = this.calculateConfidenceInterval(
          variantConversions,
          variantSessions,
          test.confidence_level
        )

        // Calculate improvement over control
        const controlVariant = test.variants.find(v => v.is_control)
        const controlConversions = assignments.filter(a =>
          a.variant_id === controlVariant?.id && a.conversion_completed
        ).length
        const controlSessions = assignments.filter(a => a.variant_id === controlVariant?.id).length
        const controlRate = controlSessions > 0 ? (controlConversions / controlSessions) * 100 : 0
        const improvementOverControl = controlRate > 0 ? ((conversionRate - controlRate) / controlRate) * 100 : 0

        // Calculate statistical significance
        const significance = this.calculateStatisticalSignificance(
          variantConversions,
          variantSessions,
          controlConversions,
          controlSessions
        )

        // Calculate metrics performance
        const metricsPerformance: Record<string, number> = {}
        for (const metric of test.metrics) {
          const metricValue = this.calculateMetricValue(variantAssignments, metric)
          metricsPerformance[metric.name] = metricValue
        }

        variantResults.push({
          variant_id: variant.id,
          variant_name: variant.name,
          sessions: variantSessions,
          conversions: variantConversions,
          conversion_rate: conversionRate,
          confidence_interval: confidenceInterval,
          statistical_significance: significance.p_value,
          improvement_over_control: improvementOverControl,
          metrics_performance: metricsPerformance
        })
      }

      // Calculate overall statistical significance
      const overallSignificance = this.calculateOverallSignificance(variantResults, test.confidence_level)

      // Generate recommendations
      const recommendations = this.generateRecommendations(variantResults, overallSignificance, test)

      // Calculate confidence intervals for all metrics
      const confidenceIntervals = this.calculateAllConfidenceIntervals(variantResults, test)

      // Calculate effect size
      const effectSize = this.calculateEffectSize(variantResults)

      const results: ABTestResults = {
        test_id: testId,
        total_sessions: totalSessions,
        total_conversions: totalConversions,
        overall_conversion_rate: overallConversionRate,
        variant_results: variantResults,
        statistical_significance: overallSignificance,
        recommendations,
        confidence_intervals: confidenceIntervals,
        effect_size: effectSize,
        generated_at: new Date().toISOString()
      }

      // Store results
      await this.storeTestResults(testId, results)

      return results
    } catch (error) {
      console.error('Error calculating test results:', error)
      return null
    }
  }

  /**
   * Perform Bayesian analysis for early stopping
   */
  async performBayesianAnalysis(testId: string): Promise<BayesianTestResult | null> {
    try {
      const assignments = await this.getTestAssignments(testId)
      const test = await this.getTest(testId)
      if (!test) return null

      const controlVariant = test.variants.find(v => v.is_control)
      if (!controlVariant) return null

      const controlAssignments = assignments.filter(a => a.variant_id === controlVariant.id)
      const treatmentVariants = test.variants.filter(v => !v.is_control)

      // For simplicity, analyze the first treatment variant
      const treatmentVariant = treatmentVariants[0]
      if (!treatmentVariant) return null

      const treatmentAssignments = assignments.filter(a => a.variant_id === treatmentVariant.id)

      // Calculate Bayesian metrics
      const controlConversions = controlAssignments.filter(a => a.conversion_completed).length
      const controlSessions = controlAssignments.length
      const treatmentConversions = treatmentAssignments.filter(a => a.conversion_completed).length
      const treatmentSessions = treatmentAssignments.length

      // Beta distribution parameters (using uniform prior: alpha=1, beta=1)
      const controlPosterior = {
        alpha: 1 + controlConversions,
        beta: 1 + controlSessions - controlConversions
      }

      const treatmentPosterior = {
        alpha: 1 + treatmentConversions,
        beta: 1 + treatmentSessions - treatmentConversions
      }

      // Monte Carlo simulation to calculate probability of beating control
      const probabilityOfBeating = this.monteCarloSimulation(controlPosterior, treatmentPosterior)

      // Calculate expected loss
      const expectedLoss = this.calculateExpectedLoss(controlPosterior, treatmentPosterior)

      // Calculate credible interval
      const credibleInterval = this.calculateCredibleInterval(treatmentPosterior, 0.95)

      // Generate recommendation
      const recommendation = this.generateBayesianRecommendation(
        probabilityOfBeating,
        expectedLoss,
        test.minimum_sample_size,
        treatmentSessions + controlSessions
      )

      return {
        probability_of_beating_control: probabilityOfBeating,
        expected_loss: expectedLoss,
        posterior_distribution: {
          alpha: treatmentPosterior.alpha,
          beta: treatmentPosterior.beta,
          mean: treatmentPosterior.alpha / (treatmentPosterior.alpha + treatmentPosterior.beta),
          variance: (treatmentPosterior.alpha * treatmentPosterior.beta) /
                   (Math.pow(treatmentPosterior.alpha + treatmentPosterior.beta, 2) *
                    (treatmentPosterior.alpha + treatmentPosterior.beta + 1))
        },
        credible_interval: credibleInterval,
        recommendation
      }
    } catch (error) {
      console.error('Error performing Bayesian analysis:', error)
      return null
    }
  }

  /**
   * Stop test and declare winner
   */
  async stopTest(
    testId: string,
    reason: string,
    declareWinner: boolean = true
  ): Promise<{ success: boolean; winner?: string; error?: string }> {
    try {
      const test = await this.getTest(testId)
      if (!test) {
        return { success: false, error: 'Test not found' }
      }

      if (test.status !== 'running') {
        return { success: false, error: 'Test is not currently running' }
      }

      let winnerVariantId: string | undefined

      if (declareWinner) {
        // Calculate final results to determine winner
        const results = await this.calculateResults(testId)
        if (results) {
          // Find the variant with the highest conversion rate and statistical significance
          const significantVariants = results.variant_results.filter(v =>
            v.statistical_significance < (1 - test.confidence_level / 100) &&
            v.improvement_over_control > 0
          )

          if (significantVariants.length > 0) {
            winnerVariantId = significantVariants.reduce((winner, current) =>
              current.conversion_rate > winner.conversion_rate ? current : winner
            ).variant_id
          }
        }
      }

      // Update test status
      const { error } = await this.supabase
        .from('ab_tests')
        .update({
          status: 'completed',
          end_date: new Date().toISOString(),
          winner_variant_id: winnerVariantId,
          updated_at: new Date().toISOString()
        })
        .eq('id', testId)

      if (error) throw error

      // Remove from active tests cache
      this.activeTests.delete(testId)

      // Log test completion
      await this.logTestEvent(testId, 'test_stopped', { reason, winner: winnerVariantId })

      return {
        success: true,
        winner: winnerVariantId ? test.variants.find(v => v.id === winnerVariantId)?.name : undefined
      }
    } catch (error) {
      console.error('Error stopping A/B test:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to stop test'
      }
    }
  }

  /**
   * Get test configuration for a session
   */
  async getTestConfiguration(sessionId: string): Promise<TestConfiguration | null> {
    try {
      const assignment = await this.getAssignmentBySession(sessionId)
      if (!assignment) return null

      const test = await this.getTest(assignment.test_id)
      if (!test) return null

      const variant = test.variants.find(v => v.id === assignment.variant_id)
      if (!variant) return null

      return variant.configuration as TestConfiguration
    } catch (error) {
      console.error('Error getting test configuration:', error)
      return null
    }
  }

  // Private helper methods

  private validateTestConfiguration(config: any): { valid: boolean; error?: string } {
    if (config.variants.length < 2) {
      return { valid: false, error: 'Test must have at least 2 variants' }
    }

    const controlVariants = config.variants.filter((v: any) => v.is_control)
    if (controlVariants.length !== 1) {
      return { valid: false, error: 'Test must have exactly one control variant' }
    }

    const totalTrafficSplit = config.variants.reduce((sum: number, v: any) => sum + v.traffic_split, 0)
    if (Math.abs(totalTrafficSplit - 100) > 0.01) {
      return { valid: false, error: 'Variant traffic splits must sum to 100%' }
    }

    if (config.traffic_allocation < 1 || config.traffic_allocation > 100) {
      return { valid: false, error: 'Traffic allocation must be between 1% and 100%' }
    }

    return { valid: true }
  }

  private normalizeTrafficSplits(variants: ABTestVariant[]): void {
    const total = variants.reduce((sum, v) => sum + v.traffic_split, 0)
    if (total !== 100) {
      variants.forEach(v => {
        v.traffic_split = (v.traffic_split / total) * 100
      })
    }
  }

  private checkTestReadiness(test: ABTest): { ready: boolean; error?: string } {
    if (test.variants.length < 2) {
      return { ready: false, error: 'Test needs at least 2 variants' }
    }

    if (test.metrics.length === 0) {
      return { ready: false, error: 'Test needs at least one metric to track' }
    }

    const hasPrimaryMetric = test.metrics.some(m => m.primary)
    if (!hasPrimaryMetric) {
      return { ready: false, error: 'Test needs at least one primary metric' }
    }

    return { ready: true }
  }

  private async getActiveTestsForScenario(scenario: BusinessScenario): Promise<ABTest[]> {
    const { data, error } = await this.supabase
      .from('ab_tests')
      .select('*')
      .eq('business_scenario', scenario)
      .eq('status', 'running')

    return error ? [] : data || []
  }

  private selectTestForSession(tests: ABTest[]): ABTest | null {
    // Simple selection based on traffic allocation
    const random = Math.random() * 100
    let cumulative = 0

    for (const test of tests) {
      cumulative += test.traffic_allocation
      if (random <= cumulative) {
        return test
      }
    }

    return null
  }

  private assignToVariant(sessionId: string, test: ABTest): ABTestVariant {
    // Use deterministic hash to ensure consistent assignment
    const hash = this.hashString(sessionId + test.id)
    const random = (hash % 10000) / 100 // Convert to percentage

    let cumulative = 0
    for (const variant of test.variants) {
      cumulative += variant.traffic_split
      if (random <= cumulative) {
        return variant
      }
    }

    // Fallback to control variant
    return test.variants.find(v => v.is_control) || test.variants[0]
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private async storeAssignment(assignment: ABTestAssignment): Promise<void> {
    await this.supabase
      .from('ab_test_assignments')
      .insert({
        session_id: assignment.session_id,
        test_id: assignment.test_id,
        variant_id: assignment.variant_id,
        assigned_at: assignment.assigned_at,
        user_agent: assignment.user_agent,
        ip_address: assignment.ip_address,
        conversion_completed: assignment.conversion_completed,
        conversion_value: assignment.conversion_value,
        session_metrics: assignment.session_metrics
      })
  }

  private async incrementVariantSessions(testId: string, variantId: string): Promise<void> {
    // This would typically be done with a database function or atomic operation
    const { data: variant } = await this.supabase
      .from('ab_test_variants')
      .select('session_count')
      .eq('test_id', testId)
      .eq('variant_id', variantId)
      .single()

    if (variant) {
      await this.supabase
        .from('ab_test_variants')
        .update({ session_count: variant.session_count + 1 })
        .eq('test_id', testId)
        .eq('variant_id', variantId)
    }
  }

  private async incrementVariantConversions(testId: string, variantId: string): Promise<void> {
    // Similar to incrementVariantSessions
    const { data: variant } = await this.supabase
      .from('ab_test_variants')
      .select('conversion_count, session_count')
      .eq('test_id', testId)
      .eq('variant_id', variantId)
      .single()

    if (variant) {
      const newConversionCount = variant.conversion_count + 1
      const conversionRate = variant.session_count > 0 ? (newConversionCount / variant.session_count) * 100 : 0

      await this.supabase
        .from('ab_test_variants')
        .update({
          conversion_count: newConversionCount,
          conversion_rate: conversionRate
        })
        .eq('test_id', testId)
        .eq('variant_id', variantId)
    }
  }

  private async getTest(testId: string): Promise<ABTest | null> {
    // Check cache first
    if (this.activeTests.has(testId)) {
      return this.activeTests.get(testId)!
    }

    const { data, error } = await this.supabase
      .from('ab_tests')
      .select('*')
      .eq('id', testId)
      .single()

    return error ? null : data
  }

  private async getAssignmentBySession(sessionId: string): Promise<ABTestAssignment | null> {
    const { data, error } = await this.supabase
      .from('ab_test_assignments')
      .select('*')
      .eq('session_id', sessionId)
      .single()

    return error ? null : data
  }

  private async getTestAssignments(testId: string): Promise<ABTestAssignment[]> {
    const { data, error } = await this.supabase
      .from('ab_test_assignments')
      .select('*')
      .eq('test_id', testId)

    return error ? [] : data || []
  }

  private calculateConfidenceInterval(
    conversions: number,
    sessions: number,
    confidenceLevel: number
  ): { lower: number; upper: number } {
    if (sessions === 0) return { lower: 0, upper: 0 }

    const p = conversions / sessions
    const z = this.getZScore(confidenceLevel)
    const standardError = Math.sqrt((p * (1 - p)) / sessions)
    const margin = z * standardError

    return {
      lower: Math.max(0, (p - margin) * 100),
      upper: Math.min(100, (p + margin) * 100)
    }
  }

  private getZScore(confidenceLevel: number): number {
    const zScores: Record<number, number> = {
      90: 1.645,
      95: 1.96,
      99: 2.576
    }
    return zScores[confidenceLevel] || 1.96
  }

  private calculateStatisticalSignificance(
    treatmentConversions: number,
    treatmentSessions: number,
    controlConversions: number,
    controlSessions: number
  ): StatisticalSignificance {
    if (treatmentSessions === 0 || controlSessions === 0) {
      return {
        p_value: 1,
        confidence_level: 0,
        is_significant: false,
        power: 0,
        effect_size: 0,
        sample_size_recommendation: 1000
      }
    }

    const p1 = treatmentConversions / treatmentSessions
    const p2 = controlConversions / controlSessions
    const pooledP = (treatmentConversions + controlConversions) / (treatmentSessions + controlSessions)

    const standardError = Math.sqrt(pooledP * (1 - pooledP) * (1/treatmentSessions + 1/controlSessions))
    const zScore = Math.abs(p1 - p2) / standardError

    // Calculate p-value (two-tailed test)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)))

    const effectSize = this.calculateCohensH(p1, p2)
    const power = this.calculatePower(effectSize, treatmentSessions + controlSessions)

    return {
      p_value: pValue,
      confidence_level: 95,
      is_significant: pValue < 0.05,
      power: power,
      effect_size: effectSize,
      sample_size_recommendation: this.calculateSampleSizeRecommendation(effectSize, 0.8, 0.05)
    }
  }

  private normalCDF(z: number): number {
    // Approximation of the standard normal cumulative distribution function
    const a1 =  0.254829592
    const a2 = -0.284496736
    const a3 =  1.421413741
    const a4 = -1.453152027
    const a5 =  1.061405429
    const p  =  0.3275911

    const sign = z < 0 ? -1 : 1
    z = Math.abs(z) / Math.sqrt(2.0)

    const t = 1.0 / (1.0 + p * z)
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z)

    return 0.5 * (1.0 + sign * y)
  }

  private calculateCohensH(p1: number, p2: number): number {
    // Cohen's h for proportions
    return 2 * (Math.asin(Math.sqrt(p1)) - Math.asin(Math.sqrt(p2)))
  }

  private calculatePower(effectSize: number, sampleSize: number): number {
    // Simplified power calculation
    const ncp = effectSize * Math.sqrt(sampleSize / 2)
    return this.normalCDF(ncp - 1.96)
  }

  private calculateSampleSizeRecommendation(effectSize: number, power: number, alpha: number): number {
    // Simplified sample size calculation for two proportions
    const zAlpha = this.getZScore((1 - alpha) * 100)
    const zBeta = this.getZScore(power * 100)

    return Math.ceil(2 * Math.pow(zAlpha + zBeta, 2) / Math.pow(effectSize, 2))
  }

  private calculateMetricValue(assignments: ABTestAssignment[], metric: ABTestMetric): number {
    if (assignments.length === 0) return 0

    switch (metric.type) {
      case 'conversion':
        return (assignments.filter(a => a.conversion_completed).length / assignments.length) * 100
      case 'revenue':
        return assignments.reduce((sum, a) => sum + (a.conversion_value || 0), 0) / assignments.length
      case 'time_spent':
        return assignments.reduce((sum, a) => sum + (a.session_metrics.time_spent || 0), 0) / assignments.length
      case 'engagement':
        return assignments.reduce((sum, a) => sum + (a.session_metrics.engagement_score || 0), 0) / assignments.length
      default:
        return assignments.reduce((sum, a) => sum + (a.session_metrics[metric.name] || 0), 0) / assignments.length
    }
  }

  private calculateOverallSignificance(
    variantResults: VariantResult[],
    confidenceLevel: number
  ): StatisticalSignificance {
    // Find the best performing non-control variant
    const nonControlVariants = variantResults.filter(v => !v.variant_name.toLowerCase().includes('control'))
    if (nonControlVariants.length === 0) {
      return {
        p_value: 1,
        confidence_level: confidenceLevel,
        is_significant: false,
        power: 0,
        effect_size: 0,
        sample_size_recommendation: 1000
      }
    }

    const bestVariant = nonControlVariants.reduce((best, current) =>
      current.conversion_rate > best.conversion_rate ? current : best
    )

    return {
      p_value: bestVariant.statistical_significance,
      confidence_level: confidenceLevel,
      is_significant: bestVariant.statistical_significance < (1 - confidenceLevel / 100),
      power: 0.8, // Placeholder
      effect_size: Math.abs(bestVariant.improvement_over_control) / 100,
      sample_size_recommendation: 1000 // Placeholder
    }
  }

  private generateRecommendations(
    variantResults: VariantResult[],
    significance: StatisticalSignificance,
    test: ABTest
  ): string[] {
    const recommendations: string[] = []

    if (significance.is_significant) {
      const bestVariant = variantResults.reduce((best, current) =>
        current.conversion_rate > best.conversion_rate ? current : best
      )
      recommendations.push(`Deploy ${bestVariant.variant_name} - it shows a statistically significant improvement`)
    } else {
      recommendations.push('Continue testing - no statistically significant winner found yet')

      if (significance.sample_size_recommendation > variantResults.reduce((sum, v) => sum + v.sessions, 0)) {
        recommendations.push(`Increase sample size to ${significance.sample_size_recommendation} for better power`)
      }
    }

    // Add specific recommendations based on performance
    const lowPerformingVariants = variantResults.filter(v => v.conversion_rate < 1)
    if (lowPerformingVariants.length > 0) {
      recommendations.push('Consider stopping low-performing variants to allocate more traffic to promising ones')
    }

    return recommendations
  }

  private calculateAllConfidenceIntervals(
    variantResults: VariantResult[],
    test: ABTest
  ): ConfidenceInterval[] {
    const intervals: ConfidenceInterval[] = []

    for (const variant of variantResults) {
      for (const metric of test.metrics) {
        intervals.push({
          metric: metric.name,
          variant_id: variant.variant_id,
          lower_bound: variant.confidence_interval.lower,
          upper_bound: variant.confidence_interval.upper,
          confidence_level: test.confidence_level
        })
      }
    }

    return intervals
  }

  private calculateEffectSize(variantResults: VariantResult[]): number {
    const controlVariant = variantResults.find(v => v.variant_name.toLowerCase().includes('control'))
    if (!controlVariant) return 0

    const treatmentVariants = variantResults.filter(v => v !== controlVariant)
    if (treatmentVariants.length === 0) return 0

    const bestTreatment = treatmentVariants.reduce((best, current) =>
      current.conversion_rate > best.conversion_rate ? current : best
    )

    return this.calculateCohensH(
      bestTreatment.conversion_rate / 100,
      controlVariant.conversion_rate / 100
    )
  }

  private async storeTestResults(testId: string, results: ABTestResults): Promise<void> {
    await this.supabase
      .from('ab_test_results')
      .upsert({
        test_id: testId,
        results_data: results,
        generated_at: results.generated_at
      })
  }

  private monteCarloSimulation(
    controlPosterior: { alpha: number; beta: number },
    treatmentPosterior: { alpha: number; beta: number },
    simulations: number = 10000
  ): number {
    let treatmentWins = 0

    for (let i = 0; i < simulations; i++) {
      const controlSample = this.betaRandom(controlPosterior.alpha, controlPosterior.beta)
      const treatmentSample = this.betaRandom(treatmentPosterior.alpha, treatmentPosterior.beta)

      if (treatmentSample > controlSample) {
        treatmentWins++
      }
    }

    return treatmentWins / simulations
  }

  private betaRandom(alpha: number, beta: number): number {
    // Simple beta distribution random number generator
    const x = this.gammaRandom(alpha)
    const y = this.gammaRandom(beta)
    return x / (x + y)
  }

  private gammaRandom(shape: number): number {
    // Simplified gamma distribution - for production use a proper implementation
    let sum = 0
    for (let i = 0; i < shape; i++) {
      sum += -Math.log(Math.random())
    }
    return sum
  }

  private calculateExpectedLoss(
    controlPosterior: { alpha: number; beta: number },
    treatmentPosterior: { alpha: number; beta: number }
  ): number {
    // Simplified expected loss calculation
    const controlMean = controlPosterior.alpha / (controlPosterior.alpha + controlPosterior.beta)
    const treatmentMean = treatmentPosterior.alpha / (treatmentPosterior.alpha + treatmentPosterior.beta)

    return Math.max(0, controlMean - treatmentMean)
  }

  private calculateCredibleInterval(
    posterior: { alpha: number; beta: number },
    probability: number
  ): { lower: number; upper: number } {
    // Simplified credible interval calculation
    const mean = posterior.alpha / (posterior.alpha + posterior.beta)
    const variance = (posterior.alpha * posterior.beta) /
                    (Math.pow(posterior.alpha + posterior.beta, 2) * (posterior.alpha + posterior.beta + 1))
    const std = Math.sqrt(variance)
    const z = this.getZScore(probability * 100)

    return {
      lower: Math.max(0, mean - z * std),
      upper: Math.min(1, mean + z * std)
    }
  }

  private generateBayesianRecommendation(
    probabilityOfBeating: number,
    expectedLoss: number,
    minimumSampleSize: number,
    currentSampleSize: number
  ): 'deploy' | 'continue_testing' | 'stop_test' {
    if (currentSampleSize < minimumSampleSize) {
      return 'continue_testing'
    }

    if (probabilityOfBeating > 0.95 && expectedLoss < 0.01) {
      return 'deploy'
    }

    if (probabilityOfBeating < 0.1 || expectedLoss > 0.05) {
      return 'stop_test'
    }

    return 'continue_testing'
  }

  private async checkAutoStopConditions(testId: string): Promise<void> {
    // Check various conditions for auto-stopping the test
    const test = await this.getTest(testId)
    if (!test) return

    // Check if test has reached statistical significance
    const results = await this.calculateResults(testId)
    if (results && results.statistical_significance.is_significant) {
      await this.stopTest(testId, 'Statistical significance reached', true)
      return
    }

    // Check if test has been running for too long
    const startDate = new Date(test.start_date)
    const daysSinceStart = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysSinceStart > 30) { // 30 days maximum
      await this.stopTest(testId, 'Maximum test duration reached', true)
      return
    }

    // Check if sample size is sufficient
    const assignments = await this.getTestAssignments(testId)
    if (assignments.length >= test.minimum_sample_size * 2) {
      // Perform Bayesian analysis for early stopping
      const bayesianResult = await this.performBayesianAnalysis(testId)
      if (bayesianResult && bayesianResult.recommendation === 'deploy') {
        await this.stopTest(testId, 'Bayesian analysis recommends deployment', true)
      }
    }
  }

  private async logTestEvent(testId: string, eventType: string, data: any): Promise<void> {
    await this.supabase
      .from('ab_test_events')
      .insert({
        test_id: testId,
        event_type: eventType,
        event_data: data,
        timestamp: new Date().toISOString()
      })
  }
}

/**
 * A/B Testing Utilities
 */
export const ABTestingUtils = {
  /**
   * Calculate required sample size for a test
   */
  calculateSampleSize(
    baselineConversionRate: number,
    minimumDetectableEffect: number,
    power: number = 0.8,
    alpha: number = 0.05
  ): number {
    const p1 = baselineConversionRate / 100
    const p2 = p1 * (1 + minimumDetectableEffect / 100)

    const zAlpha = 1.96 // For alpha = 0.05
    const zBeta = 0.84  // For power = 0.8

    const pooledP = (p1 + p2) / 2
    const sampleSize = 2 * Math.pow(zAlpha + zBeta, 2) * pooledP * (1 - pooledP) / Math.pow(p2 - p1, 2)

    return Math.ceil(sampleSize)
  },

  /**
   * Calculate test duration estimate
   */
  calculateTestDuration(
    requiredSampleSize: number,
    trafficPerDay: number,
    trafficAllocation: number
  ): number {
    const dailyTestTraffic = trafficPerDay * (trafficAllocation / 100)
    return Math.ceil(requiredSampleSize / dailyTestTraffic)
  },

  /**
   * Format test results for display
   */
  formatTestResults(results: ABTestResults): {
    summary: string
    recommendation: string
    significance: string
  } {
    const bestVariant = results.variant_results.reduce((best, current) =>
      current.conversion_rate > best.conversion_rate ? current : best
    )

    const summary = `Test completed with ${results.total_sessions} total sessions and ${results.total_conversions} conversions. Best performing variant: ${bestVariant.variant_name} (${bestVariant.conversion_rate.toFixed(2)}% conversion rate).`

    const recommendation = results.statistical_significance.is_significant
      ? `Deploy ${bestVariant.variant_name} - statistically significant winner`
      : 'No clear winner - consider extending the test or making larger changes'

    const significance = results.statistical_significance.is_significant
      ? `Statistically significant (p-value: ${results.statistical_significance.p_value.toFixed(4)})`
      : `Not statistically significant (p-value: ${results.statistical_significance.p_value.toFixed(4)})`

    return { summary, recommendation, significance }
  }
}