/**
 * External API Call Tracing
 *
 * Instruments external API calls (WhatsApp, Stripe) with distributed tracing
 */

import { traceWhatsAppCall, traceStripeCall, traceExternalCall } from './middleware'
import {
  recordWhatsAppApiCall,
  recordWhatsAppError,
  recordWhatsAppMessage,
  MetricAttributes,
} from './metrics'

/**
 * Trace WhatsApp message sending
 */
export async function traceSendWhatsAppMessage<T>(
  to: string,
  fn: () => Promise<T>,
  organizationId?: string
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await traceWhatsAppCall('send_message', fn, {
      'whatsapp.recipient': to,
      'organization.id': organizationId,
    })

    const duration = Date.now() - startTime
    recordWhatsAppApiCall(duration, {
      operation: 'send_message',
      organizationId,
    })
    recordWhatsAppMessage('sent', { organizationId })

    return result
  } catch (error) {
    const duration = Date.now() - startTime
    recordWhatsAppApiCall(duration, {
      operation: 'send_message',
      organizationId,
      errorType: error instanceof Error ? error.name : 'UnknownError',
    })
    recordWhatsAppError({
      operation: 'send_message',
      organizationId,
      errorType: error instanceof Error ? error.name : 'UnknownError',
    })
    throw error
  }
}

/**
 * Trace WhatsApp webhook processing
 */
export async function traceWhatsAppWebhook<T>(
  eventType: string,
  fn: () => Promise<T>,
  organizationId?: string
): Promise<T> {
  return traceWhatsAppCall('webhook', fn, {
    'whatsapp.event_type': eventType,
    'organization.id': organizationId,
  })
}

/**
 * Trace WhatsApp media download
 */
export async function traceWhatsAppMediaDownload<T>(
  mediaId: string,
  fn: () => Promise<T>,
  organizationId?: string
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await traceWhatsAppCall('download_media', fn, {
      'whatsapp.media_id': mediaId,
      'organization.id': organizationId,
    })

    const duration = Date.now() - startTime
    recordWhatsAppApiCall(duration, {
      operation: 'download_media',
      organizationId,
    })

    return result
  } catch (error) {
    const duration = Date.now() - startTime
    recordWhatsAppApiCall(duration, {
      operation: 'download_media',
      organizationId,
      errorType: error instanceof Error ? error.name : 'UnknownError',
    })
    recordWhatsAppError({
      operation: 'download_media',
      organizationId,
      errorType: error instanceof Error ? error.name : 'UnknownError',
    })
    throw error
  }
}

/**
 * Trace Stripe checkout session creation
 */
export async function traceStripeCheckout<T>(
  priceId: string,
  fn: () => Promise<T>,
  organizationId?: string
): Promise<T> {
  return traceStripeCall('create_checkout', fn, {
    'stripe.price_id': priceId,
    'organization.id': organizationId,
  })
}

/**
 * Trace Stripe subscription management
 */
export async function traceStripeSubscription<T>(
  operation: 'create' | 'update' | 'cancel',
  subscriptionId: string,
  fn: () => Promise<T>,
  organizationId?: string
): Promise<T> {
  return traceStripeCall(`${operation}_subscription`, fn, {
    'stripe.subscription_id': subscriptionId,
    'organization.id': organizationId,
  })
}

/**
 * Trace Stripe webhook processing
 */
export async function traceStripeWebhook<T>(
  eventType: string,
  fn: () => Promise<T>,
  organizationId?: string
): Promise<T> {
  return traceStripeCall('webhook', fn, {
    'stripe.event_type': eventType,
    'organization.id': organizationId,
  })
}

/**
 * Trace Stripe payment intent
 */
export async function traceStripePayment<T>(
  operation: 'create' | 'confirm' | 'cancel',
  amount: number,
  fn: () => Promise<T>,
  organizationId?: string
): Promise<T> {
  return traceStripeCall(`${operation}_payment`, fn, {
    'stripe.amount': amount,
    'organization.id': organizationId,
  })
}

/**
 * Generic external API call tracing
 */
export async function traceExternalApiCall<T>(
  serviceName: string,
  operation: string,
  fn: () => Promise<T>,
  attributes?: MetricAttributes
): Promise<T> {
  return traceExternalCall(serviceName, operation, fn, attributes)
}
