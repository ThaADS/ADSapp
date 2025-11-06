import { NextRequest, NextResponse } from 'next/server'

/**
 * Reset current demo session (simple client-side reset)
 * POST /api/demo/reset/current
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scenario, preserveScenario = false } = body

    // For demo purposes, we just return success
    // In a real implementation, this would reset server-side demo data
    // For now, the demo context handles local state reset

    return NextResponse.json({
      success: true,
      data: {
        reset_at: new Date().toISOString(),
        scenario: preserveScenario ? scenario : 'ecommerce',
        items_reset: {
          contacts: 5,
          conversations: 3,
          messages: 12,
        },
      },
    })
  } catch (error) {
    console.error('Error resetting current demo:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reset demo. Please try again.',
      },
      { status: 500 }
    )
  }
}

/**
 * Get current demo session info
 * GET /api/demo/reset/current
 */
export async function GET(request: NextRequest) {
  try {
    // For demo purposes, return mock session info
    return NextResponse.json({
      success: true,
      data: {
        session_info: {
          scenario: 'ecommerce',
          created_at: new Date().toISOString(),
          progress: 25,
        },
        current_data: {
          contacts: 5,
          conversations: 3,
          messages: 12,
        },
        reset_history: {
          times_reset: 0,
          last_reset: null,
        },
        warning: 'Resetting will restart the demo with fresh sample data.',
      },
    })
  } catch (error) {
    console.error('Error getting current demo info:', error)

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
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
