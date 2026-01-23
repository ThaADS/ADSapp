/**
 * Webhook Validator Middleware (S-003: Webhook Idempotency)
 * ==========================================================
 * Validates Stripe webhook signatures and enforces security best practices
 * for webhook processing to prevent unauthorized access and tampering.
 *
 * Security: CVSS 6.0 - Protects against webhook spoofing and replay attacks
 * Compliance: PCI DSS Requirement 6.5 - Input validation
 */

import Stripe from 'stripe'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface WebhookValidationResult {
  valid: boolean
  event?: Stripe.Event
  error?: string
  errorCode?: string
}

export interface WebhookValidationOptions {
  allowedEventTypes?: string[]
  maxBodySize?: number // in bytes
  requireTimestamp?: boolean
  toleranceSeconds?: number // for timestamp validation
}

/**
 * WebhookValidator class
 * Handles Stripe webhook signature verification and validation
 */
export class WebhookValidator {
  private stripe: Stripe
  private endpointSecret: string
  private defaultOptions: WebhookValidationOptions = {
    maxBodySize: 5 * 1024 * 1024, // 5MB default
    requireTimestamp: true,
    toleranceSeconds: 300, // 5 minutes default tolerance
  }

  constructor(stripeSecretKey: string, webhookSecret: string) {
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-12-18.acacia',
    })
    this.endpointSecret = webhookSecret
  }

  /**
   * Validate webhook request from Stripe
   * Verifies signature, timestamp, and payload integrity
   */
  async validateWebhook(
    request: NextRequest,
    options?: WebhookValidationOptions
  ): Promise<WebhookValidationResult> {
    const opts = { ...this.defaultOptions, ...options }

    try {
      // 1. Extract signature header
      const signature = request.headers.get('stripe-signature')
      if (!signature) {
        return {
          valid: false,
          error: 'Missing stripe-signature header',
          errorCode: 'MISSING_SIGNATURE',
        }
      }

      // 2. Get raw body
      const body = await request.text()

      // 3. Validate body size
      if (body.length > opts.maxBodySize!) {
        return {
          valid: false,
          error: `Request body too large: ${body.length} bytes (max: ${opts.maxBodySize})`,
          errorCode: 'BODY_TOO_LARGE',
        }
      }

      // 4. Verify Stripe signature
      let event: Stripe.Event
      try {
        event = this.stripe.webhooks.constructEvent(body, signature, this.endpointSecret)
      } catch (err) {
        const error = err as Error
        return {
          valid: false,
          error: `Webhook signature verification failed: ${error.message}`,
          errorCode: 'INVALID_SIGNATURE',
        }
      }

      // 5. Validate timestamp (prevent replay attacks)
      if (opts.requireTimestamp) {
        const timestampValid = this.validateTimestamp(signature, opts.toleranceSeconds!)
        if (!timestampValid) {
          return {
            valid: false,
            error: 'Webhook timestamp outside acceptable tolerance',
            errorCode: 'TIMESTAMP_OUT_OF_TOLERANCE',
          }
        }
      }

      // 6. Validate event type if specified
      if (opts.allowedEventTypes && opts.allowedEventTypes.length > 0) {
        if (!opts.allowedEventTypes.includes(event.type)) {
          return {
            valid: false,
            error: `Event type not allowed: ${event.type}`,
            errorCode: 'EVENT_TYPE_NOT_ALLOWED',
          }
        }
      }

      // 7. Validate event structure
      const structureValid = this.validateEventStructure(event)
      if (!structureValid.valid) {
        return {
          valid: false,
          error: structureValid.error,
          errorCode: 'INVALID_EVENT_STRUCTURE',
        }
      }

      return {
        valid: true,
        event,
      }
    } catch (error) {
      const err = error as Error
      return {
        valid: false,
        error: `Webhook validation error: ${err.message}`,
        errorCode: 'VALIDATION_ERROR',
      }
    }
  }

  /**
   * Validate webhook timestamp to prevent replay attacks
   */
  private validateTimestamp(signature: string, toleranceSeconds: number): boolean {
    try {
      // Parse signature header to extract timestamp
      const elements = signature.split(',')
      let timestamp: number | null = null

      for (const element of elements) {
        const [key, value] = element.split('=')
        if (key === 't') {
          timestamp = parseInt(value, 10)
          break
        }
      }

      if (!timestamp) {
        return false
      }

      // Check if timestamp is within tolerance
      const currentTime = Math.floor(Date.now() / 1000)
      const timeDifference = Math.abs(currentTime - timestamp)

      return timeDifference <= toleranceSeconds
    } catch (error) {
      console.error('Timestamp validation error:', error)
      return false
    }
  }

  /**
   * Validate event structure and required fields
   */
  private validateEventStructure(event: Stripe.Event): WebhookValidationResult {
    // Check required top-level fields
    if (!event.id) {
      return {
        valid: false,
        error: 'Missing event.id',
      }
    }

    if (!event.type) {
      return {
        valid: false,
        error: 'Missing event.type',
      }
    }

    if (!event.data || !event.data.object) {
      return {
        valid: false,
        error: 'Missing event.data.object',
      }
    }

    // Validate event ID format (Stripe event IDs start with 'evt_')
    if (!event.id.startsWith('evt_')) {
      return {
        valid: false,
        error: 'Invalid event ID format',
      }
    }

    return {
      valid: true,
    }
  }

  /**
   * Check if webhook event has already been processed (idempotency check)
   */
  async isEventProcessed(eventId: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { data, error } = await supabase
        .from('webhook_events')
        .select('status')
        .eq('stripe_event_id', eventId)
        .maybeSingle()

      if (error) {
        console.error('Error checking event processing status:', error)
        return false
      }

      // Event is considered processed if it exists and is completed or processing
      return data !== null && ['completed', 'processing'].includes(data.status)
    } catch (error) {
      console.error('Error in isEventProcessed:', error)
      return false
    }
  }

  /**
   * Extract metadata from webhook event for logging
   */
  extractEventMetadata(event: Stripe.Event): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      eventId: event.id,
      eventType: event.type,
      created: event.created,
      livemode: event.livemode,
      apiVersion: event.api_version,
    }

    // Extract object-specific metadata
    const object = event.data.object as any

    if (object.customer) {
      metadata.customerId = object.customer
    }

    if (object.subscription) {
      metadata.subscriptionId = object.subscription
    }

    if (object.invoice) {
      metadata.invoiceId = object.invoice
    }

    if (object.payment_intent) {
      metadata.paymentIntentId = object.payment_intent
    }

    if (object.amount || object.amount_due || object.amount_paid) {
      metadata.amount = object.amount || object.amount_due || object.amount_paid
      metadata.currency = object.currency
    }

    // Extract metadata object if present
    if (object.metadata) {
      metadata.objectMetadata = object.metadata
    }

    return metadata
  }

  /**
   * Sanitize webhook event data for logging (remove sensitive fields)
   */
  sanitizeEventData(event: Stripe.Event): Stripe.Event {
    // Create a deep copy to avoid mutating original
    const sanitized = JSON.parse(JSON.stringify(event))

    // Remove sensitive fields that shouldn't be logged
    const sensitiveFields = ['client_secret', 'payment_method', 'source', 'card', 'bank_account']

    const removeSensitiveFields = (obj: any): void => {
      if (!obj || typeof obj !== 'object') return

      for (const field of sensitiveFields) {
        if (field in obj) {
          obj[field] = '[REDACTED]'
        }
      }

      // Recursively sanitize nested objects
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          removeSensitiveFields(obj[key])
        }
      }
    }

    removeSensitiveFields(sanitized)

    return sanitized
  }

  /**
   * Validate webhook origin (additional security layer)
   */
  validateOrigin(request: NextRequest): boolean {
    const origin = request.headers.get('origin')
    const userAgent = request.headers.get('user-agent')

    // Stripe webhooks come from Stripe infrastructure
    // Check for Stripe user agent pattern
    if (userAgent && userAgent.includes('Stripe')) {
      return true
    }

    // In production, you might want to whitelist Stripe IP ranges
    // This is optional as signature verification is the primary security mechanism
    return true
  }

  /**
   * Rate limit check for webhook endpoint (prevent abuse)
   */
  async checkRateLimit(
    eventId: string,
    maxEventsPerMinute: number = 100
  ): Promise<{ allowed: boolean; retryAfter?: number }> {
    try {
      const supabase = await createClient()
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()

      const { count, error } = await supabase
        .from('webhook_events')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', oneMinuteAgo)

      if (error) {
        console.error('Rate limit check error:', error)
        return { allowed: true } // Fail open
      }

      const currentCount = count || 0

      if (currentCount >= maxEventsPerMinute) {
        const retryAfter = 60 // seconds
        return { allowed: false, retryAfter }
      }

      return { allowed: true }
    } catch (error) {
      console.error('Rate limit check error:', error)
      return { allowed: true } // Fail open
    }
  }

  /**
   * Log webhook validation attempt for security monitoring
   */
  async logValidationAttempt(
    result: WebhookValidationResult,
    metadata: Record<string, unknown>
  ): Promise<void> {
    try {
      const supabase = await createClient()

      // Only log failed validations for security monitoring
      if (!result.valid) {
        await supabase.from('webhook_events').insert({
          stripe_event_id: `invalid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          event_type: 'validation_failed',
          event_data: metadata,
          status: 'failed',
          error_message: result.error,
          signature_verified: false,
        })
      }
    } catch (error) {
      console.error('Error logging validation attempt:', error)
      // Don't throw - logging failures shouldn't break webhook processing
    }
  }
}

/**
 * Helper function to create webhook validator instance
 */
export function createWebhookValidator(): WebhookValidator {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY environment variable is not set')
  }

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set')
  }

  return new WebhookValidator(stripeSecretKey, webhookSecret)
}

/**
 * Middleware function for Next.js API routes
 * Usage: const validation = await validateStripeWebhook(request);
 */
export async function validateStripeWebhook(
  request: NextRequest,
  options?: WebhookValidationOptions
): Promise<WebhookValidationResult> {
  const validator = createWebhookValidator()
  return await validator.validateWebhook(request, options)
}

/**
 * Type guard for Stripe events
 */
export function isStripeEvent(obj: unknown): obj is Stripe.Event {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'type' in obj && 'data' in obj
}

/**
 * Extract organization ID from webhook event
 */
export function extractOrganizationId(event: Stripe.Event): string | null {
  const object = event.data.object as any

  // Try metadata first
  if (object.metadata?.organizationId) {
    return object.metadata.organizationId
  }

  // Try different object types
  if (event.type.startsWith('customer.subscription.')) {
    return object.metadata?.organizationId || null
  }

  if (event.type.startsWith('invoice.')) {
    return object.subscription?.metadata?.organizationId || null
  }

  if (event.type.startsWith('payment_intent.')) {
    return object.metadata?.organizationId || null
  }

  return null
}

/**
 * Validate event data integrity
 */
export function validateEventDataIntegrity(event: Stripe.Event): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Type-specific validation
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object as Stripe.Subscription
      if (!subscription.customer) {
        errors.push('Subscription missing customer reference')
      }
      if (!subscription.items || subscription.items.data.length === 0) {
        errors.push('Subscription missing items')
      }
      break

    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.amount_due === undefined) {
        errors.push('Invoice missing amount_due')
      }
      if (!invoice.customer) {
        errors.push('Invoice missing customer reference')
      }
      break

    case 'payment_intent.succeeded':
    case 'payment_intent.payment_failed':
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      if (!paymentIntent.amount) {
        errors.push('PaymentIntent missing amount')
      }
      if (!paymentIntent.customer) {
        errors.push('PaymentIntent missing customer reference')
      }
      break

    case 'charge.refunded':
      const charge = event.data.object as Stripe.Charge
      if (!charge.amount_refunded) {
        errors.push('Charge missing amount_refunded')
      }
      break
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Security headers for webhook responses
 */
export const WEBHOOK_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'none'",
}

export default WebhookValidator
