/**
 * API Test Helpers
 *
 * Utilities for testing API routes including request mocking,
 * response validation, and authentication helpers.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Profile } from '@/types/database'
import { createMockUser } from './test-helpers'

// =============================================================================
// Type Definitions
// =============================================================================

export interface MockRequestOptions {
  method?: string
  url?: string
  body?: any
  headers?: Record<string, string>
  searchParams?: Record<string, string>
  cookies?: Record<string, string>
}

export interface MockAuthenticatedRequestOptions extends MockRequestOptions {
  user?: Partial<Profile>
  organizationId?: string
}

export interface ApiTestResponse {
  status: number
  data: any
  headers: Headers
}

// =============================================================================
// Request Mocking
// =============================================================================

/**
 * Creates a mock NextRequest object for API testing
 */
export function mockApiRequest(options: MockRequestOptions = {}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body,
    headers = {},
    searchParams = {},
    cookies = {},
  } = options

  // Construct URL with search params
  const urlObj = new URL(url)
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })

  // Create request init object
  const init: RequestInit = {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...headers,
    }),
  }

  // Add body if present
  if (body) {
    init.body = JSON.stringify(body)
  }

  // Create the request
  const request = new NextRequest(urlObj.toString(), init)

  // Add cookies if present
  Object.entries(cookies).forEach(([key, value]) => {
    request.cookies.set(key, value)
  })

  return request
}

/**
 * Creates a mock authenticated API request
 */
export function createAuthenticatedRequest(
  options: MockAuthenticatedRequestOptions = {}
): NextRequest {
  const user = createMockUser(options.user)
  const organizationId = options.organizationId || user.organization_id

  // Add authentication headers
  const headers = {
    ...options.headers,
    'x-user-id': user.id,
    'x-organization-id': organizationId,
    Authorization: `Bearer mock-jwt-token-${user.id}`,
  }

  return mockApiRequest({
    ...options,
    headers,
  })
}

/**
 * Creates a mock unauthenticated API request
 */
export function createUnauthenticatedRequest(options: MockRequestOptions = {}): NextRequest {
  return mockApiRequest(options)
}

// =============================================================================
// Response Mocking & Validation
// =============================================================================

/**
 * Mocks a successful API response
 */
export function mockApiResponse(data: any, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

/**
 * Mocks an error API response
 */
export function mockErrorResponse(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

/**
 * Extracts response data for testing
 */
export async function extractResponseData(response: NextResponse): Promise<ApiTestResponse> {
  const data = await response.json()
  return {
    status: response.status,
    data,
    headers: response.headers,
  }
}

/**
 * Parses response for testing (works with both NextResponse and Response)
 */
export async function parseResponse(response: any): Promise<ApiTestResponse> {
  const text = await response.text()
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return {
    status: response.status,
    data,
    headers: response.headers
  }
}

/**
 * Validates successful API response
 */
export function expectSuccessResponse(response: NextResponse, expectedStatus = 200): void {
  expect(response.status).toBe(expectedStatus)
  expect(response.headers.get('content-type')).toContain('application/json')
}

/**
 * Validates error API response
 * Can accept either a NextResponse object or parsed data
 */
export function expectErrorResponse(
  responseOrData: NextResponse | any,
  expectedStatus = 400,
  errorMessage?: string
): void {
  // If it's parsed data (has an 'error' property directly)
  if (responseOrData && typeof responseOrData === 'object' && 'error' in responseOrData) {
    expect(responseOrData).toHaveProperty('error')
    if (errorMessage) {
      expect(responseOrData.error).toContain(errorMessage)
    }
  } else {
    // It's a Response object
    expect(responseOrData.status).toBe(expectedStatus)
    expect(responseOrData.headers.get('content-type')).toContain('application/json')

    if (errorMessage) {
      responseOrData.json().then((data: any) => {
        expect(data.error).toContain(errorMessage)
      })
    }
  }
}

// =============================================================================
// Authentication Helpers
// =============================================================================

/**
 * Creates a mock JWT token for testing
 */
export function createMockJwtToken(userId: string, organizationId: string): string {
  const payload = {
    sub: userId,
    org_id: organizationId,
    role: 'agent',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  }

  // In real implementation, this would be signed with a secret
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')
  return `mock.${base64Payload}.signature`
}

/**
 * Mocks authentication middleware success
 */
export function mockAuthMiddlewareSuccess(user: Profile): void {
  jest.mock('@/lib/api-middleware', () => ({
    withAuth: (handler: any) => handler,
    getCurrentUser: jest.fn().mockResolvedValue(user),
    requireRole: (role: string) => (handler: any) => handler,
  }))
}

/**
 * Mocks authentication middleware failure
 */
export function mockAuthMiddlewareFailure(error: string = 'Unauthorized'): void {
  jest.mock('@/lib/api-middleware', () => ({
    withAuth: () => {
      throw new Error(error)
    },
    getCurrentUser: jest.fn().mockRejectedValue(new Error(error)),
  }))
}

// =============================================================================
// Request Body Validation
// =============================================================================

/**
 * Validates request body against schema
 */
export function validateRequestBody(body: any, requiredFields: string[]): {
  valid: boolean
  missingFields: string[]
} {
  const missingFields = requiredFields.filter((field) => !(field in body))
  return {
    valid: missingFields.length === 0,
    missingFields,
  }
}

/**
 * Creates invalid request bodies for testing validation
 */
export function createInvalidRequestBodies(
  validBody: Record<string, any>
): Record<string, any>[] {
  const invalidBodies: Record<string, any>[] = []

  // Missing each required field
  Object.keys(validBody).forEach((key) => {
    const body = { ...validBody }
    delete body[key]
    invalidBodies.push(body)
  })

  // Empty strings for string fields
  Object.entries(validBody).forEach(([key, value]) => {
    if (typeof value === 'string') {
      invalidBodies.push({ ...validBody, [key]: '' })
    }
  })

  // Invalid types
  Object.entries(validBody).forEach(([key, value]) => {
    if (typeof value === 'string') {
      invalidBodies.push({ ...validBody, [key]: 123 })
    }
    if (typeof value === 'number') {
      invalidBodies.push({ ...validBody, [key]: 'invalid' })
    }
  })

  return invalidBodies
}

// =============================================================================
// Database Query Mocking
// =============================================================================

/**
 * Mocks a successful database query
 */
export function mockDatabaseQuery<T>(data: T | T[]): {
  data: T | T[]
  error: null
} {
  return { data, error: null }
}

/**
 * Mocks a failed database query
 */
export function mockDatabaseError(message: string): {
  data: null
  error: { message: string; code: string }
} {
  return {
    data: null,
    error: {
      message,
      code: 'PGRST116',
    },
  }
}

/**
 * Mocks tenant isolation check
 */
export function mockTenantIsolation(organizationId: string): jest.Mock {
  return jest.fn().mockImplementation((query) => {
    return {
      ...query,
      eq: jest.fn((field: string, value: string) => {
        if (field === 'organization_id') {
          expect(value).toBe(organizationId)
        }
        return query
      }),
    }
  })
}

// =============================================================================
// Rate Limiting Helpers
// =============================================================================

/**
 * Simulates rate limit reached
 */
export function simulateRateLimit(
  maxRequests: number = 100
): { shouldBlock: boolean; remaining: number } {
  return {
    shouldBlock: true,
    remaining: 0,
  }
}

/**
 * Simulates rate limit not reached
 */
export function simulateRateLimitOk(
  remaining: number = 95
): { shouldBlock: boolean; remaining: number } {
  return {
    shouldBlock: false,
    remaining,
  }
}

// =============================================================================
// API Error Helpers
// =============================================================================

export const ApiErrors = {
  Unauthorized: {
    status: 401,
    message: 'Unauthorized - Please sign in',
  },
  Forbidden: {
    status: 403,
    message: 'Forbidden - Insufficient permissions',
  },
  NotFound: {
    status: 404,
    message: 'Resource not found',
  },
  BadRequest: {
    status: 400,
    message: 'Bad request - Invalid input',
  },
  Conflict: {
    status: 409,
    message: 'Conflict - Resource already exists',
  },
  InternalServerError: {
    status: 500,
    message: 'Internal server error',
  },
  TooManyRequests: {
    status: 429,
    message: 'Too many requests - Please try again later',
  },
}

/**
 * Creates an API error response
 */
export function createApiError(
  errorType: keyof typeof ApiErrors,
  customMessage?: string
): NextResponse {
  const error = ApiErrors[errorType]
  return NextResponse.json(
    { error: customMessage || error.message },
    { status: error.status }
  )
}

// =============================================================================
// Pagination Helpers
// =============================================================================

/**
 * Creates pagination parameters
 */
export function createPaginationParams(page = 1, limit = 20): {
  page: number
  limit: number
  offset: number
} {
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  }
}

/**
 * Creates a paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
} {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      has_next: page * limit < total,
      has_prev: page > 1,
    },
  }
}

// =============================================================================
// Test Scenarios
// =============================================================================

/**
 * Common test scenarios for API routes
 */
export const ApiTestScenarios = {
  /**
   * Test authentication requirement
   */
  requiresAuth: async (handler: (req: NextRequest) => Promise<NextResponse>) => {
    const request = createUnauthenticatedRequest()
    const response = await handler(request)
    expectErrorResponse(response, 401)
  },

  /**
   * Test tenant isolation
   */
  enforcesTenantIsolation: async (
    handler: (req: NextRequest) => Promise<NextResponse>,
    organizationId: string
  ) => {
    const request = createAuthenticatedRequest({ organizationId })
    // Handler should only access data from this organization
    const response = await handler(request)
    expectSuccessResponse(response)
  },

  /**
   * Test input validation
   */
  validatesInput: async (
    handler: (req: NextRequest) => Promise<NextResponse>,
    validBody: Record<string, any>,
    requiredFields: string[]
  ) => {
    const invalidBodies = createInvalidRequestBodies(validBody)

    for (const body of invalidBodies) {
      const request = createAuthenticatedRequest({ body, method: 'POST' })
      const response = await handler(request)
      expectErrorResponse(response, 400)
    }
  },

  /**
   * Test rate limiting
   */
  enforcesRateLimit: async (
    handler: (req: NextRequest) => Promise<NextResponse>,
    maxRequests = 100
  ) => {
    // Simulate max requests
    for (let i = 0; i < maxRequests + 1; i++) {
      const request = createAuthenticatedRequest()
      const response = await handler(request)

      if (i < maxRequests) {
        expect(response.status).not.toBe(429)
      } else {
        expectErrorResponse(response, 429)
      }
    }
  },
}

// =============================================================================
// Export All Helpers
// =============================================================================

/**
 * Alias for mockApiRequest for backward compatibility
 */
export const createMockRequest = mockApiRequest

/**
 * Creates a paginated URL with query parameters
 */
export function createPaginatedUrl(
  baseUrl: string,
  params: { page?: number; limit?: number; sort?: string; order?: string }
): string {
  const url = new URL(baseUrl, 'http://localhost:3000')
  if (params.page) url.searchParams.set('page', params.page.toString())
  if (params.limit) url.searchParams.set('limit', params.limit.toString())
  if (params.sort) url.searchParams.set('sort', params.sort)
  if (params.order) url.searchParams.set('order', params.order)
  return url.toString()
}

/**
 * Validates paginated response structure
 */
export function expectPaginatedResponse(data: any): void {
  expect(data).toHaveProperty('pagination')
  expect(data.pagination).toHaveProperty('page')
  expect(data.pagination).toHaveProperty('limit')
  expect(data.pagination).toHaveProperty('total')
}

export default {
  mockApiRequest,
  createMockRequest,
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  mockApiResponse,
  mockErrorResponse,
  extractResponseData,
  parseResponse,
  expectSuccessResponse,
  expectErrorResponse,
  createMockJwtToken,
  mockAuthMiddlewareSuccess,
  mockAuthMiddlewareFailure,
  validateRequestBody,
  createInvalidRequestBodies,
  mockDatabaseQuery,
  mockDatabaseError,
  mockTenantIsolation,
  simulateRateLimit,
  simulateRateLimitOk,
  ApiErrors,
  createApiError,
  createPaginationParams,
  createPaginatedResponse,
  ApiTestScenarios,
}
