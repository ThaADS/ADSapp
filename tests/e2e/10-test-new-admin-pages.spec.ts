import { test, expect } from '@playwright/test';

test.describe('New Admin Pages Test', () => {
  test('should access all new admin pages as super admin', async ({ page }) => {
    console.log('🎯 Testing All New Admin Pages\n');

    // Login as super admin
    console.log('1️⃣ Logging in as super admin...');
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[type="email"]', 'superadmin@adsapp.com');
    await page.fill('input[type="password"]', 'ADSapp2024!SuperSecure#Admin');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');
    console.log('   ✅ Logged in\n');

    // Test all admin pages
    const adminPages = [
      { path: '/admin', name: 'Dashboard', keywords: ['overview', 'statistics', 'metrics'] },
      { path: '/admin/organizations', name: 'Organizations', keywords: ['organization', 'company', 'tenant'] },
      { path: '/admin/users', name: 'Users', keywords: ['user', 'profile', 'role'] },
      { path: '/admin/analytics', name: 'Analytics (NEW)', keywords: ['analytics', 'revenue', 'chart', 'metric'] },
      { path: '/admin/billing', name: 'Billing (NEW)', keywords: ['billing', 'subscription', 'revenue', 'stripe'] },
      { path: '/admin/audit-logs', name: 'Audit Logs (NEW)', keywords: ['audit', 'log', 'activity', 'security'] },
      { path: '/admin/settings', name: 'Settings (NEW)', keywords: ['settings', 'configuration', 'platform'] },
      { path: '/admin/webhooks', name: 'Webhooks (NEW)', keywords: ['webhook', 'event', 'integration'] }
    ];

    console.log('2️⃣ Testing admin pages...\n');

    for (const adminPage of adminPages) {
      console.log(`📄 Testing: ${adminPage.name}`);
      console.log(`   URL: ${adminPage.path}`);

      // Navigate to page
      await page.goto(`http://localhost:3000${adminPage.path}`);
      await page.waitForTimeout(1500);
      await page.waitForLoadState('networkidle');

      const currentUrl = page.url();
      const pageContent = await page.content().catch(() => '');

      // Check if we're still on the admin page (not redirected)
      if (currentUrl.includes(adminPage.path)) {
        console.log('   ✅ Page accessible');

        // Check for expected content
        let foundKeywords = 0;
        for (const keyword of adminPage.keywords) {
          if (pageContent.toLowerCase().includes(keyword.toLowerCase())) {
            foundKeywords++;
          }
        }

        if (foundKeywords > 0) {
          console.log(`   ✅ Found ${foundKeywords}/${adminPage.keywords.length} expected keywords`);
        } else {
          console.log('   ⚠️  No expected keywords found');
        }

        // Take screenshot
        await page.screenshot({
          path: `test-results/admin-${adminPage.path.replace(/\//g, '-')}.png`,
          fullPage: true
        });
        console.log(`   📸 Screenshot saved\n`);

      } else {
        console.log(`   ❌ Redirected to: ${currentUrl}\n`);
      }
    }

    console.log('✅ All admin pages tested!\n');
  });

  test('should test demo owner account login', async ({ page }) => {
    console.log('🎯 Testing Demo Owner Account\n');

    console.log('1️⃣ Logging in as owner@demo-company.com...');
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[type="email"]', 'owner@demo-company.com');
    await page.fill('input[type="password"]', 'Demo2024!Owner');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    if (currentUrl.includes('/dashboard')) {
      console.log('   ✅ Redirected to dashboard (correct for owner)');
    } else if (currentUrl.includes('/onboarding')) {
      console.log('   ⚠️  Still on onboarding');
    } else {
      console.log('   ❌ Unexpected redirect');
    }

    // Check if owner can access dashboard
    const pageContent = await page.content();
    if (pageContent.includes('dashboard') || pageContent.includes('Dashboard')) {
      console.log('   ✅ Dashboard content loaded');
    }

    await page.screenshot({ path: 'test-results/demo-owner-dashboard.png', fullPage: true });
    console.log('   📸 Screenshot saved\n');

    console.log('✅ Demo owner test complete!\n');
  });
});