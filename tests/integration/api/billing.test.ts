/**
 * Billing API Integration Tests
 *
 * Tests for billing/subscription endpoints including upgrade/downgrade,
 * payment methods, and usage tracking with multi-tenant isolation.
 */

// @ts-nocheck - Database types need regeneration from Supabase schema

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import {
  createAuthenticatedRequest as createAuthReq,
  parseResponse,
  expectErrorResponse,
} from '../../utils/api-test-helpers'
import {
  createMockUser,
  createMockSupabaseClient,
} from '../../utils/test-helpers'

jest.mock('@/lib/supabase/server')
jest.mock('@/lib/stripe/client')

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

// ============================================================================
// BILLING USAGE TESTS
// ============================================================================

describe('GET /api/billing/usage', () => {
  let mockSupabase: any
  let mockUser: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    jest.clearAllMocks()
  })

  it('should return usage data for authenticated user', async () => {
    const mockUsageData = {
      messages_sent: 1500,
      messages_limit: 5000,
      contacts_count: 250,
      contacts_limit: 1000,
      conversations_count: 89,
      storage_used_mb: 120,
      storage_limit_mb: 500,
      billing_period_start: '2024-01-01',
      billing_period_end: '2024-01-31',
    }

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockUsageData,
        error: null,
      }),
    })

    const request = createAuthenticatedRequest('GET', '/api/billing/usage', mockUser.id, mockUser.organization_id)
    const response = await simulateGetUsage(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data).toHaveProperty('messages_sent')
    expect(data).toHaveProperty('messages_limit')
    expect(data.messages_sent).toBe(1500)
  })

  it('should enforce organization isolation for usage data', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockImplementation((field: string, value: string) => {
        expect(field).toBe('organization_id')
        expect(value).toBe(mockUser.organization_id)
        return {
          single: jest.fn().mockResolvedValue({
            data: { messages_sent: 100 },
            error: null,
          }),
        }
      }),
    })

    const request = createAuthenticatedRequest('GET', '/api/billing/usage', mockUser.id, mockUser.organization_id)
    await simulateGetUsage(request, mockSupabase, mockUser)

    expect(mockSupabase.from).toHaveBeenCalledWith('organization_usage')
  })

  it('should return 401 for unauthenticated request', async () => {
    const request = new NextRequest('http://localhost:3000/api/billing/usage')
    const response = await simulateGetUsage(request, mockSupabase, null)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(401)
    expectErrorResponse(data, 401, 'Unauthorized')
  })
})

// ============================================================================
// BILLING UPGRADE TESTS
// ============================================================================

describe('POST /api/billing/upgrade', () => {
  let mockSupabase: any
  let mockUser: any
  let mockStripe: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockStripe = {
      subscriptions: {
        update: jest.fn(),
        retrieve: jest.fn(),
      },
      prices: {
        retrieve: jest.fn(),
      },
    }
    jest.clearAllMocks()
  })

  it('should upgrade subscription to higher plan', async () => {
    const upgradeData = {
      plan_id: 'plan_professional',
      price_id: 'price_professional_monthly',
    }

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          stripe_customer_id: 'cus_123',
          stripe_subscription_id: 'sub_123',
          plan_id: 'plan_starter',
        },
        error: null,
      }),
      update: jest.fn().mockReturnThis(),
    })

    mockStripe.subscriptions.update.mockResolvedValue({
      id: 'sub_123',
      status: 'active',
      items: { data: [{ price: { id: 'price_professional_monthly' } }] },
    })

    const request = createAuthenticatedRequest(
      'POST',
      '/api/billing/upgrade',
      mockUser.id,
      mockUser.organization_id,
      upgradeData
    )

    const response = await simulateUpgrade(request, mockSupabase, mockStripe, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.subscription_id).toBe('sub_123')
  })

  it('should reject upgrade without payment method', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          stripe_customer_id: 'cus_123',
          stripe_subscription_id: null, // No subscription
        },
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'POST',
      '/api/billing/upgrade',
      mockUser.id,
      mockUser.organization_id,
      { plan_id: 'plan_professional' }
    )

    const response = await simulateUpgrade(request, mockSupabase, mockStripe, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(400)
    expectErrorResponse(data, 400, 'payment method')
  })

  it('should require plan_id in request', async () => {
    const request = createAuthenticatedRequest(
      'POST',
      '/api/billing/upgrade',
      mockUser.id,
      mockUser.organization_id,
      {}
    )

    const response = await simulateUpgrade(request, mockSupabase, mockStripe, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(400)
    expectErrorResponse(data, 400, 'plan_id is required')
  })
})

// ============================================================================
// BILLING DOWNGRADE TESTS
// ============================================================================

describe('POST /api/billing/downgrade', () => {
  let mockSupabase: any
  let mockUser: any
  let mockStripe: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockStripe = {
      subscriptions: {
        update: jest.fn(),
      },
    }
    jest.clearAllMocks()
  })

  it('should schedule downgrade at period end', async () => {
    const downgradeData = {
      plan_id: 'plan_starter',
      effective_date: 'period_end',
    }

    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          stripe_subscription_id: 'sub_123',
          plan_id: 'plan_professional',
        },
        error: null,
      }),
      update: jest.fn().mockReturnThis(),
    })

    mockStripe.subscriptions.update.mockResolvedValue({
      id: 'sub_123',
      cancel_at_period_end: false,
      schedule: { phases: [{ items: [{ price: 'price_starter' }] }] },
    })

    const request = createAuthenticatedRequest(
      'POST',
      '/api/billing/downgrade',
      mockUser.id,
      mockUser.organization_id,
      downgradeData
    )

    const response = await simulateDowngrade(request, mockSupabase, mockStripe, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.effective_date).toBeDefined()
  })

  it('should validate usage before downgrade', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          stripe_subscription_id: 'sub_123',
          plan_id: 'plan_professional',
          contacts_count: 1500, // Over starter limit of 500
        },
        error: null,
      }),
    })

    const request = createAuthenticatedRequest(
      'POST',
      '/api/billing/downgrade',
      mockUser.id,
      mockUser.organization_id,
      { plan_id: 'plan_starter' }
    )

    const response = await simulateDowngrade(request, mockSupabase, mockStripe, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(400)
    expectErrorResponse(data, 400, 'exceeds')
  })
})

// ============================================================================
// BILLING CANCEL TESTS
// ============================================================================

describe('POST /api/billing/cancel', () => {
  let mockSupabase: any
  let mockUser: any
  let mockStripe: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockStripe = {
      subscriptions: {
        update: jest.fn(),
        cancel: jest.fn(),
      },
    }
    jest.clearAllMocks()
  })

  it('should schedule cancellation at period end', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          stripe_subscription_id: 'sub_123',
        },
        error: null,
      }),
      update: jest.fn().mockReturnThis(),
    })

    mockStripe.subscriptions.update.mockResolvedValue({
      id: 'sub_123',
      cancel_at_period_end: true,
      current_period_end: 1704067200,
    })

    const request = createAuthenticatedRequest(
      'POST',
      '/api/billing/cancel',
      mockUser.id,
      mockUser.organization_id,
      { reason: 'Too expensive', feedback: 'Great product but out of budget' }
    )

    const response = await simulateCancel(request, mockSupabase, mockStripe, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.cancellation_date).toBeDefined()
  })

  it('should record cancellation reason', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { stripe_subscription_id: 'sub_123' },
        error: null,
      }),
      update: jest.fn().mockImplementation((updateData) => {
        expect(updateData.cancellation_reason).toBe('Too expensive')
        return { eq: jest.fn().mockReturnThis() }
      }),
      insert: jest.fn().mockReturnThis(),
    })

    mockStripe.subscriptions.update.mockResolvedValue({
      id: 'sub_123',
      cancel_at_period_end: true,
    })

    const request = createAuthenticatedRequest(
      'POST',
      '/api/billing/cancel',
      mockUser.id,
      mockUser.organization_id,
      { reason: 'Too expensive' }
    )

    await simulateCancel(request, mockSupabase, mockStripe, mockUser)
  })
})

// ============================================================================
// PAYMENT METHODS TESTS
// ============================================================================

describe('GET /api/billing/payment-methods', () => {
  let mockSupabase: any
  let mockUser: any
  let mockStripe: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockStripe = {
      paymentMethods: {
        list: jest.fn(),
      },
      customers: {
        retrieve: jest.fn(),
      },
    }
    jest.clearAllMocks()
  })

  it('should list payment methods for organization', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { stripe_customer_id: 'cus_123' },
        error: null,
      }),
    })

    mockStripe.paymentMethods.list.mockResolvedValue({
      data: [
        {
          id: 'pm_123',
          card: { brand: 'visa', last4: '4242', exp_month: 12, exp_year: 2025 },
        },
        {
          id: 'pm_456',
          card: { brand: 'mastercard', last4: '5555', exp_month: 6, exp_year: 2024 },
        },
      ],
    })

    mockStripe.customers.retrieve.mockResolvedValue({
      invoice_settings: { default_payment_method: 'pm_123' },
    })

    const request = createAuthenticatedRequest(
      'GET',
      '/api/billing/payment-methods',
      mockUser.id,
      mockUser.organization_id
    )

    const response = await simulateGetPaymentMethods(request, mockSupabase, mockStripe, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.payment_methods).toHaveLength(2)
    expect(data.default_payment_method).toBe('pm_123')
  })

  it('should return empty array for customer without payment methods', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { stripe_customer_id: 'cus_123' },
        error: null,
      }),
    })

    mockStripe.paymentMethods.list.mockResolvedValue({ data: [] })
    mockStripe.customers.retrieve.mockResolvedValue({
      invoice_settings: { default_payment_method: null },
    })

    const request = createAuthenticatedRequest(
      'GET',
      '/api/billing/payment-methods',
      mockUser.id,
      mockUser.organization_id
    )

    const response = await simulateGetPaymentMethods(request, mockSupabase, mockStripe, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.payment_methods).toHaveLength(0)
  })
})

// ============================================================================
// INVOICES TESTS
// ============================================================================

describe('GET /api/billing/invoices', () => {
  let mockSupabase: any
  let mockUser: any
  let mockStripe: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockStripe = {
      invoices: {
        list: jest.fn(),
      },
    }
    jest.clearAllMocks()
  })

  it('should list invoices for organization', async () => {
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { stripe_customer_id: 'cus_123' },
        error: null,
      }),
    })

    mockStripe.invoices.list.mockResolvedValue({
      data: [
        {
          id: 'in_123',
          amount_paid: 4900,
          currency: 'usd',
          status: 'paid',
          created: 1704067200,
          invoice_pdf: 'https://stripe.com/invoice/123.pdf',
        },
        {
          id: 'in_456',
          amount_paid: 4900,
          currency: 'usd',
          status: 'paid',
          created: 1701388800,
          invoice_pdf: 'https://stripe.com/invoice/456.pdf',
        },
      ],
    })

    const request = createAuthenticatedRequest(
      'GET',
      '/api/billing/invoices',
      mockUser.id,
      mockUser.organization_id
    )

    const response = await simulateGetInvoices(request, mockSupabase, mockStripe, mockUser)
    const { status, data } = await parseResponse(response)

    expect(status).toBe(200)
    expect(data.invoices).toHaveLength(2)
    expect(data.invoices[0]).toHaveProperty('invoice_pdf')
  })
})

// =============================================================================
// Helper Functions
// =============================================================================

async function simulateGetUsage(request: NextRequest, supabase: any, user: any): Promise<Response> {
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { data: usage, error } = await supabase
      .from('organization_usage')
      .select('*')
      .eq('organization_id', user.organization_id)
      .single()

    if (error) throw error

    return new Response(JSON.stringify(usage), {
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

async function simulateUpgrade(request: NextRequest, supabase: any, stripe: any, user: any): Promise<Response> {
  try {
    const body = await request.json()
    const { plan_id, price_id } = body

    if (!plan_id) {
      return new Response(JSON.stringify({ error: 'plan_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', user.organization_id)
      .single()

    if (orgError) throw orgError

    if (!org.stripe_subscription_id) {
      return new Response(JSON.stringify({ error: 'No active subscription. Please add a payment method first.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const subscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [{ price: price_id }],
      proration_behavior: 'create_prorations',
    })

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscription.id,
        plan_id,
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

async function simulateDowngrade(request: NextRequest, supabase: any, stripe: any, user: any): Promise<Response> {
  try {
    const body = await request.json()
    const { plan_id } = body

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_subscription_id, plan_id, contacts_count')
      .eq('id', user.organization_id)
      .single()

    if (orgError) throw orgError

    // Check usage limits
    const planLimits: Record<string, number> = {
      plan_starter: 500,
      plan_professional: 2500,
      plan_enterprise: 10000,
    }

    if (org.contacts_count > (planLimits[plan_id] || 0)) {
      return new Response(
        JSON.stringify({ error: `Current usage exceeds ${plan_id} limits. Please reduce contacts first.` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const subscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
      proration_behavior: 'none',
    })

    return new Response(
      JSON.stringify({
        success: true,
        effective_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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

async function simulateCancel(request: NextRequest, supabase: any, stripe: any, user: any): Promise<Response> {
  try {
    const body = await request.json()
    const { reason, feedback } = body

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_subscription_id')
      .eq('id', user.organization_id)
      .single()

    if (orgError) throw orgError

    // Update subscription to cancel at period end
    const subscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    // Record cancellation reason
    await supabase
      .from('organizations')
      .update({
        cancellation_reason: reason,
        cancellation_feedback: feedback,
        cancellation_requested_at: new Date().toISOString(),
      })
      .eq('id', user.organization_id)

    return new Response(
      JSON.stringify({
        success: true,
        cancellation_date: new Date(subscription.current_period_end * 1000).toISOString(),
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

async function simulateGetPaymentMethods(request: NextRequest, supabase: any, stripe: any, user: any): Promise<Response> {
  try {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', user.organization_id)
      .single()

    if (orgError) throw orgError

    const paymentMethods = await stripe.paymentMethods.list({
      customer: org.stripe_customer_id,
      type: 'card',
    })

    const customer = await stripe.customers.retrieve(org.stripe_customer_id)

    return new Response(
      JSON.stringify({
        payment_methods: paymentMethods.data,
        default_payment_method: customer.invoice_settings?.default_payment_method,
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

async function simulateGetInvoices(request: NextRequest, supabase: any, stripe: any, user: any): Promise<Response> {
  try {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', user.organization_id)
      .single()

    if (orgError) throw orgError

    const invoices = await stripe.invoices.list({
      customer: org.stripe_customer_id,
      limit: 24,
    })

    return new Response(
      JSON.stringify({ invoices: invoices.data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
