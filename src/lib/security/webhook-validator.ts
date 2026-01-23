/**
 * Webhook Security Validator
 * Phase 2.3: Enhanced webhook signature validation and idempotency
 *
 * Provides secure validation for incoming webhooks from:
 * - WhatsApp Business API
 * - Stripe
 * - Custom webhooks
 */

import crypto from 'crypto'
import { logger } from './logger'
import { logAuditEvent } from './audit-service'

// ============================================================================
// TYPES
// ============================================================================

export interface WebhookValidationResult {
  valid: boolean
  error?: string
  webhookId?: string
}

export interface IdempotencyResult {
  processed: boolean
  cached: boolean
  webhookId: string
}

// ============================================================================
// WHATSAPP WEBHOOK VALIDATION
// ============================================================================

/**
 * Validates WhatsApp webhook signature using HMAC-SHA256
 * Uses timing-safe comparison to prevent timing attacks
 *
 * @param rawBody - The raw request body as string
 * @param signature - The x-hub-signature-256 header value
 * @param appSecret - The WhatsApp app secret
 */
export function validateWhatsAppSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string = process.env.WHATSAPP_APP_SECRET || ''
): WebhookValidationResult {
  if (!signature) {
    logger.security('WEBHOOK_VALIDATION_FAILED', {
      provider: 'whatsapp',
      reason: 'missing_signature',
    })
    return { valid: false, error: 'Missing webhook signature' }
  }

  if (!appSecret) {
    logger.error('WhatsApp app secret not configured')
    return { valid: false, error: 'Webhook validation not configured' }
  }

  try {
    // Calculate expected signature
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex')

    // Extract provided signature (remove 'sha256=' prefix if present)
    const providedSignature = signature.replace('sha256=', '')

    // Timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    const providedBuffer = Buffer.from(providedSignature, 'hex')

    if (expectedBuffer.length !== providedBuffer.length) {
      logger.security('WEBHOOK_VALIDATION_FAILED', {
        provider: 'whatsapp',
        reason: 'signature_length_mismatch',
      })
      return { valid: false, error: 'Invalid signature format' }
    }

    const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer)

    if (!isValid) {
      logger.security('WEBHOOK_VALIDATION_FAILED', {
        provider: 'whatsapp',
        reason: 'signature_mismatch',
        expectedPrefix: expectedSignature.slice(0, 8),
        providedPrefix: providedSignature.slice(0, 8),
      })
      return { valid: false, error: 'Invalid webhook signature' }
    }

    return { valid: true }
  } catch (error) {
    logger.error('WhatsApp signature validation error', error)
    return { valid: false, error: 'Signature validation failed' }
  }
}

/**
 * Validates WhatsApp webhook verification challenge
 */
export function validateWhatsAppChallenge(
  mode: string | null,
  token: string | null,
  challenge: string | null,
  verifyToken: string = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || ''
): { valid: boolean; challenge?: string; error?: string } {
  if (mode !== 'subscribe') {
    return { valid: false, error: 'Invalid mode' }
  }

  if (!token || token !== verifyToken) {
    logger.security('WEBHOOK_CHALLENGE_FAILED', {
      provider: 'whatsapp',
      reason: 'token_mismatch',
    })
    return { valid: false, error: 'Invalid verification token' }
  }

  if (!challenge) {
    return { valid: false, error: 'Missing challenge' }
  }

  return { valid: true, challenge }
}

// ============================================================================
// STRIPE WEBHOOK VALIDATION
// ============================================================================

/**
 * Validates Stripe webhook signature
 * Uses Stripe's recommended verification approach
 *
 * @param rawBody - The raw request body as string
 * @param signature - The stripe-signature header value
 * @param webhookSecret - The Stripe webhook secret
 */
export function validateStripeSignature(
  rawBody: string,
  signature: string | null,
  webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET || ''
): WebhookValidationResult {
  if (!signature) {
    logger.security('WEBHOOK_VALIDATION_FAILED', {
      provider: 'stripe',
      reason: 'missing_signature',
    })
    return { valid: false, error: 'Missing webhook signature' }
  }

  if (!webhookSecret) {
    logger.error('Stripe webhook secret not configured')
    return { valid: false, error: 'Webhook validation not configured' }
  }

  try {
    // Parse the signature header
    const elements = signature.split(',')
    const signatureMap: Record<string, string> = {}

    for (const element of elements) {
      const [key, value] = element.split('=')
      if (key && value) {
        signatureMap[key] = value
      }
    }

    const timestamp = signatureMap['t']
    const v1Signature = signatureMap['v1']

    if (!timestamp || !v1Signature) {
      return { valid: false, error: 'Invalid signature format' }
    }

    // Check timestamp tolerance (5 minutes)
    const timestampAge = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10))
    if (timestampAge > 300) {
      logger.security('WEBHOOK_VALIDATION_FAILED', {
        provider: 'stripe',
        reason: 'timestamp_too_old',
        ageSeconds: timestampAge,
      })
      return { valid: false, error: 'Webhook timestamp too old' }
    }

    // Calculate expected signature
    const signedPayload = `${timestamp}.${rawBody}`
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex')

    // Timing-safe comparison
    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    const providedBuffer = Buffer.from(v1Signature, 'hex')

    if (expectedBuffer.length !== providedBuffer.length) {
      return { valid: false, error: 'Invalid signature' }
    }

    const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer)

    if (!isValid) {
      logger.security('WEBHOOK_VALIDATION_FAILED', {
        provider: 'stripe',
        reason: 'signature_mismatch',
      })
      return { valid: false, error: 'Invalid webhook signature' }
    }

    return { valid: true }
  } catch (error) {
    logger.error('Stripe signature validation error', error)
    return { valid: false, error: 'Signature validation failed' }
  }
}

// ============================================================================
// GENERIC WEBHOOK VALIDATION
// ============================================================================

/**
 * Validates a generic HMAC-SHA256 signed webhook
 *
 * @param rawBody - The raw request body
 * @param signature - The signature header value
 * @param secret - The shared secret for HMAC
 * @param algorithm - Hash algorithm (default: sha256)
 */
export function validateGenericWebhook(
  rawBody: string,
  signature: string | null,
  secret: string,
  algorithm: 'sha256' | 'sha1' | 'sha512' = 'sha256'
): WebhookValidationResult {
  if (!signature) {
    return { valid: false, error: 'Missing signature' }
  }

  if (!secret) {
    return { valid: false, error: 'Secret not configured' }
  }

  try {
    const expectedSignature = crypto
      .createHmac(algorithm, secret)
      .update(rawBody)
      .digest('hex')

    // Remove common prefixes
    const cleanSignature = signature
      .replace(`${algorithm}=`, '')
      .replace('sha256=', '')
      .toLowerCase()

    const expectedBuffer = Buffer.from(expectedSignature, 'hex')
    const providedBuffer = Buffer.from(cleanSignature, 'hex')

    if (expectedBuffer.length !== providedBuffer.length) {
      return { valid: false, error: 'Invalid signature format' }
    }

    const isValid = crypto.timingSafeEqual(expectedBuffer, providedBuffer)

    return isValid
      ? { valid: true }
      : { valid: false, error: 'Invalid signature' }
  } catch (error) {
    logger.error('Generic webhook validation error', error)
    return { valid: false, error: 'Validation failed' }
  }
}

// ============================================================================
// IDEMPOTENCY HANDLING
// ============================================================================

// In-memory cache for development (use Redis in production)
const processedWebhooks = new Map<string, { timestamp: number; result: string }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Generates a unique webhook ID from the payload
 */
export function generateWebhookId(
  provider: string,
  payload: unknown
): string {
  const payloadString = JSON.stringify(payload)
  const hash = crypto
    .createHash('sha256')
    .update(`${provider}:${payloadString}`)
    .digest('hex')
    .slice(0, 16)

  return `${provider}_${hash}`
}

/**
 * Checks if a webhook has already been processed (idempotency)
 * Uses Redis in production, in-memory Map for development
 *
 * @param webhookId - Unique identifier for the webhook
 * @returns Whether the webhook was already processed
 */
export async function checkIdempotency(
  webhookId: string
): Promise<{ alreadyProcessed: boolean; previousResult?: string }> {
  // Clean up old entries periodically
  const now = Date.now()
  for (const [key, value] of processedWebhooks.entries()) {
    if (now - value.timestamp > CACHE_TTL_MS) {
      processedWebhooks.delete(key)
    }
  }

  const existing = processedWebhooks.get(webhookId)
  if (existing) {
    logger.info('Webhook already processed (idempotent)', { webhookId })
    return { alreadyProcessed: true, previousResult: existing.result }
  }

  return { alreadyProcessed: false }
}

/**
 * Marks a webhook as processed for idempotency tracking
 */
export async function markWebhookProcessed(
  webhookId: string,
  result: string = 'success'
): Promise<void> {
  processedWebhooks.set(webhookId, {
    timestamp: Date.now(),
    result,
  })
}

/**
 * Process a webhook with idempotency protection
 * Wraps the processor function with deduplication logic
 */
export async function processWebhookIdempotent<T>(
  webhookId: string,
  processor: () => Promise<T>
): Promise<IdempotencyResult & { result?: T }> {
  // Check if already processed
  const { alreadyProcessed, previousResult } = await checkIdempotency(webhookId)

  if (alreadyProcessed) {
    return {
      processed: true,
      cached: true,
      webhookId,
    }
  }

  try {
    const result = await processor()
    await markWebhookProcessed(webhookId, 'success')

    return {
      processed: true,
      cached: false,
      webhookId,
      result,
    }
  } catch (error) {
    // Don't mark as processed if it failed - allow retry
    logger.error('Webhook processing failed', error, { webhookId })
    throw error
  }
}

// ============================================================================
// AUDIT LOGGING FOR WEBHOOKS
// ============================================================================

/**
 * Logs webhook receipt for audit trail
 */
export async function auditWebhookReceived(
  provider: string,
  eventType: string,
  webhookId: string,
  organizationId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logAuditEvent({
    eventType: 'RECORD_CREATED',
    eventCategory: 'data_access',
    action: `webhook_${provider}_${eventType}`,
    organizationId,
    resourceType: 'webhook',
    resourceId: webhookId,
    actionResult: 'success',
    metadata: {
      provider,
      eventType,
      ...metadata,
    },
  })
}

/**
 * Logs webhook validation failure for security monitoring
 */
export async function auditWebhookValidationFailed(
  provider: string,
  reason: string,
  ipAddress?: string
): Promise<void> {
  await logAuditEvent({
    eventType: 'ACCESS_DENIED',
    eventCategory: 'authentication',
    action: 'webhook_validation',
    actionResult: 'denied',
    ipAddress,
    metadata: {
      provider,
      reason,
    },
  })
}

export default {
  validateWhatsAppSignature,
  validateWhatsAppChallenge,
  validateStripeSignature,
  validateGenericWebhook,
  generateWebhookId,
  checkIdempotency,
  markWebhookProcessed,
  processWebhookIdempotent,
  auditWebhookReceived,
  auditWebhookValidationFailed,
}
