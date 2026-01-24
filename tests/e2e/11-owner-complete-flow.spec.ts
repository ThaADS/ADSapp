import { test, expect } from '@playwright/test';

interface RouteTestResult {
  success: string[];
  notFound: string[];
  redirected: Array<{ from: string; to: string }>;
  errors: Array<{ route: string; error: string }>;
}

test.describe('Owner Complete Flow - All Routes', () => {
  const dashboardRoutes = [
    '/dashboard',
    '/dashboard/inbox',
    '/dashboard/conversations',
    '/dashboard/contacts',
    '/dashboard/templates',
    '/dashboard/automation',
    '/dashboard/analytics',
    '/dashboard/settings',
    '/dashboard/settings/profile',
    '/dashboard/settings/organization',
    '/dashboard/settings/team',
    '/dashboard/settings/billing',
    '/dashboard/settings/integrations',
    '/dashboard/settings/whatsapp',
  ];

  test('should test all owner-accessible routes', async ({ page }) => {
    console.log('🔐 Starting Owner Route Testing...\n');

    // Login as Owner
    console.log('Logging in as owner@demo-company.com...');
    await page.goto('http://localhost:3001/auth/signin');
    await page.fill('input[type="email"]', 'owner@demo-company.com');
    await page.fill('input[type="password"]', 'Demo2024!Owner');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Verify login successful
    const currentUrl = page.url();
    console.log(`Current URL after login: ${currentUrl}\n`);
    expect(currentUrl).toContain('/dashboard');

    // Initialize results
    const results: RouteTestResult = {
      success: [],
      notFound: [],
      redirected: [],
      errors: []
    };

    // Test each route
    console.log('📋 Testing all routes...\n');
    for (const route of dashboardRoutes) {
      try {
        console.log(`Testing: ${route}`);
        await page.goto(`http://localhost:3001${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        await page.waitForTimeout(1000);

        const url = page.url();
        const content = await page.content();

        // Check for 404
        if (content.includes('404') ||
            content.includes('Not Found') ||
            content.includes('Page not found') ||
            content.toLowerCase().includes('not found')) {
          results.notFound.push(route);
          console.log(`  ❌ 404: ${route}\n`);
        }
        // Check for redirect
        else if (!url.includes(route.split('?')[0])) {
          results.redirected.push({ from: route, to: url });
          console.log(`  ↪️  Redirected: ${route} → ${url}\n`);
        }
        // Success
        else {
          results.success.push(route);
          console.log(`  ✅ OK: ${route}\n`);
        }

        // Take screenshot
        const screenshotName = `owner${route.replace(/\//g, '-')}`;
        await page.screenshot({
          path: `test-results/screenshots/${screenshotName}.png`,
          fullPage: true
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.errors.push({ route, error: errorMessage });
        console.log(`  ⚠️  Error: ${route} - ${errorMessage}\n`);
      }
    }

    // Final report
    console.log('\n' + '='.repeat(60));
    console.log('📊 OWNER ROUTE TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Working Routes: ${results.success.length}/${dashboardRoutes.length}`);
    console.log(`❌ 404 Errors: ${results.notFound.length}`);
    console.log(`↪️  Redirects: ${results.redirected.length}`);
    console.log(`⚠️  Errors: ${results.errors.length}`);
    console.log('='.repeat(60) + '\n');

    if (results.success.length > 0) {
      console.log('✅ Working Routes:');
      results.success.forEach(r => console.log(`   - ${r}`));
      console.log('');
    }

    if (results.notFound.length > 0) {
      console.log('❌ Pages Returning 404:');
      results.notFound.forEach(r => console.log(`   - ${r}`));
      console.log('');
    }

    if (results.redirected.length > 0) {
      console.log('↪️  Redirected Pages:');
      results.redirected.forEach(r => console.log(`   - ${r.from} → ${r.to}`));
      console.log('');
    }

    if (results.errors.length > 0) {
      console.log('⚠️  Pages with Errors:');
      results.errors.forEach(r => console.log(`   - ${r.route}: ${r.error}`));
      console.log('');
    }

    // Assert that all routes are accessible (no 404s)
    expect(results.notFound.length, `Found ${results.notFound.length} routes returning 404`).toBe(0);

    // Expect at least 80% of routes to be working
    const successRate = (results.success.length / dashboardRoutes.length) * 100;
    console.log(`\n📈 Success Rate: ${successRate.toFixed(1)}%`);
    expect(successRate).toBeGreaterThanOrEqual(80);
  });

  test('should verify owner can access billing settings', async ({ page }) => {
    console.log('🧪 Testing Owner-specific access (Billing)...\n');

    // Login as Owner
    await page.goto('http://localhost:3001/auth/signin');
    await page.fill('input[type="email"]', 'owner@demo-company.com');
    await page.fill('input[type="password"]', 'Demo2024!Owner');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to billing
    await page.goto('http://localhost:3001/dashboard/settings/billing');
    await page.waitForTimeout(1500);

    const url = page.url();
    const content = await page.content();

    console.log(`URL: ${url}`);

    // Owner should be able to access billing
    expect(url).toContain('/dashboard/settings/billing');
    expect(content).not.toContain('404');

    console.log('✅ Owner can access billing settings\n');
  });
});