/**
 * Domain Verification API Route
 *
 * Handles domain verification for custom domains
 * - POST: Verify domain ownership
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DomainManager, tenantUtils } from '@/middleware/tenant-routing'

// POST /api/tenant/domains/[id]/verify - Verify domain
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const tenantContext = tenantUtils.getTenantContext(request.headers)

    if (!tenantContext) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Verify authentication and authorization
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(
      request.headers.get('authorization')?.replace('Bearer ', '') || ''
    )

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (
      profileError ||
      profile.organization_id !== tenantContext.organizationId ||
      !['owner', 'admin'].includes(profile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if domain exists and belongs to organization
    const { data: domain, error: domainError } = await supabase
      .from('tenant_domains')
      .select('*')
      .eq('id', id)
      .eq('organization_id', tenantContext.organizationId)
      .single()

    if (domainError || !domain) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    // Only custom domains need verification
    if (domain.domain_type !== 'custom') {
      return NextResponse.json(
        { error: 'Only custom domains require verification' },
        { status: 400 }
      )
    }

    // Verify domain
    const domainManager = new DomainManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const isVerified = await domainManager.verifyDomain(id)

    // Get updated domain data
    const { data: updatedDomain, error: updateError } = await supabase
      .from('tenant_domains')
      .select('*')
      .eq('id', id)
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to fetch updated domain' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        domain: updatedDomain,
        verified: isVerified,
        message: isVerified
          ? 'Domain verified successfully'
          : 'Domain verification failed. Please check your DNS settings.',
      },
    })
  } catch (error) {
    console.error('Error verifying domain:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
