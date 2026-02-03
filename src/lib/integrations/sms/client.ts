/**
 * Twilio SMS Client
 * Core API client for Twilio SMS/MMS messaging
 * Date: 2026-01-28
 */

import crypto from 'crypto'
import {
  TwilioMessageResponse,
  TwilioSendMessageRequest,
  TwilioPhoneNumber,
  SMSMessageStatus,
} from '@/types/sms'

// =============================================================================
// CONFIGURATION
// =============================================================================

const TWILIO_API_BASE = 'https://api.twilio.com/2010-04-01'

// =============================================================================
// TOKEN ENCRYPTION (same pattern as WhatsApp/Instagram)
// =============================================================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-encryption-key-32ch'

function encryptToken(token: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  const encrypted = Buffer.from(token).map((byte, i) => byte ^ key[i % key.length])
  return encrypted.toString('base64')
}

function decryptToken(encryptedToken: string): string {
  const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
  const encrypted = Buffer.from(encryptedToken, 'base64')
  const decrypted = encrypted.map((byte, i) => byte ^ key[i % key.length])
  return Buffer.from(decrypted).toString('utf8')
}

export { encryptToken, decryptToken }

// =============================================================================
// AUTHENTICATION HELPERS
// =============================================================================

/**
 * Create Basic Auth header for Twilio API
 */
function createAuthHeader(accountSid: string, authToken: string): string {
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  return `Basic ${credentials}`
}

/**
 * Validate Twilio webhook signature
 * See: https://www.twilio.com/docs/usage/security#validating-requests
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken: string
): boolean {
  // Build the data string by sorting params alphabetically
  const sortedKeys = Object.keys(params).sort()
  let data = url
  for (const key of sortedKeys) {
    data += key + params[key]
  }

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha1', authToken)
    .update(data)
    .digest('base64')

  // Use timing-safe comparison
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
// ACCOUNT VERIFICATION
// =============================================================================

/**
 * Verify Twilio credentials by fetching account info
 */
export async function verifyTwilioCredentials(
  accountSid: string,
  authToken: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${TWILIO_API_BASE}/Accounts/${accountSid}.json`,
      {
        method: 'GET',
        headers: {
          Authorization: createAuthHeader(accountSid, authToken),
        },
      }
    )

    if (response.ok) {
      return { valid: true }
    }

    const error = await response.json()
    return {
      valid: false,
      error: error.message || `HTTP ${response.status}`,
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// =============================================================================
// PHONE NUMBER MANAGEMENT
// =============================================================================

/**
 * List all phone numbers in Twilio account
 */
export async function listPhoneNumbers(
  accountSid: string,
  authToken: string
): Promise<TwilioPhoneNumber[]> {
  const response = await fetch(
    `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers.json`,
    {
      method: 'GET',
      headers: {
        Authorization: createAuthHeader(accountSid, authToken),
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `Failed to list phone numbers: ${response.status}`)
  }

  const data = await response.json()
  return data.incoming_phone_numbers.map((pn: Record<string, unknown>) => ({
    sid: pn.sid,
    account_sid: pn.account_sid,
    friendly_name: pn.friendly_name,
    phone_number: pn.phone_number,
    capabilities: pn.capabilities,
    status_callback: pn.status_callback,
    sms_url: pn.sms_url,
    sms_method: pn.sms_method,
    voice_url: pn.voice_url,
    voice_method: pn.voice_method,
  }))
}

/**
 * Get phone number details by SID
 */
export async function getPhoneNumber(
  accountSid: string,
  authToken: string,
  phoneNumberSid: string
): Promise<TwilioPhoneNumber> {
  const response = await fetch(
    `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
    {
      method: 'GET',
      headers: {
        Authorization: createAuthHeader(accountSid, authToken),
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `Failed to get phone number: ${response.status}`)
  }

  const pn = await response.json()
  return {
    sid: pn.sid,
    account_sid: pn.account_sid,
    friendly_name: pn.friendly_name,
    phone_number: pn.phone_number,
    capabilities: pn.capabilities,
    status_callback: pn.status_callback,
    sms_url: pn.sms_url,
    sms_method: pn.sms_method,
    voice_url: pn.voice_url,
    voice_method: pn.voice_method,
  }
}

/**
 * Configure webhook URLs for a phone number
 */
export async function configurePhoneNumberWebhooks(
  accountSid: string,
  authToken: string,
  phoneNumberSid: string,
  webhookUrl: string
): Promise<TwilioPhoneNumber> {
  const params = new URLSearchParams({
    SmsUrl: webhookUrl,
    SmsMethod: 'POST',
    SmsFallbackUrl: webhookUrl,
    SmsFallbackMethod: 'POST',
    StatusCallback: `${webhookUrl}/status`,
  })

  const response = await fetch(
    `${TWILIO_API_BASE}/Accounts/${accountSid}/IncomingPhoneNumbers/${phoneNumberSid}.json`,
    {
      method: 'POST',
      headers: {
        Authorization: createAuthHeader(accountSid, authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `Failed to configure webhooks: ${response.status}`)
  }

  const pn = await response.json()
  return {
    sid: pn.sid,
    account_sid: pn.account_sid,
    friendly_name: pn.friendly_name,
    phone_number: pn.phone_number,
    capabilities: pn.capabilities,
    status_callback: pn.status_callback,
    sms_url: pn.sms_url,
    sms_method: pn.sms_method,
    voice_url: pn.voice_url,
    voice_method: pn.voice_method,
  }
}

// =============================================================================
// MESSAGING
// =============================================================================

/**
 * Send an SMS/MMS message
 */
export async function sendSMS(
  accountSid: string,
  authToken: string,
  request: TwilioSendMessageRequest
): Promise<TwilioMessageResponse> {
  const params = new URLSearchParams()
  params.append('To', request.To)

  // Either From or MessagingServiceSid is required
  if (request.From) {
    params.append('From', request.From)
  } else if (request.MessagingServiceSid) {
    params.append('MessagingServiceSid', request.MessagingServiceSid)
  } else {
    throw new Error('Either From or MessagingServiceSid is required')
  }

  if (request.Body) {
    params.append('Body', request.Body)
  }

  // MMS media URLs
  if (request.MediaUrl && request.MediaUrl.length > 0) {
    for (const url of request.MediaUrl) {
      params.append('MediaUrl', url)
    }
  }

  if (request.StatusCallback) {
    params.append('StatusCallback', request.StatusCallback)
  }

  if (request.MaxPrice) {
    params.append('MaxPrice', request.MaxPrice)
  }

  if (request.ValidityPeriod) {
    params.append('ValidityPeriod', request.ValidityPeriod.toString())
  }

  // Scheduled messages (requires Messaging Service)
  if (request.SendAt && request.MessagingServiceSid) {
    params.append('SendAt', request.SendAt)
    params.append('ScheduleType', request.ScheduleType || 'fixed')
  }

  const response = await fetch(
    `${TWILIO_API_BASE}/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: createAuthHeader(accountSid, authToken),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new TwilioSendError(
      error.message || `Failed to send message: ${response.status}`,
      error.code,
      error.more_info
    )
  }

  return response.json()
}

/**
 * Get message details by SID
 */
export async function getMessage(
  accountSid: string,
  authToken: string,
  messageSid: string
): Promise<TwilioMessageResponse> {
  const response = await fetch(
    `${TWILIO_API_BASE}/Accounts/${accountSid}/Messages/${messageSid}.json`,
    {
      method: 'GET',
      headers: {
        Authorization: createAuthHeader(accountSid, authToken),
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `Failed to get message: ${response.status}`)
  }

  return response.json()
}

/**
 * Get message media details
 */
export async function getMessageMedia(
  accountSid: string,
  authToken: string,
  messageSid: string
): Promise<Array<{ sid: string; content_type: string; uri: string }>> {
  const response = await fetch(
    `${TWILIO_API_BASE}/Accounts/${accountSid}/Messages/${messageSid}/Media.json`,
    {
      method: 'GET',
      headers: {
        Authorization: createAuthHeader(accountSid, authToken),
      },
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `Failed to get message media: ${response.status}`)
  }

  const data = await response.json()
  return data.media_list || []
}

// =============================================================================
// MESSAGE STATUS HELPERS
// =============================================================================

/**
 * Check if message status is final (no more updates expected)
 */
export function isFinalStatus(status: SMSMessageStatus): boolean {
  return ['delivered', 'undelivered', 'failed', 'received'].includes(status)
}

/**
 * Check if message delivery was successful
 */
export function isDeliverySuccess(status: SMSMessageStatus): boolean {
  return ['sent', 'delivered', 'received'].includes(status)
}

/**
 * Check if message delivery failed
 */
export function isDeliveryFailure(status: SMSMessageStatus): boolean {
  return ['undelivered', 'failed'].includes(status)
}

// =============================================================================
// LOOKUP API (for carrier/phone validation)
// =============================================================================

/**
 * Lookup phone number information (requires Lookup API access)
 */
export async function lookupPhoneNumber(
  accountSid: string,
  authToken: string,
  phoneNumber: string,
  options?: { type?: 'carrier' | 'caller-name' }
): Promise<{
  phone_number: string
  national_format: string
  country_code: string
  carrier?: {
    name: string
    type: 'mobile' | 'landline' | 'voip'
    error_code: string | null
  }
}> {
  let url = `https://lookups.twilio.com/v1/PhoneNumbers/${encodeURIComponent(phoneNumber)}`
  if (options?.type) {
    url += `?Type=${options.type}`
  }

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: createAuthHeader(accountSid, authToken),
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || `Lookup failed: ${response.status}`)
  }

  return response.json()
}

// =============================================================================
// ERROR CLASSES
// =============================================================================

export class TwilioSendError extends Error {
  code?: number
  moreInfo?: string

  constructor(message: string, code?: number, moreInfo?: string) {
    super(message)
    this.name = 'TwilioSendError'
    this.code = code
    this.moreInfo = moreInfo
  }
}

// =============================================================================
// MESSAGING SERVICE
// =============================================================================

/**
 * List messaging services in account
 */
export async function listMessagingServices(
  accountSid: string,
  authToken: string
): Promise<
  Array<{
    sid: string
    friendly_name: string
    inbound_request_url: string | null
    status_callback: string | null
  }>
> {
  const response = await fetch(
    `https://messaging.twilio.com/v1/Services`,
    {
      method: 'GET',
      headers: {
        Authorization: createAuthHeader(accountSid, authToken),
      },
    }
  )

  if (!response.ok) {
    // Messaging Services API might not be enabled
    if (response.status === 403) {
      return []
    }
    const error = await response.json()
    throw new Error(error.message || `Failed to list messaging services: ${response.status}`)
  }

  const data = await response.json()
  return (data.services || []).map((svc: Record<string, unknown>) => ({
    sid: svc.sid,
    friendly_name: svc.friendly_name,
    inbound_request_url: svc.inbound_request_url,
    status_callback: svc.status_callback,
  }))
}

// =============================================================================
// HELPER: Bulk Operations
// =============================================================================

/**
 * Send multiple messages (with rate limiting)
 */
export async function sendBulkSMS(
  accountSid: string,
  authToken: string,
  messages: TwilioSendMessageRequest[],
  options?: {
    rateLimit?: number // messages per second, default 10
    onProgress?: (sent: number, total: number) => void
    onError?: (error: Error, message: TwilioSendMessageRequest, index: number) => void
  }
): Promise<{
  successful: TwilioMessageResponse[]
  failed: Array<{ message: TwilioSendMessageRequest; error: Error; index: number }>
}> {
  const rateLimit = options?.rateLimit || 10
  const delay = 1000 / rateLimit // ms between messages
  const successful: TwilioMessageResponse[] = []
  const failed: Array<{ message: TwilioSendMessageRequest; error: Error; index: number }> = []

  for (let i = 0; i < messages.length; i++) {
    try {
      const result = await sendSMS(accountSid, authToken, messages[i])
      successful.push(result)
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      failed.push({ message: messages[i], error: err, index: i })
      options?.onError?.(err, messages[i], i)
    }

    options?.onProgress?.(i + 1, messages.length)

    // Rate limiting (skip delay on last message)
    if (i < messages.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return { successful, failed }
}
