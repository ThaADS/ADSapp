import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { DemoSessionManager } from '@/lib/demo'
import { CreateDemoSessionRequest, CreateDemoSessionResponse, BusinessScenario } from '@/types/demo'

// SECURITY FIX: Allowed origins for demo endpoints - whitelist instead of wildcard
const ALLOWED_DEMO_ORIGINS = [
  'https://app.adsapp.nl',
  'https://adsapp.nl',
  'https://www.adsapp.nl',
  process.env.NEXT_PUBLIC_APP_URL,
  // Development origins
  ...(process.env.NODE_ENV === 'development' ? [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
  ] : []),
].filter(Boolean) as string[]

function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_DEMO_ORIGINS.includes(origin) ? origin : ALLOWED_DEMO_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
  }
}

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Create a new demo session
 * POST /api/demo/start
 */
export async function POST(request: NextRequest) {
  try {
    // Get client IP and user agent
    const headersList = headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIP = headersList.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIP || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // Parse request body
    const body: CreateDemoSessionRequest = await request.json()

    // Validate required fields
    if (!body.business_scenario) {
      return NextResponse.json(
        {
          success: false,
          error: 'Business scenario is required',
        } as CreateDemoSessionResponse,
        { status: 400 }
      )
    }

    // Validate business scenario
    const validScenarios: BusinessScenario[] = [
      'retail',
      'restaurant',
      'real_estate',
      'healthcare',
      'education',
      'ecommerce',
      'automotive',
      'travel',
      'fitness',
      'generic',
    ]

    if (!validScenarios.includes(body.business_scenario)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid business scenario',
        } as CreateDemoSessionResponse,
        { status: 400 }
      )
    }

    // Check rate limiting
    const rateLimitResult = checkRateLimit(ipAddress)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          rate_limit: {
            ip_address: ipAddress,
            current_sessions: rateLimitResult.currentCount,
            sessions_in_window: rateLimitResult.currentCount,
            is_blocked: true,
            reset_time: new Date(rateLimitResult.resetTime).toISOString(),
          },
        } as CreateDemoSessionResponse,
        { status: 429 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration')
      return NextResponse.json(
        {
          success: false,
          error: 'Service configuration error',
        } as CreateDemoSessionResponse,
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Create demo session
    const sessionManager = new DemoSessionManager(supabase)
    const result = await sessionManager.createSession(
      body.business_scenario,
      ipAddress,
      userAgent,
      {
        referrer: body.referrer,
        utm_params: body.utm_params,
        timestamp: new Date().toISOString(),
      }
    )

    if (result.error) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        } as CreateDemoSessionResponse,
        { status: 400 }
      )
    }

    // Update rate limit counter
    updateRateLimit(ipAddress)

    // Generate access token (in a real implementation, this would be a JWT)
    const accessToken = generateDemoAccessToken(result.session.token, result.organization.id)

    // Generate dashboard URL
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/demo/${result.session.token}/dashboard`

    // Track demo creation analytics
    await sessionManager.trackEvent(result.session.id, {
      event_type: 'conversion',
      action: 'demo_session_created',
      category: 'demo',
      label: body.business_scenario,
      metadata: {
        ip_address: ipAddress,
        user_agent: userAgent,
        referrer: body.referrer,
        utm_params: body.utm_params,
      },
    })

    const response: CreateDemoSessionResponse = {
      success: true,
      data: {
        session: result.session,
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
        },
        access_token: accessToken,
        dashboard_url: dashboardUrl,
      },
    }

    return NextResponse.json(response, {
      status: 201,
      headers: getCorsHeaders(request),
    })
  } catch (error) {
    console.error('Error creating demo session:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create demo session. Please try again.',
      } as CreateDemoSessionResponse,
      { status: 500 }
    )
  }
}

/**
 * Get demo session creation limits and info
 * GET /api/demo/start
 */
export async function GET(request: NextRequest) {
  try {
    const headersList = headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIP = headersList.get('x-real-ip')
    const ipAddress = forwardedFor?.split(',')[0] || realIP || 'unknown'

    const rateLimitResult = checkRateLimit(ipAddress)

    return NextResponse.json({
      success: true,
      data: {
        rate_limit: {
          ip_address: ipAddress,
          current_sessions: rateLimitResult.currentCount,
          max_sessions: 3, // From DEFAULT_DEMO_SECURITY_POLICY
          sessions_in_window: rateLimitResult.currentCount,
          max_sessions_per_hour: 10,
          is_blocked: !rateLimitResult.allowed,
          reset_time: new Date(rateLimitResult.resetTime).toISOString(),
        },
        available_scenarios: [
          'retail',
          'restaurant',
          'real_estate',
          'healthcare',
          'education',
          'ecommerce',
          'automotive',
          'travel',
          'fitness',
          'generic',
        ],
        session_duration_minutes: 30,
      },
    })
  } catch (error) {
    console.error('Error getting demo info:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get demo information',
      },
      { status: 500 }
    )
  }
}

/**
 * Simple rate limiting implementation
 * In production, use Redis or a proper rate limiting service
 */
function checkRateLimit(ipAddress: string): {
  allowed: boolean
  currentCount: number
  resetTime: number
} {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour
  const maxRequests = 10

  // Clean up expired entries
  for (const [ip, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(ip)
    }
  }

  const existing = rateLimitStore.get(ipAddress)

  if (!existing) {
    return {
      allowed: true,
      currentCount: 0,
      resetTime: now + windowMs,
    }
  }

  return {
    allowed: existing.count < maxRequests,
    currentCount: existing.count,
    resetTime: existing.resetTime,
  }
}

function updateRateLimit(ipAddress: string): void {
  const now = Date.now()
  const windowMs = 60 * 60 * 1000 // 1 hour

  const existing = rateLimitStore.get(ipAddress)

  if (!existing || now > existing.resetTime) {
    rateLimitStore.set(ipAddress, {
      count: 1,
      resetTime: now + windowMs,
    })
  } else {
    rateLimitStore.set(ipAddress, {
      count: existing.count + 1,
      resetTime: existing.resetTime,
    })
  }
}

/**
 * Generate a demo access token
 * In production, use proper JWT with expiration
 */
function generateDemoAccessToken(sessionToken: string, organizationId: string): string {
  // Simple token format: demo_[sessionToken]_[organizationId]_[timestamp]
  const timestamp = Date.now()
  return `demo_${sessionToken}_${organizationId}_${timestamp}`
}

/**
 * OPTIONS handler for CORS
 * SECURITY: Uses origin whitelist instead of wildcard
 */
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const allowedOrigin = ALLOWED_DEMO_ORIGINS.includes(origin) ? origin : ALLOWED_DEMO_ORIGINS[0]

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  })
}
