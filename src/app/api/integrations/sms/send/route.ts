/**
 * SMS Send API Route
 * POST: Send an SMS/MMS message
 * Date: 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'
import { createSMSAdapter } from '@/lib/channels/adapters'
import { CanonicalMessage, ChannelType } from '@/types/channels'
import { SendSMSRequest, SendSMSResponse, isValidE164, normalizeToE164 } from '@/types/sms'

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

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Parse request body
    const body: SendSMSRequest = await request.json()

    // Validate recipient phone
    if (!body.to) {
      return NextResponse.json({ error: 'Recipient phone number is required' }, { status: 400 })
    }

    const normalizedPhone = normalizeToE164(body.to)
    if (!isValidE164(normalizedPhone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }

    // Must have either body or mediaUrl
    if (!body.body && (!body.mediaUrl || body.mediaUrl.length === 0)) {
      return NextResponse.json(
        { error: 'Message must have body text or media' },
        { status: 400 }
      )
    }

    // Handle template rendering if template_id provided
    let messageBody = body.body
    if (body.template_id) {
      const { data: template, error: templateError } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('id', body.template_id)
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .single()

      if (templateError || !template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      // Render template with variables
      messageBody = template.body
      if (body.template_variables) {
        for (const [key, value] of Object.entries(body.template_variables)) {
          messageBody = messageBody.replace(new RegExp(`{{${key}}}`, 'g'), value)
        }
      }

      // Update template usage
      await supabase
        .from('sms_templates')
        .update({
          use_count: template.use_count + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', body.template_id)
    }

    // Create adapter
    let adapter
    try {
      adapter = await createSMSAdapter(profile.organization_id)
    } catch (error) {
      return NextResponse.json(
        { error: 'SMS not configured. Please connect Twilio first.' },
        { status: 400 }
      )
    }

    // Build canonical message
    const canonicalMessage: CanonicalMessage = {
      id: `outbound_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId: 'placeholder', // Will be resolved in adapter
      channelType: ChannelType.SMS,
      direction: 'outbound',
      content: messageBody || null,
      timestamp: new Date().toISOString(),
      channelMetadata: {
        sms: {
          recipientPhone: normalizedPhone,
        },
      },
    }

    // Add media if present
    if (body.mediaUrl && body.mediaUrl.length > 0) {
      canonicalMessage.media = body.mediaUrl.map((url, index) => ({
        id: `media_${index}`,
        type: 'image' as const, // Default to image for MMS
        url,
      }))
    }

    // Send message
    const result = await adapter.send(canonicalMessage)

    if (!result.success) {
      const response: SendSMSResponse = {
        success: false,
        error: result.error,
        error_code: result.errorCode,
      }
      return NextResponse.json(response, { status: 400 })
    }

    const response: SendSMSResponse = {
      success: true,
      message_id: result.channelMessageId,
      twilio_sid: result.channelMessageId,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('SMS send error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
