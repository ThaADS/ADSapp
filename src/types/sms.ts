/**
 * SMS Channel Types
 * TypeScript interfaces for Twilio SMS integration
 * Date: 2026-01-28
 */

// =============================================================================
// DATABASE ENTITY TYPES
// =============================================================================

/**
 * SMS Connection - Twilio account configuration per organization
 */
export interface SMSConnection {
  id: string
  organization_id: string
  // Twilio credentials
  twilio_account_sid: string
  twilio_auth_token_hash: string
  // Phone number configuration
  phone_number: string // E.164 format
  phone_number_sid: string
  friendly_name: string | null
  // Capabilities
  sms_enabled: boolean
  mms_enabled: boolean
  voice_enabled: boolean
  // Messaging service
  messaging_service_sid: string | null
  // Status
  is_active: boolean
  webhook_configured: boolean
  last_verified_at: string | null
  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * SMS Conversation - Thread with a contact
 */
export interface SMSConversation {
  id: string
  sms_connection_id: string
  organization_id: string
  // Remote party
  remote_phone_number: string
  remote_name: string | null
  remote_country: string | null
  remote_carrier: string | null
  // State
  last_message_at: string
  unread_count: number
  is_active: boolean
  // Opt-out
  opted_out: boolean
  opted_out_at: string | null
  opt_out_keyword: string | null
  // Links
  conversation_id: string | null
  contact_id: string | null
  assigned_to: string | null
  // Timestamps
  created_at: string
  updated_at: string
}

/**
 * SMS Message - Individual message
 */
export interface SMSMessage {
  id: string
  sms_conversation_id: string
  // Twilio identifiers
  twilio_message_sid: string
  twilio_account_sid: string
  // Direction and parties
  direction: 'inbound' | 'outbound'
  from_number: string
  to_number: string
  // Content
  body: string | null
  num_segments: number
  // MMS
  num_media: number
  media_urls: string[] | null
  media_content_types: string[] | null
  // Status
  status: SMSMessageStatus
  error_code: string | null
  error_message: string | null
  // Pricing
  price_cents: number | null
  price_unit: string
  // Timestamps
  twilio_created_at: string
  sent_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
}

export type SMSMessageStatus =
  | 'queued'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'undelivered'
  | 'failed'
  | 'received'

/**
 * SMS Opt-Out Record
 */
export interface SMSOptOut {
  id: string
  organization_id: string
  phone_number: string
  keyword: string
  opted_out_at: string
  opted_in_at: string | null
  opt_in_keyword: string | null
  source_message_sid: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * SMS Template
 */
export interface SMSTemplate {
  id: string
  organization_id: string
  name: string
  description: string | null
  body: string
  variables: SMSTemplateVariable[]
  category: string | null
  tags: string[]
  use_count: number
  last_used_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface SMSTemplateVariable {
  name: string
  required: boolean
  default: string
}

// =============================================================================
// TWILIO API TYPES
// =============================================================================

/**
 * Twilio incoming SMS webhook payload
 */
export interface TwilioIncomingSMS {
  MessageSid: string
  SmsSid: string
  AccountSid: string
  MessagingServiceSid?: string
  From: string
  To: string
  Body: string
  NumMedia: string
  NumSegments: string
  // Sender location (if available)
  FromCity?: string
  FromState?: string
  FromZip?: string
  FromCountry?: string
  // Recipient location
  ToCity?: string
  ToState?: string
  ToZip?: string
  ToCountry?: string
  // API version
  ApiVersion: string
  // Media (if MMS)
  MediaContentType0?: string
  MediaUrl0?: string
  MediaContentType1?: string
  MediaUrl1?: string
  // ... up to MediaUrl9
  [key: string]: string | undefined
}

/**
 * Twilio status callback webhook payload
 */
export interface TwilioStatusCallback {
  MessageSid: string
  SmsSid: string
  MessageStatus: SMSMessageStatus
  AccountSid: string
  From: string
  To: string
  ApiVersion: string
  // Error info (if failed)
  ErrorCode?: string
  ErrorMessage?: string
  // Delivery info
  ChannelToAddress?: string
  ChannelPrefix?: string
  // Additional metadata
  SmsStatus?: string
  RawDlrDoneDate?: string
}

/**
 * Twilio Send Message Request
 */
export interface TwilioSendMessageRequest {
  To: string
  From?: string
  MessagingServiceSid?: string
  Body?: string
  MediaUrl?: string[]
  StatusCallback?: string
  MaxPrice?: string
  ValidityPeriod?: number
  // Scheduling (requires Messaging Service)
  SendAt?: string
  ScheduleType?: 'fixed'
}

/**
 * Twilio Message Response
 */
export interface TwilioMessageResponse {
  account_sid: string
  api_version: string
  body: string | null
  date_created: string
  date_sent: string | null
  date_updated: string
  direction: 'inbound' | 'outbound-api' | 'outbound-call' | 'outbound-reply'
  error_code: number | null
  error_message: string | null
  from: string
  messaging_service_sid: string | null
  num_media: string
  num_segments: string
  price: string | null
  price_unit: string
  sid: string
  status: SMSMessageStatus
  to: string
  uri: string
}

/**
 * Twilio Phone Number Info
 */
export interface TwilioPhoneNumber {
  sid: string
  account_sid: string
  friendly_name: string
  phone_number: string // E.164
  capabilities: {
    voice: boolean
    sms: boolean
    mms: boolean
    fax: boolean
  }
  status_callback: string | null
  sms_url: string | null
  sms_method: string | null
  voice_url: string | null
  voice_method: string | null
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Connect SMS Request
 */
export interface ConnectSMSRequest {
  twilio_account_sid: string
  twilio_auth_token: string
  phone_number_sid: string
  messaging_service_sid?: string
}

/**
 * Send SMS Request
 */
export interface SendSMSRequest {
  to: string // E.164 format
  body?: string
  mediaUrl?: string[]
  template_id?: string
  template_variables?: Record<string, string>
}

/**
 * Send SMS Response
 */
export interface SendSMSResponse {
  success: boolean
  message_id?: string
  twilio_sid?: string
  error?: string
  error_code?: string
}

/**
 * SMS Connection Status
 */
export interface SMSConnectionStatus {
  connected: boolean
  connection?: {
    id: string
    phone_number: string
    friendly_name: string | null
    sms_enabled: boolean
    mms_enabled: boolean
    webhook_configured: boolean
    last_verified_at: string | null
  }
  error?: string
}

// =============================================================================
// OPT-OUT TYPES
// =============================================================================

/**
 * Standard opt-out keywords per CTIA guidelines
 */
export const OPT_OUT_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'] as const
export type OptOutKeyword = typeof OPT_OUT_KEYWORDS[number]

/**
 * Standard opt-in keywords
 */
export const OPT_IN_KEYWORDS = ['START', 'YES', 'UNSTOP'] as const
export type OptInKeyword = typeof OPT_IN_KEYWORDS[number]

/**
 * Help keywords
 */
export const HELP_KEYWORDS = ['HELP', 'INFO'] as const
export type HelpKeyword = typeof HELP_KEYWORDS[number]

/**
 * Opt-out check result
 */
export interface OptOutCheckResult {
  opted_out: boolean
  opted_out_at?: string
  keyword?: string
}

// =============================================================================
// TEMPLATE TYPES
// =============================================================================

/**
 * Create SMS Template Request
 */
export interface CreateSMSTemplateRequest {
  name: string
  description?: string
  body: string
  variables?: SMSTemplateVariable[]
  category?: string
  tags?: string[]
}

/**
 * Update SMS Template Request
 */
export interface UpdateSMSTemplateRequest {
  name?: string
  description?: string
  body?: string
  variables?: SMSTemplateVariable[]
  category?: string
  tags?: string[]
  is_active?: boolean
}

/**
 * Rendered template result
 */
export interface RenderedTemplate {
  body: string
  missing_variables: string[]
  template_id: string
}

// =============================================================================
// WEBHOOK TYPES
// =============================================================================

/**
 * Webhook event record
 */
export interface SMSWebhookEvent {
  id: string
  sms_connection_id: string | null
  message_sid: string
  event_type: 'message' | 'status'
  payload_hash: string | null
  processed_at: string | null
  status: 'pending' | 'processed' | 'failed'
  error_message: string | null
  created_at: string
}

/**
 * Webhook processing result
 */
export interface WebhookProcessingResult {
  success: boolean
  message_id?: string
  conversation_id?: string
  is_duplicate?: boolean
  error?: string
}

// =============================================================================
// CHANNEL ADAPTER TYPES
// =============================================================================

/**
 * SMS Channel Configuration
 */
export interface SMSChannelConfig {
  twilio_account_sid: string
  twilio_auth_token: string
  phone_number: string
  phone_number_sid: string
  messaging_service_sid?: string
  webhook_url: string
}

/**
 * SMS Message for sending via adapter
 */
export interface SMSOutboundMessage {
  to: string
  body?: string
  mediaUrl?: string[]
}

/**
 * MMS Media attachment
 */
export interface MMSMedia {
  url: string
  contentType: string
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Parse media from Twilio webhook payload
 */
export function parseMediaFromWebhook(payload: TwilioIncomingSMS): MMSMedia[] {
  const media: MMSMedia[] = []
  const numMedia = parseInt(payload.NumMedia || '0', 10)

  for (let i = 0; i < numMedia && i < 10; i++) {
    const url = payload[`MediaUrl${i}`]
    const contentType = payload[`MediaContentType${i}`]
    if (url && contentType) {
      media.push({ url, contentType })
    }
  }

  return media
}

/**
 * Check if text matches opt-out keyword
 */
export function isOptOutKeyword(text: string): boolean {
  const normalized = text.trim().toUpperCase()
  return OPT_OUT_KEYWORDS.includes(normalized as OptOutKeyword)
}

/**
 * Check if text matches opt-in keyword
 */
export function isOptInKeyword(text: string): boolean {
  const normalized = text.trim().toUpperCase()
  return OPT_IN_KEYWORDS.includes(normalized as OptInKeyword)
}

/**
 * Check if text matches help keyword
 */
export function isHelpKeyword(text: string): boolean {
  const normalized = text.trim().toUpperCase()
  return HELP_KEYWORDS.includes(normalized as HelpKeyword)
}

/**
 * Validate E.164 phone number format
 */
export function isValidE164(phoneNumber: string): boolean {
  // E.164: + followed by 1-15 digits
  return /^\+[1-9]\d{1,14}$/.test(phoneNumber)
}

/**
 * Normalize phone number to E.164 format
 */
export function normalizeToE164(phoneNumber: string, defaultCountryCode = '1'): string {
  // Remove all non-digit characters except leading +
  let cleaned = phoneNumber.replace(/[^\d+]/g, '')

  // If no +, assume US/Canada
  if (!cleaned.startsWith('+')) {
    // Remove leading 1 if present (US country code)
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      cleaned = '+' + cleaned
    } else if (cleaned.length === 10) {
      // 10-digit US number
      cleaned = '+' + defaultCountryCode + cleaned
    } else {
      cleaned = '+' + cleaned
    }
  }

  return cleaned
}
