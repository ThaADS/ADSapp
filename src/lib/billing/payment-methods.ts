// @ts-nocheck - Type definitions need review
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'

export interface PaymentMethodData {
  id: string
  organizationId: string
  stripePaymentMethodId: string
  customerId: string
  type: 'card' | 'bank_account' | 'sepa_debit' | 'us_bank_account'
  brand?: string
  last4: string
  expiryMonth?: number
  expiryYear?: number
  country?: string
  isDefault: boolean
  isActive: boolean
  failureCount: number
  lastFailure?: {
    code: string
    message: string
    timestamp: string
  }
  createdAt: string
  updatedAt: string
}

export interface PaymentMethodSetupOptions {
  setAsDefault?: boolean
  confirmationMethod?: 'automatic' | 'manual'
  usage?: 'off_session' | 'on_session'
  metadata?: Record<string, string>
}

export interface PaymentRetryStrategy {
  enabled: boolean
  maxRetries: number
  retryIntervals: number[] // in hours
  fallbackMethods: string[] // payment method IDs to try
  notifyCustomer: boolean
}

export class PaymentMethodManager {
  private supabase = createClient()

  async attachPaymentMethod(
    organizationId: string,
    paymentMethodId: string,
    options: PaymentMethodSetupOptions = {}
  ): Promise<PaymentMethodData> {
    const supabase = await this.supabase

    // Get organization's customer ID
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single()

    if (!org?.stripe_customer_id) {
      throw new Error('Organization does not have a Stripe customer')
    }

    // Attach payment method to customer
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: org.stripe_customer_id,
    })

    // Set as default if requested
    if (options.setAsDefault) {
      await stripe.customers.update(org.stripe_customer_id, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      })

      // Update existing default payment methods
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('organization_id', organizationId)
        .eq('is_default', true)
    }

    // Create local record
    const paymentMethodData = this.formatPaymentMethodData(
      paymentMethod,
      organizationId,
      options.setAsDefault || false
    )

    await supabase
      .from('payment_methods')
      .upsert(paymentMethodData)

    return paymentMethodData
  }

  async createSetupIntent(
    organizationId: string,
    options: PaymentMethodSetupOptions = {}
  ): Promise<{ clientSecret: string; setupIntentId: string }> {
    const supabase = await this.supabase

    // Get organization's customer ID
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single()

    if (!org?.stripe_customer_id) {
      throw new Error('Organization does not have a Stripe customer')
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: org.stripe_customer_id,
      usage: options.usage || 'off_session',
      confirm: options.confirmationMethod === 'automatic',
      metadata: {
        organizationId,
        setAsDefault: options.setAsDefault?.toString() || 'false',
        ...options.metadata,
      },
    })

    return {
      clientSecret: setupIntent.client_secret!,
      setupIntentId: setupIntent.id,
    }
  }

  async handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent): Promise<void> {
    const organizationId = setupIntent.metadata.organizationId
    const setAsDefault = setupIntent.metadata.setAsDefault === 'true'

    if (!organizationId || !setupIntent.payment_method) {
      return
    }

    await this.attachPaymentMethod(
      organizationId,
      setupIntent.payment_method as string,
      { setAsDefault }
    )
  }

  async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    const supabase = await this.supabase

    // Get organization from customer
    const organizationId = await this.getOrganizationFromCustomer(paymentMethod.customer as string)
    if (!organizationId) return

    const paymentMethodData = this.formatPaymentMethodData(paymentMethod, organizationId, false)

    await supabase
      .from('payment_methods')
      .upsert(paymentMethodData)
  }

  async handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    const supabase = await this.supabase

    await supabase
      .from('payment_methods')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_method_id', paymentMethod.id)
  }

  async detachPaymentMethod(organizationId: string, paymentMethodId: string): Promise<void> {
    const supabase = await this.supabase

    // Get payment method
    const { data: paymentMethodRecord } = await supabase
      .from('payment_methods')
      .select('stripe_payment_method_id, is_default')
      .eq('id', paymentMethodId)
      .eq('organization_id', organizationId)
      .single()

    if (!paymentMethodRecord) {
      throw new Error('Payment method not found')
    }

    // Check if this is the default method
    if (paymentMethodRecord.is_default) {
      // Check if there are other payment methods to set as default
      const { data: otherMethods } = await supabase
        .from('payment_methods')
        .select('stripe_payment_method_id')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .neq('id', paymentMethodId)
        .limit(1)

      if (otherMethods?.length) {
        // Set another method as default
        await this.setDefaultPaymentMethod(organizationId, otherMethods[0].stripe_payment_method_id)
      }
    }

    // Detach from Stripe
    await stripe.paymentMethods.detach(paymentMethodRecord.stripe_payment_method_id)

    // Update local record
    await supabase
      .from('payment_methods')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentMethodId)
  }

  async setDefaultPaymentMethod(organizationId: string, paymentMethodId: string): Promise<void> {
    const supabase = await this.supabase

    // Get organization and payment method
    const { data: org } = await supabase
      .from('organizations')
      .select('stripe_customer_id')
      .eq('id', organizationId)
      .single()

    if (!org?.stripe_customer_id) {
      throw new Error('Organization does not have a Stripe customer')
    }

    // Update Stripe customer default payment method
    await stripe.customers.update(org.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    })

    // Update local records
    await supabase
      .from('payment_methods')
      .update({ is_default: false })
      .eq('organization_id', organizationId)

    await supabase
      .from('payment_methods')
      .update({ is_default: true })
      .eq('organization_id', organizationId)
      .eq('stripe_payment_method_id', paymentMethodId)
  }

  async getPaymentMethods(organizationId: string): Promise<PaymentMethodData[]> {
    const supabase = await this.supabase

    const { data: paymentMethods } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })

    return paymentMethods || []
  }

  async updatePaymentMethod(
    organizationId: string,
    paymentMethodId: string,
    updates: {
      expiryMonth?: number
      expiryYear?: number
      metadata?: Record<string, string>
    }
  ): Promise<void> {
    const supabase = await this.supabase

    // Get payment method
    const { data: paymentMethodRecord } = await supabase
      .from('payment_methods')
      .select('stripe_payment_method_id')
      .eq('id', paymentMethodId)
      .eq('organization_id', organizationId)
      .single()

    if (!paymentMethodRecord) {
      throw new Error('Payment method not found')
    }

    // Update in Stripe
    const updateData: any = {}
    if (updates.expiryMonth || updates.expiryYear) {
      updateData.card = {
        exp_month: updates.expiryMonth,
        exp_year: updates.expiryYear,
      }
    }
    if (updates.metadata) {
      updateData.metadata = updates.metadata
    }

    if (Object.keys(updateData).length > 0) {
      await stripe.paymentMethods.update(paymentMethodRecord.stripe_payment_method_id, updateData)
    }

    // Update local record
    await supabase
      .from('payment_methods')
      .update({
        expiry_month: updates.expiryMonth,
        expiry_year: updates.expiryYear,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentMethodId)
  }

  async recordPaymentFailure(
    paymentMethodId: string,
    failure: { code: string; message: string }
  ): Promise<void> {
    const supabase = await this.supabase

    await supabase
      .from('payment_methods')
      .update({
        failure_count: supabase.from('payment_methods').select('failure_count').then(data => (data || 0) + 1),
        last_failure: {
          code: failure.code,
          message: failure.message,
          timestamp: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_payment_method_id', paymentMethodId)
  }

  async setupPaymentRetryStrategy(
    organizationId: string,
    strategy: PaymentRetryStrategy
  ): Promise<void> {
    const supabase = await this.supabase

    await supabase
      .from('payment_retry_strategies')
      .upsert({
        organization_id: organizationId,
        enabled: strategy.enabled,
        max_retries: strategy.maxRetries,
        retry_intervals: strategy.retryIntervals,
        fallback_methods: strategy.fallbackMethods,
        notify_customer: strategy.notifyCustomer,
        updated_at: new Date().toISOString(),
      })
  }

  async getPaymentRetryStrategy(organizationId: string): Promise<PaymentRetryStrategy | null> {
    const supabase = await this.supabase

    const { data: strategy } = await supabase
      .from('payment_retry_strategies')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (!strategy) return null

    return {
      enabled: strategy.enabled,
      maxRetries: strategy.max_retries,
      retryIntervals: strategy.retry_intervals,
      fallbackMethods: strategy.fallback_methods,
      notifyCustomer: strategy.notify_customer,
    }
  }

  async processFailedPaymentRetry(
    organizationId: string,
    invoiceId: string,
    attemptNumber: number
  ): Promise<boolean> {
    const strategy = await this.getPaymentRetryStrategy(organizationId)

    if (!strategy?.enabled || attemptNumber > strategy.maxRetries) {
      return false
    }

    const paymentMethods = await this.getPaymentMethods(organizationId)
    const activeMethods = paymentMethods.filter(pm => pm.isActive && pm.failureCount < 3)

    if (activeMethods.length === 0) {
      return false
    }

    // Try primary method first, then fallback methods
    const methodsToTry = [
      ...activeMethods.filter(pm => pm.isDefault),
      ...activeMethods.filter(pm => !pm.isDefault),
    ]

    for (const method of methodsToTry) {
      try {
        // Attempt payment with this method
        const result = await this.attemptInvoicePayment(invoiceId, method.stripePaymentMethodId)
        if (result) {
          return true
        }
      } catch (error) {
        console.error(`Payment attempt failed with method ${method.id}:`, error)
        await this.recordPaymentFailure(method.stripePaymentMethodId, {
          code: 'payment_failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return false
  }

  async validatePaymentMethod(paymentMethodId: string): Promise<{
    valid: boolean
    issues: string[]
  }> {
    try {
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)
      const issues: string[] = []

      if (paymentMethod.card) {
        // Check expiry
        const now = new Date()
        const currentYear = now.getFullYear()
        const currentMonth = now.getMonth() + 1

        if (paymentMethod.card.exp_year < currentYear ||
            (paymentMethod.card.exp_year === currentYear && paymentMethod.card.exp_month < currentMonth)) {
          issues.push('Card has expired')
        }

        // Check for upcoming expiry (next 2 months)
        const expiryDate = new Date(paymentMethod.card.exp_year, paymentMethod.card.exp_month - 1)
        const twoMonthsFromNow = new Date()
        twoMonthsFromNow.setMonth(twoMonthsFromNow.getMonth() + 2)

        if (expiryDate <= twoMonthsFromNow) {
          issues.push('Card expires soon')
        }
      }

      return {
        valid: issues.length === 0,
        issues,
      }
    } catch (error) {
      return {
        valid: false,
        issues: ['Payment method not found or invalid'],
      }
    }
  }

  async getPaymentMethodAnalytics(organizationId: string): Promise<{
    totalMethods: number
    activeMethods: number
    defaultMethod: PaymentMethodData | null
    failureRate: number
    methodTypes: Record<string, number>
    recentFailures: number
  }> {
    const supabase = await this.supabase

    const { data: methods } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('organization_id', organizationId)

    if (!methods?.length) {
      return {
        totalMethods: 0,
        activeMethods: 0,
        defaultMethod: null,
        failureRate: 0,
        methodTypes: {},
        recentFailures: 0,
      }
    }

    const activeMethods = methods.filter(m => m.is_active)
    const defaultMethod = methods.find(m => m.is_default) || null
    const totalFailures = methods.reduce((sum, m) => sum + m.failure_count, 0)
    const failureRate = totalFailures / methods.length

    const methodTypes = methods.reduce((acc, method) => {
      acc[method.type] = (acc[method.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Count recent failures (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentFailures = methods.filter(m =>
      m.last_failure && new Date(m.last_failure.timestamp) >= thirtyDaysAgo
    ).length

    return {
      totalMethods: methods.length,
      activeMethods: activeMethods.length,
      defaultMethod,
      failureRate,
      methodTypes,
      recentFailures,
    }
  }

  // Private helper methods
  private formatPaymentMethodData(
    stripePaymentMethod: Stripe.PaymentMethod,
    organizationId: string,
    isDefault: boolean
  ): Partial<PaymentMethodData> {
    const baseData = {
      organization_id: organizationId,
      stripe_payment_method_id: stripePaymentMethod.id,
      customer_id: stripePaymentMethod.customer as string,
      type: stripePaymentMethod.type as PaymentMethodData['type'],
      is_default: isDefault,
      is_active: true,
      failure_count: 0,
      created_at: new Date(stripePaymentMethod.created * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (stripePaymentMethod.card) {
      return {
        ...baseData,
        brand: stripePaymentMethod.card.brand,
        last4: stripePaymentMethod.card.last4,
        expiry_month: stripePaymentMethod.card.exp_month,
        expiry_year: stripePaymentMethod.card.exp_year,
        country: stripePaymentMethod.card.country,
      }
    }

    if (stripePaymentMethod.us_bank_account) {
      return {
        ...baseData,
        last4: stripePaymentMethod.us_bank_account.last4,
        brand: stripePaymentMethod.us_bank_account.bank_name,
      }
    }

    return baseData
  }

  private async getOrganizationFromCustomer(customerId: string): Promise<string | null> {
    const supabase = await this.supabase
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    return data?.id || null
  }

  private async attemptInvoicePayment(invoiceId: string, paymentMethodId: string): Promise<boolean> {
    try {
      const invoice = await stripe.invoices.pay(invoiceId, {
        payment_method: paymentMethodId,
      })

      return invoice.status === 'paid'
    } catch (error) {
      console.error('Invoice payment attempt failed:', error)
      return false
    }
  }
}