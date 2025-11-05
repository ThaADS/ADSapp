/**
 * Jest Test Setup Configuration
 *
 * This file runs before all tests to configure the test environment,
 * set up global mocks, and provide utility functions for testing.
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { TextEncoder, TextDecoder } from 'util'
import '@testing-library/jest-dom'

// =============================================================================
// Global Environment Setup
// =============================================================================

// Polyfill TextEncoder/TextDecoder for Node environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as typeof global.TextDecoder

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
} as any

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as any

// Mock scrollTo
global.scrollTo = jest.fn()

// =============================================================================
// Environment Variables Setup
// =============================================================================

process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.NEXT_PUBLIC_APP_NAME = 'ADSapp Test'

// Supabase Test Configuration
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-1234567890'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-1234567890'

// Stripe Test Configuration
process.env.STRIPE_PUBLIC_KEY = 'pk_test_mock'
process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_mock'

// WhatsApp Test Configuration
process.env.WHATSAPP_ACCESS_TOKEN = 'test_whatsapp_token'
process.env.WHATSAPP_PHONE_NUMBER_ID = 'test_phone_number_id'
process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = 'test_business_account_id'
process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'test_verify_token'

// Email Test Configuration
process.env.RESEND_API_KEY = 're_test_mock'

// =============================================================================
// Supabase Client Mocking
// =============================================================================

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              user_metadata: {
                full_name: 'Test User',
              },
            },
            access_token: 'test-access-token',
            refresh_token: 'test-refresh-token',
          },
        },
        error: null,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: {
              full_name: 'Test User',
            },
          },
        },
        error: null,
      }),
      signIn: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test.com/file' } }),
      })),
    },
  })),
}))

// Mock Supabase client for browser
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user-id' } } },
        error: null,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  })),
}))

// =============================================================================
// Next.js Mocking
// =============================================================================

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  })),
  usePathname: jest.fn(() => '/'),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  useParams: jest.fn(() => ({})),
  redirect: jest.fn(),
  notFound: jest.fn(),
}))

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(),
    getAll: jest.fn(() => []),
  })),
  headers: jest.fn(() => ({
    get: jest.fn(),
    has: jest.fn(),
    forEach: jest.fn(),
    entries: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
  })),
}))

// =============================================================================
// Stripe Mocking
// =============================================================================

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
      update: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
      del: jest.fn().mockResolvedValue({ deleted: true }),
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
      update: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
      cancel: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'canceled' }),
      list: jest.fn().mockResolvedValue({ data: [] }),
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test123', status: 'succeeded' }),
      retrieve: jest.fn().mockResolvedValue({ id: 'pi_test123', status: 'succeeded' }),
      confirm: jest.fn().mockResolvedValue({ id: 'pi_test123', status: 'succeeded' }),
      cancel: jest.fn().mockResolvedValue({ id: 'pi_test123', status: 'canceled' }),
    },
    webhooks: {
      constructEvent: jest.fn((payload, signature, secret) => ({
        id: 'evt_test123',
        type: 'payment_intent.succeeded',
        data: {
          object: { id: 'pi_test123' },
        },
      })),
    },
    prices: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      retrieve: jest.fn().mockResolvedValue({ id: 'price_test123' }),
    },
    products: {
      list: jest.fn().mockResolvedValue({ data: [] }),
      retrieve: jest.fn().mockResolvedValue({ id: 'prod_test123' }),
    },
  }))
})

// =============================================================================
// Fetch API Mocking
// =============================================================================

global.fetch = jest.fn((url: string | URL | Request, options?: RequestInit) => {
  const urlString = typeof url === 'string' ? url : url.toString()

  // Mock WhatsApp API
  if (urlString.includes('graph.facebook.com')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message_id: 'wamid_test123' }),
      text: async () => JSON.stringify({ success: true }),
      headers: new Headers(),
    } as Response)
  }

  // Mock Stripe API
  if (urlString.includes('api.stripe.com')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({ id: 'test_123', object: 'customer' }),
      text: async () => JSON.stringify({ id: 'test_123' }),
      headers: new Headers(),
    } as Response)
  }

  // Default mock response
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => ({}),
    text: async () => '{}',
    headers: new Headers(),
  } as Response)
}) as jest.Mock

// =============================================================================
// Console Mocking (suppress expected errors in tests)
// =============================================================================
// Note: Console mocking moved to jest.setup.js to avoid ReferenceError with expect

// =============================================================================
// Test Cleanup
// =============================================================================
// Note: Test cleanup moved to jest.setup.js to avoid ReferenceError

// =============================================================================
// Global Test Utilities
// =============================================================================

// Wait for async updates
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0))

// Wait for specific time
export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))

// Flush promises
export const flushPromises = () =>
  new Promise((resolve) => setImmediate(resolve))

// Mock successful API response
export const mockSuccessResponse = (data: any) => ({
  ok: true,
  status: 200,
  json: async () => data,
  text: async () => JSON.stringify(data),
  headers: new Headers(),
})

// Mock error API response
export const mockErrorResponse = (status: number, message: string) => ({
  ok: false,
  status,
  json: async () => ({ error: message }),
  text: async () => JSON.stringify({ error: message }),
  headers: new Headers(),
})

// =============================================================================
// Export Test Configuration
// =============================================================================

export default {
  testEnvironment: 'jsdom',
  setupComplete: true,
}
