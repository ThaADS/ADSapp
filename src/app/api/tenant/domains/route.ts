// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DomainManager, tenantUtils } from '@/middleware/tenant-routing'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get organization ID from auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Get domains for organization
    const { data: domains, error } = await supabase
      .from('tenant_domains')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .order('is_primary', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      data: domains || [],
    })
  } catch (error) {
    console.error('Error fetching domains:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Get organization ID from auth
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Create domain manager
    const domainManager = new DomainManager(supabase)

    // Add domain
    const domain = await domainManager.addCustomDomain(
      profile.organization_id,
      body.domain,
      body.is_primary || false
    )

    return NextResponse.json({
      success: true,
      data: domain,
    })
  } catch (error) {
    console.error('Error adding domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
