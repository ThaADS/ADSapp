/**
 * Enhanced Admin Organizations API
 * Provides comprehensive organization listing, search, filtering, and management functionality
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminMiddleware } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  // Apply admin middleware (validates super admin access)
  const middlewareResponse = await adminMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100) // Max 100 per page
    const search = searchParams.get('search')
    const status = searchParams.get('status')
    const subscriptionStatus = searchParams.get('subscriptionStatus')
    const subscriptionTier = searchParams.get('subscriptionTier')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Build the query - simplified without heavy joins
    let query = supabase.from('organizations').select('*', { count: 'exact' })

    // Apply filters - sanitize search input to prevent SQL injection
    if (search) {
      // Sanitize search input: remove special SQL characters and limit length
      const sanitizedSearch = search
        .replace(/[%_'"\\;]/g, '') // Remove SQL wildcards and escape chars
        .substring(0, 100) // Limit length
        .trim()

      if (sanitizedSearch.length > 0) {
        query = query.or(`name.ilike.%${sanitizedSearch}%,slug.ilike.%${sanitizedSearch}%`)
      }
    }

    if (status) {
      query = query.eq('status', status as any)
    }

    if (subscriptionStatus) {
      query = query.eq('subscription_status', subscriptionStatus as any)
    }

    if (subscriptionTier) {
      query = query.eq('subscription_tier', subscriptionTier as any)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    // Get user counts for each organization
    const orgIds = (data || []).map(org => org.id)

    // Fetch counts in parallel for better performance
    const [userCounts, messageCounts, conversationCounts] = await Promise.all([
      // User counts per organization
      supabase.from('profiles').select('organization_id, is_active').in('organization_id', orgIds),
      // Message counts per organization
      supabase.from('messages').select('organization_id').in('organization_id', orgIds),
      // Conversation counts per organization
      supabase.from('conversations').select('organization_id').in('organization_id', orgIds),
    ])

    // Transform the data
    const organizations = (data || []).map(org => {
      const orgUsers = userCounts.data?.filter(p => p.organization_id === org.id) || []
      const activeUsers = orgUsers.filter(p => p.is_active).length
      const messageCount = messageCounts.data?.filter(m => m.organization_id === org.id).length || 0
      const conversationCount =
        conversationCounts.data?.filter(c => c.organization_id === org.id).length || 0

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        subscriptionStatus: org.subscription_status,
        subscriptionTier: org.subscription_tier,
        stripeCustomerId: org.stripe_customer_id,
        userCount: orgUsers.length,
        activeUserCount: activeUsers,
        messageCount,
        conversationCount,
        createdAt: org.created_at,
        updatedAt: org.updated_at,
        trialEndsAt: org.trial_ends_at,
        suspendedAt: org.suspended_at,
        suspensionReason: org.suspension_reason,
        lastActivity: org.updated_at, // Use org updated_at as proxy for activity
        billingEmail: org.billing_email,
        timezone: org.timezone,
        locale: org.locale,
      }
    })

    // Note: Audit logging removed - system_audit_logs table doesn't exist yet
    // TODO: Re-enable when audit logging table is created

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
    })
  } catch (error) {
    console.error('Admin organizations API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create new organization (super admin only)
export async function POST(request: NextRequest) {
  // Apply admin middleware (validates super admin access)
  const middlewareResponse = await adminMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      name,
      slug,
      subscriptionTier = 'starter',
      trialDays = 14,
      billingEmail,
      timezone = 'UTC',
      locale = 'en',
      metadata = {},
    } = body

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Check if slug is unique
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingOrg) {
      return NextResponse.json({ error: 'Organization slug already exists' }, { status: 409 })
    }

    // Calculate trial end date
    const trialEndsAt = new Date()
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays)

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
      .single()

    if (createError) {
      console.error('Error creating organization:', createError)
      return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 })
    }

    // Note: Audit logging removed - system_audit_logs table doesn't exist yet
    // TODO: Re-enable when audit logging table is created

    return NextResponse.json({ organization: newOrg }, { status: 201 })
  } catch (error) {
    console.error('Admin create organization API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
