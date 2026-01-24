import { test, expect } from '@playwright/test';

test.describe('Debug Super Admin Login', () => {
  test('should capture console errors and check login response', async ({ page }) => {
    // Capture console messages
    const consoleMessages: string[] = [];
    const errorMessages: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        errorMessages.push(text);
      }
    });

    // Capture network requests
    const networkLog: any[] = [];
    page.on('response', async response => {
      if (response.url().includes('supabase') || response.url().includes('auth')) {
        try {
          const status = response.status();
          const url = response.url();
          networkLog.push({
            url,
            status,
            statusText: response.statusText()
          });
        } catch (e) {
          // Ignore errors reading response
        }
      }
    });

    console.log('🔍 Starting debug login test...\n');

    // Navigate to signin
    await page.goto('http://localhost:3000/auth/signin');
    await page.waitForLoadState('networkidle');
    console.log('✓ Loaded signin page\n');

    // Fill credentials
    await page.fill('input[type="email"]', 'superadmin@adsapp.com');
    await page.fill('input[type="password"]', 'ADSapp2024!SuperSecure#Admin');
    console.log('✓ Filled credentials\n');

    // Submit form
    console.log('📤 Submitting form...');
    await page.click('button[type="submit"]');

    // Wait for potential navigation or error
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle');

    const currentUrl = page.url();
    console.log('\n📍 Current URL:', currentUrl);

    // Check for error message on page
    const errorElement = page.locator('.text-red-800, .text-red-700, [role="alert"]');
    const hasError = await errorElement.isVisible();

    if (hasError) {
      const errorText = await errorElement.allTextContents();
      console.log('\n❌ Error on page:', errorText.join(' '));
    } else {
      console.log('\n✓ No error message displayed');
    }

    // Log console messages
    console.log('\n📝 Console Messages:');
    consoleMessages.forEach(msg => console.log('  ', msg));

    // Log error messages specifically
    if (errorMessages.length > 0) {
      console.log('\n❌ Console Errors:');
      errorMessages.forEach(msg => console.log('   ', msg));
    }

    // Log network requests
    console.log('\n🌐 Supabase/Auth Network Requests:');
    networkLog.forEach(log => {
      console.log(`   ${log.status} ${log.statusText} - ${log.url}`);
    });

    // Check if we have any Supabase session
    const authCheck = await page.evaluate(async () => {
      const items = { ...localStorage };
      const supabaseKeys = Object.keys(items).filter(key =>
        key.includes('supabase') || key.includes('auth')
      );

      return {
        allKeys: Object.keys(items),
        supabaseKeys,
        values: supabaseKeys.map(key => ({
          key,
          value: items[key]?.substring(0, 100) + '...' // First 100 chars
        }))
      };
    });

    console.log('\n🔐 Auth Storage:');
    console.log('   All localStorage keys:', authCheck.allKeys);
    console.log('   Supabase keys:', authCheck.supabaseKeys);

    if (authCheck.values.length > 0) {
      console.log('   Values:');
      authCheck.values.forEach(v => {
        console.log(`     ${v.key}: ${v.value}`);
      });
    } else {
      console.log('   ❌ No Supabase session found in localStorage');
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/debug-login.png', fullPage: true });
    console.log('\n📸 Screenshot saved to test-results/debug-login.png');
  });
});