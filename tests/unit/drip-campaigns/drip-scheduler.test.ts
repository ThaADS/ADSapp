/**
 * Drip Message Scheduler Tests
 *
 * Comprehensive unit tests for the drip campaign message scheduler
 * covering organization processing and error handling.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock the Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => mockSupabaseClient),
  select: jest.fn(() => mockSupabaseClient),
  eq: jest.fn(() => mockSupabaseClient),
  single: jest.fn(),
  insert: jest.fn(() => mockSupabaseClient),
  update: jest.fn(() => mockSupabaseClient),
  delete: jest.fn(() => mockSupabaseClient),
}

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))

// Mock the DripCampaignEngine
const mockProcessDueMessages = jest.fn()
jest.mock('@/lib/whatsapp/drip-campaigns', () => ({
  DripCampaignEngine: jest.fn().mockImplementation(() => ({
    processDueMessages: mockProcessDueMessages,
  })),
}))

// Import after mocks
import {
  processDripMessagesForOrganization,
  processAllOrganizations,
} from '@/lib/schedulers/drip-message-scheduler'

// ============================================================================
// TEST SETUP
// ============================================================================

describe('Drip Message Scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  // ============================================================================
  // processDripMessagesForOrganization Tests
  // ============================================================================

  describe('processDripMessagesForOrganization', () => {
    it('should process messages for a single organization successfully', async () => {
      mockProcessDueMessages.mockResolvedValue({
        processed: 5,
        failed: 0,
        errors: [],
      })

      const result = await processDripMessagesForOrganization('org_123')

      expect(result).toEqual({
        organizationId: 'org_123',
        processed: 5,
        failed: 0,
        errors: [],
      })
    })

    it('should handle partial failures', async () => {
      mockProcessDueMessages.mockResolvedValue({
        processed: 3,
        failed: 2,
        errors: ['Message 4 failed: Invalid phone', 'Message 5 failed: API error'],
      })

      const result = await processDripMessagesForOrganization('org_123')

      expect(result).toEqual({
        organizationId: 'org_123',
        processed: 3,
        failed: 2,
        errors: ['Message 4 failed: Invalid phone', 'Message 5 failed: API error'],
      })
    })

    it('should handle engine errors gracefully', async () => {
      mockProcessDueMessages.mockRejectedValue(new Error('Database connection failed'))

      const result = await processDripMessagesForOrganization('org_123')

      expect(result).toEqual({
        organizationId: 'org_123',
        processed: 0,
        failed: 0,
        errors: ['Database connection failed'],
      })
    })

    it('should handle unknown errors', async () => {
      mockProcessDueMessages.mockRejectedValue('Unknown error type')

      const result = await processDripMessagesForOrganization('org_123')

      expect(result).toEqual({
        organizationId: 'org_123',
        processed: 0,
        failed: 0,
        errors: ['Unknown error'],
      })
    })

    it('should log processing start and end', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      mockProcessDueMessages.mockResolvedValue({
        processed: 1,
        failed: 0,
        errors: [],
      })

      await processDripMessagesForOrganization('org_123')

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing messages for organization: org_123')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Organization org_123: 1 processed, 0 failed')
      )

      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // processAllOrganizations Tests
  // ============================================================================

  describe('processAllOrganizations', () => {
    it('should process all organizations with active campaigns', async () => {
      // Mock the database query for active campaigns
      mockSupabaseClient.eq.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({
          data: [
            { organization_id: 'org_1' },
            { organization_id: 'org_2' },
            { organization_id: 'org_3' },
          ],
          error: null,
        }),
      })

      mockProcessDueMessages
        .mockResolvedValueOnce({ processed: 5, failed: 0, errors: [] })
        .mockResolvedValueOnce({ processed: 3, failed: 1, errors: ['Error in org_2'] })
        .mockResolvedValueOnce({ processed: 2, failed: 0, errors: [] })

      const result = await processAllOrganizations()

      expect(result).toEqual({
        totalOrganizations: 3,
        totalProcessed: 10,
        totalFailed: 1,
        organizationResults: [
          { organizationId: 'org_1', processed: 5, failed: 0, errors: [] },
          { organizationId: 'org_2', processed: 3, failed: 1, errors: ['Error in org_2'] },
          { organizationId: 'org_3', processed: 2, failed: 0, errors: [] },
        ],
      })
    })

    it('should handle empty organization list', async () => {
      mockSupabaseClient.eq.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const result = await processAllOrganizations()

      expect(result).toEqual({
        totalOrganizations: 0,
        totalProcessed: 0,
        totalFailed: 0,
        organizationResults: [],
      })
    })

    it('should handle null data response', async () => {
      mockSupabaseClient.eq.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      })

      const result = await processAllOrganizations()

      expect(result).toEqual({
        totalOrganizations: 0,
        totalProcessed: 0,
        totalFailed: 0,
        organizationResults: [],
      })
    })

    it('should deduplicate organizations with multiple campaigns', async () => {
      // Same org appears multiple times (multiple active campaigns)
      mockSupabaseClient.eq.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({
          data: [
            { organization_id: 'org_1' },
            { organization_id: 'org_1' },
            { organization_id: 'org_2' },
            { organization_id: 'org_1' },
          ],
          error: null,
        }),
      })

      mockProcessDueMessages
        .mockResolvedValueOnce({ processed: 5, failed: 0, errors: [] })
        .mockResolvedValueOnce({ processed: 3, failed: 0, errors: [] })

      const result = await processAllOrganizations()

      // Should only process 2 unique orgs
      expect(result.totalOrganizations).toBe(2)
      expect(mockProcessDueMessages).toHaveBeenCalledTimes(2)
    })

    it('should handle database query error', async () => {
      mockSupabaseClient.eq.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection timeout' },
        }),
      })

      await expect(processAllOrganizations()).rejects.toThrow(
        'Failed to get organizations: Database connection timeout'
      )
    })

    it('should continue processing after individual org failure', async () => {
      mockSupabaseClient.eq.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({
          data: [
            { organization_id: 'org_1' },
            { organization_id: 'org_2' },
            { organization_id: 'org_3' },
          ],
          error: null,
        }),
      })

      mockProcessDueMessages
        .mockResolvedValueOnce({ processed: 5, failed: 0, errors: [] })
        .mockRejectedValueOnce(new Error('Critical failure'))
        .mockResolvedValueOnce({ processed: 2, failed: 0, errors: [] })

      const result = await processAllOrganizations()

      // Should still process all 3 orgs
      expect(result.totalOrganizations).toBe(3)
      expect(result.totalProcessed).toBe(7)
      expect(result.organizationResults[1].errors).toContain('Critical failure')
    })

    it('should log processing summary', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()

      mockSupabaseClient.eq.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({
          data: [{ organization_id: 'org_1' }],
          error: null,
        }),
      })

      mockProcessDueMessages.mockResolvedValue({ processed: 5, failed: 0, errors: [] })

      await processAllOrganizations()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting scheduled drip message processing')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing 1 organizations')
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Completed in \d+\.\d+s: 5 messages processed, 0 failed/)
      )

      consoleSpy.mockRestore()
    })
  })

  // ============================================================================
  // Environment Variable Tests
  // ============================================================================

  describe('Environment Configuration', () => {
    it('should throw error when SUPABASE_URL is missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL

      // The error is thrown when getAdminClient is called internally
      // We need to re-import to test this, or handle it at the module level
      // For now, we'll test that the function handles missing env gracefully
      await expect(processDripMessagesForOrganization('org_123')).rejects.toThrow(
        'Missing Supabase environment variables'
      )
    })

    it('should throw error when SERVICE_ROLE_KEY is missing', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY

      await expect(processDripMessagesForOrganization('org_123')).rejects.toThrow(
        'Missing Supabase environment variables'
      )
    })
  })

  // ============================================================================
  // Performance Tests
  // ============================================================================

  describe('Performance', () => {
    it('should process organizations sequentially', async () => {
      const processingOrder: string[] = []

      mockSupabaseClient.eq.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({
          data: [
            { organization_id: 'org_1' },
            { organization_id: 'org_2' },
            { organization_id: 'org_3' },
          ],
          error: null,
        }),
      })

      mockProcessDueMessages.mockImplementation(async (orgId: string) => {
        processingOrder.push(orgId)
        return { processed: 1, failed: 0, errors: [] }
      })

      await processAllOrganizations()

      // Verify sequential processing order
      expect(processingOrder).toEqual(['org_1', 'org_2', 'org_3'])
    })

    it('should complete within reasonable time for many organizations', async () => {
      const orgs = Array.from({ length: 100 }, (_, i) => ({ organization_id: `org_${i}` }))

      mockSupabaseClient.eq.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({
          data: orgs,
          error: null,
        }),
      })

      mockProcessDueMessages.mockResolvedValue({ processed: 0, failed: 0, errors: [] })

      const startTime = Date.now()
      const result = await processAllOrganizations()
      const duration = Date.now() - startTime

      expect(result.totalOrganizations).toBe(100)
      // Should complete in reasonable time (mocked calls should be fast)
      expect(duration).toBeLessThan(5000)
    })
  })

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle very long organization IDs', async () => {
      const longOrgId = 'org_' + 'a'.repeat(200)

      mockProcessDueMessages.mockResolvedValue({ processed: 1, failed: 0, errors: [] })

      const result = await processDripMessagesForOrganization(longOrgId)

      expect(result.organizationId).toBe(longOrgId)
    })

    it('should handle special characters in organization IDs', async () => {
      const specialOrgId = 'org_special-chars_123_test'

      mockProcessDueMessages.mockResolvedValue({ processed: 1, failed: 0, errors: [] })

      const result = await processDripMessagesForOrganization(specialOrgId)

      expect(result.organizationId).toBe(specialOrgId)
    })

    it('should handle zero messages to process', async () => {
      mockProcessDueMessages.mockResolvedValue({ processed: 0, failed: 0, errors: [] })

      const result = await processDripMessagesForOrganization('org_empty')

      expect(result).toEqual({
        organizationId: 'org_empty',
        processed: 0,
        failed: 0,
        errors: [],
      })
    })

    it('should handle all messages failing', async () => {
      mockProcessDueMessages.mockResolvedValue({
        processed: 0,
        failed: 10,
        errors: [
          'Message 1 failed',
          'Message 2 failed',
          'Message 3 failed',
          'Message 4 failed',
          'Message 5 failed',
          'Message 6 failed',
          'Message 7 failed',
          'Message 8 failed',
          'Message 9 failed',
          'Message 10 failed',
        ],
      })

      const result = await processDripMessagesForOrganization('org_failing')

      expect(result.processed).toBe(0)
      expect(result.failed).toBe(10)
      expect(result.errors).toHaveLength(10)
    })
  })
})

// ============================================================================
// Integration-like Tests (with mocked dependencies)
// ============================================================================

describe('Drip Scheduler Integration Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'
  })

  it('should process a typical production scenario', async () => {
    // Setup: Multiple orgs with varying results
    mockSupabaseClient.eq.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({
        data: [
          { organization_id: 'org_enterprise' },
          { organization_id: 'org_startup' },
          { organization_id: 'org_smb' },
        ],
        error: null,
      }),
    })

    // Enterprise org: high volume
    mockProcessDueMessages
      .mockResolvedValueOnce({ processed: 500, failed: 5, errors: ['5 rate limited'] })
      // Startup: low volume
      .mockResolvedValueOnce({ processed: 10, failed: 0, errors: [] })
      // SMB: medium volume
      .mockResolvedValueOnce({ processed: 50, failed: 2, errors: ['2 invalid phones'] })

    const result = await processAllOrganizations()

    expect(result.totalOrganizations).toBe(3)
    expect(result.totalProcessed).toBe(560)
    expect(result.totalFailed).toBe(7)
  })

  it('should handle rate limiting across organizations', async () => {
    mockSupabaseClient.eq.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({
        data: [
          { organization_id: 'org_1' },
          { organization_id: 'org_2' },
        ],
        error: null,
      }),
    })

    // First org hits rate limit
    mockProcessDueMessages
      .mockResolvedValueOnce({
        processed: 100,
        failed: 50,
        errors: Array(50).fill('Rate limited'),
      })
      // Second org processes normally
      .mockResolvedValueOnce({ processed: 30, failed: 0, errors: [] })

    const result = await processAllOrganizations()

    // Both orgs should be processed despite rate limiting
    expect(result.totalOrganizations).toBe(2)
    expect(result.totalProcessed).toBe(130)
    expect(result.organizationResults[0].failed).toBe(50)
    expect(result.organizationResults[1].failed).toBe(0)
  })

  it('should handle database reconnection scenarios', async () => {
    mockSupabaseClient.eq.mockReturnValueOnce({
      eq: jest.fn().mockResolvedValue({
        data: [{ organization_id: 'org_1' }],
        error: null,
      }),
    })

    // First call fails, but org processing handles it
    mockProcessDueMessages.mockRejectedValueOnce(new Error('Connection reset'))

    const result = await processAllOrganizations()

    expect(result.totalOrganizations).toBe(1)
    expect(result.organizationResults[0].errors).toContain('Connection reset')
  })
})
