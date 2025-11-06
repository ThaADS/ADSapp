/**
 * License Management API
 * Check license availability and manage seat allocation
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/team/licenses - Get license info for organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get license information using database function
    const { data: licenseInfo, error: licenseError } = await supabase
      .rpc('check_available_licenses', { org_id: profile.organization_id })
      .single()

    if (licenseError) throw licenseError

    // Get current team members
    const { data: members, error: membersError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: true })

    if (membersError) throw membersError

    // Get pending invitations
    const { data: pendingInvitations, error: invitationsError } = await supabase
      .from('team_invitations')
      .select('id, email, role, created_at, expires_at')
      .eq('organization_id', profile.organization_id)
      .eq('status', 'pending')

    if (invitationsError) throw invitationsError

    return Response.json({
      success: true,
      licenses: {
        max_seats: licenseInfo.max_seats,
        used_seats: licenseInfo.used_seats,
        available_seats: licenseInfo.available_seats,
        can_invite: licenseInfo.can_invite,
        pending_invitations: pendingInvitations?.length || 0,
      },
      members,
      pending_invitations: pendingInvitations,
    })
  } catch (error) {
    console.error('Get licenses error:', error)
    return Response.json(
      {
        error: 'Failed to get license information',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}

// POST /api/team/licenses/upgrade - Request license upgrade
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Only owners/admins can request upgrades
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return Response.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { additional_seats } = body

    if (!additional_seats || additional_seats < 1) {
      return Response.json({ error: 'Invalid number of seats' }, { status: 400 })
    }

    // Get current license info
    const { data: org } = await supabase
      .from('organizations')
      .select('max_team_members, subscription_status')
      .eq('id', profile.organization_id)
      .single()

    if (!org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Calculate new seat count
    const new_max_seats = org.max_team_members + additional_seats

    // TODO: Calculate pricing and create Stripe checkout session
    const price_per_seat = 10 // $10 per seat per month
    const total_price = additional_seats * price_per_seat

    return Response.json({
      success: true,
      upgrade: {
        current_seats: org.max_team_members,
        additional_seats,
        new_total_seats: new_max_seats,
        price_per_seat,
        total_monthly_increase: total_price,
        currency: 'USD',
      },
      message: 'Upgrade quote calculated. Redirect to Stripe for payment.',
      // TODO: Return Stripe checkout URL
      checkout_url: null,
    })
  } catch (error) {
    console.error('License upgrade error:', error)
    return Response.json(
      {
        error: 'Failed to process license upgrade',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}
