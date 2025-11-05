/**
 * Stripe Test Helpers
 *
 * Mock factories and utilities for testing Stripe integration
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import Stripe from 'stripe'

// =============================================================================
// Mock Factories
// =============================================================================

/**
 * Create a mock Stripe customer
 */
export function createMockCustomer(overrides: Partial<Stripe.Customer> = {}): Stripe.Customer {
  return {
    id: overrides.id || `cus_test${Date.now()}`,
    object: 'customer',
    address: null,
    balance: 0,
    created: Math.floor(Date.now() / 1000),
    currency: null,
    default_source: null,
    delinquent: false,
    description: overrides.description || 'Test customer',
    discount: null,
    email: overrides.email || `test${Date.now()}@example.com`,
    invoice_prefix: null,
    invoice_settings: {
      custom_fields: null,
      default_payment_method: null,
      footer: null,
      rendering_options: null,
    },
    livemode: false,
    metadata: overrides.metadata || {},
    name: overrides.name || 'Test Customer',
    phone: null,
    preferred_locales: [],
    shipping: null,
    tax_exempt: 'none',
    test_clock: null,
    ...overrides,
  } as Stripe.Customer
}

/**
 * Create a mock Stripe subscription
 */
export function createMockSubscription(
  overrides: Partial<Stripe.Subscription> = {}
): Stripe.Subscription {
  const now = Math.floor(Date.now() / 1000)

  return {
    id: overrides.id || `sub_test${Date.now()}`,
    object: 'subscription',
    application: null,
    application_fee_percent: null,
    automatic_tax: { enabled: false },
    billing_cycle_anchor: now,
    billing_thresholds: null,
    cancel_at: null,
    cancel_at_period_end: false,
    canceled_at: null,
    cancellation_details: { comment: null, feedback: null, reason: null },
    collection_method: 'charge_automatically',
    created: now,
    currency: 'usd',
    current_period_end: now + 2592000, // 30 days
    current_period_start: now,
    customer: overrides.customer || 'cus_test123',
    days_until_due: null,
    default_payment_method: null,
    default_source: null,
    default_tax_rates: [],
    description: null,
    discount: null,
    ended_at: null,
    items: {
      object: 'list',
      data: [],
      has_more: false,
      url: '/v1/subscription_items',
    },
    latest_invoice: null,
    livemode: false,
    metadata: overrides.metadata || {},
    next_pending_invoice_item_invoice: null,
    on_behalf_of: null,
    pause_collection: null,
    payment_settings: null,
    pending_invoice_item_interval: null,
    pending_setup_intent: null,
    pending_update: null,
    schedule: null,
    start_date: now,
    status: overrides.status || 'active',
    test_clock: null,
    transfer_data: null,
    trial_end: null,
    trial_settings: { end_behavior: { missing_payment_method: 'create_invoice' } },
    trial_start: null,
    ...overrides,
  } as Stripe.Subscription
}

/**
 * Create a mock Payment Intent
 */
export function createMockPaymentIntent(
  overrides: Partial<Stripe.PaymentIntent> = {}
): Stripe.PaymentIntent {
  return {
    id: overrides.id || `pi_test${Date.now()}`,
    object: 'payment_intent',
    amount: overrides.amount || 1000,
    amount_capturable: 0,
    amount_details: { tip: {} },
    amount_received: overrides.amount || 1000,
    application: null,
    application_fee_amount: null,
    automatic_payment_methods: null,
    canceled_at: null,
    cancellation_reason: null,
    capture_method: 'automatic',
    client_secret: 'pi_test_secret',
    confirmation_method: 'automatic',
    created: Math.floor(Date.now() / 1000),
    currency: 'usd',
    customer: overrides.customer || null,
    description: overrides.description || null,
    invoice: null,
    last_payment_error: null,
    latest_charge: null,
    livemode: false,
    metadata: overrides.metadata || {},
    next_action: null,
    on_behalf_of: null,
    payment_method: null,
    payment_method_configuration_details: null,
    payment_method_options: {},
    payment_method_types: ['card'],
    processing: null,
    receipt_email: null,
    review: null,
    setup_future_usage: null,
    shipping: null,
    source: null,
    statement_descriptor: null,
    statement_descriptor_suffix: null,
    status: overrides.status || 'succeeded',
    transfer_data: null,
    transfer_group: null,
    ...overrides,
  } as Stripe.PaymentIntent
}

/**
 * Create a mock Webhook Event
 */
export function createMockWebhookEvent(
  type: string,
  data: any,
  overrides: Partial<Stripe.Event> = {}
): Stripe.Event {
  return {
    id: overrides.id || `evt_test${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: data,
      previous_attributes: undefined,
    },
    livemode: false,
    pending_webhooks: 0,
    request: {
      id: null,
      idempotency_key: null,
    },
    type: type as Stripe.Event.Type,
    ...overrides,
  } as Stripe.Event
}

// =============================================================================
// Webhook Event Factories
// =============================================================================

export function createCustomerCreatedEvent(customer?: Partial<Stripe.Customer>) {
  return createMockWebhookEvent('customer.created', createMockCustomer(customer))
}

export function createCustomerUpdatedEvent(customer?: Partial<Stripe.Customer>) {
  return createMockWebhookEvent('customer.updated', createMockCustomer(customer))
}

export function createCustomerDeletedEvent(customer?: Partial<Stripe.Customer>) {
  return createMockWebhookEvent('customer.deleted', createMockCustomer(customer))
}

export function createSubscriptionCreatedEvent(subscription?: Partial<Stripe.Subscription>) {
  return createMockWebhookEvent('customer.subscription.created', createMockSubscription(subscription))
}

export function createSubscriptionUpdatedEvent(subscription?: Partial<Stripe.Subscription>) {
  return createMockWebhookEvent('customer.subscription.updated', createMockSubscription(subscription))
}

export function createSubscriptionDeletedEvent(subscription?: Partial<Stripe.Subscription>) {
  return createMockWebhookEvent('customer.subscription.deleted', createMockSubscription(subscription))
}

export function createPaymentIntentSucceededEvent(paymentIntent?: Partial<Stripe.PaymentIntent>) {
  return createMockWebhookEvent('payment_intent.succeeded', createMockPaymentIntent(paymentIntent))
}

export function createPaymentIntentFailedEvent(paymentIntent?: Partial<Stripe.PaymentIntent>) {
  return createMockWebhookEvent(
    'payment_intent.payment_failed',
    createMockPaymentIntent({ ...paymentIntent, status: 'requires_payment_method' })
  )
}

// =============================================================================
// Price & Product Factories
// =============================================================================

export function createMockPrice(overrides: Partial<Stripe.Price> = {}): Stripe.Price {
  return {
    id: overrides.id || `price_test${Date.now()}`,
    object: 'price',
    active: overrides.active !== undefined ? overrides.active : true,
    billing_scheme: 'per_unit',
    created: Math.floor(Date.now() / 1000),
    currency: 'usd',
    custom_unit_amount: null,
    livemode: false,
    lookup_key: null,
    metadata: overrides.metadata || {},
    nickname: overrides.nickname || null,
    product: overrides.product || 'prod_test123',
    recurring: overrides.recurring || {
      aggregate_usage: null,
      interval: 'month',
      interval_count: 1,
      meter: null,
      trial_period_days: null,
      usage_type: 'licensed',
    },
    tax_behavior: 'unspecified',
    tiers_mode: null,
    transform_quantity: null,
    type: 'recurring',
    unit_amount: overrides.unit_amount || 2999,
    unit_amount_decimal: overrides.unit_amount_decimal || '2999',
    ...overrides,
  } as Stripe.Price
}

export function createMockProduct(overrides: Partial<Stripe.Product> = {}): Stripe.Product {
  return {
    id: overrides.id || `prod_test${Date.now()}`,
    object: 'product',
    active: overrides.active !== undefined ? overrides.active : true,
    attributes: [],
    created: Math.floor(Date.now() / 1000),
    default_price: null,
    description: overrides.description || 'Test product',
    images: [],
    livemode: false,
    metadata: overrides.metadata || {},
    name: overrides.name || 'Test Product',
    package_dimensions: null,
    shippable: null,
    statement_descriptor: null,
    tax_code: null,
    type: 'service',
    unit_label: null,
    updated: Math.floor(Date.now() / 1000),
    url: null,
    ...overrides,
  } as Stripe.Product
}

// =============================================================================
// Test Plan Factories
// =============================================================================

export function createStarterPlan() {
  const product = createMockProduct({
    id: 'prod_starter',
    name: 'Starter Plan',
    description: 'Perfect for small teams',
  })

  const price = createMockPrice({
    id: 'price_starter',
    product: product.id,
    unit_amount: 2900,
    recurring: {
      interval: 'month',
      interval_count: 1,
      aggregate_usage: null,
      meter: null,
      trial_period_days: 14,
      usage_type: 'licensed',
    },
  })

  return { product, price }
}

export function createProfessionalPlan() {
  const product = createMockProduct({
    id: 'prod_professional',
    name: 'Professional Plan',
    description: 'For growing businesses',
  })

  const price = createMockPrice({
    id: 'price_professional',
    product: product.id,
    unit_amount: 9900,
    recurring: {
      interval: 'month',
      interval_count: 1,
      aggregate_usage: null,
      meter: null,
      trial_period_days: 14,
      usage_type: 'licensed',
    },
  })

  return { product, price }
}

export function createEnterprisePlan() {
  const product = createMockProduct({
    id: 'prod_enterprise',
    name: 'Enterprise Plan',
    description: 'For large organizations',
  })

  const price = createMockPrice({
    id: 'price_enterprise',
    product: product.id,
    unit_amount: 29900,
    recurring: {
      interval: 'month',
      interval_count: 1,
      aggregate_usage: null,
      meter: null,
      trial_period_days: null,
      usage_type: 'licensed',
    },
  })

  return { product, price }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Mock Stripe webhook signature verification
 */
export function mockWebhookSignature(payload: string, secret: string): string {
  return `t=${Math.floor(Date.now() / 1000)},v1=mock_signature_${Buffer.from(payload).toString('base64').slice(0, 10)}`
}

/**
 * Simulate webhook payload construction
 */
export function constructWebhookPayload(event: Stripe.Event): string {
  return JSON.stringify(event)
}

export default {
  createMockCustomer,
  createMockSubscription,
  createMockPaymentIntent,
  createMockWebhookEvent,
  createCustomerCreatedEvent,
  createCustomerUpdatedEvent,
  createCustomerDeletedEvent,
  createSubscriptionCreatedEvent,
  createSubscriptionUpdatedEvent,
  createSubscriptionDeletedEvent,
  createPaymentIntentSucceededEvent,
  createPaymentIntentFailedEvent,
  createMockPrice,
  createMockProduct,
  createStarterPlan,
  createProfessionalPlan,
  createEnterprisePlan,
  mockWebhookSignature,
  constructWebhookPayload,
}
