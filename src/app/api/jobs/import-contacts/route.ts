import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getQueueManager } from '@/lib/queue/queue-manager'
import { QueueName, JobPriority } from '@/lib/queue/bull-config'
import { ContactImportJobData } from '@/lib/queue/processors/contact-import-processor'

/**
 * POST /api/jobs/import-contacts
 * Queue a contact import job
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

    // Check permissions (only admins and owners can import contacts)
    if (!['owner', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { contacts, importOptions } = body

    // Validate required fields
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return NextResponse.json(
        { error: 'contacts is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    // Validate contact structure
    const invalidContacts = contacts.filter(
      contact => !contact.phone || typeof contact.phone !== 'string'
    )

    if (invalidContacts.length > 0) {
      return NextResponse.json(
        {
          error: 'All contacts must have a valid phone number',
          invalidCount: invalidContacts.length,
        },
        { status: 400 }
      )
    }

    // Set default import options
    const options = {
      updateExisting: importOptions?.updateExisting ?? false,
      skipDuplicates: importOptions?.skipDuplicates ?? true,
      validatePhone: importOptions?.validatePhone ?? true,
    }

    // Prepare job data
    const jobData: ContactImportJobData = {
      organizationId: profile.organization_id,
      userId: user.id,
      contacts: contacts.map(contact => ({
        phone: contact.phone,
        name: contact.name,
        email: contact.email,
        tags: contact.tags || [],
        customFields: contact.customFields || {},
      })),
      importOptions: options,
      metadata: {
        requestedBy: user.email,
        requestedAt: new Date().toISOString(),
        source: 'api',
      },
    }

    // Get queue manager and add job
    const queueManager = getQueueManager()
    const jobId = await queueManager.addJob(QueueName.CONTACT_IMPORT, 'import-contacts', jobData, {
      priority: JobPriority.NORMAL,
    })

    return NextResponse.json(
      {
        success: true,
        jobId,
        message: `Contact import job queued for ${contacts.length} contacts`,
      },
      { status: 202 }
    )
  } catch (error) {
    console.error('Error queuing contact import job:', error)
    return NextResponse.json(
      {
        error: 'Failed to queue contact import job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
