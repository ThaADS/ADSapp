import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { DemoSessionManager } from '@/lib/demo'
import { ResetDemoDataRequest, ResetDemoDataResponse } from '@/types/demo'

/**
 * Reset demo data for a session
 * POST /api/demo/reset/[token]
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    // Validate token
    if (!token || token.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid session token'
        } as ResetDemoDataResponse,
        { status: 400 }
      )
    }

    // Parse request body
    const body: ResetDemoDataRequest = await request.json()

    // Validate confirmation
    if (!body.confirm) {
      return NextResponse.json(
        {
          success: false,
          error: 'Confirmation required. Set confirm: true to proceed with reset.'
        } as ResetDemoDataResponse,
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
        } as ResetDemoDataResponse,
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Reset demo session data
    const sessionManager = new DemoSessionManager(supabase)
    const result = await sessionManager.resetSessionData(token)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to reset demo data'
        } as ResetDemoDataResponse,
        { status: 400 }
      )
    }

    const response: ResetDemoDataResponse = {
      success: true,
      data: {
        reset_at: new Date().toISOString(),
        items_reset: result.itemsReset || {
          contacts: 0,
          conversations: 0,
          messages: 0
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error resetting demo data:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset demo data. Please try again.'
      } as ResetDemoDataResponse,
      { status: 500 }
    )
  }
}

/**
 * Get reset information and preview what would be reset
 * GET /api/demo/reset/[token]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

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

    // Get session to verify it exists and get organization info
    const sessionManager = new DemoSessionManager(supabase)
    const sessionResult = await sessionManager.getSession(token)

    if (!sessionResult.session || !sessionResult.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found or invalid'
        },
        { status: 404 }
      )
    }

    // Get current data counts for the organization
    const organizationId = sessionResult.session.organization_id

    // Count contacts
    const { count: contactsCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    // Count conversations
    const { count: conversationsCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organizationId)

    // Count messages (through conversations)
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', organizationId)

    let messagesCount = 0
    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id)
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)

      messagesCount = count || 0
    }

    // Get reset history for this session
    const resetEvents = sessionResult.session.analytics.events.filter(
      event => event.action === 'demo_data_reset'
    )

    return NextResponse.json({
      success: true,
      data: {
        session_info: {
          scenario: sessionResult.session.business_scenario,
          organization_id: organizationId,
          created_at: sessionResult.session.created_at,
          progress: sessionResult.session.progress
        },
        current_data: {
          contacts: contactsCount || 0,
          conversations: conversationsCount || 0,
          messages: messagesCount
        },
        reset_history: {
          times_reset: resetEvents.length,
          last_reset: resetEvents.length > 0
            ? resetEvents[resetEvents.length - 1].timestamp
            : null
        },
        warning: 'Resetting will permanently delete all demo data and restore original sample data for this scenario.'
      }
    })

  } catch (error) {
    console.error('Error getting reset information:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get reset information'
      },
      { status: 500 }
    )
  }
}

/**
 * Bulk reset multiple demo sessions (admin endpoint)
 * DELETE /api/demo/reset/[token]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    // This endpoint is for admin use to force-delete sessions
    // Validate admin access here (check for admin API key, etc.)

    const adminKey = request.headers.get('x-admin-key')

    if (!adminKey || adminKey !== process.env.DEMO_ADMIN_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Admin access required'
        },
        { status: 401 }
      )
    }

    const { token } = params

    // Special handling for bulk operations
    if (token === 'all-expired') {
      return await handleBulkExpiredReset(request)
    }

    // Validate token for single session deletion
    if (!token || token.length < 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid session token'
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

    // Get session
    const sessionManager = new DemoSessionManager(supabase)
    const sessionResult = await sessionManager.getSession(token)

    if (!sessionResult.session) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session not found'
        },
        { status: 404 }
      )
    }

    // Delete organization and all related data
    const organizationId = sessionResult.session.organization_id

    // Delete in correct order due to foreign key constraints
    // 1. Messages
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', organizationId)

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id)
      await supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds)
    }

    // 2. Conversations
    await supabase
      .from('conversations')
      .delete()
      .eq('organization_id', organizationId)

    // 3. Contacts
    await supabase
      .from('contacts')
      .delete()
      .eq('organization_id', organizationId)

    // 4. Profiles (if any demo users were created)
    await supabase
      .from('profiles')
      .delete()
      .eq('organization_id', organizationId)

    // 5. Organization
    await supabase
      .from('organizations')
      .delete()
      .eq('id', organizationId)

    return NextResponse.json({
      success: true,
      data: {
        deleted_at: new Date().toISOString(),
        organization_id: organizationId,
        session_token: token
      }
    })

  } catch (error) {
    console.error('Error force deleting demo session:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete demo session'
      },
      { status: 500 }
    )
  }
}

/**
 * Handle bulk cleanup of expired demo sessions
 */
async function handleBulkExpiredReset(request: NextRequest) {
  try {
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

    // Find demo organizations (those with demo- prefix in slug)
    const { data: demoOrganizations } = await supabase
      .from('organizations')
      .select('id, slug, created_at')
      .like('slug', 'demo-%')

    if (!demoOrganizations || demoOrganizations.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          deleted_sessions: 0,
          message: 'No demo sessions found'
        }
      })
    }

    // Filter expired sessions (older than 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const expiredOrganizations = demoOrganizations.filter(org =>
      new Date(org.created_at) < twoHoursAgo
    )

    let deletedCount = 0

    // Delete expired demo organizations and their data
    for (const org of expiredOrganizations) {
      try {
        // Delete in correct order
        const { data: conversations } = await supabase
          .from('conversations')
          .select('id')
          .eq('organization_id', org.id)

        if (conversations && conversations.length > 0) {
          const conversationIds = conversations.map(c => c.id)
          await supabase
            .from('messages')
            .delete()
            .in('conversation_id', conversationIds)
        }

        await supabase.from('conversations').delete().eq('organization_id', org.id)
        await supabase.from('contacts').delete().eq('organization_id', org.id)
        await supabase.from('profiles').delete().eq('organization_id', org.id)
        await supabase.from('organizations').delete().eq('id', org.id)

        deletedCount++
      } catch (error) {
        console.error(`Failed to delete demo organization ${org.id}:`, error)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        deleted_sessions: deletedCount,
        total_found: demoOrganizations.length,
        expired_found: expiredOrganizations.length,
        cleaned_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in bulk cleanup:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to perform bulk cleanup'
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
    },
  })
}