import crypto from 'crypto'

/**
 * WhatsApp Webhook Signature Validator
 *
 * Implements HMAC-SHA256 signature verification for WhatsApp Cloud API webhooks.
 * This prevents webhook forgery and message injection attacks by cryptographically
 * verifying that requests actually come from WhatsApp.
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */

export interface WebhookValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validates WhatsApp webhook signature using HMAC-SHA256
 *
 * @param payload - Raw request body as string
 * @param signature - X-Hub-Signature-256 header value (format: "sha256=<hash>")
 * @param appSecret - WhatsApp app secret from environment
 * @returns Validation result with isValid flag and optional error message
 */
export function validateWhatsAppSignature(
  payload: string,
  signature: string | null,
  appSecret: string
): WebhookValidationResult {
  // Validate inputs
  if (!signature) {
    return {
      isValid: false,
      error: 'Missing X-Hub-Signature-256 header',
    }
  }

  if (!appSecret) {
    return {
      isValid: false,
      error: 'WhatsApp app secret not configured',
    }
  }

  if (!payload) {
    return {
      isValid: false,
      error: 'Empty request payload',
    }
  }

  // Parse signature header (format: "sha256=<hash>")
  const signatureParts = signature.split('=')
  if (signatureParts.length !== 2 || signatureParts[0] !== 'sha256') {
    return {
      isValid: false,
      error: 'Invalid signature format (expected: sha256=<hash>)',
    }
  }

  const receivedHash = signatureParts[1]

  // Compute expected signature
  const expectedHash = crypto
    .createHmac('sha256', appSecret)
    .update(payload, 'utf8')
    .digest('hex')

  // Constant-time comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(receivedHash, 'hex'),
    Buffer.from(expectedHash, 'hex')
  )

  if (!isValid) {
    return {
      isValid: false,
      error: 'Signature verification failed - webhook may be forged',
    }
  }

  return { isValid: true }
}

/**
 * Validates WhatsApp webhook verification challenge
 *
 * Used during initial webhook setup to verify endpoint ownership.
 * WhatsApp sends a GET request with hub.mode, hub.verify_token, and hub.challenge.
 *
 * @param mode - hub.mode parameter (should be "subscribe")
 * @param token - hub.verify_token parameter
 * @param challenge - hub.challenge parameter to echo back
 * @param expectedToken - Expected verify token from environment
 * @returns Challenge string if valid, null if invalid
 */
export function validateWebhookVerification(
  mode: string | null,
  token: string | null,
  challenge: string | null,
  expectedToken: string
): string | null {
  if (!mode || !token || !challenge) {
    return null
  }

  if (mode !== 'subscribe') {
    return null
  }

  // Use constant-time comparison to prevent timing attacks
  // This ensures token verification takes same time regardless of how many chars match
  if (!token || !expectedToken || token.length !== expectedToken.length) {
    return null
  }

  const tokenBuffer = Buffer.from(token, 'utf8')
  const expectedBuffer = Buffer.from(expectedToken, 'utf8')

  if (!crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
    return null
  }

  return challenge
}
