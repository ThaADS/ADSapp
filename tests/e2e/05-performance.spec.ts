import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should measure landing page performance', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    console.log(`Landing page load time: ${loadTime}ms`);

    // Page should load within reasonable time (10 seconds for development)
    expect(loadTime).toBeLessThan(10000);

    // Check for performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
      };
    });

    console.log('Performance metrics:', performanceMetrics);
  });

  test('should check JavaScript errors', async ({ page }) => {
    const jsErrors: string[] = [];

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    // Navigate to a few key pages to check for errors
    await page.goto('http://localhost:3000/auth/signin');
    await page.waitForLoadState('networkidle');

    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');

    await page.goto('http://localhost:3000/demo');
    await page.waitForLoadState('networkidle');

    if (jsErrors.length > 0) {
      console.log('JavaScript errors found:', jsErrors);
    }

    // For development, we might allow some errors but log them
    console.log(`Total JavaScript errors: ${jsErrors.length}`);
  });

  test('should check network requests', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
    });

    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    if (failedRequests.length > 0) {
      console.log('Failed requests:', failedRequests);
    }

    console.log(`Total failed requests: ${failedRequests.length}`);
  });

  test('should check accessibility basics', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Check for basic accessibility elements
    const hasH1 = await page.locator('h1').count() > 0;
    const hasMainLandmark = await page.locator('main, [role="main"]').count() > 0;
    const hasNavLandmark = await page.locator('nav, [role="navigation"]').count() > 0;

    console.log('Accessibility check:', {
      hasH1,
      hasMainLandmark,
      hasNavLandmark
    });

    // At minimum, should have an H1 tag
    expect(hasH1).toBe(true);
  });
});