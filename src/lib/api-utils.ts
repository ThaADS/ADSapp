import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'

export interface ApiError {
  message: string
  code: string
  statusCode: number
}

export class ApiException extends Error {
  public statusCode: number
  public code: string

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'ApiException'
  }
}

export function createErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiException) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    console.error('API Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      error: 'Unknown error occurred',
      code: 'UNKNOWN_ERROR'
    },
    { status: 500 }
  )
}

export function createSuccessResponse(data: any, statusCode: number = 200): NextResponse {
  return NextResponse.json({
    success: true,
    data
  }, { status: statusCode })
}

export async function validateRequest(request: NextRequest, schema?: any): Promise<any> {
  const contentType = request.headers.get('content-type')

  if (contentType?.includes('application/json')) {
    try {
      const body = await request.json()

      if (schema) {
        // Add validation logic here if needed
        // Could integrate with Zod or similar validation library
      }

      return body
    } catch (error) {
      throw new ApiException('Invalid JSON in request body', 400, 'INVALID_JSON')
    }
  }

  return null
}

export async function requireAuthenticatedUser() {
  const user = await getUser()

  if (!user) {
    throw new ApiException('Authentication required', 401, 'UNAUTHORIZED')
  }

  return user
}

export async function getUserOrganization(userId: string) {
  const supabase = await createClient()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id, organization:organizations(*)')
    .eq('id', userId)
    .single()

  if (error || !profile?.organization_id) {
    throw new ApiException('No organization found', 404, 'NO_ORGANIZATION')
  }

  return profile
}

export interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  max: number // Maximum requests per window
  keyGenerator?: (request: NextRequest) => string
}

// Simple in-memory rate limiter (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(options: RateLimitOptions) {
  return async (request: NextRequest) => {
    const key = options.keyGenerator
      ? options.keyGenerator(request)
      : request.ip || 'anonymous'

    const now = Date.now()
    const windowStart = now - options.windowMs

    // Clean up old entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k)
      }
    }

    const current = rateLimitStore.get(key)

    if (!current || current.resetTime < now) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      })
      return true
    }

    if (current.count >= options.max) {
      throw new ApiException(
        'Too many requests',
        429,
        'RATE_LIMIT_EXCEEDED'
      )
    }

    current.count++
    return true
  }
}

export function validatePagination(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

export function validateSortOrder(request: NextRequest, allowedFields: string[]) {
  const { searchParams } = new URL(request.url)

  const sortBy = searchParams.get('sortBy') || 'created_at'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  if (!allowedFields.includes(sortBy)) {
    throw new ApiException(
      `Invalid sort field. Allowed: ${allowedFields.join(', ')}`,
      400,
      'INVALID_SORT_FIELD'
    )
  }

  if (!['asc', 'desc'].includes(sortOrder)) {
    throw new ApiException(
      'Invalid sort order. Must be "asc" or "desc"',
      400,
      'INVALID_SORT_ORDER'
    )
  }

  return { sortBy, sortOrder, ascending: sortOrder === 'asc' }
}