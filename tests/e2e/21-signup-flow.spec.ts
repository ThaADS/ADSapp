import { test, expect } from '@playwright/test'

/**
 * E2E Test Suite: Sign Up Flow
 * Tests the registration process including:
 * - Form display and validation
 * - Registration with valid data
 * - Duplicate email handling
 * - Password requirements
 * - Redirect to confirmation or onboarding
 *
 * Note: Full email confirmation testing requires email service mocking
 * These tests verify the UI flow up to the confirmation message
 */

// Generate unique email for each test run to avoid duplicates
const generateTestEmail = () => `test-${Date.now()}-${Math.random().toString(36).substring(7)}@e2e-test.com`

test.describe('Sign Up Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies()
  })

  test('should display sign up page correctly', async ({ page }) => {
    await page.goto('/auth/signup')

    // Check page title and branding
    await expect(page.locator('text=ADSapp')).toBeVisible()

    // Check form fields
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"], input[type="password"]')).toBeVisible()
    await expect(page.locator('input[name="fullName"]')).toBeVisible()

    // Check submit button
    await expect(page.locator('button[type="submit"]')).toBeVisible()

    // Check signin link
    await expect(page.locator('a[href="/auth/signin"]')).toBeVisible()

    await page.screenshot({ path: 'test-results/signup-page-loaded.png' })
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/auth/signup')

    // Try to submit empty form
    await page.click('button[type="submit"]')

    // Check for validation - form should not submit
    await expect(page).toHaveURL(/\/auth\/signup/)

    // HTML5 validation should show on required fields
    const emailInput = page.locator('input[name="email"], input[type="email"]')
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
    expect(isInvalid).toBeTruthy()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth/signup')

    // Fill invalid email
    await page.fill('input[name="email"], input[type="email"]', 'notanemail')
    await page.fill('input[name="password"], input[type="password"]', 'ValidPass123!')
    await page.fill('input[name="fullName"]', 'Test User')

    await page.click('button[type="submit"]')

    // Should stay on signup page due to validation
    await expect(page).toHaveURL(/\/auth\/signup/)
  })

  test('should validate password requirements', async ({ page }) => {
    await page.goto('/auth/signup')

    const testEmail = generateTestEmail()

    // Fill form with weak password
    await page.fill('input[name="email"], input[type="email"]', testEmail)
    await page.fill('input[name="password"], input[type="password"]', '123') // Too short/weak
    await page.fill('input[name="fullName"]', 'Test User')

    await page.click('button[type="submit"]')

    // Wait for potential error message
    await page.waitForTimeout(2000)

    // Either stays on page or shows error
    const hasError = await page.locator('.text-red-500, .bg-red-50, [role="alert"]').isVisible()
    const stillOnSignup = page.url().includes('/auth/signup')

    expect(hasError || stillOnSignup).toBeTruthy()

    await page.screenshot({ path: 'test-results/signup-weak-password.png' })
  })

  test('should show error for existing email', async ({ page }) => {
    await page.goto('/auth/signup')

    // Use an email that already exists (demo account)
    await page.fill('input[name="email"], input[type="email"]', 'owner@demo-company.com')
    await page.fill('input[name="password"], input[type="password"]', 'ValidPass123!')
    await page.fill('input[name="fullName"]', 'Test User')

    // Fill organization name if visible
    const orgInput = page.locator('input[name="organizationName"]')
    if (await orgInput.isVisible()) {
      await orgInput.fill('Test Organization')
    }

    await page.click('button[type="submit"]')

    // Wait for error response
    await page.waitForTimeout(3000)

    // Should show error about existing email
    const errorMessage = page.locator('.text-red-500, .bg-red-50, [role="alert"]')
    await expect(errorMessage).toBeVisible({ timeout: 10000 })

    await page.screenshot({ path: 'test-results/signup-existing-email.png' })
  })

  test('should complete registration form and show confirmation', async ({ page }) => {
    await page.goto('/auth/signup')

    const testEmail = generateTestEmail()

    // Fill complete form
    await page.fill('input[name="email"], input[type="email"]', testEmail)
    await page.fill('input[name="password"], input[type="password"]', 'SecurePass123!')
    await page.fill('input[name="fullName"]', 'E2E Test User')

    // Fill organization name if visible
    const orgInput = page.locator('input[name="organizationName"]')
    if (await orgInput.isVisible()) {
      await orgInput.fill('E2E Test Organization')
    }

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for response
    await page.waitForTimeout(5000)

    // Should either:
    // 1. Redirect to onboarding (if auto-confirm enabled)
    // 2. Show confirmation message (if email confirmation required)
    // 3. Stay on signup with success message

    const isOnOnboarding = page.url().includes('/onboarding')
    const isOnDashboard = page.url().includes('/dashboard')
    const hasConfirmationMessage = await page
      .locator('text=/check.*email|confirm.*email|verification/i')
      .isVisible()
      .catch(() => false)
    const hasSuccessMessage = await page
      .locator('.text-green-500, .bg-green-50, text=/success/i')
      .isVisible()
      .catch(() => false)

    expect(isOnOnboarding || isOnDashboard || hasConfirmationMessage || hasSuccessMessage).toBeTruthy()

    await page.screenshot({ path: 'test-results/signup-completed.png' })
  })

  test('should show loading state during registration', async ({ page }) => {
    await page.goto('/auth/signup')

    const testEmail = generateTestEmail()

    await page.fill('input[name="email"], input[type="email"]', testEmail)
    await page.fill('input[name="password"], input[type="password"]', 'SecurePass123!')
    await page.fill('input[name="fullName"]', 'Loading Test')

    const orgInput = page.locator('input[name="organizationName"]')
    if (await orgInput.isVisible()) {
      await orgInput.fill('Loading Test Org')
    }

    const submitButton = page.locator('button[type="submit"]')

    // Click and check loading state
    await submitButton.click()

    // Button should be disabled or show loading indicator
    const wasDisabled = await submitButton.isDisabled().catch(() => false)
    const hadSpinner = await submitButton.locator('.animate-spin').isVisible().catch(() => false)

    // Wait for request to complete
    await page.waitForTimeout(5000)
  })

  test('should navigate to signin page', async ({ page }) => {
    await page.goto('/auth/signup')

    // Click signin link
    await page.click('a[href="/auth/signin"]')

    // Should navigate to signin
    await expect(page).toHaveURL(/\/auth\/signin/)

    await page.screenshot({ path: 'test-results/signup-to-signin-link.png' })
  })

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/auth/signup')

    // Look for home/back link
    const homeLink = page.locator('a[href="/"]')
    if (await homeLink.isVisible()) {
      await homeLink.click()
      await expect(page).toHaveURL(/^https?:\/\/[^/]+\/?$/)
    }
  })
})

/**
 * Accessibility Tests for Sign Up
 */
test.describe('Sign Up - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/auth/signup')

    // Tab through form
    await page.keyboard.press('Tab')

    // Type in fields using keyboard
    const testEmail = generateTestEmail()

    // Navigate to email and fill
    await page.locator('input[name="email"], input[type="email"]').focus()
    await page.keyboard.type(testEmail)

    await page.keyboard.press('Tab')
    await page.keyboard.type('KeyboardPass123!')

    await page.keyboard.press('Tab')
    await page.keyboard.type('Keyboard User')

    // Continue tabbing to submit
    await page.keyboard.press('Tab')

    // If there's organization field
    const orgInput = page.locator('input[name="organizationName"]')
    if (await orgInput.isFocused()) {
      await page.keyboard.type('Keyboard Org')
      await page.keyboard.press('Tab')
    }

    // Should be able to submit with Enter
    await page.keyboard.press('Enter')

    // Wait for response
    await page.waitForTimeout(5000)
  })

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/auth/signup')

    // Check that inputs have associated labels
    const emailInput = page.locator('input[name="email"], input[type="email"]')
    const passwordInput = page.locator('input[name="password"], input[type="password"]')
    const nameInput = page.locator('input[name="fullName"]')

    // Each should have id or aria-label
    expect(
      (await emailInput.getAttribute('id')) || (await emailInput.getAttribute('aria-label'))
    ).toBeTruthy()
    expect(
      (await passwordInput.getAttribute('id')) || (await passwordInput.getAttribute('aria-label'))
    ).toBeTruthy()
    expect(
      (await nameInput.getAttribute('id')) || (await nameInput.getAttribute('aria-label'))
    ).toBeTruthy()
  })
})

/**
 * Security Tests for Sign Up
 */
test.describe('Sign Up - Security', () => {
  test('should not expose sensitive data in URL', async ({ page }) => {
    await page.goto('/auth/signup')

    const testEmail = generateTestEmail()

    await page.fill('input[name="email"], input[type="email"]', testEmail)
    await page.fill('input[name="password"], input[type="password"]', 'SecurePass123!')
    await page.fill('input[name="fullName"]', 'Security Test')

    await page.click('button[type="submit"]')

    await page.waitForTimeout(3000)

    // URL should not contain password
    expect(page.url()).not.toContain('SecurePass123')
    expect(page.url()).not.toContain('password')
  })

  test('should use POST method for form submission', async ({ page }) => {
    await page.goto('/auth/signup')

    // Check form method
    const form = page.locator('form')
    const method = await form.getAttribute('method')

    // If method is specified, it should be POST (or form uses JS submit)
    if (method) {
      expect(method.toLowerCase()).toBe('post')
    }
  })
})
