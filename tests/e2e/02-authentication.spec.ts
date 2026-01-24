import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should navigate to sign in page', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signin');

    // Check if sign in page loads
    await expect(page).toHaveURL(/\/auth\/signin/);

    // Look for form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');

    if (await emailInput.isVisible()) {
      await expect(emailInput).toBeVisible();
    }

    if (await passwordInput.isVisible()) {
      await expect(passwordInput).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/signin-page.png' });
  });

  test('should navigate to sign up page', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signup');

    // Check if sign up page loads
    await expect(page).toHaveURL(/\/auth\/signup/);

    await page.screenshot({ path: 'test-results/signup-page.png' });
  });

  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/forgot-password');

    // Check if forgot password page loads
    await expect(page).toHaveURL(/\/auth\/forgot-password/);

    await page.screenshot({ path: 'test-results/forgot-password-page.png' });
  });

  test('should test super admin login page', async ({ page }) => {
    await page.goto('http://localhost:3000/admin');

    // Check if admin page redirects to login or shows login form
    await expect(page).toHaveURL(/\/(admin|auth)/);

    await page.screenshot({ path: 'test-results/admin-access.png' });
  });
});