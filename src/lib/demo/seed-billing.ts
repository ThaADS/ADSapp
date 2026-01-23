/**
 * Seed Billing Data for Demo Organization
 * Creates subscription, invoices, and usage data
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { DEMO_ORG_ID, BILLING_DATA } from './dutch-data'

export interface SeedSubscription {
  id?: string
  organization_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  plan_name: string
  plan_price: number
  plan_currency: string
  plan_interval: 'month' | 'year'
  status: 'active' | 'past_due' | 'canceled' | 'trialing'
  current_period_start: string
  current_period_end: string
  trial_end: string | null
  cancel_at_period_end: boolean
  features: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SeedInvoice {
  id?: string
  organization_id: string
  stripe_invoice_id: string
  stripe_customer_id: string
  number: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  amount: number
  amount_paid: number
  currency: string
  period_start: string
  period_end: string
  due_date: string
  paid_at: string | null
  invoice_pdf: string | null
  lines: Record<string, unknown>[]
  created_at: string
}

export interface SeedUsageRecord {
  id?: string
  organization_id: string
  metric_name: string
  metric_value: number
  metric_limit: number | null
  period_start: string
  period_end: string
  metadata: Record<string, unknown>
  created_at: string
}

export async function seedBilling(supabase: SupabaseClient): Promise<void> {
  console.log('Seeding billing data...')

  // Check if subscription already exists
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('organization_id', DEMO_ORG_ID)
    .limit(1)

  if (existingSubscription && existingSubscription.length > 0) {
    console.log('Billing data already exists for demo org, skipping...')
    return
  }

  // Create subscription
  const now = new Date()
  const periodStart = new Date(now)
  periodStart.setDate(1) // First of current month
  const periodEnd = new Date(periodStart)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  const subscription: Omit<SeedSubscription, 'id'> = {
    organization_id: DEMO_ORG_ID,
    stripe_customer_id: 'cus_demo_company_123',
    stripe_subscription_id: 'sub_demo_company_123',
    plan_name: BILLING_DATA.plan.name,
    plan_price: BILLING_DATA.plan.price,
    plan_currency: BILLING_DATA.plan.currency,
    plan_interval: BILLING_DATA.plan.interval as 'month',
    status: 'active',
    current_period_start: periodStart.toISOString(),
    current_period_end: periodEnd.toISOString(),
    trial_end: null,
    cancel_at_period_end: false,
    features: {
      conversations: { limit: -1, name: 'Onbeperkte gesprekken' },
      team_members: { limit: 5, name: 'Tot 5 teamleden' },
      messages_per_month: { limit: 1000, name: '1.000 berichten/maand' },
      templates: { limit: 25, name: '25 templates' },
      automation_rules: { limit: 15, name: '15 automatiseringsregels' },
      integrations: { enabled: true, name: 'Standaard integraties' },
      analytics: { enabled: true, name: 'Basis analytics' },
      support: { level: 'email', name: 'E-mail ondersteuning' },
    },
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago
    updated_at: now.toISOString(),
  }

  const { error: subError } = await supabase
    .from('subscriptions')
    .insert(subscription)

  if (subError) {
    console.warn('Could not seed subscription (table may not exist):', subError.message)
  } else {
    console.log('Successfully seeded subscription')
  }

  // Create invoices for the last 6 months
  const invoices: Omit<SeedInvoice, 'id'>[] = BILLING_DATA.invoices.map((inv, index) => {
    const invoiceDate = new Date()
    invoiceDate.setDate(invoiceDate.getDate() + inv.date) // date is negative for past

    const periodStart = new Date(invoiceDate)
    periodStart.setDate(1)
    const periodEnd = new Date(periodStart)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    return {
      organization_id: DEMO_ORG_ID,
      stripe_invoice_id: `in_demo_${Date.now()}_${index}`,
      stripe_customer_id: 'cus_demo_company_123',
      number: `INV-2024${String(6 - index).padStart(2, '0')}`,
      status: inv.status as 'paid',
      amount: inv.amount * 100, // Stripe uses cents
      amount_paid: inv.status === 'paid' ? inv.amount * 100 : 0,
      currency: 'eur',
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      due_date: new Date(invoiceDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      paid_at: inv.status === 'paid'
        ? new Date(invoiceDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
        : null,
      invoice_pdf: `https://stripe.com/invoices/demo_${index}.pdf`,
      lines: [
        {
          description: `${BILLING_DATA.plan.name} - Maandelijks abonnement`,
          quantity: 1,
          unit_amount: inv.amount * 100,
          amount: inv.amount * 100,
        },
      ],
      created_at: invoiceDate.toISOString(),
    }
  })

  const { error: invError } = await supabase
    .from('invoices')
    .insert(invoices)

  if (invError) {
    console.warn('Could not seed invoices (table may not exist):', invError.message)
  } else {
    console.log(`Successfully seeded ${invoices.length} invoices`)
  }

  // Create current period usage records
  const usageRecords: Omit<SeedUsageRecord, 'id'>[] = [
    {
      organization_id: DEMO_ORG_ID,
      metric_name: 'conversations',
      metric_value: BILLING_DATA.usage.conversations.used,
      metric_limit: BILLING_DATA.usage.conversations.limit === -1 ? null : BILLING_DATA.usage.conversations.limit,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      metadata: { unlimited: BILLING_DATA.usage.conversations.limit === -1 },
      created_at: now.toISOString(),
    },
    {
      organization_id: DEMO_ORG_ID,
      metric_name: 'team_members',
      metric_value: BILLING_DATA.usage.team_members.used,
      metric_limit: BILLING_DATA.usage.team_members.limit,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      metadata: { users: ['owner', 'admin', 'agent'] },
      created_at: now.toISOString(),
    },
    {
      organization_id: DEMO_ORG_ID,
      metric_name: 'messages',
      metric_value: BILLING_DATA.usage.messages.used,
      metric_limit: BILLING_DATA.usage.messages.limit,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      metadata: {
        percentage: Math.round((BILLING_DATA.usage.messages.used / BILLING_DATA.usage.messages.limit) * 100),
        remaining: BILLING_DATA.usage.messages.limit - BILLING_DATA.usage.messages.used,
      },
      created_at: now.toISOString(),
    },
    {
      organization_id: DEMO_ORG_ID,
      metric_name: 'templates',
      metric_value: BILLING_DATA.usage.templates.used,
      metric_limit: BILLING_DATA.usage.templates.limit,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      metadata: {
        percentage: Math.round((BILLING_DATA.usage.templates.used / BILLING_DATA.usage.templates.limit) * 100),
      },
      created_at: now.toISOString(),
    },
  ]

  const { error: usageError } = await supabase
    .from('usage_records')
    .insert(usageRecords)

  if (usageError) {
    console.warn('Could not seed usage records (table may not exist):', usageError.message)
  } else {
    console.log(`Successfully seeded ${usageRecords.length} usage records`)
  }

  // Create payment methods
  const paymentMethod = {
    organization_id: DEMO_ORG_ID,
    stripe_payment_method_id: 'pm_demo_visa_123',
    type: 'card',
    card_brand: 'visa',
    card_last4: '4242',
    card_exp_month: 12,
    card_exp_year: 2026,
    is_default: true,
    created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
  }

  const { error: pmError } = await supabase
    .from('payment_methods')
    .insert(paymentMethod)

  if (pmError) {
    console.warn('Could not seed payment method (table may not exist):', pmError.message)
  } else {
    console.log('Successfully seeded payment method')
  }

  console.log('Billing summary:')
  console.log(`  Plan: ${BILLING_DATA.plan.name} - €${BILLING_DATA.plan.price}/${BILLING_DATA.plan.interval}`)
  console.log(`  Status: Active (since 6 months)`)
  console.log(`  Messages used: ${BILLING_DATA.usage.messages.used}/${BILLING_DATA.usage.messages.limit}`)
  console.log(`  Team members: ${BILLING_DATA.usage.team_members.used}/${BILLING_DATA.usage.team_members.limit}`)
}
