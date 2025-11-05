// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { createClient } from '@/lib/supabase/server'

export interface WhatsAppMedia {
  id: string
  url?: string
  mimeType: string
  filename?: string
  caption?: string
  sha256?: string
  fileSize?: number
}

export interface WhatsAppMessage {
  id: string
  from: string
  timestamp: string
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'contacts' | 'sticker' | 'button' | 'list' | 'interactive'
  text?: {
    body: string
  }
  image?: WhatsAppMedia & { caption?: string }
  document?: WhatsAppMedia & { caption?: string }
  audio?: WhatsAppMedia
  video?: WhatsAppMedia & { caption?: string }
  location?: {
    latitude: number
    longitude: number
    name?: string
    address?: string
  }
  contacts?: Array<{
    name: {
      formatted_name: string
      first_name?: string
      last_name?: string
    }
    phones?: Array<{
      phone: string
      type?: string
    }>
    emails?: Array<{
      email: string
      type?: string
    }>
  }>
  button?: {
    text: string
    payload: string
  }
  interactive?: {
    type: 'button_reply' | 'list_reply'
    button_reply?: {
      id: string
      title: string
    }
    list_reply?: {
      id: string
      title: string
      description?: string
    }
  }
  context?: {
    from: string
    id: string
  }
  errors?: Array<{
    code: number
    title: string
    message: string
  }>
}

export interface WhatsAppStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  conversation?: {
    id: string
    origin?: {
      type: string
    }
  }
  pricing?: {
    billable: boolean
    pricing_model: string
    category: string
  }
  errors?: Array<{
    code: number
    title: string
    message: string
    error_data?: {
      details: string
    }
  }>
}

export interface WhatsAppContact {
  profile: {
    name: string
  }
  wa_id: string
}

export interface WhatsAppWebhookValue {
  messaging_product: string
  metadata: {
    display_phone_number: string
    phone_number_id: string
  }
  contacts?: WhatsAppContact[]
  messages?: WhatsAppMessage[]
  statuses?: WhatsAppStatus[]
}

export class EnhancedWhatsAppClient {
  private apiVersion: string = 'v18.0'
  private baseUrl: string = 'https://graph.facebook.com'
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  async downloadMedia(mediaId: string): Promise<Buffer> {
    try {
      // First, get the media URL
      const mediaResponse = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      )

      if (!mediaResponse.ok) {
        throw new Error(`Failed to get media URL: ${mediaResponse.statusText}`)
      }

      const mediaData = await mediaResponse.json()

      // Download the actual media file
      const fileResponse = await fetch(mediaData.url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      })

      if (!fileResponse.ok) {
        throw new Error(`Failed to download media: ${fileResponse.statusText}`)
      }

      return Buffer.from(await fileResponse.arrayBuffer())
    } catch (error) {
      console.error('Error downloading media:', error)
      throw error
    }
  }

  async uploadMedia(file: Buffer, type: string, filename?: string): Promise<string> {
    try {
      const formData = new FormData()
      const blob = new Blob([file], { type })

      formData.append('file', blob, filename)
      formData.append('type', type)
      formData.append('messaging_product', 'whatsapp')

      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/media`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          body: formData
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to upload media: ${response.statusText}`)
      }

      const result = await response.json()
      return result.id
    } catch (error) {
      console.error('Error uploading media:', error)
      throw error
    }
  }

  async sendMessage(phoneNumberId: string, to: string, message: Record<string, unknown>): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            ...message
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to send message: ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      return result.messages[0].id
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  async markAsRead(phoneNumberId: string, messageId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            status: 'read',
            message_id: messageId
          })
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to mark message as read: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error marking message as read:', error)
      throw error
    }
  }

  async getBusinessProfile(phoneNumberId: string): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,messaging_limit_tier`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get business profile: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting business profile:', error)
      throw error
    }
  }

  async createTemplate(businessAccountId: string, template: Record<string, unknown>): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${businessAccountId}/message_templates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(template)
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to create template: ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      return result.id
    } catch (error) {
      console.error('Error creating template:', error)
      throw error
    }
  }

  async getTemplates(businessAccountId: string): Promise<Record<string, unknown>[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${businessAccountId}/message_templates`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get templates: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error getting templates:', error)
      throw error
    }
  }

  async deleteTemplate(businessAccountId: string, templateName: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${businessAccountId}/message_templates`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: templateName
          })
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to delete template: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      throw error
    }
  }
}

export async function getWhatsAppClient(organizationId: string): Promise<EnhancedWhatsAppClient> {
  const supabase = await createClient()

  const { data: organization, error } = await supabase
    .from('organizations')
    .select('whatsapp_access_token')
    .eq('id', organizationId)
    .single()

  if (error || !organization?.whatsapp_access_token) {
    throw new Error('WhatsApp access token not found for organization')
  }

  return new EnhancedWhatsAppClient(organization.whatsapp_access_token)
}