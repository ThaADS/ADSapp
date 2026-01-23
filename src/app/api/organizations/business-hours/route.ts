import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema for business hours
const businessHoursSchema = z.object({
  monday: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  }),
  tuesday: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  }),
  wednesday: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  }),
  thursday: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  }),
  friday: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  }),
  saturday: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  }),
  sunday: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  }),
})

export const dynamic = 'force-dynamic'

/**
 * GET /api/organizations/business-hours
 * Get business hours for current organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile to get organization_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get organization's business hours
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('business_hours')
      .eq('id', profile.organization_id)
      .single()

    if (orgError) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json({
      business_hours: organization.business_hours || null,
    })
  } catch (error) {
    console.error('Error fetching business hours:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/organizations/business-hours
 * Update business hours for current organization
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only owner/admin can update business hours
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only owner/admin can update business hours' },
        { status: 403 }
      )
    }

    // Parse and validate request body
    const body = await request.json()

    let validatedHours
    try {
      validatedHours = businessHoursSchema.parse(body.business_hours)
    } catch (validationError) {
      return NextResponse.json(
        { error: 'Invalid business hours format', details: validationError },
        { status: 400 }
      )
    }

    // Update organization's business hours
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update({ business_hours: validatedHours })
      .eq('id', profile.organization_id)
      .select('business_hours')
      .single()

    if (updateError) {
      console.error('Error updating business hours:', updateError)
      return NextResponse.json({ error: 'Failed to update business hours' }, { status: 500 })
    }

    // Log to audit trail
    await supabase.from('audit_log').insert({
      user_id: user.id,
      organization_id: profile.organization_id,
      action: 'organization.business_hours_updated',
      resource_type: 'organization',
      resource_id: profile.organization_id,
      details: {
        business_hours: validatedHours,
      },
    })

    return NextResponse.json({
      success: true,
      business_hours: updatedOrg.business_hours,
    })
  } catch (error) {
    console.error('Error updating business hours:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
