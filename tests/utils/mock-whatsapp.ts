/**
 * WhatsApp API Mock Handlers
 *
 * Provides mock responses for WhatsApp Business Cloud API endpoints.
 * Useful for testing WhatsApp message sending, webhook handling, and media operations.
 */

export interface WhatsAppMessage {
  messaging_product: 'whatsapp'
  recipient_type?: 'individual'
  to: string
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'template'
  text?: { body: string }
  image?: { link: string; caption?: string }
  document?: { link: string; filename?: string; caption?: string }
  template?: {
    name: string
    language: { code: string }
    components?: any[]
  }
}

export interface WhatsAppMessageResponse {
  messaging_product: 'whatsapp'
  contacts: Array<{ input: string; wa_id: string }>
  messages: Array<{ id: string }>
}

export interface WhatsAppErrorResponse {
  error: {
    message: string
    type: string
    code: number
    error_subcode?: number
    fbtrace_id: string
  }
}

export interface WhatsAppWebhookMessage {
  object: 'whatsapp_business_account'
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: 'whatsapp'
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: { name: string }
          wa_id: string
        }>
        messages?: Array<{
          from: string
          id: string
          timestamp: string
          type: string
          text?: { body: string }
          image?: { id: string; mime_type: string; sha256: string; caption?: string }
          document?: { id: string; mime_type: string; sha256: string; filename?: string }
        }>
        statuses?: Array<{
          id: string
          status: 'sent' | 'delivered' | 'read' | 'failed'
          timestamp: string
          recipient_id: string
          errors?: Array<{ code: number; title: string }>
        }>
      }
      field: 'messages'
    }>
  }>
}

/**
 * Mock WhatsApp API responses
 */
export const mockWhatsAppResponses = {
  /**
   * Successful message send response
   */
  sendMessageSuccess: (recipientPhone: string): WhatsAppMessageResponse => ({
    messaging_product: 'whatsapp',
    contacts: [
      {
        input: recipientPhone,
        wa_id: recipientPhone.replace(/[^0-9]/g, ''),
      },
    ],
    messages: [
      {
        id: `wamid.test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      },
    ],
  }),

  /**
   * Error responses
   */
  errors: {
    invalidPhoneNumber: (): WhatsAppErrorResponse => ({
      error: {
        message: 'Invalid phone number',
        type: 'OAuthException',
        code: 100,
        error_subcode: 33,
        fbtrace_id: `test_trace_${Date.now()}`,
      },
    }),

    rateLimitExceeded: (): WhatsAppErrorResponse => ({
      error: {
        message: 'Rate limit exceeded',
        type: 'OAuthException',
        code: 4,
        fbtrace_id: `test_trace_${Date.now()}`,
      },
    }),

    invalidAccessToken: (): WhatsAppErrorResponse => ({
      error: {
        message: 'Invalid OAuth access token',
        type: 'OAuthException',
        code: 190,
        fbtrace_id: `test_trace_${Date.now()}`,
      },
    }),

    messageUndeliverable: (): WhatsAppErrorResponse => ({
      error: {
        message: 'Message undeliverable',
        type: 'OAuthException',
        code: 131047,
        fbtrace_id: `test_trace_${Date.now()}`,
      },
    }),
  },

  /**
   * Media upload response
   */
  uploadMediaSuccess: (): { id: string } => ({
    id: `media_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
  }),

  /**
   * Media info response
   */
  getMediaInfo: (mediaId: string) => ({
    messaging_product: 'whatsapp',
    url: `https://test-media-url.com/${mediaId}`,
    mime_type: 'image/jpeg',
    sha256: 'test_sha256_hash',
    file_size: 123456,
    id: mediaId,
  }),
}

/**
 * Mock webhook payloads
 */
export const mockWhatsAppWebhooks = {
  /**
   * Incoming text message webhook
   */
  incomingTextMessage: (from: string, text: string): WhatsAppWebhookMessage => ({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test_business_account_id',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+15551234567',
                phone_number_id: 'test_phone_number_id',
              },
              contacts: [
                {
                  profile: { name: 'Test User' },
                  wa_id: from.replace(/[^0-9]/g, ''),
                },
              ],
              messages: [
                {
                  from: from.replace(/[^0-9]/g, ''),
                  id: `wamid.test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'text',
                  text: { body: text },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  }),

  /**
   * Incoming image message webhook
   */
  incomingImageMessage: (from: string, caption?: string): WhatsAppWebhookMessage => ({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test_business_account_id',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+15551234567',
                phone_number_id: 'test_phone_number_id',
              },
              contacts: [
                {
                  profile: { name: 'Test User' },
                  wa_id: from.replace(/[^0-9]/g, ''),
                },
              ],
              messages: [
                {
                  from: from.replace(/[^0-9]/g, ''),
                  id: `wamid.test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: 'image',
                  image: {
                    id: `media_test_${Date.now()}`,
                    mime_type: 'image/jpeg',
                    sha256: 'test_sha256_hash',
                    ...(caption && { caption }),
                  },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  }),

  /**
   * Message status update webhook
   */
  messageStatusUpdate: (
    messageId: string,
    status: 'sent' | 'delivered' | 'read' | 'failed',
    recipientId: string
  ): WhatsAppWebhookMessage => ({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'test_business_account_id',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '+15551234567',
                phone_number_id: 'test_phone_number_id',
              },
              statuses: [
                {
                  id: messageId,
                  status,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  recipient_id: recipientId.replace(/[^0-9]/g, ''),
                  ...(status === 'failed' && {
                    errors: [{ code: 131047, title: 'Message undeliverable' }],
                  }),
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  }),
}

/**
 * Mock fetch handler for WhatsApp API
 * Use this in tests to intercept WhatsApp API calls
 */
export function createWhatsAppFetchMock() {
  return jest.fn((url: string | URL | Request, options?: RequestInit) => {
    const urlString = typeof url === 'string' ? url : url.toString()

    // Send message endpoint
    if (urlString.includes('graph.facebook.com') && urlString.includes('/messages')) {
      const body = options?.body ? JSON.parse(options.body as string) : {}

      // Simulate error responses based on phone number patterns
      if (body.to?.includes('invalid')) {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => mockWhatsAppResponses.errors.invalidPhoneNumber(),
          text: async () => JSON.stringify(mockWhatsAppResponses.errors.invalidPhoneNumber()),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response)
      }

      if (body.to?.includes('ratelimit')) {
        return Promise.resolve({
          ok: false,
          status: 429,
          json: async () => mockWhatsAppResponses.errors.rateLimitExceeded(),
          text: async () => JSON.stringify(mockWhatsAppResponses.errors.rateLimitExceeded()),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response)
      }

      // Success response
      const response = mockWhatsAppResponses.sendMessageSuccess(body.to)
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => response,
        text: async () => JSON.stringify(response),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response)
    }

    // Media upload endpoint
    if (urlString.includes('graph.facebook.com') && urlString.includes('/media')) {
      if (options?.method === 'POST') {
        const response = mockWhatsAppResponses.uploadMediaSuccess()
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => response,
          text: async () => JSON.stringify(response),
          headers: new Headers({ 'content-type': 'application/json' }),
        } as Response)
      }

      // Get media info
      const mediaId = urlString.split('/').pop()
      const response = mockWhatsAppResponses.getMediaInfo(mediaId || 'unknown')
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => response,
        text: async () => JSON.stringify(response),
        headers: new Headers({ 'content-type': 'application/json' }),
      } as Response)
    }

    // Default response for unknown endpoints
    return Promise.resolve({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found' }),
      text: async () => JSON.stringify({ error: 'Not found' }),
      headers: new Headers({ 'content-type': 'application/json' }),
    } as Response)
  })
}

/**
 * Example Usage:
 *
 * ```typescript
 * // Mock fetch for WhatsApp API
 * global.fetch = createWhatsAppFetchMock()
 *
 * // Test message sending
 * const response = await fetch('https://graph.facebook.com/v18.0/123456/messages', {
 *   method: 'POST',
 *   body: JSON.stringify({
 *     messaging_product: 'whatsapp',
 *     to: '+15551234567',
 *     type: 'text',
 *     text: { body: 'Hello, World!' }
 *   })
 * })
 * const data = await response.json()
 * expect(data.messages[0].id).toMatch(/^wamid\.test_/)
 *
 * // Test webhook handling
 * const webhook = mockWhatsAppWebhooks.incomingTextMessage('+15559876543', 'Hello!')
 * await handleWebhook(webhook)
 * ```
 */

export default {
  mockWhatsAppResponses,
  mockWhatsAppWebhooks,
  createWhatsAppFetchMock,
}
