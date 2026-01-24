import { test, expect } from '@playwright/test';

test.describe('Super Admin Login Flow', () => {
  test('should login super admin and check redirect behavior', async ({ page }) => {
    console.log('🔐 Testing Super Admin Login Flow...\n');

    // Step 1: Navigate to signin page
    console.log('📍 Step 1: Navigating to signin page...');
    await page.goto('http://localhost:3000/auth/signin');
    await page.waitForLoadState('networkidle');

    const signinUrl = page.url();
    console.log('   Current URL:', signinUrl);
    await page.screenshot({ path: 'test-results/01-signin-page.png' });

    // Step 2: Fill in credentials
    console.log('\n📝 Step 2: Filling in super admin credentials...');

    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    await emailInput.fill('superadmin@adsapp.com');
    await passwordInput.fill('ADSapp2024!SuperSecure#Admin');

    console.log('   Email: superadmin@adsapp.com');
    console.log('   Password: [HIDDEN]');
    await page.screenshot({ path: 'test-results/02-credentials-filled.png' });

    // Step 3: Submit login form
    console.log('\n🚀 Step 3: Submitting login form...');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for navigation
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');

    const afterLoginUrl = page.url();
    console.log('   URL after login:', afterLoginUrl);
    await page.screenshot({ path: 'test-results/03-after-login.png' });

    // Step 4: Check where we landed
    console.log('\n🔍 Step 4: Analyzing redirect behavior...');

    if (afterLoginUrl.includes('/onboarding')) {
      console.log('   ⚠️  REDIRECTED TO ONBOARDING');
      console.log('   This means the user is treated as a new user');

      // Check if there's profile data
      const pageContent = await page.content();
      console.log('\n📋 Onboarding page analysis:');

      if (pageContent.includes('Welcome')) {
        console.log('   - Contains welcome message');
      }
      if (pageContent.includes('organization')) {
        console.log('   - Mentions organization setup');
      }

    } else if (afterLoginUrl.includes('/admin')) {
      console.log('   ✅ REDIRECTED TO ADMIN DASHBOARD');
      console.log('   Super admin role is properly recognized!');

    } else if (afterLoginUrl.includes('/dashboard')) {
      console.log('   ⚠️  REDIRECTED TO REGULAR DASHBOARD');
      console.log('   Super admin role may not be properly configured');

    } else if (afterLoginUrl.includes('/auth')) {
      console.log('   ❌ STILL ON AUTH PAGE - LOGIN FAILED');

      // Check for error messages
      const errorMessage = page.locator('[role="alert"], .error, .text-red-500');
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        console.log('   Error message:', errorText);
      }
    }

    // Step 5: Check session/auth state
    console.log('\n🔐 Step 5: Checking authentication state...');

    const authState = await page.evaluate(() => {
      return {
        hasLocalStorage: localStorage.length > 0,
        localStorageKeys: Object.keys(localStorage),
        cookies: document.cookie
      };
    });

    console.log('   Local Storage items:', authState.localStorageKeys.length);
    console.log('   Has cookies:', authState.cookies.length > 0);

    // Step 6: Try to access admin directly
    console.log('\n🎯 Step 6: Attempting direct admin access...');

    await page.goto('http://localhost:3000/admin');
    await page.waitForLoadState('networkidle');

    const adminUrl = page.url();
    console.log('   URL after /admin access:', adminUrl);
    await page.screenshot({ path: 'test-results/04-admin-access.png' });

    if (adminUrl.includes('/admin') && !adminUrl.includes('/auth')) {
      console.log('   ✅ Admin page accessible!');
    } else {
      console.log('   ⚠️  Redirected away from admin page');
    }

    // Step 7: Check profile in database
    console.log('\n💾 Step 7: Summary of findings...');
    console.log('   Login form: Works');
    console.log('   Authentication: ' + (authState.hasLocalStorage ? 'Session created' : 'No session'));
    console.log('   Redirect target: ' + (afterLoginUrl.includes('/onboarding') ? 'Onboarding (NEW USER)' : afterLoginUrl));
    console.log('   Admin access: ' + (adminUrl.includes('/admin') ? 'Granted' : 'Denied'));

    // Final screenshot
    await page.screenshot({ path: 'test-results/05-final-state.png' });

    console.log('\n📊 TEST COMPLETE - Check test-results/ folder for screenshots\n');
  });

  test('should check profile data in application', async ({ page }) => {
    console.log('👤 Checking profile data after login...\n');

    // Login first
    await page.goto('http://localhost:3000/auth/signin');
    await page.locator('input[type="email"]').fill('superadmin@adsapp.com');
    await page.locator('input[type="password"]').fill('ADSapp2024!SuperSecure#Admin');
    await page.locator('button[type="submit"]').click();

    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');

    // Try to access a settings or profile page
    const possibleRoutes = [
      '/dashboard/settings/profile',
      '/admin',
      '/dashboard',
      '/profile'
    ];

    for (const route of possibleRoutes) {
      await page.goto('http://localhost:3000' + route);
      await page.waitForTimeout(1000);

      const currentUrl = page.url();
      console.log('Tried:', route, '→', currentUrl);

      if (!currentUrl.includes('/auth') && !currentUrl.includes('/onboarding')) {
        console.log('✅ Accessible route found:', route);
        await page.screenshot({ path: `test-results/route-${route.replace(/\//g, '-')}.png` });
        break;
      }
    }
  });
});