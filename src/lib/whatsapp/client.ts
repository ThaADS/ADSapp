export class WhatsAppClient {
  private accessToken: string
  private phoneNumberId: string
  private baseUrl = 'https://graph.facebook.com/v18.0'

  constructor(accessToken: string, phoneNumberId: string) {
    this.accessToken = accessToken
    this.phoneNumberId = phoneNumberId
  }

  async sendMessage(
    to: string,
    message: {
      type: 'text' | 'template' | 'media' | 'image' | 'document'
      text?: { body: string }
      template?: {
        name: string
        language: { code: string }
        components?: Record<string, unknown>[]
      }
      image?: {
        link?: string
        caption?: string
      }
      document?: {
        link: string
        filename?: string
        caption?: string
      }
    }
  ) {
    const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        ...message,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`WhatsApp API Error: ${error.error?.message || 'Unknown error'}`)
    }

    return response.json()
  }

  async sendTextMessage(to: string, text: string) {
    return this.sendMessage(to, {
      type: 'text',
      text: { body: text },
    })
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode = 'en',
    components: Record<string, unknown>[] = []
  ) {
    return this.sendMessage(to, {
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components,
      },
    })
  }

  async sendImageMessage(to: string, imageUrl: string, caption?: string) {
    return this.sendMessage(to, {
      type: 'image',
      image: {
        link: imageUrl,
        caption,
      },
    })
  }

  async sendDocumentMessage(to: string, documentUrl: string, filename?: string, caption?: string) {
    return this.sendMessage(to, {
      type: 'document',
      document: {
        link: documentUrl,
        filename,
        caption,
      },
    })
  }

  async markAsRead(messageId: string) {
    const response = await fetch(`${this.baseUrl}/${this.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`WhatsApp API Error: ${error.error?.message || 'Unknown error'}`)
    }

    return response.json()
  }

  async getMedia(mediaId: string) {
    const response = await fetch(`${this.baseUrl}/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`WhatsApp API Error: ${error.error?.message || 'Unknown error'}`)
    }

    return response.json()
  }

  async downloadMedia(mediaUrl: string) {
    const response = await fetch(mediaUrl, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to download media')
    }

    return response
  }
}
