/**
 * Messenger Templates Endpoint
 *
 * GET /api/integrations/facebook/templates - List templates
 * POST /api/integrations/facebook/templates - Create template
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFacebookConnection } from '@/lib/integrations/facebook'

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

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get templates
    const { data: templates, error } = await supabase
      .from('messenger_templates')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    console.error('Get Messenger templates error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Get user's organization and role
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only admins and owners can create templates
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Check Facebook connection
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
    if (!body.name || !body.template_type || !body.template_payload) {
      return NextResponse.json(
        { error: 'Missing required fields: name, template_type, template_payload' },
        { status: 400 }
      )
    }

    // Validate template type
    const validTypes = ['generic', 'button', 'media', 'receipt', 'airline_boardingpass']
    if (!validTypes.includes(body.template_type)) {
      return NextResponse.json(
        { error: `Invalid template_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Create template
    const { data: template, error } = await supabase
      .from('messenger_templates')
      .insert({
        organization_id: profile.organization_id,
        facebook_connection_id: connection.id,
        name: body.name,
        template_type: body.template_type,
        template_payload: body.template_payload,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    console.error('Create Messenger template error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
