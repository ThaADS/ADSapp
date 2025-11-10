/**
 * CRM Connection API
 *
 * Handles OAuth flows and connection management for CRM integrations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SalesforceAuth } from '@/lib/crm/salesforce/auth'
import { HubSpotAuth } from '@/lib/crm/hubspot/auth'
import { PipedriveAuth } from '@/lib/crm/pipedrive/auth'

/**
 * POST /api/crm/connect
 * Initiate OAuth flow or validate API token
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

    // Check permissions (only admin can connect CRM)
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { crmType, config } = body

    if (!crmType || !['salesforce', 'hubspot', 'pipedrive'].includes(crmType)) {
      return NextResponse.json({ error: 'Invalid CRM type' }, { status: 400 })
    }

    let authUrl: string | null = null
    let connectionId: string | null = null

    // Handle different CRM types
    switch (crmType) {
      case 'salesforce': {
        const auth = new SalesforceAuth({
          clientId: config.clientId || process.env.SALESFORCE_CLIENT_ID!,
          clientSecret: config.clientSecret || process.env.SALESFORCE_CLIENT_SECRET!,
          redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/connect/callback`,
          environment: config.environment || 'production',
        })

        // Generate state for CSRF protection
        const state = `${profile.organization_id}:${crmType}:${Date.now()}`
        authUrl = auth.getAuthorizationUrl(state)
        break
      }

      case 'hubspot': {
        const auth = new HubSpotAuth({
          clientId: config.clientId || process.env.HUBSPOT_CLIENT_ID!,
          clientSecret: config.clientSecret || process.env.HUBSPOT_CLIENT_SECRET!,
          redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/connect/callback`,
        })

        const state = `${profile.organization_id}:${crmType}:${Date.now()}`
        authUrl = auth.getAuthorizationUrl(state)
        break
      }

      case 'pipedrive': {
        // Pipedrive uses API token, no OAuth needed
        if (!config.apiToken) {
          return NextResponse.json({ error: 'API token required' }, { status: 400 })
        }

        const auth = new PipedriveAuth({
          apiToken: config.apiToken,
          companyDomain: config.companyDomain,
        })

        // Validate token
        const isValid = await auth.validateToken()
        if (!isValid) {
          return NextResponse.json({ error: 'Invalid API token' }, { status: 400 })
        }

        // Create connection directly
        const { data: connection, error: connectionError } = await supabase
          .from('crm_connections')
          .insert({
            organization_id: profile.organization_id,
            crm_type: crmType,
            status: 'active',
            credentials: {
              apiKey: config.apiToken,
            },
            settings: config.settings || {},
          })
          .select('id')
          .single()

        if (connectionError) {
          throw connectionError
        }

        connectionId = connection.id
        break
      }
    }

    if (authUrl) {
      return NextResponse.json({ authUrl })
    }

    return NextResponse.json({ connectionId, message: 'Connection created successfully' })
  } catch (error) {
    console.error('CRM connection error:', error)
    return NextResponse.json(
      { error: 'Failed to connect CRM', details: error instanceof Error ? error.message : error },
      { status: 500 }
    )
  }
}

/**
 * GET /api/crm/connect/callback
 * OAuth callback handler
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/crm?error=${error}`
      )
    }

    if (!code || !state) {
      return NextResponse.json({ error: 'Invalid callback parameters' }, { status: 400 })
    }

    // Parse state
    const [organizationId, crmType] = state.split(':')

    const supabase = await createClient()

    // Exchange code for token
    let credentials

    switch (crmType) {
      case 'salesforce': {
        const auth = new SalesforceAuth({
          clientId: process.env.SALESFORCE_CLIENT_ID!,
          clientSecret: process.env.SALESFORCE_CLIENT_SECRET!,
          redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/connect/callback`,
        })

        credentials = await auth.exchangeCodeForToken(code)
        break
      }

      case 'hubspot': {
        const auth = new HubSpotAuth({
          clientId: process.env.HUBSPOT_CLIENT_ID!,
          clientSecret: process.env.HUBSPOT_CLIENT_SECRET!,
          redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/crm/connect/callback`,
        })

        credentials = await auth.exchangeCodeForToken(code)
        break
      }

      default:
        return NextResponse.json({ error: 'Unsupported CRM type' }, { status: 400 })
    }

    // Store connection
    const { error: insertError } = await supabase.from('crm_connections').insert({
      organization_id: organizationId,
      crm_type: crmType,
      status: 'active',
      credentials,
      settings: {},
    })

    if (insertError) {
      throw insertError
    }

    // Redirect to settings page
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/crm?success=true&crm=${crmType}`
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/crm?error=connection_failed`
    )
  }
}

/**
 * DELETE /api/crm/connect
 * Disconnect CRM
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const crmType = searchParams.get('crm_type')

    if (!crmType) {
      return NextResponse.json({ error: 'CRM type required' }, { status: 400 })
    }

    // Delete connection
    const { error: deleteError } = await supabase
      .from('crm_connections')
      .delete()
      .eq('organization_id', profile.organization_id)
      .eq('crm_type', crmType)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({ message: 'Connection deleted successfully' })
  } catch (error) {
    console.error('CRM disconnection error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect CRM' },
      { status: 500 }
    )
  }
}
