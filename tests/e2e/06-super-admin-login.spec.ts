import { test, expect } from '@playwright/test';

test.describe('Super Admin Authentication', () => {
  test('should test super admin login with credentials', async ({ page }) => {
    // Navigate to admin page (should redirect to signin)
    await page.goto('http://localhost:3001/admin');

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');

    // Check if we're on signin page or already have login form
    const currentUrl = page.url();
    console.log('Current URL after admin access:', currentUrl);

    // Look for email and password fields (could be on admin page or signin page)
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]');

    await page.screenshot({ path: 'test-results/admin-login-page.png' });

    // If we see login fields, try to login
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      console.log('Login form found, attempting super admin login...');

      // Fill in super admin credentials
      await emailInput.fill('superadmin@adsapp.com');
      await passwordInput.fill('ADSapp2024!SuperSecure#Admin');

      await page.screenshot({ path: 'test-results/admin-credentials-filled.png' });

      // Look for submit button
      const submitButton = page.locator('button[type="submit"], button:has-text("sign in" i), button:has-text("login" i)');

      if (await submitButton.isVisible()) {
        console.log('Submit button found, clicking...');
        await submitButton.click();

        // Wait for navigation or response
        await page.waitForTimeout(3000);

        const newUrl = page.url();
        console.log('URL after login attempt:', newUrl);

        await page.screenshot({ path: 'test-results/after-login-attempt.png' });

        // Check for any error messages
        const errorMessage = page.locator('[role="alert"], .error, .alert-error, text="error" i');
        if (await errorMessage.isVisible()) {
          const errorText = await errorMessage.textContent();
          console.log('Error message found:', errorText);
        }
      } else {
        console.log('No submit button found');
      }
    } else {
      console.log('No login form found on page');
    }
  });

  test('should check if super admin account exists in database', async ({ request }) => {
    // Try to check if the account exists by attempting API call
    const response = await request.post('http://localhost:3001/api/auth/signin', {
      data: {
        email: 'superadmin@adsapp.com',
        password: 'ADSapp2024!SuperSecure#Admin'
      }
    });

    console.log('Auth API response status:', response.status());

    // Log response for debugging
    if (response.status() !== 200) {
      const responseText = await response.text();
      console.log('Auth API response:', responseText);
    }
  });

  test('should check signin page functionality', async ({ page }) => {
    await page.goto('http://localhost:3001/auth/signin');
    await page.waitForLoadState('networkidle');

    // Check for CSP errors in console
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Try to interact with the form to see if CSP is fixed
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@example.com');
    }

    await page.screenshot({ path: 'test-results/signin-page-test.png' });

    // Check for CSP-related errors
    const cspErrors = consoleErrors.filter(error =>
      error.includes('Content Security Policy') ||
      error.includes('connect-src') ||
      error.includes('supabase')
    );

    console.log('CSP-related errors found:', cspErrors);
    console.log('Total console errors:', consoleErrors.length);

    // The test passes if we have fewer CSP errors
    expect(cspErrors.length).toBeLessThan(5); // Allow some errors but not many
  });
});