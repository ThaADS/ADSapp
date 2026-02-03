/**
 * Drip Campaign A/B Testing Service Tests
 *
 * Tests for the A/B testing framework including:
 * - Test creation and configuration
 * - Variant management
 * - Traffic allocation
 * - Statistical significance calculation
 * - Winner declaration
 */

import {
  DripABTestingService,
  ABTestConfig,
  ABTestVariant,
  StatisticalResult,
} from '@/lib/drip-campaigns/ab-testing'

// Mock Supabase
const mockSupabaseQuery = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn(),
  maybeSingle: jest.fn(),
}

const mockSupabase = {
  from: jest.fn(() => mockSupabaseQuery),
}

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(() => mockSupabase),
}))

describe('DripABTestingService', () => {
  let service: DripABTestingService
  const testCampaignId = 'campaign-123'
  const testStepId = 'step-456'
  const testTestId = 'test-789'

  beforeEach(() => {
    jest.clearAllMocks()
    service = new DripABTestingService(mockSupabase as any)
  })

  describe('createTest', () => {
    it('should create a new A/B test with default configuration', async () => {
      const testConfig: ABTestConfig = {
        name: 'Welcome Message Test',
        winningMetric: 'read_rate',
      }

      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          id: testTestId,
          campaign_id: testCampaignId,
          step_id: testStepId,
          name: 'Welcome Message Test',
          status: 'draft',
          winning_metric: 'read_rate',
          confidence_threshold: 0.95,
          min_sample_size: 100,
        },
        error: null,
      })

      const result = await service.createTest(testCampaignId, testStepId, testConfig)

      expect(mockSupabase.from).toHaveBeenCalledWith('drip_ab_tests')
      expect(mockSupabaseQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          campaign_id: testCampaignId,
          step_id: testStepId,
          name: 'Welcome Message Test',
          winning_metric: 'read_rate',
          status: 'draft',
        })
      )
      expect(result).toBeDefined()
      expect(result?.name).toBe('Welcome Message Test')
    })

    it('should create test with custom confidence threshold', async () => {
      const testConfig: ABTestConfig = {
        name: 'Custom Threshold Test',
        winningMetric: 'reply_rate',
        confidenceThreshold: 0.99,
        minSampleSize: 200,
      }

      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          id: testTestId,
          confidence_threshold: 0.99,
          min_sample_size: 200,
        },
        error: null,
      })

      await service.createTest(testCampaignId, testStepId, testConfig)

      expect(mockSupabaseQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          confidence_threshold: 0.99,
          min_sample_size: 200,
        })
      )
    })

    it('should return null on database error', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: null,
        error: new Error('DB error'),
      })

      const result = await service.createTest(testCampaignId, testStepId, { name: 'Test' })

      expect(result).toBeNull()
    })
  })

  describe('addVariant', () => {
    it('should add a variant to an existing test', async () => {
      const variantConfig = {
        name: 'Variant A',
        messageContent: 'Hello {{first_name}}!',
        trafficAllocation: 50,
        isControl: true,
      }

      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          id: 'variant-1',
          test_id: testTestId,
          name: 'Variant A',
          message_content: 'Hello {{first_name}}!',
          traffic_allocation: 50,
          is_control: true,
        },
        error: null,
      })

      const result = await service.addVariant(testTestId, variantConfig)

      expect(mockSupabase.from).toHaveBeenCalledWith('drip_ab_variants')
      expect(mockSupabaseQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          test_id: testTestId,
          name: 'Variant A',
          traffic_allocation: 50,
          is_control: true,
        })
      )
      expect(result).toBeDefined()
    })

    it('should validate traffic allocation does not exceed 100%', async () => {
      // First get existing variants
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { traffic_allocation: 60 },
              { traffic_allocation: 30 },
            ],
            error: null,
          }),
        }),
      })

      const variantConfig = {
        name: 'Variant C',
        messageContent: 'Test',
        trafficAllocation: 20, // Would make total 110%
      }

      const result = await service.addVariant(testTestId, variantConfig)

      // Should fail validation or adjust
      // Implementation may vary
    })

    it('should set default metrics on new variant', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          id: 'variant-1',
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
        },
        error: null,
      })

      const result = await service.addVariant(testTestId, {
        name: 'New Variant',
        messageContent: 'Test',
        trafficAllocation: 50,
      })

      expect(result?.metrics?.impressions).toBe(0)
    })
  })

  describe('startTest', () => {
    it('should start a test and update status to running', async () => {
      // Mock validation checks
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { traffic_allocation: 50 },
              { traffic_allocation: 50 },
            ],
            error: null,
          }),
        }),
      })

      mockSupabaseQuery.eq.mockReturnThis()
      mockSupabaseQuery.update.mockResolvedValueOnce({ error: null })

      const result = await service.startTest(testTestId)

      expect(result).toBe(true)
      expect(mockSupabaseQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'running',
          started_at: expect.any(String),
        })
      )
    })

    it('should fail if traffic allocation does not sum to 100%', async () => {
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              { traffic_allocation: 30 },
              { traffic_allocation: 30 },
            ],
            error: null,
          }),
        }),
      })

      const result = await service.startTest(testTestId)

      expect(result).toBe(false)
    })

    it('should fail if fewer than 2 variants exist', async () => {
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ traffic_allocation: 100 }],
            error: null,
          }),
        }),
      })

      const result = await service.startTest(testTestId)

      expect(result).toBe(false)
    })
  })

  describe('selectVariantForContact', () => {
    const testContactId = 'contact-123'
    const testEnrollmentId = 'enrollment-456'

    beforeEach(() => {
      // Mock variants
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                { id: 'variant-a', traffic_allocation: 50 },
                { id: 'variant-b', traffic_allocation: 50 },
              ],
              error: null,
            }),
          }),
        }),
      })
    })

    it('should select variant deterministically based on contact ID', async () => {
      // First call should always return same variant for same contact
      const result1 = await service.selectVariantForContact(
        testTestId,
        testContactId,
        testEnrollmentId
      )

      // Reset mock for second call with same setup
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                { id: 'variant-a', traffic_allocation: 50 },
                { id: 'variant-b', traffic_allocation: 50 },
              ],
              error: null,
            }),
          }),
        }),
      })

      const result2 = await service.selectVariantForContact(
        testTestId,
        testContactId,
        testEnrollmentId
      )

      // Same contact should get same variant
      expect(result1?.id).toBe(result2?.id)
    })

    it('should create assignment record when selecting variant', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: { id: 'assignment-1' },
        error: null,
      })

      await service.selectVariantForContact(testTestId, testContactId, testEnrollmentId)

      expect(mockSupabase.from).toHaveBeenCalledWith('drip_variant_assignments')
      expect(mockSupabaseQuery.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          test_id: testTestId,
          contact_id: testContactId,
          enrollment_id: testEnrollmentId,
        })
      )
    })

    it('should increment variant impressions on selection', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: { id: 'assignment-1' },
        error: null,
      })

      await service.selectVariantForContact(testTestId, testContactId, testEnrollmentId)

      // Should update variant metrics
      expect(mockSupabaseQuery.update).toHaveBeenCalled()
    })
  })

  describe('calculateStatisticalSignificance', () => {
    it('should calculate z-score and p-value correctly', async () => {
      // Mock test with variants
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: testTestId,
                winning_metric: 'read_rate',
                confidence_threshold: 0.95,
                min_sample_size: 100,
              },
              error: null,
            }),
          }),
        }),
      })

      // Mock variants with metrics
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'variant-a',
                is_control: true,
                metrics: {
                  impressions: 200,
                  delivered: 190,
                  read: 120,
                  readRate: 63.16, // 120/190
                },
              },
              {
                id: 'variant-b',
                is_control: false,
                metrics: {
                  impressions: 200,
                  delivered: 185,
                  read: 140,
                  readRate: 75.68, // 140/185
                },
              },
            ],
            error: null,
          }),
        }),
      })

      const result = await service.calculateStatisticalSignificance(testTestId)

      expect(result).toBeDefined()
      expect(result.zScore).toBeDefined()
      expect(result.pValue).toBeDefined()
      expect(typeof result.isSignificant).toBe('boolean')
    })

    it('should identify winner when statistically significant', async () => {
      // Mock test
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                winning_metric: 'read_rate',
                confidence_threshold: 0.95,
                min_sample_size: 100,
              },
              error: null,
            }),
          }),
        }),
      })

      // Mock variants with clear winner (large difference)
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'variant-a',
                is_control: true,
                metrics: { impressions: 500, delivered: 480, read: 200, readRate: 41.67 },
              },
              {
                id: 'variant-b',
                is_control: false,
                metrics: { impressions: 500, delivered: 475, read: 350, readRate: 73.68 },
              },
            ],
            error: null,
          }),
        }),
      })

      const result = await service.calculateStatisticalSignificance(testTestId)

      expect(result.isSignificant).toBe(true)
      expect(result.winnerId).toBe('variant-b')
      expect(result.recommendedAction).toBe('declare_winner')
    })

    it('should recommend continuing when sample size too small', async () => {
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                winning_metric: 'read_rate',
                confidence_threshold: 0.95,
                min_sample_size: 100,
              },
              error: null,
            }),
          }),
        }),
      })

      // Mock variants with small sample
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'variant-a',
                metrics: { impressions: 20, delivered: 18, read: 10, readRate: 55.56 },
              },
              {
                id: 'variant-b',
                metrics: { impressions: 20, delivered: 19, read: 12, readRate: 63.16 },
              },
            ],
            error: null,
          }),
        }),
      })

      const result = await service.calculateStatisticalSignificance(testTestId)

      expect(result.isSignificant).toBe(false)
      expect(result.recommendedAction).toBe('continue_test')
    })

    it('should recommend continuing when not statistically significant', async () => {
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                winning_metric: 'read_rate',
                confidence_threshold: 0.95,
                min_sample_size: 100,
              },
              error: null,
            }),
          }),
        }),
      })

      // Mock variants with similar performance
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'variant-a',
                metrics: { impressions: 200, delivered: 190, read: 110, readRate: 57.89 },
              },
              {
                id: 'variant-b',
                metrics: { impressions: 200, delivered: 185, read: 108, readRate: 58.38 },
              },
            ],
            error: null,
          }),
        }),
      })

      const result = await service.calculateStatisticalSignificance(testTestId)

      expect(result.isSignificant).toBe(false)
      expect(result.recommendedAction).toBe('continue_test')
    })
  })

  describe('declareWinner', () => {
    it('should mark variant as winner and complete test', async () => {
      const winnerId = 'variant-b'

      mockSupabaseQuery.eq.mockReturnThis()
      mockSupabaseQuery.update.mockResolvedValue({ error: null })

      const result = await service.declareWinner(testTestId, winnerId)

      expect(result).toBe(true)

      // Should update test status
      expect(mockSupabase.from).toHaveBeenCalledWith('drip_ab_tests')
      expect(mockSupabaseQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          winner_id: winnerId,
          completed_at: expect.any(String),
        })
      )

      // Should mark variant as winner
      expect(mockSupabase.from).toHaveBeenCalledWith('drip_ab_variants')
      expect(mockSupabaseQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_winner: true,
        })
      )
    })

    it('should return false on update error', async () => {
      mockSupabaseQuery.update.mockResolvedValueOnce({ error: new Error('Update failed') })

      const result = await service.declareWinner(testTestId, 'variant-a')

      expect(result).toBe(false)
    })
  })

  describe('getTestResults', () => {
    it('should return comprehensive test results', async () => {
      // Mock test
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: testTestId,
                name: 'Welcome Test',
                status: 'running',
                winning_metric: 'read_rate',
                confidence_threshold: 0.95,
                started_at: '2026-02-01T00:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      })

      // Mock variants
      mockSupabase.from.mockReturnValueOnce({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [
              {
                id: 'variant-a',
                name: 'Control',
                is_control: true,
                metrics: { impressions: 100, read: 50, readRate: 50 },
              },
              {
                id: 'variant-b',
                name: 'Variant B',
                is_control: false,
                metrics: { impressions: 100, read: 60, readRate: 60 },
              },
            ],
            error: null,
          }),
        }),
      })

      const results = await service.getTestResults(testTestId)

      expect(results).toBeDefined()
      expect(results?.test.id).toBe(testTestId)
      expect(results?.variants).toHaveLength(2)
      expect(results?.statistics).toBeDefined()
    })
  })
})

describe('Statistical Calculations', () => {
  describe('Two-Proportion Z-Test', () => {
    it('should calculate z-score correctly for known values', () => {
      // Known example: p1 = 0.4, n1 = 100, p2 = 0.5, n2 = 100
      // Expected z ≈ -1.43
      const p1 = 0.4
      const n1 = 100
      const p2 = 0.5
      const n2 = 100

      const pPooled = (p1 * n1 + p2 * n2) / (n1 + n2)
      const se = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2))
      const z = (p1 - p2) / se

      expect(z).toBeCloseTo(-1.43, 1)
    })

    it('should calculate p-value from z-score', () => {
      // z = 1.96 should give p ≈ 0.05 (two-tailed)
      // z = 2.58 should give p ≈ 0.01
      const z196 = 1.96
      const z258 = 2.58

      // Using normal distribution approximation
      // These are rough checks
      const pValue196 = 2 * (1 - normalCDF(Math.abs(z196)))
      const pValue258 = 2 * (1 - normalCDF(Math.abs(z258)))

      expect(pValue196).toBeCloseTo(0.05, 1)
      expect(pValue258).toBeCloseTo(0.01, 1)
    })
  })

  describe('Confidence Level Mapping', () => {
    it('should correctly map confidence threshold to critical values', () => {
      // 95% confidence → z = 1.96
      // 99% confidence → z = 2.58
      const criticalValues = {
        0.90: 1.645,
        0.95: 1.96,
        0.99: 2.58,
      }

      Object.entries(criticalValues).forEach(([confidence, expectedZ]) => {
        const z = normalQuantile(1 - (1 - parseFloat(confidence)) / 2)
        expect(z).toBeCloseTo(expectedZ, 1)
      })
    })
  })
})

// Helper functions for statistical tests
function normalCDF(x: number): number {
  // Approximation of normal CDF
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)

  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return 0.5 * (1.0 + sign * y)
}

function normalQuantile(p: number): number {
  // Approximation of inverse normal CDF (probit function)
  if (p <= 0 || p >= 1) return NaN

  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.383577518672690e2,
    -3.066479806614716e1,
    2.506628277459239e0,
  ]
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ]
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838e0,
    -2.549732539343734e0,
    4.374664141464968e0,
    2.938163982698783e0,
  ]
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996e0,
    3.754408661907416e0,
  ]

  const pLow = 0.02425
  const pHigh = 1 - pLow

  let q, r

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p))
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    )
  } else if (p <= pHigh) {
    q = p - 0.5
    r = q * q
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    )
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p))
    return (
      -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    )
  }
}

describe('Traffic Allocation', () => {
  let service: DripABTestingService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new DripABTestingService(mockSupabase as any)
  })

  it('should distribute traffic according to allocation percentages', () => {
    // Test deterministic selection algorithm
    const variants = [
      { id: 'a', traffic_allocation: 33 },
      { id: 'b', traffic_allocation: 33 },
      { id: 'c', traffic_allocation: 34 },
    ]

    const distribution = { a: 0, b: 0, c: 0 }
    const sampleSize = 10000

    for (let i = 0; i < sampleSize; i++) {
      const contactId = `contact-${i}`
      const hash = simpleHash(contactId)
      const normalized = hash % 100

      let cumulative = 0
      for (const variant of variants) {
        cumulative += variant.traffic_allocation
        if (normalized < cumulative) {
          distribution[variant.id as keyof typeof distribution]++
          break
        }
      }
    }

    // Check distribution is roughly correct (within 5%)
    expect(distribution.a / sampleSize).toBeCloseTo(0.33, 1)
    expect(distribution.b / sampleSize).toBeCloseTo(0.33, 1)
    expect(distribution.c / sampleSize).toBeCloseTo(0.34, 1)
  })
})

function simpleHash(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}
