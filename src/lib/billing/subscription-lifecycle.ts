import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { stripe, SUBSCRIPTION_PLANS } from '@/lib/stripe/server'
import { UsageTracker } from './usage-tracking'
import { NotificationService } from './notification-service'

export interface SubscriptionChange {
  from: string
  to: string
  effectiveDate: Date
  prorationAmount?: number
  reason: 'upgrade' | 'downgrade' | 'trial_end' | 'cancellation' | 'reactivation'
}

export interface SubscriptionMetrics {
  id: string
  organizationId: string
  status: string
  currentPlan: string
  mrr: number // Monthly Recurring Revenue
  arr: number // Annual Recurring Revenue
  trialEndsAt?: Date
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAt?: Date
  canceledAt?: Date
  cancellationReason?: string
  reactivationEligible: boolean
}

export interface PlanChangeOptions {
  prorate: boolean
  billingCycleAnchor?: 'now' | 'unchanged'
  trialEnd?: Date
  metadata?: Record<string, string>
}

export interface CancellationOptions {
  immediate: boolean
  reason: string
  feedback?: string
  offerRetention?: boolean
  downgradeToFree?: boolean
}

export class SubscriptionLifecycleManager {
  private supabase = createClient()
  private usageTracker: UsageTracker | null = null
  private notificationService: NotificationService | null = null

  private getUsageTracker(): UsageTracker {
    if (!this.usageTracker) {
      this.usageTracker = new UsageTracker()
    }
    return this.usageTracker
  }

  private getNotificationService(): NotificationService {
    if (!this.notificationService) {
      this.notificationService = new NotificationService()
    }
    return this.notificationService
  }

  async upgradeSubscription(
    organizationId: string,
    newPlanId: keyof typeof SUBSCRIPTION_PLANS,
    options: PlanChangeOptions = { prorate: true }
  ): Promise<{ subscription: Stripe.Subscription; prorationAmount: number }> {
    const supabase = await this.supabase

    // Get current subscription
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_subscription_id, subscription_tier, stripe_customer_id')
      .eq('id', organizationId)
      .single()

    if (!org?.stripe_subscription_id) {
      throw new Error('No active subscription found')
    }

    const currentSubscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
    const newPlan = SUBSCRIPTION_PLANS[newPlanId]

    if (!newPlan) {
      throw new Error('Invalid plan ID')
    }

    // Calculate proration if needed
    let prorationAmount = 0
    if (options.prorate) {
      prorationAmount = await this.calculateProration(
        currentSubscription,
        newPlan.stripePriceId
      )
    }

    // Update the subscription
    const updatedSubscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [
        {
          id: currentSubscription.items.data[0].id,
          price: newPlan.stripePriceId,
        },
      ],
      proration_behavior: options.prorate ? 'create_prorations' : 'none',
      billing_cycle_anchor: options.billingCycleAnchor === 'now' ? 'now' : 'unchanged',
      trial_end: options.trialEnd ? Math.floor(options.trialEnd.getTime() / 1000) : undefined,
      metadata: {
        ...currentSubscription.metadata,
        previousPlan: org.subscription_tier,
        upgradeDate: new Date().toISOString(),
        ...options.metadata,
      },
    })

    // Update organization record
    await supabase
      .from('organizations')
      .update({
        subscription_tier: newPlanId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)

    // Log the change
    await this.logSubscriptionChange(organizationId, {
      from: org.subscription_tier,
      to: newPlanId,
      effectiveDate: new Date(),
      prorationAmount,
      reason: 'upgrade',
    })

    // Update usage limits
    await this.getUsageTracker().updatePlanLimits(organizationId, newPlanId)

    // Send upgrade notification
    await this.getNotificationService().sendPlanUpgradeNotification(organizationId, newPlanId)

    return {
      subscription: updatedSubscription,
      prorationAmount,
    }
  }

  async downgradeSubscription(
    organizationId: string,
    newPlanId: keyof typeof SUBSCRIPTION_PLANS,
    options: PlanChangeOptions = { prorate: true }
  ): Promise<{ subscription: Stripe.Subscription; prorationAmount: number }> {
    const supabase = await this.supabase

    // Get current subscription
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_subscription_id, subscription_tier')
      .eq('id', organizationId)
      .single()

    if (!org?.stripe_subscription_id) {
      throw new Error('No active subscription found')
    }

    const currentSubscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
    const newPlan = SUBSCRIPTION_PLANS[newPlanId]

    // Check usage limits before downgrade
    const currentUsage = await this.getUsageTracker().getCurrentUsage(organizationId)
    const newLimits = await this.getUsageTracker().getPlanLimits(newPlanId)

    const usageViolations = this.checkUsageViolations(currentUsage, newLimits)
    if (usageViolations.length > 0) {
      throw new Error(`Cannot downgrade: Current usage exceeds new plan limits: ${usageViolations.join(', ')}`)
    }

    // Calculate proration (usually a credit for downgrade)
    let prorationAmount = 0
    if (options.prorate) {
      prorationAmount = await this.calculateProration(
        currentSubscription,
        newPlan.stripePriceId
      )
    }

    // Update the subscription
    const updatedSubscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
      items: [
        {
          id: currentSubscription.items.data[0].id,
          price: newPlan.stripePriceId,
        },
      ],
      proration_behavior: options.prorate ? 'create_prorations' : 'none',
      metadata: {
        ...currentSubscription.metadata,
        previousPlan: org.subscription_tier,
        downgradeDate: new Date().toISOString(),
        ...options.metadata,
      },
    })

    // Update organization record
    await supabase
      .from('organizations')
      .update({
        subscription_tier: newPlanId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)

    // Log the change
    await this.logSubscriptionChange(organizationId, {
      from: org.subscription_tier,
      to: newPlanId,
      effectiveDate: new Date(),
      prorationAmount,
      reason: 'downgrade',
    })

    // Enforce new limits
    await this.getUsageTracker().enforceDowngradeLimits(organizationId, newPlanId)

    // Send downgrade notification
    await this.getNotificationService().sendPlanDowngradeNotification(organizationId, newPlanId)

    return {
      subscription: updatedSubscription,
      prorationAmount,
    }
  }

  async cancelSubscription(
    organizationId: string,
    options: CancellationOptions
  ): Promise<{ subscription: Stripe.Subscription; effectiveDate: Date }> {
    const supabase = await this.supabase

    // Get current subscription
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_subscription_id, subscription_tier')
      .eq('id', organizationId)
      .single()

    if (!org?.stripe_subscription_id) {
      throw new Error('No active subscription found')
    }

    let canceledSubscription: Stripe.Subscription
    let effectiveDate: Date

    if (options.immediate) {
      // Cancel immediately
      canceledSubscription = await stripe.subscriptions.cancel(org.stripe_subscription_id)
      effectiveDate = new Date()

      // Update organization immediately
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'cancelled',
          subscription_tier: options.downgradeToFree ? 'starter' : org.subscription_tier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId)

      // Enforce free tier limits if downgrading
      if (options.downgradeToFree) {
        await this.getUsageTracker().enforceDowngradeLimits(organizationId, 'starter')
      }
    } else {
      // Cancel at period end
      canceledSubscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
        cancel_at_period_end: true,
        metadata: {
          cancellationReason: options.reason,
          cancellationFeedback: options.feedback || '',
          cancelledAt: new Date().toISOString(),
        },
      })
      effectiveDate = new Date(canceledSubscription.current_period_end * 1000)
    }

    // Log cancellation
    await this.logSubscriptionChange(organizationId, {
      from: org.subscription_tier,
      to: 'cancelled',
      effectiveDate,
      reason: 'cancellation',
    })

    // Store cancellation details
    await supabase
      .from('subscription_cancellations')
      .insert({
        organization_id: organizationId,
        subscription_id: org.stripe_subscription_id,
        reason: options.reason,
        feedback: options.feedback,
        immediate: options.immediate,
        cancelled_at: new Date().toISOString(),
        effective_date: effectiveDate.toISOString(),
      })

    // Send cancellation notification
    await this.getNotificationService().sendSubscriptionCancellation(organizationId)

    // Offer retention if requested
    if (options.offerRetention) {
      await this.offerRetentionDiscount(organizationId)
    }

    return {
      subscription: canceledSubscription,
      effectiveDate,
    }
  }

  async reactivateSubscription(
    organizationId: string,
    planId: keyof typeof SUBSCRIPTION_PLANS
  ): Promise<Stripe.Subscription> {
    const supabase = await this.supabase

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id, stripe_subscription_id')
      .eq('id', organizationId)
      .single()

    if (!org?.stripe_customer_id) {
      throw new Error('No customer found')
    }

    let subscription: Stripe.Subscription

    if (org.stripe_subscription_id) {
      // Try to reactivate existing subscription
      try {
        const existingSubscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id)

        if (existingSubscription.status === 'canceled') {
          // Create new subscription
          subscription = await this.createNewSubscription(org.stripe_customer_id, planId, organizationId)
        } else {
          // Update existing subscription
          subscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
            cancel_at_period_end: false,
            items: [
              {
                id: existingSubscription.items.data[0].id,
                price: SUBSCRIPTION_PLANS[planId].stripePriceId,
              },
            ],
          })
        }
      } catch (error) {
        // Create new subscription if existing one is not found
        subscription = await this.createNewSubscription(org.stripe_customer_id, planId, organizationId)
      }
    } else {
      // Create new subscription
      subscription = await this.createNewSubscription(org.stripe_customer_id, planId, organizationId)
    }

    // Update organization
    await supabase
      .from('organizations')
      .update({
        stripe_subscription_id: subscription.id,
        subscription_status: 'active',
        subscription_tier: planId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)

    // Log reactivation
    await this.logSubscriptionChange(organizationId, {
      from: 'cancelled',
      to: planId,
      effectiveDate: new Date(),
      reason: 'reactivation',
    })

    // Send reactivation notification
    await this.getNotificationService().sendSubscriptionReactivation(organizationId, planId)

    return subscription
  }

  async pauseSubscription(
    organizationId: string,
    pauseDuration: number // in days
  ): Promise<Stripe.Subscription> {
    const supabase = await this.supabase

    // Get current subscription
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_subscription_id')
      .eq('id', organizationId)
      .single()

    if (!org?.stripe_subscription_id) {
      throw new Error('No active subscription found')
    }

    const pauseEnd = new Date()
    pauseEnd.setDate(pauseEnd.getDate() + pauseDuration)

    // Pause the subscription
    const pausedSubscription = await stripe.subscriptions.update(org.stripe_subscription_id, {
      pause_collection: {
        behavior: 'void',
        resumes_at: Math.floor(pauseEnd.getTime() / 1000),
      },
      metadata: {
        pausedAt: new Date().toISOString(),
        pauseDuration: pauseDuration.toString(),
      },
    })

    // Update organization status
    await supabase
      .from('organizations')
      .update({
        subscription_status: 'paused',
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)

    return pausedSubscription
  }

  async getSubscriptionMetrics(organizationId: string): Promise<SubscriptionMetrics | null> {
    const supabase = await this.supabase

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (!org?.stripe_subscription_id) {
      return null
    }

    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id)
    const plan = SUBSCRIPTION_PLANS[org.subscription_tier as keyof typeof SUBSCRIPTION_PLANS]

    const mrr = plan.price
    const arr = mrr * 12

    return {
      id: subscription.id,
      organizationId,
      status: subscription.status,
      currentPlan: org.subscription_tier,
      mrr,
      arr,
      trialEndsAt: subscription.trial_end ? new Date(subscription.trial_end * 1000) : undefined,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAt: subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : undefined,
      canceledAt: subscription.canceled_at ? new Date(subscription.canceled_at * 1000) : undefined,
      cancellationReason: subscription.metadata.cancellationReason,
      reactivationEligible: this.isReactivationEligible(subscription),
    }
  }

  async getSubscriptionHistory(
    organizationId: string
  ): Promise<SubscriptionChange[]> {
    const supabase = await this.supabase

    const { data: changes } = await supabase
      .from('subscription_changes')
      .select('*')
      .eq('organization_id', organizationId)
      .order('effective_date', { ascending: false })

    return changes || []
  }

  async processPendingCancellations(): Promise<void> {
    // Get subscriptions that are set to cancel at period end
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      cancel_at_period_end: true,
      limit: 100,
    })

    for (const subscription of subscriptions.data) {
      const organizationId = subscription.metadata.organizationId
      if (!organizationId) continue

      // Check if cancellation date has passed
      if (subscription.current_period_end * 1000 <= Date.now()) {
        await this.finalizeCancellation(organizationId, subscription.id)
      }
    }
  }

  // Private helper methods
  private async calculateProration(
    currentSubscription: Stripe.Subscription,
    newPriceId: string
  ): Promise<number> {
    try {
      const preview = await stripe.invoices.retrieveUpcoming({
        customer: currentSubscription.customer as string,
        subscription: currentSubscription.id,
        subscription_items: [
          {
            id: currentSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        subscription_proration_behavior: 'create_prorations',
      })

      return preview.amount_due
    } catch (error) {
      console.error('Error calculating proration:', error)
      return 0
    }
  }

  private checkUsageViolations(currentUsage: any, newLimits: any): string[] {
    const violations: string[] = []

    if (newLimits.maxUsers !== -1 && currentUsage.users > newLimits.maxUsers) {
      violations.push(`Users (${currentUsage.users}/${newLimits.maxUsers})`)
    }

    if (newLimits.maxContacts !== -1 && currentUsage.contacts > newLimits.maxContacts) {
      violations.push(`Contacts (${currentUsage.contacts}/${newLimits.maxContacts})`)
    }

    if (newLimits.maxMessages !== -1 && currentUsage.messages > newLimits.maxMessages) {
      violations.push(`Messages (${currentUsage.messages}/${newLimits.maxMessages})`)
    }

    return violations
  }

  private async createNewSubscription(
    customerId: string,
    planId: keyof typeof SUBSCRIPTION_PLANS,
    organizationId: string
  ): Promise<Stripe.Subscription> {
    const plan = SUBSCRIPTION_PLANS[planId]

    return await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.stripePriceId }],
      metadata: {
        organizationId,
        planId,
      },
    })
  }

  private isReactivationEligible(subscription: Stripe.Subscription): boolean {
    // Check if subscription was canceled within the last 30 days
    if (!subscription.canceled_at) return false

    const canceledDate = new Date(subscription.canceled_at * 1000)
    const daysSinceCancellation = (Date.now() - canceledDate.getTime()) / (1000 * 60 * 60 * 24)

    return daysSinceCancellation <= 30
  }

  private async logSubscriptionChange(
    organizationId: string,
    change: SubscriptionChange
  ): Promise<void> {
    const supabase = await this.supabase

    await supabase
      .from('subscription_changes')
      .insert({
        organization_id: organizationId,
        from_plan: change.from,
        to_plan: change.to,
        effective_date: change.effectiveDate.toISOString(),
        proration_amount: change.prorationAmount || 0,
        reason: change.reason,
        created_at: new Date().toISOString(),
      })
  }

  private async offerRetentionDiscount(organizationId: string): Promise<void> {
    // Implement retention offer logic
    console.log(`Offering retention discount to organization ${organizationId}`)
  }

  private async finalizeCancellation(organizationId: string, subscriptionId: string): Promise<void> {
    const supabase = await this.supabase

    await supabase
      .from('organizations')
      .update({
        subscription_status: 'cancelled',
        subscription_tier: 'starter',
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)

    // Enforce free tier limits
    await this.getUsageTracker().enforceDowngradeLimits(organizationId, 'starter')
  }
}