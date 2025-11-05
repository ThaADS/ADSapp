/**
 * Test Utilities and Helper Functions
 *
 * Provides factory functions, mocks, and utilities for writing
 * clean and maintainable tests across the ADSapp codebase.
 */

import { Redis } from '@upstash/redis';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface MockOrganization {
  id: string;
  name: string;
  subdomain: string;
  settings: Record<string, any>;
  subscription_plan: string;
  created_at: string;
  updated_at: string;
}

export interface MockUser {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'agent';
  permissions: string[];
  last_seen: string;
}

export interface MockRedisClient {
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  exists: jest.Mock;
  keys: jest.Mock;
  ping: jest.Mock;
  mget: jest.Mock;
  mset: jest.Mock;
  expire: jest.Mock;
  ttl: jest.Mock;
  incrby: jest.Mock;
  decrby: jest.Mock;
  flushall: jest.Mock;
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

/**
 * Create a mock organization for testing
 */
export function createMockOrganization(overrides?: Partial<MockOrganization>): MockOrganization {
  return {
    id: 'org_test_123',
    name: 'Test Organization',
    subdomain: 'testorg',
    settings: {
      timezone: 'UTC',
      language: 'en',
    },
    subscription_plan: 'professional',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: 'user_test_123',
    organization_id: 'org_test_123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'agent',
    permissions: ['messages:read', 'messages:write'],
    last_seen: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create multiple mock organizations
 */
export function createMockOrganizations(count: number = 3): MockOrganization[] {
  return Array.from({ length: count }, (_, i) =>
    createMockOrganization({
      id: `org_test_${i + 1}`,
      name: `Test Organization ${i + 1}`,
      subdomain: `testorg${i + 1}`,
    })
  );
}

/**
 * Create multiple mock users
 */
export function createMockUsers(count: number = 3, organizationId?: string): MockUser[] {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      id: `user_test_${i + 1}`,
      email: `test${i + 1}@example.com`,
      full_name: `Test User ${i + 1}`,
      organization_id: organizationId || 'org_test_123',
    })
  );
}

// =============================================================================
// MOCK REDIS CLIENT
// =============================================================================

/**
 * Create a mock Redis client for testing
 */
export function createMockRedis(): MockRedisClient {
  const storage = new Map<string, { value: any; expires?: number }>();

  return {
    get: jest.fn(async (key: string) => {
      const entry = storage.get(key);
      if (!entry) return null;
      if (entry.expires && entry.expires < Date.now()) {
        storage.delete(key);
        return null;
      }
      return entry.value;
    }),

    set: jest.fn(async (key: string, value: any, options?: any) => {
      const expires = options?.ex ? Date.now() + options.ex * 1000 : undefined;
      storage.set(key, { value, expires });
      return 'OK';
    }),

    del: jest.fn(async (...keys: string[]) => {
      let count = 0;
      for (const key of keys) {
        if (storage.delete(key)) count++;
      }
      return count;
    }),

    exists: jest.fn(async (key: string) => {
      return storage.has(key) ? 1 : 0;
    }),

    keys: jest.fn(async (pattern: string) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Array.from(storage.keys()).filter((key) => regex.test(key));
    }),

    ping: jest.fn(async () => 'PONG'),

    mget: jest.fn(async (...keys: string[]) => {
      return keys.map((key) => {
        const entry = storage.get(key);
        return entry?.value ?? null;
      });
    }),

    mset: jest.fn(async (data: Record<string, any>) => {
      Object.entries(data).forEach(([key, value]) => {
        storage.set(key, { value });
      });
      return 'OK';
    }),

    expire: jest.fn(async (key: string, seconds: number) => {
      const entry = storage.get(key);
      if (entry) {
        entry.expires = Date.now() + seconds * 1000;
        return 1;
      }
      return 0;
    }),

    ttl: jest.fn(async (key: string) => {
      const entry = storage.get(key);
      if (!entry) return -2;
      if (!entry.expires) return -1;
      const remaining = Math.floor((entry.expires - Date.now()) / 1000);
      return remaining > 0 ? remaining : -2;
    }),

    incrby: jest.fn(async (key: string, amount: number) => {
      const entry = storage.get(key);
      const current = entry?.value ?? 0;
      const newValue = current + amount;
      storage.set(key, { value: newValue });
      return newValue;
    }),

    decrby: jest.fn(async (key: string, amount: number) => {
      const entry = storage.get(key);
      const current = entry?.value ?? 0;
      const newValue = current - amount;
      storage.set(key, { value: newValue });
      return newValue;
    }),

    flushall: jest.fn(async () => {
      storage.clear();
      return 'OK';
    }),
  };
}

/**
 * Reset mock Redis storage
 */
export function resetMockRedis(mockRedis: MockRedisClient): void {
  mockRedis.flushall();
  Object.values(mockRedis).forEach((mock) => {
    if (typeof mock.mockClear === 'function') {
      mock.mockClear();
    }
  });
}

// =============================================================================
// MOCK SUPABASE CLIENT
// =============================================================================

/**
 * Create a mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  return {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: {
          session: {
            user: createMockUser(),
            access_token: 'test-access-token',
          },
        },
        error: null,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: createMockUser() },
        error: null,
      }),
    },
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: {}, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  };
}

// =============================================================================
// NEXTREQUEST FACTORY
// =============================================================================

/**
 * Create a mock NextRequest for API route testing
 */
export function createMockRequest(options?: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  searchParams?: Record<string, string>;
}): Request {
  const url = options?.url || 'http://localhost:3000/api/test';
  const method = options?.method || 'GET';
  const headers = new Headers(options?.headers || {});

  const request = new Request(url, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  }) as Request;

  return request;
}

// =============================================================================
// ASYNC UTILITIES
// =============================================================================

/**
 * Wait for a specific amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for async updates to complete
 */
export function waitForAsync(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

/**
 * Flush all pending promises
 */
export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// =============================================================================
// MOCK RESPONSE HELPERS
// =============================================================================

/**
 * Create a successful API response
 */
export function mockSuccessResponse<T>(data: T, status: number = 200) {
  return {
    ok: true,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
  };
}

/**
 * Create an error API response
 */
export function mockErrorResponse(message: string, status: number = 400) {
  return {
    ok: false,
    status,
    json: async () => ({ error: message }),
    text: async () => JSON.stringify({ error: message }),
    headers: new Headers(),
  };
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Validate ISO date format
 */
export function isValidISODate(date: string): boolean {
  return !isNaN(Date.parse(date));
}

/**
 * Generate random test ID
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}_${Math.random().toString(36).substring(7)}`;
}

// =============================================================================
// ENVIRONMENT HELPERS
// =============================================================================

/**
 * Set test environment variables
 */
export function setTestEnv(vars: Record<string, string>): void {
  Object.entries(vars).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

/**
 * Clear test environment variables
 */
export function clearTestEnv(keys: string[]): void {
  keys.forEach((key) => {
    delete process.env[key];
  });
}

/**
 * Save and restore environment variables
 */
export function withTestEnv<T>(
  vars: Record<string, string>,
  fn: () => T | Promise<T>
): T | Promise<T> {
  const original = { ...process.env };
  setTestEnv(vars);

  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.finally(() => {
        process.env = original;
      });
    }
    process.env = original;
    return result;
  } catch (error) {
    process.env = original;
    throw error;
  }
}

// =============================================================================
// CONSOLE MOCKING
// =============================================================================

/**
 * Suppress console output during tests
 */
export function suppressConsole(): {
  restore: () => void;
} {
  const original = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  };

  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();

  return {
    restore: () => {
      console.log = original.log;
      console.error = original.error;
      console.warn = original.warn;
      console.info = original.info;
    },
  };
}

// =============================================================================
// DATA GENERATION
// =============================================================================

/**
 * Generate random string
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Generate random email
 */
export function randomEmail(): string {
  return `test_${randomString(8)}@example.com`;
}

/**
 * Generate random phone number
 */
export function randomPhone(): string {
  return `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`;
}

/**
 * Generate random date within range
 */
export function randomDate(start: Date = new Date(2023, 0, 1), end: Date = new Date()): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// =============================================================================
// EXPORTS
// =============================================================================

export const TestUtils = {
  // Factories
  createMockOrganization,
  createMockUser,
  createMockOrganizations,
  createMockUsers,
  createMockRedis,
  createMockSupabaseClient,
  createMockRequest,

  // Async utilities
  wait,
  waitForAsync,
  flushPromises,

  // Response helpers
  mockSuccessResponse,
  mockErrorResponse,

  // Validation
  isValidUUID,
  isValidISODate,
  generateTestId,

  // Environment
  setTestEnv,
  clearTestEnv,
  withTestEnv,

  // Console
  suppressConsole,

  // Data generation
  randomString,
  randomEmail,
  randomPhone,
  randomDate,

  // Reset
  resetMockRedis,
};

export default TestUtils;
