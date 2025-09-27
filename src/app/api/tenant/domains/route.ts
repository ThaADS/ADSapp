/**
 * Tenant Domains API Routes
 *
 * Handles tenant domain management endpoints:
 * - GET: List tenant domains
 * - POST: Add new domain (custom or subdomain)
 * - PUT: Update domain settings
 * - DELETE: Remove domain
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { DomainManager, tenantUtils } from '@/middleware/tenant-routing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tenant/domains - List domains
export async function GET(request: NextRequest) {
  try {
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

    // Get domains
    const domainManager = new DomainManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const domains = await domainManager.listDomains(tenantContext.organizationId);

    return NextResponse.json({
      success: true,
      data: domains,
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenant/domains - Add new domain
export async function POST(request: NextRequest) {
  try {
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
    const { domain, subdomain, domainType, isPrimary } = await request.json();

    if (!domainType || !['custom', 'subdomain'].includes(domainType)) {
      return NextResponse.json(
        { error: 'Invalid domain type' },
        { status: 400 }
      );
    }

    const domainManager = new DomainManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    let newDomain;

    if (domainType === 'custom') {
      if (!domain) {
        return NextResponse.json(
          { error: 'Domain is required for custom domains' },
          { status: 400 }
        );
      }

      // Validate domain format
      if (!tenantUtils.isValidDomain(domain)) {
        return NextResponse.json(
          { error: 'Invalid domain format' },
          { status: 400 }
        );
      }

      newDomain = await domainManager.addCustomDomain(
        tenantContext.organizationId,
        domain,
        isPrimary || false
      );
    } else {
      if (!subdomain) {
        return NextResponse.json(
          { error: 'Subdomain is required for subdomain type' },
          { status: 400 }
        );
      }

      // Validate subdomain format
      if (!tenantUtils.isValidSubdomain(subdomain)) {
        return NextResponse.json(
          { error: 'Invalid subdomain format' },
          { status: 400 }
        );
      }

      newDomain = await domainManager.addSubdomain(
        tenantContext.organizationId,
        subdomain
      );
    }

    if (!newDomain) {
      return NextResponse.json(
        { error: 'Failed to add domain' },
        { status: 500 }
      );
    }

    // For custom domains, provide DNS records
    let dnsRecords = [];
    if (domainType === 'custom') {
      dnsRecords = domainManager.getDNSRecords(domain, newDomain.verification_token || '');
    }

    return NextResponse.json({
      success: true,
      data: {
        domain: newDomain,
        dnsRecords,
      },
    });
  } catch (error) {
    console.error('Error adding domain:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}