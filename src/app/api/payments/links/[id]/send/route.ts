/**
 * Send Payment Link via WhatsApp
 * POST /api/payments/links/[id]/send
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'
import { PaymentLinksService } from '@/lib/stripe/payment-links'
import { WhatsAppService } from '@/lib/whatsapp/service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuthenticatedUser()
    const profile = await getUserOrganization(user.id)
    const supabase = await createClient()

    const body = await request.json()
    const { conversationId, contactId, personalMessage } = body

    // Validate required fields
    if (!conversationId || !contactId) {
      return NextResponse.json(
        { error: 'conversationId and contactId are required' },
        { status: 400 }
      )
    }

    // Get payment link
    const paymentLink = await PaymentLinksService.getPaymentLink(
      id,
      profile.organization_id
    )

    if (!paymentLink) {
      return NextResponse.json(
        { error: 'Payment link not found' },
        { status: 404 }
      )
    }

    if (paymentLink.status !== 'active') {
      return NextResponse.json(
        { error: 'Payment link is not active' },
        { status: 400 }
      )
    }

    // Verify conversation belongs to organization
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, contact_id')
      .eq('id', conversationId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Get contact phone number
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, phone_number, name')
      .eq('id', contactId)
      .eq('organization_id', profile.organization_id)
      .single()

    if (contactError || !contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Generate WhatsApp message
    const messageText = PaymentLinksService.generateWhatsAppMessage(
      paymentLink,
      personalMessage
    )

    // Create message in database
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'agent',
        sender_id: user.id,
        content: messageText,
        message_type: 'payment_link',
        metadata: {
          payment_link_id: id,
          payment_link_url: paymentLink.stripePaymentLinkUrl,
          amount: paymentLink.amount,
          currency: paymentLink.currency,
        },
        status: 'pending',
      })
      .select()
      .single()

    if (msgError) throw msgError

    // Record usage
    await PaymentLinksService.recordUsage(id, conversationId, contactId)

    // Update conversation's last message
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_preview: `💳 Betaalverzoek: ${paymentLink.name}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    // Send via WhatsApp API
    try {
      const whatsappService = await WhatsAppService.createFromOrganization(
        profile.organization_id,
        supabase
      )

      // Get contact's WhatsApp ID
      const { data: contactWithWhatsApp } = await supabase
        .from('contacts')
        .select('whatsapp_id')
        .eq('id', contactId)
        .single()

      if (!contactWithWhatsApp?.whatsapp_id) {
        // No WhatsApp ID - update message status and return error
        await supabase
          .from('messages')
          .update({ status: 'failed', metadata: { ...message.metadata, error: 'Contact has no WhatsApp ID' } })
          .eq('id', message.id)

        return NextResponse.json(
          { error: 'Contact does not have a WhatsApp ID configured' },
          { status: 400 }
        )
      }

      // Send message via WhatsApp
      await whatsappService.sendMessage(
        conversationId,
        messageText,
        user.id,
        'text'
      )

      // Update message status to sent
      await supabase
        .from('messages')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', message.id)

      console.log(`[PaymentLinks] Successfully sent payment link ${id} to contact ${contactId}`)
    } catch (whatsappError) {
      console.error('[PaymentLinks] WhatsApp send error:', whatsappError)

      // Update message status to failed
      await supabase
        .from('messages')
        .update({
          status: 'failed',
          metadata: {
            ...message.metadata,
            error: whatsappError instanceof Error ? whatsappError.message : 'WhatsApp send failed',
          },
        })
        .eq('id', message.id)

      return NextResponse.json(
        { error: 'Failed to send payment link via WhatsApp' },
        { status: 500 }
      )
    }

    return createSuccessResponse({
      message: 'Payment link sent successfully',
      messageId: message.id,
      paymentLinkUrl: paymentLink.stripePaymentLinkUrl,
    })
  } catch (error) {
    console.error('Send payment link error:', error)
    return createErrorResponse(error)
  }
}
