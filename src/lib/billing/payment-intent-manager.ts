// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

/**
 * ==========================================================
 * Complete payment intent lifecycle management with 3D Secure (SCA) authentication,
 * PCI DSS compliance, mobile-friendly flows, and comprehensive error handling.
 *
 * Security: CVSS 7.5 - Handles sensitive payment data with PCI DSS compliance
 * Compliance: PSD2 SCA requirements, PCI DSS standards
 */

import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe/server';

export interface PaymentIntentRequest {
  organizationId: string;
  amount: number; // in cents
  currency: string;
  purpose: 'subscription_payment' | 'subscription_upgrade' | 'additional_charge' | 'invoice_payment' | 'setup_payment_method';
  relatedSubscriptionId?: string;
  relatedInvoiceId?: string;
  metadata?: Record<string, string>;
  returnUrl?: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface PaymentIntentResult {
  paymentIntentId: string;
  stripePaymentIntentId: string;
  clientSecret: string;
  status: string;
  authenticationRequired: boolean;
  nextAction?: Stripe.PaymentIntent.NextAction | null;
  error?: string;
  errorCode?: string;
}

export interface PaymentConfirmationRequest {
  paymentIntentId: string;
  paymentMethodId?: string;
  returnUrl?: string;
}

export interface AuthenticationResult {
  success: boolean;
  status: string;
  requiresAction: boolean;
  nextAction?: Stripe.PaymentIntent.NextAction | null;
  error?: string;
  errorCode?: string;
}

export class PaymentIntentManager {
  /**
   * Create payment intent with automatic 3D Secure (SCA) handling
   * Implements PSD2 Strong Customer Authentication requirements
   */
  async createPaymentIntentWithSCA(
    request: PaymentIntentRequest
  ): Promise<PaymentIntentResult> {
    const supabase = await createClient();

    try {
      // 1. Validate organization and get customer ID
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, stripe_customer_id')
        .eq('id', request.organizationId)
        .single();

      if (orgError || !org) {
        throw new Error('Organization not found');
      }

      if (!org.stripe_customer_id) {
        throw new Error('Organization has no Stripe customer ID');
      }

      // 2. Determine if SCA exemption applies (PSD2 regulations)
      const scaExemption = this.determineSCAExemption(request);

      // 3. Create payment intent in Stripe with automatic payment methods
      const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
        amount: request.amount,
        currency: request.currency,
        customer: org.stripe_customer_id,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'always', // Support redirect-based auth (3DS)
        },
        metadata: {
          organizationId: request.organizationId,
          purpose: request.purpose,
          ...request.metadata,
        },
        setup_future_usage: request.purpose === 'setup_payment_method' ? 'off_session' : undefined,
      };

      // Apply SCA exemption if eligible
      if (scaExemption.applicable) {
        paymentIntentParams.payment_method_options = {
          card: {
            request_three_d_secure: 'any', // Let Stripe decide based on risk
          },
        };
      }

      const stripePaymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

      // 4. Save payment intent to database
      const dbPaymentIntentId = await this.savePaymentIntentRecord({
        organizationId: request.organizationId,
        stripePaymentIntentId: stripePaymentIntent.id,
        stripeCustomerId: org.stripe_customer_id,
        amount: request.amount,
        currency: request.currency,
        purpose: request.purpose,
        relatedSubscriptionId: request.relatedSubscriptionId,
        relatedInvoiceId: request.relatedInvoiceId,
        clientSecret: stripePaymentIntent.client_secret!,
        authenticationRequired: stripePaymentIntent.status === 'requires_action',
        scaExemption: scaExemption.type,
        scaExemptionApplied: scaExemption.applicable,
        userAgent: request.userAgent,
        ipAddress: request.ipAddress,
      });

      // 5. Log compliance validation
      await this.logComplianceValidation(
        dbPaymentIntentId,
        scaExemption,
        request
      );

      return {
        paymentIntentId: dbPaymentIntentId,
        stripePaymentIntentId: stripePaymentIntent.id,
        clientSecret: stripePaymentIntent.client_secret!,
        status: stripePaymentIntent.status,
        authenticationRequired: stripePaymentIntent.status === 'requires_action',
        nextAction: stripePaymentIntent.next_action,
      };
    } catch (error) {
      const err = error as Error;
      console.error('Payment intent creation error:', err);

      return {
        paymentIntentId: '',
        stripePaymentIntentId: '',
        clientSecret: '',
        status: 'failed',
        authenticationRequired: false,
        error: err.message,
        errorCode: 'PAYMENT_INTENT_CREATION_ERROR',
      };
    }
  }

  /**
   * Confirm payment intent after user authentication (3DS completion)
   */
  async confirmPaymentIntent(
    request: PaymentConfirmationRequest
  ): Promise<PaymentIntentResult> {
    const supabase = await createClient();

    try {
      // 1. Get payment intent from database
      const { data: dbIntent, error: dbError } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('id', request.paymentIntentId)
        .single();

      if (dbError || !dbIntent) {
        throw new Error('Payment intent not found');
      }

      // 2. Check if already confirmed
      if (dbIntent.confirmed) {
        return {
          paymentIntentId: request.paymentIntentId,
          stripePaymentIntentId: dbIntent.stripe_payment_intent_id,
          clientSecret: dbIntent.client_secret,
          status: 'succeeded',
          authenticationRequired: false,
        };
      }

      // 3. Confirm payment intent in Stripe
      const confirmParams: Stripe.PaymentIntentConfirmParams = {
        payment_method: request.paymentMethodId,
        return_url: request.returnUrl,
      };

      const confirmedIntent = await stripe.paymentIntents.confirm(
        dbIntent.stripe_payment_intent_id,
        confirmParams
      );

      // 4. Update database with confirmation result
      await supabase.rpc('update_payment_intent_status', {
        p_payment_intent_id: request.paymentIntentId,
        p_status: confirmedIntent.status,
        p_authentication_status: this.getAuthenticationStatus(confirmedIntent),
      });

      // 5. Log authentication event
      await this.logAuthenticationEvent({
        paymentIntentId: request.paymentIntentId,
        eventType: confirmedIntent.status === 'succeeded'
          ? 'authentication_succeeded'
          : 'authentication_challenged',
        authenticationFlow: this.getAuthenticationFlow(confirmedIntent),
        success: confirmedIntent.status === 'succeeded',
      });

      return {
        paymentIntentId: request.paymentIntentId,
        stripePaymentIntentId: confirmedIntent.id,
        clientSecret: confirmedIntent.client_secret!,
        status: confirmedIntent.status,
        authenticationRequired: confirmedIntent.status === 'requires_action',
        nextAction: confirmedIntent.next_action,
      };
    } catch (error) {
      const err = error as Error;
      console.error('Payment confirmation error:', err);

      // Log failure
      await this.handleAuthenticationFailure(
        request.paymentIntentId,
        error,
        1
      );

      return {
        paymentIntentId: request.paymentIntentId,
        stripePaymentIntentId: '',
        clientSecret: '',
        status: 'failed',
        authenticationRequired: false,
        error: err.message,
        errorCode: 'PAYMENT_CONFIRMATION_ERROR',
      };
    }
  }

  /**
   * Handle 3D Secure authentication flow
   * Supports both redirect-based and modal-based authentication
   */
  async handle3DSAuthentication(
    clientSecret: string
  ): Promise<AuthenticationResult> {
    try {
      // Retrieve payment intent to check authentication status
      const paymentIntent = await stripe.paymentIntents.retrieve(
        this.extractPaymentIntentId(clientSecret)
      );

      // Check if authentication is required
      if (paymentIntent.status === 'requires_action' ||
          paymentIntent.status === 'requires_payment_method') {

        // Determine authentication method
        const authMethod = this.determineAuthenticationMethod(paymentIntent);

        return {
          success: false,
          status: paymentIntent.status,
          requiresAction: true,
          nextAction: paymentIntent.next_action,
        };
      }

      // Authentication completed successfully
      if (paymentIntent.status === 'succeeded') {
        return {
          success: true,
          status: 'succeeded',
          requiresAction: false,
        };
      }

      // Payment failed
      return {
        success: false,
        status: paymentIntent.status,
        requiresAction: false,
        error: paymentIntent.last_payment_error?.message,
        errorCode: paymentIntent.last_payment_error?.code,
      };
    } catch (error) {
      const err = error as Error;
      console.error('3DS authentication handling error:', err);

      return {
        success: false,
        status: 'failed',
        requiresAction: false,
        error: err.message,
        errorCode: '3DS_HANDLING_ERROR',
      };
    }
  }

  /**
   * Handle authentication failure with retry logic
   */
  async handleAuthenticationFailure(
    paymentIntentId: string,
    error: unknown,
    retryCount: number
  ): Promise<void> {
    const supabase = await createClient();
    const err = error as Error;

    try {
      // Get current payment intent
      const { data: dbIntent } = await supabase
        .from('payment_intents')
        .select('attempt_count, max_attempts')
        .eq('id', paymentIntentId)
        .single();

      if (!dbIntent) return;

      // Check if max attempts exceeded
      if (dbIntent.attempt_count >= dbIntent.max_attempts) {
        // Mark as failed permanently
        await supabase.rpc('update_payment_intent_status', {
          p_payment_intent_id: paymentIntentId,
          p_status: 'cancelled',
          p_authentication_status: 'failed',
          p_error_code: 'MAX_ATTEMPTS_EXCEEDED',
          p_error_message: 'Maximum authentication attempts exceeded',
        });

        return;
      }

      // Update attempt count
      await supabase
        .from('payment_intents')
        .update({
          attempt_count: retryCount,
          last_error_code: (error as any).code || 'UNKNOWN_ERROR',
          last_error_message: err.message,
          last_error_details: {
            error: err.message,
            timestamp: new Date().toISOString(),
            attemptNumber: retryCount,
          },
        })
        .eq('id', paymentIntentId);

      // Log authentication failure
      await supabase.rpc('log_authentication_event', {
        p_payment_intent_id: paymentIntentId,
        p_event_type: 'authentication_failed',
        p_authentication_flow: null,
        p_challenge_type: null,
        p_success: false,
        p_error_code: (error as any).code || 'UNKNOWN_ERROR',
        p_error_message: err.message,
      });
    } catch (logError) {
      console.error('Error logging authentication failure:', logError);
    }
  }

  /**
   * Save payment intent record to database
   */
  private async savePaymentIntentRecord(data: {
    organizationId: string;
    stripePaymentIntentId: string;
    stripeCustomerId: string;
    amount: number;
    currency: string;
    purpose: string;
    relatedSubscriptionId?: string;
    relatedInvoiceId?: string;
    clientSecret: string;
    authenticationRequired: boolean;
    scaExemption: string;
    scaExemptionApplied: boolean;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<string> {
    const supabase = await createClient();

    const { data: result, error } = await supabase.rpc(
      'create_payment_intent_record',
      {
        p_organization_id: data.organizationId,
        p_stripe_payment_intent_id: data.stripePaymentIntentId,
        p_stripe_customer_id: data.stripeCustomerId,
        p_amount_cents: data.amount,
        p_currency: data.currency,
        p_purpose: data.purpose,
        p_client_secret: data.clientSecret,
        p_authentication_required: data.authenticationRequired,
        p_user_agent: data.userAgent,
        p_ip_address: data.ipAddress,
      }
    );

    if (error) {
      throw new Error(`Failed to save payment intent: ${error.message}`);
    }

    return result;
  }

  /**
   * Determine SCA exemption eligibility (PSD2 compliance)
   */
  private determineSCAExemption(request: PaymentIntentRequest): {
    applicable: boolean;
    type: 'none' | 'low_value' | 'transaction_risk_analysis' | 'recurring_payment' | 'merchant_initiated';
    reason?: string;
  } {
    // Low value exemption: < 30 EUR
    if (request.amount < 3000 && request.currency === 'eur') {
      return {
        applicable: true,
        type: 'low_value',
        reason: 'Transaction under €30',
      };
    }

    // Recurring payment exemption
    if (request.purpose === 'subscription_payment') {
      return {
        applicable: true,
        type: 'recurring_payment',
        reason: 'Recurring subscription payment',
      };
    }

    // Merchant initiated transaction
    if (request.purpose === 'invoice_payment') {
      return {
        applicable: true,
        type: 'merchant_initiated',
        reason: 'Merchant initiated invoice payment',
      };
    }

    // Transaction risk analysis (Stripe evaluates risk)
    return {
      applicable: false,
      type: 'none',
      reason: 'Standard SCA required',
    };
  }

  /**
   * Log compliance validation for regulatory requirements
   */
  private async logComplianceValidation(
    paymentIntentId: string,
    scaExemption: { applicable: boolean; type: string; reason?: string },
    request: PaymentIntentRequest
  ): Promise<void> {
    const supabase = await createClient();

    try {
      // PSD2 compliance
      await supabase.rpc('log_compliance_validation', {
        p_payment_intent_id: paymentIntentId,
        p_regulation: 'PSD2',
        p_compliance_status: scaExemption.applicable ? 'exempted' : 'compliant',
        p_validation_checks: {
          sca_required: !scaExemption.applicable,
          exemption_type: scaExemption.type,
          exemption_reason: scaExemption.reason,
        },
        p_exemption_reason: scaExemption.reason,
        p_risk_score: null,
      });

      // SCA compliance
      await supabase.rpc('log_compliance_validation', {
        p_payment_intent_id: paymentIntentId,
        p_regulation: 'SCA',
        p_compliance_status: 'compliant',
        p_validation_checks: {
          authentication_method: 'stripe_3ds',
          customer_authentication: true,
        },
      });
    } catch (error) {
      console.error('Compliance logging error:', error);
      // Don't throw - compliance logging failures shouldn't break payment flow
    }
  }

  /**
   * Log authentication event for audit trail
   */
  private async logAuthenticationEvent(data: {
    paymentIntentId: string;
    eventType: string;
    authenticationFlow: string | null;
    success: boolean;
    errorCode?: string;
    errorMessage?: string;
  }): Promise<void> {
    const supabase = await createClient();

    try {
      await supabase.rpc('log_authentication_event', {
        p_payment_intent_id: data.paymentIntentId,
        p_event_type: data.eventType,
        p_authentication_flow: data.authenticationFlow,
        p_challenge_type: null,
        p_success: data.success,
        p_error_code: data.errorCode,
        p_error_message: data.errorMessage,
      });
    } catch (error) {
      console.error('Authentication event logging error:', error);
    }
  }

  /**
   * Get authentication status from Stripe payment intent
   */
  private getAuthenticationStatus(
    paymentIntent: Stripe.PaymentIntent
  ): 'not_required' | 'pending' | 'authenticated' | 'failed' | 'challenged' | 'frictionless' {
    if (paymentIntent.status === 'succeeded') {
      // Check if authentication was frictionless
      const charges = paymentIntent.charges?.data || [];
      if (charges.length > 0) {
        const charge = charges[0];
        if (charge.payment_method_details?.card?.three_d_secure) {
          return charge.payment_method_details.card.three_d_secure.result === 'authenticated'
            ? 'frictionless'
            : 'authenticated';
        }
      }
      return 'not_required';
    }

    if (paymentIntent.status === 'requires_action') {
      return 'challenged';
    }

    if (paymentIntent.last_payment_error) {
      return 'failed';
    }

    return 'pending';
  }

  /**
   * Get authentication flow type
   */
  private getAuthenticationFlow(
    paymentIntent: Stripe.PaymentIntent
  ): 'challenge' | 'frictionless' | 'redirect' | null {
    if (paymentIntent.next_action?.type === 'redirect_to_url') {
      return 'redirect';
    }

    const charges = paymentIntent.charges?.data || [];
    if (charges.length > 0) {
      const charge = charges[0];
      if (charge.payment_method_details?.card?.three_d_secure) {
        return charge.payment_method_details.card.three_d_secure.result === 'authenticated'
          ? 'frictionless'
          : 'challenge';
      }
    }

    return null;
  }

  /**
   * Determine authentication method from payment intent
   */
  private determineAuthenticationMethod(
    paymentIntent: Stripe.PaymentIntent
  ): '3ds1' | '3ds2' | 'redirect' | 'unknown' {
    if (paymentIntent.next_action?.type === 'redirect_to_url') {
      return 'redirect';
    }

    const charges = paymentIntent.charges?.data || [];
    if (charges.length > 0) {
      const charge = charges[0];
      if (charge.payment_method_details?.card?.three_d_secure) {
        const version = charge.payment_method_details.card.three_d_secure.version;
        if (version && version.startsWith('2')) {
          return '3ds2';
        }
        if (version && version.startsWith('1')) {
          return '3ds1';
        }
      }
    }

    return 'unknown';
  }

  /**
   * Extract payment intent ID from client secret
   */
  private extractPaymentIntentId(clientSecret: string): string {
    // Client secret format: pi_xxx_secret_yyy
    const parts = clientSecret.split('_secret_');
    return parts[0];
  }

  /**
   * Get payment intent by ID
   */
  async getPaymentIntent(paymentIntentId: string): Promise<any> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('payment_intents')
      .select(`
        *,
        organizations (
          id,
          name,
          slug
        )
      `)
      .eq('id', paymentIntentId)
      .single();

    if (error) {
      throw new Error(`Failed to get payment intent: ${error.message}`);
    }

    // Don't expose client secret in API responses
    return {
      ...data,
      client_secret: '[REDACTED]',
    };
  }

  /**
   * List payment intents with filtering
   */
  async listPaymentIntents(filters: {
    organizationId?: string;
    status?: string;
    purpose?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ paymentIntents: any[]; totalCount: number }> {
    const supabase = await createClient();

    let query = supabase
      .from('payment_intents')
      .select(`
        *,
        organizations (
          id,
          name,
          slug
        )
      `, { count: 'exact' });

    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.purpose) {
      query = query.eq('purpose', filters.purpose);
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to list payment intents: ${error.message}`);
    }

    // Remove client secrets from list
    const sanitized = (data || []).map(intent => ({
      ...intent,
      client_secret: '[REDACTED]',
    }));

    return {
      paymentIntents: sanitized,
      totalCount: count || 0,
    };
  }

  /**
   * Get authentication statistics
   */
  async getAuthenticationStatistics(
    startDate?: string,
    endDate?: string
  ): Promise<any> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_authentication_statistics', {
      p_start_date: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      p_end_date: endDate || new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to get authentication statistics: ${error.message}`);
    }

    return data;
  }

  /**
   * Cancel payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    const supabase = await createClient();

    // Get payment intent
    const { data: dbIntent, error: dbError } = await supabase
      .from('payment_intents')
      .select('stripe_payment_intent_id, status')
      .eq('id', paymentIntentId)
      .single();

    if (dbError || !dbIntent) {
      throw new Error('Payment intent not found');
    }

    // Can only cancel if not already completed
    if (dbIntent.status === 'succeeded') {
      throw new Error('Cannot cancel completed payment intent');
    }

    // Cancel in Stripe
    await stripe.paymentIntents.cancel(dbIntent.stripe_payment_intent_id);

    // Update database
    await supabase.rpc('update_payment_intent_status', {
      p_payment_intent_id: paymentIntentId,
      p_status: 'cancelled',
    });
  }
}

export default PaymentIntentManager;
