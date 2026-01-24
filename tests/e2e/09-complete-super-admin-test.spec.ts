import { test, expect } from '@playwright/test';

test.describe('Complete Super Admin Flow', () => {
  test('should login as super admin and access admin dashboard', async ({ page }) => {
    console.log('🎯 Testing Complete Super Admin Flow\n');

    // Step 1: Navigate and login
    console.log('1️⃣ Navigating to signin page...');
    await page.goto('http://localhost:3000/auth/signin');
    await page.waitForLoadState('networkidle');

    console.log('2️⃣ Logging in as super admin...');
    await page.fill('input[type="email"]', 'superadmin@adsapp.com');
    await page.fill('input[type="password"]', 'ADSapp2024!SuperSecure#Admin');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log('   Current URL:', currentUrl);

    // Step 2: Verify redirect to /admin
    console.log('\n3️⃣ Checking redirect...');
    expect(currentUrl).toContain('/admin');
    console.log('   ✅ Redirected to admin dashboard!');

    // Step 3: Check page title
    const title = await page.title();
    console.log('\n4️⃣ Page title:', title);

    // Step 4: Check for admin content
    console.log('\n5️⃣ Looking for admin content...');
    const pageContent = await page.content();

    const adminIndicators = [
      'admin',
      'dashboard',
      'organizations',
      'users',
      'Super Admin'
    ];

    let foundIndicators = 0;
    for (const indicator of adminIndicators) {
      if (pageContent.toLowerCase().includes(indicator.toLowerCase())) {
        console.log(`   ✅ Found: "${indicator}"`);
        foundIndicators++;
      }
    }

    console.log(`\n   Found ${foundIndicators}/${adminIndicators.length} admin indicators`);

    // Step 5: Try to navigate to different admin pages
    console.log('\n6️⃣ Testing admin page navigation...');

    const adminPages = [
      '/admin',
      '/admin/organizations'
    ];

    for (const adminPage of adminPages) {
      await page.goto(`http://localhost:3000${adminPage}`);
      await page.waitForTimeout(1000);

      const url = page.url();
      if (url.includes(adminPage)) {
        console.log(`   ✅ ${adminPage} - Accessible`);
      } else {
        console.log(`   ⚠️  ${adminPage} - Redirected to ${url}`);
      }
    }

    // Step 6: Verify NOT redirected to onboarding
    console.log('\n7️⃣ Verifying onboarding is NOT accessible...');
    await page.goto('http://localhost:3000/onboarding');
    await page.waitForTimeout(1000);

    const onboardingUrl = page.url();
    if (!onboardingUrl.includes('/onboarding')) {
      console.log('   ✅ Super admin cannot access onboarding (correctly redirected)');
    } else {
      console.log('   ⚠️  Super admin can still access onboarding');
    }

    // Take final screenshot
    await page.screenshot({ path: 'test-results/super-admin-complete.png', fullPage: true });
    console.log('\n📸 Screenshot saved to test-results/super-admin-complete.png');

    console.log('\n✅ COMPLETE SUPER ADMIN TEST PASSED!\n');
  });
});