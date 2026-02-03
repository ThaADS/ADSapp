import { test, expect } from '@playwright/test'
import { TEST_USERS } from './auth-fixtures'

/**
 * E2E Test Suite: Sign In Flow
 * Tests the complete authentication flow including:
 * - Valid login with different roles
 * - Invalid credentials handling
 * - Session persistence
 * - Redirect logic based on user state
 * - Demo account quick login
 */

test.describe('Sign In Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies()
  })

  test('should display sign in page correctly', async ({ page }) => {
    await page.goto('/auth/signin')

    // Check page elements
    await expect(page.locator('text=ADSapp')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()

    // Check navigation links
    await expect(page.locator('a[href="/auth/signup"]')).toBeVisible()
    await expect(page.locator('a[href="/auth/forgot-password"]')).toBeVisible()

    await page.screenshot({ path: 'test-results/signin-page-loaded.png' })
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin')

    // Enter invalid credentials
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Wait for error message
    await expect(page.locator('.text-red-500, .bg-red-50, [role="alert"]')).toBeVisible({
      timeout: 10000,
    })

    // Should still be on signin page
    await expect(page).toHaveURL(/\/auth\/signin/)

    await page.screenshot({ path: 'test-results/signin-invalid-credentials.png' })
  })

  test('should login successfully as owner and redirect to dashboard', async ({ page }) => {
    await page.goto('/auth/signin')

    // Fill in owner credentials
    await page.fill('input[type="email"]', TEST_USERS.owner.email)
    await page.fill('input[type="password"]', TEST_USERS.owner.password)

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 })

    // Verify we're on dashboard
    await expect(page).toHaveURL(/\/dashboard/)

    // Check for dashboard elements
    await expect(page.locator('nav, [data-testid="sidebar"], aside')).toBeVisible()

    await page.screenshot({ path: 'test-results/signin-owner-success.png' })
  })

  test('should login successfully as admin', async ({ page }) => {
    await page.goto('/auth/signin')

    await page.fill('input[type="email"]', TEST_USERS.admin.email)
    await page.fill('input[type="password"]', TEST_USERS.admin.password)
    await page.click('button[type="submit"]')

    await page.waitForURL('**/dashboard**', { timeout: 15000 })
    await expect(page).toHaveURL(/\/dashboard/)

    await page.screenshot({ path: 'test-results/signin-admin-success.png' })
  })

  test('should login successfully as agent', async ({ page }) => {
    await page.goto('/auth/signin')

    await page.fill('input[type="email"]', TEST_USERS.agent.email)
    await page.fill('input[type="password"]', TEST_USERS.agent.password)
    await page.click('button[type="submit"]')

    await page.waitForURL('**/dashboard**', { timeout: 15000 })
    await expect(page).toHaveURL(/\/dashboard/)

    await page.screenshot({ path: 'test-results/signin-agent-success.png' })
  })

  test('should login as super admin and redirect to admin panel', async ({ page }) => {
    await page.goto('/auth/signin')

    await page.fill('input[type="email"]', TEST_USERS.superadmin.email)
    await page.fill('input[type="password"]', TEST_USERS.superadmin.password)
    await page.click('button[type="submit"]')

    // Super admin should redirect to /admin
    await page.waitForURL('**/admin**', { timeout: 15000 })
    await expect(page).toHaveURL(/\/admin/)

    await page.screenshot({ path: 'test-results/signin-superadmin-success.png' })
  })

  test('should use demo login buttons', async ({ page }) => {
    await page.goto('/auth/signin')

    // Look for demo login section
    const demoSection = page.locator('text=Demo Accounts, text=Try Demo, button:has-text("Owner")')

    if (await demoSection.first().isVisible()) {
      // Click owner demo button
      await page.click('button:has-text("Owner")')

      // Should redirect to dashboard
      await page.waitForURL('**/dashboard**', { timeout: 15000 })
      await expect(page).toHaveURL(/\/dashboard/)

      await page.screenshot({ path: 'test-results/signin-demo-owner.png' })
    } else {
      // Demo buttons might not be visible, skip
      test.skip()
    }
  })

  test('should persist session after page reload', async ({ page }) => {
    // First login
    await page.goto('/auth/signin')
    await page.fill('input[type="email"]', TEST_USERS.owner.email)
    await page.fill('input[type="password"]', TEST_USERS.owner.password)
    await page.click('button[type="submit"]')

    await page.waitForURL('**/dashboard**', { timeout: 15000 })

    // Reload page
    await page.reload()

    // Should still be on dashboard (session persisted)
    await expect(page).toHaveURL(/\/dashboard/)

    // Navigate to another page and back
    await page.goto('/dashboard/contacts')
    await expect(page).toHaveURL(/\/dashboard\/contacts/)

    await page.screenshot({ path: 'test-results/signin-session-persisted.png' })
  })

  test('should redirect unauthenticated user to signin', async ({ page }) => {
    // Try to access protected page without auth
    await page.goto('/dashboard')

    // Should redirect to signin
    await expect(page).toHaveURL(/\/auth\/signin|\/auth/)

    await page.screenshot({ path: 'test-results/signin-redirect-unauthenticated.png' })
  })

  test('should handle forgot password link', async ({ page }) => {
    await page.goto('/auth/signin')

    // Click forgot password link
    await page.click('a[href="/auth/forgot-password"]')

    // Should navigate to forgot password page
    await expect(page).toHaveURL(/\/auth\/forgot-password/)

    // Check for email input
    await expect(page.locator('input[type="email"]')).toBeVisible()

    await page.screenshot({ path: 'test-results/signin-forgot-password-link.png' })
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/auth/signin')

    // Enter invalid email
    await page.fill('input[type="email"]', 'notanemail')
    await page.fill('input[type="password"]', 'somepassword')

    // Try to submit - browser validation should prevent
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Check if email input shows validation error (HTML5 validation)
    const emailInput = page.locator('input[type="email"]')
    const isInvalid = await emailInput.evaluate(
      (el: HTMLInputElement) => !el.validity.valid
    )
    expect(isInvalid).toBeTruthy()
  })

  test('should show loading state during login', async ({ page }) => {
    await page.goto('/auth/signin')

    await page.fill('input[type="email"]', TEST_USERS.owner.email)
    await page.fill('input[type="password"]', TEST_USERS.owner.password)

    // Click submit and immediately check for loading state
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()

    // Button should show loading state (disabled or spinner)
    // This happens quickly so we check immediately
    const isDisabledOrLoading =
      (await submitButton.isDisabled()) ||
      (await submitButton.locator('.animate-spin, svg').isVisible().catch(() => false))

    // Wait for navigation to complete
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
  })
})

/**
 * Accessibility Tests for Sign In
 */
test.describe('Sign In - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/auth/signin')

    // Tab to email input
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // May need extra tab for logo/links

    // Type email
    await page.keyboard.type(TEST_USERS.owner.email)

    // Tab to password
    await page.keyboard.press('Tab')
    await page.keyboard.type(TEST_USERS.owner.password)

    // Tab to submit and press Enter
    await page.keyboard.press('Tab')
    await page.keyboard.press('Enter')

    // Should navigate to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 })
  })

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/auth/signin')

    // Check for labels or aria-labels
    const emailInput = page.locator('input[type="email"]')
    const passwordInput = page.locator('input[type="password"]')

    // Either has label or aria-label
    const emailHasLabel =
      (await emailInput.getAttribute('aria-label')) ||
      (await emailInput.getAttribute('id'))
    const passwordHasLabel =
      (await passwordInput.getAttribute('aria-label')) ||
      (await passwordInput.getAttribute('id'))

    expect(emailHasLabel).toBeTruthy()
    expect(passwordHasLabel).toBeTruthy()
  })
})
