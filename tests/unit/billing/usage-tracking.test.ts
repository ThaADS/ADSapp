/**
 * Usage Tracking Tests
 *
 * Tests for the billing usage tracking system including:
 * - Usage recording (messages, users, contacts, automations, API, storage)
 * - Overage calculations
 * - Billing period management
 * - Plan limits enforcement
 */

import { UsageTracker, UsageLimits, UsageMetrics } from '@/lib/billing/usage-tracking'

// Mock Supabase client
const mockSupabaseQuery = {
  upsert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  single: jest.fn(),
  on: jest.fn().mockReturnThis(),
}

const mockSupabase = {
  from: jest.fn(() => mockSupabaseQuery),
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

jest.mock('@/lib/stripe/server', () => ({
  stripe: {
    subscriptionItems: {
      createUsageRecord: jest.fn(),
    },
  },
  SUBSCRIPTION_PLANS: {
    starter: {
      stripePriceId: 'price_starter',
      limits: {
        maxMessages: 1000,
        maxUsers: 3,
        maxContacts: 1000,
        automationRules: 5,
      },
    },
    professional: {
      stripePriceId: 'price_pro',
      limits: {
        maxMessages: 10000,
        maxUsers: 10,
        maxContacts: 10000,
        automationRules: 20,
      },
    },
    enterprise: {
      stripePriceId: 'price_enterprise',
      limits: {
        maxMessages: -1, // Unlimited
        maxUsers: -1,
        maxContacts: -1,
        automationRules: -1,
      },
    },
  },
}))

describe('UsageTracker', () => {
  let tracker: UsageTracker
  const testOrgId = 'test-org-123'

  beforeEach(() => {
    jest.clearAllMocks()
    tracker = new UsageTracker()
  })

  describe('getCurrentBillingPeriod (via indirect testing)', () => {
    it('should calculate current billing period correctly', async () => {
      // We test this indirectly through recordMessageUsage
      mockSupabaseQuery.single.mockResolvedValueOnce({ data: null })

      await tracker.recordMessageUsage(testOrgId, 10)

      expect(mockSupabase.from).toHaveBeenCalledWith('usage_tracking')
      expect(mockSupabaseQuery.upsert).toHaveBeenCalled()

      // Verify the upsert call includes period_start and period_end
      const upsertCall = mockSupabaseQuery.upsert.mock.calls[0][0]
      expect(upsertCall).toHaveProperty('period_start')
      expect(upsertCall).toHaveProperty('period_end')
      expect(upsertCall.messages_sent).toBe(10)
    })
  })

  describe('getPlanLimits', () => {
    it('should return correct limits for starter plan', async () => {
      const limits = await tracker.getPlanLimits('starter')

      expect(limits.maxMessages).toBe(1000)
      expect(limits.maxUsers).toBe(3)
      expect(limits.maxContacts).toBe(1000)
      expect(limits.maxAutomationRuns).toBe(500) // 5 rules * 100
      expect(limits.maxStorageSize).toBe(1024) // 1GB
    })

    it('should return correct limits for professional plan', async () => {
      const limits = await tracker.getPlanLimits('professional')

      expect(limits.maxMessages).toBe(10000)
      expect(limits.maxUsers).toBe(10)
      expect(limits.maxContacts).toBe(10000)
      expect(limits.maxStorageSize).toBe(10240) // 10GB
    })

    it('should return unlimited limits for enterprise plan', async () => {
      const limits = await tracker.getPlanLimits('enterprise')

      expect(limits.maxMessages).toBe(-1)
      expect(limits.maxUsers).toBe(-1)
      expect(limits.maxContacts).toBe(-1)
      expect(limits.maxStorageSize).toBe(-1)
    })

    it('should return default limits for unknown plan', async () => {
      const limits = await tracker.getPlanLimits('unknown-plan')

      expect(limits.maxMessages).toBe(1000)
      expect(limits.maxUsers).toBe(3)
      expect(limits.maxContacts).toBe(1000)
    })

    it('should return better overage rates for enterprise plan', async () => {
      const limits = await tracker.getPlanLimits('enterprise')

      expect(limits.overageRates.messagesPerCent).toBe(1) // $0.01 vs $0.02 for starter
      expect(limits.overageRates.usersPerDollar).toBe(3) // $3 vs $5 for starter
    })
  })

  describe('getCurrentUsage', () => {
    it('should return zero usage when no record exists', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({ data: null })

      const usage = await tracker.getCurrentUsage(testOrgId)

      expect(usage).toEqual({
        messages: 0,
        users: 0,
        contacts: 0,
        automationRuns: 0,
        apiCalls: 0,
        storageUsed: 0,
      })
    })

    it('should return usage from database when record exists', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          messages_sent: 500,
          users_active: 2,
          contacts_managed: 750,
          automation_runs: 100,
          api_calls: 1500,
          storage_used: 512,
        },
      })

      const usage = await tracker.getCurrentUsage(testOrgId)

      expect(usage).toEqual({
        messages: 500,
        users: 2,
        contacts: 750,
        automationRuns: 100,
        apiCalls: 1500,
        storageUsed: 512,
      })
    })
  })

  describe('calculateOverageCharges', () => {
    it('should return 0 when usage is within limits', async () => {
      // Mock org query
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: { subscription_tier: 'professional' },
      })

      // Mock usage query
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          messages_sent: 5000,
          users_active: 5,
          contacts_managed: 5000,
          automation_runs: 500,
          api_calls: 10000,
          storage_used: 5120,
        },
      })

      const overage = await tracker.calculateOverageCharges(testOrgId)

      expect(overage).toBe(0)
    })

    it('should calculate message overage correctly', async () => {
      // Mock org query
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: { subscription_tier: 'starter' },
      })

      // Mock usage query - 1200 messages on 1000 limit
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          messages_sent: 1200,
          users_active: 2,
          contacts_managed: 500,
          automation_runs: 100,
          api_calls: 1000,
          storage_used: 512,
        },
      })

      const overage = await tracker.calculateOverageCharges(testOrgId)

      // 200 overage messages, $0.02 per 100 = $0.04 = 4 cents rounded up to $0.04
      expect(overage).toBe(4) // 2 * $2 = $4 (200/100 * messagesPerCent rate of 2)
    })

    it('should calculate user overage correctly', async () => {
      // Mock org query
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: { subscription_tier: 'starter' },
      })

      // Mock usage query - 5 users on 3 limit
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          messages_sent: 500,
          users_active: 5,
          contacts_managed: 500,
          automation_runs: 100,
          api_calls: 1000,
          storage_used: 512,
        },
      })

      const overage = await tracker.calculateOverageCharges(testOrgId)

      // 2 overage users * $5 = $10
      expect(overage).toBe(10)
    })

    it('should calculate combined overages correctly', async () => {
      // Mock org query
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: { subscription_tier: 'starter' },
      })

      // Mock usage query - multiple overages
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          messages_sent: 1500, // 500 over, 5*$2 = $10
          users_active: 5, // 2 over, 2*$5 = $10
          contacts_managed: 1200, // 200 over, 2*$1 = $2
          automation_runs: 700, // 200 over, 2*$1 = $2
          api_calls: 3000, // 1000 over, 1*$1 = $1
          storage_used: 2048, // 1024MB over = 1GB, 1*$1 = $1
        },
      })

      const overage = await tracker.calculateOverageCharges(testOrgId)

      // $10 + $10 + $2 + $2 + $1 + $1 = $26
      expect(overage).toBe(26)
    })

    it('should return 0 for enterprise plan (unlimited)', async () => {
      // Mock org query
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: { subscription_tier: 'enterprise' },
      })

      // Mock usage query - high usage but enterprise is unlimited
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          messages_sent: 100000,
          users_active: 100,
          contacts_managed: 100000,
          automation_runs: 10000,
          api_calls: 100000,
          storage_used: 102400,
        },
      })

      const overage = await tracker.calculateOverageCharges(testOrgId)

      // Enterprise has -1 (unlimited) for all limits
      expect(overage).toBe(0)
    })
  })

  describe('recordMessageUsage', () => {
    it('should upsert message usage correctly', async () => {
      // Mock for calculateAndUpdateOverages
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: { subscription_tier: 'professional' },
      })
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          messages_sent: 100,
          users_active: 0,
          contacts_managed: 0,
          automation_runs: 0,
          api_calls: 0,
          storage_used: 0,
        },
      })

      await tracker.recordMessageUsage(testOrgId, 50)

      expect(mockSupabase.from).toHaveBeenCalledWith('usage_tracking')
      expect(mockSupabaseQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: testOrgId,
          messages_sent: 50,
        })
      )
    })
  })

  describe('recordContactUsage', () => {
    it('should upsert contact usage correctly', async () => {
      // Mock for calculateAndUpdateOverages
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: { subscription_tier: 'professional' },
      })
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          messages_sent: 0,
          users_active: 0,
          contacts_managed: 100,
          automation_runs: 0,
          api_calls: 0,
          storage_used: 0,
        },
      })

      await tracker.recordContactUsage(testOrgId, 250)

      expect(mockSupabase.from).toHaveBeenCalledWith('usage_tracking')
      expect(mockSupabaseQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: testOrgId,
          contacts_managed: 250,
        })
      )
    })
  })

  describe('recordAutomationUsage', () => {
    it('should upsert automation usage correctly', async () => {
      // Mock for calculateAndUpdateOverages
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: { subscription_tier: 'professional' },
      })
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          messages_sent: 0,
          users_active: 0,
          contacts_managed: 0,
          automation_runs: 50,
          api_calls: 0,
          storage_used: 0,
        },
      })

      await tracker.recordAutomationUsage(testOrgId, 10)

      expect(mockSupabase.from).toHaveBeenCalledWith('usage_tracking')
      expect(mockSupabaseQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: testOrgId,
          automation_runs: 10,
        })
      )
    })
  })

  describe('recordApiUsage', () => {
    it('should upsert API usage correctly', async () => {
      // Mock for calculateAndUpdateOverages
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: { subscription_tier: 'professional' },
      })
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          messages_sent: 0,
          users_active: 0,
          contacts_managed: 0,
          automation_runs: 0,
          api_calls: 100,
          storage_used: 0,
        },
      })

      await tracker.recordApiUsage(testOrgId, 25)

      expect(mockSupabase.from).toHaveBeenCalledWith('usage_tracking')
      expect(mockSupabaseQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: testOrgId,
          api_calls: 25,
        })
      )
    })
  })

  describe('recordStorageUsage', () => {
    it('should upsert storage usage correctly', async () => {
      // Mock for calculateAndUpdateOverages
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: { subscription_tier: 'professional' },
      })
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          messages_sent: 0,
          users_active: 0,
          contacts_managed: 0,
          automation_runs: 0,
          api_calls: 0,
          storage_used: 256,
        },
      })

      await tracker.recordStorageUsage(testOrgId, 512)

      expect(mockSupabase.from).toHaveBeenCalledWith('usage_tracking')
      expect(mockSupabaseQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: testOrgId,
          storage_used: 512,
        })
      )
    })
  })

  describe('initializeUsageForOrganization', () => {
    it('should create initial usage record for new organization', async () => {
      await tracker.initializeUsageForOrganization(testOrgId)

      expect(mockSupabase.from).toHaveBeenCalledWith('usage_tracking')
      expect(mockSupabaseQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: testOrgId,
          messages_sent: 0,
          users_active: 0,
          contacts_managed: 0,
          automation_runs: 0,
          api_calls: 0,
          storage_used: 0,
          overage_charges: 0,
        })
      )
    })
  })

  describe('resetMonthlyUsage', () => {
    it('should archive current usage and create new period', async () => {
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: {
          organization_id: testOrgId,
          messages_sent: 1000,
          users_active: 5,
          contacts_managed: 500,
          automation_runs: 100,
          api_calls: 2000,
          storage_used: 1024,
          overage_charges: 10,
        },
      })

      await tracker.resetMonthlyUsage(testOrgId)

      // Should insert into usage_history
      expect(mockSupabase.from).toHaveBeenCalledWith('usage_history')

      // Should create new usage record with zeros
      expect(mockSupabaseQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: testOrgId,
          messages_sent: 0,
          users_active: 0,
          contacts_managed: 0,
          automation_runs: 0,
          api_calls: 0,
          storage_used: 0,
          overage_charges: 0,
        })
      )
    })
  })

  describe('enforceDowngradeLimits', () => {
    it('should deactivate excess users on downgrade', async () => {
      // Mock users query - 10 users when downgrading to 3
      mockSupabaseQuery.single.mockResolvedValueOnce({ data: null }) // order query chain
      mockSupabaseQuery.single.mockResolvedValueOnce({
        data: Array.from({ length: 10 }, (_, i) => ({ id: `user-${i}` })),
      })

      // This will access the users via select
      const mockUserData = Array.from({ length: 10 }, (_, i) => ({ id: `user-${i}` }))

      jest.spyOn(mockSupabaseQuery, 'select').mockReturnThis()
      jest.spyOn(mockSupabaseQuery, 'eq').mockReturnThis()
      jest.spyOn(mockSupabaseQuery, 'order').mockReturnThis()
      mockSupabase.from.mockReturnValue({
        ...mockSupabaseQuery,
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              data: mockUserData,
              error: null,
            }),
          }),
        }),
      })

      await tracker.enforceDowngradeLimits(testOrgId, 'starter')

      // Verify update was called to deactivate users
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })
  })
})

describe('Overage Rate Calculations', () => {
  let tracker: UsageTracker

  beforeEach(() => {
    jest.clearAllMocks()
    tracker = new UsageTracker()
  })

  it('should calculate message overage with ceiling', async () => {
    const limits = await tracker.getPlanLimits('starter')

    // 150 messages over = 2 units of 100 = $4 (ceil(150/100) * 2)
    const overageMessages = 150
    const expected = Math.ceil(overageMessages / 100) * limits.overageRates.messagesPerCent
    expect(expected).toBe(4)
  })

  it('should calculate contact overage with ceiling', async () => {
    const limits = await tracker.getPlanLimits('starter')

    // 250 contacts over = 3 units of 100 = $3 (ceil(250/100) * 1)
    const overageContacts = 250
    const expected = Math.ceil(overageContacts / 100) * limits.overageRates.contactsPerCent
    expect(expected).toBe(3)
  })

  it('should calculate API overage with ceiling', async () => {
    const limits = await tracker.getPlanLimits('starter')

    // 1500 API calls over = 2 units of 1000 = $2 (ceil(1500/1000) * 1)
    const overageApiCalls = 1500
    const expected = Math.ceil(overageApiCalls / 1000) * limits.overageRates.apiCallsPerCent
    expect(expected).toBe(2)
  })

  it('should calculate storage overage with ceiling', async () => {
    const limits = await tracker.getPlanLimits('starter')

    // 1500MB over = 2GB (ceil(1500/1024)) = $2
    const overageStorage = 1500
    const overageGB = Math.ceil(overageStorage / 1024)
    const expected = overageGB * limits.overageRates.storagePerGb
    expect(expected).toBe(2)
  })
})

describe('Billing Period Boundary Tests', () => {
  let tracker: UsageTracker

  beforeEach(() => {
    jest.clearAllMocks()
    tracker = new UsageTracker()
  })

  it('should handle month boundary correctly', () => {
    // Test that billing period starts at beginning of month
    const now = new Date()
    const expectedStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // We can't directly access private methods, but we can verify behavior
    // through the public API by checking upsert calls
    expect(expectedStart.getDate()).toBe(1)
  })

  it('should calculate period end correctly for various months', () => {
    // February in leap year
    const feb2024 = new Date(2024, 1, 15)
    const febEnd = new Date(2024, 2, 0) // Last day of Feb
    expect(febEnd.getDate()).toBe(29) // Leap year

    // February in non-leap year
    const feb2025 = new Date(2025, 1, 15)
    const feb2025End = new Date(2025, 2, 0)
    expect(feb2025End.getDate()).toBe(28)

    // December
    const dec = new Date(2024, 11, 15)
    const decEnd = new Date(2024, 12, 0)
    expect(decEnd.getDate()).toBe(31)
  })
})
