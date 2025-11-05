// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { NextRequest, NextResponse } from 'next/server'
import { createErrorResponse, rateLimit, ApiException } from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'

export interface ApiMiddlewareOptions {
  requireAuth?: boolean
  requireOrganization?: boolean
  rateLimiting?: {
    windowMs: number
    max: number
    keyGenerator?: (request: NextRequest) => string
  }
  validation?: {
    body?: any // Zod schema or custom validation function
    query?: any
    params?: any
  }
  cors?: {
    origin?: string | string[]
    methods?: string[]
    headers?: string[]
  }
  logging?: boolean
}

export function withApiMiddleware(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options: ApiMiddlewareOptions = {}
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const startTime = Date.now()

    try {
      // CORS handling
      if (options.cors) {
        const corsResponse = handleCors(request, options.cors)
        if (corsResponse) return corsResponse
      }

      // Rate limiting
      if (options.rateLimiting) {
        const rateLimiter = rateLimit(options.rateLimiting)
        await rateLimiter(request)
      }

      // Request validation
      if (options.validation) {
        await validateRequest(request, options.validation)
      }

      // Authentication
      let user = null
      let profile = null

      if (options.requireAuth || options.requireOrganization) {
        const authResult = await handleAuthentication(request)
        user = authResult.user
        profile = authResult.profile

        if (options.requireOrganization && !profile?.organization_id) {
          throw new ApiException('Organization required', 403, 'NO_ORGANIZATION')
        }
      }

      // Add context
      const enhancedContext = {
        ...context,
        user,
        profile,
        startTime
      }

      // Execute handler
      const response = await handler(request, enhancedContext)

      // Logging
      if (options.logging) {
        await logApiRequest(request, response, user?.id, Date.now() - startTime)
      }

      return response

    } catch (error) {
      // Error logging
      if (options.logging) {
        await logApiError(request, error, Date.now() - startTime)
      }

      return createErrorResponse(error)
    }
  }
}

function handleCors(request: NextRequest, corsOptions: any): NextResponse | null {
  const origin = request.headers.get('origin')
  const method = request.method

  // Handle preflight requests
  if (method === 'OPTIONS') {
    const headers = new Headers()

    if (corsOptions.origin) {
      if (Array.isArray(corsOptions.origin)) {
        if (origin && corsOptions.origin.includes(origin)) {
          headers.set('Access-Control-Allow-Origin', origin)
        }
      } else if (corsOptions.origin === '*' || corsOptions.origin === origin) {
        headers.set('Access-Control-Allow-Origin', corsOptions.origin)
      }
    }

    if (corsOptions.methods) {
      headers.set('Access-Control-Allow-Methods', corsOptions.methods.join(', '))
    }

    if (corsOptions.headers) {
      headers.set('Access-Control-Allow-Headers', corsOptions.headers.join(', '))
    }

    headers.set('Access-Control-Max-Age', '86400')

    return new NextResponse(null, { status: 200, headers })
  }

  return null
}

async function validateRequest(request: NextRequest, validation: any) {
  // Body validation
  if (validation.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const body = await request.json()

      if (typeof validation.body === 'function') {
        const result = validation.body(body)
        if (!result.success) {
          throw new ApiException(
            `Validation error: ${result.error.issues?.[0]?.message || 'Invalid request body'}`,
            400,
            'VALIDATION_ERROR'
          )
        }
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ApiException('Invalid JSON in request body', 400, 'INVALID_JSON')
      }
      throw error
    }
  }

  // Query parameters validation
  if (validation.query) {
    const { searchParams } = new URL(request.url)
    const queryObject = Object.fromEntries(searchParams.entries())

    if (typeof validation.query === 'function') {
      const result = validation.query(queryObject)
      if (!result.success) {
        throw new ApiException(
          `Query validation error: ${result.error.issues?.[0]?.message || 'Invalid query parameters'}`,
          400,
          'QUERY_VALIDATION_ERROR'
        )
      }
    }
  }
}

async function handleAuthentication(request: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new ApiException('Authentication required', 401, 'UNAUTHORIZED')
  }

  // Get user profile with organization
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('Error fetching user profile:', profileError)
    throw new ApiException('Failed to fetch user profile', 500, 'PROFILE_ERROR')
  }

  return { user, profile }
}

async function logApiRequest(
  request: NextRequest,
  response: NextResponse,
  userId?: string,
  duration?: number
) {
  try {
    const supabase = await createClient()

    const logData = {
      method: request.method,
      url: request.url,
      user_agent: request.headers.get('user-agent'),
      ip_address: getClientIP(request),
      user_id: userId,
      status_code: response.status,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }

    await supabase
      .from('api_logs')
      .insert(logData)
  } catch (error) {
    console.error('Failed to log API request:', error)
  }
}

async function logApiError(
  request: NextRequest,
  error: any,
  duration?: number
) {
  try {
    const supabase = await createClient()

    const errorData = {
      method: request.method,
      url: request.url,
      error_message: error.message,
      error_stack: error.stack,
      error_code: error.code || 'UNKNOWN_ERROR',
      user_agent: request.headers.get('user-agent'),
      ip_address: getClientIP(request),
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }

    await supabase
      .from('api_error_logs')
      .insert(errorData)
  } catch (logError) {
    console.error('Failed to log API error:', logError)
  }
}

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const cf = request.headers.get('cf-connecting-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  return real || cf || 'unknown'
}

// Pre-configured middleware combinations for common use cases

export const withAuth = (handler: any) => withApiMiddleware(handler, {
  requireAuth: true,
  logging: true,
  rateLimiting: {
    windowMs: 60 * 1000, // 1 minute
    max: 100 // 100 requests per minute
  }
})

export const withOrganization = (handler: any) => withApiMiddleware(handler, {
  requireAuth: true,
  requireOrganization: true,
  logging: true,
  rateLimiting: {
    windowMs: 60 * 1000,
    max: 100
  }
})

export const withStrictRateLimit = (handler: any) => withApiMiddleware(handler, {
  requireAuth: true,
  requireOrganization: true,
  logging: true,
  rateLimiting: {
    windowMs: 60 * 1000, // 1 minute
    max: 10 // 10 requests per minute
  }
})

export const withPublicAccess = (handler: any) => withApiMiddleware(handler, {
  requireAuth: false,
  logging: true,
  rateLimiting: {
    windowMs: 60 * 1000,
    max: 50 // 50 requests per minute for public endpoints
  },
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization']
  }
})

// Webhook middleware with different rate limiting
export const withWebhook = (handler: any) => withApiMiddleware(handler, {
  requireAuth: false,
  logging: true,
  rateLimiting: {
    windowMs: 60 * 1000,
    max: 1000, // Higher limit for webhooks
    keyGenerator: (request) => request.headers.get('x-forwarded-for') || 'webhook'
  }
})