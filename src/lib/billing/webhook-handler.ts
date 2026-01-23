/**
 * Enhanced Webhook Handler (S-003: Webhook Idempotency)
 * =======================================================
 * Complete webhook processing with idempotency guarantees, event routing,
 * retry logic, and comprehensive error handling for all Stripe webhook events.
 *
 * Security: CVSS 6.0 - Prevents duplicate webhook processing and data corruption
 * Compliance: PCI DSS requirements for payment processing audit trails
 */

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'

export interface WebhookProcessingResult {
  success: boolean
  eventId?: string
  processed: boolean
  alreadyProcessed?: boolean
  error?: string
  errorCode?: string
  retryable?: boolean
}

export interface WebhookEvent {
  id: string
  stripeEventId: string
  eventType: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  retryCount: number
}

export class WebhookHandler {
  /**
   * Process webhook with idempotency guarantees
   * Uses atomic database operations to prevent duplicate processing
   */
  async processWebhookWithIdempotency(
    event: Stripe.Event,
    signature: string
  ): Promise<WebhookProcessingResult> {
    const supabase = await createClient()
    const startTime = Date.now()

    try {
      // 1. Validate event signature (already done by validator middleware)
      // 2. Check if event already processed (idempotency check)
      const { data: existingEvent, error: checkError } = await supabase
        .from('webhook_events')
        .select('id, status')
        .eq('stripe_event_id', event.id)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = not found
        throw new Error(`Failed to check event status: ${checkError.message}`)
      }

      // If event exists and is completed or processing, return early
      if (existingEvent) {
        if (existingEvent.status === 'completed') {
          return {
            success: true,
            eventId: existingEvent.id,
            processed: true,
            alreadyProcessed: true,
          }
        }

        if (existingEvent.status === 'processing') {
          // Another process is handling this, wait and return
          return {
            success: true,
            eventId: existingEvent.id,
            processed: false,
            alreadyProcessed: true,
          }
        }
      }

      // 3. Mark event as processing (atomic operation)
      const { data: eventId, error: markError } = await supabase.rpc(
        'mark_webhook_event_processing',
        {
          p_stripe_event_id: event.id,
          p_event_type: event.type,
          p_event_data: event.data.object as any,
        }
      )

      if (markError) {
        throw new Error(`Failed to mark event as processing: ${markError.message}`)
      }

      // 4. Route and process event
      try {
        await this.routeEventToHandler(event)

        // 5. Mark event as completed
        const processingDuration = Date.now() - startTime
        await supabase.rpc('mark_webhook_event_completed', {
          p_event_id: eventId,
          p_processing_duration_ms: processingDuration,
        })

        return {
          success: true,
          eventId,
          processed: true,
          alreadyProcessed: false,
        }
      } catch (processingError) {
        // 6. Mark event as failed
        const err = processingError as Error
        await supabase.rpc('mark_webhook_event_failed', {
          p_event_id: eventId,
          p_error_message: err.message,
          p_error_details: {
            error: err.message,
            stack: err.stack,
            eventType: event.type,
          },
        })

        return {
          success: false,
          eventId,
          processed: false,
          error: err.message,
          errorCode: 'PROCESSING_ERROR',
          retryable: this.isRetryableError(err),
        }
      }
    } catch (error) {
      const err = error as Error
      console.error('Webhook processing error:', err)

      return {
        success: false,
        processed: false,
        error: err.message,
        errorCode: 'WEBHOOK_PROCESSING_ERROR',
        retryable: false,
      }
    }
  }

  /**
   * Route webhook event to appropriate handler based on event type
   */
  private async routeEventToHandler(event: Stripe.Event): Promise<void> {
    // Route to specific handler based on event type
    if (event.type.startsWith('customer.subscription.')) {
      await this.handleSubscriptionEvents(event)
    } else if (event.type.startsWith('invoice.')) {
      await this.handleInvoiceEvents(event)
    } else if (event.type.startsWith('payment_intent.')) {
      await this.handlePaymentIntentEvents(event)
    } else if (event.type.startsWith('charge.')) {
      await this.handleChargeEvents(event)
    } else if (event.type.startsWith('customer.')) {
      await this.handleCustomerEvents(event)
    } else if (event.type.startsWith('checkout.session.')) {
      await this.handleCheckoutEvents(event)
    } else {
      console.log(`Unhandled webhook event type: ${event.type}`)
    }
  }

  /**
   * Handle subscription-related webhook events
   */
  private async handleSubscriptionEvents(event: Stripe.Event): Promise<void> {
    const supabase = await createClient()
    const subscription = event.data.object as Stripe.Subscription

    const organizationId = subscription.metadata?.organizationId
    if (!organizationId) {
      console.warn('Subscription event missing organizationId in metadata')
      return
    }

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(subscription, organizationId)
        break

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(subscription, organizationId)
        break

      case 'customer.subscription.trial_will_end':
        await this.handleSubscriptionTrialWillEnd(subscription, organizationId)
        break

      default:
        console.log(`Unhandled subscription event: ${event.type}`)
    }
  }

  /**
   * Handle invoice-related webhook events
   */
  private async handleInvoiceEvents(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice

    switch (event.type) {
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(invoice)
        break

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(invoice)
        break

      case 'invoice.created':
        await this.handleInvoiceCreated(invoice)
        break

      case 'invoice.finalized':
        await this.handleInvoiceFinalized(invoice)
        break

      default:
        console.log(`Unhandled invoice event: ${event.type}`)
    }
  }

  /**
   * Handle payment intent webhook events
   */
  private async handlePaymentIntentEvents(event: Stripe.Event): Promise<void> {
    const paymentIntent = event.data.object as Stripe.PaymentIntent

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(paymentIntent)
        break

      case 'payment_intent.payment_failed':
        await this.handlePaymentIntentFailed(paymentIntent)
        break

      case 'payment_intent.requires_action':
        await this.handlePaymentIntentRequiresAction(paymentIntent)
        break

      case 'payment_intent.canceled':
        await this.handlePaymentIntentCanceled(paymentIntent)
        break

      default:
        console.log(`Unhandled payment intent event: ${event.type}`)
    }
  }

  /**
   * Handle charge-related webhook events (including refunds)
   */
  private async handleChargeEvents(event: Stripe.Event): Promise<void> {
    const charge = event.data.object as Stripe.Charge

    switch (event.type) {
      case 'charge.succeeded':
        await this.handleChargeSucceeded(charge)
        break

      case 'charge.failed':
        await this.handleChargeFailed(charge)
        break

      case 'charge.refunded':
        await this.handleChargeRefunded(charge)
        break

      case 'charge.dispute.created':
        await this.handleDisputeCreated(charge)
        break

      default:
        console.log(`Unhandled charge event: ${event.type}`)
    }
  }

  /**
   * Handle customer-related webhook events
   */
  private async handleCustomerEvents(event: Stripe.Event): Promise<void> {
    const customer = event.data.object as Stripe.Customer

    switch (event.type) {
      case 'customer.created':
        await this.handleCustomerCreated(customer)
        break

      case 'customer.updated':
        await this.handleCustomerUpdated(customer)
        break

      case 'customer.deleted':
        await this.handleCustomerDeleted(customer)
        break

      default:
        console.log(`Unhandled customer event: ${event.type}`)
    }
  }

  /**
   * Handle checkout session webhook events
   */
  private async handleCheckoutEvents(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(session)
        break

      case 'checkout.session.expired':
        await this.handleCheckoutExpired(session)
        break

      default:
        console.log(`Unhandled checkout event: ${event.type}`)
    }
  }

  // ============================================================================
  // Individual Event Handlers
  // ============================================================================

  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription,
    organizationId: string
  ): Promise<void> {
    const supabase = await createClient()

    const status = this.mapSubscriptionStatus(subscription.status)

    await supabase
      .from('organizations')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: status,
        subscription_tier: this.getPlanFromSubscription(subscription),
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)
  }

  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription,
    organizationId: string
  ): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('organizations')
      .update({
        stripe_subscription_id: null,
        subscription_status: 'cancelled',
        subscription_tier: 'starter',
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)
  }

  private async handleSubscriptionTrialWillEnd(
    subscription: Stripe.Subscription,
    organizationId: string
  ): Promise<void> {
    // TODO: Send trial ending notification
    console.log(`Trial ending for organization ${organizationId}`)
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const supabase = await createClient()

    if (!invoice.subscription) return

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const organizationId = subscription.metadata?.organizationId

    if (!organizationId) return

    // Ensure subscription is active
    await supabase
      .from('organizations')
      .update({
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const supabase = await createClient()

    if (!invoice.subscription) return

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const organizationId = subscription.metadata?.organizationId

    if (!organizationId) return

    // Mark subscription as past due
    await supabase
      .from('organizations')
      .update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)

    // TODO: Send payment failed notification
  }

  private async handleInvoiceCreated(invoice: Stripe.Invoice): Promise<void> {
    // Log invoice creation for records
    console.log(`Invoice created: ${invoice.id}`)
  }

  private async handleInvoiceFinalized(invoice: Stripe.Invoice): Promise<void> {
    // Invoice is finalized and ready for payment
    console.log(`Invoice finalized: ${invoice.id}`)
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const supabase = await createClient()

    // Update payment intent in database
    const { data: dbIntent } = await supabase
      .from('payment_intents')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle()

    if (dbIntent) {
      await supabase.rpc('update_payment_intent_status', {
        p_payment_intent_id: dbIntent.id,
        p_status: 'succeeded',
        p_authentication_status: 'authenticated',
      })
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const supabase = await createClient()

    const { data: dbIntent } = await supabase
      .from('payment_intents')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle()

    if (dbIntent) {
      await supabase.rpc('update_payment_intent_status', {
        p_payment_intent_id: dbIntent.id,
        p_status: 'requires_payment_method',
        p_authentication_status: 'failed',
        p_error_code: paymentIntent.last_payment_error?.code,
        p_error_message: paymentIntent.last_payment_error?.message,
      })
    }
  }

  private async handlePaymentIntentRequiresAction(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const supabase = await createClient()

    const { data: dbIntent } = await supabase
      .from('payment_intents')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle()

    if (dbIntent) {
      await supabase
        .from('payment_intents')
        .update({
          status: 'requires_action',
          authentication_status: 'challenged',
          next_action: paymentIntent.next_action,
        })
        .eq('id', dbIntent.id)
    }
  }

  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    const supabase = await createClient()

    const { data: dbIntent } = await supabase
      .from('payment_intents')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .maybeSingle()

    if (dbIntent) {
      await supabase.rpc('update_payment_intent_status', {
        p_payment_intent_id: dbIntent.id,
        p_status: 'cancelled',
      })
    }
  }

  private async handleChargeSucceeded(charge: Stripe.Charge): Promise<void> {
    // Log successful charge
    console.log(`Charge succeeded: ${charge.id}`)
  }

  private async handleChargeFailed(charge: Stripe.Charge): Promise<void> {
    // Log failed charge
    console.log(`Charge failed: ${charge.id}`)
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const supabase = await createClient()

    // Update refund record in database
    const refunds = charge.refunds?.data || []
    for (const refund of refunds) {
      await supabase
        .from('refunds')
        .update({
          status: 'completed',
          stripe_refund_id: refund.id,
          completed_at: new Date(refund.created * 1000).toISOString(),
        })
        .eq('stripe_charge_id', charge.id)
    }
  }

  private async handleDisputeCreated(charge: Stripe.Charge): Promise<void> {
    // TODO: Handle dispute - notify admin
    console.log(`Dispute created for charge: ${charge.id}`)
  }

  private async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
    // Log customer creation
    console.log(`Customer created: ${customer.id}`)
  }

  private async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
    const supabase = await createClient()

    // Update organization customer information
    await supabase
      .from('organizations')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customer.id)
  }

  private async handleCustomerDeleted(customer: Stripe.Customer): Promise<void> {
    const supabase = await createClient()

    // Remove customer reference
    await supabase
      .from('organizations')
      .update({
        stripe_customer_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customer.id)
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const supabase = await createClient()

    const organizationId = session.metadata?.organizationId
    if (!organizationId) return

    // Update organization with subscription details
    if (session.subscription) {
      await supabase
        .from('organizations')
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: 'active',
          subscription_tier: session.metadata?.planId || 'starter',
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId)
    }
  }

  private async handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
    // Log expired checkout session
    console.log(`Checkout session expired: ${session.id}`)
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Map Stripe subscription status to internal status
   */
  private mapSubscriptionStatus(
    stripeStatus: Stripe.Subscription.Status
  ): 'active' | 'past_due' | 'cancelled' | 'incomplete' {
    switch (stripeStatus) {
      case 'active':
        return 'active'
      case 'past_due':
      case 'unpaid':
        return 'past_due'
      case 'canceled':
      case 'incomplete_expired':
        return 'cancelled'
      case 'incomplete':
      case 'trialing':
      default:
        return 'incomplete'
    }
  }

  /**
   * Extract plan ID from subscription
   */
  private getPlanFromSubscription(subscription: Stripe.Subscription): string {
    // Try metadata first
    if (subscription.metadata?.planId) {
      return subscription.metadata.planId
    }

    // Try matching price ID to known plans
    const priceId = subscription.items.data[0]?.price.id
    // This should match against SUBSCRIPTION_PLANS from stripe/server.ts
    // For now, return default
    return 'starter'
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const retryableErrors = ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'EHOSTUNREACH']

    return retryableErrors.some(
      code => error.message.includes(code) || (error as any).code === code
    )
  }

  /**
   * Retry failed webhook
   */
  async retryFailedWebhook(
    eventId: string,
    maxRetries: number = 3
  ): Promise<WebhookProcessingResult> {
    const supabase = await createClient()

    // Get webhook event
    const { data: webhookEvent, error: fetchError } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (fetchError || !webhookEvent) {
      return {
        success: false,
        processed: false,
        error: 'Webhook event not found',
        errorCode: 'NOT_FOUND',
        retryable: false,
      }
    }

    // Check retry count
    if (webhookEvent.retry_count >= maxRetries) {
      return {
        success: false,
        processed: false,
        error: 'Maximum retry attempts exceeded',
        errorCode: 'MAX_RETRIES_EXCEEDED',
        retryable: false,
      }
    }

    // Reconstruct Stripe event
    const stripeEvent: Stripe.Event = {
      id: webhookEvent.stripe_event_id,
      type: webhookEvent.event_type,
      data: {
        object: webhookEvent.event_data,
      },
    } as Stripe.Event

    // Reset status to pending for retry
    await supabase.from('webhook_events').update({ status: 'pending' }).eq('id', eventId)

    // Retry processing
    return await this.processWebhookWithIdempotency(stripeEvent, '')
  }

  /**
   * Get events that need retry
   */
  async getEventsForRetry(): Promise<WebhookEvent[]> {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('get_webhook_events_for_retry')

    if (error) {
      console.error('Error fetching events for retry:', error)
      return []
    }

    return data || []
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStatistics(): Promise<any> {
    // TODO: Re-enable when webhook_event_stats table is created
    // The table doesn't exist yet, so return empty results
    console.log('Webhook event stats table not yet created - returning empty results')
    return []

    /* ORIGINAL CODE - Uncomment when table exists:
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('webhook_event_stats')
      .select('*')
      .order('event_type');

    if (error) {
      throw new Error(`Failed to get webhook statistics: ${error.message}`);
    }

    return data || [];
    */
  }
}

export default WebhookHandler
