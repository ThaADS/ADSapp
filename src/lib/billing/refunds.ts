/**
 * =================================================
 * Complete refund processing with admin authorization, Stripe API integration,
 * subscription management, and comprehensive audit logging.
 *
 * Security: CVSS 6.5 - Financial operations with strict access control
 * Compliance: PCI DSS, Financial regulations, Audit requirements
 */

import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/server'
import { NotificationService } from './notification-service'

export interface RefundRequest {
  organizationId: string
  subscriptionId?: string
  chargeId?: string
  amount: number // in cents
  currency: string
  refundType: 'full' | 'partial' | 'prorated'
  reason:
    | 'requested_by_customer'
    | 'duplicate_payment'
    | 'fraudulent'
    | 'service_not_provided'
    | 'technical_issue'
    | 'billing_error'
    | 'other'
  reasonDetails?: string
  cancelSubscription: boolean
  requestedBy: string // User ID of admin requesting refund
}

export interface RefundResult {
  refundId: string
  stripeRefundId: string
  status: 'completed' | 'pending' | 'failed'
  amount: number
  currency: string
  subscriptionCancelled: boolean
  error?: string
  errorCode?: string
}

export interface RefundEligibility {
  eligible: boolean
  reason?: string
  checks: {
    hasActiveSubscription: boolean
    underRefundLimit: boolean
    hasRecentPayment: boolean
    subscriptionAge: number // in days
  }
  recentRefundsCount: number
  maxRefundsAllowed: number
}

export class RefundManager {
  private notificationService: NotificationService

  constructor() {
    this.notificationService = new NotificationService()
  }

  /**
   * Process a complete refund workflow
   * 1. Validate eligibility
   * 2. Create refund request in database
   * 3. Process refund via Stripe
   * 4. Update subscription status if needed
   * 5. Send notifications
   */
  async processRefund(request: RefundRequest): Promise<RefundResult> {
    const supabase = await createClient()

    try {
      // 1. Validate authorization (must be super admin)
      const isAuthorized = await this.validateAdminAuthorization(request.requestedBy)
      if (!isAuthorized) {
        throw new Error('Unauthorized: Only super admins can process refunds')
      }

      // 2. Check refund eligibility
      const eligibility = await this.checkRefundEligibility(
        request.organizationId,
        request.subscriptionId
      )
      if (!eligibility.eligible) {
        throw new Error(`Refund not eligible: ${eligibility.reason}`)
      }

      // 3. Get organization and payment details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, stripe_customer_id, stripe_subscription_id, subscription_status')
        .eq('id', request.organizationId)
        .single()

      if (orgError || !org) {
        throw new Error('Organization not found')
      }

      if (!org.stripe_customer_id) {
        throw new Error('Organization has no Stripe customer')
      }

      // 4. Calculate refund amount
      const refundAmount = await this.calculateRefundAmount(request, org.stripe_subscription_id)

      // 5. Create refund request in database
      const { data: dbRefund, error: dbError } = await supabase.rpc('create_refund_request', {
        p_organization_id: request.organizationId,
        p_stripe_subscription_id: request.subscriptionId || org.stripe_subscription_id,
        p_amount_cents: refundAmount,
        p_currency: request.currency,
        p_refund_type: request.refundType,
        p_reason: request.reason,
        p_reason_details: request.reasonDetails,
        p_cancel_subscription: request.cancelSubscription,
        p_requested_by: request.requestedBy,
      })

      if (dbError) {
        throw new Error(`Failed to create refund request: ${dbError.message}`)
      }

      const refundId = dbRefund

      // 6. Update refund status to processing
      await supabase
        .from('refunds')
        .update({
          status: 'processing',
          processed_by: request.requestedBy,
        })
        .eq('id', refundId)

      // 7. Process refund via Stripe
      let stripeRefund: Stripe.Refund
      try {
        stripeRefund = await this.processStripeRefund(
          org.stripe_customer_id,
          refundAmount,
          request.currency,
          request.chargeId,
          request.reasonDetails
        )
      } catch (stripeError) {
        // Mark refund as failed
        await this.failRefund(refundId, stripeError)
        throw stripeError
      }

      // 8. Complete refund in database
      await supabase.rpc('complete_refund', {
        p_refund_id: refundId,
        p_stripe_refund_id: stripeRefund.id,
        p_stripe_charge_id: stripeRefund.charge as string,
      })

      // 9. Cancel subscription if requested
      let subscriptionCancelled = false
      if (request.cancelSubscription && org.stripe_subscription_id) {
        await this.cancelSubscriptionAfterRefund(org.stripe_subscription_id, request.organizationId)
        subscriptionCancelled = true
      }

      // 10. Send notifications
      await this.sendRefundNotifications(
        request.organizationId,
        refundId,
        refundAmount,
        request.currency
      )

      return {
        refundId,
        stripeRefundId: stripeRefund.id,
        status: 'completed',
        amount: refundAmount,
        currency: request.currency,
        subscriptionCancelled,
      }
    } catch (error) {
      const err = error as Error
      console.error('Refund processing error:', err)

      return {
        refundId: '',
        stripeRefundId: '',
        status: 'failed',
        amount: request.amount,
        currency: request.currency,
        subscriptionCancelled: false,
        error: err.message,
        errorCode: 'REFUND_PROCESSING_ERROR',
      }
    }
  }

  /**
   * Validate that the requesting user is a super admin
   */
  private async validateAdminAuthorization(userId: string): Promise<boolean> {
    const supabase = await createClient()

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      return false
    }

    // Only super admins can process refunds
    return profile.role === 'super_admin'
  }

  /**
   * Check if organization is eligible for refund
   */
  async checkRefundEligibility(
    organizationId: string,
    subscriptionId?: string
  ): Promise<RefundEligibility> {
    const supabase = await createClient()

    // Use database function for eligibility check
    const { data, error } = await supabase.rpc('check_refund_eligibility', {
      p_organization_id: organizationId,
      p_stripe_subscription_id: subscriptionId || null,
    })

    if (error) {
      return {
        eligible: false,
        reason: 'Failed to check eligibility',
        checks: {
          hasActiveSubscription: false,
          underRefundLimit: false,
          hasRecentPayment: false,
          subscriptionAge: 0,
        },
        recentRefundsCount: 0,
        maxRefundsAllowed: 3,
      }
    }

    return {
      eligible: data.eligible,
      reason: data.eligible ? undefined : 'Eligibility checks failed',
      checks: data.checks,
      recentRefundsCount: data.recent_refunds_count,
      maxRefundsAllowed: 3,
    }
  }

  /**
   * Calculate refund amount based on refund type
   */
  private async calculateRefundAmount(
    request: RefundRequest,
    subscriptionId?: string | null
  ): Promise<number> {
    if (request.refundType === 'full') {
      // For full refunds, refund the entire amount
      return request.amount
    }

    if (request.refundType === 'partial') {
      // For partial refunds, use the specified amount
      return request.amount
    }

    if (request.refundType === 'prorated') {
      // For prorated refunds, calculate based on remaining subscription time
      if (!subscriptionId) {
        throw new Error('Subscription ID required for prorated refund')
      }

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)

      const now = Math.floor(Date.now() / 1000)
      const periodEnd = subscription.current_period_end
      const periodStart = subscription.current_period_start
      const totalPeriod = periodEnd - periodStart
      const remainingPeriod = periodEnd - now

      if (remainingPeriod <= 0) {
        throw new Error('Subscription period has already ended')
      }

      // Calculate prorated amount
      const proratedAmount = Math.floor((request.amount * remainingPeriod) / totalPeriod)

      return proratedAmount
    }

    throw new Error(`Invalid refund type: ${request.refundType}`)
  }

  /**
   * Process refund through Stripe API
   */
  private async processStripeRefund(
    customerId: string,
    amount: number,
    currency: string,
    chargeId?: string,
    reason?: string
  ): Promise<Stripe.Refund> {
    try {
      // If chargeId is provided, refund specific charge
      if (chargeId) {
        return await stripe.refunds.create({
          charge: chargeId,
          amount,
          reason: 'requested_by_customer',
          metadata: {
            customerId,
            refundReason: reason || 'Refund requested',
          },
        })
      }

      // Otherwise, find the most recent charge for this customer
      const charges = await stripe.charges.list({
        customer: customerId,
        limit: 1,
      })

      if (charges.data.length === 0) {
        throw new Error('No charges found for customer')
      }

      const latestCharge = charges.data[0]

      // Check if charge is refundable
      if (latestCharge.refunded) {
        throw new Error('Charge has already been refunded')
      }

      if (amount > latestCharge.amount) {
        throw new Error(`Refund amount (${amount}) exceeds charge amount (${latestCharge.amount})`)
      }

      // Create refund
      return await stripe.refunds.create({
        charge: latestCharge.id,
        amount,
        reason: 'requested_by_customer',
        metadata: {
          customerId,
          refundReason: reason || 'Refund requested',
        },
      })
    } catch (error) {
      const err = error as Stripe.errors.StripeError
      console.error('Stripe refund error:', err)
      throw new Error(`Stripe refund failed: ${err.message}`)
    }
  }

  /**
   * Cancel subscription after refund
   */
  private async cancelSubscriptionAfterRefund(
    subscriptionId: string,
    organizationId: string
  ): Promise<void> {
    const supabase = await createClient()

    try {
      // Cancel subscription in Stripe
      await stripe.subscriptions.cancel(subscriptionId)

      // Update organization in database
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'cancelled',
          subscription_tier: 'starter',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizationId)
    } catch (error) {
      console.error('Subscription cancellation error:', error)
      throw new Error('Failed to cancel subscription after refund')
    }
  }

  /**
   * Mark refund as failed
   */
  private async failRefund(refundId: string, error: unknown): Promise<void> {
    const supabase = await createClient()
    const err = error as Error

    await supabase.rpc('fail_refund', {
      p_refund_id: refundId,
      p_error_message: err.message,
      p_error_code: (error as any).code || 'UNKNOWN_ERROR',
    })
  }

  /**
   * Send refund notifications to organization
   */
  private async sendRefundNotifications(
    organizationId: string,
    refundId: string,
    amount: number,
    currency: string
  ): Promise<void> {
    try {
      await this.notificationService.sendRefundCompleted(
        organizationId,
        refundId,
        amount / 100, // Convert cents to dollars
        currency
      )
    } catch (error) {
      console.error('Failed to send refund notification:', error)
      // Don't throw - notification failures shouldn't break refund processing
    }
  }

  /**
   * Get refund details by ID
   */
  async getRefund(refundId: string): Promise<any> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('refunds')
      .select(
        `
        *,
        organizations (
          id,
          name,
          slug
        ),
        requested_by:profiles!refunds_requested_by_fkey (
          id,
          full_name,
          email
        ),
        approved_by:profiles!refunds_approved_by_fkey (
          id,
          full_name,
          email
        )
      `
      )
      .eq('id', refundId)
      .single()

    if (error) {
      throw new Error(`Failed to get refund: ${error.message}`)
    }

    return data
  }

  /**
   * List refunds with filtering
   */
  async listRefunds(filters: {
    organizationId?: string
    status?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<{ refunds: any[]; totalCount: number }> {
    const supabase = await createClient()

    let query = supabase.from('refunds').select(
      `
        *,
        organizations (
          id,
          name,
          slug
        )
      `,
      { count: 'exact' }
    )

    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.startDate) {
      query = query.gte('requested_at', filters.startDate)
    }

    if (filters.endDate) {
      query = query.lte('requested_at', filters.endDate)
    }

    const limit = filters.limit || 50
    const offset = filters.offset || 0

    query = query.order('requested_at', { ascending: false }).range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      throw new Error(`Failed to list refunds: ${error.message}`)
    }

    return {
      refunds: data || [],
      totalCount: count || 0,
    }
  }

  /**
   * Get refund statistics
   */
  async getRefundStatistics(startDate?: string, endDate?: string): Promise<any> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('refund_statistics')
      .select('*')
      .gte('month', startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString())
      .lte('month', endDate || new Date().toISOString())
      .order('month', { ascending: false })

    if (error) {
      throw new Error(`Failed to get refund statistics: ${error.message}`)
    }

    return data || []
  }

  /**
   * Approve pending refund (super admin only)
   */
  async approveRefund(refundId: string, approvedBy: string): Promise<void> {
    const supabase = await createClient()

    // Validate authorization
    const isAuthorized = await this.validateAdminAuthorization(approvedBy)
    if (!isAuthorized) {
      throw new Error('Unauthorized: Only super admins can approve refunds')
    }

    const { error } = await supabase.rpc('approve_refund', {
      p_refund_id: refundId,
      p_approved_by: approvedBy,
    })

    if (error) {
      throw new Error(`Failed to approve refund: ${error.message}`)
    }
  }

  /**
   * Cancel pending refund request
   */
  async cancelRefund(refundId: string, cancelledBy: string): Promise<void> {
    const supabase = await createClient()

    // Validate authorization
    const isAuthorized = await this.validateAdminAuthorization(cancelledBy)
    if (!isAuthorized) {
      throw new Error('Unauthorized: Only super admins can cancel refunds')
    }

    const { error } = await supabase
      .from('refunds')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', refundId)
      .eq('status', 'pending') // Can only cancel pending refunds

    if (error) {
      throw new Error(`Failed to cancel refund: ${error.message}`)
    }
  }

  /**
   * Get refund history for an organization
   */
  async getRefundHistory(organizationId: string): Promise<any[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('refund_history')
      .select(
        `
        *,
        refunds!inner (
          id,
          organization_id,
          amount_cents,
          currency,
          refund_type,
          reason
        ),
        changed_by:profiles (
          id,
          full_name,
          email
        )
      `
      )
      .eq('refunds.organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get refund history: ${error.message}`)
    }

    return data || []
  }

  /**
   * Validate refund amount limits
   */
  validateRefundAmount(amount: number, maxAmount: number): boolean {
    if (amount <= 0) {
      throw new Error('Refund amount must be greater than zero')
    }

    if (amount > maxAmount) {
      throw new Error(`Refund amount (${amount}) exceeds maximum allowed (${maxAmount})`)
    }

    return true
  }

  /**
   * Get pending refund notifications
   */
  async getPendingNotifications(): Promise<any[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('refund_notifications')
      .select(
        `
        *,
        refunds (
          id,
          organization_id,
          amount_cents,
          currency,
          status
        )
      `
      )
      .eq('sent', false)
      .order('created_at', { ascending: true })
      .limit(100)

    if (error) {
      throw new Error(`Failed to get pending notifications: ${error.message}`)
    }

    return data || []
  }

  /**
   * Mark notification as sent
   */
  async markNotificationSent(notificationId: string): Promise<void> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('refund_notifications')
      .update({
        sent: true,
        sent_at: new Date().toISOString(),
      })
      .eq('id', notificationId)

    if (error) {
      throw new Error(`Failed to mark notification as sent: ${error.message}`)
    }
  }
}

export default RefundManager
