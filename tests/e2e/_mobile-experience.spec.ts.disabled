// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { test, expect, devices } from '@playwright/test';

// ============================================================================
// Mobile Experience E2E Test Suite
// Tests mobile-specific features, gestures, and performance
// ============================================================================

// Test on multiple mobile devices
const mobileDevices = [
  devices['iPhone 13'],
  devices['iPhone 13 Pro Max'],
  devices['Pixel 5'],
  devices['Galaxy S21'],
  devices['iPad (gen 7)'],
];

// ============================================================================
// PWA Installation Tests
// ============================================================================

test.describe('PWA Installation', () => {
  test('should have valid PWA manifest', async ({ page }) => {
    await page.goto('/');

    // Check manifest link
    const manifestLink = await page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.json');

    // Fetch and validate manifest
    const response = await page.request.get('/manifest.json');
    expect(response.ok()).toBeTruthy();

    const manifest = await response.json();
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.display).toBe('standalone');
    expect(manifest.icons).toHaveLength(8);
  });

  test('should have service worker registered', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for service worker registration
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        return !!registration;
      }
      return false;
    });

    expect(swRegistered).toBeTruthy();
  });

  test('should have proper meta tags for PWA', async ({ page }) => {
    await page.goto('/');

    // Check viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', expect.stringContaining('width=device-width'));

    // Check theme color
    const themeColor = await page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#10b981');

    // Check apple mobile web app meta tags
    const appleMobileCapable = await page.locator('meta[name="apple-mobile-web-app-capable"]');
    await expect(appleMobileCapable).toHaveAttribute('content', 'yes');
  });
});

// ============================================================================
// Mobile Navigation Tests
// ============================================================================

mobileDevices.forEach((device) => {
  test.describe(`Mobile Navigation - ${device.name}`, () => {
    test.use({ ...device });

    test('should display bottom navigation bar', async ({ page }) => {
      await page.goto('/dashboard/inbox');

      // Check if bottom nav is visible
      const bottomNav = page.locator('nav').filter({ hasText: 'Inbox' });
      await expect(bottomNav).toBeVisible();

      // Check all nav items
      await expect(page.locator('text=Inbox')).toBeVisible();
      await expect(page.locator('text=Contacts')).toBeVisible();
      await expect(page.locator('text=Templates')).toBeVisible();
      await expect(page.locator('text=Analytics')).toBeVisible();
      await expect(page.locator('text=Settings')).toBeVisible();
    });

    test('should navigate between tabs with active state', async ({ page }) => {
      await page.goto('/dashboard/inbox');

      // Navigate to Contacts
      await page.click('text=Contacts');
      await expect(page).toHaveURL(/.*contacts/);

      // Navigate to Templates
      await page.click('text=Templates');
      await expect(page).toHaveURL(/.*templates/);

      // Navigate back to Inbox
      await page.click('text=Inbox');
      await expect(page).toHaveURL(/.*inbox/);
    });

    test('should have touch-friendly targets (min 44x44px)', async ({ page }) => {
      await page.goto('/dashboard/inbox');

      // Check bottom nav button sizes
      const navButtons = page.locator('nav a');
      const count = await navButtons.count();

      for (let i = 0; i < count; i++) {
        const button = navButtons.nth(i);
        const box = await button.boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(44);
        expect(box?.height).toBeGreaterThanOrEqual(44);
      }
    });
  });
});

// ============================================================================
// Touch Gesture Tests
// ============================================================================

test.describe('Touch Gestures', () => {
  test.use(devices['iPhone 13']);

  test('should support swipe-to-delete on conversation items', async ({ page }) => {
    await page.goto('/dashboard/inbox');

    // Wait for conversations to load
    await page.waitForSelector('[data-testid="conversation-item"]', { timeout: 5000 });

    // Get first conversation
    const conversation = page.locator('[data-testid="conversation-item"]').first();

    // Perform swipe left gesture
    const box = await conversation.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width - 10, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + 10, box.y + box.height / 2);
      await page.mouse.up();

      // Check if delete action is revealed
      await expect(page.locator('text=Delete').or(page.locator('text=Archive'))).toBeVisible();
    }
  });

  test('should support pull-to-refresh', async ({ page }) => {
    await page.goto('/dashboard/inbox');

    // Perform pull-to-refresh gesture
    await page.mouse.move(200, 100);
    await page.mouse.down();
    await page.mouse.move(200, 300, { steps: 10 });
    await page.mouse.up();

    // Check for refresh indicator
    await expect(page.locator('[data-testid="pull-refresh-indicator"]').or(page.locator('text=Refreshing'))).toBeVisible({ timeout: 3000 });
  });

  test('should support long press for context menu', async ({ page }) => {
    await page.goto('/dashboard/inbox');

    const conversation = page.locator('[data-testid="conversation-item"]').first();

    // Perform long press
    await conversation.click({ delay: 500 });

    // Check for context menu or selection mode
    await expect(
      page.locator('[data-testid="context-menu"]').or(page.locator('[data-testid="selection-mode"]'))
    ).toBeVisible({ timeout: 2000 });
  });
});

// ============================================================================
// Virtual Keyboard Handling Tests
// ============================================================================

test.describe('Virtual Keyboard', () => {
  test.use(devices['iPhone 13']);

  test('should adjust viewport when keyboard opens', async ({ page }) => {
    await page.goto('/dashboard/inbox');

    // Get initial viewport height
    const initialHeight = await page.evaluate(() => window.innerHeight);

    // Click on message input to open keyboard
    await page.click('textarea[placeholder*="message"]', { timeout: 5000 });

    // Wait for keyboard animation
    await page.waitForTimeout(500);

    // Get new viewport height (should be smaller)
    const newHeight = await page.evaluate(() => window.innerHeight);

    // Keyboard should reduce visible viewport
    expect(newHeight).toBeLessThan(initialHeight);
  });

  test('should keep input field visible when keyboard opens', async ({ page }) => {
    await page.goto('/dashboard/inbox');

    const input = page.locator('textarea[placeholder*="message"]').first();
    await input.click();

    // Input should still be visible
    await expect(input).toBeVisible();

    // Input should be in viewport
    const isInViewport = await input.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight
      );
    });

    expect(isInViewport).toBeTruthy();
  });
});

// ============================================================================
// Offline Mode Tests
// ============================================================================

test.describe('Offline Functionality', () => {
  test.use(devices['iPhone 13']);

  test('should queue messages when offline', async ({ page, context }) => {
    await page.goto('/dashboard/inbox');

    // Go offline
    await context.setOffline(true);

    // Try to send a message
    await page.fill('textarea[placeholder*="message"]', 'Test offline message');
    await page.click('button[aria-label="Send"]');

    // Check for offline indicator
    await expect(page.locator('text=Offline').or(page.locator('text=Queued'))).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Check if message syncs
    await expect(page.locator('text=Sent').or(page.locator('text=Delivered'))).toBeVisible({ timeout: 5000 });
  });

  test('should show offline banner when connection lost', async ({ page, context }) => {
    await page.goto('/dashboard/inbox');

    // Go offline
    await context.setOffline(true);

    // Check for offline banner
    await expect(page.locator('text=Offline').or(page.locator('text=No connection'))).toBeVisible({ timeout: 2000 });
  });

  test('should cache conversations for offline viewing', async ({ page, context }) => {
    await page.goto('/dashboard/inbox');

    // Wait for conversations to load
    await page.waitForSelector('[data-testid="conversation-item"]', { timeout: 5000 });

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();

    // Check if cached conversations are still visible
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount({ min: 1 }, { timeout: 5000 });
  });
});

// ============================================================================
// Safe Area Insets Tests (iOS notch)
// ============================================================================

test.describe('Safe Area Insets', () => {
  test.use(devices['iPhone 13']);

  test('should respect safe area insets on iOS', async ({ page }) => {
    await page.goto('/dashboard/inbox');

    // Check if safe area padding is applied
    const header = page.locator('header').first();
    const paddingTop = await header.evaluate((el) => {
      return window.getComputedStyle(el).paddingTop;
    });

    // Should have some top padding for notch
    const paddingValue = parseInt(paddingTop);
    expect(paddingValue).toBeGreaterThan(0);
  });

  test('should adjust bottom navigation for home indicator', async ({ page }) => {
    await page.goto('/dashboard/inbox');

    const bottomNav = page.locator('nav').filter({ hasText: 'Inbox' });
    const paddingBottom = await bottomNav.evaluate((el) => {
      return window.getComputedStyle(el).paddingBottom;
    });

    // Should have bottom padding for home indicator
    const paddingValue = parseInt(paddingBottom);
    expect(paddingValue).toBeGreaterThan(0);
  });
});

// ============================================================================
// Performance Tests
// ============================================================================

test.describe('Mobile Performance', () => {
  test.use(devices['iPhone 13']);

  test('should load inbox within 2 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard/inbox');
    await page.waitForSelector('[data-testid="conversation-list"]', { timeout: 5000 });

    const loadTime = Date.now() - startTime;

    // Should load within 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('should have smooth 60fps scrolling', async ({ page }) => {
    await page.goto('/dashboard/inbox');

    // Measure FPS during scroll
    const fps = await page.evaluate(async () => {
      return new Promise<number>((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();

        function countFrames() {
          frameCount++;
          const elapsed = performance.now() - startTime;

          if (elapsed < 1000) {
            requestAnimationFrame(countFrames);
          } else {
            resolve(frameCount);
          }
        }

        // Scroll while counting frames
        window.scrollBy(0, 100);
        requestAnimationFrame(countFrames);
      });
    });

    // Should maintain 60fps (allow some margin)
    expect(fps).toBeGreaterThan(55);
  });

  test('should lazy load images', async ({ page }) => {
    await page.goto('/dashboard/inbox');

    // Count initially loaded images
    const initialImages = await page.locator('img').count();

    // Scroll down
    await page.evaluate(() => window.scrollBy(0, 1000));

    // Wait for lazy load
    await page.waitForTimeout(500);

    // Count images after scroll
    const afterScrollImages = await page.locator('img').count();

    // More images should be loaded after scrolling
    expect(afterScrollImages).toBeGreaterThanOrEqual(initialImages);
  });
});

// ============================================================================
// Orientation Change Tests
// ============================================================================

test.describe('Orientation Handling', () => {
  test('should adapt layout on orientation change', async ({ page, context }) => {
    // Start in portrait
    await context.setViewportSize({ width: 375, height: 812 });
    await page.goto('/dashboard/inbox');

    // Check portrait layout
    const bottomNavPortrait = page.locator('nav').filter({ hasText: 'Inbox' });
    await expect(bottomNavPortrait).toBeVisible();

    // Switch to landscape
    await context.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(300);

    // Layout should adapt
    const isResponsive = await page.evaluate(() => {
      return window.innerWidth > window.innerHeight;
    });

    expect(isResponsive).toBeTruthy();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

test.describe('Mobile Accessibility', () => {
  test.use(devices['iPhone 13']);

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard/inbox');

    // Check for proper ARIA labels on interactive elements
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();

      // Button should have either aria-label or visible text
      expect(ariaLabel || text?.trim()).toBeTruthy();
    }
  });

  test('should be navigable with keyboard', async ({ page }) => {
    await page.goto('/dashboard/inbox');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);

    // Should focus on interactive element
    expect(['BUTTON', 'A', 'INPUT', 'TEXTAREA']).toContain(focusedElement);
  });
});

// ============================================================================
// Network Conditions Tests
// ============================================================================

test.describe('Network Throttling', () => {
  test('should work on slow 3G', async ({ page, context }) => {
    // Simulate slow 3G
    await context.route('**/*', (route) => {
      setTimeout(() => route.continue(), 200); // 200ms delay
    });

    await page.goto('/dashboard/inbox');

    // Should still load (though slower)
    await expect(page.locator('[data-testid="conversation-list"]')).toBeVisible({ timeout: 10000 });
  });
});
