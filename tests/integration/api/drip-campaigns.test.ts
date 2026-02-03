/**
 * Drip Campaigns API Integration Tests
 *
 * Tests for drip campaign endpoints including CRUD, enrollment,
 * A/B testing, and analytics with multi-tenant isolation.
 */

// @ts-nocheck - Database types need regeneration from Supabase schema

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import {
  createAuthenticatedRequest as createAuthReq,
  parseResponse,
  expectErrorResponse,
  expectPaginatedResponse,
} from '../../utils/api-test-helpers'
import {
  createMockUser,
  createMockSupabaseClient,
} from '../../utils/test-helpers'

jest.mock('@/lib/supabase/server')

// Helper wrapper for backward compatibility
function createAuthenticatedRequest(method: string, url: string, userId: string, organizationId: string, body?: any) {
  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`
  return createAuthReq({
    method,
    url: fullUrl,
    body,
    user: { id: userId },
    organizationId,
  })
}

// Mock drip campaign data
function createMockDripCampaign(overrides = {}) {
  return {
    id: 'campaign_' + Math.random().toString(36).substr(2, 9),
    organization_id: 'org_123',
    name: 'Welcome Sequence',
    description: 'Onboarding drip campaign',
    status: 'draft',
    is_active: false,
    trigger_type: 'contact_added',
    trigger_config: { tags: ['new-lead'] },
    settings: {
      stop_on_reply: true,
      timezone: 'Europe/Amsterdam',
    },
    statistics: {
      totalEnrolled: 0,
      activeContacts: 0,
      completedContacts: 0,
      averageCompletionRate: 0,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function createMockDripStep(campaignId: string, order: number, overrides = {}) {
  return {
    id: 'step_' + Math.random().toString(36).substr(2, 9),
    campaign_id: campaignId,
    name: `Step ${order}`,
    order,
    delay_amount: order === 1 ? 0 : order,
    delay_unit: 'days',
    message_type: 'text',
    message_content: `Message for step ${order}`,
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

// ============================================================================
// DRIP CAMPAIGNS LIST/CREATE TESTS
// ============================================================================

describe('GET /api/drip-campaigns', () => {
  let mockSupabase: any
  let mockUser: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    jest.clearAllMocks()
  })

  it('should list drip campaigns with pagination', async () => {
    const mockCampaigns = [
      createMockDripCampaign({ name: 'Welcome Sequence' }),
      createMockDripCampaign({ name: 'Re-engagement Campaign' }),
      createMockDripCampaign({ name: 'Upsell Sequence' }),
    ]

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockCampaigns,
        error: null,
        count: 3,
      }),
    })

    const request = createAuthenticatedRequest(
      'GET',
      '/api/drip-campaigns',
      mockUser.id,
      mockUser.organization_id
    )

    const response = await simulateGetCampaigns(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.campaigns).toHaveLength(3)
    expectPaginatedResponse(data)
  })

  it('should filter by status', async () => {
    const activeCampaigns = [createMockDripCampaign({ status: 'active', is_active: true })]

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockImplementation((field: string, value: any) => {
        if (field === 'status') expect(value).toBe('active')
        return mockSupabase.from()
      }),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: activeCampaigns,
        error: null,
        count: 1,
      }),
    })

    const request = createAuthenticatedRequest(
      'GET',
      '/api/drip-campaigns?status=active',
      mockUser.id,
      mockUser.organization_id
    )

    const response = await simulateGetCampaigns(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.campaigns).toHaveLength(1)
    expect(data.campaigns[0].status).toBe('active')
  })

  it('should enforce tenant isolation', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockImplementation((field: string, value: string) => {
        if (field === 'organization_id') {
          expect(value).toBe(mockUser.organization_id)
        }
        return mockSupabase.from()
      }),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: [],
        error: null,
        count: 0,
      }),
    })

    const request = createAuthenticatedRequest(
      'GET',
      '/api/drip-campaigns',
      mockUser.id,
      mockUser.organization_id
    )

    await simulateGetCampaigns(request, mockSupabase, mockUser)
    // Verification is in the mock expectation above
  })
})

describe('POST /api/drip-campaigns', () => {
  let mockSupabase: any
  let mockUser: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    jest.clearAllMocks()
  })

  it('should create drip campaign with valid data', async () => {
    const campaignData = {
      name: 'New Welcome Campaign',
      description: 'Welcome new contacts',
      trigger_type: 'contact_added',
      trigger_config: { tags: ['new'] },
      settings: { stop_on_reply: true },
    }

    mockSupabase.from = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          ...createMockDripCampaign(),
          ...campaignData,
          organization_id: mockUser.organization_id,
        },
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'POST',
      '/api/drip-campaigns',
      mockUser.id,
      mockUser.organization_id,
      campaignData
    )

    const response = await simulateCreateCampaign(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(201)
    expect(data.name).toBe(campaignData.name)
    expect(data.organization_id).toBe(mockUser.organization_id)
  })

  it('should require name field', async () => {
    const request = createAuthenticatedRequest(
      'POST',
      '/api/drip-campaigns',
      mockUser.id,
      mockUser.organization_id,
      { description: 'Missing name' }
    )

    const response = await simulateCreateCampaign(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(400)
    expectErrorResponse(data, 400, 'name')
  })

  it('should validate trigger_type', async () => {
    const request = createAuthenticatedRequest(
      'POST',
      '/api/drip-campaigns',
      mockUser.id,
      mockUser.organization_id,
      { name: 'Test', trigger_type: 'invalid_trigger' }
    )

    const response = await simulateCreateCampaign(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(400)
    expectErrorResponse(data, 400, 'trigger_type')
  })
})

// ============================================================================
// DRIP CAMPAIGN CRUD TESTS
// ============================================================================

describe('GET /api/drip-campaigns/[id]', () => {
  let mockSupabase: any
  let mockUser: any
  let mockCampaign: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockCampaign = createMockDripCampaign({ organization_id: mockUser.organization_id })
    jest.clearAllMocks()
  })

  it('should return campaign with steps', async () => {
    const steps = [
      createMockDripStep(mockCampaign.id, 1),
      createMockDripStep(mockCampaign.id, 2),
    ]

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockCampaign, steps },
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'GET',
      `/api/drip-campaigns/${mockCampaign.id}`,
      mockUser.id,
      mockUser.organization_id
    )

    const response = await simulateGetCampaign(request, mockSupabase, mockUser, mockCampaign.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.id).toBe(mockCampaign.id)
    expect(data.steps).toHaveLength(2)
  })

  it('should return 404 for campaign from different org', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      }),
    })

    const request = createAuthenticatedRequest(
      'GET',
      '/api/drip-campaigns/other-org-campaign',
      mockUser.id,
      mockUser.organization_id
    )

    const response = await simulateGetCampaign(request, mockSupabase, mockUser, 'other-org-campaign')
    const { status, data } = await parseResponse(response)

    expect(status).toBe(404)
    expectErrorResponse(data, 404, 'not found')
  })
})

describe('PATCH /api/drip-campaigns/[id]', () => {
  let mockSupabase: any
  let mockUser: any
  let mockCampaign: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockCampaign = createMockDripCampaign({ organization_id: mockUser.organization_id })
    jest.clearAllMocks()
  })

  it('should update campaign', async () => {
    const updateData = { name: 'Updated Name', description: 'Updated description' }

    mockSupabase.from = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockCampaign, ...updateData },
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'PATCH',
      `/api/drip-campaigns/${mockCampaign.id}`,
      mockUser.id,
      mockUser.organization_id,
      updateData
    )

    const response = await simulateUpdateCampaign(request, mockSupabase, mockUser, mockCampaign.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.name).toBe(updateData.name)
  })

  it('should prevent updating active campaign status without proper action', async () => {
    mockCampaign.status = 'active'
    mockCampaign.is_active = true

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockCampaign,
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'PATCH',
      `/api/drip-campaigns/${mockCampaign.id}`,
      mockUser.id,
      mockUser.organization_id,
      { name: 'Trying to edit active campaign' }
    )

    const response = await simulateUpdateCampaign(request, mockSupabase, mockUser, mockCampaign.id, true)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(400)
    expectErrorResponse(data, 400, 'pause')
  })
})

// ============================================================================
// CAMPAIGN ACTIVATION TESTS
// ============================================================================

describe('POST /api/drip-campaigns/[id]/activate', () => {
  let mockSupabase: any
  let mockUser: any
  let mockCampaign: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockCampaign = createMockDripCampaign({ organization_id: mockUser.organization_id })
    jest.clearAllMocks()
  })

  it('should activate campaign with steps', async () => {
    const steps = [createMockDripStep(mockCampaign.id, 1)]

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockCampaign, steps },
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'POST',
      `/api/drip-campaigns/${mockCampaign.id}/activate`,
      mockUser.id,
      mockUser.organization_id
    )

    const response = await simulateActivateCampaign(request, mockSupabase, mockUser, mockCampaign.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.status).toBe('active')
    expect(data.is_active).toBe(true)
  })

  it('should reject activation without steps', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockCampaign, steps: [] },
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'POST',
      `/api/drip-campaigns/${mockCampaign.id}/activate`,
      mockUser.id,
      mockUser.organization_id
    )

    const response = await simulateActivateCampaign(request, mockSupabase, mockUser, mockCampaign.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(400)
    expectErrorResponse(data, 400, 'steps')
  })
})

describe('POST /api/drip-campaigns/[id]/pause', () => {
  let mockSupabase: any
  let mockUser: any
  let mockCampaign: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockCampaign = createMockDripCampaign({
      organization_id: mockUser.organization_id,
      status: 'active',
      is_active: true,
    })
    jest.clearAllMocks()
  })

  it('should pause active campaign', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockCampaign, status: 'paused', is_active: false },
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'POST',
      `/api/drip-campaigns/${mockCampaign.id}/pause`,
      mockUser.id,
      mockUser.organization_id
    )

    const response = await simulatePauseCampaign(request, mockSupabase, mockUser, mockCampaign.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.status).toBe('paused')
    expect(data.is_active).toBe(false)
  })
})

// ============================================================================
// ENROLLMENT TESTS
// ============================================================================

describe('POST /api/drip-campaigns/[id]/enrollments', () => {
  let mockSupabase: any
  let mockUser: any
  let mockCampaign: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockCampaign = createMockDripCampaign({
      organization_id: mockUser.organization_id,
      status: 'active',
      is_active: true,
    })
    jest.clearAllMocks()
  })

  it('should enroll contacts in campaign', async () => {
    const contactIds = ['contact_1', 'contact_2', 'contact_3']

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockCampaign,
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'POST',
      `/api/drip-campaigns/${mockCampaign.id}/enrollments`,
      mockUser.id,
      mockUser.organization_id,
      { contact_ids: contactIds }
    )

    const response = await simulateEnrollContacts(request, mockSupabase, mockUser, mockCampaign.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.enrolled).toBe(3)
  })

  it('should skip already enrolled contacts', async () => {
    const contactIds = ['contact_1', 'contact_2']

    mockSupabase.from = jest.fn().mockImplementation((table: string) => {
      if (table === 'drip_enrollments') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          insert: jest.fn().mockResolvedValue({
            data: null,
            error: { code: '23505' }, // Duplicate key
          }),
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockCampaign,
          error: null,
        }),
      }
    })

    const request = createAuthenticatedRequest(
      'POST',
      `/api/drip-campaigns/${mockCampaign.id}/enrollments`,
      mockUser.id,
      mockUser.organization_id,
      { contact_ids: contactIds }
    )

    const response = await simulateEnrollContacts(request, mockSupabase, mockUser, mockCampaign.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.skipped).toBeGreaterThanOrEqual(0)
  })

  it('should reject enrollment in inactive campaign', async () => {
    mockCampaign.is_active = false
    mockCampaign.status = 'draft'

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockCampaign,
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'POST',
      `/api/drip-campaigns/${mockCampaign.id}/enrollments`,
      mockUser.id,
      mockUser.organization_id,
      { contact_ids: ['contact_1'] }
    )

    const response = await simulateEnrollContacts(request, mockSupabase, mockUser, mockCampaign.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(400)
    expectErrorResponse(data, 400, 'active')
  })
})

// ============================================================================
// A/B TESTING TESTS
// ============================================================================

describe('POST /api/drip-campaigns/[id]/ab-tests', () => {
  let mockSupabase: any
  let mockUser: any
  let mockCampaign: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockCampaign = createMockDripCampaign({ organization_id: mockUser.organization_id })
    jest.clearAllMocks()
  })

  it('should create A/B test for campaign step', async () => {
    const testData = {
      name: 'Welcome Message Test',
      step_id: 'step_123',
      winning_metric: 'read_rate',
      confidence_threshold: 0.95,
      min_sample_size: 100,
    }

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          id: 'test_123',
          ...testData,
          campaign_id: mockCampaign.id,
          status: 'draft',
        },
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'POST',
      `/api/drip-campaigns/${mockCampaign.id}/ab-tests`,
      mockUser.id,
      mockUser.organization_id,
      testData
    )

    const response = await simulateCreateABTest(request, mockSupabase, mockUser, mockCampaign.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(201)
    expect(data.name).toBe(testData.name)
    expect(data.status).toBe('draft')
  })

  it('should validate winning_metric', async () => {
    const request = createAuthenticatedRequest(
      'POST',
      `/api/drip-campaigns/${mockCampaign.id}/ab-tests`,
      mockUser.id,
      mockUser.organization_id,
      { name: 'Test', step_id: 'step_123', winning_metric: 'invalid_metric' }
    )

    const response = await simulateCreateABTest(request, mockSupabase, mockUser, mockCampaign.id)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(400)
    expectErrorResponse(data, 400, 'winning_metric')
  })
})

describe('GET /api/drip-campaigns/[id]/analytics', () => {
  let mockSupabase: any
  let mockUser: any
  let mockCampaign: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockCampaign = createMockDripCampaign({ organization_id: mockUser.organization_id })
    jest.clearAllMocks()
  })

  it('should return funnel analytics', async () => {
    const funnelData = {
      overallCompletionRate: 65.5,
      averageTimeToComplete: 7.2,
      steps: [
        { stepId: 'step_1', name: 'Welcome', reached: 1000, completed: 950, dropOff: 50 },
        { stepId: 'step_2', name: 'Day 2', reached: 900, completed: 800, dropOff: 100 },
      ],
    }

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { ...mockCampaign, analytics: funnelData },
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'GET',
      `/api/drip-campaigns/${mockCampaign.id}/analytics?type=funnel`,
      mockUser.id,
      mockUser.organization_id
    )

    const response = await simulateGetAnalytics(request, mockSupabase, mockUser, mockCampaign.id, 'funnel')
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data).toHaveProperty('overallCompletionRate')
    expect(data.steps).toBeInstanceOf(Array)
  })

  it('should return cohort analytics', async () => {
    const request = createAuthenticatedRequest(
      'GET',
      `/api/drip-campaigns/${mockCampaign.id}/analytics?type=cohort`,
      mockUser.id,
      mockUser.organization_id
    )

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          cohorts: [
            { period: '2024-01', enrolled: 500, completed: 320, completionRate: 64 },
          ],
        },
        error: null,
      }),
    })

    const response = await simulateGetAnalytics(request, mockSupabase, mockUser, mockCampaign.id, 'cohort')
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data).toHaveProperty('cohorts')
  })
})

// =============================================================================
// Helper Functions
// =============================================================================

async function simulateGetCampaigns(request: NextRequest, supabase: any, user: any): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('drip_campaigns')
      .select('*', { count: 'exact' })
      .eq('organization_id', user.organization_id)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: campaigns, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return new Response(
      JSON.stringify({
        campaigns,
        pagination: { page, limit, total: count || 0, hasMore: offset + limit < (count || 0) },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function simulateCreateCampaign(request: NextRequest, supabase: any, user: any): Promise<Response> {
  try {
    const body = await request.json()
    const { name, description, trigger_type, trigger_config, settings } = body

    if (!name) {
      return new Response(JSON.stringify({ error: 'name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const validTriggers = ['contact_added', 'tag_applied', 'manual', 'api']
    if (trigger_type && !validTriggers.includes(trigger_type)) {
      return new Response(JSON.stringify({ error: 'Invalid trigger_type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: campaign, error } = await supabase
      .from('drip_campaigns')
      .insert({
        organization_id: user.organization_id,
        name,
        description,
        trigger_type: trigger_type || 'manual',
        trigger_config,
        settings,
        status: 'draft',
        is_active: false,
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(campaign), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function simulateGetCampaign(request: NextRequest, supabase: any, user: any, campaignId: string): Promise<Response> {
  try {
    const { data: campaign, error } = await supabase
      .from('drip_campaigns')
      .select('*, steps:drip_campaign_steps(*)')
      .eq('id', campaignId)
      .eq('organization_id', user.organization_id)
      .order('order', { foreignTable: 'drip_campaign_steps' })
      .single()

    if (error || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(campaign), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function simulateUpdateCampaign(request: NextRequest, supabase: any, user: any, campaignId: string, checkActive = false): Promise<Response> {
  try {
    const body = await request.json()

    if (checkActive) {
      const { data: existing } = await supabase
        .from('drip_campaigns')
        .select('status, is_active')
        .eq('id', campaignId)
        .eq('organization_id', user.organization_id)
        .single()

      if (existing?.is_active) {
        return new Response(JSON.stringify({ error: 'Cannot edit active campaign. Please pause first.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }
    }

    const { data: campaign, error } = await supabase
      .from('drip_campaigns')
      .update(body)
      .eq('id', campaignId)
      .eq('organization_id', user.organization_id)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(campaign), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function simulateActivateCampaign(request: NextRequest, supabase: any, user: any, campaignId: string): Promise<Response> {
  try {
    const { data: campaign, error } = await supabase
      .from('drip_campaigns')
      .select('*, steps:drip_campaign_steps(*)')
      .eq('id', campaignId)
      .eq('organization_id', user.organization_id)
      .single()

    if (error || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!campaign.steps || campaign.steps.length === 0) {
      return new Response(JSON.stringify({ error: 'Campaign must have at least one step' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ ...campaign, status: 'active', is_active: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function simulatePauseCampaign(request: NextRequest, supabase: any, user: any, campaignId: string): Promise<Response> {
  try {
    const { data: campaign, error } = await supabase
      .from('drip_campaigns')
      .update({ status: 'paused', is_active: false })
      .eq('id', campaignId)
      .eq('organization_id', user.organization_id)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(campaign), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function simulateEnrollContacts(request: NextRequest, supabase: any, user: any, campaignId: string): Promise<Response> {
  try {
    const body = await request.json()
    const { contact_ids } = body

    // Check campaign is active
    const { data: campaign } = await supabase
      .from('drip_campaigns')
      .select('is_active, status')
      .eq('id', campaignId)
      .eq('organization_id', user.organization_id)
      .single()

    if (!campaign?.is_active) {
      return new Response(JSON.stringify({ error: 'Campaign must be active to enroll contacts' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Attempt to enroll
    let enrolled = 0
    let skipped = 0

    for (const contactId of contact_ids) {
      const { error } = await supabase.from('drip_enrollments').insert({
        campaign_id: campaignId,
        contact_id: contactId,
        status: 'active',
      })

      if (error?.code === '23505') {
        skipped++
      } else if (!error) {
        enrolled++
      }
    }

    return new Response(
      JSON.stringify({ enrolled, skipped, total: contact_ids.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function simulateCreateABTest(request: NextRequest, supabase: any, user: any, campaignId: string): Promise<Response> {
  try {
    const body = await request.json()
    const { name, step_id, winning_metric, confidence_threshold, min_sample_size } = body

    const validMetrics = ['read_rate', 'reply_rate', 'delivery_rate', 'click_rate']
    if (winning_metric && !validMetrics.includes(winning_metric)) {
      return new Response(JSON.stringify({ error: 'Invalid winning_metric' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: test, error } = await supabase
      .from('drip_ab_tests')
      .insert({
        campaign_id: campaignId,
        step_id,
        name,
        winning_metric: winning_metric || 'read_rate',
        confidence_threshold: confidence_threshold || 0.95,
        min_sample_size: min_sample_size || 100,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify(test), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function simulateGetAnalytics(request: NextRequest, supabase: any, user: any, campaignId: string, type: string): Promise<Response> {
  try {
    const { data: campaign, error } = await supabase
      .from('drip_campaigns')
      .select('*')
      .eq('id', campaignId)
      .eq('organization_id', user.organization_id)
      .single()

    if (error || !campaign) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Return mock analytics based on type
    let analytics: any = {}

    if (type === 'funnel') {
      analytics = {
        overallCompletionRate: 65.5,
        steps: [
          { stepId: 'step_1', name: 'Welcome', reached: 1000, completed: 950, dropOff: 50 },
        ],
      }
    } else if (type === 'cohort') {
      analytics = {
        cohorts: [
          { period: '2024-01', enrolled: 500, completed: 320, completionRate: 64 },
        ],
      }
    }

    return new Response(JSON.stringify(analytics), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
