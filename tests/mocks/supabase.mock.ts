/**
 * Supabase Mock Factory
 *
 * Comprehensive mocking utilities for Supabase client operations.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// =============================================================================
// Mock Supabase Client
// =============================================================================

export function createMockSupabaseClient(): jest.Mocked<Partial<SupabaseClient>> {
  return {
    from: jest.fn((table: string) => createMockQueryBuilder()),
    auth: createMockAuth(),
    storage: createMockStorage(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    channel: jest.fn().mockReturnValue(createMockRealtimeChannel()),
  } as any
}

// =============================================================================
// Query Builder Mock
// =============================================================================

function createMockQueryBuilder() {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    csv: jest.fn().mockResolvedValue({ data: '', error: null }),
    geojson: jest.fn().mockResolvedValue({ data: null, error: null }),
    explain: jest.fn().mockResolvedValue({ data: '', error: null }),
  }

  // Make chain methods return the query builder instance
  Object.keys(queryBuilder).forEach(key => {
    const method = queryBuilder[key as keyof typeof queryBuilder]
    if (
      jest.isMockFunction(method) &&
      method.getMockImplementation()?.toString().includes('mockReturnThis')
    ) {
      method.mockReturnValue(queryBuilder)
    }
  })

  return queryBuilder
}

// =============================================================================
// Auth Mock
// =============================================================================

function createMockAuth() {
  return {
    getSession: jest.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
            user_metadata: { full_name: 'Test User' },
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
          user_metadata: { full_name: 'Test User' },
        },
      },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
        session: {
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
        },
      },
      error: null,
    }),
    signInWithOtp: jest.fn().mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    }),
    signUp: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'new-user-id',
          email: 'newuser@example.com',
        },
        session: null,
      },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({
      data: {},
      error: null,
    }),
    updateUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      },
      error: null,
    }),
    setSession: jest.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    }),
    refreshSession: jest.fn().mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    }),
    onAuthStateChange: jest.fn(callback => {
      return {
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      }
    }),
  }
}

// =============================================================================
// Storage Mock
// =============================================================================

function createMockStorage() {
  return {
    from: jest.fn((bucket: string) => ({
      upload: jest.fn().mockResolvedValue({
        data: { path: `${bucket}/test-file.jpg` },
        error: null,
      }),
      download: jest.fn().mockResolvedValue({
        data: new Blob(['test data'], { type: 'image/jpeg' }),
        error: null,
      }),
      remove: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      list: jest.fn().mockResolvedValue({
        data: [
          {
            name: 'test-file.jpg',
            id: 'file-id-1',
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString(),
            metadata: { size: 1024 },
          },
        ],
        error: null,
      }),
      move: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      copy: jest.fn().mockResolvedValue({
        data: { path: 'new-path' },
        error: null,
      }),
      createSignedUrl: jest.fn().mockResolvedValue({
        data: {
          signedUrl: 'https://test.com/signed-url',
        },
        error: null,
      }),
      createSignedUrls: jest.fn().mockResolvedValue({
        data: [
          {
            signedUrl: 'https://test.com/signed-url-1',
          },
        ],
        error: null,
      }),
      getPublicUrl: jest.fn((path: string) => ({
        data: {
          publicUrl: `https://test.com/storage/${bucket}/${path}`,
        },
      })),
    })),
  }
}

// =============================================================================
// Realtime Channel Mock
// =============================================================================

function createMockRealtimeChannel() {
  return {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn().mockResolvedValue({ error: null }),
    send: jest.fn().mockResolvedValue('ok'),
  }
}

// =============================================================================
// Mock Response Helpers
// =============================================================================

/**
 * Creates a successful Supabase response
 */
export function mockSupabaseSuccess<T>(data: T) {
  return { data, error: null }
}

/**
 * Creates a Supabase error response
 */
export function mockSupabaseError(message: string, code = 'PGRST116') {
  return {
    data: null,
    error: {
      message,
      code,
      details: '',
      hint: '',
    },
  }
}

/**
 * Creates a Supabase auth error
 */
export function mockAuthError(message: string) {
  return {
    data: { user: null, session: null },
    error: {
      message,
      status: 401,
    },
  }
}

// =============================================================================
// Mock Query Helpers
// =============================================================================

/**
 * Mocks a successful select query
 */
export function mockSelectSuccess<T>(data: T[]) {
  const queryBuilder = createMockQueryBuilder()
  queryBuilder.single.mockResolvedValue(mockSupabaseSuccess(data[0]))
  queryBuilder.maybeSingle.mockResolvedValue(mockSupabaseSuccess(data[0] || null))
  return queryBuilder
}

/**
 * Mocks a successful insert query
 */
export function mockInsertSuccess<T>(data: T) {
  const queryBuilder = createMockQueryBuilder()
  queryBuilder.single.mockResolvedValue(mockSupabaseSuccess(data))
  return queryBuilder
}

/**
 * Mocks a successful update query
 */
export function mockUpdateSuccess<T>(data: T) {
  const queryBuilder = createMockQueryBuilder()
  queryBuilder.single.mockResolvedValue(mockSupabaseSuccess(data))
  return queryBuilder
}

/**
 * Mocks a successful delete query
 */
export function mockDeleteSuccess() {
  const queryBuilder = createMockQueryBuilder()
  queryBuilder.single.mockResolvedValue(mockSupabaseSuccess(null))
  return queryBuilder
}

/**
 * Mocks a failed query
 */
export function mockQueryError(message: string) {
  const queryBuilder = createMockQueryBuilder()
  queryBuilder.single.mockResolvedValue(mockSupabaseError(message))
  queryBuilder.maybeSingle.mockResolvedValue(mockSupabaseError(message))
  return queryBuilder
}

// =============================================================================
// Export All Mocks
// =============================================================================

export default {
  createMockSupabaseClient,
  mockSupabaseSuccess,
  mockSupabaseError,
  mockAuthError,
  mockSelectSuccess,
  mockInsertSuccess,
  mockUpdateSuccess,
  mockDeleteSuccess,
  mockQueryError,
}
