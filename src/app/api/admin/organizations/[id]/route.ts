/**
 * Enhanced Individual Organization Admin API
 * Provides detailed organization management, viewing, updating, and action capabilities
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminMiddleware } from '@/lib/middleware'

// Type helper to avoid deep instantiation errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAny<T>(val: T): any {
  return val
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Apply admin middleware (validates super admin access)
  const middlewareResponse = await adminMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    const supabase = await createClient()
    const { id } = await params

    // Get organization details - simplified to avoid complex joins
    const { data: org, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
      console.error('Error fetching organization:', error)
      return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
    }

    // Fetch related data
    const profiles = toAny(
      await supabase
        .from('profiles')
        .select('id, full_name, email, role, is_active, last_seen_at, created_at')
        .eq('organization_id', id)
    )
    const conversations = toAny(
      await supabase
        .from('conversations')
        .select('id, status, priority, created_at, last_message_at')
        .eq('organization_id', id)
    )
    const messages = toAny(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Supabase type inference too deep, suppressing false positive
      await supabase
        .from('messages')
        .select('id, sender_type, message_type, created_at')
        .eq('organization_id', id)
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const billingEvents = await (supabase as any)
      .from('billing_events')
      .select('id, event_type, amount, currency, created_at')
      .eq('organization_id', id)

    // Analytics and usage records would be fetched from dedicated tables when implemented
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analytics: any[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usageRecords: any[] = []

    // Calculate metrics
    const activeUsers = profiles.data?.filter(p => p.is_active).length || 0
    const totalMessages = messages.data?.length || 0
    const totalConversations = conversations.data?.length || 0
    const openConversations = conversations.data?.filter(c => c.status === 'open').length || 0

    // Calculate revenue
    const totalRevenue =
      billingEvents.data
        ?.filter(e => e.event_type === 'payment_succeeded')
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0

    // Calculate last activity
    const lastActivity = profiles.data?.reduce(
      (latest: string | null, profile) => {
        return !latest || (profile.last_seen_at && profile.last_seen_at > latest)
          ? profile.last_seen_at
          : latest
      },
      null as string | null
    )

    // Recent messages (limited to 10 most recent)
    const recentMessages = messages.data?.slice(0, 10) || []

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
        totalUsers: profiles.data?.length || 0,
        activeUsers,
        totalMessages,
        totalConversations,
        openConversations,
        totalRevenue: totalRevenue / 100, // Convert from cents
        lastActivity,
      },

      // Related data
      users:
        profiles.data?.map(p => ({
          id: p.id,
          fullName: p.full_name,
          email: p.email,
          role: p.role,
          isActive: p.is_active,
          lastSeenAt: p.last_seen_at,
          createdAt: p.created_at,
        })) || [],

      recentActivity: {
        messages: recentMessages.map(m => ({
          id: m.id,
          senderType: m.sender_type,
          messageType: m.message_type,
          createdAt: m.created_at,
        })),
        conversations:
          conversations.data
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
    }

    // Note: Audit logging removed - system_audit_logs table doesn't exist yet

    return NextResponse.json({ organization: organizationDetails })
  } catch (error) {
    console.error('Admin organization details API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update organization
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Apply admin middleware (validates super admin access)
  const middlewareResponse = await adminMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    const supabase = await createClient()
    const { id } = await params
    const body = await request.json()

    // Get current organization for comparison
    const { data: currentOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (!currentOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const allowedFields = [
      'name',
      'subscription_tier',
      'billing_email',
      'timezone',
      'locale',
      'whatsapp_business_account_id',
      'whatsapp_phone_number_id',
    ]

    const updateData: Record<string, unknown> = {}
    const changedFields: Record<string, { old: unknown; new: unknown }> = {}

    // Only include allowed fields that have changed
    allowedFields.forEach(field => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (body[field] !== undefined && body[field] !== (currentOrg as any)[field]) {
        updateData[field] = body[field]
        changedFields[field] = {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          old: (currentOrg as any)[field],
          new: body[field],
        }
      }
    })

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'No changes detected' })
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
      .single()

    if (updateError) {
      console.error('Error updating organization:', updateError)
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
    }

    // Note: Audit logging removed - system_audit_logs table doesn't exist yet

    return NextResponse.json({
      organization: updatedOrg,
      message: 'Organization updated successfully',
    })
  } catch (error) {
    console.error('Admin update organization API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete organization (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Apply admin middleware (validates super admin access)
  const middlewareResponse = await adminMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    const supabase = await createClient()
    const { id } = await params

    // Get organization details for logging
    const { data: org } = await supabase
      .from('organizations')
      .select('name, status')
      .eq('id', id)
      .single()

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    if (org.status === 'cancelled') {
      return NextResponse.json({ error: 'Organization already cancelled' }, { status: 400 })
    }

    // Soft delete the organization
    const { error: deleteError } = await supabase
      .from('organizations')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting organization:', deleteError)
      return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 })
    }

    // Note: Audit logging removed - system_audit_logs table doesn't exist yet

    return NextResponse.json({
      message: 'Organization deleted successfully',
      organizationId: id,
    })
  } catch (error) {
    console.error('Admin delete organization API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
