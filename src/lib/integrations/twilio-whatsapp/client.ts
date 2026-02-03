/**
 * Twilio WhatsApp Client
 * Purpose: Manage Twilio WhatsApp API interactions
 * Date: 2026-02-03
 */

import crypto from 'crypto'
import { createClient } from '@/lib/supabase/server'
import type { TwilioContentApiTemplate } from '@/types/twilio-whatsapp'

// Environment variable for encryption
const ENCRYPTION_KEY = process.env.TWILIO_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || ''

// =============================================================================
// Types
// =============================================================================

export interface TwilioWhatsAppCredentials {
  accountSid: string
  authToken: string
  whatsappNumber: string // E.164 format
}

export interface TwilioWhatsAppMessage {
  to: string // E.164 format (without whatsapp: prefix)
  body?: string
  mediaUrl?: string
  contentSid?: string // For template messages (Phase 22)
  contentVariables?: Record<string, string>
}

export interface TwilioMessageResponse {
  sid: string
  status: string
  errorCode?: number
  errorMessage?: string
}

// =============================================================================
// Encryption Utilities (same pattern as SMS)
// =============================================================================

function encryptToken(token: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  const encrypted = Buffer.from(token).map((byte, i) => byte ^ key[i % key.length])
  return encrypted.toString('base64')
}

function decryptToken(encryptedToken: string): string {
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required')
  }
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  const encrypted = Buffer.from(encryptedToken, 'base64')
  const decrypted = encrypted.map((byte, i) => byte ^ key[i % key.length])
  return decrypted.toString()
}

// =============================================================================
// Twilio WhatsApp Client Class
// =============================================================================

export class TwilioWhatsAppClient {
  private accountSid: string
  private authToken: string
  private whatsappNumber: string
  private baseUrl = 'https://api.twilio.com/2010-04-01'

  constructor(credentials: TwilioWhatsAppCredentials) {
    this.accountSid = credentials.accountSid
    this.authToken = credentials.authToken
    this.whatsappNumber = credentials.whatsappNumber
  }

  /**
   * Send a WhatsApp message via Twilio
   */
  async sendMessage(message: TwilioWhatsAppMessage): Promise<TwilioMessageResponse> {
    const url = `${this.baseUrl}/Accounts/${this.accountSid}/Messages.json`

    const body = new URLSearchParams()
    body.append('To', `whatsapp:${this.normalizePhoneNumber(message.to)}`)
    body.append('From', `whatsapp:${this.whatsappNumber}`)

    if (message.body) {
      body.append('Body', message.body)
    }

    if (message.mediaUrl) {
      body.append('MediaUrl', message.mediaUrl)
    }

    // Template messages (Phase 22)
    if (message.contentSid) {
      body.append('ContentSid', message.contentSid)
      if (message.contentVariables) {
        body.append('ContentVariables', JSON.stringify(message.contentVariables))
      }
    }

    // Add status callback URL
    const statusCallbackUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio-whatsapp`
      : undefined

    if (statusCallbackUrl) {
      body.append('StatusCallback', statusCallbackUrl)
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })

    const data = await response.json()

    if (!response.ok) {
      return {
        sid: '',
        status: 'failed',
        errorCode: data.code,
        errorMessage: data.message || 'Unknown error',
      }
    }

    return {
      sid: data.sid,
      status: data.status,
    }
  }

  /**
   * Send a text message
   */
  async sendTextMessage(to: string, text: string): Promise<TwilioMessageResponse> {
    return this.sendMessage({ to, body: text })
  }

  /**
   * Send a media message (image, video, audio, document)
   */
  async sendMediaMessage(
    to: string,
    mediaUrl: string,
    caption?: string
  ): Promise<TwilioMessageResponse> {
    return this.sendMessage({
      to,
      body: caption,
      mediaUrl,
    })
  }

  /**
   * Send a template message using Content SID
   */
  async sendTemplateMessage(
    to: string,
    contentSid: string,
    contentVariables?: Record<string, string>
  ): Promise<TwilioMessageResponse> {
    return this.sendMessage({
      to,
      contentSid,
      contentVariables,
    })
  }

  /**
   * List all content templates from Twilio Content API
   */
  async listContentTemplates(): Promise<{
    success: boolean
    data?: TwilioContentApiTemplate[]
    error?: string
  }> {
    try {
      const url = 'https://content.twilio.com/v1/Content'
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}`,
        }
      }

      const data = await response.json()
      return {
        success: true,
        data: data.contents || [],
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get a specific content template
   */
  async getContentTemplate(contentSid: string): Promise<{
    success: boolean
    data?: TwilioContentApiTemplate
    error?: string
  }> {
    try {
      const url = `https://content.twilio.com/v1/Content/${contentSid}`
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}`,
        }
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Verify Twilio credentials are valid
   */
  async verifyCredentials(): Promise<{ valid: boolean; error?: string }> {
    try {
      const url = `${this.baseUrl}/Accounts/${this.accountSid}.json`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        return { valid: false, error: data.message || 'Invalid credentials' }
      }

      return { valid: true }
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Connection failed' }
    }
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^0-9+]/g, '')
    if (cleaned.startsWith('+')) {
      return cleaned
    }
    return `+${cleaned}`
  }
}

// =============================================================================
// Webhook Signature Validation
// =============================================================================

/**
 * Validate Twilio webhook signature (same as SMS)
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken: string
): boolean {
  // Sort parameters and build data string
  const sortedKeys = Object.keys(params).sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + params[key]
  }

  // Generate expected signature
  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(data)
    .digest('base64')

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Get Twilio WhatsApp client for an organization
 */
export async function getTwilioWhatsAppClient(
  organizationId: string
): Promise<TwilioWhatsAppClient> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('twilio_whatsapp_connections')
    .select('twilio_account_sid, twilio_auth_token_hash, whatsapp_number')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    throw new Error('Twilio WhatsApp connection not found for organization')
  }

  return new TwilioWhatsAppClient({
    accountSid: data.twilio_account_sid,
    authToken: decryptToken(data.twilio_auth_token_hash),
    whatsappNumber: data.whatsapp_number,
  })
}

/**
 * Save Twilio WhatsApp credentials for an organization
 */
export async function saveTwilioWhatsAppCredentials(
  organizationId: string,
  credentials: TwilioWhatsAppCredentials & { friendlyName?: string }
): Promise<{ success: boolean; error?: string; connectionId?: string }> {
  // First verify credentials
  const client = new TwilioWhatsAppClient(credentials)
  const verification = await client.verifyCredentials()

  if (!verification.valid) {
    return { success: false, error: verification.error }
  }

  // Encrypt auth token
  const encryptedToken = encryptToken(credentials.authToken)

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('twilio_whatsapp_connections')
    .upsert({
      organization_id: organizationId,
      twilio_account_sid: credentials.accountSid,
      twilio_auth_token_hash: encryptedToken,
      whatsapp_number: credentials.whatsappNumber,
      friendly_name: credentials.friendlyName,
      is_active: true,
      last_verified_at: new Date().toISOString(),
    }, {
      onConflict: 'whatsapp_number',
    })
    .select('id')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, connectionId: data.id }
}

/**
 * Get auth token for webhook validation (internal use)
 */
export async function getAuthTokenForConnection(
  connectionId: string
): Promise<string | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('twilio_whatsapp_connections')
    .select('twilio_auth_token_hash')
    .eq('id', connectionId)
    .single()

  if (error || !data) {
    return null
  }

  return decryptToken(data.twilio_auth_token_hash)
}

/**
 * Get connection by WhatsApp number (for webhook routing)
 */
export async function getConnectionByWhatsAppNumber(
  whatsappNumber: string
): Promise<{
  id: string
  organizationId: string
  accountSid: string
  authToken: string
} | null> {
  const supabase = await createClient()

  // Normalize the number for lookup
  const normalizedNumber = whatsappNumber.replace(/[^0-9+]/g, '')
  const searchNumber = normalizedNumber.startsWith('+') ? normalizedNumber : `+${normalizedNumber}`

  const { data, error } = await supabase
    .from('twilio_whatsapp_connections')
    .select('id, organization_id, twilio_account_sid, twilio_auth_token_hash')
    .eq('whatsapp_number', searchNumber)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    return null
  }

  return {
    id: data.id,
    organizationId: data.organization_id,
    accountSid: data.twilio_account_sid,
    authToken: decryptToken(data.twilio_auth_token_hash),
  }
}

// Export encryption utilities for testing
export { encryptToken, decryptToken }
