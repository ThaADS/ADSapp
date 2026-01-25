/**
 * Zapier Webhook Delivery Service
 *
 * Handles webhook delivery to Zapier with retry logic, error tracking,
 * and proper handling of 410 Gone responses for subscription cleanup.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type {
  WebhookPayload,
  WEBHOOK_RETRY_DELAYS,
  WEBHOOK_TIMEOUT,
  MAX_WEBHOOK_RETRIES,
} from '@/types/zapier'

// Import constants directly since they are const values, not types
const RETRY_DELAYS = [1000, 5000, 30000, 300000, 1800000] as const
const TIMEOUT_MS = 15000
const MAX_RETRIES = RETRY_DELAYS.length

// =====================================================
// Types
// =====================================================

interface DeliveryResult {
  success: boolean
  status?: number
  error?: string
}

// =====================================================
// WebhookService Class
// =====================================================

export class WebhookService {
  /**
   * Deliver webhook to target URL with retry logic
   */
  async deliverWebhook(
    subscriptionId: string,
    payload: WebhookPayload
  ): Promise<boolean> {
    const supabase = createServiceRoleClient()

    // Get subscription details
    const { data: subscription, error: subError } = await supabase
      .from('zapier_subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('is_active', true)
      .single()

    if (subError || !subscription) {
      console.error(`Subscription ${subscriptionId} not found or inactive`)
      return false
    }

    // Create delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('zapier_webhook_deliveries')
      .insert({
        subscription_id: subscriptionId,
        organization_id: subscription.organization_id,
        event_type: payload.event,
        event_id: payload.id,
        payload: payload,
        status: 'pending',
        attempt_count: 1,
      })
      .select()
      .single()

    if (deliveryError || !delivery) {
      console.error('Failed to create delivery record:', deliveryError)
      return false
    }

    // Attempt delivery
    return this.attemptDelivery(delivery.id, subscription.target_url, payload)
  }

  /**
   * Attempt to POST payload to target URL
   */
  private async attemptDelivery(
    deliveryId: string,
    targetUrl: string,
    payload: WebhookPayload
  ): Promise<boolean> {
    const supabase = createServiceRoleClient()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hook-Secret': process.env.ZAPIER_WEBHOOK_SECRET || '',
          'User-Agent': 'ADSapp-Webhook/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      // Handle 410 Gone - deactivate subscription (Zapier unsubscribed)
      if (response.status === 410) {
        await this.deactivateSubscription(deliveryId)
        await this.markDeliveryAbandoned(deliveryId, 410, 'Subscription removed by Zapier')
        return false
      }

      // Success (2xx)
      if (response.ok) {
        await this.markDeliverySuccess(deliveryId, response.status)
        await this.updateSubscriptionTrigger(deliveryId)
        return true
      }

      // Failure - schedule retry
      const responseText = await response.text().catch(() => '')
      await this.scheduleRetry(deliveryId, response.status, responseText)
      return false
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Handle abort (timeout)
      if (error instanceof Error && error.name === 'AbortError') {
        await this.scheduleRetry(deliveryId, 0, 'Request timeout')
      } else {
        await this.scheduleRetry(deliveryId, 0, errorMessage)
      }

      return false
    }
  }

  /**
   * Mark delivery as successful
   */
  private async markDeliverySuccess(deliveryId: string, status: number): Promise<void> {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('zapier_webhook_deliveries')
      .update({
        status: 'delivered',
        response_status: status,
        delivered_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)

    if (error) {
      console.error('Failed to update delivery status:', error)
    }
  }

  /**
   * Mark delivery as abandoned
   */
  private async markDeliveryAbandoned(
    deliveryId: string,
    status: number,
    errorMessage: string
  ): Promise<void> {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from('zapier_webhook_deliveries')
      .update({
        status: 'abandoned',
        response_status: status,
        response_body: errorMessage,
      })
      .eq('id', deliveryId)

    if (error) {
      console.error('Failed to mark delivery abandoned:', error)
    }
  }

  /**
   * Update subscription trigger timestamp and count
   */
  private async updateSubscriptionTrigger(deliveryId: string): Promise<void> {
    const supabase = createServiceRoleClient()

    // Get subscription_id from delivery
    const { data: delivery } = await supabase
      .from('zapier_webhook_deliveries')
      .select('subscription_id')
      .eq('id', deliveryId)
      .single()

    if (!delivery) return

    // Update subscription with rpc to safely increment
    const { error } = await supabase.rpc('increment_subscription_trigger_count', {
      sub_id: delivery.subscription_id,
    })

    // Fallback if RPC doesn't exist
    if (error && error.code === '42883') {
      // Function not found - use direct update
      await supabase
        .from('zapier_subscriptions')
        .update({
          last_triggered_at: new Date().toISOString(),
          trigger_count: supabase.raw ? undefined : 1, // Can't increment without raw
        })
        .eq('id', delivery.subscription_id)
    }
  }

  /**
   * Schedule retry with exponential backoff
   */
  private async scheduleRetry(
    deliveryId: string,
    status: number,
    errorMessage?: string
  ): Promise<void> {
    const supabase = createServiceRoleClient()

    const { data: delivery } = await supabase
      .from('zapier_webhook_deliveries')
      .select('attempt_count, subscription_id')
      .eq('id', deliveryId)
      .single()

    const attemptCount = delivery?.attempt_count || 1

    if (attemptCount >= MAX_RETRIES) {
      // Max retries exceeded - abandon
      await supabase
        .from('zapier_webhook_deliveries')
        .update({
          status: 'abandoned',
          response_status: status,
          response_body: errorMessage,
        })
        .eq('id', deliveryId)

      // Update subscription error count
      if (delivery?.subscription_id) {
        await this.updateSubscriptionError(delivery.subscription_id, errorMessage || `HTTP ${status}`)
      }

      return
    }

    // Calculate next retry time
    const delayMs = RETRY_DELAYS[attemptCount - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1]
    const nextRetryAt = new Date(Date.now() + delayMs).toISOString()

    await supabase
      .from('zapier_webhook_deliveries')
      .update({
        status: 'pending',
        response_status: status,
        response_body: errorMessage,
        attempt_count: attemptCount + 1,
        next_retry_at: nextRetryAt,
      })
      .eq('id', deliveryId)
  }

  /**
   * Update subscription error tracking
   */
  private async updateSubscriptionError(
    subscriptionId: string,
    errorMessage: string
  ): Promise<void> {
    const supabase = createServiceRoleClient()

    // Get current error count
    const { data: subscription } = await supabase
      .from('zapier_subscriptions')
      .select('error_count')
      .eq('id', subscriptionId)
      .single()

    await supabase
      .from('zapier_subscriptions')
      .update({
        error_count: (subscription?.error_count || 0) + 1,
        last_error: errorMessage,
        last_error_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
  }

  /**
   * Deactivate subscription (410 response)
   */
  private async deactivateSubscription(deliveryId: string): Promise<void> {
    const supabase = createServiceRoleClient()

    const { data: delivery } = await supabase
      .from('zapier_webhook_deliveries')
      .select('subscription_id')
      .eq('id', deliveryId)
      .single()

    if (delivery) {
      await supabase
        .from('zapier_subscriptions')
        .update({ is_active: false })
        .eq('id', delivery.subscription_id)
    }
  }

  /**
   * Process pending retries (called by cron or worker)
   */
  async processRetries(): Promise<number> {
    const supabase = createServiceRoleClient()

    const { data: deliveries, error } = await supabase
      .from('zapier_webhook_deliveries')
      .select('id, subscription_id, payload')
      .eq('status', 'pending')
      .lte('next_retry_at', new Date().toISOString())
      .limit(100)

    if (error || !deliveries) {
      console.error('Failed to fetch pending deliveries:', error)
      return 0
    }

    let processed = 0

    for (const delivery of deliveries) {
      const { data: subscription } = await supabase
        .from('zapier_subscriptions')
        .select('target_url, is_active')
        .eq('id', delivery.subscription_id)
        .single()

      if (subscription?.is_active && subscription.target_url) {
        await this.attemptDelivery(
          delivery.id,
          subscription.target_url,
          delivery.payload as WebhookPayload
        )
        processed++
      }
    }

    return processed
  }
}

// =====================================================
// Singleton & Convenience Functions
// =====================================================

/**
 * Singleton instance of WebhookService
 */
export const webhookService = new WebhookService()

/**
 * Convenience function to deliver a webhook
 */
export async function deliverWebhook(
  subscriptionId: string,
  payload: WebhookPayload
): Promise<boolean> {
  return webhookService.deliverWebhook(subscriptionId, payload)
}

/**
 * Convenience function to process pending retries
 */
export async function processRetries(): Promise<number> {
  return webhookService.processRetries()
}
