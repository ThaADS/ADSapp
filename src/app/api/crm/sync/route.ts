/**
 * CRM Sync API
 *
 * Handles manual sync triggers and sync status queries
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSyncManager } from '@/lib/crm/sync-manager'

/**
 * POST /api/crm/sync
 * Trigger manual sync
 */
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

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { crmType, syncType = 'full', contactId } = body

    if (!crmType || !['salesforce', 'hubspot', 'pipedrive'].includes(crmType)) {
      return NextResponse.json({ error: 'Invalid CRM type' }, { status: 400 })
    }

    // Check if CRM is connected
    const { data: connection } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('crm_type', crmType)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'CRM not connected' }, { status: 404 })
    }

    if (connection.status !== 'active') {
      return NextResponse.json({ error: 'CRM connection is not active' }, { status: 400 })
    }

    // Create sync manager
    const syncManager = await createSyncManager(profile.organization_id, crmType)

    let result

    // Handle different sync types
    if (contactId) {
      // Single contact sync
      await syncManager.syncContact(contactId, 'to_crm')
      result = {
        success: true,
        message: 'Contact synced successfully',
      }
    } else if (syncType === 'delta') {
      // Delta sync
      result = await syncManager.deltaSync()
    } else {
      // Full sync
      result = await syncManager.fullSync()
    }

    return NextResponse.json({
      success: result.success,
      recordsProcessed: result.recordsProcessed,
      recordsSuccess: result.recordsSuccess,
      recordsFailed: result.recordsFailed,
      duration: result.duration,
      errors: result.errors,
    })
  } catch (error) {
    console.error('CRM sync error:', error)
    return NextResponse.json(
      {
        error: 'Sync failed',
        details: error instanceof Error ? error.message : error,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/crm/sync
 * Get sync status and history
 */
export async function GET(request: NextRequest) {
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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const searchParams = request.nextUrl.searchParams
    const crmType = searchParams.get('crm_type')

    if (!crmType) {
      return NextResponse.json({ error: 'CRM type required' }, { status: 400 })
    }

    // Get connection
    const { data: connection } = await supabase
      .from('crm_connections')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('crm_type', crmType)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'CRM not connected' }, { status: 404 })
    }

    // Create sync manager
    const syncManager = await createSyncManager(profile.organization_id, crmType)

    // Get sync history
    const history = await syncManager.getSyncHistory(10)

    // Get connection status
    const status = await syncManager.getConnectionStatus()

    return NextResponse.json({
      connection: {
        id: connection.id,
        crmType: connection.crm_type,
        status: connection.status,
        lastSync: connection.last_sync_at,
        lastError: connection.last_error,
      },
      status,
      history,
    })
  } catch (error) {
    console.error('Sync status error:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}
