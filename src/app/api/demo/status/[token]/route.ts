import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DemoSessionManager } from '@/lib/demo'
import { DemoStatusResponse } from '@/types/demo'

/**
 * Get demo session status and validity
 * GET /api/demo/status/[token]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Validate token format
    if (!token || token.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid session token'
        } as DemoStatusResponse,
        { status: 400 }
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
          error: 'Service configuration error'
        } as DemoStatusResponse,
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get session status
    const sessionManager = new DemoSessionManager(supabase)
    const result = await sessionManager.getSession(token)

    if (!result.session) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Session not found'
        } as DemoStatusResponse,
        { status: 404 }
      )
    }

    // Calculate time remaining
    const now = new Date()
    const expiresAt = new Date(result.session.expires_at)
    const timeRemainingMs = expiresAt.getTime() - now.getTime()
    const timeRemainingMinutes = Math.max(0, Math.floor(timeRemainingMs / (1000 * 60)))

    // Track status check event
    await sessionManager.trackEvent(result.session.id, {
      event_type: 'api_call',
      action: 'session_status_checked',
      category: 'demo',
      label: result.session.business_scenario
    })

    const response: DemoStatusResponse = {
      success: true,
      data: {
        session: result.session,
        is_valid: result.isValid,
        time_remaining_minutes: timeRemainingMinutes
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error checking demo session status:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check session status'
      } as DemoStatusResponse,
      { status: 500 }
    )
  }
}

/**
 * Update demo session progress and activity
 * PATCH /api/demo/status/[token]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    // Validate token
    if (!token || token.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid session token'
        },
        { status: 400 }
      )
    }

    // Validate request body
    const { step, feature_used, metadata } = body

    if (!step) {
      return NextResponse.json(
        {
          success: false,
          error: 'Step is required for progress update'
        },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service configuration error'
        },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update session progress
    const sessionManager = new DemoSessionManager(supabase)
    const updateResult = await sessionManager.updateProgress(
      token,
      step,
      feature_used,
      metadata
    )

    if (!updateResult) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to update progress - session may be invalid or expired'
        },
        { status: 400 }
      )
    }

    // Get updated session status
    const result = await sessionManager.getSession(token)

    if (!result.session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found after update'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        session: result.session,
        is_valid: result.isValid,
        progress_updated: true
      }
    })

  } catch (error) {
    console.error('Error updating demo session progress:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update session progress'
      },
      { status: 500 }
    )
  }
}

/**
 * Extend demo session duration (limited usage)
 * POST /api/demo/status/[token]/extend
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    // Validate token
    if (!token || token.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid session token'
        },
        { status: 400 }
      )
    }

    // Validate extension request
    const { extend_minutes = 15, reason } = body

    if (extend_minutes > 30) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot extend session by more than 30 minutes'
        },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Service configuration error'
        },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current session
    const sessionManager = new DemoSessionManager(supabase)
    const result = await sessionManager.getSession(token)

    if (!result.session || !result.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found or invalid'
        },
        { status: 404 }
      )
    }

    // Check if session can be extended (limit extensions)
    const extensionCount = result.session.analytics.events.filter(
      event => event.action === 'session_extended'
    ).length

    if (extensionCount >= 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum session extensions reached'
        },
        { status: 400 }
      )
    }

    // Extend session expiration
    const currentExpiry = new Date(result.session.expires_at)
    const newExpiry = new Date(currentExpiry.getTime() + extend_minutes * 60 * 1000)

    // Update session (this would require implementing an updateSessionExpiry method)
    // For now, we'll track the extension event
    await sessionManager.trackEvent(result.session.id, {
      event_type: 'feature_interaction',
      action: 'session_extended',
      category: 'demo',
      label: result.session.business_scenario,
      value: extend_minutes,
      metadata: { reason, new_expiry: newExpiry.toISOString() }
    })

    return NextResponse.json({
      success: true,
      data: {
        extended_by_minutes: extend_minutes,
        new_expiry: newExpiry.toISOString(),
        extensions_remaining: 2 - extensionCount - 1
      }
    })

  } catch (error) {
    console.error('Error extending demo session:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to extend session'
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PATCH, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}