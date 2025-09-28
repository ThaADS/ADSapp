import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { UsageTracker } from './usage-tracking'
import { InvoiceManager } from './invoice-management'
import { PaymentMethodManager } from './payment-methods'
import { NotificationService } from './notification-service'

export class StripeWebhookProcessor {
  private supabase = createClient()
  private usageTracker = new UsageTracker()
  private invoiceManager = new InvoiceManager()
  private paymentMethodManager = new PaymentMethodManager()
  private notificationService = new NotificationService()

  async processEvent(event: Stripe.Event): Promise<void> {
    console.log(`[Webhook] Processing ${event.type}`)

    try {
      switch (event.type) {
        // Subscription Events
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription)
          break
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break
        case 'customer.subscription.trial_will_end':
          await this.handleTrialWillEnd(event.data.object as Stripe.Subscription)
          break

        // Invoice Events
        case 'invoice.created':
          await this.handleInvoiceCreated(event.data.object as Stripe.Invoice)
          break
        case 'invoice.finalized':
          await this.handleInvoiceFinalized(event.data.object as Stripe.Invoice)
          break
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice)
          break
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice)
          break
        case 'invoice.payment_action_required':
          await this.handlePaymentActionRequired(event.data.object as Stripe.Invoice)
          break
        case 'invoice.upcoming':
          await this.handleInvoiceUpcoming(event.data.object as Stripe.Invoice)
          break

        // Payment Method Events
        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod)
          break
        case 'payment_method.detached':
          await this.handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod)
          break
        case 'setup_intent.succeeded':
          await this.handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent)
          break

        // Customer Events
        case 'customer.created':
          await this.handleCustomerCreated(event.data.object as Stripe.Customer)
          break
        case 'customer.updated':
          await this.handleCustomerUpdated(event.data.object as Stripe.Customer)
          break
        case 'customer.deleted':
          await this.handleCustomerDeleted(event.data.object as Stripe.Customer)
          break

        // Checkout Events
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
          break
        case 'checkout.session.expired':
          await this.handleCheckoutExpired(event.data.object as Stripe.Checkout.Session)
          break

        // Price and Product Events
        case 'price.created':
        case 'price.updated':
          await this.handlePriceUpdated(event.data.object as Stripe.Price)
          break

        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`)
      }

      // Log successful processing
      await this.logWebhookEvent(event, 'success')
    } catch (error) {
      console.error(`[Webhook] Error processing ${event.type}:`, error)
      await this.logWebhookEvent(event, 'error', error instanceof Error ? error.message : 'Unknown error')
      throw error
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata.organizationId
    if (!organizationId) return

    const planId = this.extractPlanFromSubscription(subscription)
    const supabase = await this.supabase

    // Update organization with subscription details
    await supabase
      .from('organizations')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status as any,
        subscription_tier: planId,
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('id', organizationId)

    // Initialize usage tracking for the new subscription
    await this.usageTracker.initializeUsageForOrganization(organizationId)

    // Send welcome notification
    await this.notificationService.sendSubscriptionWelcome(organizationId, planId)
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata.organizationId
    if (!organizationId) return

    const planId = this.extractPlanFromSubscription(subscription)
    const supabase = await this.supabase

    // Get current organization data
    const { data: currentOrg } = await supabase
      .from('organizations')
      .select('subscription_tier, subscription_status')
      .eq('id', organizationId)
      .single()

    const wasUpgrade = currentOrg && this.isPlanUpgrade(currentOrg.subscription_tier, planId)
    const wasDowngrade = currentOrg && this.isPlanDowngrade(currentOrg.subscription_tier, planId)

    // Update organization
    await supabase
      .from('organizations')
      .update({
        subscription_status: subscription.status as any,
        subscription_tier: planId,
        trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('id', organizationId)

    // Handle plan changes
    if (wasUpgrade) {
      await this.notificationService.sendPlanUpgradeNotification(organizationId, planId)
    } else if (wasDowngrade) {
      await this.notificationService.sendPlanDowngradeNotification(organizationId, planId)
      await this.usageTracker.enforceDowngradeLimits(organizationId, planId)
    }

    // Update usage limits
    await this.usageTracker.updatePlanLimits(organizationId, planId)
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata.organizationId
    if (!organizationId) return

    const supabase = await this.supabase

    await supabase
      .from('organizations')
      .update({
        subscription_status: 'cancelled',
        subscription_tier: 'starter', // Downgrade to free plan
        stripe_subscription_id: null,
        trial_ends_at: null,
      })
      .eq('id', organizationId)

    // Enforce free plan limits
    await this.usageTracker.enforceDowngradeLimits(organizationId, 'starter')

    // Send cancellation notification
    await this.notificationService.sendSubscriptionCancellation(organizationId)
  }

  private async handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
    const organizationId = subscription.metadata.organizationId
    if (!organizationId) return

    const daysLeft = Math.ceil((subscription.trial_end! - Date.now() / 1000) / 86400)
    await this.notificationService.sendTrialEndingNotification(organizationId, daysLeft)
  }

  private async handleInvoiceCreated(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return

    await this.invoiceManager.createInvoiceRecord(invoice)
  }

  private async handleInvoiceFinalized(invoice: Stripe.Invoice): Promise<void> {
    await this.invoiceManager.finalizeInvoice(invoice)

    if (invoice.subscription) {
      const organizationId = await this.getOrganizationFromSubscription(invoice.subscription as string)
      if (organizationId) {
        await this.notificationService.sendInvoiceFinalized(organizationId, invoice.id)
      }
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    await this.invoiceManager.markInvoicePaid(invoice)

    if (invoice.subscription) {
      const organizationId = await this.getOrganizationFromSubscription(invoice.subscription as string)
      if (organizationId) {
        // Reset usage for new billing period if this is a subscription invoice
        if (invoice.billing_reason === 'subscription_cycle') {
          await this.usageTracker.resetMonthlyUsage(organizationId)
        }

        await this.notificationService.sendPaymentSuccess(organizationId, invoice.amount_paid / 100)
      }
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    await this.invoiceManager.markPaymentFailed(invoice)

    if (invoice.subscription) {
      const organizationId = await this.getOrganizationFromSubscription(invoice.subscription as string)
      if (organizationId) {
        const supabase = await this.supabase

        // Update subscription status to past_due
        await supabase
          .from('organizations')
          .update({ subscription_status: 'past_due' })
          .eq('id', organizationId)

        // Send payment failed notification
        await this.notificationService.sendPaymentFailed(organizationId, invoice.amount_due / 100)

        // Schedule retry logic
        await this.schedulePaymentRetry(organizationId, invoice.id)
      }
    }
  }

  private async handlePaymentActionRequired(invoice: Stripe.Invoice): Promise<void> {
    if (invoice.subscription) {
      const organizationId = await this.getOrganizationFromSubscription(invoice.subscription as string)
      if (organizationId) {
        await this.notificationService.sendPaymentActionRequired(organizationId, invoice.hosted_invoice_url!)
      }
    }
  }

  private async handleInvoiceUpcoming(invoice: Stripe.Invoice): Promise<void> {
    if (invoice.subscription) {
      const organizationId = await this.getOrganizationFromSubscription(invoice.subscription as string)
      if (organizationId) {
        // Calculate usage-based charges
        const usageCharges = await this.usageTracker.calculateOverageCharges(organizationId)

        if (usageCharges > 0) {
          await this.usageTracker.addUsageBasedCharges(invoice.subscription as string, usageCharges)
        }

        // Send upcoming invoice notification
        await this.notificationService.sendUpcomingInvoice(organizationId, invoice.amount_due / 100)
      }
    }
  }

  private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    await this.paymentMethodManager.handlePaymentMethodAttached(paymentMethod)
  }

  private async handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    await this.paymentMethodManager.handlePaymentMethodDetached(paymentMethod)
  }

  private async handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent): Promise<void> {
    if (setupIntent.customer && setupIntent.payment_method) {
      await this.paymentMethodManager.handleSetupIntentSucceeded(setupIntent)
    }
  }

  private async handleCustomerCreated(customer: Stripe.Customer): Promise<void> {
    // Customer creation is handled in the StripeService.createCustomer method
    console.log(`[Webhook] Customer created: ${customer.id}`)
  }

  private async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
    const organizationId = customer.metadata.organizationId
    if (!organizationId) return

    const supabase = await this.supabase

    // Update organization with customer details if needed
    await supabase
      .from('organizations')
      .update({
        // Add any customer-specific fields you want to sync
      })
      .eq('id', organizationId)
  }

  private async handleCustomerDeleted(customer: Stripe.Customer): Promise<void> {
    const organizationId = customer.metadata.organizationId
    if (!organizationId) return

    const supabase = await this.supabase

    // Clear Stripe customer reference
    await supabase
      .from('organizations')
      .update({
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_status: 'cancelled',
      })
      .eq('id', organizationId)
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const { organizationId, planId } = session.metadata!

    if (session.subscription) {
      const supabase = await this.supabase

      await supabase
        .from('organizations')
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: 'active',
          subscription_tier: planId,
        })
        .eq('id', organizationId)

      // Send success notification
      await this.notificationService.sendCheckoutSuccess(organizationId, planId)
    }
  }

  private async handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
    const { organizationId } = session.metadata || {}
    if (organizationId) {
      await this.notificationService.sendCheckoutExpired(organizationId)
    }
  }

  private async handlePriceUpdated(price: Stripe.Price): Promise<void> {
    // Handle price updates - might need to update plan configurations
    console.log(`[Webhook] Price updated: ${price.id}`)
  }

  // Helper methods
  private extractPlanFromSubscription(subscription: Stripe.Subscription): string {
    // Extract plan ID from subscription items
    const priceId = subscription.items.data[0]?.price?.id
    if (!priceId) return 'starter'

    // Map price IDs to plan IDs
    const priceToPlainMap: Record<string, string> = {
      [process.env.STRIPE_STARTER_PRICE_ID!]: 'starter',
      [process.env.STRIPE_PROFESSIONAL_PRICE_ID!]: 'professional',
      [process.env.STRIPE_ENTERPRISE_PRICE_ID!]: 'enterprise',
    }

    return priceToPlainMap[priceId] || 'starter'
  }

  private async getOrganizationFromSubscription(subscriptionId: string): Promise<string | null> {
    const supabase = await this.supabase
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single()

    return data?.id || null
  }

  private isPlanUpgrade(currentPlan: string, newPlan: string): boolean {
    const planHierarchy = { starter: 0, professional: 1, enterprise: 2 }
    return planHierarchy[newPlan as keyof typeof planHierarchy] > planHierarchy[currentPlan as keyof typeof planHierarchy]
  }

  private isPlanDowngrade(currentPlan: string, newPlan: string): boolean {
    const planHierarchy = { starter: 0, professional: 1, enterprise: 2 }
    return planHierarchy[newPlan as keyof typeof planHierarchy] < planHierarchy[currentPlan as keyof typeof planHierarchy]
  }

  private async schedulePaymentRetry(organizationId: string, invoiceId: string): Promise<void> {
    // Implement payment retry logic - could use a job queue or cron job
    console.log(`[Webhook] Scheduling payment retry for org ${organizationId}, invoice ${invoiceId}`)
  }

  private async logWebhookEvent(event: Stripe.Event, status: 'success' | 'error', errorMessage?: string): Promise<void> {
    const supabase = await this.supabase

    await supabase
      .from('webhook_events')
      .insert({
        event_id: event.id,
        event_type: event.type,
        status,
        error_message: errorMessage,
        processed_at: new Date().toISOString(),
        event_data: event.data.object,
      })
      .then(() => {
        console.log(`[Webhook] Logged event ${event.id} with status ${status}`)
      })
      .catch((error) => {
        console.error(`[Webhook] Failed to log event ${event.id}:`, error)
      })
  }
}