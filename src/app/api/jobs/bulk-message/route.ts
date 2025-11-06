// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQueueManager } from '@/lib/queue/queue-manager'
import { QueueName, JobPriority } from '@/lib/queue/bull-config'
import { BulkMessageJobData } from '@/lib/queue/processors/bulk-message-processor'

/**
 * POST /api/jobs/bulk-message
 * Queue a bulk message sending job
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Check permissions (only agents and above can send bulk messages)
    if (!['owner', 'admin', 'agent'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { contactIds, messageContent, messageType, templateId, priority } = body

    // Validate required fields
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: 'contactIds is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    if (!messageContent || typeof messageContent !== 'string') {
      return NextResponse.json(
        { error: 'messageContent is required and must be a string' },
        { status: 400 }
      )
    }

    // Fetch contacts from database
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, phone, name, custom_fields')
      .eq('organization_id', profile.organization_id)
      .in('id', contactIds)

    if (contactsError || !contacts || contacts.length === 0) {
      return NextResponse.json({ error: 'No valid contacts found' }, { status: 400 })
    }

    // Prepare job data
    const jobData: BulkMessageJobData = {
      organizationId: profile.organization_id,
      userId: user.id,
      contacts: contacts.map(contact => ({
        id: contact.id,
        phone: contact.phone,
        name: contact.name,
        variables: contact.custom_fields || {},
      })),
      messageContent,
      messageType: messageType || 'text',
      templateId: templateId || undefined,
      metadata: {
        requestedBy: user.email,
        requestedAt: new Date().toISOString(),
      },
    }

    // Get queue manager and add job
    const queueManager = getQueueManager()
    const jobId = await queueManager.addJob(QueueName.BULK_MESSAGE, 'send-bulk-message', jobData, {
      priority: priority || JobPriority.CRITICAL,
    })

    return NextResponse.json(
      {
        success: true,
        jobId,
        message: `Bulk message job queued for ${contacts.length} contacts`,
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('Error queuing bulk message job:', error)
    return NextResponse.json(
      {
        error: 'Failed to queue bulk message job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
