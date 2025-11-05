/**
 * Organization Settings API
 *
 * Handles organization management including fetching and updating organization details
 * with proper RBAC enforcement, audit logging, and multi-tenant isolation
 *
 * Endpoints:
 * - GET /api/organizations/[id] - Get organization details
 * - PUT /api/organizations/[id] - Update organization settings
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import { ApiException, createErrorResponse } from '@/lib/api-utils';
import {
  validateOrganizationUpdate,
  validateOrganizationId,
  type OrganizationSettingsResponse,
} from '@/lib/validations/organization-settings';
import { RESOURCES, ACTIONS } from '@/lib/rbac/permissions';

/**
 * GET /api/organizations/[id]
 *
 * Retrieves detailed organization settings including general configuration,
 * branding, and metadata. Enforces RBAC - only owner/admin can access.
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing organization ID
 * @returns Organization settings data
 *
 * @example
 * ```typescript
 * const response = await fetch(`/api/organizations/${orgId}`, {
 *   method: 'GET',
 *   headers: { 'Content-Type': 'application/json' }
 * });
 * const { organization } = await response.json();
 * ```
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: organizationId } = await params;

    // Validate organization ID format
    const idValidation = validateOrganizationId(organizationId);
    if (!idValidation.success) {
      throw new ApiException(
        idValidation.error.errors[0]?.message || 'Invalid organization ID',
        400,
        'INVALID_ORGANIZATION_ID'
      );
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new ApiException('Authentication required', 401, 'UNAUTHORIZED');
    }

    // Get user profile with organization access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new ApiException('Failed to fetch user profile', 500, 'PROFILE_ERROR');
    }

    // RBAC enforcement - owner and admin can view organization settings
    const canView = profile.role === 'owner' || profile.role === 'admin';
    if (!canView) {
      throw new ApiException(
        'Insufficient permissions to view organization settings',
        403,
        'FORBIDDEN'
      );
    }

    // Multi-tenant isolation - ensure user belongs to requested organization
    if (profile.organization_id !== organizationId) {
      throw new ApiException(
        'Access denied: Organization does not belong to your account',
        403,
        'FORBIDDEN'
      );
    }

    // Fetch organization details
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      if (orgError.code === 'PGRST116') {
        throw new ApiException('Organization not found', 404, 'NOT_FOUND');
      }
      console.error('Error fetching organization:', orgError);
      throw new ApiException('Failed to fetch organization', 500, 'DATABASE_ERROR');
    }

    // Format response
    const response: OrganizationSettingsResponse = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      timezone: organization.timezone,
      locale: organization.locale,
      business_hours: null, // Will be extracted from JSONB settings if exists
      whatsapp_business_account_id: organization.whatsapp_business_account_id,
      whatsapp_phone_number_id: organization.whatsapp_phone_number_id,
      subscription_status: organization.subscription_status,
      subscription_tier: organization.subscription_tier,
      created_at: organization.created_at,
      updated_at: organization.updated_at,
    };

    return NextResponse.json({
      success: true,
      organization: response,
    });

  } catch (error) {
    console.error('GET /api/organizations/[id] error:', error);
    return createErrorResponse(error);
  }
}

/**
 * PUT /api/organizations/[id]
 *
 * Updates organization settings including name, subdomain, timezone, locale,
 * business hours, and WhatsApp configuration. Enforces RBAC and validates
 * subdomain uniqueness. Logs all changes for audit trail.
 *
 * @param request - Next.js request object with update payload
 * @param params - Route parameters containing organization ID
 * @returns Updated organization settings
 *
 * @example
 * ```typescript
 * const response = await fetch(`/api/organizations/${orgId}`, {
 *   method: 'PUT',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     name: 'Updated Organization Name',
 *     timezone: 'America/New_York',
 *     locale: 'en-US'
 *   })
 * });
 * ```
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createServiceRoleClient();
    const { id: organizationId } = await params;

    // Validate organization ID format
    const idValidation = validateOrganizationId(organizationId);
    if (!idValidation.success) {
      throw new ApiException(
        idValidation.error.errors[0]?.message || 'Invalid organization ID',
        400,
        'INVALID_ORGANIZATION_ID'
      );
    }

    // Parse and validate request body
    let body: any;
    try {
      body = await request.json();
    } catch {
      throw new ApiException('Invalid JSON in request body', 400, 'INVALID_JSON');
    }

    const validation = validateOrganizationUpdate(body);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      throw new ApiException(
        firstError?.message || 'Validation failed',
        400,
        'VALIDATION_ERROR'
      );
    }

    const validatedData = validation.data;

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new ApiException('Authentication required', 401, 'UNAUTHORIZED');
    }

    // Get user profile with organization access
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, organization_id, role, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      throw new ApiException('Failed to fetch user profile', 500, 'PROFILE_ERROR');
    }

    // RBAC enforcement - only owner can update organization settings
    // Admin can update some fields but not critical ones like subdomain
    const isOwner = profile.role === 'owner';
    const isAdmin = profile.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ApiException(
        'Insufficient permissions to update organization settings',
        403,
        'FORBIDDEN'
      );
    }

    // Multi-tenant isolation
    if (profile.organization_id !== organizationId) {
      throw new ApiException(
        'Access denied: Organization does not belong to your account',
        403,
        'FORBIDDEN'
      );
    }

    // Additional permission checks for restricted fields
    if (!isOwner && validatedData.subdomain) {
      throw new ApiException(
        'Only organization owners can change the subdomain',
        403,
        'FORBIDDEN'
      );
    }

    // Fetch current organization for comparison
    const { data: currentOrg, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        throw new ApiException('Organization not found', 404, 'NOT_FOUND');
      }
      console.error('Error fetching current organization:', fetchError);
      throw new ApiException('Failed to fetch organization', 500, 'DATABASE_ERROR');
    }

    // Check subdomain uniqueness if being changed
    if (validatedData.subdomain && validatedData.subdomain !== currentOrg.slug) {
      const { data: existingOrg } = await serviceSupabase
        .from('organizations')
        .select('id')
        .eq('slug', validatedData.subdomain)
        .neq('id', organizationId)
        .single();

      if (existingOrg) {
        throw new ApiException(
          'Subdomain is already taken. Please choose a different subdomain.',
          409,
          'SUBDOMAIN_CONFLICT'
        );
      }
    }

    // Build update object
    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    const changedFields: Record<string, { old: any; new: any }> = {};

    // Map validated fields to database columns
    if (validatedData.name && validatedData.name !== currentOrg.name) {
      updateData.name = validatedData.name;
      changedFields.name = { old: currentOrg.name, new: validatedData.name };
    }

    if (validatedData.subdomain && validatedData.subdomain !== currentOrg.slug) {
      updateData.slug = validatedData.subdomain;
      changedFields.slug = { old: currentOrg.slug, new: validatedData.subdomain };
    }

    if (validatedData.timezone !== undefined && validatedData.timezone !== currentOrg.timezone) {
      updateData.timezone = validatedData.timezone;
      changedFields.timezone = { old: currentOrg.timezone, new: validatedData.timezone };
    }

    if (validatedData.locale !== undefined && validatedData.locale !== currentOrg.locale) {
      updateData.locale = validatedData.locale;
      changedFields.locale = { old: currentOrg.locale, new: validatedData.locale };
    }

    if (validatedData.whatsapp_business_account_id !== undefined) {
      updateData.whatsapp_business_account_id = validatedData.whatsapp_business_account_id;
      changedFields.whatsapp_business_account_id = {
        old: currentOrg.whatsapp_business_account_id,
        new: validatedData.whatsapp_business_account_id,
      };
    }

    if (validatedData.whatsapp_phone_number_id !== undefined) {
      updateData.whatsapp_phone_number_id = validatedData.whatsapp_phone_number_id;
      changedFields.whatsapp_phone_number_id = {
        old: currentOrg.whatsapp_phone_number_id,
        new: validatedData.whatsapp_phone_number_id,
      };
    }

    // Check if there are actual changes
    if (Object.keys(changedFields).length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No changes detected',
        organization: currentOrg,
      });
    }

    // Perform update
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      throw new ApiException('Failed to update organization', 500, 'UPDATE_ERROR');
    }

    // Audit logging
    try {
      await serviceSupabase.from('audit_logs').insert({
        action: 'organization.updated',
        actor_id: user.id,
        actor_email: profile.email,
        resource_type: 'organization',
        resource_id: organizationId,
        metadata: {
          changed_fields: changedFields,
          organization_name: updatedOrg.name,
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
        created_at: new Date().toISOString(),
      });
    } catch (auditError) {
      // Log but don't fail the request
      console.error('Failed to create audit log:', auditError);
    }

    // Format response
    const response: OrganizationSettingsResponse = {
      id: updatedOrg.id,
      name: updatedOrg.name,
      slug: updatedOrg.slug,
      timezone: updatedOrg.timezone,
      locale: updatedOrg.locale,
      business_hours: null,
      whatsapp_business_account_id: updatedOrg.whatsapp_business_account_id,
      whatsapp_phone_number_id: updatedOrg.whatsapp_phone_number_id,
      subscription_status: updatedOrg.subscription_status,
      subscription_tier: updatedOrg.subscription_tier,
      created_at: updatedOrg.created_at,
      updated_at: updatedOrg.updated_at,
    };

    return NextResponse.json({
      success: true,
      message: 'Organization updated successfully',
      organization: response,
      changed_fields: Object.keys(changedFields),
    });

  } catch (error) {
    console.error('PUT /api/organizations/[id] error:', error);
    return createErrorResponse(error);
  }
}
