// @ts-nocheck - Database types need regeneration from Supabase schema
/**
 * Stripe Payment Links Service
 * Create and manage payment links for WhatsApp conversations
 */

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { requireEnvVar, createBuildSafeService } from '@/lib/build-safe-init'

// Build-safe Stripe client initialization
const stripe = createBuildSafeService(() => {
  return new Stripe(requireEnvVar('STRIPE_SECRET_KEY'), {
    apiVersion: '2024-12-18.acacia',
  })
}, 'Stripe')

export interface PaymentLinkData {
  id: string
  organizationId: string
  name: string
  description?: string
  amount: number // in cents
  currency: string
  stripePaymentLinkId: string
  stripePaymentLinkUrl: string
  stripePriceId: string
  status: 'active' | 'inactive' | 'archived'
  useCount: number
  createdAt: string
  updatedAt: string
}

export interface CreatePaymentLinkOptions {
  name: string
  description?: string
  amount: number // in cents
  currency?: string
  quantity?: number
  allowCustomQuantity?: boolean
  collectShipping?: boolean
  collectBillingAddress?: boolean
  customMessage?: string
  organizationId: string
  conversationId?: string
  contactId?: string
}

export interface SendPaymentOptions {
  paymentLinkId: string
  conversationId: string
  contactId: string
  personalMessage?: string
}

export class PaymentLinksService {
  /**
   * Create a new payment link
   */
  static async createPaymentLink(options: CreatePaymentLinkOptions): Promise<PaymentLinkData> {
    const supabase = await createClient()

    const {
      name,
      description,
      amount,
      currency = 'eur',
      quantity = 1,
      allowCustomQuantity = false,
      collectShipping = false,
      collectBillingAddress = true,
      customMessage,
      organizationId,
    } = options

    // Get organization for metadata
    const { data: org } = await supabase
      .from('organizations')
      .select('name, stripe_customer_id')
      .eq('id', organizationId)
      .single()

    // Create a Stripe price
    const price = await stripe.prices.create({
      currency,
      unit_amount: amount,
      product_data: {
        name,
        description: description || `Payment for ${name}`,
        metadata: {
          organizationId,
          source: 'whatsapp_payment_link',
        },
      },
    })

    // Create the payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: price.id,
          quantity,
          adjustable_quantity: allowCustomQuantity
            ? {
                enabled: true,
                minimum: 1,
                maximum: 99,
              }
            : undefined,
        },
      ],
      billing_address_collection: collectBillingAddress ? 'required' : 'auto',
      shipping_address_collection: collectShipping
        ? {
            allowed_countries: ['NL', 'BE', 'DE', 'FR', 'GB', 'US'],
          }
        : undefined,
      metadata: {
        organizationId,
        paymentLinkName: name,
        source: 'whatsapp',
      },
      custom_text: customMessage
        ? {
            submit: {
              message: customMessage,
            },
          }
        : undefined,
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success?link_id={CHECKOUT_SESSION_ID}`,
        },
      },
    })

    // Store in database
    const { data: storedLink, error } = await supabase
      .from('payment_links')
      .insert({
        organization_id: organizationId,
        name,
        description,
        amount,
        currency,
        stripe_payment_link_id: paymentLink.id,
        stripe_payment_link_url: paymentLink.url,
        stripe_price_id: price.id,
        status: 'active',
        use_count: 0,
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: storedLink.id,
      organizationId: storedLink.organization_id,
      name: storedLink.name,
      description: storedLink.description,
      amount: storedLink.amount,
      currency: storedLink.currency,
      stripePaymentLinkId: storedLink.stripe_payment_link_id,
      stripePaymentLinkUrl: storedLink.stripe_payment_link_url,
      stripePriceId: storedLink.stripe_price_id,
      status: storedLink.status,
      useCount: storedLink.use_count,
      createdAt: storedLink.created_at,
      updatedAt: storedLink.updated_at,
    }
  }

  /**
   * List payment links for an organization
   */
  static async listPaymentLinks(
    organizationId: string,
    options: { status?: string; limit?: number; offset?: number } = {}
  ): Promise<{ links: PaymentLinkData[]; total: number }> {
    const supabase = await createClient()
    const { status = 'active', limit = 20, offset = 0 } = options

    let query = supabase
      .from('payment_links')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, count, error } = await query

    if (error) throw error

    return {
      links: (data || []).map(link => ({
        id: link.id,
        organizationId: link.organization_id,
        name: link.name,
        description: link.description,
        amount: link.amount,
        currency: link.currency,
        stripePaymentLinkId: link.stripe_payment_link_id,
        stripePaymentLinkUrl: link.stripe_payment_link_url,
        stripePriceId: link.stripe_price_id,
        status: link.status,
        useCount: link.use_count,
        createdAt: link.created_at,
        updatedAt: link.updated_at,
      })),
      total: count || 0,
    }
  }

  /**
   * Get a specific payment link
   */
  static async getPaymentLink(
    paymentLinkId: string,
    organizationId: string
  ): Promise<PaymentLinkData | null> {
    const supabase = await createClient()

    const { data: link, error } = await supabase
      .from('payment_links')
      .select('*')
      .eq('id', paymentLinkId)
      .eq('organization_id', organizationId)
      .single()

    if (error || !link) return null

    return {
      id: link.id,
      organizationId: link.organization_id,
      name: link.name,
      description: link.description,
      amount: link.amount,
      currency: link.currency,
      stripePaymentLinkId: link.stripe_payment_link_id,
      stripePaymentLinkUrl: link.stripe_payment_link_url,
      stripePriceId: link.stripe_price_id,
      status: link.status,
      useCount: link.use_count,
      createdAt: link.created_at,
      updatedAt: link.updated_at,
    }
  }

  /**
   * Update payment link status
   */
  static async updatePaymentLinkStatus(
    paymentLinkId: string,
    organizationId: string,
    status: 'active' | 'inactive' | 'archived'
  ): Promise<boolean> {
    const supabase = await createClient()

    // Get link to get Stripe ID
    const { data: link } = await supabase
      .from('payment_links')
      .select('stripe_payment_link_id')
      .eq('id', paymentLinkId)
      .eq('organization_id', organizationId)
      .single()

    if (!link) return false

    // Update in Stripe
    await stripe.paymentLinks.update(link.stripe_payment_link_id, {
      active: status === 'active',
    })

    // Update in database
    const { error } = await supabase
      .from('payment_links')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentLinkId)
      .eq('organization_id', organizationId)

    return !error
  }

  /**
   * Record payment link usage
   */
  static async recordUsage(paymentLinkId: string, conversationId: string, contactId: string) {
    const supabase = await createClient()

    // Increment use count
    await supabase.rpc('increment_payment_link_usage', {
      link_id: paymentLinkId,
    })

    // Record in payment_link_sends table
    await supabase.from('payment_link_sends').insert({
      payment_link_id: paymentLinkId,
      conversation_id: conversationId,
      contact_id: contactId,
      sent_at: new Date().toISOString(),
    })
  }

  /**
   * Get payment link analytics
   */
  static async getPaymentLinkAnalytics(organizationId: string, dateRange?: { start: Date; end: Date }) {
    const supabase = await createClient()

    let query = supabase
      .from('payment_link_sends')
      .select(`
        *,
        payment_links!inner(organization_id, amount, currency, name)
      `)
      .eq('payment_links.organization_id', organizationId)

    if (dateRange) {
      query = query
        .gte('sent_at', dateRange.start.toISOString())
        .lte('sent_at', dateRange.end.toISOString())
    }

    const { data: sends, error } = await query

    if (error) throw error

    // Calculate metrics
    const totalSent = sends?.length || 0
    const uniqueLinks = new Set(sends?.map(s => s.payment_link_id)).size
    const totalAmount = sends?.reduce((sum, s) => sum + (s.payment_links?.amount || 0), 0) || 0

    return {
      totalSent,
      uniqueLinks,
      potentialRevenue: totalAmount / 100, // Convert from cents
      sends: sends || [],
    }
  }

  /**
   * Handle successful payment webhook
   */
  static async handlePaymentSuccess(checkoutSession: Stripe.Checkout.Session) {
    const supabase = await createClient()
    const { organizationId, paymentLinkName } = checkoutSession.metadata || {}

    if (!organizationId) return

    // Find the payment link
    const { data: link } = await supabase
      .from('payment_links')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('name', paymentLinkName)
      .single()

    if (!link) return

    // Record successful payment
    await supabase.from('payment_link_payments').insert({
      payment_link_id: link.id,
      stripe_checkout_session_id: checkoutSession.id,
      stripe_payment_intent_id: checkoutSession.payment_intent as string,
      amount: checkoutSession.amount_total,
      currency: checkoutSession.currency,
      customer_email: checkoutSession.customer_details?.email,
      status: 'completed',
      paid_at: new Date().toISOString(),
    })
  }

  /**
   * Generate WhatsApp message with payment link
   */
  static generateWhatsAppMessage(
    paymentLink: PaymentLinkData,
    personalMessage?: string
  ): string {
    const amount = (paymentLink.amount / 100).toLocaleString('nl-NL', {
      style: 'currency',
      currency: paymentLink.currency.toUpperCase(),
    })

    let message = personalMessage
      ? `${personalMessage}\n\n`
      : ''

    message += `=³ *Betaalverzoek: ${paymentLink.name}*\n`
    message += `=° Bedrag: ${amount}\n`

    if (paymentLink.description) {
      message += `=Ý ${paymentLink.description}\n`
    }

    message += `\n= Klik hier om te betalen:\n${paymentLink.stripePaymentLinkUrl}`

    return message
  }
}

export { stripe }
