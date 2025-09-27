/**
 * Tenant Settings API Routes
 *
 * Handles general tenant configuration:
 * - GET: Get tenant settings
 * - PUT: Update tenant settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { tenantUtils } from '@/middleware/tenant-routing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tenant/settings - Get tenant settings
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

    // Get organization settings
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(`
        *,
        tenant_branding(
          logo_url,
          company_name,
          primary_color,
          theme_mode,
          hide_powered_by
        )
      `)
      .eq('id', tenantContext.organizationId)
      .single();

    if (orgError) {
      return NextResponse.json(
        { error: 'Failed to fetch organization settings' },
        { status: 500 }
      );
    }

    // Get tenant configuration
    const { data: config, error: configError } = await supabase
      .from('tenant_configuration')
      .select('*')
      .eq('organization_id', tenantContext.organizationId)
      .single();

    // Get feature flags
    const { data: features, error: featuresError } = await supabase
      .from('tenant_features')
      .select('*')
      .eq('organization_id', tenantContext.organizationId);

    const settings = {
      organization,
      configuration: config || null,
      features: features || [],
      branding: organization.tenant_branding?.[0] || null,
    };

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Error fetching tenant settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tenant/settings - Update tenant settings
export async function PUT(request: NextRequest) {
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
    const {
      organization: orgUpdates,
      configuration: configUpdates,
      features: featureUpdates
    } = await request.json();

    const results: any = {};

    // Update organization settings
    if (orgUpdates) {
      const allowedOrgFields = [
        'name',
        'timezone',
        'locale',
        'date_format',
        'time_format',
        'webhook_url',
        'whitelabel_enabled'
      ];

      const orgUpdateData: any = {};
      allowedOrgFields.forEach(field => {
        if (orgUpdates[field] !== undefined) {
          orgUpdateData[field] = orgUpdates[field];
        }
      });

      if (Object.keys(orgUpdateData).length > 0) {
        orgUpdateData.updated_at = new Date().toISOString();

        const { data: updatedOrg, error: orgUpdateError } = await supabase
          .from('organizations')
          .update(orgUpdateData)
          .eq('id', tenantContext.organizationId)
          .select()
          .single();

        if (orgUpdateError) {
          return NextResponse.json(
            { error: 'Failed to update organization settings' },
            { status: 500 }
          );
        }

        results.organization = updatedOrg;
      }
    }

    // Update tenant configuration
    if (configUpdates) {
      const { data: updatedConfig, error: configUpdateError } = await supabase
        .from('tenant_configuration')
        .upsert({
          organization_id: tenantContext.organizationId,
          ...configUpdates,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (configUpdateError) {
        return NextResponse.json(
          { error: 'Failed to update tenant configuration' },
          { status: 500 }
        );
      }

      results.configuration = updatedConfig;
    }

    // Update feature flags
    if (featureUpdates && Array.isArray(featureUpdates)) {
      const featureResults = [];

      for (const feature of featureUpdates) {
        const { data: updatedFeature, error: featureError } = await supabase
          .from('tenant_features')
          .upsert({
            organization_id: tenantContext.organizationId,
            feature_key: feature.feature_key,
            is_enabled: feature.is_enabled,
            configuration: feature.configuration || {},
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!featureError) {
          featureResults.push(updatedFeature);
        }
      }

      results.features = featureResults;
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error updating tenant settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}