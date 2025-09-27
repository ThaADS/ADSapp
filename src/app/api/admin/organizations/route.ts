/**
 * Enhanced Admin Organizations API
 * Provides comprehensive organization listing, search, filtering, and management functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { SuperAdminPermissions } from '@/lib/super-admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(cookies());
    const permissions = new SuperAdminPermissions();
    const { searchParams } = new URL(request.url);

    // Check if user is super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = await permissions.isSuperAdmin(user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100); // Max 100 per page
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const subscriptionStatus = searchParams.get('subscriptionStatus');
    const subscriptionTier = searchParams.get('subscriptionTier');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build the query
    let query = supabase
      .from('organizations')
      .select(`
        *,
        profiles(id, full_name, email, role, is_active, last_seen_at),
        conversations(id),
        messages(id),
        support_tickets(id, status)
      `, { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (subscriptionStatus) {
      query = query.eq('subscription_status', subscriptionStatus);
    }

    if (subscriptionTier) {
      query = query.eq('subscription_tier', subscriptionTier);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching organizations:', error);
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }

    // Transform the data
    const organizations = (data || []).map(org => {
      const activeUsers = org.profiles?.filter(p => p.is_active).length || 0;
      const lastActivity = org.profiles?.reduce((latest, profile) => {
        return !latest || (profile.last_seen_at && profile.last_seen_at > latest)
          ? profile.last_seen_at
          : latest;
      }, null);

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        subscriptionStatus: org.subscription_status,
        subscriptionTier: org.subscription_tier,
        stripeCustomerId: org.stripe_customer_id,
        userCount: org.profiles?.length || 0,
        activeUserCount: activeUsers,
        messageCount: org.messages?.length || 0,
        conversationCount: org.conversations?.length || 0,
        openTicketCount: org.support_tickets?.filter(t => t.status === 'open').length || 0,
        createdAt: org.created_at,
        updatedAt: org.updated_at,
        trialEndsAt: org.trial_ends_at,
        suspendedAt: org.suspended_at,
        suspensionReason: org.suspension_reason,
        lastActivity,
        billingEmail: org.billing_email,
        timezone: org.timezone,
        locale: org.locale,
      };
    });

    // Log the access
    await permissions.logSystemAuditEvent(
      'list_organizations',
      undefined,
      undefined,
      {
        filters: { search, status, subscriptionStatus, subscriptionTier },
        pagination: { page, limit },
        resultCount: organizations.length
      },
      'info'
    );

    return NextResponse.json({
      organizations,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
      filters: {
        available: {
          statuses: ['active', 'suspended', 'cancelled', 'pending_setup'],
          subscriptionStatuses: ['trial', 'active', 'cancelled', 'past_due'],
          subscriptionTiers: ['starter', 'professional', 'enterprise'],
        },
        applied: { search, status, subscriptionStatus, subscriptionTier },
      },
    });

  } catch (error) {
    console.error('Admin organizations API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new organization (super admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(cookies());
    const permissions = new SuperAdminPermissions();
    const body = await request.json();

    // Check if user is super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = await permissions.isSuperAdmin(user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    const {
      name,
      slug,
      subscriptionTier = 'starter',
      trialDays = 14,
      billingEmail,
      timezone = 'UTC',
      locale = 'en',
      metadata = {}
    } = body;

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      );
    }

    // Check if slug is unique
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingOrg) {
      return NextResponse.json(
        { error: 'Organization slug already exists' },
        { status: 409 }
      );
    }

    // Calculate trial end date
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Create the organization
    const { data: newOrg, error: createError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        subscription_status: 'trial',
        subscription_tier: subscriptionTier,
        trial_ends_at: trialEndsAt.toISOString(),
        billing_email: billingEmail,
        timezone,
        locale,
        metadata,
        status: 'active',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating organization:', createError);
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
    }

    // Log the creation
    await permissions.logSystemAuditEvent(
      'create_organization',
      newOrg.id,
      undefined,
      {
        organizationData: { name, slug, subscriptionTier, trialDays },
        metadata
      },
      'info'
    );

    return NextResponse.json({ organization: newOrg }, { status: 201 });

  } catch (error) {
    console.error('Admin create organization API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}