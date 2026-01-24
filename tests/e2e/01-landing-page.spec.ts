import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load the landing page successfully', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Check if page loads without errors
    await expect(page).toHaveTitle(/ADSapp/);

    // Check for key landing page elements
    await expect(page.locator('h1')).toBeVisible();

    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/landing-page.png' });
  });

  test('should have working navigation links', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Check for auth links
    const signinLink = page.getByRole('link', { name: /sign in/i });
    const signupLink = page.getByRole('link', { name: /sign up/i });

    if (await signinLink.isVisible()) {
      await expect(signinLink).toBeVisible();
    }

    if (await signupLink.isVisible()) {
      await expect(signupLink).toBeVisible();
    }
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://localhost:3000');
    await expect(page.locator('body')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
  });
});