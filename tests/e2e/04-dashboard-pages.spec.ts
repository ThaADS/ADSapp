import { test, expect } from '@playwright/test';

test.describe('Dashboard Pages', () => {
  test('should access dashboard main page', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');

    // Dashboard might redirect to auth if not logged in, which is expected
    const currentUrl = page.url();
    console.log('Dashboard URL:', currentUrl);

    // Should either show dashboard or redirect to auth
    expect(currentUrl).toMatch(/(dashboard|auth|signin)/);

    await page.screenshot({ path: 'test-results/dashboard-main.png' });
  });

  test('should check dashboard routes accessibility', async ({ page }) => {
    const dashboardRoutes = [
      '/dashboard/inbox',
      '/dashboard/contacts',
      '/dashboard/templates',
      '/dashboard/automation',
      '/dashboard/billing',
      '/dashboard/settings/profile',
      '/dashboard/settings/billing'
    ];

    for (const route of dashboardRoutes) {
      await page.goto(`http://localhost:3000${route}`);

      // Should load without 404 errors
      const response = await page.waitForLoadState('networkidle');

      // Check that we don't get a 404 page
      const pageTitle = await page.title();
      expect(pageTitle).not.toContain('404');

      console.log(`Route ${route} - Title: ${pageTitle}`);

      // Take screenshot of each dashboard page
      const routeName = route.replace(/[\/]/g, '-').substring(1);
      await page.screenshot({ path: `test-results/dashboard${routeName}.png` });
    }
  });

  test('should check admin setup page', async ({ page }) => {
    await page.goto('http://localhost:3000/admin-setup');

    // Check if admin setup page loads
    await expect(page).toHaveURL(/\/admin-setup/);

    await page.screenshot({ path: 'test-results/admin-setup.png' });
  });

  test('should check demo pages', async ({ page }) => {
    const demoRoutes = [
      '/demo',
      '/demo/inbox',
      '/demo/analytics',
      '/demo/automation'
    ];

    for (const route of demoRoutes) {
      await page.goto(`http://localhost:3000${route}`);

      // Should load demo pages without errors
      const pageTitle = await page.title();
      expect(pageTitle).not.toContain('404');

      console.log(`Demo route ${route} - Title: ${pageTitle}`);

      // Take screenshot of each demo page
      const routeName = route.replace(/[\/]/g, '-').substring(1);
      await page.screenshot({ path: `test-results/${routeName}.png` });
    }
  });
});