// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { requireEnvVar, createBuildSafeService } from '@/lib/build-safe-init'

// Build-safe Stripe client initialization
const stripe = createBuildSafeService(() => {
  return new Stripe(requireEnvVar('STRIPE_SECRET_KEY'), {
    apiVersion: '2024-12-18.acacia',
  })
}, 'Stripe')

// Build-safe subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small businesses',
    price: 29,
    interval: 'month' as const,
    stripePriceId: requireEnvVar('STRIPE_STARTER_PRICE_ID'),
    features: [
      '1,000 messages/month',
      '3 team members',
      'Basic automation',
      'Standard support',
      'WhatsApp integration',
    ],
    limits: {
      maxUsers: 3,
      maxContacts: 1000,
      maxMessages: 1000,
      automationRules: 5,
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'For growing teams',
    price: 79,
    interval: 'month' as const,
    stripePriceId: requireEnvVar('STRIPE_PROFESSIONAL_PRICE_ID'),
    features: [
      '10,000 messages/month',
      '10 team members',
      'Advanced automation',
      'Priority support',
      'WhatsApp integration',
      'Analytics & reports',
      'Custom templates',
    ],
    limits: {
      maxUsers: 10,
      maxContacts: 10000,
      maxMessages: 10000,
      automationRules: 20,
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 199,
    interval: 'month' as const,
    stripePriceId: requireEnvVar('STRIPE_ENTERPRISE_PRICE_ID'),
    features: [
      'Unlimited messages',
      'Unlimited team members',
      'Custom automation',
      '24/7 phone support',
      'WhatsApp integration',
      'Advanced analytics',
      'Custom integrations',
      'SSO & security',
    ],
    limits: {
      maxUsers: -1, // unlimited
      maxContacts: -1,
      maxMessages: -1,
      automationRules: -1,
    }
  }
}

export class StripeService {
  static async createCustomer(organizationId: string, email: string, name: string) {
    const supabase = await createClient()

    // Check if customer already exists
    const { data: organization } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single()

    if (organization?.stripe_customer_id) {
      return organization.stripe_customer_id
    }

    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        organizationId,
      },
    })

    // Update organization with customer ID
    await supabase
      .from('organizations')
      .update({ stripe_customer_id: customer.id })
      .eq('id', organizationId)

    return customer.id
  }

  static async createCheckoutSession(
    organizationId: string,
    planId: keyof typeof SUBSCRIPTION_PLANS,
    customerId?: string
  ) {
    const plan = SUBSCRIPTION_PLANS[planId]
    if (!plan) {
      throw new Error('Invalid plan ID')
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
      metadata: {
        organizationId,
        planId,
      },
    }

    if (customerId) {
      sessionParams.customer = customerId
    }

    const session = await stripe.checkout.sessions.create(sessionParams)
    return session
  }

  static async createPortalSession(customerId: string) {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
    })

    return session
  }

  static async getSubscription(subscriptionId: string) {
    return await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['default_payment_method'],
    })
  }

  static async cancelSubscription(subscriptionId: string) {
    return await stripe.subscriptions.cancel(subscriptionId)
  }

  static async updateSubscription(
    subscriptionId: string,
    planId: keyof typeof SUBSCRIPTION_PLANS
  ) {
    const plan = SUBSCRIPTION_PLANS[planId]
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    return await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: plan.stripePriceId,
        },
      ],
      proration_behavior: 'create_prorations',
    })
  }

  static async handleWebhook(
    rawBody: string,
    signature: string
  ): Promise<Stripe.Event> {
    const endpointSecret = requireEnvVar('STRIPE_WEBHOOK_SECRET')

    try {
      const event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        endpointSecret
      )

      return event
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error}`)
    }
  }

  static async processWebhookEvent(event: Stripe.Event) {
    const supabase = await createClient()

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.updated':
      case 'customer.subscription.created':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`Unhandled webhook event type: ${event.type}`)
    }
  }

  private static async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const supabase = await createClient()
    const { organizationId, planId } = session.metadata!

    if (session.subscription) {
      // Update organization with subscription details
      await supabase
        .from('organizations')
        .update({
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          subscription_status: 'active',
          subscription_tier: planId,
        })
        .eq('id', organizationId)
    }
  }

  private static async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const supabase = await createClient()
    const organizationId = subscription.metadata.organizationId

    if (!organizationId) return

    // Determine plan from price ID
    let planId: keyof typeof SUBSCRIPTION_PLANS = 'starter'
    for (const [key, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
      if (subscription.items.data[0]?.price.id === plan.stripePriceId) {
        planId = key as keyof typeof SUBSCRIPTION_PLANS
        break
      }
    }

    await supabase
      .from('organizations')
      .update({
        subscription_status: subscription.status === 'active' ? 'active' :
                           subscription.status === 'past_due' ? 'past_due' :
                           subscription.status === 'canceled' ? 'cancelled' : 'active',
        subscription_tier: planId,
      })
      .eq('id', organizationId)
  }

  private static async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const supabase = await createClient()
    const organizationId = subscription.metadata.organizationId

    if (!organizationId) return

    await supabase
      .from('organizations')
      .update({
        subscription_status: 'cancelled',
        stripe_subscription_id: null,
      })
      .eq('id', organizationId)
  }

  private static async handlePaymentFailed(invoice: Stripe.Invoice) {
    const supabase = await createClient()

    if (!invoice.subscription) return

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const organizationId = subscription.metadata.organizationId

    if (!organizationId) return

    await supabase
      .from('organizations')
      .update({
        subscription_status: 'past_due',
      })
      .eq('id', organizationId)

    // TODO: Send email notification to organization owner
  }

  static getPlanLimits(planId: string) {
    const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS]
    return plan?.limits || SUBSCRIPTION_PLANS.starter.limits
  }

  static async checkUsageLimits(organizationId: string) {
    const supabase = await createClient()

    const { data: organization } = await supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', organizationId)
      .single()

    if (!organization) return null

    const limits = this.getPlanLimits(organization.subscription_tier)

    // Get current usage
    const [
      { count: userCount },
      { count: contactCount },
    ] = await Promise.all([
      supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),

      supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
    ])

    // Get message count for current month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: messageCount } = await supabase
      .from('messages')
      .select('*, conversation!inner(*)', { count: 'exact', head: true })
      .eq('conversation.organization_id', organizationId)
      .gte('created_at', startOfMonth.toISOString())

    return {
      users: {
        current: userCount || 0,
        limit: limits.maxUsers,
        unlimited: limits.maxUsers === -1,
      },
      contacts: {
        current: contactCount || 0,
        limit: limits.maxContacts,
        unlimited: limits.maxContacts === -1,
      },
      messages: {
        current: messageCount || 0,
        limit: limits.maxMessages,
        unlimited: limits.maxMessages === -1,
      },
    }
  }
}

export { stripe }