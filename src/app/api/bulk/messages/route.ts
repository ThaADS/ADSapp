import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { BulkOperationQueue, BulkMessageConfig } from '@/lib/bulk-operations/queue'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const body = await request.json()
    const { message, recipients, templateId, scheduling } = body

    if (!message || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Message and recipients array are required' },
        { status: 400 }
      )
    }

    if (recipients.length > 10000) {
      return NextResponse.json(
        { error: 'Maximum 10,000 recipients allowed per bulk message' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Process recipients - can be contact IDs or phone numbers
    const processedRecipients = []

    for (const recipient of recipients) {
      let contactId: string
      let phoneNumber: string

      if (recipient.contactId) {
        // Validate contact exists and belongs to organization
        const { data: contact } = await supabase
          .from('contacts')
          .select('id, phone_number')
          .eq('id', recipient.contactId)
          .eq('organization_id', profile.organization_id)
          .single()

        if (!contact) {
          return NextResponse.json(
            { error: `Contact ${recipient.contactId} not found` },
            { status: 400 }
          )
        }

        contactId = contact.id
        phoneNumber = contact.phone_number
      } else if (recipient.phoneNumber) {
        // Find or create contact by phone number
        let { data: contact } = await supabase
          .from('contacts')
          .select('id, phone_number')
          .eq('phone_number', recipient.phoneNumber)
          .eq('organization_id', profile.organization_id)
          .single()

        if (!contact) {
          // Create new contact
          const { data: newContact, error } = await supabase
            .from('contacts')
            .insert({
              organization_id: profile.organization_id,
              phone_number: recipient.phoneNumber,
              name: recipient.name || null,
              metadata: { created_for_bulk_message: true },
            })
            .select()
            .single()

          if (error) {
            return NextResponse.json(
              { error: `Failed to create contact for ${recipient.phoneNumber}: ${error.message}` },
              { status: 400 }
            )
          }

          contact = newContact
        }

        contactId = contact.id
        phoneNumber = contact.phone_number
      } else {
        return NextResponse.json(
          { error: 'Each recipient must have either contactId or phoneNumber' },
          { status: 400 }
        )
      }

      processedRecipients.push({
        contactId,
        phoneNumber,
        variables: recipient.variables || {},
      })
    }

    // Validate template if using template message
    if (message.type === 'template') {
      if (!templateId) {
        return NextResponse.json(
          { error: 'Template ID is required for template messages' },
          { status: 400 }
        )
      }

      const { data: template } = await supabase
        .from('message_templates')
        .select('*')
        .eq('id', templateId)
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .single()

      if (!template) {
        return NextResponse.json({ error: 'Template not found or inactive' }, { status: 400 })
      }

      // Update message with template name
      message.content = template.whatsapp_template_name || template.name
    }

    // Create bulk message configuration
    const config: BulkMessageConfig = {
      templateId,
      message,
      recipients: processedRecipients,
      scheduling,
    }

    // Create bulk operation
    const queue = new BulkOperationQueue()
    const operation = await queue.createOperation({
      organizationId: profile.organization_id,
      userId: user.id,
      type: 'bulk_message',
      status: 'queued',
      totalItems: processedRecipients.length,
      configuration: config,
    })

    return createSuccessResponse(
      {
        operation,
        estimatedCompletion: calculateEstimatedCompletion(
          processedRecipients.length,
          scheduling?.delay
        ),
        message: 'Bulk message operation created and queued for processing',
      },
      201
    )
  } catch (error) {
    console.error('Bulk message error:', error)
    return createErrorResponse(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0'))

    const queue = new BulkOperationQueue()
    const result = await queue.listOperations(profile.organization_id, {
      type: 'bulk_message',
      status: status as any,
      limit,
      offset,
    })

    return createSuccessResponse({
      operations: result.operations,
      pagination: {
        limit,
        offset,
        total: result.total,
        hasMore: offset + limit < result.total,
      },
    })
  } catch (error) {
    console.error('List bulk messages error:', error)
    return createErrorResponse(error)
  }
}

function calculateEstimatedCompletion(recipientCount: number, delay?: number): string {
  // Base processing time per message (assuming 1 second per message)
  const baseTime = recipientCount * 1000

  // Add delay time between messages
  const delayTime = delay ? (recipientCount - 1) * delay * 1000 : 0

  // Add some buffer time for processing
  const bufferTime = recipientCount * 200

  const totalTime = baseTime + delayTime + bufferTime
  const completionTime = new Date(Date.now() + totalTime)

  return completionTime.toISOString()
}
