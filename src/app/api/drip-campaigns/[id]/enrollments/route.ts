/**
 * Drip Campaign Enrollments API
 * Manage contact enrollments in drip campaigns
 */

import { createClient } from '@/lib/supabase/server'
import { DripCampaignEngine } from '@/lib/whatsapp/drip-campaigns'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/drip-campaigns/[id]/enrollments
 * Get all enrollments for a campaign
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get enrollments
    const engine = new DripCampaignEngine(supabase)
    const result = await engine.getEnrollments(params.id, {
      status: status as any,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to get enrollments:', error)
    return NextResponse.json(
      {
        error: 'Failed to get enrollments',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/drip-campaigns/[id]/enrollments
 * Enroll contact(s) in a campaign
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()

    // Validate
    if (!body.contactIds || !Array.isArray(body.contactIds) || body.contactIds.length === 0) {
      return NextResponse.json(
        { error: 'contactIds array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Enroll contacts
    const engine = new DripCampaignEngine(supabase)

    if (body.contactIds.length === 1) {
      // Single enrollment
      const enrollment = await engine.enrollContact(params.id, body.contactIds[0], user.id)
      return NextResponse.json(enrollment, { status: 201 })
    } else {
      // Bulk enrollment
      const result = await engine.enrollContacts(params.id, body.contactIds, user.id)
      return NextResponse.json(result, { status: 201 })
    }
  } catch (error) {
    console.error('Failed to enroll contacts:', error)
    return NextResponse.json(
      {
        error: 'Failed to enroll contacts',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
