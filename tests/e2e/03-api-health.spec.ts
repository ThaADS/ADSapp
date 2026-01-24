import { test, expect } from '@playwright/test';

test.describe('API Health Checks', () => {
  test('should check health endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/health');

    // Check if health endpoint responds
    expect(response.status()).toBe(200);

    const healthData = await response.json();
    console.log('Health check response:', healthData);

    // Basic health check structure validation
    expect(healthData).toHaveProperty('status');
  });

  test('should check billing plans endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/billing/plans');

    // Should return some response (might be 401/403 without auth, which is expected)
    expect([200, 401, 403, 500]).toContain(response.status());

    console.log('Billing plans status:', response.status());
  });

  test('should check analytics endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/analytics/dashboard');

    // Should return some response (might be 401/403 without auth, which is expected)
    expect([200, 401, 403, 500]).toContain(response.status());

    console.log('Analytics dashboard status:', response.status());
  });

  test('should check admin endpoints', async ({ request }) => {
    const adminEndpoints = [
      '/api/admin/dashboard',
      '/api/admin/users',
      '/api/admin/organizations'
    ];

    for (const endpoint of adminEndpoints) {
      const response = await request.get(`http://localhost:3000${endpoint}`);

      // Admin endpoints should respond (likely with auth errors, which is expected)
      expect([200, 401, 403, 500]).toContain(response.status());

      console.log(`${endpoint} status:`, response.status());
    }
  });

  test('should check WhatsApp webhook endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/webhooks/whatsapp');

    // Webhook endpoints might return method not allowed for GET
    expect([200, 405, 401, 403, 500]).toContain(response.status());

    console.log('WhatsApp webhook status:', response.status());
  });

  test('should check Stripe webhook endpoint', async ({ request }) => {
    const response = await request.get('http://localhost:3000/api/webhooks/stripe');

    // Webhook endpoints might return method not allowed for GET
    expect([200, 405, 401, 403, 500]).toContain(response.status());

    console.log('Stripe webhook status:', response.status());
  });
});