import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/organizations/current
 * Returns the current user's organization details
 *
 * Used by:
 * - E2E tests to verify onboarding data persistence
 * - Dashboard to display organization info
 * - Settings pages
 *
 * Security:
 * - Requires authentication
 * - Returns only user's own organization
 * - Sensitive fields (access tokens) are excluded from response
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's profile with organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    if (!profile.organization_id) {
      return NextResponse.json(
        { error: 'User is not part of any organization' },
        { status: 404 }
      );
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        whatsapp_business_account_id,
        whatsapp_phone_number_id,
        subscription_status,
        subscription_tier,
        status,
        timezone,
        locale,
        created_at,
        updated_at
      `)
      .eq('id', profile.organization_id)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // SECURITY: Never expose sensitive credentials in API responses
    // - whatsapp_access_token (omitted from select)
    // - whatsapp_webhook_verify_token (omitted from select)
    // - stripe_customer_id (omitted from select)
    // - stripe_subscription_id (omitted from select)

    return NextResponse.json({
      organization,
      user_role: profile.role,
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/organizations/current:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
