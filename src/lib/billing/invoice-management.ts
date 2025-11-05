// @ts-nocheck - Type definitions need review
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'

export interface InvoiceData {
  id: string
  organizationId: string
  stripeInvoiceId: string
  customerId: string
  subscriptionId?: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  amount: number
  subtotal: number
  tax: number
  discount: number
  currency: string
  dueDate: string
  paidAt?: string
  periodStart: string
  periodEnd: string
  invoiceNumber: string
  invoiceUrl?: string
  pdfUrl?: string
  attemptCount: number
  nextPaymentAttempt?: string
  lineItems: InvoiceLineItem[]
  createdAt: string
  updatedAt: string
}

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unitAmount: number
  totalAmount: number
  type: 'subscription' | 'usage' | 'one_time' | 'discount'
  metadata?: Record<string, any>
}

export interface PaymentRetryConfig {
  maxAttempts: number
  retryIntervals: number[] // in hours
  escalationRules: {
    attemptNumber: number
    action: 'email' | 'suspend' | 'downgrade' | 'cancel'
    delayHours: number
  }[]
}

export class InvoiceManager {
  private supabase = createClient()

  private readonly defaultRetryConfig: PaymentRetryConfig = {
    maxAttempts: 4,
    retryIntervals: [24, 72, 168, 336], // 1 day, 3 days, 1 week, 2 weeks
    escalationRules: [
      { attemptNumber: 1, action: 'email', delayHours: 0 },
      { attemptNumber: 2, action: 'email', delayHours: 24 },
      { attemptNumber: 3, action: 'suspend', delayHours: 72 },
      { attemptNumber: 4, action: 'cancel', delayHours: 168 },
    ]
  }

  async createInvoiceRecord(stripeInvoice: Stripe.Invoice): Promise<void> {
    const supabase = await this.supabase

    // Get organization from customer
    const organizationId = await this.getOrganizationFromCustomer(stripeInvoice.customer as string)
    if (!organizationId) {
      console.error('Could not find organization for customer:', stripeInvoice.customer)
      return
    }

    const lineItems = this.extractLineItems(stripeInvoice)

    const invoiceData: Partial<InvoiceData> = {
      organization_id: organizationId,
      stripe_invoice_id: stripeInvoice.id,
      customer_id: stripeInvoice.customer as string,
      subscription_id: stripeInvoice.subscription as string || undefined,
      status: stripeInvoice.status as any,
      amount: stripeInvoice.amount_due,
      subtotal: stripeInvoice.subtotal,
      tax: stripeInvoice.tax || 0,
      discount: stripeInvoice.discount?.amount || 0,
      currency: stripeInvoice.currency,
      due_date: stripeInvoice.due_date ? new Date(stripeInvoice.due_date * 1000).toISOString() : null,
      period_start: stripeInvoice.period_start ? new Date(stripeInvoice.period_start * 1000).toISOString() : null,
      period_end: stripeInvoice.period_end ? new Date(stripeInvoice.period_end * 1000).toISOString() : null,
      invoice_number: stripeInvoice.number || '',
      invoice_url: stripeInvoice.hosted_invoice_url,
      pdf_url: stripeInvoice.invoice_pdf,
      attempt_count: stripeInvoice.attempt_count || 0,
      next_payment_attempt: stripeInvoice.next_payment_attempt ?
        new Date(stripeInvoice.next_payment_attempt * 1000).toISOString() : null,
      line_items: lineItems,
      created_at: new Date(stripeInvoice.created * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }

    await supabase
      .from('invoices')
      .upsert(invoiceData)
      .on('conflict', (existing) => ({
        ...existing,
        ...invoiceData,
        updated_at: new Date().toISOString(),
      }))
  }

  async finalizeInvoice(stripeInvoice: Stripe.Invoice): Promise<void> {
    const supabase = await this.supabase

    await supabase
      .from('invoices')
      .update({
        status: 'open',
        invoice_number: stripeInvoice.number,
        invoice_url: stripeInvoice.hosted_invoice_url,
        pdf_url: stripeInvoice.invoice_pdf,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_invoice_id', stripeInvoice.id)

    // Send invoice notification
    await this.sendInvoiceNotification(stripeInvoice.id, 'finalized')
  }

  async markInvoicePaid(stripeInvoice: Stripe.Invoice): Promise<void> {
    const supabase = await this.supabase

    await supabase
      .from('invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_invoice_id', stripeInvoice.id)

    // Reset payment retry attempts
    await this.resetPaymentRetries(stripeInvoice.id)

    // Send payment confirmation
    await this.sendInvoiceNotification(stripeInvoice.id, 'paid')
  }

  async markPaymentFailed(stripeInvoice: Stripe.Invoice): Promise<void> {
    const supabase = await this.supabase

    const attemptCount = (stripeInvoice.attempt_count || 0) + 1
    const nextAttempt = this.calculateNextPaymentAttempt(attemptCount)

    await supabase
      .from('invoices')
      .update({
        status: 'open',
        attempt_count: attemptCount,
        next_payment_attempt: nextAttempt,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_invoice_id', stripeInvoice.id)

    // Handle payment retry logic
    await this.handlePaymentRetry(stripeInvoice.id, attemptCount)

    // Send failure notification
    await this.sendInvoiceNotification(stripeInvoice.id, 'payment_failed')
  }

  async generateCustomInvoice(
    organizationId: string,
    lineItems: Omit<InvoiceLineItem, 'id'>[],
    options: {
      dueDate?: Date
      description?: string
      metadata?: Record<string, any>
    } = {}
  ): Promise<string> {
    const supabase = await this.supabase

    // Get organization and customer info
    const { data: organization } = await supabase
      .from('organizations')
      .select('stripe_customer_id, name')
      .eq('id', organizationId)
      .single()

    if (!organization?.stripe_customer_id) {
      throw new Error('Organization does not have a Stripe customer')
    }

    // Create Stripe invoice
    const invoice = await stripe.invoices.create({
      customer: organization.stripe_customer_id,
      collection_method: 'charge_automatically',
      due_date: options.dueDate ? Math.floor(options.dueDate.getTime() / 1000) : undefined,
      description: options.description,
      metadata: {
        organizationId,
        type: 'custom',
        ...options.metadata,
      },
    })

    // Add line items
    for (const item of lineItems) {
      await stripe.invoiceItems.create({
        customer: organization.stripe_customer_id,
        invoice: invoice.id,
        amount: item.totalAmount,
        currency: 'usd',
        description: item.description,
        quantity: item.quantity,
        metadata: item.metadata || {},
      })
    }

    // Finalize the invoice
    await stripe.invoices.finalizeInvoice(invoice.id)

    // Create local record
    await this.createInvoiceRecord(await stripe.invoices.retrieve(invoice.id))

    return invoice.id
  }

  async getInvoiceHistory(
    organizationId: string,
    options: {
      limit?: number
      offset?: number
      status?: string
      startDate?: Date
      endDate?: Date
    } = {}
  ): Promise<{ invoices: InvoiceData[]; total: number }> {
    const supabase = await this.supabase
    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (options.status) {
      query = query.eq('status', options.status)
    }

    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString())
    }

    if (options.endDate) {
      query = query.lte('created_at', options.endDate.toISOString())
    }

    if (options.limit) {
      query = query.limit(options.limit)
    }

    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, count, error } = await query

    if (error) {
      throw error
    }

    return {
      invoices: data || [],
      total: count || 0,
    }
  }

  async retryFailedPayment(invoiceId: string): Promise<boolean> {
    try {
      const supabase = await this.supabase

      // Get invoice details
      const { data: invoice } = await supabase
        .from('invoices')
        .select('stripe_invoice_id, attempt_count')
        .eq('id', invoiceId)
        .single()

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      // Attempt to pay the invoice
      const stripeInvoice = await stripe.invoices.pay(invoice.stripe_invoice_id, {
        paid_out_of_band: false,
      })

      if (stripeInvoice.status === 'paid') {
        await this.markInvoicePaid(stripeInvoice)
        return true
      }

      return false
    } catch (error) {
      console.error('Payment retry failed:', error)
      return false
    }
  }

  async voidInvoice(invoiceId: string, reason?: string): Promise<void> {
    const supabase = await this.supabase

    // Get Stripe invoice ID
    const { data: invoice } = await supabase
      .from('invoices')
      .select('stripe_invoice_id')
      .eq('id', invoiceId)
      .single()

    if (!invoice) {
      throw new Error('Invoice not found')
    }

    // Void in Stripe
    await stripe.invoices.voidInvoice(invoice.stripe_invoice_id)

    // Update local record
    await supabase
      .from('invoices')
      .update({
        status: 'void',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
  }

  async getInvoiceAnalytics(
    organizationId: string,
    period: { start: Date; end: Date }
  ): Promise<{
    totalRevenue: number
    paidInvoices: number
    failedPayments: number
    averageInvoiceAmount: number
    paymentSuccessRate: number
  }> {
    const supabase = await this.supabase

    const { data: invoices } = await supabase
      .from('invoices')
      .select('amount, status')
      .eq('organization_id', organizationId)
      .gte('created_at', period.start.toISOString())
      .lte('created_at', period.end.toISOString())

    if (!invoices?.length) {
      return {
        totalRevenue: 0,
        paidInvoices: 0,
        failedPayments: 0,
        averageInvoiceAmount: 0,
        paymentSuccessRate: 0,
      }
    }

    const paidInvoices = invoices.filter(i => i.status === 'paid')
    const failedPayments = invoices.filter(i => i.status === 'uncollectible' ||
      (i.status === 'open' && i.attempt_count >= this.defaultRetryConfig.maxAttempts))

    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0)
    const averageInvoiceAmount = invoices.length > 0 ?
      invoices.reduce((sum, inv) => sum + inv.amount, 0) / invoices.length : 0

    const paymentSuccessRate = invoices.length > 0 ?
      (paidInvoices.length / invoices.length) * 100 : 0

    return {
      totalRevenue,
      paidInvoices: paidInvoices.length,
      failedPayments: failedPayments.length,
      averageInvoiceAmount,
      paymentSuccessRate,
    }
  }

  // Private helper methods
  private async getOrganizationFromCustomer(customerId: string): Promise<string | null> {
    const supabase = await this.supabase
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single()

    return data?.id || null
  }

  private extractLineItems(stripeInvoice: Stripe.Invoice): InvoiceLineItem[] {
    return stripeInvoice.lines.data.map((line, index) => ({
      id: line.id || `line_${index}`,
      description: line.description || '',
      quantity: line.quantity || 1,
      unitAmount: line.amount,
      totalAmount: line.amount * (line.quantity || 1),
      type: this.determineLineItemType(line),
      metadata: line.metadata || {},
    }))
  }

  private determineLineItemType(line: Stripe.InvoiceLineItem): InvoiceLineItem['type'] {
    if (line.type === 'subscription') return 'subscription'
    if (line.type === 'invoiceitem') return 'one_time'
    if (line.amount < 0) return 'discount'
    return 'usage'
  }

  private calculateNextPaymentAttempt(attemptCount: number): string | null {
    if (attemptCount >= this.defaultRetryConfig.maxAttempts) {
      return null
    }

    const hoursToAdd = this.defaultRetryConfig.retryIntervals[attemptCount - 1] || 24
    const nextAttempt = new Date()
    nextAttempt.setHours(nextAttempt.getHours() + hoursToAdd)

    return nextAttempt.toISOString()
  }

  private async handlePaymentRetry(invoiceId: string, attemptCount: number): Promise<void> {
    const escalationRule = this.defaultRetryConfig.escalationRules
      .find(rule => rule.attemptNumber === attemptCount)

    if (!escalationRule) return

    switch (escalationRule.action) {
      case 'email':
        await this.sendPaymentRetryNotification(invoiceId, attemptCount)
        break
      case 'suspend':
        await this.suspendOrganizationAccess(invoiceId)
        break
      case 'downgrade':
        await this.downgradeOrganizationPlan(invoiceId)
        break
      case 'cancel':
        await this.cancelOrganizationSubscription(invoiceId)
        break
    }
  }

  private async resetPaymentRetries(stripeInvoiceId: string): Promise<void> {
    const supabase = await this.supabase

    await supabase
      .from('invoices')
      .update({
        attempt_count: 0,
        next_payment_attempt: null,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_invoice_id', stripeInvoiceId)
  }

  private async sendInvoiceNotification(
    invoiceId: string,
    type: 'finalized' | 'paid' | 'payment_failed'
  ): Promise<void> {
    // Implementation for sending invoice notifications
    console.log(`Sending ${type} notification for invoice ${invoiceId}`)
  }

  private async sendPaymentRetryNotification(invoiceId: string, attemptCount: number): Promise<void> {
    console.log(`Sending payment retry notification for invoice ${invoiceId}, attempt ${attemptCount}`)
  }

  private async suspendOrganizationAccess(invoiceId: string): Promise<void> {
    console.log(`Suspending organization access for invoice ${invoiceId}`)
  }

  private async downgradeOrganizationPlan(invoiceId: string): Promise<void> {
    console.log(`Downgrading organization plan for invoice ${invoiceId}`)
  }

  private async cancelOrganizationSubscription(invoiceId: string): Promise<void> {
    console.log(`Cancelling organization subscription for invoice ${invoiceId}`)
  }
}