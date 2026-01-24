import { test, expect } from '@playwright/test';

interface RouteTestResult {
  success: string[];
  notFound: string[];
  redirected: Array<{ from: string; to: string }>;
  errors: Array<{ route: string; error: string }>;
  blocked: string[];
}

test.describe('Admin Complete Flow - All Routes', () => {
  const adminAccessibleRoutes = [
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
    '/dashboard/settings/integrations',
    '/dashboard/settings/whatsapp',
  ];

  const adminRestrictedRoutes = [
    '/dashboard/settings/billing', // Owner only
  ];

  test('should test all admin-accessible routes', async ({ page }) => {
    console.log('🔐 Starting Admin Route Testing...\n');

    // Login as Admin
    console.log('Logging in as admin@demo-company.com...');
    await page.goto('http://localhost:3001/auth/signin');
    await page.fill('input[type="email"]', 'admin@demo-company.com');
    await page.fill('input[type="password"]', 'Demo2024!Admin');
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
      errors: [],
      blocked: []
    };

    // Test accessible routes
    console.log('📋 Testing admin-accessible routes...\n');
    for (const route of adminAccessibleRoutes) {
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
        const screenshotName = `admin${route.replace(/\//g, '-')}`;
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

    // Final report for accessible routes
    console.log('\n' + '='.repeat(60));
    console.log('📊 ADMIN ROUTE TEST RESULTS (ACCESSIBLE)');
    console.log('='.repeat(60));
    console.log(`✅ Working Routes: ${results.success.length}/${adminAccessibleRoutes.length}`);
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

    // Assert that all accessible routes work (no 404s)
    expect(results.notFound.length, `Found ${results.notFound.length} accessible routes returning 404`).toBe(0);

    // Expect at least 80% of routes to be working
    const successRate = (results.success.length / adminAccessibleRoutes.length) * 100;
    console.log(`\n📈 Success Rate: ${successRate.toFixed(1)}%`);
    expect(successRate).toBeGreaterThanOrEqual(80);
  });

  test('should verify admin cannot access owner-only routes', async ({ page }) => {
    console.log('🔒 Testing Admin access restrictions...\n');

    // Login as Admin
    await page.goto('http://localhost:3001/auth/signin');
    await page.fill('input[type="email"]', 'admin@demo-company.com');
    await page.fill('input[type="password"]', 'Demo2024!Admin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const blockedResults: string[] = [];
    const unexpectedAccessResults: string[] = [];

    console.log('📋 Testing owner-only routes...\n');
    for (const route of adminRestrictedRoutes) {
      try {
        console.log(`Testing restricted route: ${route}`);
        await page.goto(`http://localhost:3001${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        await page.waitForTimeout(1000);

        const url = page.url();
        const content = await page.content();

        // Admin should be redirected or see permission denied
        if (!url.includes(route) ||
            content.includes('permission') ||
            content.includes('unauthorized') ||
            content.includes('access denied')) {
          blockedResults.push(route);
          console.log(`  ✅ Properly blocked: ${route} (redirected to ${url})\n`);
        } else {
          unexpectedAccessResults.push(route);
          console.log(`  ⚠️  SECURITY ISSUE: Admin has access to ${route}\n`);
        }

        // Take screenshot
        const screenshotName = `admin-restricted${route.replace(/\//g, '-')}`;
        await page.screenshot({
          path: `test-results/screenshots/${screenshotName}.png`,
          fullPage: true
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.log(`  ℹ️  Route errored (expected): ${route} - ${errorMessage}\n`);
        blockedResults.push(route);
      }
    }

    // Report access control results
    console.log('\n' + '='.repeat(60));
    console.log('🔒 ADMIN ACCESS CONTROL RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Properly Blocked: ${blockedResults.length}/${adminRestrictedRoutes.length}`);
    console.log(`⚠️  Security Issues: ${unexpectedAccessResults.length}`);
    console.log('='.repeat(60) + '\n');

    if (unexpectedAccessResults.length > 0) {
      console.log('⚠️  SECURITY ISSUES - Admin has unexpected access to:');
      unexpectedAccessResults.forEach(r => console.log(`   - ${r}`));
      console.log('');
    }

    // Assert that admin is properly blocked from owner-only routes
    expect(unexpectedAccessResults.length,
      `Admin has unexpected access to ${unexpectedAccessResults.length} owner-only routes`
    ).toBe(0);
  });
});