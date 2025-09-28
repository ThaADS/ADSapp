import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TenantBrandingManager } from '@/lib/tenant-branding';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get organization ID from headers or auth
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      );
    }

    // Get branding
    const brandingManager = new TenantBrandingManager(supabase);
    const branding = await brandingManager.getBranding(profile.organization_id);

    return NextResponse.json({
      success: true,
      data: branding,
    });
  } catch (error) {
    console.error('Error fetching branding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    
    // Get organization ID from auth
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 404 }
      );
    }

    // Update branding
    const brandingManager = new TenantBrandingManager(supabase);
    const updatedBranding = await brandingManager.updateBranding(
      profile.organization_id,
      body
    );

    return NextResponse.json({
      success: true,
      data: updatedBranding,
    });
  } catch (error) {
    console.error('Error updating branding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
