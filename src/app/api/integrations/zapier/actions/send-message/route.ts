/**
 * Zapier Action: Send Message
 *
 * POST /api/integrations/zapier/actions/send-message
 *
 * Sends a WhatsApp message (text or template) to a contact.
 * Creates contact and conversation if they don't exist.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  withZapierMiddleware,
  type ZapierContext,
} from '@/lib/integrations/zapier/middleware'
import { WhatsAppService } from '@/lib/whatsapp/service'
import type {
  SendMessageRequest,
  SendMessageResponse,
  ZapierActionError,
} from '@/types/zapier'

// =====================================================
// Helpers
// =====================================================

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '')

  // Ensure starts with +
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized
  }

  return normalized
}

/**
 * Validate phone number format (basic E.164 check)
 */
function isValidPhoneNumber(phone: string): boolean {
  // E.164 format: + followed by 1-15 digits
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phone)
}

/**
 * Create Zapier-format error response
 */
function createActionErrorResponse(
  code: ZapierActionError['code'],
  message: string,
  status: number,
  field?: string
): Response {
  const error: ZapierActionError = { code, message }
  if (field) error.field = field

  const response: SendMessageResponse = {
    success: false,
    error,
  }

  return Response.json(response, { status })
}

// =====================================================
// Handler
// =====================================================

async function sendMessageHandler(
  request: Request,
  context: ZapierContext
): Promise<Response> {
  try {
    // Parse request body
    let body: SendMessageRequest
    try {
      body = await request.json()
    } catch {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'Invalid JSON in request body',
        400
      )
    }

    // Validate required field: to
    if (!body.to || typeof body.to !== 'string') {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'Phone number (to) is required',
        400,
        'to'
      )
    }

    // Normalize and validate phone number
    const normalizedPhone = normalizePhoneNumber(body.to)
    if (!isValidPhoneNumber(normalizedPhone)) {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'Invalid phone number format. Use E.164 format (e.g., +1234567890)',
        400,
        'to'
      )
    }

    // Validate message content - must have either message or template, not both
    if (!body.message && !body.template) {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'Either message or template must be provided',
        400
      )
    }

    if (body.message && body.template) {
      return createActionErrorResponse(
        'INVALID_INPUT',
        'Cannot send both message and template. Provide only one.',
        400
      )
    }

    // Validate message content if provided
    if (body.message) {
      if (body.message.type !== 'text') {
        return createActionErrorResponse(
          'INVALID_INPUT',
          'Message type must be "text"',
          400,
          'message.type'
        )
      }
      if (!body.message.text || typeof body.message.text !== 'string') {
        return createActionErrorResponse(
          'INVALID_INPUT',
          'Message text is required and must be a string',
          400,
          'message.text'
        )
      }
      if (body.message.text.trim().length === 0) {
        return createActionErrorResponse(
          'INVALID_INPUT',
          'Message text cannot be empty',
          400,
          'message.text'
        )
      }
    }

    // Validate template if provided
    if (body.template) {
      if (!body.template.name || typeof body.template.name !== 'string') {
        return createActionErrorResponse(
          'INVALID_INPUT',
          'Template name is required',
          400,
          'template.name'
        )
      }
      if (!body.template.language || typeof body.template.language !== 'string') {
        return createActionErrorResponse(
          'INVALID_INPUT',
          'Template language is required',
          400,
          'template.language'
        )
      }
    }

    const supabase = createServiceRoleClient()

    // Find existing contact by phone number
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, whatsapp_id')
      .eq('organization_id', context.organizationId)
      .eq('phone_number', normalizedPhone)
      .single()

    let contact = existingContact

    // Create contact if not exists
    if (!contact) {
      const whatsappId = normalizedPhone.replace('+', '')
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          organization_id: context.organizationId,
          name: normalizedPhone, // Use phone as placeholder name
          phone_number: normalizedPhone,
          whatsapp_id: whatsappId,
        })
        .select('id, whatsapp_id')
        .single()

      if (contactError) {
        console.error('Failed to create contact:', contactError)
        return createActionErrorResponse(
          'INTERNAL_ERROR',
          'Failed to create contact',
          500
        )
      }

      contact = newContact
    }

    if (!contact) {
      return createActionErrorResponse(
        'INTERNAL_ERROR',
        'Failed to retrieve or create contact',
        500
      )
    }

    // Find existing conversation
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', contact.id)
      .eq('channel', 'whatsapp')
      .single()

    let conversation = existingConversation

    // Create conversation if not exists
    if (!conversation) {
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          organization_id: context.organizationId,
          contact_id: contact.id,
          channel: 'whatsapp',
          status: 'open',
        })
        .select('id')
        .single()

      if (convError) {
        console.error('Failed to create conversation:', convError)
        return createActionErrorResponse(
          'INTERNAL_ERROR',
          'Failed to create conversation',
          500
        )
      }

      conversation = newConversation
    }

    if (!conversation) {
      return createActionErrorResponse(
        'INTERNAL_ERROR',
        'Failed to retrieve or create conversation',
        500
      )
    }

    // Send message via WhatsApp service
    let whatsappService: WhatsAppService
    try {
      whatsappService = await WhatsAppService.createFromOrganization(
        context.organizationId,
        supabase
      )
    } catch (error) {
      console.error('Failed to initialize WhatsApp service:', error)
      return createActionErrorResponse(
        'INTERNAL_ERROR',
        'WhatsApp is not configured for this organization',
        500
      )
    }

    // Determine message type and content
    let messageType: 'text' | 'template' = 'text'
    let content: string

    if (body.message) {
      messageType = 'text'
      content = body.message.text
    } else if (body.template) {
      messageType = 'template'
      content = JSON.stringify(body.template)
    } else {
      // This should never happen due to earlier validation
      return createActionErrorResponse(
        'INTERNAL_ERROR',
        'No message content provided',
        500
      )
    }

    // Send the message
    let message
    try {
      message = await whatsappService.sendMessage(
        conversation.id,
        content,
        context.userId, // Use the authenticated user ID as sender
        messageType
      )
    } catch (error) {
      console.error('Failed to send WhatsApp message:', error)
      return createActionErrorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'Failed to send message',
        500
      )
    }

    // Return success response
    const response: SendMessageResponse = {
      success: true,
      message_id: message.id,
      status: message.status || 'sent',
      sent_at: message.created_at,
    }

    return Response.json(response, { status: 200 })
  } catch (error) {
    console.error('Unexpected error in send-message action:', error)
    return createActionErrorResponse(
      'INTERNAL_ERROR',
      'An unexpected error occurred',
      500
    )
  }
}

// =====================================================
// Route Export
// =====================================================

export const POST = withZapierMiddleware(sendMessageHandler, {
  rateLimitType: 'actions',
  requiredScopes: ['messages:write'],
})
