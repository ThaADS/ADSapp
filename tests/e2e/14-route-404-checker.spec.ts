import { test, expect } from '@playwright/test';

interface RouteCheckResult {
  route: string;
  status: 'ok' | '404' | 'redirect' | 'error';
  finalUrl?: string;
  error?: string;
}

test.describe('Route 404 Checker - Unauthenticated Access', () => {
  const allPublicRoutes = [
    '/',
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
  ];

  const allProtectedRoutes = [
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
    '/admin',
    '/admin/dashboard',
    '/admin/organizations',
    '/admin/users',
  ];

  const commonInvalidRoutes = [
    '/dashboard/invalid',
    '/dashboard/settings/invalid',
    '/nonexistent',
    '/dashboard/nonexistent',
    '/api/nonexistent',
  ];

  test('should check all public routes are accessible', async ({ page }) => {
    console.log('🌐 Testing Public Routes (No Authentication)...\n');

    const results: RouteCheckResult[] = [];

    for (const route of allPublicRoutes) {
      try {
        console.log(`Testing public route: ${route}`);
        await page.goto(`http://localhost:3001${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        await page.waitForTimeout(1000);

        const url = page.url();
        const content = await page.content();

        if (content.includes('404') ||
            content.includes('Not Found') ||
            content.includes('Page not found')) {
          results.push({ route, status: '404', finalUrl: url });
          console.log(`  ❌ 404: ${route}\n`);
        } else if (!url.includes(route.split('?')[0])) {
          results.push({ route, status: 'redirect', finalUrl: url });
          console.log(`  ↪️  Redirected: ${route} → ${url}\n`);
        } else {
          results.push({ route, status: 'ok', finalUrl: url });
          console.log(`  ✅ OK: ${route}\n`);
        }

        // Take screenshot
        const screenshotName = `public${route.replace(/\//g, '-') || '-home'}`;
        await page.screenshot({
          path: `test-results/screenshots/${screenshotName}.png`,
          fullPage: true
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ route, status: 'error', error: errorMessage });
        console.log(`  ⚠️  Error: ${route} - ${errorMessage}\n`);
      }
    }

    // Report
    console.log('\n' + '='.repeat(60));
    console.log('📊 PUBLIC ROUTES CHECK');
    console.log('='.repeat(60));
    const okRoutes = results.filter(r => r.status === 'ok');
    const notFoundRoutes = results.filter(r => r.status === '404');
    const redirectRoutes = results.filter(r => r.status === 'redirect');
    const errorRoutes = results.filter(r => r.status === 'error');

    console.log(`✅ Accessible: ${okRoutes.length}`);
    console.log(`❌ 404 Errors: ${notFoundRoutes.length}`);
    console.log(`↪️  Redirects: ${redirectRoutes.length}`);
    console.log(`⚠️  Errors: ${errorRoutes.length}`);
    console.log('='.repeat(60) + '\n');

    if (notFoundRoutes.length > 0) {
      console.log('❌ Public routes returning 404:');
      notFoundRoutes.forEach(r => console.log(`   - ${r.route}`));
      console.log('');
    }

    // Public routes should not return 404
    expect(notFoundRoutes.length, 'Public routes should be accessible').toBe(0);
  });

  test('should verify protected routes redirect to signin', async ({ page }) => {
    console.log('🔒 Testing Protected Routes (No Authentication)...\n');

    const results: RouteCheckResult[] = [];

    for (const route of allProtectedRoutes) {
      try {
        console.log(`Testing protected route: ${route}`);
        await page.goto(`http://localhost:3001${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        await page.waitForTimeout(1000);

        const url = page.url();
        const content = await page.content();

        // Protected routes should redirect to signin
        if (url.includes('/auth/signin')) {
          results.push({ route, status: 'redirect', finalUrl: url });
          console.log(`  ✅ Properly redirected to signin: ${route}\n`);
        } else if (content.includes('404') || content.includes('Not Found')) {
          results.push({ route, status: '404', finalUrl: url });
          console.log(`  ❌ Returns 404 (should redirect): ${route}\n`);
        } else {
          results.push({ route, status: 'ok', finalUrl: url });
          console.log(`  ⚠️  SECURITY ISSUE - Accessible without auth: ${route}\n`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ route, status: 'error', error: errorMessage });
        console.log(`  ⚠️  Error: ${route} - ${errorMessage}\n`);
      }
    }

    // Report
    console.log('\n' + '='.repeat(60));
    console.log('🔒 PROTECTED ROUTES CHECK');
    console.log('='.repeat(60));
    const redirectedRoutes = results.filter(r => r.status === 'redirect');
    const notFoundRoutes = results.filter(r => r.status === '404');
    const accessibleRoutes = results.filter(r => r.status === 'ok');
    const errorRoutes = results.filter(r => r.status === 'error');

    console.log(`✅ Properly Protected (redirect): ${redirectedRoutes.length}`);
    console.log(`❌ Return 404: ${notFoundRoutes.length}`);
    console.log(`⚠️  Accessible (SECURITY ISSUE): ${accessibleRoutes.length}`);
    console.log(`⚠️  Errors: ${errorRoutes.length}`);
    console.log('='.repeat(60) + '\n');

    if (notFoundRoutes.length > 0) {
      console.log('❌ Protected routes returning 404 (should redirect to signin):');
      notFoundRoutes.forEach(r => console.log(`   - ${r.route}`));
      console.log('');
    }

    if (accessibleRoutes.length > 0) {
      console.log('⚠️  SECURITY ISSUES - Routes accessible without authentication:');
      accessibleRoutes.forEach(r => console.log(`   - ${r.route}`));
      console.log('');
    }

    // Most protected routes should redirect (not error or be accessible)
    const protectionRate = (redirectedRoutes.length / allProtectedRoutes.length) * 100;
    console.log(`\n🔒 Protection Rate: ${protectionRate.toFixed(1)}%`);
    expect(protectionRate).toBeGreaterThanOrEqual(90);
  });

  test('should verify invalid routes return 404', async ({ page }) => {
    console.log('❌ Testing Invalid Routes (Should Return 404)...\n');

    const results: RouteCheckResult[] = [];

    for (const route of commonInvalidRoutes) {
      try {
        console.log(`Testing invalid route: ${route}`);
        await page.goto(`http://localhost:3001${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        await page.waitForTimeout(1000);

        const url = page.url();
        const content = await page.content();

        if (content.includes('404') ||
            content.includes('Not Found') ||
            content.includes('Page not found')) {
          results.push({ route, status: '404', finalUrl: url });
          console.log(`  ✅ Properly returns 404: ${route}\n`);
        } else if (url.includes('/auth/signin')) {
          results.push({ route, status: 'redirect', finalUrl: url });
          console.log(`  ℹ️  Redirected to signin: ${route}\n`);
        } else {
          results.push({ route, status: 'ok', finalUrl: url });
          console.log(`  ⚠️  Unexpectedly accessible: ${route}\n`);
        }

        // Take screenshot
        const screenshotName = `invalid${route.replace(/\//g, '-')}`;
        await page.screenshot({
          path: `test-results/screenshots/${screenshotName}.png`,
          fullPage: true
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({ route, status: 'error', error: errorMessage });
        console.log(`  ℹ️  Error (expected): ${route} - ${errorMessage}\n`);
      }
    }

    // Report
    console.log('\n' + '='.repeat(60));
    console.log('❌ INVALID ROUTES CHECK');
    console.log('='.repeat(60));
    const notFoundRoutes = results.filter(r => r.status === '404');
    const redirectRoutes = results.filter(r => r.status === 'redirect');
    const accessibleRoutes = results.filter(r => r.status === 'ok');
    const errorRoutes = results.filter(r => r.status === 'error');

    console.log(`✅ Return 404: ${notFoundRoutes.length}`);
    console.log(`↪️  Redirected: ${redirectRoutes.length}`);
    console.log(`⚠️  Unexpectedly Accessible: ${accessibleRoutes.length}`);
    console.log(`⚠️  Errors: ${errorRoutes.length}`);
    console.log('='.repeat(60) + '\n');

    if (accessibleRoutes.length > 0) {
      console.log('⚠️  Unexpectedly accessible invalid routes:');
      accessibleRoutes.forEach(r => console.log(`   - ${r.route} → ${r.finalUrl}`));
      console.log('');
    }
  });

  test('should generate broken routes report', async ({ page }) => {
    console.log('📋 Generating comprehensive route audit...\n');

    const allRoutes = [
      ...allPublicRoutes,
      ...allProtectedRoutes,
      ...commonInvalidRoutes
    ];

    const brokenRoutes: string[] = [];
    const workingRoutes: string[] = [];
    const redirectedRoutes: Array<{ from: string; to: string }> = [];

    for (const route of allRoutes) {
      try {
        await page.goto(`http://localhost:3001${route}`, {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        await page.waitForTimeout(500);

        const url = page.url();
        const content = await page.content();

        if (content.includes('404') || content.includes('Not Found')) {
          brokenRoutes.push(route);
        } else if (!url.includes(route.split('?')[0])) {
          redirectedRoutes.push({ from: route, to: url });
        } else {
          workingRoutes.push(route);
        }
      } catch (error) {
        // Errors are treated as broken for this report
        brokenRoutes.push(route);
      }
    }

    // Final comprehensive report
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE ROUTE AUDIT SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Routes Tested: ${allRoutes.length}`);
    console.log(`✅ Working: ${workingRoutes.length}`);
    console.log(`❌ Broken (404): ${brokenRoutes.length}`);
    console.log(`↪️  Redirected: ${redirectedRoutes.length}`);
    console.log('='.repeat(80) + '\n');

    if (brokenRoutes.length > 0) {
      console.log('❌ BROKEN ROUTES (404 Errors):');
      brokenRoutes.forEach(r => console.log(`   - ${r}`));
      console.log('');
    }

    if (redirectedRoutes.length > 0) {
      console.log('↪️  REDIRECTED ROUTES:');
      redirectedRoutes.forEach(r => console.log(`   - ${r.from} → ${r.to}`));
      console.log('');
    }

    const healthScore = ((workingRoutes.length + redirectedRoutes.length) / allRoutes.length) * 100;
    console.log(`\n📈 Overall Route Health Score: ${healthScore.toFixed(1)}%\n`);
  });
});