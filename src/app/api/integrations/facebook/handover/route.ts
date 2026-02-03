/**
 * Facebook Messenger Handover Protocol Endpoint
 *
 * POST /api/integrations/facebook/handover - Transfer thread control
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getFacebookConnection,
  passThreadControl,
  takeThreadControl
} from '@/lib/integrations/facebook'

export async function POST(request: NextRequest) {
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

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get Facebook connection
    const connection = await getFacebookConnection(profile.organization_id)
    if (!connection) {
      return NextResponse.json(
        { error: 'Facebook not connected' },
        { status: 400 }
      )
    }

    // Parse body
    const body = await request.json()

    // Validate required fields
    if (!body.psid || !body.action) {
      return NextResponse.json(
        { error: 'Missing required fields: psid, action' },
        { status: 400 }
      )
    }

    // Validate action
    if (!['pass', 'take'].includes(body.action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "pass" or "take"' },
        { status: 400 }
      )
    }

    let success = false

    if (body.action === 'pass') {
      // Pass thread control to another app (default: Page Inbox)
      success = await passThreadControl(
        connection,
        body.psid,
        body.target_app_id, // Optional, defaults to Page Inbox
        body.metadata
      )
    } else if (body.action === 'take') {
      // Take thread control back
      success = await takeThreadControl(
        connection,
        body.psid,
        body.metadata
      )
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Handover operation failed' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      action: body.action,
      psid: body.psid
    })
  } catch (error) {
    console.error('Facebook handover error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
