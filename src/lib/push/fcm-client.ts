/**
 * Firebase Cloud Messaging Client
 * Send push notifications via FCM HTTP v1 API
 * Date: 2026-01-28
 */

import {
  FCMMessage,
  FCMSendResponse,
  FCMBatchResponse,
  buildFCMDataPayload,
} from '@/types/mobile'

// =============================================================================
// CONFIGURATION
// =============================================================================

const FCM_API_BASE = 'https://fcm.googleapis.com/v1'

// Service account credentials (should be in env vars)
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID
const FIREBASE_SERVICE_ACCOUNT_EMAIL = process.env.FIREBASE_SERVICE_ACCOUNT_EMAIL
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

// =============================================================================
// ACCESS TOKEN MANAGEMENT
// =============================================================================

interface AccessToken {
  token: string
  expiresAt: number
}

let cachedAccessToken: AccessToken | null = null

/**
 * Get OAuth 2.0 access token for FCM API
 * Uses JWT to authenticate as service account
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedAccessToken.token
  }

  if (!FIREBASE_SERVICE_ACCOUNT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error('Firebase service account credentials not configured')
  }

  // Create JWT
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: FIREBASE_SERVICE_ACCOUNT_EMAIL,
    sub: FIREBASE_SERVICE_ACCOUNT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // 1 hour
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }

  // Base64URL encode
  const base64UrlEncode = (obj: object): string => {
    const json = JSON.stringify(obj)
    const base64 = Buffer.from(json).toString('base64')
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  const headerEncoded = base64UrlEncode(header)
  const payloadEncoded = base64UrlEncode(payload)
  const signatureInput = `${headerEncoded}.${payloadEncoded}`

  // Sign with private key
  const crypto = await import('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(FIREBASE_PRIVATE_KEY, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const jwt = `${signatureInput}.${signature}`

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get FCM access token: ${error}`)
  }

  const data = await response.json()
  cachedAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // Buffer 60s
  }

  return cachedAccessToken.token
}

// =============================================================================
// SEND FUNCTIONS
// =============================================================================

/**
 * Send a push notification to a single device
 */
export async function sendPushNotification(
  message: FCMMessage
): Promise<FCMSendResponse> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error('Firebase project ID not configured')
  }

  const accessToken = await getAccessToken()

  // Build FCM v1 message
  const fcmPayload = {
    message: {
      token: message.token,
      notification: message.notification,
      data: message.data ? buildFCMDataPayload(message.data as Record<string, unknown>) : undefined,
      android: message.android,
      apns: message.apns,
      webpush: message.webpush,
    },
  }

  const response = await fetch(
    `${FCM_API_BASE}/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    }
  )

  if (response.ok) {
    const data = await response.json()
    return {
      success: true,
      message_id: data.name,
    }
  }

  const error = await response.json()
  return {
    success: false,
    error: {
      code: error.error?.code || String(response.status),
      message: error.error?.message || 'Unknown error',
    },
  }
}

/**
 * Send push notifications to multiple devices
 * Uses batch requests for efficiency
 */
export async function sendPushNotificationBatch(
  tokens: string[],
  notification: FCMMessage['notification'],
  data?: Record<string, string>,
  options?: {
    android?: FCMMessage['android']
    apns?: FCMMessage['apns']
  }
): Promise<FCMBatchResponse> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error('Firebase project ID not configured')
  }

  if (tokens.length === 0) {
    return { success_count: 0, failure_count: 0, responses: [] }
  }

  // FCM v1 API doesn't support multicast directly
  // We need to send individual requests or use topic messaging
  // For now, we'll send in parallel with rate limiting

  const accessToken = await getAccessToken()
  const results: FCMBatchResponse['responses'] = []
  const batchSize = 500 // FCM recommends max 500 per batch

  for (let i = 0; i < tokens.length; i += batchSize) {
    const batch = tokens.slice(i, i + batchSize)

    const promises = batch.map(async (token) => {
      const fcmPayload = {
        message: {
          token,
          notification,
          data,
          android: options?.android,
          apns: options?.apns,
        },
      }

      try {
        const response = await fetch(
          `${FCM_API_BASE}/projects/${FIREBASE_PROJECT_ID}/messages:send`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(fcmPayload),
          }
        )

        if (response.ok) {
          const data = await response.json()
          return { success: true, message_id: data.name }
        }

        const error = await response.json()
        return {
          success: false,
          error: {
            code: error.error?.code || String(response.status),
            message: error.error?.message || 'Unknown error',
          },
        }
      } catch (error) {
        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        }
      }
    })

    const batchResults = await Promise.all(promises)
    results.push(...batchResults)

    // Rate limit: wait 100ms between batches
    if (i + batchSize < tokens.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return {
    success_count: results.filter((r) => r.success).length,
    failure_count: results.filter((r) => !r.success).length,
    responses: results,
  }
}

/**
 * Send to topic (all subscribers)
 */
export async function sendToTopic(
  topic: string,
  notification: FCMMessage['notification'],
  data?: Record<string, string>
): Promise<FCMSendResponse> {
  if (!FIREBASE_PROJECT_ID) {
    throw new Error('Firebase project ID not configured')
  }

  const accessToken = await getAccessToken()

  const fcmPayload = {
    message: {
      topic,
      notification,
      data,
    },
  }

  const response = await fetch(
    `${FCM_API_BASE}/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fcmPayload),
    }
  )

  if (response.ok) {
    const data = await response.json()
    return {
      success: true,
      message_id: data.name,
    }
  }

  const error = await response.json()
  return {
    success: false,
    error: {
      code: error.error?.code || String(response.status),
      message: error.error?.message || 'Unknown error',
    },
  }
}

/**
 * Subscribe device to topic
 */
export async function subscribeToTopic(
  tokens: string[],
  topic: string
): Promise<{ success_count: number; failure_count: number }> {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `https://iid.googleapis.com/iid/v1:batchAdd`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: `/topics/${topic}`,
        registration_tokens: tokens,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to subscribe to topic: ${response.status}`)
  }

  const data = await response.json()
  const failureCount = (data.results || []).filter(
    (r: { error?: string }) => r.error
  ).length

  return {
    success_count: tokens.length - failureCount,
    failure_count: failureCount,
  }
}

/**
 * Unsubscribe device from topic
 */
export async function unsubscribeFromTopic(
  tokens: string[],
  topic: string
): Promise<{ success_count: number; failure_count: number }> {
  const accessToken = await getAccessToken()

  const response = await fetch(
    `https://iid.googleapis.com/iid/v1:batchRemove`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: `/topics/${topic}`,
        registration_tokens: tokens,
      }),
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to unsubscribe from topic: ${response.status}`)
  }

  const data = await response.json()
  const failureCount = (data.results || []).filter(
    (r: { error?: string }) => r.error
  ).length

  return {
    success_count: tokens.length - failureCount,
    failure_count: failureCount,
  }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Check if FCM error indicates token is invalid/expired
 */
export function isTokenInvalid(errorCode: string): boolean {
  const invalidTokenCodes = [
    'UNREGISTERED',
    'INVALID_ARGUMENT',
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
  ]
  return invalidTokenCodes.includes(errorCode)
}

/**
 * Check if FCM error is retryable
 */
export function isRetryableError(errorCode: string): boolean {
  const retryableCodes = [
    'UNAVAILABLE',
    'INTERNAL',
    'QUOTA_EXCEEDED',
    'messaging/server-unavailable',
    'messaging/internal-error',
  ]
  return retryableCodes.includes(errorCode)
}
