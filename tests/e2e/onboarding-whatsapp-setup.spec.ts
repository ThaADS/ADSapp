import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: WhatsApp Onboarding Flow
 * Tests the complete onboarding experience with WhatsApp setup wizard
 *
 * Coverage:
 * - Organization creation
 * - WhatsApp wizard 3-step flow
 * - Skip functionality
 * - Profile completion
 * - Database persistence
 */

test.describe('Onboarding Flow - WhatsApp Setup', () => {
  test.beforeEach(async ({ page }) => {
    // Start at onboarding page (assumes user is authenticated)
    await page.goto('/onboarding');

    // Wait for page to load
    await expect(page.locator('h2').filter({ hasText: 'Create Your Organization' })).toBeVisible();
  });

  test('Complete onboarding with WhatsApp setup (full flow)', async ({ page }) => {
    // ====================================================================
    // STEP 1: Organization Setup
    // ====================================================================
    await test.step('Step 1: Create organization', async () => {
      // Fill organization name
      await page.fill('[name="organizationName"]', 'Test Company Inc');

      // Verify subdomain auto-generated
      const subdomainInput = page.locator('[name="subdomain"]');
      await expect(subdomainInput).toHaveValue('test-company-inc');

      // Click next
      await page.click('button:has-text("Next")');

      // Verify we're on step 2
      await expect(page.locator('.bg-blue-500').filter({ hasText: '2' })).toBeVisible();
    });

    // ====================================================================
    // STEP 2: WhatsApp Setup Wizard
    // ====================================================================
    await test.step('Step 2.1: Enter Phone Number ID', async () => {
      // Verify wizard heading
      await expect(page.locator('h2').filter({ hasText: 'WhatsApp Business Setup' })).toBeVisible();

      // Fill Phone Number ID
      await page.fill('[id="phoneNumberId"]', '123456789012345');

      // Wait for validation (debounced)
      await page.waitForTimeout(600);

      // Verify validation indicator (should show valid or validating)
      const validationState = page.locator('.absolute.right-3');
      await expect(validationState).toBeVisible();

      // Click Continue
      await page.click('button:has-text("Continue →")');
    });

    await test.step('Step 2.2: Enter Business Account ID', async () => {
      // Verify we're on step 2 of wizard
      await expect(page.locator('.bg-blue-500').filter({ hasText: '2' })).toBeVisible();

      // Fill Business Account ID
      await page.fill('[id="businessAccountId"]', '987654321098765');

      // Click Continue
      await page.click('button:has-text("Continue →")');
    });

    await test.step('Step 2.3: Enter Access Token', async () => {
      // Verify we're on step 3 of wizard
      await expect(page.locator('.bg-blue-500').filter({ hasText: '3' })).toBeVisible();

      // Verify security notice
      await expect(page.locator('text=Security Notice')).toBeVisible();

      // Fill Access Token (textarea)
      await page.fill('[id="accessToken"]', 'EAA' + 'x'.repeat(200));

      // Fill Webhook Verify Token (optional)
      await page.fill('[id="webhookVerifyToken"]', 'my_secure_token_123');

      // Click Complete Setup
      await page.click('button:has-text("Complete Setup ✓")');

      // Should move to profile step (step 3 of main flow)
      await page.waitForSelector('h2:has-text("Complete Your Profile")');
    });

    // ====================================================================
    // STEP 3: Profile Completion
    // ====================================================================
    await test.step('Step 3: Complete profile', async () => {
      // Fill full name
      await page.fill('[name="fullName"]', 'John Doe');

      // Select role
      await page.selectOption('[name="role"]', 'owner');

      // Submit form
      await page.click('button:has-text("Complete Setup")');

      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 });

      // Verify we're on dashboard
      await expect(page.locator('h1').filter({ hasText: /Dashboard|Welcome/i })).toBeVisible();
    });

    // ====================================================================
    // VERIFICATION: Database Persistence
    // ====================================================================
    await test.step('Verify: Data persisted in database', async () => {
      // Make API call to verify organization created with WhatsApp credentials
      const response = await page.request.get('/api/organizations/current');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data.organization.name).toBe('Test Company Inc');
      expect(data.organization.slug).toBe('test-company-inc');
      expect(data.organization.whatsapp_phone_number_id).toBe('123456789012345');
      expect(data.organization.whatsapp_business_account_id).toBe('987654321098765');
      // Access token should be stored but not returned (security)
      expect(data.organization.whatsapp_access_token).toBeUndefined();
    });
  });

  test('Skip WhatsApp setup and complete onboarding', async ({ page }) => {
    // ====================================================================
    // STEP 1: Organization Setup
    // ====================================================================
    await test.step('Step 1: Create organization', async () => {
      await page.fill('[name="organizationName"]', 'Quick Start Company');
      await page.click('button:has-text("Next")');
    });

    // ====================================================================
    // STEP 2: Skip WhatsApp Setup
    // ====================================================================
    await test.step('Step 2: Skip WhatsApp setup', async () => {
      // Verify skip button visible
      const skipButton = page.locator('button:has-text("Skip for now")');
      await expect(skipButton).toBeVisible();

      // Click skip
      await skipButton.click();

      // Should immediately move to profile step
      await expect(page.locator('h2').filter({ hasText: 'Complete Your Profile' })).toBeVisible();
    });

    // ====================================================================
    // STEP 3: Profile Completion
    // ====================================================================
    await test.step('Step 3: Complete profile', async () => {
      await page.fill('[name="fullName"]', 'Jane Smith');
      await page.selectOption('[name="role"]', 'admin');
      await page.click('button:has-text("Complete Setup")');

      // Wait for dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 });
    });

    // ====================================================================
    // VERIFICATION: WhatsApp Fields Null
    // ====================================================================
    await test.step('Verify: WhatsApp fields are null', async () => {
      const response = await page.request.get('/api/organizations/current');
      const data = await response.json();

      expect(data.organization.whatsapp_phone_number_id).toBeNull();
      expect(data.organization.whatsapp_business_account_id).toBeNull();
      expect(data.organization.whatsapp_access_token).toBeUndefined();
    });
  });

  test('Validate Phone Number ID format', async ({ page }) => {
    // Navigate to WhatsApp step
    await page.fill('[name="organizationName"]', 'Test Validation');
    await page.click('button:has-text("Next")');

    // ====================================================================
    // Test Invalid Format
    // ====================================================================
    await test.step('Reject invalid Phone Number ID', async () => {
      // Enter invalid format (too short)
      await page.fill('[id="phoneNumberId"]', '123');

      // Wait for validation
      await page.waitForTimeout(600);

      // Verify Continue button is disabled
      const continueButton = page.locator('button:has-text("Continue →")');
      await expect(continueButton).toBeDisabled();
    });

    // ====================================================================
    // Test Valid Format
    // ====================================================================
    await test.step('Accept valid Phone Number ID', async () => {
      // Clear and enter valid format
      await page.fill('[id="phoneNumberId"]', '123456789012345');

      // Wait for validation
      await page.waitForTimeout(600);

      // Verify Continue button is enabled
      const continueButton = page.locator('button:has-text("Continue →")');
      await expect(continueButton).not.toBeDisabled();
    });
  });

  test('Navigate backwards through wizard', async ({ page }) => {
    // Get to WhatsApp wizard step 3
    await page.fill('[name="organizationName"]', 'Navigation Test');
    await page.click('button:has-text("Next")');
    await page.fill('[id="phoneNumberId"]', '123456789012345');
    await page.click('button:has-text("Continue →")');
    await page.fill('[id="businessAccountId"]', '987654321098765');
    await page.click('button:has-text("Continue →")');

    // ====================================================================
    // Navigate Back from Step 3 to Step 2
    // ====================================================================
    await test.step('Navigate back to step 2', async () => {
      await page.click('button:has-text("← Back")');

      // Verify we're back on step 2
      await expect(page.locator('.bg-blue-500').filter({ hasText: '2' })).toBeVisible();
      await expect(page.locator('[id="businessAccountId"]')).toBeVisible();

      // Verify data is preserved
      await expect(page.locator('[id="businessAccountId"]')).toHaveValue('987654321098765');
    });

    // ====================================================================
    // Navigate Back from Step 2 to Step 1
    // ====================================================================
    await test.step('Navigate back to step 1', async () => {
      await page.click('button:has-text("← Back")');

      // Verify we're back on step 1
      await expect(page.locator('.bg-blue-500').filter({ hasText: '1' })).toBeVisible();
      await expect(page.locator('[id="phoneNumberId"]')).toBeVisible();

      // Verify data is preserved
      await expect(page.locator('[id="phoneNumberId"]')).toHaveValue('123456789012345');
    });
  });

  test('Video tutorial interaction', async ({ page }) => {
    // Navigate to WhatsApp step
    await page.fill('[name="organizationName"]', 'Video Test');
    await page.click('button:has-text("Next")');

    // ====================================================================
    // Test Video Tutorial Toggle
    // ====================================================================
    await test.step('Open and close video tutorial', async () => {
      // Video should not be visible initially
      await expect(page.locator('video')).not.toBeVisible();

      // Click "Watch video tutorial"
      await page.click('button:has-text("Watch video tutorial")');

      // Video should now be visible
      await expect(page.locator('video')).toBeVisible();

      // Close video
      await page.click('button:has-text("✕")');

      // Video should be hidden again
      await expect(page.locator('video')).not.toBeVisible();
    });
  });

  test('Help links are present and accessible', async ({ page }) => {
    // Navigate to WhatsApp step
    await page.fill('[name="organizationName"]', 'Help Test');
    await page.click('button:has-text("Next")');

    // ====================================================================
    // Verify Help Section
    // ====================================================================
    await test.step('Verify help resources', async () => {
      // Check for help section
      await expect(page.locator('h4:has-text("Need Help?")')).toBeVisible();

      // Check for video tutorial link
      await expect(page.locator('button:has-text("Watch video tutorial")')).toBeVisible();

      // Check for documentation link
      const docLink = page.locator('a[href="/docs/whatsapp-setup"]');
      await expect(docLink).toBeVisible();
      await expect(docLink).toHaveAttribute('target', '_blank');

      // Check for support chat link
      await expect(page.locator('button:has-text("Chat with support")')).toBeVisible();
    });
  });

  test('Progress indicator reflects current step', async ({ page }) => {
    // ====================================================================
    // Step 1: Verify indicator
    // ====================================================================
    await test.step('Step 1 indicator', async () => {
      const step1 = page.locator('.w-10.h-10').nth(0);
      await expect(step1).toHaveClass(/bg-green-500|bg-blue-500/);
    });

    // Navigate to step 2
    await page.fill('[name="organizationName"]', 'Progress Test');
    await page.click('button:has-text("Next")');

    // ====================================================================
    // WhatsApp Step 1: Verify indicator
    // ====================================================================
    await test.step('WhatsApp step 1 indicator', async () => {
      // Main progress should show step 2 active
      // WhatsApp wizard should show step 1 active
      const whatsappStep1 = page.locator('.w-10.h-10.rounded-full.bg-blue-500').filter({ hasText: '1' });
      await expect(whatsappStep1).toBeVisible();
    });

    // Navigate to WhatsApp step 2
    await page.fill('[id="phoneNumberId"]', '123456789012345');
    await page.click('button:has-text("Continue →")');

    // ====================================================================
    // WhatsApp Step 2: Verify indicator
    // ====================================================================
    await test.step('WhatsApp step 2 indicator', async () => {
      // Step 1 should be green (completed)
      const whatsappStep1 = page.locator('.w-10.h-10.rounded-full.bg-green-500');
      await expect(whatsappStep1).toContainText('✓');

      // Step 2 should be blue (active)
      const whatsappStep2 = page.locator('.w-10.h-10.rounded-full.bg-blue-500').filter({ hasText: '2' });
      await expect(whatsappStep2).toBeVisible();
    });
  });

  test('Error handling for duplicate organization slug', async ({ page }) => {
    // This assumes an organization with slug "test-company" already exists

    await page.fill('[name="organizationName"]', 'Test Company');
    await page.fill('[name="subdomain"]', 'test-company'); // Manually set existing slug
    await page.click('button:has-text("Next")');

    // Skip WhatsApp
    await page.click('button:has-text("Skip for now")');

    // Complete profile
    await page.fill('[name="fullName"]', 'Error Test');
    await page.selectOption('[name="role"]', 'owner');
    await page.click('button:has-text("Complete Setup")');

    // Should show error message
    await expect(page.locator('.bg-red-50')).toBeVisible();
    await expect(page.locator('text=subdomain is already taken')).toBeVisible();
  });
});

/**
 * Accessibility Tests
 * Tests keyboard navigation and WCAG compliance
 */
test.describe('Onboarding - Accessibility', () => {
  test('Keyboard navigation through wizard', async ({ page }) => {
    await page.goto('/onboarding');

    // Tab through form fields
    await page.keyboard.press('Tab'); // Organization name
    await page.keyboard.type('Keyboard Test');

    await page.keyboard.press('Tab'); // Subdomain
    await page.keyboard.press('Tab'); // Next button
    await page.keyboard.press('Enter'); // Submit

    // Verify we moved to next step
    await expect(page.locator('h2').filter({ hasText: 'WhatsApp Business Setup' })).toBeVisible();
  });

  test('Screen reader labels present', async ({ page }) => {
    await page.goto('/onboarding');

    // Check for proper labels
    const orgNameInput = page.locator('[name="organizationName"]');
    await expect(orgNameInput).toHaveAttribute('id', 'organizationName');

    const orgNameLabel = page.locator('label[for="organizationName"]');
    await expect(orgNameLabel).toBeVisible();
  });
});

/**
 * Performance Tests
 * Tests load times and rendering performance
 */
test.describe('Onboarding - Performance', () => {
  test('Page loads within performance budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/onboarding');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;

    // Should load in under 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('Wizard transitions are smooth', async ({ page }) => {
    await page.goto('/onboarding');

    await page.fill('[name="organizationName"]', 'Performance Test');

    const startTime = Date.now();
    await page.click('button:has-text("Next")');
    await page.waitForSelector('h2:has-text("WhatsApp Business Setup")');
    const transitionTime = Date.now() - startTime;

    // Transition should be fast (under 500ms)
    expect(transitionTime).toBeLessThan(500);
  });
});
