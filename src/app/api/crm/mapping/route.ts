/**
 * CRM Field Mapping API
 *
 * Manages field mappings between ADSapp and CRM systems
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSalesforceFieldMappings } from '@/lib/crm/salesforce/mapping'
import { getHubSpotFieldMappings } from '@/lib/crm/hubspot/mapping'
import { getPipedriveFieldMappings } from '@/lib/crm/pipedrive/mapping'

/**
 * GET /api/crm/mapping
 * Get field mappings for a CRM connection
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

    if (!crmType || !['salesforce', 'hubspot', 'pipedrive'].includes(crmType)) {
      return NextResponse.json({ error: 'Invalid CRM type' }, { status: 400 })
    }

    // Get connection
    const { data: connection } = await supabase
      .from('crm_connections')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('crm_type', crmType)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'CRM not connected' }, { status: 404 })
    }

    // Get custom mappings
    const { data: customMappings } = await supabase
      .from('crm_field_mappings')
      .select('*')
      .eq('connection_id', connection.id)

    // Get default mappings
    let defaultMappings
    switch (crmType) {
      case 'salesforce':
        defaultMappings = getSalesforceFieldMappings('Contact')
        break
      case 'hubspot':
        defaultMappings = getHubSpotFieldMappings('contacts')
        break
      case 'pipedrive':
        defaultMappings = getPipedriveFieldMappings('persons')
        break
      default:
        defaultMappings = []
    }

    // Merge custom mappings with defaults
    const mappings = defaultMappings.map(mapping => {
      const custom = customMappings?.find(
        m => m.adsapp_field === mapping.adsappField && m.crm_field === mapping.crmField
      )

      if (custom) {
        return {
          ...mapping,
          direction: custom.direction,
          transformRule: custom.transform_rule,
        }
      }

      return mapping
    })

    return NextResponse.json({
      mappings,
      customMappings: customMappings || [],
    })
  } catch (error) {
    console.error('Field mapping error:', error)
    return NextResponse.json(
      { error: 'Failed to get field mappings' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/crm/mapping
 * Update field mappings
 */
export async function PUT(request: NextRequest) {
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

    // Check permissions
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { crmType, mappings } = body

    if (!crmType || !mappings || !Array.isArray(mappings)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Get connection
    const { data: connection } = await supabase
      .from('crm_connections')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('crm_type', crmType)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'CRM not connected' }, { status: 404 })
    }

    // Delete existing mappings
    await supabase
      .from('crm_field_mappings')
      .delete()
      .eq('connection_id', connection.id)

    // Insert new mappings
    const { error: insertError } = await supabase.from('crm_field_mappings').insert(
      mappings.map(mapping => ({
        connection_id: connection.id,
        adsapp_field: mapping.adsappField,
        crm_field: mapping.crmField,
        direction: mapping.direction,
        transform_rule: mapping.transformRule || null,
      }))
    )

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({
      message: 'Field mappings updated successfully',
      count: mappings.length,
    })
  } catch (error) {
    console.error('Field mapping update error:', error)
    return NextResponse.json(
      { error: 'Failed to update field mappings' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/crm/mapping
 * Add a custom field mapping
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

    // Check permissions
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { crmType, adsappField, crmField, direction, transformRule } = body

    if (!crmType || !adsappField || !crmField || !direction) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get connection
    const { data: connection } = await supabase
      .from('crm_connections')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('crm_type', crmType)
      .single()

    if (!connection) {
      return NextResponse.json({ error: 'CRM not connected' }, { status: 404 })
    }

    // Insert mapping
    const { data, error: insertError } = await supabase
      .from('crm_field_mappings')
      .insert({
        connection_id: connection.id,
        adsapp_field: adsappField,
        crm_field: crmField,
        direction,
        transform_rule: transformRule || null,
      })
      .select()
      .single()

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({
      message: 'Field mapping created successfully',
      mapping: data,
    })
  } catch (error) {
    console.error('Field mapping creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create field mapping' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/crm/mapping
 * Delete a custom field mapping
 */
export async function DELETE(request: NextRequest) {
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

    // Check permissions
    if (profile.role !== 'admin' && profile.role !== 'owner') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const mappingId = searchParams.get('mapping_id')

    if (!mappingId) {
      return NextResponse.json({ error: 'Mapping ID required' }, { status: 400 })
    }

    // Delete mapping
    const { error: deleteError } = await supabase
      .from('crm_field_mappings')
      .delete()
      .eq('id', mappingId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      message: 'Field mapping deleted successfully',
    })
  } catch (error) {
    console.error('Field mapping deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete field mapping' },
      { status: 500 }
    )
  }
}
