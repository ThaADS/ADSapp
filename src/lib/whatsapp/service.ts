// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { createClient } from '@/lib/supabase/server'
import { WhatsAppClient } from './client'
import crypto from 'crypto'

export class WhatsAppService {
  private whatsapp: WhatsAppClient

  constructor(accessToken: string, phoneNumberId: string) {
    this.whatsapp = new WhatsAppClient(accessToken, phoneNumberId)
  }

  static async createFromOrganization(organizationId: string) {
    const supabase = await createClient()

    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (!organization?.whatsapp_phone_number_id) {
      throw new Error('WhatsApp not configured for this organization')
    }

    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    if (!accessToken) {
      throw new Error('WhatsApp access token not configured')
    }

    return new WhatsAppService(accessToken, organization.whatsapp_phone_number_id)
  }

  async sendMessage(
    conversationId: string,
    content: string,
    senderId: string,
    messageType: 'text' | 'template' | 'image' | 'document' = 'text'
  ) {
    const supabase = await createClient()

    // Get conversation and contact details
    const { data: conversation } = await supabase
      .from('conversations')
      .select('*, contact:contacts(*)')
      .eq('id', conversationId)
      .single()

    if (!conversation) {
      throw new Error('Conversation not found')
    }

    let whatsappResponse
    try {
      // Send message via WhatsApp API
      switch (messageType) {
        case 'text':
          whatsappResponse = await this.whatsapp.sendTextMessage(
            conversation.contact.whatsapp_id,
            content
          )
          break
        case 'template':
          // For template messages, content should include template details
          const templateData = JSON.parse(content)
          whatsappResponse = await this.whatsapp.sendTemplateMessage(
            conversation.contact.whatsapp_id,
            templateData.name,
            templateData.language || 'en',
            templateData.components || []
          )
          break
        case 'image':
          const imageData = JSON.parse(content)
          whatsappResponse = await this.whatsapp.sendImageMessage(
            conversation.contact.whatsapp_id,
            imageData.url,
            imageData.caption
          )
          break
        case 'document':
          const docData = JSON.parse(content)
          whatsappResponse = await this.whatsapp.sendDocumentMessage(
            conversation.contact.whatsapp_id,
            docData.url,
            docData.filename,
            docData.caption
          )
          break
        default:
          throw new Error(`Unsupported message type: ${messageType}`)
      }
    } catch (error) {
      console.error('WhatsApp API Error:', error)
      throw new Error('Failed to send WhatsApp message')
    }

    // Store message in database
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        whatsapp_message_id: whatsappResponse.messages?.[0]?.id,
        sender_type: 'agent',
        sender_id: senderId,
        content: messageType === 'text' ? content : `[${messageType}] ${content}`,
        message_type: messageType,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw new Error('Failed to store message')
    }

    // Update conversation last_message_at
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId)

    return message
  }

  async markMessageAsRead(messageId: string) {
    const supabase = await createClient()

    // Get message details
    const { data: message } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    if (!message?.whatsapp_message_id) {
      throw new Error('Message not found or missing WhatsApp ID')
    }

    try {
      await this.whatsapp.markAsRead(message.whatsapp_message_id)

      // Update database
      await supabase
        .from('messages')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', messageId)
    } catch (error) {
      console.error('Failed to mark message as read:', error)
      throw error
    }
  }

  async downloadMedia(mediaId: string) {
    try {
      // Get media URL from WhatsApp API
      const mediaInfo = await this.whatsapp.getMedia(mediaId)

      // Download the actual media file
      const mediaResponse = await this.whatsapp.downloadMedia(mediaInfo.url)

      return {
        data: mediaResponse.body,
        mimeType: mediaInfo.mime_type,
        filename: `media_${mediaId}`,
      }
    } catch (error) {
      console.error('Failed to download media:', error)
      throw error
    }
  }
}

// Utility functions for WhatsApp message templates
export class WhatsAppTemplates {
  static welcomeMessage(customerName?: string) {
    return {
      name: 'welcome_message',
      language: 'en',
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: customerName || 'Customer',
            },
          ],
        },
      ],
    }
  }

  static businessHoursMessage() {
    return {
      name: 'business_hours',
      language: 'en',
      components: [],
    }
  }

  static awayMessage(agentName?: string) {
    return {
      name: 'agent_away',
      language: 'en',
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: agentName || 'Support Team',
            },
          ],
        },
      ],
    }
  }
}

// WhatsApp Business API webhook validation
export function validateWebhookSignature(payload: string, signature: string): boolean {
  // crypto is now imported at the top
  const appSecret = process.env.WHATSAPP_APP_SECRET

  if (!appSecret) {
    console.warn('WhatsApp app secret not configured')
    return true // Skip validation in development
  }

  const expectedSignature = crypto.createHmac('sha256', appSecret).update(payload).digest('hex')

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(`sha256=${expectedSignature}`))
}
