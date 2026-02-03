/**
 * Mobile Backend Types
 * TypeScript interfaces for mobile app support
 * Date: 2026-01-28
 */

// =============================================================================
// DATABASE ENTITY TYPES
// =============================================================================

/**
 * Device Registration - Mobile device with push tokens
 */
export interface DeviceRegistration {
  id: string
  user_id: string
  organization_id: string
  // Device info
  device_id: string
  device_name: string | null
  device_model: string | null
  device_os: DeviceOS
  device_os_version: string | null
  app_version: string | null
  // Push tokens
  fcm_token: string | null
  apns_token: string | null
  expo_push_token: string | null
  // Token management
  token_updated_at: string | null
  token_expires_at: string | null
  // Status
  is_active: boolean
  last_active_at: string
  // Notification preferences
  notifications_enabled: boolean
  notification_sound: boolean
  notification_vibrate: boolean
  quiet_hours_start: string | null // TIME format HH:MM:SS
  quiet_hours_end: string | null
  // Timestamps
  created_at: string
  updated_at: string
}

export type DeviceOS = 'ios' | 'android' | 'web'

/**
 * Push Notification Record
 */
export interface PushNotification {
  id: string
  device_registration_id: string
  user_id: string
  organization_id: string
  // Content
  title: string
  body: string
  data: Record<string, unknown>
  // Source
  source_type: PushNotificationSource
  source_id: string | null
  // Status
  status: PushNotificationStatus
  provider: PushProvider
  provider_message_id: string | null
  // Errors
  error_code: string | null
  error_message: string | null
  // Timestamps
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  created_at: string
}

export type PushNotificationSource =
  | 'message'
  | 'mention'
  | 'assignment'
  | 'system'

export type PushNotificationStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'failed'
  | 'expired'

export type PushProvider = 'fcm' | 'apns' | 'expo'

/**
 * Push Notification Queue Item
 */
export interface PushNotificationQueueItem {
  id: string
  device_registration_id: string
  title: string
  body: string
  data: Record<string, unknown>
  source_type: PushNotificationSource
  source_id: string | null
  priority: number // 1-10
  scheduled_for: string
  attempts: number
  max_attempts: number
  last_attempt_at: string | null
  last_error: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  created_at: string
  processed_at: string | null
}

/**
 * Mobile Session
 */
export interface MobileSession {
  id: string
  user_id: string
  device_registration_id: string | null
  session_token_hash: string
  refresh_token_hash: string | null
  access_token_expires_at: string
  refresh_token_expires_at: string | null
  is_active: boolean
  revoked_at: string | null
  revoked_reason: string | null
  ip_address: string | null
  user_agent: string | null
  last_activity_at: string
  created_at: string
}

/**
 * Offline Message Queue Item
 */
export interface OfflineMessageQueueItem {
  id: string
  user_id: string
  device_registration_id: string
  conversation_id: string
  message_content: string
  message_type: string
  media_url: string | null
  client_message_id: string
  sync_status: 'pending' | 'synced' | 'failed'
  server_message_id: string | null
  client_timestamp: string
  synced_at: string | null
  created_at: string
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Register Device Request
 */
export interface RegisterDeviceRequest {
  device_id: string
  device_name?: string
  device_model?: string
  device_os: DeviceOS
  device_os_version?: string
  app_version?: string
  fcm_token?: string
  apns_token?: string
  expo_push_token?: string
}

/**
 * Update Device Request
 */
export interface UpdateDeviceRequest {
  device_name?: string
  fcm_token?: string
  apns_token?: string
  expo_push_token?: string
  notifications_enabled?: boolean
  notification_sound?: boolean
  notification_vibrate?: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
}

/**
 * Device Registration Response
 */
export interface DeviceRegistrationResponse {
  success: boolean
  device?: {
    id: string
    device_id: string
    device_os: DeviceOS
    notifications_enabled: boolean
  }
  error?: string
}

/**
 * Send Push Notification Request
 */
export interface SendPushRequest {
  user_id?: string
  device_id?: string
  title: string
  body: string
  data?: Record<string, unknown>
  source_type: PushNotificationSource
  source_id?: string
  priority?: number // 1-10, default 5
}

/**
 * Send Push Notification Response
 */
export interface SendPushResponse {
  success: boolean
  notification_id?: string
  devices_sent?: number
  error?: string
}

/**
 * Sync Offline Messages Request
 */
export interface SyncOfflineMessagesRequest {
  messages: Array<{
    client_message_id: string
    conversation_id: string
    message_content: string
    message_type?: string
    media_url?: string
    client_timestamp: string
  }>
}

/**
 * Sync Offline Messages Response
 */
export interface SyncOfflineMessagesResponse {
  success: boolean
  synced: Array<{
    client_message_id: string
    server_message_id: string
    status: 'synced'
  }>
  failed: Array<{
    client_message_id: string
    error: string
  }>
}

// =============================================================================
// FIREBASE CLOUD MESSAGING TYPES
// =============================================================================

/**
 * FCM Message Payload
 */
export interface FCMMessage {
  token?: string
  tokens?: string[] // For multicast
  notification?: {
    title: string
    body: string
    image?: string
  }
  data?: Record<string, string>
  android?: FCMAndroidConfig
  apns?: FCMApnsConfig
  webpush?: FCMWebPushConfig
}

/**
 * FCM Android-specific config
 */
export interface FCMAndroidConfig {
  priority?: 'normal' | 'high'
  ttl?: string // e.g., "3600s"
  collapse_key?: string
  restricted_package_name?: string
  notification?: {
    title?: string
    body?: string
    icon?: string
    color?: string
    sound?: string
    click_action?: string
    channel_id?: string
  }
  data?: Record<string, string>
}

/**
 * FCM APNs-specific config
 */
export interface FCMApnsConfig {
  headers?: Record<string, string>
  payload?: {
    aps: {
      alert?: {
        title?: string
        subtitle?: string
        body?: string
      }
      badge?: number
      sound?: string
      'content-available'?: number
      'mutable-content'?: number
      category?: string
      'thread-id'?: string
    }
    [key: string]: unknown
  }
}

/**
 * FCM Web Push config
 */
export interface FCMWebPushConfig {
  headers?: Record<string, string>
  notification?: {
    title?: string
    body?: string
    icon?: string
    badge?: string
    actions?: Array<{
      action: string
      title: string
      icon?: string
    }>
  }
  data?: Record<string, string>
  fcm_options?: {
    link?: string
  }
}

/**
 * FCM Send Response
 */
export interface FCMSendResponse {
  success: boolean
  message_id?: string
  error?: {
    code: string
    message: string
  }
}

/**
 * FCM Batch Response
 */
export interface FCMBatchResponse {
  success_count: number
  failure_count: number
  responses: Array<{
    success: boolean
    message_id?: string
    error?: {
      code: string
      message: string
    }
  }>
}

// =============================================================================
// NOTIFICATION PREFERENCES
// =============================================================================

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  // Global settings
  push_enabled: boolean
  email_enabled: boolean
  // Channel settings
  new_messages: boolean
  mentions: boolean
  assignments: boolean
  system_updates: boolean
  // Schedule
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  quiet_hours_timezone: string
}

/**
 * Default notification preferences
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  push_enabled: true,
  email_enabled: true,
  new_messages: true,
  mentions: true,
  assignments: true,
  system_updates: false,
  quiet_hours_enabled: false,
  quiet_hours_start: '22:00',
  quiet_hours_end: '08:00',
  quiet_hours_timezone: 'UTC',
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Check if current time is within quiet hours
 */
export function isInQuietHours(
  start: string | null,
  end: string | null,
  timezone = 'UTC'
): boolean {
  if (!start || !end) return false

  try {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const currentTime = formatter.format(now)
    const [currentHour, currentMinute] = currentTime.split(':').map(Number)
    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)

    const currentMinutes = currentHour * 60 + currentMinute
    const startMinutes = startHour * 60 + startMinute
    const endMinutes = endHour * 60 + endMinute

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  } catch {
    return false
  }
}

/**
 * Get push priority based on source type
 */
export function getPushPriority(sourceType: PushNotificationSource): number {
  switch (sourceType) {
    case 'message':
      return 8
    case 'mention':
      return 9
    case 'assignment':
      return 7
    case 'system':
      return 5
    default:
      return 5
  }
}

/**
 * Build FCM data payload (all values must be strings)
 */
export function buildFCMDataPayload(
  data: Record<string, unknown>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined) {
      result[key] = typeof value === 'string' ? value : JSON.stringify(value)
    }
  }
  return result
}
