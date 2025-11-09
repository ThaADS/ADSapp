/**
 * Broadcast Campaigns API
 * Manages broadcast/bulk messaging campaigns
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))

    const supabase = await createClient()

    // Build query for bulk_campaigns table
    let query = supabase
      .from('bulk_campaigns')
      .select('*, bulk_message_jobs(count)', { count: 'exact' })
      .eq('organization_id', profile.organization_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: campaigns, error, count } = await query

    if (error) {
      throw error
    }

    // Transform campaigns to match UI expectations
    const transformedCampaigns = await Promise.all(
      (campaigns || []).map(async campaign => {
        // Get job statistics
        const { data: jobs } = await supabase
          .from('bulk_message_jobs')
          .select('status, delivered_at, read_at')
          .eq('campaign_id', campaign.id)

        const totalTargets = jobs?.length || 0
        const messagesSent = jobs?.filter(j => ['sent', 'delivered', 'read'].includes(j.status)).length || 0
        const messagesDelivered = jobs?.filter(j => j.delivered_at).length || 0
        const messagesRead = jobs?.filter(j => j.read_at).length || 0

        return {
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          status: campaign.status,
          type: campaign.message_type || 'text',
          statistics: {
            totalTargets,
            messagesSent,
            messagesDelivered,
            deliveryRate: totalTargets > 0 ? (messagesDelivered / totalTargets) * 100 : 0,
            readRate: totalTargets > 0 ? (messagesRead / totalTargets) * 100 : 0,
          },
          scheduling: {
            type: campaign.scheduled_at ? 'scheduled' : 'immediate',
            scheduledAt: campaign.scheduled_at,
          },
          createdAt: campaign.created_at,
        }
      })
    )

    return createSuccessResponse({
      campaigns: transformedCampaigns,
      pagination: {
        limit,
        offset,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0),
      },
    })
  } catch (error) {
    console.error('List campaigns error:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    // Verify user has permission to create campaigns
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only owners and admins can create broadcast campaigns.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      name,
      description,
      targeting,
      message,
      scheduling,
      settings = {},
    } = body

    // Validate required fields
    if (!name || !message || !targeting) {
      return NextResponse.json(
        { error: 'Missing required fields: name, message, targeting' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Determine target contacts based on targeting configuration
    let targetContacts: string[] = []

    switch (targeting.type) {
      case 'all':
        const { data: allContacts } = await supabase
          .from('contacts')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .eq('is_blocked', false)

        targetContacts = allContacts?.map(c => c.id) || []
        break

      case 'tags':
        if (!targeting.tags || targeting.tags.length === 0) {
          return NextResponse.json(
            { error: 'Tags are required for tag-based targeting' },
            { status: 400 }
          )
        }

        const { data: tagContacts } = await supabase
          .from('contacts')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .eq('is_blocked', false)
          .overlaps('tags', targeting.tags)

        targetContacts = tagContacts?.map(c => c.id) || []
        break

      case 'custom':
        if (!targeting.contactIds || targeting.contactIds.length === 0) {
          return NextResponse.json(
            { error: 'Contact IDs are required for custom targeting' },
            { status: 400 }
          )
        }

        // Verify contacts belong to organization
        const { data: customContacts } = await supabase
          .from('contacts')
          .select('id')
          .eq('organization_id', profile.organization_id)
          .in('id', targeting.contactIds)

        targetContacts = customContacts?.map(c => c.id) || []
        break

      case 'csv':
        // CSV contacts should be pre-processed and provided as contactIds
        if (!targeting.contactIds || targeting.contactIds.length === 0) {
          return NextResponse.json(
            { error: 'No contacts found from CSV upload' },
            { status: 400 }
          )
        }
        targetContacts = targeting.contactIds
        break

      default:
        return NextResponse.json(
          { error: 'Invalid targeting type' },
          { status: 400 }
        )
    }

    if (targetContacts.length === 0) {
      return NextResponse.json(
        { error: 'No target contacts found matching the criteria' },
        { status: 400 }
      )
    }

    if (targetContacts.length > 10000) {
      return NextResponse.json(
        { error: 'Maximum 10,000 recipients allowed per campaign' },
        { status: 400 }
      )
    }

    // Create campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('bulk_campaigns')
      .insert({
        organization_id: profile.organization_id,
        created_by: user.id,
        name,
        description,
        message_type: message.type || 'text',
        message_content: message.content,
        template_id: message.templateId,
        media_url: message.mediaUrl,
        targeting_config: targeting,
        scheduling_config: scheduling,
        settings,
        status: scheduling?.type === 'scheduled' ? 'scheduled' : 'draft',
        scheduled_at: scheduling?.scheduledAt,
        total_recipients: targetContacts.length,
      })
      .select()
      .single()

    if (campaignError) {
      throw campaignError
    }

    // Create message jobs for each target
    const jobs = targetContacts.map(contactId => ({
      campaign_id: campaign.id,
      organization_id: profile.organization_id,
      contact_id: contactId,
      status: 'pending',
      scheduled_at: scheduling?.scheduledAt || new Date().toISOString(),
    }))

    const { error: jobsError } = await supabase
      .from('bulk_message_jobs')
      .insert(jobs)

    if (jobsError) {
      // Rollback campaign creation
      await supabase.from('bulk_campaigns').delete().eq('id', campaign.id)
      throw jobsError
    }

    return createSuccessResponse(
      {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          totalRecipients: targetContacts.length,
          scheduledAt: campaign.scheduled_at,
        },
        message: 'Broadcast campaign created successfully',
      },
      201
    )
  } catch (error) {
    console.error('Create campaign error:', error)
    return createErrorResponse(error)
  }
}
