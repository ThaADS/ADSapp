/**
 * Enhanced Individual Organization Admin API
 * Provides detailed organization management, viewing, updating, and action capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { SuperAdminPermissions } from '@/lib/super-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(cookies());
    const permissions = new SuperAdminPermissions();
    const { id } = await params;

    // Check if user is super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = await permissions.isSuperAdmin(user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Get organization details with related data
    const { data: org, error } = await supabase
      .from('organizations')
      .select(`
        *,
        profiles!inner(
          id, full_name, email, role, is_active, last_seen_at, created_at
        ),
        conversations(
          id, status, priority, created_at, last_message_at
        ),
        messages(
          id, sender_type, message_type, created_at
        ),
        support_tickets(
          id, ticket_number, title, status, priority, category, created_at
        ),
        billing_events(
          id, event_type, amount_cents, currency, created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
      }
      console.error('Error fetching organization:', error);
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
    }

    // Get analytics for this organization
    const { data: analytics } = await supabase
      .from('organization_analytics')
      .select('*')
      .eq('organization_id', id)
      .order('date', { ascending: false })
      .limit(30);

    // Get usage records
    const { data: usageRecords } = await supabase
      .from('usage_records')
      .select('*')
      .eq('organization_id', id)
      .order('period_start', { ascending: false })
      .limit(12);

    // Calculate metrics
    const activeUsers = org.profiles?.filter(p => p.is_active).length || 0;
    const totalMessages = org.messages?.length || 0;
    const totalConversations = org.conversations?.length || 0;
    const openConversations = org.conversations?.filter(c => c.status === 'open').length || 0;
    const openTickets = org.support_tickets?.filter(t => t.status === 'open').length || 0;

    // Calculate revenue
    const totalRevenue = org.billing_events
      ?.filter(e => e.event_type === 'payment_succeeded')
      .reduce((sum, e) => sum + (e.amount_cents || 0), 0) || 0;

    // Calculate last activity
    const lastActivity = org.profiles?.reduce((latest, profile) => {
      return !latest || (profile.last_seen_at && profile.last_seen_at > latest)
        ? profile.last_seen_at
        : latest;
    }, null);

    // Recent activity
    const recentMessages = org.messages
      ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10) || [];

    const organizationDetails = {
      // Basic information
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      createdAt: org.created_at,
      updatedAt: org.updated_at,

      // Subscription information
      subscriptionStatus: org.subscription_status,
      subscriptionTier: org.subscription_tier,
      trialEndsAt: org.trial_ends_at,
      stripeCustomerId: org.stripe_customer_id,
      stripeSubscriptionId: org.stripe_subscription_id,

      // Billing information
      billingEmail: org.billing_email,
      timezone: org.timezone,
      locale: org.locale,

      // Status information
      suspendedAt: org.suspended_at,
      suspendedBy: org.suspended_by,
      suspensionReason: org.suspension_reason,

      // Metrics
      metrics: {
        totalUsers: org.profiles?.length || 0,
        activeUsers,
        totalMessages,
        totalConversations,
        openConversations,
        openTickets,
        totalRevenue: totalRevenue / 100, // Convert from cents
        lastActivity,
      },

      // Related data
      users: org.profiles?.map(p => ({
        id: p.id,
        fullName: p.full_name,
        email: p.email,
        role: p.role,
        isActive: p.is_active,
        lastSeenAt: p.last_seen_at,
        createdAt: p.created_at,
      })) || [],

      supportTickets: org.support_tickets?.map(t => ({
        id: t.id,
        ticketNumber: t.ticket_number,
        title: t.title,
        status: t.status,
        priority: t.priority,
        category: t.category,
        createdAt: t.created_at,
      })) || [],

      recentActivity: {
        messages: recentMessages.map(m => ({
          id: m.id,
          senderType: m.sender_type,
          messageType: m.message_type,
          createdAt: m.created_at,
        })),
        conversations: org.conversations
          ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 10)
          .map(c => ({
            id: c.id,
            status: c.status,
            priority: c.priority,
            createdAt: c.created_at,
            lastMessageAt: c.last_message_at,
          })) || [],
      },

      analytics: analytics || [],
      usageRecords: usageRecords || [],
    };

    // Log the access
    await permissions.logSystemAuditEvent(
      'view_organization_details',
      id,
      undefined,
      { organizationName: org.name },
      'info'
    );

    return NextResponse.json({ organization: organizationDetails });

  } catch (error) {
    console.error('Admin organization details API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update organization
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createClient(cookies());
    const permissions = new SuperAdminPermissions();
    const { id } = await params;
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

    // Get current organization for comparison
    const { data: currentOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const allowedFields = [
      'name', 'subscription_tier', 'billing_email', 'timezone', 'locale',
      'whatsapp_business_account_id', 'whatsapp_phone_number_id', 'metadata'
    ];

    const updateData: Record<string, unknown> = {};
    const changedFields: Record<string, { old: unknown; new: unknown }> = {};

    // Only include allowed fields that have changed
    allowedFields.forEach(field => {
      if (body[field] !== undefined && body[field] !== currentOrg[field]) {
        updateData[field] = body[field];
        changedFields[field] = {
          from: currentOrg[field],
          to: body[field]
        };
      }
    });

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No changes detected' });
    }

    // Update the organization
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating organization:', updateError);
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
    }

    // Log the update
    await permissions.logSystemAuditEvent(
      'update_organization',
      id,
      undefined,
      {
        organizationName: currentOrg.name,
        changedFields,
        updateData
      },
      'info'
    );

    return NextResponse.json({
      organization: updatedOrg,
      message: 'Organization updated successfully'
    });

  } catch (error) {
    console.error('Admin update organization API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete organization (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient(cookies());
    const permissions = new SuperAdminPermissions();
    const { id } = params;

    // Check if user is super admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isSuperAdmin = await permissions.isSuperAdmin(user.id);
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Get organization details for logging
    const { data: org } = await supabase
      .from('organizations')
      .select('name, status')
      .eq('id', id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (org.status === 'deleted') {
      return NextResponse.json({ error: 'Organization already deleted' }, { status: 400 });
    }

    // Soft delete the organization
    const { error: deleteError } = await supabase
      .from('organizations')
      .update({
        status: 'deleted',
        deleted_at: new Date().toISOString(),
        deleted_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting organization:', deleteError);
      return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
    }

    // Log the deletion
    await permissions.logSystemAuditEvent(
      'delete_organization',
      id,
      undefined,
      {
        organizationName: org.name,
        previousStatus: org.status
      },
      'warning'
    );

    return NextResponse.json({
      message: 'Organization deleted successfully',
      organizationId: id
    });

  } catch (error) {
    console.error('Admin delete organization API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}