/**
 * SMS Opt-Outs API Route
 * GET: List opted-out phone numbers
 * POST: Manually add opt-out
 * DELETE: Remove opt-out (resubscribe)
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { normalizeToE164, isValidE164 } from '@/types/sms'

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
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') !== 'false'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build query
    let query = supabase
      .from('sms_opt_outs')
      .select('*', { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('opted_out_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: optOuts, error: queryError, count } = await query

    if (queryError) {
      console.error('Failed to fetch opt-outs:', queryError)
      return NextResponse.json(
        { error: 'Failed to fetch opt-outs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      opt_outs: optOuts,
      total: count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('SMS opt-outs GET error:', error)
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

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Only admins can manage opt-outs
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()

    if (!body.phone_number) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const normalizedPhone = normalizeToE164(body.phone_number)
    if (!isValidE164(normalizedPhone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }

    // Upsert opt-out record
    const { data: optOut, error: upsertError } = await supabase
      .from('sms_opt_outs')
      .upsert(
        {
          organization_id: profile.organization_id,
          phone_number: normalizedPhone,
          keyword: body.keyword?.toUpperCase() || 'MANUAL',
          opted_out_at: new Date().toISOString(),
          is_active: true,
          opted_in_at: null,
          opt_in_keyword: null,
        },
        { onConflict: 'organization_id,phone_number' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('Failed to add opt-out:', upsertError)
      return NextResponse.json(
        { error: 'Failed to add opt-out' },
        { status: 500 }
      )
    }

    // Also update any existing conversations
    await supabase
      .from('sms_conversations')
      .update({
        opted_out: true,
        opted_out_at: new Date().toISOString(),
        opt_out_keyword: body.keyword?.toUpperCase() || 'MANUAL',
      })
      .eq('organization_id', profile.organization_id)
      .eq('remote_phone_number', normalizedPhone)

    return NextResponse.json({ opt_out: optOut }, { status: 201 })
  } catch (error) {
    console.error('SMS opt-outs POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Get user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Only admins can manage opt-outs
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get phone number from query params
    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get('phone_number')

    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 })
    }

    const normalizedPhone = normalizeToE164(phoneNumber)

    // Update opt-out to inactive (resubscribe)
    const { error: updateError } = await supabase
      .from('sms_opt_outs')
      .update({
        is_active: false,
        opted_in_at: new Date().toISOString(),
        opt_in_keyword: 'MANUAL',
      })
      .eq('organization_id', profile.organization_id)
      .eq('phone_number', normalizedPhone)

    if (updateError) {
      console.error('Failed to remove opt-out:', updateError)
      return NextResponse.json(
        { error: 'Failed to remove opt-out' },
        { status: 500 }
      )
    }

    // Also update any existing conversations
    await supabase
      .from('sms_conversations')
      .update({
        opted_out: false,
        opted_out_at: null,
        opt_out_keyword: null,
      })
      .eq('organization_id', profile.organization_id)
      .eq('remote_phone_number', normalizedPhone)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('SMS opt-outs DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
