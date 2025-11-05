/**
 * Stripe Mock Factory
 *
 * Mocking utilities for Stripe API operations.
 */

import Stripe from 'stripe'

// =============================================================================
// Mock Stripe Client
// =============================================================================

export function createMockStripeClient(): jest.Mocked<Partial<Stripe>> {
  return {
    customers: createMockCustomers(),
    subscriptions: createMockSubscriptions(),
    paymentIntents: createMockPaymentIntents(),
    prices: createMockPrices(),
    products: createMockProducts(),
    webhooks: createMockWebhooks(),
    invoices: createMockInvoices(),
    paymentMethods: createMockPaymentMethods(),
  } as any
}

// =============================================================================
// Customer Mocks
// =============================================================================

function createMockCustomers() {
  return {
    create: jest.fn().mockResolvedValue({
      id: 'cus_test_123',
      object: 'customer',
      email: 'test@example.com',
      created: Math.floor(Date.now() / 1000),
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'cus_test_123',
      object: 'customer',
      email: 'test@example.com',
    }),
    update: jest.fn().mockResolvedValue({
      id: 'cus_test_123',
      object: 'customer',
      email: 'updated@example.com',
    }),
    del: jest.fn().mockResolvedValue({
      id: 'cus_test_123',
      deleted: true,
    }),
    list: jest.fn().mockResolvedValue({
      data: [],
      has_more: false,
    }),
  }
}

// =============================================================================
// Subscription Mocks
// =============================================================================

function createMockSubscriptions() {
  return {
    create: jest.fn().mockResolvedValue({
      id: 'sub_test_123',
      object: 'subscription',
      status: 'active',
      customer: 'cus_test_123',
      items: { data: [] },
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'sub_test_123',
      object: 'subscription',
      status: 'active',
    }),
    update: jest.fn().mockResolvedValue({
      id: 'sub_test_123',
      object: 'subscription',
      status: 'active',
    }),
    cancel: jest.fn().mockResolvedValue({
      id: 'sub_test_123',
      object: 'subscription',
      status: 'canceled',
    }),
    list: jest.fn().mockResolvedValue({
      data: [],
      has_more: false,
    }),
  }
}

// =============================================================================
// Payment Intent Mocks
// =============================================================================

function createMockPaymentIntents() {
  return {
    create: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      object: 'payment_intent',
      status: 'succeeded',
      amount: 1000,
      currency: 'usd',
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      object: 'payment_intent',
      status: 'succeeded',
    }),
    confirm: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      object: 'payment_intent',
      status: 'succeeded',
    }),
    cancel: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      object: 'payment_intent',
      status: 'canceled',
    }),
  }
}

// =============================================================================
// Price & Product Mocks
// =============================================================================

function createMockPrices() {
  return {
    list: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'price_test_123',
          object: 'price',
          unit_amount: 999,
          currency: 'usd',
        },
      ],
      has_more: false,
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'price_test_123',
      object: 'price',
      unit_amount: 999,
    }),
  }
}

function createMockProducts() {
  return {
    list: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'prod_test_123',
          object: 'product',
          name: 'Test Product',
        },
      ],
      has_more: false,
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: 'prod_test_123',
      object: 'product',
      name: 'Test Product',
    }),
  }
}

// =============================================================================
// Webhook Mocks
// =============================================================================

function createMockWebhooks() {
  return {
    constructEvent: jest.fn((payload: string, signature: string, secret: string) => ({
      id: 'evt_test_123',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test_123',
        },
      },
    })),
  }
}

// =============================================================================
// Invoice Mocks
// =============================================================================

function createMockInvoices() {
  return {
    retrieve: jest.fn().mockResolvedValue({
      id: 'in_test_123',
      object: 'invoice',
      status: 'paid',
    }),
    list: jest.fn().mockResolvedValue({
      data: [],
      has_more: false,
    }),
  }
}

// =============================================================================
// Payment Method Mocks
// =============================================================================

function createMockPaymentMethods() {
  return {
    attach: jest.fn().mockResolvedValue({
      id: 'pm_test_123',
      object: 'payment_method',
    }),
    detach: jest.fn().mockResolvedValue({
      id: 'pm_test_123',
      object: 'payment_method',
    }),
  }
}

// =============================================================================
// Export
// =============================================================================

export default {
  createMockStripeClient,
}
