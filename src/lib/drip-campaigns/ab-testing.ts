/**
 * Drip Campaign A/B Testing Framework
 *
 * Enables split testing of message variants within drip campaigns:
 * - Multiple message variants per step
 * - Traffic allocation (e.g., 50/50, 70/30)
 * - Statistical significance calculation
 * - Winner selection based on metrics
 * - Automatic winner deployment
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// ============================================================================
// TYPES
// ============================================================================

export interface ABTestVariant {
  id: string
  testId: string
  name: string
  messageContent?: string
  templateId?: string
  templateVariables?: Record<string, string>
  trafficAllocation: number // percentage (0-100)
  metrics: VariantMetrics
  isControl: boolean
  isWinner: boolean
  createdAt: Date
}

export interface VariantMetrics {
  impressions: number
  delivered: number
  read: number
  replied: number
  clicked: number
  deliveryRate: number
  readRate: number
  replyRate: number
  clickRate: number
}

export interface ABTest {
  id: string
  campaignId: string
  stepId: string
  name: string
  status: ABTestStatus
  winningMetric: WinningMetric
  confidenceThreshold: number // e.g., 0.95 for 95%
  minSampleSize: number
  variants: ABTestVariant[]
  startedAt?: Date
  completedAt?: Date
  winnerId?: string
  createdAt: Date
  updatedAt: Date
}

export type ABTestStatus = 'draft' | 'running' | 'completed' | 'paused'
export type WinningMetric = 'delivery_rate' | 'read_rate' | 'reply_rate' | 'click_rate'

export interface StatisticalResult {
  isSignificant: boolean
  confidence: number
  pValue: number
  winnerId: string | null
  winnerImprovement: number | null
  recommendedAction: 'continue' | 'declare_winner' | 'no_difference'
}

// ============================================================================
// A/B TESTING SERVICE
// ============================================================================

export class DripABTestingService {
  private supabase: SupabaseClient

  constructor(supabase?: SupabaseClient) {
    this.supabase = supabase || createServiceRoleClient()
  }

  /**
   * Create a new A/B test for a drip campaign step
   */
  async createTest(
    campaignId: string,
    stepId: string,
    config: {
      name: string
      winningMetric?: WinningMetric
      confidenceThreshold?: number
      minSampleSize?: number
    }
  ): Promise<ABTest | null> {
    try {
      const testId = crypto.randomUUID()
      const testData = {
        id: testId,
        campaign_id: campaignId,
        step_id: stepId,
        name: config.name,
        status: 'draft' as ABTestStatus,
        winning_metric: config.winningMetric || 'read_rate',
        confidence_threshold: config.confidenceThreshold || 0.95,
        min_sample_size: config.minSampleSize || 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await this.supabase
        .from('drip_ab_tests')
        .insert(testData)
        .select()
        .single()

      if (error) {
        console.error('[ABTesting] Failed to create test:', error)
        return null
      }

      return this.mapToABTest(data, [])
    } catch (error) {
      console.error('[ABTesting] Error creating test:', error)
      return null
    }
  }

  /**
   * Add a variant to an A/B test
   */
  async addVariant(
    testId: string,
    config: {
      name: string
      messageContent?: string
      templateId?: string
      templateVariables?: Record<string, string>
      trafficAllocation: number
      isControl?: boolean
    }
  ): Promise<ABTestVariant | null> {
    try {
      const variantId = crypto.randomUUID()
      const variantData = {
        id: variantId,
        test_id: testId,
        name: config.name,
        message_content: config.messageContent,
        template_id: config.templateId,
        template_variables: config.templateVariables || {},
        traffic_allocation: config.trafficAllocation,
        is_control: config.isControl || false,
        is_winner: false,
        metrics: {
          impressions: 0,
          delivered: 0,
          read: 0,
          replied: 0,
          clicked: 0,
          deliveryRate: 0,
          readRate: 0,
          replyRate: 0,
          clickRate: 0,
        },
        created_at: new Date().toISOString(),
      }

      const { data, error } = await this.supabase
        .from('drip_ab_variants')
        .insert(variantData)
        .select()
        .single()

      if (error) {
        console.error('[ABTesting] Failed to add variant:', error)
        return null
      }

      return this.mapToVariant(data)
    } catch (error) {
      console.error('[ABTesting] Error adding variant:', error)
      return null
    }
  }

  /**
   * Start an A/B test
   */
  async startTest(testId: string): Promise<boolean> {
    try {
      // Validate test has at least 2 variants
      const { data: variants } = await this.supabase
        .from('drip_ab_variants')
        .select('id')
        .eq('test_id', testId)

      if (!variants || variants.length < 2) {
        console.error('[ABTesting] Test must have at least 2 variants')
        return false
      }

      // Validate traffic allocation sums to 100%
      const { data: allocations } = await this.supabase
        .from('drip_ab_variants')
        .select('traffic_allocation')
        .eq('test_id', testId)

      const totalAllocation = (allocations || []).reduce((sum, v) => sum + v.traffic_allocation, 0)
      if (Math.abs(totalAllocation - 100) > 0.01) {
        console.error('[ABTesting] Traffic allocation must sum to 100%')
        return false
      }

      const { error } = await this.supabase
        .from('drip_ab_tests')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', testId)

      return !error
    } catch (error) {
      console.error('[ABTesting] Error starting test:', error)
      return false
    }
  }

  /**
   * Select a variant for a contact based on traffic allocation
   * Uses deterministic selection based on contact ID for consistency
   */
  async selectVariantForContact(testId: string, contactId: string): Promise<ABTestVariant | null> {
    try {
      // Get all variants for this test
      const { data: variants, error } = await this.supabase
        .from('drip_ab_variants')
        .select('*')
        .eq('test_id', testId)
        .order('traffic_allocation', { ascending: false })

      if (error || !variants || variants.length === 0) {
        return null
      }

      // Deterministic selection based on contact ID
      // Hash the contact ID to get a number between 0-99
      const hash = this.hashContactId(contactId)
      const bucket = hash % 100

      // Select variant based on traffic allocation
      let cumulativeAllocation = 0
      for (const variant of variants) {
        cumulativeAllocation += variant.traffic_allocation
        if (bucket < cumulativeAllocation) {
          return this.mapToVariant(variant)
        }
      }

      // Fallback to first variant
      return this.mapToVariant(variants[0])
    } catch (error) {
      console.error('[ABTesting] Error selecting variant:', error)
      return null
    }
  }

  /**
   * Record an impression for a variant
   */
  async recordImpression(variantId: string): Promise<void> {
    try {
      const { data: variant } = await this.supabase
        .from('drip_ab_variants')
        .select('metrics')
        .eq('id', variantId)
        .single()

      if (!variant) return

      const metrics = variant.metrics as VariantMetrics
      metrics.impressions++

      await this.supabase
        .from('drip_ab_variants')
        .update({ metrics })
        .eq('id', variantId)
    } catch (error) {
      console.error('[ABTesting] Error recording impression:', error)
    }
  }

  /**
   * Record a delivery event for a variant
   */
  async recordDelivery(variantId: string): Promise<void> {
    try {
      await this.updateMetric(variantId, 'delivered')
    } catch (error) {
      console.error('[ABTesting] Error recording delivery:', error)
    }
  }

  /**
   * Record a read event for a variant
   */
  async recordRead(variantId: string): Promise<void> {
    try {
      await this.updateMetric(variantId, 'read')
    } catch (error) {
      console.error('[ABTesting] Error recording read:', error)
    }
  }

  /**
   * Record a reply event for a variant
   */
  async recordReply(variantId: string): Promise<void> {
    try {
      await this.updateMetric(variantId, 'replied')
    } catch (error) {
      console.error('[ABTesting] Error recording reply:', error)
    }
  }

  /**
   * Record a click event for a variant
   */
  async recordClick(variantId: string): Promise<void> {
    try {
      await this.updateMetric(variantId, 'clicked')
    } catch (error) {
      console.error('[ABTesting] Error recording click:', error)
    }
  }

  /**
   * Get test with all variants and metrics
   */
  async getTest(testId: string): Promise<ABTest | null> {
    try {
      const { data: test, error: testError } = await this.supabase
        .from('drip_ab_tests')
        .select('*')
        .eq('id', testId)
        .single()

      if (testError || !test) {
        return null
      }

      const { data: variants, error: variantError } = await this.supabase
        .from('drip_ab_variants')
        .select('*')
        .eq('test_id', testId)
        .order('traffic_allocation', { ascending: false })

      if (variantError) {
        return null
      }

      return this.mapToABTest(test, variants || [])
    } catch (error) {
      console.error('[ABTesting] Error getting test:', error)
      return null
    }
  }

  /**
   * Get active test for a step
   */
  async getActiveTestForStep(stepId: string): Promise<ABTest | null> {
    try {
      const { data: test, error } = await this.supabase
        .from('drip_ab_tests')
        .select('*')
        .eq('step_id', stepId)
        .eq('status', 'running')
        .single()

      if (error || !test) {
        return null
      }

      return this.getTest(test.id)
    } catch (error) {
      console.error('[ABTesting] Error getting active test:', error)
      return null
    }
  }

  /**
   * Calculate statistical significance and determine winner
   */
  async calculateStatisticalSignificance(testId: string): Promise<StatisticalResult> {
    const test = await this.getTest(testId)

    if (!test || test.variants.length < 2) {
      return {
        isSignificant: false,
        confidence: 0,
        pValue: 1,
        winnerId: null,
        winnerImprovement: null,
        recommendedAction: 'continue',
      }
    }

    const control = test.variants.find(v => v.isControl) || test.variants[0]
    const challenger = test.variants.find(v => !v.isControl && v.id !== control.id) || test.variants[1]

    // Get metric values based on winning metric
    const getMetricValue = (variant: ABTestVariant): number => {
      switch (test.winningMetric) {
        case 'delivery_rate':
          return variant.metrics.deliveryRate
        case 'read_rate':
          return variant.metrics.readRate
        case 'reply_rate':
          return variant.metrics.replyRate
        case 'click_rate':
          return variant.metrics.clickRate
        default:
          return variant.metrics.readRate
      }
    }

    const controlRate = getMetricValue(control)
    const challengerRate = getMetricValue(challenger)
    const controlN = control.metrics.impressions
    const challengerN = challenger.metrics.impressions

    // Check minimum sample size
    if (controlN < test.minSampleSize || challengerN < test.minSampleSize) {
      return {
        isSignificant: false,
        confidence: 0,
        pValue: 1,
        winnerId: null,
        winnerImprovement: null,
        recommendedAction: 'continue',
      }
    }

    // Calculate z-score for two-proportion z-test
    const pooledRate = (controlRate * controlN + challengerRate * challengerN) / (controlN + challengerN)
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1 / controlN + 1 / challengerN))

    if (standardError === 0) {
      return {
        isSignificant: false,
        confidence: 0.5,
        pValue: 1,
        winnerId: null,
        winnerImprovement: null,
        recommendedAction: 'no_difference',
      }
    }

    const zScore = Math.abs(controlRate - challengerRate) / standardError

    // Calculate p-value from z-score (two-tailed)
    const pValue = 2 * (1 - this.normalCDF(zScore))
    const confidence = 1 - pValue

    // Determine winner
    const isSignificant = confidence >= test.confidenceThreshold
    let winnerId: string | null = null
    let winnerImprovement: number | null = null

    if (isSignificant && controlRate !== challengerRate) {
      winnerId = challengerRate > controlRate ? challenger.id : control.id
      const loserRate = winnerId === challenger.id ? controlRate : challengerRate
      winnerImprovement = loserRate > 0 ? ((Math.max(controlRate, challengerRate) - loserRate) / loserRate) * 100 : 0
    }

    return {
      isSignificant,
      confidence,
      pValue,
      winnerId,
      winnerImprovement,
      recommendedAction: isSignificant ? 'declare_winner' : 'continue',
    }
  }

  /**
   * Declare a winner and complete the test
   */
  async declareWinner(testId: string, winnerId: string): Promise<boolean> {
    try {
      // Mark the winner
      await this.supabase
        .from('drip_ab_variants')
        .update({ is_winner: true })
        .eq('id', winnerId)

      // Complete the test
      await this.supabase
        .from('drip_ab_tests')
        .update({
          status: 'completed',
          winner_id: winnerId,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', testId)

      // Update the step with the winning variant's content
      const { data: test } = await this.supabase
        .from('drip_ab_tests')
        .select('step_id')
        .eq('id', testId)
        .single()

      const { data: winner } = await this.supabase
        .from('drip_ab_variants')
        .select('message_content, template_id, template_variables')
        .eq('id', winnerId)
        .single()

      if (test && winner) {
        await this.supabase
          .from('drip_campaign_steps')
          .update({
            message_content: winner.message_content,
            template_id: winner.template_id,
            template_variables: winner.template_variables,
            updated_at: new Date().toISOString(),
          })
          .eq('id', test.step_id)
      }

      return true
    } catch (error) {
      console.error('[ABTesting] Error declaring winner:', error)
      return false
    }
  }

  /**
   * Pause a running test
   */
  async pauseTest(testId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('drip_ab_tests')
        .update({
          status: 'paused',
          updated_at: new Date().toISOString(),
        })
        .eq('id', testId)

      return !error
    } catch (error) {
      console.error('[ABTesting] Error pausing test:', error)
      return false
    }
  }

  // ========================================================================
  // HELPER METHODS
  // ========================================================================

  private async updateMetric(variantId: string, metricKey: keyof VariantMetrics): Promise<void> {
    const { data: variant } = await this.supabase
      .from('drip_ab_variants')
      .select('metrics')
      .eq('id', variantId)
      .single()

    if (!variant) return

    const metrics = variant.metrics as VariantMetrics
    metrics[metricKey] = (metrics[metricKey] as number) + 1

    // Recalculate rates
    if (metrics.impressions > 0) {
      metrics.deliveryRate = (metrics.delivered / metrics.impressions) * 100
    }
    if (metrics.delivered > 0) {
      metrics.readRate = (metrics.read / metrics.delivered) * 100
      metrics.replyRate = (metrics.replied / metrics.delivered) * 100
      metrics.clickRate = (metrics.clicked / metrics.delivered) * 100
    }

    await this.supabase
      .from('drip_ab_variants')
      .update({ metrics })
      .eq('id', variantId)
  }

  private hashContactId(contactId: string): number {
    let hash = 0
    for (let i = 0; i < contactId.length; i++) {
      const char = contactId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  private normalCDF(x: number): number {
    // Approximation of the normal cumulative distribution function
    const a1 = 0.254829592
    const a2 = -0.284496736
    const a3 = 1.421413741
    const a4 = -1.453152027
    const a5 = 1.061405429
    const p = 0.3275911

    const sign = x < 0 ? -1 : 1
    x = Math.abs(x) / Math.sqrt(2)

    const t = 1.0 / (1.0 + p * x)
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

    return 0.5 * (1.0 + sign * y)
  }

  private mapToABTest(data: any, variants: any[]): ABTest {
    return {
      id: data.id,
      campaignId: data.campaign_id,
      stepId: data.step_id,
      name: data.name,
      status: data.status,
      winningMetric: data.winning_metric,
      confidenceThreshold: data.confidence_threshold,
      minSampleSize: data.min_sample_size,
      variants: variants.map(v => this.mapToVariant(v)),
      startedAt: data.started_at ? new Date(data.started_at) : undefined,
      completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      winnerId: data.winner_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }

  private mapToVariant(data: any): ABTestVariant {
    return {
      id: data.id,
      testId: data.test_id,
      name: data.name,
      messageContent: data.message_content,
      templateId: data.template_id,
      templateVariables: data.template_variables || {},
      trafficAllocation: data.traffic_allocation,
      metrics: data.metrics || {
        impressions: 0,
        delivered: 0,
        read: 0,
        replied: 0,
        clicked: 0,
        deliveryRate: 0,
        readRate: 0,
        replyRate: 0,
        clickRate: 0,
      },
      isControl: data.is_control,
      isWinner: data.is_winner,
      createdAt: new Date(data.created_at),
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create and configure an A/B test
 */
export async function createABTest(
  campaignId: string,
  stepId: string,
  config: {
    name: string
    winningMetric?: WinningMetric
    confidenceThreshold?: number
    minSampleSize?: number
  }
): Promise<ABTest | null> {
  const service = new DripABTestingService()
  return service.createTest(campaignId, stepId, config)
}

/**
 * Select variant for a contact
 */
export async function selectVariantForContact(testId: string, contactId: string): Promise<ABTestVariant | null> {
  const service = new DripABTestingService()
  return service.selectVariantForContact(testId, contactId)
}

/**
 * Get test results with statistical analysis
 */
export async function getABTestResults(testId: string): Promise<{
  test: ABTest | null
  statistics: StatisticalResult | null
}> {
  const service = new DripABTestingService()
  const test = await service.getTest(testId)
  const statistics = test ? await service.calculateStatisticalSignificance(testId) : null
  return { test, statistics }
}

// Export singleton
export const dripABTestingService = new DripABTestingService()
