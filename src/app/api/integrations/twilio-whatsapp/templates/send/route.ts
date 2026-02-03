/**
 * Twilio WhatsApp Template Send API
 * Purpose: Send template messages with variable substitution
 * Date: 2026-02-03
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { getTwilioWhatsAppClient } from '@/lib/integrations/twilio-whatsapp/client'
import { getTemplateById } from '@/lib/integrations/twilio-whatsapp/template-sync'

// Variable mapping from contact fields
const VARIABLE_MAPPING: Record<string, string> = {
  '1': 'name',
  '2': 'phone_number',
  '3': 'email',
  name: 'name',
  phone: 'phone_number',
  email: 'email',
}

/**
 * POST /api/integrations/twilio-whatsapp/templates/send
 * Send a template message to a contact
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse request body
    const body = await request.json()
    const { templateId, contactId, conversationId, customVariables } = body

    // Validate inputs
    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    const templateValidation = QueryValidators.uuid(templateId)
    if (!templateValidation.isValid) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      )
    }

    if (!contactId && !conversationId) {
      return NextResponse.json(
        { error: 'Either contactId or conversationId is required' },
        { status: 400 }
      )
    }

    // Get template
    const template = await getTemplateById(templateId, profile.organization_id)
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    // Get contact (either directly or via conversation)
    let contact: Record<string, unknown> | null = null
    let conversation: { id: string; contact_id: string } | null = null

    if (conversationId) {
      const convValidation = QueryValidators.uuid(conversationId)
      if (!convValidation.isValid) {
        return NextResponse.json(
          { error: 'Invalid conversation ID' },
          { status: 400 }
        )
      }

      const { data: conv } = await supabase
        .from('conversations')
        .select('id, contact_id')
        .eq('id', conversationId)
        .eq('organization_id', profile.organization_id)
        .single()

      if (!conv) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }

      conversation = conv

      // Get contact from conversation
      const { data: c } = await supabase
        .from('contacts')
        .select('id, name, phone_number, whatsapp_id, email, custom_fields')
        .eq('id', conv.contact_id)
        .single()

      contact = c
    } else {
      const contactValidation = QueryValidators.uuid(contactId)
      if (!contactValidation.isValid) {
        return NextResponse.json(
          { error: 'Invalid contact ID' },
          { status: 400 }
        )
      }

      const { data: c } = await supabase
        .from('contacts')
        .select('id, name, phone_number, whatsapp_id, email, custom_fields')
        .eq('id', contactId)
        .eq('organization_id', profile.organization_id)
        .single()

      if (!c) {
        return NextResponse.json(
          { error: 'Contact not found' },
          { status: 404 }
        )
      }

      contact = c
    }

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Get phone number
    const phoneNumber = (contact.whatsapp_id || contact.phone_number) as string | undefined
    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Contact has no WhatsApp number' },
        { status: 400 }
      )
    }

    // Build content variables from template variables + contact data
    const contentVariables: Record<string, string> = {}
    const customFields = (contact.custom_fields || {}) as Record<string, string>

    for (const variable of template.variables) {
      const key = variable.key

      // Check custom variables first
      if (customVariables && customVariables[key]) {
        contentVariables[key] = customVariables[key]
        continue
      }

      // Map to contact field
      const fieldName = VARIABLE_MAPPING[key] || variable.name
      if (fieldName && contact[fieldName]) {
        contentVariables[key] = contact[fieldName] as string
      } else if (fieldName && customFields[fieldName]) {
        contentVariables[key] = customFields[fieldName]
      } else if (variable.defaultValue) {
        contentVariables[key] = variable.defaultValue
      }
    }

    // Get Twilio client and send
    const client = await getTwilioWhatsAppClient(profile.organization_id)
    const result = await client.sendTemplateMessage(
      phoneNumber,
      template.contentSid,
      contentVariables
    )

    if (!result.sid) {
      return NextResponse.json(
        {
          error: result.errorMessage || 'Failed to send template message',
          errorCode: result.errorCode,
        },
        { status: 400 }
      )
    }

    // Record the send in template_sends table
    const serviceSupabase = createServiceRoleClient()

    // Create or get conversation if needed
    let finalConversationId = conversation?.id

    if (!finalConversationId) {
      // Check for existing conversation
      const { data: existingConv } = await serviceSupabase
        .from('conversations')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('contact_id', contact.id)
        .eq('channel', 'twilio_whatsapp')
        .single()

      if (existingConv) {
        finalConversationId = existingConv.id
      } else {
        // Create new conversation
        const { data: newConv } = await serviceSupabase
          .from('conversations')
          .insert({
            organization_id: profile.organization_id,
            contact_id: contact.id,
            channel: 'twilio_whatsapp',
            status: 'open',
            last_message_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        finalConversationId = newConv?.id
      }
    }

    // Create message record
    const { data: message } = await serviceSupabase
      .from('messages')
      .insert({
        conversation_id: finalConversationId,
        organization_id: profile.organization_id,
        channel: 'twilio_whatsapp',
        channel_message_id: result.sid,
        direction: 'outbound',
        content: template.body || `[Template: ${template.friendlyName}]`,
        content_type: 'template',
        sender_type: 'user',
        sender_id: user.id,
        status: 'sent',
        metadata: {
          template_id: template.id,
          template_name: template.friendlyName,
          content_sid: template.contentSid,
          variables: contentVariables,
        },
      })
      .select('id')
      .single()

    // Record template send
    await serviceSupabase.from('twilio_whatsapp_template_sends').insert({
      organization_id: profile.organization_id,
      template_id: template.id,
      message_id: message?.id,
      conversation_id: finalConversationId,
      contact_id: contact.id as string,
      variables_used: contentVariables,
      twilio_message_sid: result.sid,
      status: 'sent',
    })

    // Update conversation last_message_at
    if (finalConversationId) {
      await serviceSupabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', finalConversationId)
    }

    return NextResponse.json({
      success: true,
      messageSid: result.sid,
      messageId: message?.id,
      conversationId: finalConversationId,
      variablesUsed: contentVariables,
    })
  } catch (error) {
    console.error('Template send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
