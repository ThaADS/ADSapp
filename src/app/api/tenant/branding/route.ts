/**
 * Tenant Branding API Routes
 *
 * Handles tenant branding configuration endpoints:
 * - GET: Retrieve tenant branding
 * - PUT: Update tenant branding
 * - POST: Upload brand assets
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import TenantBrandingManager from '@/lib/tenant-branding';
import { tenantUtils } from '@/middleware/tenant-routing';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/tenant/branding - Get tenant branding
export async function GET(request: NextRequest) {
  try {
    // Get tenant context from headers
    const tenantContext = tenantUtils.getTenantContext(request.headers);

    if (!tenantContext) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Verify user has access to this organization
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

    // Get branding configuration
    const brandingManager = new TenantBrandingManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const branding = await brandingManager.getBrandingConfig(tenantContext.organizationId);

    return NextResponse.json({
      success: true,
      data: branding,
    });
  } catch (error) {
    console.error('Error fetching tenant branding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/tenant/branding - Update tenant branding
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
    const brandingData = await request.json();

    // Validate branding data
    const brandingManager = new TenantBrandingManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const validation = brandingManager.validateBrandingConfig(brandingData);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid branding configuration',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Convert config format to database format
    const dbBranding = {
      primary_color: brandingData.colors?.primary,
      secondary_color: brandingData.colors?.secondary,
      accent_color: brandingData.colors?.accent,
      background_color: brandingData.colors?.background,
      text_color: brandingData.colors?.text,
      font_family: brandingData.typography?.fontFamily,
      font_size_base: brandingData.typography?.fontSize,
      border_radius: brandingData.layout?.borderRadius,
      logo_url: brandingData.logos?.light,
      logo_dark_url: brandingData.logos?.dark,
      favicon_url: brandingData.logos?.favicon,
      company_name: brandingData.company?.name,
      company_tagline: brandingData.company?.tagline,
      company_description: brandingData.company?.description,
      support_email: brandingData.company?.supportEmail,
      support_phone: brandingData.company?.supportPhone,
      website_url: brandingData.company?.websiteUrl,
      theme_mode: brandingData.theme?.mode,
      hide_powered_by: brandingData.whiteLabel?.hidePoweredBy,
      custom_footer_text: brandingData.whiteLabel?.customFooter,
      custom_css: brandingData.customCss,
      custom_js: brandingData.customJs,
    };

    // Update branding
    const updatedBranding = await brandingManager.updateBranding(
      tenantContext.organizationId,
      dbBranding
    );

    if (!updatedBranding) {
      return NextResponse.json(
        { error: 'Failed to update branding' },
        { status: 500 }
      );
    }

    // Return updated configuration
    const config = await brandingManager.getBrandingConfig(tenantContext.organizationId);

    return NextResponse.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error updating tenant branding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/tenant/branding - Upload brand assets
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

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const assetType = formData.get('assetType') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!['logo', 'logo_dark', 'favicon'].includes(assetType)) {
      return NextResponse.json(
        { error: 'Invalid asset type' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPEG, GIF, and SVG are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB.' },
        { status: 400 }
      );
    }

    // Upload file
    const brandingManager = new TenantBrandingManager(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const fileUrl = await brandingManager.uploadBrandAsset(
      tenantContext.organizationId,
      file,
      assetType as 'logo' | 'logo_dark' | 'favicon'
    );

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        url: fileUrl,
        assetType,
      },
    });
  } catch (error) {
    console.error('Error uploading brand asset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}