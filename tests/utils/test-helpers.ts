/**
 * Test Helpers - Comprehensive Test Utilities
 *
 * Provides utility functions for creating mock data, test fixtures,
 * and common testing patterns used across the test suite.
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { v4 as uuidv4 } from 'uuid'
import type {
  Organization,
  Profile,
  Contact,
  Conversation,
  Message,
} from '@/types/database'

// TODO WEEK 5+: Create MessageTemplate and AutomationRule types in database.ts
// For now, these are commented out as they don't exist in the current schema
// type MessageTemplate = any;
// type AutomationRule = any;

// =============================================================================
// Type Definitions
// =============================================================================

export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>

export interface MockSupabaseClient {
  from: jest.Mock
  auth: {
    getUser: jest.Mock
    getSession: jest.Mock
    signIn: jest.Mock
    signOut: jest.Mock
    signUp: jest.Mock
  }
  rpc: jest.Mock
  storage: {
    from: jest.Mock
  }
}

// =============================================================================
// Supabase Client Mock Factory
// =============================================================================

/**
 * Creates a mock Supabase client with jest mock functions
 * @param overrides - Optional overrides for specific methods
 * @returns Mocked Supabase client
 */
export function createMockSupabaseClient(overrides?: Partial<MockSupabaseClient>): MockSupabaseClient {
  const mockClient: MockSupabaseClient = {
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
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
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signIn: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      }),
    },
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://test.com/file' },
        }),
      })),
    },
  }

  return { ...mockClient, ...overrides }
}

// =============================================================================
// Mock Data Factories
// =============================================================================

/**
 * Creates a mock user/profile object (aligned with actual database schema)
 */
export function createMockUser(overrides?: Partial<Profile>): Profile {
  const id = overrides?.id || uuidv4()
  return {
    id,
    organization_id: overrides?.organization_id || uuidv4(),
    email: overrides?.email || `user-${id.slice(0, 8)}@test.com`,
    full_name: overrides?.full_name || 'Test User',
    avatar_url: overrides?.avatar_url || null,
    role: overrides?.role || 'agent',
    is_active: overrides?.is_active !== undefined ? overrides.is_active : true,
    is_super_admin: overrides?.is_super_admin !== undefined ? overrides.is_super_admin : false,
    last_seen_at: overrides?.last_seen_at || new Date().toISOString(),
    mfa_enabled: overrides?.mfa_enabled || null,
    mfa_secret: overrides?.mfa_secret || null,
    mfa_backup_codes: overrides?.mfa_backup_codes || null,
    mfa_enrolled_at: overrides?.mfa_enrolled_at || null,
    created_at: overrides?.created_at || new Date().toISOString(),
    updated_at: overrides?.updated_at || new Date().toISOString(),
    organization: null,
  }
}

/**
 * Creates a mock organization object (aligned with actual database schema)
 */
export function createMockOrganization(overrides?: Partial<Organization>): Organization {
  const id = overrides?.id || uuidv4()
  return {
    id,
    name: overrides?.name || `Test Organization ${id.slice(0, 8)}`,
    slug: overrides?.slug || `org-${id.slice(0, 8)}`,
    whatsapp_business_account_id: overrides?.whatsapp_business_account_id || 'test-business-account',
    whatsapp_phone_number_id: overrides?.whatsapp_phone_number_id || 'test-phone-number',
    subscription_status: overrides?.subscription_status || 'active',
    subscription_tier: overrides?.subscription_tier || 'professional',
    status: overrides?.status || 'active',
    stripe_customer_id: overrides?.stripe_customer_id || `cus_test_${id.slice(0, 8)}`,
    stripe_subscription_id: overrides?.stripe_subscription_id || `sub_test_${id.slice(0, 8)}`,
    trial_ends_at: overrides?.trial_ends_at || null,
    billing_email: overrides?.billing_email || null,
    timezone: overrides?.timezone || 'UTC',
    locale: overrides?.locale || 'en',
    suspended_at: overrides?.suspended_at || null,
    suspended_by: overrides?.suspended_by || null,
    suspension_reason: overrides?.suspension_reason || null,
    created_at: overrides?.created_at || new Date().toISOString(),
    updated_at: overrides?.updated_at || new Date().toISOString(),
  }
}

/**
 * Creates a mock contact object (aligned with actual database schema)
 */
export function createMockContact(overrides?: Partial<Contact>): Contact {
  const id = overrides?.id || uuidv4()
  return {
    id,
    organization_id: overrides?.organization_id || uuidv4(),
    whatsapp_id: overrides?.whatsapp_id || `wa-${id.slice(0, 8)}`,
    phone_number: overrides?.phone_number || `+1555${Math.floor(1000000 + Math.random() * 9000000)}`,
    name: overrides?.name || `Test Contact ${id.slice(0, 8)}`,
    profile_picture_url: overrides?.profile_picture_url || null,
    tags: overrides?.tags || [],
    notes: overrides?.notes || null,
    is_blocked: overrides?.is_blocked !== undefined ? overrides.is_blocked : false,
    last_message_at: overrides?.last_message_at || new Date().toISOString(),
    created_at: overrides?.created_at || new Date().toISOString(),
    updated_at: overrides?.updated_at || new Date().toISOString(),
  }
}

/**
 * Creates a mock conversation object (aligned with actual database schema)
 */
export function createMockConversation(overrides?: Partial<Conversation>): Conversation {
  const id = overrides?.id || uuidv4()
  return {
    id,
    organization_id: overrides?.organization_id || uuidv4(),
    contact_id: overrides?.contact_id || uuidv4(),
    assigned_to: overrides?.assigned_to || null,
    status: overrides?.status || 'open',
    priority: overrides?.priority || 'medium',
    subject: overrides?.subject || null,
    last_message_at: overrides?.last_message_at || new Date().toISOString(),
    created_at: overrides?.created_at || new Date().toISOString(),
    updated_at: overrides?.updated_at || new Date().toISOString(),
  }
}

/**
 * Creates a mock message object (aligned with actual database schema)
 */
export function createMockMessage(overrides?: Partial<Message>): Message {
  const id = overrides?.id || uuidv4()
  return {
    id,
    conversation_id: overrides?.conversation_id || uuidv4(),
    whatsapp_message_id: overrides?.whatsapp_message_id || `wamid_test_${id.slice(0, 8)}`,
    sender_type: overrides?.sender_type || 'contact',
    sender_id: overrides?.sender_id || null,
    content: overrides?.content || 'Test message content',
    message_type: overrides?.message_type || 'text',
    media_url: overrides?.media_url || null,
    media_mime_type: overrides?.media_mime_type || null,
    is_read: overrides?.is_read !== undefined ? overrides.is_read : false,
    delivered_at: overrides?.delivered_at || new Date().toISOString(),
    read_at: overrides?.read_at || null,
    created_at: overrides?.created_at || new Date().toISOString(),
  }
}

// TODO WEEK 5+: Uncomment when MessageTemplate and AutomationRule types are added to database.ts
/**
 * Creates a mock message template object
 */
// export function createMockTemplate(overrides?: Partial<MessageTemplate>): MessageTemplate {
//   const id = overrides?.id || uuidv4()
//   return {
//     id,
//     organization_id: overrides?.organization_id || uuidv4(),
//     name: overrides?.name || `Template ${id.slice(0, 8)}`,
//     content: overrides?.content || 'Hello {{name}}, this is a test template.',
//     category: overrides?.category || 'marketing',
//     language: overrides?.language || 'en',
//     status: overrides?.status || 'approved',
//     variables: overrides?.variables || ['name'],
//     components: overrides?.components || [],
//     whatsapp_template_id: overrides?.whatsapp_template_id || null,
//     created_by: overrides?.created_by || uuidv4(),
//     created_at: overrides?.created_at || new Date().toISOString(),
//     updated_at: overrides?.updated_at || new Date().toISOString(),
//   }
// }

/**
 * Creates a mock automation rule object
 */
// export function createMockAutomationRule(overrides?: Partial<AutomationRule>): AutomationRule {
//   const id = overrides?.id || uuidv4()
//   return {
//     id,
//     organization_id: overrides?.organization_id || uuidv4(),
//     name: overrides?.name || `Automation Rule ${id.slice(0, 8)}`,
//     description: overrides?.description || 'Test automation rule',
//     trigger_type: overrides?.trigger_type || 'message_received',
//     trigger_conditions: overrides?.trigger_conditions || {
//       conditions: [
//         {
//           field: 'message_content',
//           operator: 'contains',
//           value: 'help',
//         },
//       ],
//     },
//     actions: overrides?.actions || [
//       {
//         type: 'send_template',
//         template_id: uuidv4(),
//       },
//     ],
//     is_active: overrides?.is_active !== undefined ? overrides.is_active : true,
//     priority: overrides?.priority || 1,
//     created_by: overrides?.created_by || uuidv4(),
//     created_at: overrides?.created_at || new Date().toISOString(),
//     updated_at: overrides?.updated_at || new Date().toISOString(),
//   }
// }

// =============================================================================
// Test Data Generators
// =============================================================================

/**
 * Generates multiple mock users
 */
export function generateMockUsers(count: number, overrides?: Partial<Profile>): Profile[] {
  return Array.from({ length: count }, () => createMockUser(overrides))
}

/**
 * Generates multiple mock organizations
 */
export function generateMockOrganizations(count: number, overrides?: Partial<Organization>): Organization[] {
  return Array.from({ length: count }, () => createMockOrganization(overrides))
}

/**
 * Generates multiple mock contacts
 */
export function generateMockContacts(count: number, overrides?: Partial<Contact>): Contact[] {
  return Array.from({ length: count }, () => createMockContact(overrides))
}

/**
 * Generates multiple mock conversations
 */
export function generateMockConversations(count: number, overrides?: Partial<Conversation>): Conversation[] {
  return Array.from({ length: count }, () => createMockConversation(overrides))
}

/**
 * Generates multiple mock messages
 */
export function generateMockMessages(count: number, overrides?: Partial<Message>): Message[] {
  return Array.from({ length: count }, () => createMockMessage(overrides))
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Wait for async operations to complete
 */
export const waitForAsync = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0))

/**
 * Wait for a specific amount of time
 */
export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Flush all pending promises
 */
export const flushPromises = (): Promise<void> =>
  new Promise((resolve) => setImmediate(resolve))

/**
 * Create a mock Date that can be controlled in tests
 */
export function mockDate(date: Date | string): () => void {
  const mockDate = new Date(date)
  const originalDate = Date
  const DateConstructor = function (this: any, ...args: any[]) {
    if (args.length === 0) {
      return new originalDate(mockDate)
    }
    return new originalDate(...args)
  }
  DateConstructor.now = () => mockDate.getTime()
  DateConstructor.UTC = originalDate.UTC
  DateConstructor.parse = originalDate.parse
  global.Date = DateConstructor as any

  return () => {
    global.Date = originalDate
  }
}

/**
 * Setup and teardown helpers for tests
 */
export const testLifecycle = {
  beforeEach: (fn: () => void | Promise<void>) => beforeEach(fn),
  afterEach: (fn: () => void | Promise<void>) => afterEach(fn),
  beforeAll: (fn: () => void | Promise<void>) => beforeAll(fn),
  afterAll: (fn: () => void | Promise<void>) => afterAll(fn),
}

/**
 * Assert that a function throws an error
 */
export async function expectToThrow(
  fn: () => any | Promise<any>,
  errorMessage?: string | RegExp
): Promise<void> {
  let thrownError: Error | undefined

  try {
    await fn()
  } catch (error) {
    thrownError = error as Error
  }

  expect(thrownError).toBeDefined()
  if (errorMessage) {
    if (typeof errorMessage === 'string') {
      expect(thrownError?.message).toContain(errorMessage)
    } else {
      expect(thrownError?.message).toMatch(errorMessage)
    }
  }
}

/**
 * Mock console methods to suppress expected output
 */
export function suppressConsole(): () => void {
  const originalLog = console.log
  const originalWarn = console.warn
  const originalError = console.error

  console.log = jest.fn()
  console.warn = jest.fn()
  console.error = jest.fn()

  return () => {
    console.log = originalLog
    console.warn = originalWarn
    console.error = originalError
  }
}

// =============================================================================
// Export All Helpers
// =============================================================================

export default {
  createMockSupabaseClient,
  createMockUser,
  createMockOrganization,
  createMockContact,
  createMockConversation,
  createMockMessage,
  // TODO WEEK 5+: Re-enable when MessageTemplate and AutomationRule are added to database
  // createMockTemplate,
  // createMockAutomationRule,
  generateMockUsers,
  generateMockOrganizations,
  generateMockContacts,
  generateMockConversations,
  generateMockMessages,
  waitForAsync,
  wait,
  flushPromises,
  mockDate,
  testLifecycle,
  expectToThrow,
  suppressConsole,
}
