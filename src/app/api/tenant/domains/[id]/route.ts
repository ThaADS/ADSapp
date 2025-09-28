/**
 * Individual Domain Management API Routes
 *
 * Handles operations on specific domains:
 * - GET: Get domain details
 * - PUT: Update domain settings
 * - DELETE: Remove domain
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { DomainManager, tenantUtils } from '@/middleware/tenant-routing';

// GET /api/tenant/domains/[id] - Get domain details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const tenantContext = tenantUtils.getTenantContext(request.headers);

    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      request.headers.get('authorization')?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check user belongs to organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || profile.organization_id !== tenantContext.organizationId) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get domain details
    const { data: domain, error: domainError } = await supabase
      .from('tenant_domains')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', tenantContext.organizationId)
      .single();

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Get DNS records for custom domains
    let dnsRecords: any[] = [];
    if (domain.domain_type === 'custom' && domain.verification_token) {
      const domainManager = new DomainManager(supabase);
      dnsRecords = domainManager.getDNSRecords(domain.domain, domain.verification_token);
    }

    return NextResponse.json({
      success: true,
      data: {
        domain,
        dnsRecords,
      },
    });
  } catch (error) {
    console.error('Error fetching domain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tenant/domains/[id] - Update domain settings
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const tenantContext = tenantUtils.getTenantContext(request.headers);

    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Verify authentication and authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      request.headers.get('authorization')?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError ||
        profile.organization_id !== tenantContext.organizationId ||
        !['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Parse request body
    const updates = await request.json();

    // Validate domain exists and belongs to organization
    const { data: existingDomain, error: domainError } = await supabase
      .from('tenant_domains')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', tenantContext.organizationId)
      .single();

    if (domainError || !existingDomain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Handle primary domain change
    if (updates.isPrimary && !existingDomain.is_primary) {
      const domainManager = new DomainManager(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const success = await domainManager.setPrimaryDomain(
        tenantContext.organizationId,
        params.id
      );

      if (!success) {
        return NextResponse.json(
          { error: 'Failed to set primary domain' },
          { status: 500 }
        );
      }
    }

    // Update other domain settings
    const allowedUpdates = ['is_active'];
    const updateData: any = {};

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();

      const { data: updatedDomain, error: updateError } = await supabase
        .from('tenant_domains')
        .update(updateData)
        .eq('id', params.id)
        .select()
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update domain' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: updatedDomain,
      });
    }

    return NextResponse.json({
      success: true,
      data: existingDomain,
    });
  } catch (error) {
    console.error('Error updating domain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/tenant/domains/[id] - Remove domain
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const tenantContext = tenantUtils.getTenantContext(request.headers);

    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Verify authentication and authorization
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      request.headers.get('authorization')?.replace('Bearer ', '') || ''
    );

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError ||
        profile.organization_id !== tenantContext.organizationId ||
        profile.role !== 'owner') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Check if domain exists and belongs to organization
    const { data: domain, error: domainError } = await supabase
      .from('tenant_domains')
      .select('*')
      .eq('id', params.id)
      .eq('organization_id', tenantContext.organizationId)
      .single();

    if (domainError || !domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Prevent deletion of primary domain if it's the only one
    if (domain.is_primary) {
      const { data: domainCount, error: countError } = await supabase
        .from('tenant_domains')
        .select('id')
        .eq('organization_id', tenantContext.organizationId);

      if (countError || (domainCount && domainCount.length <= 1)) {
        return NextResponse.json(
          { error: 'Cannot delete the only domain. Add another domain first.' },
          { status: 400 }
        );
      }
    }

    // Delete domain
    const domainManager = new DomainManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const success = await domainManager.removeDomain(params.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete domain' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Domain deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting domain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}