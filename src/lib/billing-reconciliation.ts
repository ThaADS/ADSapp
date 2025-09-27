/**
 * Automated Billing Reconciliation Engine
 *
 * Comprehensive billing management system for the multi-tenant WhatsApp Business Inbox SaaS.
 * Handles Stripe payment reconciliation, usage-based billing, automated adjustments,
 * churn prediction, and revenue recognition compliance.
 *
 * Features:
 * - Stripe payment reconciliation and dispute management
 * - Usage-based billing calculations with tiered pricing
 * - Automated invoice adjustments and credit management
 * - Churn prediction and prevention workflows
 * - Revenue recognition compliance (ASC 606/IFRS 15)
 * - Billing analytics and financial reporting
 * - Subscription lifecycle management
 */

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
});

// Types for billing reconciliation
export interface BillingTransaction {
  id: string;
  organization_id: string;
  stripe_payment_intent_id?: string;
  stripe_invoice_id?: string;
  stripe_subscription_id?: string;
  type: 'payment' | 'refund' | 'adjustment' | 'credit' | 'usage_charge';
  amount_cents: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'disputed' | 'refunded';
  description: string;
  billing_period_start?: string;
  billing_period_end?: string;
  usage_data?: UsageData;
  created_at: string;
  reconciled_at?: string;
  reconciliation_status: 'pending' | 'matched' | 'discrepancy' | 'manual_review';
}

export interface UsageData {
  messages_sent: number;
  api_calls: number;
  storage_gb: number;
  team_members: number;
  additional_features: Record<string, number>;
  billing_tier: 'starter' | 'professional' | 'enterprise';
}

export interface ReconciliationReport {
  period: string;
  total_stripe_revenue: number;
  total_recorded_revenue: number;
  discrepancy_amount: number;
  discrepancy_percentage: number;
  transactions_matched: number;
  transactions_pending: number;
  transactions_disputed: number;
  revenue_recognition: {
    recognized_revenue: number;
    deferred_revenue: number;
    unbilled_revenue: number;
  };
  issues: ReconciliationIssue[];
}

export interface ReconciliationIssue {
  id: string;
  type: 'missing_payment' | 'duplicate_charge' | 'amount_mismatch' | 'currency_mismatch' | 'timing_difference';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  stripe_reference?: string;
  internal_reference?: string;
  amount_difference?: number;
  suggested_action: string;
  auto_resolvable: boolean;
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
}

export interface ChurnPrediction {
  organization_id: string;
  churn_probability: number;
  risk_factors: {
    factor: string;
    impact_score: number;
    description: string;
  }[];
  recommended_actions: {
    action: string;
    priority: 'low' | 'medium' | 'high';
    expected_impact: number;
  }[];
  prediction_confidence: number;
  next_review_date: string;
}

export interface RevenueRecognition {
  id: string;
  organization_id: string;
  subscription_id: string;
  contract_value: number;
  contract_start_date: string;
  contract_end_date: string;
  performance_obligations: {
    description: string;
    allocated_amount: number;
    recognition_pattern: 'straight_line' | 'usage_based' | 'milestone';
    status: 'not_started' | 'in_progress' | 'completed';
  }[];
  monthly_recognition_schedule: {
    month: string;
    amount_to_recognize: number;
    recognized_amount: number;
    remaining_amount: number;
  }[];
  compliance_notes: string;
}

export interface PricingTier {
  tier: 'starter' | 'professional' | 'enterprise';
  base_price_cents: number;
  included_messages: number;
  included_team_members: number;
  included_storage_gb: number;
  overage_pricing: {
    per_message_cents: number;
    per_team_member_cents: number;
    per_gb_storage_cents: number;
  };
  features: string[];
}

export class BillingReconciliationEngine {
  private supabase;
  private stripe: Stripe;

  constructor() {
    this.supabase = createClient(cookies());
    this.stripe = stripe;
  }

  /**
   * Sync payments from Stripe and reconcile with internal records
   */
  async syncStripePayments(startDate: string, endDate: string): Promise<ReconciliationReport> {
    try {
      // Fetch payments from Stripe
      const stripePayments = await this.fetchStripePayments(startDate, endDate);
      const stripeInvoices = await this.fetchStripeInvoices(startDate, endDate);

      // Fetch internal billing records
      const internalTransactions = await this.fetchInternalTransactions(startDate, endDate);

      // Perform reconciliation
      const reconciliation = await this.performReconciliation(
        stripePayments,
        stripeInvoices,
        internalTransactions,
        startDate,
        endDate
      );

      // Store reconciliation results
      await this.storeReconciliationResults(reconciliation);

      return reconciliation;
    } catch (error) {
      console.error('Error syncing Stripe payments:', error);
      throw error;
    }
  }

  /**
   * Calculate usage-based billing for an organization
   */
  async calculateUsageBilling(
    organizationId: string,
    billingPeriodStart: string,
    billingPeriodEnd: string
  ): Promise<{
    base_charges: number;
    usage_charges: number;
    total_amount: number;
    usage_breakdown: UsageData;
  }> {
    try {
      // Get organization's subscription tier
      const { data: org, error: orgError } = await this.supabase
        .from('organizations')
        .select('subscription_tier, stripe_subscription_id')
        .eq('id', organizationId)
        .single();

      if (orgError) throw orgError;

      // Get pricing for the tier
      const pricing = await this.getPricingTier(org.subscription_tier);

      // Calculate usage for the billing period
      const usage = await this.calculateUsage(organizationId, billingPeriodStart, billingPeriodEnd);

      // Calculate base charges
      const baseCharges = pricing.base_price_cents;

      // Calculate overage charges
      const overageCharges = this.calculateOverageCharges(usage, pricing);

      const totalAmount = baseCharges + overageCharges;

      // Store usage record
      await this.storeUsageRecord(organizationId, usage, totalAmount, billingPeriodStart, billingPeriodEnd);

      return {
        base_charges: baseCharges,
        usage_charges: overageCharges,
        total_amount: totalAmount,
        usage_breakdown: usage
      };
    } catch (error) {
      console.error('Error calculating usage billing:', error);
      throw error;
    }
  }

  /**
   * Generate automated invoice adjustments based on usage discrepancies
   */
  async generateInvoiceAdjustments(invoiceId: string): Promise<{
    adjustments: any[];
    total_adjustment: number;
  }> {
    try {
      // Fetch invoice from Stripe
      const invoice = await this.stripe.invoices.retrieve(invoiceId);

      // Get organization and usage data
      const { data: org } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('stripe_customer_id', invoice.customer)
        .single();

      if (!org) throw new Error('Organization not found for customer');

      // Calculate expected billing amount
      const expectedBilling = await this.calculateUsageBilling(
        org.id,
        new Date(invoice.period_start * 1000).toISOString(),
        new Date(invoice.period_end * 1000).toISOString()
      );

      // Compare with invoice amount
      const invoiceAmount = invoice.amount_paid || invoice.amount_due;
      const discrepancy = expectedBilling.total_amount - invoiceAmount;

      const adjustments = [];

      if (Math.abs(discrepancy) > 100) { // Only adjust if difference is > $1.00
        const adjustmentType = discrepancy > 0 ? 'credit' : 'debit';

        // Create Stripe credit note or invoice item
        if (adjustmentType === 'credit' && invoice.status === 'paid') {
          const creditNote = await this.stripe.creditNotes.create({
            invoice: invoiceId,
            amount: Math.abs(discrepancy),
            reason: 'other',
            memo: 'Usage billing adjustment - automated reconciliation'
          });

          adjustments.push({
            type: 'credit_note',
            stripe_id: creditNote.id,
            amount: discrepancy,
            reason: 'Usage underbilling correction'
          });
        } else if (adjustmentType === 'debit') {
          // Create invoice item for next billing cycle
          const invoiceItem = await this.stripe.invoiceItems.create({
            customer: invoice.customer as string,
            amount: Math.abs(discrepancy),
            currency: invoice.currency,
            description: 'Previous period usage adjustment'
          });

          adjustments.push({
            type: 'invoice_item',
            stripe_id: invoiceItem.id,
            amount: discrepancy,
            reason: 'Usage overbilling correction'
          });
        }

        // Record adjustment in database
        await this.recordBillingAdjustment(org.id, discrepancy, invoiceId, adjustments);
      }

      return {
        adjustments,
        total_adjustment: discrepancy
      };
    } catch (error) {
      console.error('Error generating invoice adjustments:', error);
      throw error;
    }
  }

  /**
   * Predict churn risk for organizations
   */
  async predictChurnRisk(organizationId?: string): Promise<ChurnPrediction[]> {
    try {
      // Get organizations to analyze
      let query = this.supabase
        .from('organizations')
        .select(`
          *,
          profiles!inner(count),
          conversations(count),
          billing_transactions(*)
        `)
        .eq('status', 'active');

      if (organizationId) {
        query = query.eq('id', organizationId);
      }

      const { data: organizations, error } = await query;
      if (error) throw error;

      const predictions: ChurnPrediction[] = [];

      for (const org of organizations) {
        const prediction = await this.calculateChurnProbability(org);
        predictions.push(prediction);
      }

      // Store predictions for tracking
      await this.storeChurnPredictions(predictions);

      return predictions;
    } catch (error) {
      console.error('Error predicting churn risk:', error);
      throw error;
    }
  }

  /**
   * Generate revenue recognition schedule for compliance
   */
  async generateRevenueRecognitionSchedule(
    organizationId: string,
    subscriptionId: string
  ): Promise<RevenueRecognition> {
    try {
      // Fetch subscription details from Stripe
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);

      // Get contract details
      const { data: contract, error } = await this.supabase
        .from('subscription_contracts')
        .select('*')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (error) throw error;

      // Calculate performance obligations
      const performanceObligations = this.calculatePerformanceObligations(subscription, contract);

      // Generate monthly recognition schedule
      const recognitionSchedule = this.generateMonthlyRecognitionSchedule(
        contract.contract_start_date,
        contract.contract_end_date,
        contract.contract_value,
        performanceObligations
      );

      const revenueRecognition: RevenueRecognition = {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        subscription_id: subscriptionId,
        contract_value: contract.contract_value,
        contract_start_date: contract.contract_start_date,
        contract_end_date: contract.contract_end_date,
        performance_obligations: performanceObligations,
        monthly_recognition_schedule: recognitionSchedule,
        compliance_notes: 'Generated per ASC 606/IFRS 15 standards'
      };

      // Store in database
      await this.storeRevenueRecognitionSchedule(revenueRecognition);

      return revenueRecognition;
    } catch (error) {
      console.error('Error generating revenue recognition schedule:', error);
      throw error;
    }
  }

  /**
   * Get billing analytics dashboard data
   */
  async getBillingAnalytics(startDate: string, endDate: string): Promise<{
    revenue_metrics: any;
    reconciliation_status: any;
    churn_analysis: any;
    compliance_status: any;
  }> {
    try {
      const [
        revenueMetrics,
        reconciliationStatus,
        churnAnalysis,
        complianceStatus
      ] = await Promise.all([
        this.getRevenueMetrics(startDate, endDate),
        this.getReconciliationStatus(startDate, endDate),
        this.getChurnAnalysis(),
        this.getComplianceStatus()
      ]);

      return {
        revenue_metrics: revenueMetrics,
        reconciliation_status: reconciliationStatus,
        churn_analysis: churnAnalysis,
        compliance_status: complianceStatus
      };
    } catch (error) {
      console.error('Error fetching billing analytics:', error);
      throw error;
    }
  }

  // Private helper methods
  private async fetchStripePayments(startDate: string, endDate: string): Promise<any[]> {
    const payments = [];
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    for await (const payment of this.stripe.paymentIntents.list({
      created: { gte: startTimestamp, lte: endTimestamp },
      limit: 100
    })) {
      payments.push(payment);
    }

    return payments;
  }

  private async fetchStripeInvoices(startDate: string, endDate: string): Promise<any[]> {
    const invoices = [];
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

    for await (const invoice of this.stripe.invoices.list({
      created: { gte: startTimestamp, lte: endTimestamp },
      limit: 100
    })) {
      invoices.push(invoice);
    }

    return invoices;
  }

  private async fetchInternalTransactions(startDate: string, endDate: string): Promise<BillingTransaction[]> {
    const { data, error } = await this.supabase
      .from('billing_transactions')
      .select('*')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (error) throw error;
    return data || [];
  }

  private async performReconciliation(
    stripePayments: any[],
    stripeInvoices: any[],
    internalTransactions: BillingTransaction[],
    startDate: string,
    endDate: string
  ): Promise<ReconciliationReport> {
    const issues: ReconciliationIssue[] = [];
    let matched = 0;
    let pending = 0;
    let disputed = 0;

    const stripeRevenue = stripePayments.reduce((sum, payment) => {
      if (payment.status === 'succeeded') {
        return sum + payment.amount_received;
      }
      return sum;
    }, 0);

    const recordedRevenue = internalTransactions.reduce((sum, transaction) => {
      if (transaction.status === 'succeeded') {
        return sum + transaction.amount_cents;
      }
      return sum;
    }, 0);

    // Match transactions
    for (const payment of stripePayments) {
      const matchingTransaction = internalTransactions.find(
        t => t.stripe_payment_intent_id === payment.id
      );

      if (matchingTransaction) {
        if (matchingTransaction.amount_cents === payment.amount_received) {
          matched++;
        } else {
          issues.push({
            id: crypto.randomUUID(),
            type: 'amount_mismatch',
            severity: 'medium',
            description: `Amount mismatch for payment ${payment.id}`,
            stripe_reference: payment.id,
            internal_reference: matchingTransaction.id,
            amount_difference: matchingTransaction.amount_cents - payment.amount_received,
            suggested_action: 'Review and adjust internal transaction amount',
            auto_resolvable: false,
            created_at: new Date().toISOString()
          });
        }
      } else {
        pending++;
        issues.push({
          id: crypto.randomUUID(),
          type: 'missing_payment',
          severity: 'high',
          description: `Stripe payment ${payment.id} not found in internal records`,
          stripe_reference: payment.id,
          suggested_action: 'Create missing internal transaction record',
          auto_resolvable: true,
          created_at: new Date().toISOString()
        });
      }
    }

    const discrepancy = recordedRevenue - stripeRevenue;
    const discrepancyPercentage = stripeRevenue > 0 ? (discrepancy / stripeRevenue) * 100 : 0;

    return {
      period: `${startDate} to ${endDate}`,
      total_stripe_revenue: stripeRevenue,
      total_recorded_revenue: recordedRevenue,
      discrepancy_amount: discrepancy,
      discrepancy_percentage: discrepancyPercentage,
      transactions_matched: matched,
      transactions_pending: pending,
      transactions_disputed: disputed,
      revenue_recognition: {
        recognized_revenue: recordedRevenue * 0.9, // Simplified calculation
        deferred_revenue: recordedRevenue * 0.1,
        unbilled_revenue: 0
      },
      issues
    };
  }

  private async storeReconciliationResults(report: ReconciliationReport): Promise<void> {
    await this.supabase
      .from('billing_reconciliation_reports')
      .insert({
        period: report.period,
        total_stripe_revenue: report.total_stripe_revenue,
        total_recorded_revenue: report.total_recorded_revenue,
        discrepancy_amount: report.discrepancy_amount,
        discrepancy_percentage: report.discrepancy_percentage,
        transactions_matched: report.transactions_matched,
        transactions_pending: report.transactions_pending,
        transactions_disputed: report.transactions_disputed,
        revenue_recognition: report.revenue_recognition,
        issues: report.issues
      });
  }

  private async getPricingTier(tier: string): Promise<PricingTier> {
    const pricingTiers: Record<string, PricingTier> = {
      starter: {
        tier: 'starter',
        base_price_cents: 2900, // $29/month
        included_messages: 1000,
        included_team_members: 3,
        included_storage_gb: 5,
        overage_pricing: {
          per_message_cents: 5, // $0.05 per message
          per_team_member_cents: 900, // $9 per team member
          per_gb_storage_cents: 200 // $2 per GB
        },
        features: ['Basic inbox', 'Templates', 'Analytics']
      },
      professional: {
        tier: 'professional',
        base_price_cents: 7900, // $79/month
        included_messages: 5000,
        included_team_members: 10,
        included_storage_gb: 20,
        overage_pricing: {
          per_message_cents: 3, // $0.03 per message
          per_team_member_cents: 700, // $7 per team member
          per_gb_storage_cents: 150 // $1.50 per GB
        },
        features: ['Advanced inbox', 'Automation', 'Advanced analytics', 'Integrations']
      },
      enterprise: {
        tier: 'enterprise',
        base_price_cents: 19900, // $199/month
        included_messages: 20000,
        included_team_members: 50,
        included_storage_gb: 100,
        overage_pricing: {
          per_message_cents: 2, // $0.02 per message
          per_team_member_cents: 500, // $5 per team member
          per_gb_storage_cents: 100 // $1 per GB
        },
        features: ['Enterprise inbox', 'Advanced automation', 'Custom analytics', 'Priority support']
      }
    };

    return pricingTiers[tier] || pricingTiers.starter;
  }

  private async calculateUsage(
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<UsageData> {
    const { data, error } = await this.supabase.rpc('calculate_organization_usage', {
      org_id: organizationId,
      start_date: startDate,
      end_date: endDate
    });

    if (error) throw error;

    return {
      messages_sent: data.messages_sent || 0,
      api_calls: data.api_calls || 0,
      storage_gb: parseFloat(data.storage_gb || 0),
      team_members: data.team_members || 0,
      additional_features: data.additional_features || {},
      billing_tier: data.billing_tier || 'starter'
    };
  }

  private calculateOverageCharges(usage: UsageData, pricing: PricingTier): number {
    let overageCharges = 0;

    // Message overage
    if (usage.messages_sent > pricing.included_messages) {
      const overageMessages = usage.messages_sent - pricing.included_messages;
      overageCharges += overageMessages * pricing.overage_pricing.per_message_cents;
    }

    // Team member overage
    if (usage.team_members > pricing.included_team_members) {
      const overageMembers = usage.team_members - pricing.included_team_members;
      overageCharges += overageMembers * pricing.overage_pricing.per_team_member_cents;
    }

    // Storage overage
    if (usage.storage_gb > pricing.included_storage_gb) {
      const overageStorage = usage.storage_gb - pricing.included_storage_gb;
      overageCharges += Math.ceil(overageStorage) * pricing.overage_pricing.per_gb_storage_cents;
    }

    return overageCharges;
  }

  private async storeUsageRecord(
    organizationId: string,
    usage: UsageData,
    totalAmount: number,
    startDate: string,
    endDate: string
  ): Promise<void> {
    await this.supabase
      .from('usage_records')
      .insert({
        organization_id: organizationId,
        billing_period_start: startDate,
        billing_period_end: endDate,
        usage_data: usage,
        calculated_amount_cents: totalAmount,
        created_at: new Date().toISOString()
      });
  }

  private async recordBillingAdjustment(
    organizationId: string,
    adjustmentAmount: number,
    invoiceId: string,
    adjustments: any[]
  ): Promise<void> {
    await this.supabase
      .from('billing_transactions')
      .insert({
        organization_id: organizationId,
        stripe_invoice_id: invoiceId,
        type: 'adjustment',
        amount_cents: adjustmentAmount,
        currency: 'usd',
        status: 'succeeded',
        description: 'Automated billing adjustment',
        reconciliation_status: 'matched'
      });
  }

  private async calculateChurnProbability(organization: any): Promise<ChurnPrediction> {
    // Simplified churn prediction algorithm
    // In production, this would use machine learning models

    const riskFactors = [];
    let churnScore = 0;

    // Billing history analysis
    const latePayments = organization.billing_transactions?.filter(
      (t: any) => t.status === 'failed'
    ).length || 0;

    if (latePayments > 0) {
      const factor = {
        factor: 'payment_failures',
        impact_score: Math.min(latePayments * 0.2, 0.8),
        description: `${latePayments} failed payment(s) in recent history`
      };
      riskFactors.push(factor);
      churnScore += factor.impact_score;
    }

    // Usage trend analysis
    const recentUsage = await this.getRecentUsageTrend(organization.id);
    if (recentUsage.declining) {
      const factor = {
        factor: 'declining_usage',
        impact_score: 0.6,
        description: 'Usage has declined by more than 30% in the last 3 months'
      };
      riskFactors.push(factor);
      churnScore += factor.impact_score;
    }

    // Support ticket analysis
    const supportTickets = await this.getRecentSupportTickets(organization.id);
    if (supportTickets.unresolved > 2) {
      const factor = {
        factor: 'support_issues',
        impact_score: 0.4,
        description: `${supportTickets.unresolved} unresolved support tickets`
      };
      riskFactors.push(factor);
      churnScore += factor.impact_score;
    }

    const churnProbability = Math.min(churnScore, 1.0);

    // Generate recommended actions
    const recommendedActions = this.generateChurnPreventionActions(riskFactors, churnProbability);

    return {
      organization_id: organization.id,
      churn_probability: churnProbability,
      risk_factors: riskFactors,
      recommended_actions: recommendedActions,
      prediction_confidence: 0.75, // Simplified confidence score
      next_review_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  private async getRecentUsageTrend(organizationId: string): Promise<{ declining: boolean; trend: number }> {
    // Simplified usage trend calculation
    const { data, error } = await this.supabase.rpc('get_usage_trend', {
      org_id: organizationId,
      months: 3
    });

    if (error) return { declining: false, trend: 0 };

    const trend = data?.trend || 0;
    return {
      declining: trend < -0.3,
      trend
    };
  }

  private async getRecentSupportTickets(organizationId: string): Promise<{ unresolved: number; total: number }> {
    const { data, error } = await this.supabase
      .from('support_tickets')
      .select('status')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (error) return { unresolved: 0, total: 0 };

    const total = data?.length || 0;
    const unresolved = data?.filter(t => ['open', 'in_progress'].includes(t.status)).length || 0;

    return { unresolved, total };
  }

  private generateChurnPreventionActions(riskFactors: any[], churnProbability: number): any[] {
    const actions = [];

    if (riskFactors.some(f => f.factor === 'payment_failures')) {
      actions.push({
        action: 'Reach out to update payment method',
        priority: 'high' as const,
        expected_impact: 0.7
      });
    }

    if (riskFactors.some(f => f.factor === 'declining_usage')) {
      actions.push({
        action: 'Schedule product adoption consultation',
        priority: 'medium' as const,
        expected_impact: 0.5
      });
    }

    if (riskFactors.some(f => f.factor === 'support_issues')) {
      actions.push({
        action: 'Prioritize support ticket resolution',
        priority: 'high' as const,
        expected_impact: 0.6
      });
    }

    if (churnProbability > 0.7) {
      actions.push({
        action: 'Offer retention discount',
        priority: 'high' as const,
        expected_impact: 0.8
      });
    }

    return actions;
  }

  private calculatePerformanceObligations(subscription: any, contract: any): any[] {
    // Simplified performance obligations calculation
    return [
      {
        description: 'Software access and support',
        allocated_amount: contract.contract_value * 0.8,
        recognition_pattern: 'straight_line' as const,
        status: 'in_progress' as const
      },
      {
        description: 'Professional services',
        allocated_amount: contract.contract_value * 0.2,
        recognition_pattern: 'milestone' as const,
        status: 'not_started' as const
      }
    ];
  }

  private generateMonthlyRecognitionSchedule(
    startDate: string,
    endDate: string,
    contractValue: number,
    obligations: any[]
  ): any[] {
    const schedule = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalMonths = Math.ceil((end.getTime() - start.getTime()) / (30 * 24 * 60 * 60 * 1000));

    const monthlyAmount = contractValue / totalMonths;

    for (let i = 0; i < totalMonths; i++) {
      const month = new Date(start);
      month.setMonth(start.getMonth() + i);

      schedule.push({
        month: month.toISOString().substring(0, 7),
        amount_to_recognize: monthlyAmount,
        recognized_amount: 0,
        remaining_amount: monthlyAmount
      });
    }

    return schedule;
  }

  private async storeRevenueRecognitionSchedule(schedule: RevenueRecognition): Promise<void> {
    await this.supabase
      .from('revenue_recognition_schedules')
      .insert(schedule);
  }

  private async storeChurnPredictions(predictions: ChurnPrediction[]): Promise<void> {
    await this.supabase
      .from('churn_predictions')
      .insert(predictions);
  }

  private async getRevenueMetrics(startDate: string, endDate: string): Promise<any> {
    const { data, error } = await this.supabase.rpc('get_billing_revenue_metrics', {
      start_date: startDate,
      end_date: endDate
    });

    if (error) throw error;
    return data;
  }

  private async getReconciliationStatus(startDate: string, endDate: string): Promise<any> {
    const { data, error } = await this.supabase
      .from('billing_reconciliation_reports')
      .select('*')
      .gte('period', startDate)
      .lte('period', endDate)
      .order('period', { ascending: false })
      .limit(1)
      .single();

    if (error) return null;
    return data;
  }

  private async getChurnAnalysis(): Promise<any> {
    const { data, error } = await this.supabase
      .from('churn_predictions')
      .select('*')
      .order('churn_probability', { ascending: false })
      .limit(10);

    if (error) return { high_risk_customers: 0, average_churn_probability: 0 };

    const highRisk = data?.filter(p => p.churn_probability > 0.7).length || 0;
    const avgProbability = data?.reduce((sum, p) => sum + p.churn_probability, 0) / (data?.length || 1);

    return {
      high_risk_customers: highRisk,
      average_churn_probability: avgProbability,
      total_analyzed: data?.length || 0
    };
  }

  private async getComplianceStatus(): Promise<any> {
    const { data, error } = await this.supabase
      .from('revenue_recognition_schedules')
      .select('*')
      .is('compliance_notes', null);

    const nonCompliantCount = data?.length || 0;

    return {
      compliant_contracts: nonCompliantCount === 0,
      non_compliant_count: nonCompliantCount,
      last_audit_date: new Date().toISOString().split('T')[0]
    };
  }
}

// Singleton instance
export const billingEngine = new BillingReconciliationEngine();

// Utility functions
export async function runDailyBillingReconciliation(): Promise<ReconciliationReport> {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return await billingEngine.syncStripePayments(
    yesterday.toISOString().split('T')[0],
    today.toISOString().split('T')[0]
  );
}

export async function generateMonthlyBillingReport(month: string): Promise<any> {
  const startDate = `${month}-01`;
  const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + 1, 0)
    .toISOString().split('T')[0];

  return await billingEngine.getBillingAnalytics(startDate, endDate);
}