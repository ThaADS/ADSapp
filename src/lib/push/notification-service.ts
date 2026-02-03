/**
 * Push Notification Service
 * Handles sending push notifications to mobile devices
 * Date: 2026-01-28
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  DeviceRegistration,
  PushNotificationSource,
  SendPushRequest,
  SendPushResponse,
  isInQuietHours,
  getPushPriority,
  buildFCMDataPayload,
} from '@/types/mobile'
import {
  sendPushNotification,
  sendPushNotificationBatch,
  isTokenInvalid,
} from './fcm-client'

// =============================================================================
// NOTIFICATION SERVICE
// =============================================================================

/**
 * Send push notification to a user's devices
 */
export async function sendUserPushNotification(
  request: SendPushRequest
): Promise<SendPushResponse> {
  const supabase = createServiceRoleClient()

  try {
    // Find target devices
    let query = supabase
      .from('device_registrations')
      .select('*')
      .eq('is_active', true)
      .eq('notifications_enabled', true)

    if (request.user_id) {
      query = query.eq('user_id', request.user_id)
    } else if (request.device_id) {
      query = query.eq('device_id', request.device_id)
    } else {
      return { success: false, error: 'Either user_id or device_id is required' }
    }

    const { data: devices, error: devicesError } = await query

    if (devicesError) {
      console.error('Failed to fetch devices:', devicesError)
      return { success: false, error: 'Failed to fetch devices' }
    }

    if (!devices || devices.length === 0) {
      return { success: true, devices_sent: 0 }
    }

    // Filter out devices in quiet hours
    const activeDevices = (devices as DeviceRegistration[]).filter((device) => {
      if (!device.notifications_enabled) return false

      return !isInQuietHours(
        device.quiet_hours_start,
        device.quiet_hours_end
      )
    })

    if (activeDevices.length === 0) {
      return { success: true, devices_sent: 0 }
    }

    // Get FCM tokens
    const fcmTokens = activeDevices
      .filter((d) => d.fcm_token)
      .map((d) => d.fcm_token!)

    if (fcmTokens.length === 0) {
      return { success: true, devices_sent: 0 }
    }

    // Determine priority
    const priority = request.priority ?? getPushPriority(request.source_type)

    // Build data payload
    const dataPayload = {
      ...buildFCMDataPayload(request.data || {}),
      source_type: request.source_type,
      source_id: request.source_id || '',
      priority: String(priority),
    }

    // Send notifications
    const result = await sendPushNotificationBatch(
      fcmTokens,
      {
        title: request.title,
        body: request.body,
      },
      dataPayload,
      {
        android: {
          priority: priority >= 7 ? 'high' : 'normal',
          notification: {
            sound: 'default',
            channel_id: request.source_type === 'message' ? 'messages' : 'general',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              'content-available': 1,
            },
          },
        },
      }
    )

    // Store notification records
    const notificationRecords = activeDevices.map((device, index) => ({
      device_registration_id: device.id,
      user_id: device.user_id,
      organization_id: device.organization_id,
      title: request.title,
      body: request.body,
      data: request.data || {},
      source_type: request.source_type,
      source_id: request.source_id || null,
      status: result.responses[index]?.success ? 'sent' : 'failed',
      provider: 'fcm' as const,
      provider_message_id: result.responses[index]?.message_id || null,
      error_code: result.responses[index]?.error?.code || null,
      error_message: result.responses[index]?.error?.message || null,
      sent_at: result.responses[index]?.success ? new Date().toISOString() : null,
    }))

    await supabase.from('push_notifications').insert(notificationRecords)

    // Handle invalid tokens (mark devices as inactive)
    const invalidTokenDevices = result.responses
      .map((r, i) => ({
        response: r,
        device: activeDevices[i],
      }))
      .filter(({ response }) => response.error && isTokenInvalid(response.error.code))

    if (invalidTokenDevices.length > 0) {
      const invalidDeviceIds = invalidTokenDevices.map((d) => d.device.id)
      await supabase
        .from('device_registrations')
        .update({ is_active: false })
        .in('id', invalidDeviceIds)
    }

    return {
      success: true,
      devices_sent: result.success_count,
    }
  } catch (error) {
    console.error('Push notification error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send push notification to all users in an organization
 */
export async function sendOrganizationPushNotification(
  organizationId: string,
  title: string,
  body: string,
  sourceType: PushNotificationSource,
  data?: Record<string, unknown>
): Promise<SendPushResponse> {
  const supabase = createServiceRoleClient()

  try {
    // Get all active devices in org
    const { data: devices, error } = await supabase
      .from('device_registrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .eq('notifications_enabled', true)

    if (error) {
      return { success: false, error: 'Failed to fetch devices' }
    }

    if (!devices || devices.length === 0) {
      return { success: true, devices_sent: 0 }
    }

    // Filter and get tokens
    const fcmTokens = (devices as DeviceRegistration[])
      .filter((d) => d.fcm_token && !isInQuietHours(d.quiet_hours_start, d.quiet_hours_end))
      .map((d) => d.fcm_token!)

    if (fcmTokens.length === 0) {
      return { success: true, devices_sent: 0 }
    }

    // Send batch notification
    const result = await sendPushNotificationBatch(
      fcmTokens,
      { title, body },
      buildFCMDataPayload({
        ...data,
        source_type: sourceType,
      })
    )

    return {
      success: true,
      devices_sent: result.success_count,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send push notification for new message
 */
export async function sendNewMessageNotification(
  userId: string,
  conversationId: string,
  senderName: string,
  messagePreview: string
): Promise<SendPushResponse> {
  return sendUserPushNotification({
    user_id: userId,
    title: senderName,
    body: messagePreview.length > 100 ? messagePreview.slice(0, 97) + '...' : messagePreview,
    source_type: 'message',
    source_id: conversationId,
    data: {
      conversation_id: conversationId,
      action: 'open_conversation',
    },
    priority: 8,
  })
}

/**
 * Send push notification for mention
 */
export async function sendMentionNotification(
  userId: string,
  mentionedByName: string,
  conversationId: string,
  notePreview: string
): Promise<SendPushResponse> {
  return sendUserPushNotification({
    user_id: userId,
    title: `${mentionedByName} mentioned you`,
    body: notePreview.length > 100 ? notePreview.slice(0, 97) + '...' : notePreview,
    source_type: 'mention',
    source_id: conversationId,
    data: {
      conversation_id: conversationId,
      action: 'open_conversation_notes',
    },
    priority: 9,
  })
}

/**
 * Send push notification for conversation assignment
 */
export async function sendAssignmentNotification(
  userId: string,
  assignedByName: string,
  conversationId: string,
  contactName: string
): Promise<SendPushResponse> {
  return sendUserPushNotification({
    user_id: userId,
    title: 'New assignment',
    body: `${assignedByName} assigned you to ${contactName}`,
    source_type: 'assignment',
    source_id: conversationId,
    data: {
      conversation_id: conversationId,
      action: 'open_conversation',
    },
    priority: 7,
  })
}

// =============================================================================
// QUEUE PROCESSING
// =============================================================================

/**
 * Process pending push notifications from queue
 */
export async function processPushQueue(limit = 100): Promise<{
  processed: number
  failed: number
}> {
  const supabase = createServiceRoleClient()

  // Get pending queue items
  const { data: queueItems, error } = await supabase
    .from('push_notification_queue')
    .select('*, device_registrations!inner(*)')
    .eq('status', 'pending')
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', 3)
    .order('priority', { ascending: false })
    .order('scheduled_for', { ascending: true })
    .limit(limit)

  if (error || !queueItems || queueItems.length === 0) {
    return { processed: 0, failed: 0 }
  }

  let processed = 0
  let failed = 0

  for (const item of queueItems) {
    // Mark as processing
    await supabase
      .from('push_notification_queue')
      .update({
        status: 'processing',
        last_attempt_at: new Date().toISOString(),
        attempts: item.attempts + 1,
      })
      .eq('id', item.id)

    try {
      const device = item.device_registrations as DeviceRegistration

      if (!device.fcm_token) {
        throw new Error('No FCM token')
      }

      const result = await sendPushNotification({
        token: device.fcm_token,
        notification: {
          title: item.title,
          body: item.body,
        },
        data: buildFCMDataPayload(item.data || {}),
      })

      if (result.success) {
        await supabase
          .from('push_notification_queue')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
          })
          .eq('id', item.id)
        processed++
      } else {
        throw new Error(result.error?.message || 'Send failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      if (item.attempts + 1 >= item.max_attempts) {
        await supabase
          .from('push_notification_queue')
          .update({
            status: 'failed',
            last_error: errorMessage,
          })
          .eq('id', item.id)
        failed++
      } else {
        await supabase
          .from('push_notification_queue')
          .update({
            status: 'pending',
            last_error: errorMessage,
            // Exponential backoff: 1min, 5min, 15min
            scheduled_for: new Date(
              Date.now() + Math.pow(5, item.attempts + 1) * 60 * 1000
            ).toISOString(),
          })
          .eq('id', item.id)
      }
    }
  }

  return { processed, failed }
}
