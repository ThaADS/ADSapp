/**
 * Stripe API Mock Handlers
 *
 * Provides mock implementations for Stripe SDK operations.
 * Useful for testing subscription billing, payments, and webhook handling.
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import type Stripe from 'stripe'

/**
 * Mock Stripe Customer data
 */
export function createMockStripeCustomer(overrides?: Partial<Stripe.Customer>): Stripe.Customer {
  const id = overrides?.id || `cus_test_${Date.now()}_${Math.random().toString(36).substring(7)}`
  return {
    id,
    object: 'customer',
    address: null,
    balance: 0,
    created: Math.floor(Date.now() / 1000),
    currency: 'usd',
    default_source: null,
    delinquent: false,
    description: overrides?.description || 'Test Customer',
    discount: null,
    email: overrides?.email || 'test@example.com',
    invoice_prefix: 'TEST',
    invoice_settings: {
      custom_fields: null,
      default_payment_method: null,
      footer: null,
      rendering_options: null,
    },
    livemode: false,
    metadata: overrides?.metadata || {},
    name: overrides?.name || 'Test Customer',
    phone: null,
    preferred_locales: [],
    shipping: null,
    tax_exempt: 'none',
    test_clock: null,
    ...overrides,
  } as Stripe.Customer
}

/**
 * Mock Stripe Subscription data
 */
export function createMockStripeSubscription(
  overrides?: Partial<Stripe.Subscription>
): Stripe.Subscription {
  const id = overrides?.id || `sub_test_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const now = Math.floor(Date.now() / 1000)

  return {
    id,
    object: 'subscription',
    application: null,
    application_fee_percent: null,
    automatic_tax: { enabled: false },
    billing_cycle_anchor: now,
    billing_thresholds: null,
    cancel_at: null,
    cancel_at_period_end: false,
    canceled_at: null,
    cancellation_details: null,
    collection_method: 'charge_automatically',
    created: now,
    currency: 'usd',
    current_period_end: now + 30 * 24 * 60 * 60, // 30 days
    current_period_start: now,
    customer: overrides?.customer || 'cus_test123',
    days_until_due: null,
    default_payment_method: null,
    default_source: null,
    default_tax_rates: [],
    description: null,
    discount: null,
    ended_at: null,
    items: {
      object: 'list',
      data: [
        {
          id: 'si_test123',
          object: 'subscription_item',
          billing_thresholds: null,
          created: now,
          metadata: {},
          plan: {
            id: 'price_test123',
            object: 'plan',
            active: true,
            aggregate_usage: null,
            amount: 2900,
            amount_decimal: '2900',
            billing_scheme: 'per_unit',
            created: now,
            currency: 'usd',
            interval: 'month',
            interval_count: 1,
            livemode: false,
            metadata: {},
            nickname: 'Pro Plan',
            product: 'prod_test123',
            tiers_mode: null,
            transform_usage: null,
            trial_period_days: null,
            usage_type: 'licensed',
          } as Stripe.Plan,
          price: {
            id: 'price_test123',
            object: 'price',
            active: true,
            billing_scheme: 'per_unit',
            created: now,
            currency: 'usd',
            custom_unit_amount: null,
            livemode: false,
            lookup_key: null,
            metadata: {},
            nickname: 'Pro Plan',
            product: 'prod_test123',
            recurring: {
              aggregate_usage: null,
              interval: 'month',
              interval_count: 1,
              trial_period_days: null,
              usage_type: 'licensed',
            },
            tax_behavior: 'unspecified',
            tiers_mode: null,
            transform_quantity: null,
            type: 'recurring',
            unit_amount: 2900,
            unit_amount_decimal: '2900',
          } as Stripe.Price,
          quantity: 1,
          subscription: id,
          tax_rates: [],
        } as Stripe.SubscriptionItem,
      ],
      has_more: false,
      url: '/v1/subscription_items',
    },
    latest_invoice: null,
    livemode: false,
    metadata: overrides?.metadata || {},
    next_pending_invoice_item_invoice: null,
    on_behalf_of: null,
    pause_collection: null,
    payment_settings: {
      payment_method_options: null,
      payment_method_types: null,
      save_default_payment_method: 'off',
    },
    pending_invoice_item_interval: null,
    pending_setup_intent: null,
    pending_update: null,
    schedule: null,
    start_date: now,
    status: overrides?.status || 'active',
    test_clock: null,
    transfer_data: null,
    trial_end: null,
    trial_settings: { end_behavior: { missing_payment_method: 'create_invoice' } },
    trial_start: null,
    ...overrides,
  } as Stripe.Subscription
}

/**
 * Mock Stripe Payment Intent data
 */
export function createMockStripePaymentIntent(
  overrides?: Partial<Stripe.PaymentIntent>
): Stripe.PaymentIntent {
  const id = overrides?.id || `pi_test_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const now = Math.floor(Date.now() / 1000)

  return {
    id,
    object: 'payment_intent',
    amount: overrides?.amount || 2900,
    amount_capturable: 0,
    amount_details: { tip: {} },
    amount_received: overrides?.amount || 2900,
    application: null,
    application_fee_amount: null,
    automatic_payment_methods: null,
    canceled_at: null,
    cancellation_reason: null,
    capture_method: 'automatic',
    client_secret: `${id}_secret_test123`,
    confirmation_method: 'automatic',
    created: now,
    currency: 'usd',
    customer: overrides?.customer || null,
    description: overrides?.description || null,
    invoice: null,
    last_payment_error: null,
    latest_charge: null,
    livemode: false,
    metadata: overrides?.metadata || {},
    next_action: null,
    on_behalf_of: null,
    payment_method: null,
    payment_method_options: {},
    payment_method_types: ['card'],
    processing: null,
    receipt_email: null,
    review: null,
    setup_future_usage: null,
    shipping: null,
    statement_descriptor: null,
    statement_descriptor_suffix: null,
    status: overrides?.status || 'succeeded',
    transfer_data: null,
    transfer_group: null,
    ...overrides,
  } as Stripe.PaymentIntent
}

/**
 * Mock Stripe Webhook Event
 */
export function createMockStripeWebhookEvent(type: string, data: any): Stripe.Event {
  return {
    id: `evt_test_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    object: 'event',
    account: null,
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    data: {
      object: data,
      previous_attributes: undefined,
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
    type: type as Stripe.Event.Type,
  } as Stripe.Event
}

/**
 * Mock Stripe Price data
 */
export function createMockStripePrice(overrides?: Partial<Stripe.Price>): Stripe.Price {
  const id = overrides?.id || `price_test_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const now = Math.floor(Date.now() / 1000)

  return {
    id,
    object: 'price',
    active: overrides?.active !== undefined ? overrides.active : true,
    billing_scheme: 'per_unit',
    created: now,
    currency: 'usd',
    custom_unit_amount: null,
    livemode: false,
    lookup_key: null,
    metadata: overrides?.metadata || {},
    nickname: overrides?.nickname || 'Test Price',
    product: overrides?.product || 'prod_test123',
    recurring: overrides?.recurring || {
      aggregate_usage: null,
      interval: 'month',
      interval_count: 1,
      trial_period_days: null,
      usage_type: 'licensed',
    },
    tax_behavior: 'unspecified',
    tiers_mode: null,
    transform_quantity: null,
    type: 'recurring',
    unit_amount: overrides?.unit_amount || 2900,
    unit_amount_decimal: String(overrides?.unit_amount || 2900),
    ...overrides,
  } as Stripe.Price
}

/**
 * Mock Stripe Product data
 */
export function createMockStripeProduct(overrides?: Partial<Stripe.Product>): Stripe.Product {
  const id = overrides?.id || `prod_test_${Date.now()}_${Math.random().toString(36).substring(7)}`
  const now = Math.floor(Date.now() / 1000)

  return {
    id,
    object: 'product',
    active: overrides?.active !== undefined ? overrides.active : true,
    created: now,
    default_price: null,
    description: overrides?.description || 'Test Product',
    images: [],
    livemode: false,
    metadata: overrides?.metadata || {},
    name: overrides?.name || 'Test Product',
    package_dimensions: null,
    shippable: null,
    statement_descriptor: null,
    tax_code: null,
    unit_label: null,
    updated: now,
    url: null,
    ...overrides,
  } as Stripe.Product
}

/**
 * Creates a mock Stripe client with jest mock functions
 */
export function createMockStripeClient() {
  return {
    customers: {
      create: jest.fn((params: Stripe.CustomerCreateParams) =>
        Promise.resolve(createMockStripeCustomer(params))
      ),
      retrieve: jest.fn((id: string) => Promise.resolve(createMockStripeCustomer({ id }))),
      update: jest.fn((id: string, params: Stripe.CustomerUpdateParams) =>
        Promise.resolve(createMockStripeCustomer({ id, ...params }))
      ),
      del: jest.fn((id: string) =>
        Promise.resolve({ id, object: 'customer', deleted: true } as Stripe.DeletedCustomer)
      ),
      list: jest.fn(() =>
        Promise.resolve({
          object: 'list',
          data: [],
          has_more: false,
          url: '/v1/customers',
        } as Stripe.ApiList<Stripe.Customer>)
      ),
    },
    subscriptions: {
      create: jest.fn((params: Stripe.SubscriptionCreateParams) =>
        Promise.resolve(createMockStripeSubscription({ customer: params.customer as string }))
      ),
      retrieve: jest.fn((id: string) => Promise.resolve(createMockStripeSubscription({ id }))),
      update: jest.fn((id: string, params: Stripe.SubscriptionUpdateParams) =>
        Promise.resolve(createMockStripeSubscription({ id, ...params }))
      ),
      cancel: jest.fn((id: string) =>
        Promise.resolve(createMockStripeSubscription({ id, status: 'canceled' }))
      ),
      list: jest.fn(() =>
        Promise.resolve({
          object: 'list',
          data: [],
          has_more: false,
          url: '/v1/subscriptions',
        } as Stripe.ApiList<Stripe.Subscription>)
      ),
    },
    paymentIntents: {
      create: jest.fn((params: Stripe.PaymentIntentCreateParams) =>
        Promise.resolve(createMockStripePaymentIntent({ amount: params.amount }))
      ),
      retrieve: jest.fn((id: string) => Promise.resolve(createMockStripePaymentIntent({ id }))),
      confirm: jest.fn((id: string) =>
        Promise.resolve(createMockStripePaymentIntent({ id, status: 'succeeded' }))
      ),
      cancel: jest.fn((id: string) =>
        Promise.resolve(createMockStripePaymentIntent({ id, status: 'canceled' }))
      ),
    },
    webhooks: {
      constructEvent: jest.fn((payload: string | Buffer, signature: string, secret: string) => {
        const data = JSON.parse(payload.toString())
        return createMockStripeWebhookEvent(data.type, data.data.object)
      }),
    },
    prices: {
      retrieve: jest.fn((id: string) => Promise.resolve(createMockStripePrice({ id }))),
      list: jest.fn(() =>
        Promise.resolve({
          object: 'list',
          data: [],
          has_more: false,
          url: '/v1/prices',
        } as Stripe.ApiList<Stripe.Price>)
      ),
    },
    products: {
      retrieve: jest.fn((id: string) => Promise.resolve(createMockStripeProduct({ id }))),
      list: jest.fn(() =>
        Promise.resolve({
          object: 'list',
          data: [],
          has_more: false,
          url: '/v1/products',
        } as Stripe.ApiList<Stripe.Product>)
      ),
    },
  }
}

/**
 * Common webhook event scenarios
 */
export const mockStripeWebhookEvents = {
  customerCreated: (customer: Stripe.Customer) =>
    createMockStripeWebhookEvent('customer.created', customer),

  subscriptionCreated: (subscription: Stripe.Subscription) =>
    createMockStripeWebhookEvent('customer.subscription.created', subscription),

  subscriptionUpdated: (subscription: Stripe.Subscription) =>
    createMockStripeWebhookEvent('customer.subscription.updated', subscription),

  subscriptionDeleted: (subscription: Stripe.Subscription) =>
    createMockStripeWebhookEvent('customer.subscription.deleted', subscription),

  paymentIntentSucceeded: (paymentIntent: Stripe.PaymentIntent) =>
    createMockStripeWebhookEvent('payment_intent.succeeded', paymentIntent),

  paymentIntentFailed: (paymentIntent: Stripe.PaymentIntent) =>
    createMockStripeWebhookEvent('payment_intent.payment_failed', paymentIntent),

  invoicePaid: (invoiceId: string) =>
    createMockStripeWebhookEvent('invoice.paid', {
      id: invoiceId,
      object: 'invoice',
      status: 'paid',
    }),

  invoicePaymentFailed: (invoiceId: string) =>
    createMockStripeWebhookEvent('invoice.payment_failed', {
      id: invoiceId,
      object: 'invoice',
      status: 'open',
    }),
}

/**
 * Example Usage:
 *
 * ```typescript
 * // Mock Stripe client in tests
 * const mockStripe = createMockStripeClient()
 * jest.mock('stripe', () => {
 *   return jest.fn(() => mockStripe)
 * })
 *
 * // Test subscription creation
 * const subscription = await mockStripe.subscriptions.create({
 *   customer: 'cus_test123',
 *   items: [{ price: 'price_test123' }]
 * })
 * expect(subscription.status).toBe('active')
 * expect(mockStripe.subscriptions.create).toHaveBeenCalled()
 *
 * // Test webhook handling
 * const event = mockStripeWebhookEvents.subscriptionCreated(subscription)
 * await handleStripeWebhook(event)
 * ```
 */

export default {
  createMockStripeCustomer,
  createMockStripeSubscription,
  createMockStripePaymentIntent,
  createMockStripeWebhookEvent,
  createMockStripePrice,
  createMockStripeProduct,
  createMockStripeClient,
  mockStripeWebhookEvents,
}
