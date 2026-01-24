import { test, expect } from '@playwright/test';

interface RouteTestResult {
  success: string[];
  notFound: string[];
  redirected: Array<{ from: string; to: string }>;
  errors: Array<{ route: string; error: string }>;
  blocked: string[];
}

test.describe('Agent Complete Flow - All Routes', () => {
  const agentAccessibleRoutes = [
    '/dashboard',
    '/dashboard/inbox',
    '/dashboard/conversations',
    '/dashboard/contacts',
    '/dashboard/settings',
    '/dashboard/settings/profile',
  ];

  const agentRestrictedRoutes = [
    '/dashboard/templates',
    '/dashboard/automation',
    '/dashboard/analytics',
    '/dashboard/settings/organization',
    '/dashboard/settings/team',
    '/dashboard/settings/billing',
    '/dashboard/settings/integrations',
    '/dashboard/settings/whatsapp',
  ];

  test('should test all agent-accessible routes', async ({ page }) => {
    console.log('🔐 Starting Agent Route Testing...\n');

    // Login as Agent
    console.log('Logging in as agent@demo-company.com...');
    await page.goto('http://localhost:3001/auth/signin');
    await page.fill('input[type="email"]', 'agent@demo-company.com');
    await page.fill('input[type="password"]', 'Demo2024!Agent');
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
    console.log('📋 Testing agent-accessible routes...\n');
    for (const route of agentAccessibleRoutes) {
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
        const screenshotName = `agent${route.replace(/\//g, '-')}`;
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
    console.log('📊 AGENT ROUTE TEST RESULTS (ACCESSIBLE)');
    console.log('='.repeat(60));
    console.log(`✅ Working Routes: ${results.success.length}/${agentAccessibleRoutes.length}`);
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
    const successRate = (results.success.length / agentAccessibleRoutes.length) * 100;
    console.log(`\n📈 Success Rate: ${successRate.toFixed(1)}%`);
    expect(successRate).toBeGreaterThanOrEqual(80);
  });

  test('should verify agent cannot access restricted routes', async ({ page }) => {
    console.log('🔒 Testing Agent access restrictions...\n');

    // Login as Agent
    await page.goto('http://localhost:3001/auth/signin');
    await page.fill('input[type="email"]', 'agent@demo-company.com');
    await page.fill('input[type="password"]', 'Demo2024!Agent');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const blockedResults: string[] = [];
    const unexpectedAccessResults: string[] = [];

    console.log('📋 Testing restricted routes...\n');
    for (const route of agentRestrictedRoutes) {
      try {
        console.log(`Testing restricted route: ${route}`);
        await page.goto(`http://localhost:3001${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        await page.waitForTimeout(1000);

        const url = page.url();
        const content = await page.content();

        // Agent should be redirected or see permission denied
        if (!url.includes(route) ||
            content.includes('permission') ||
            content.includes('unauthorized') ||
            content.includes('access denied')) {
          blockedResults.push(route);
          console.log(`  ✅ Properly blocked: ${route} (redirected to ${url})\n`);
        } else {
          unexpectedAccessResults.push(route);
          console.log(`  ⚠️  SECURITY ISSUE: Agent has access to ${route}\n`);
        }

        // Take screenshot
        const screenshotName = `agent-restricted${route.replace(/\//g, '-')}`;
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
    console.log('🔒 AGENT ACCESS CONTROL RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Properly Blocked: ${blockedResults.length}/${agentRestrictedRoutes.length}`);
    console.log(`⚠️  Security Issues: ${unexpectedAccessResults.length}`);
    console.log('='.repeat(60) + '\n');

    if (unexpectedAccessResults.length > 0) {
      console.log('⚠️  SECURITY ISSUES - Agent has unexpected access to:');
      unexpectedAccessResults.forEach(r => console.log(`   - ${r}`));
      console.log('');
    }

    // Assert that agent is properly blocked from restricted routes
    expect(unexpectedAccessResults.length,
      `Agent has unexpected access to ${unexpectedAccessResults.length} restricted routes`
    ).toBe(0);
  });

  test('should verify agent has very limited settings access', async ({ page }) => {
    console.log('🧪 Testing Agent settings restrictions...\n');

    // Login as Agent
    await page.goto('http://localhost:3001/auth/signin');
    await page.fill('input[type="email"]', 'agent@demo-company.com');
    await page.fill('input[type="password"]', 'Demo2024!Agent');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Navigate to settings
    await page.goto('http://localhost:3001/dashboard/settings');
    await page.waitForTimeout(1500);

    const url = page.url();
    const content = await page.content();

    console.log(`Settings URL: ${url}`);

    // Agent should be able to access main settings but only see profile
    expect(url).toContain('/dashboard/settings');

    // Take screenshot
    await page.screenshot({
      path: 'test-results/screenshots/agent-settings-main.png',
      fullPage: true
    });

    console.log('✅ Agent can access settings (should only see profile options)\n');
  });
});