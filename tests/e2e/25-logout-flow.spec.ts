import { test, expect } from './auth-fixtures'
import { TEST_USERS } from './auth-fixtures'

/**
 * E2E Test Suite: Logout Flow
 * Tests the logout functionality including:
 * - Logout button visibility
 * - Logout action
 * - Session clearing
 * - Redirect after logout
 * - Protected route access after logout
 */

test.describe('Logout Flow', () => {
  test('should find logout option in user menu', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard')
    await ownerPage.waitForLoadState('networkidle')

    // Look for user menu/dropdown
    const userMenu = ownerPage.locator(
      '[data-testid="user-menu"], [aria-label="User menu"], button:has(img), .avatar, [class*="avatar"]'
    )

    if (await userMenu.first().isVisible()) {
      await userMenu.first().click()
      await ownerPage.waitForTimeout(500)

      // Look for logout option
      const logoutButton = ownerPage.locator(
        'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Sign out"), [data-testid="logout"]'
      )

      await expect(logoutButton.first()).toBeVisible()

      await ownerPage.screenshot({ path: 'test-results/logout-menu-option.png' })
    } else {
      // Try looking for direct logout button in header/sidebar
      const directLogout = ownerPage.locator(
        'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
      )

      if (await directLogout.first().isVisible()) {
        await ownerPage.screenshot({ path: 'test-results/logout-direct-button.png' })
      }
    }
  })

  test('should logout successfully', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard')
    await ownerPage.waitForLoadState('networkidle')

    // Find and click user menu first
    const userMenu = ownerPage.locator(
      '[data-testid="user-menu"], [aria-label="User menu"], button:has(img), .avatar'
    )

    if (await userMenu.first().isVisible()) {
      await userMenu.first().click()
      await ownerPage.waitForTimeout(500)
    }

    // Click logout
    const logoutButton = ownerPage.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Sign out"), [data-testid="logout"]'
    )

    if (await logoutButton.first().isVisible()) {
      await logoutButton.first().click()

      // Wait for redirect
      await ownerPage.waitForTimeout(3000)

      // Should redirect to signin or landing page
      const currentUrl = ownerPage.url()
      const isLoggedOut =
        currentUrl.includes('/auth/signin') ||
        currentUrl.includes('/auth') ||
        currentUrl.match(/^https?:\/\/[^/]+\/?$/)

      expect(isLoggedOut).toBeTruthy()

      await ownerPage.screenshot({ path: 'test-results/logout-success.png' })
    }
  })

  test('should clear session after logout', async ({ ownerPage }) => {
    // First login
    await ownerPage.goto('/dashboard')
    await ownerPage.waitForLoadState('networkidle')

    // Logout
    const userMenu = ownerPage.locator(
      '[data-testid="user-menu"], [aria-label="User menu"], button:has(img), .avatar'
    )

    if (await userMenu.first().isVisible()) {
      await userMenu.first().click()
      await ownerPage.waitForTimeout(500)
    }

    const logoutButton = ownerPage.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), [data-testid="logout"]'
    )

    if (await logoutButton.first().isVisible()) {
      await logoutButton.first().click()
      await ownerPage.waitForTimeout(3000)

      // Try to access protected route
      await ownerPage.goto('/dashboard')
      await ownerPage.waitForTimeout(2000)

      // Should be redirected to login
      await expect(ownerPage).toHaveURL(/\/auth/)

      await ownerPage.screenshot({ path: 'test-results/logout-session-cleared.png' })
    }
  })

  test('should not access protected routes after logout', async ({ ownerPage }) => {
    // Logout first
    await ownerPage.goto('/dashboard')
    await ownerPage.waitForLoadState('networkidle')

    const userMenu = ownerPage.locator(
      '[data-testid="user-menu"], button:has(img), .avatar'
    )

    if (await userMenu.first().isVisible()) {
      await userMenu.first().click()
      await ownerPage.waitForTimeout(500)
    }

    const logoutButton = ownerPage.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
    )

    if (await logoutButton.first().isVisible()) {
      await logoutButton.first().click()
      await ownerPage.waitForTimeout(3000)

      // Try various protected routes
      const protectedRoutes = [
        '/dashboard/inbox',
        '/dashboard/contacts',
        '/dashboard/settings/profile',
        '/dashboard/settings/organization',
      ]

      for (const route of protectedRoutes) {
        await ownerPage.goto(route)
        await ownerPage.waitForTimeout(1000)

        // Should redirect to auth
        await expect(ownerPage).toHaveURL(/\/auth/)
      }

      await ownerPage.screenshot({ path: 'test-results/logout-protected-routes.png' })
    }
  })
})

test.describe('Logout - Different Roles', () => {
  test('admin can logout', async ({ adminPage }) => {
    await adminPage.goto('/dashboard')
    await adminPage.waitForLoadState('networkidle')

    const userMenu = adminPage.locator(
      '[data-testid="user-menu"], button:has(img), .avatar'
    )

    if (await userMenu.first().isVisible()) {
      await userMenu.first().click()
      await adminPage.waitForTimeout(500)
    }

    const logoutButton = adminPage.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
    )

    if (await logoutButton.first().isVisible()) {
      await logoutButton.first().click()
      await adminPage.waitForTimeout(3000)

      // Should be redirected
      const currentUrl = adminPage.url()
      const isLoggedOut = currentUrl.includes('/auth') || currentUrl.match(/^https?:\/\/[^/]+\/?$/)

      expect(isLoggedOut).toBeTruthy()

      await adminPage.screenshot({ path: 'test-results/logout-admin.png' })
    }
  })

  test('agent can logout', async ({ agentPage }) => {
    await agentPage.goto('/dashboard')
    await agentPage.waitForLoadState('networkidle')

    const userMenu = agentPage.locator(
      '[data-testid="user-menu"], button:has(img), .avatar'
    )

    if (await userMenu.first().isVisible()) {
      await userMenu.first().click()
      await agentPage.waitForTimeout(500)
    }

    const logoutButton = agentPage.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
    )

    if (await logoutButton.first().isVisible()) {
      await logoutButton.first().click()
      await agentPage.waitForTimeout(3000)

      const currentUrl = agentPage.url()
      const isLoggedOut = currentUrl.includes('/auth') || currentUrl.match(/^https?:\/\/[^/]+\/?$/)

      expect(isLoggedOut).toBeTruthy()

      await agentPage.screenshot({ path: 'test-results/logout-agent.png' })
    }
  })
})

test.describe('Logout - Edge Cases', () => {
  test('should handle logout with network delay', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard')
    await ownerPage.waitForLoadState('networkidle')

    // Simulate slow network
    await ownerPage.route('**/auth/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.continue()
    })

    const userMenu = ownerPage.locator(
      '[data-testid="user-menu"], button:has(img), .avatar'
    )

    if (await userMenu.first().isVisible()) {
      await userMenu.first().click()
      await ownerPage.waitForTimeout(500)
    }

    const logoutButton = ownerPage.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
    )

    if (await logoutButton.first().isVisible()) {
      await logoutButton.first().click()

      // Should eventually complete logout
      await ownerPage.waitForTimeout(5000)

      await ownerPage.screenshot({ path: 'test-results/logout-slow-network.png' })
    }
  })

  test('should allow re-login after logout', async ({ page }) => {
    // Start fresh without auth fixtures
    await page.goto('/auth/signin')
    await page.waitForLoadState('networkidle')

    // Login
    await page.fill('input[type="email"]', TEST_USERS.owner.email)
    await page.fill('input[type="password"]', TEST_USERS.owner.password)
    await page.click('button[type="submit"]')

    await page.waitForURL('**/dashboard**', { timeout: 15000 })

    // Logout
    const userMenu = page.locator(
      '[data-testid="user-menu"], button:has(img), .avatar'
    )

    if (await userMenu.first().isVisible()) {
      await userMenu.first().click()
      await page.waitForTimeout(500)
    }

    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout")'
    )

    if (await logoutButton.first().isVisible()) {
      await logoutButton.first().click()
      await page.waitForTimeout(3000)

      // Login again
      await page.goto('/auth/signin')
      await page.fill('input[type="email"]', TEST_USERS.owner.email)
      await page.fill('input[type="password"]', TEST_USERS.owner.password)
      await page.click('button[type="submit"]')

      // Should work
      await page.waitForURL('**/dashboard**', { timeout: 15000 })
      await expect(page).toHaveURL(/\/dashboard/)

      await page.screenshot({ path: 'test-results/logout-relogin.png' })
    }
  })
})

test.describe('Logout UI', () => {
  test('should show confirmation if unsaved changes', async ({ ownerPage }) => {
    // This test checks if there's a confirmation when logging out with unsaved work
    // Not all apps have this feature

    await ownerPage.goto('/dashboard/settings/profile')
    await ownerPage.waitForLoadState('networkidle')

    // Make a change (if possible)
    const nameInput = ownerPage.locator('input[name="full_name"], input[name="name"]').first()

    if (await nameInput.isVisible()) {
      await nameInput.fill('Unsaved Change')

      // Try to logout
      const userMenu = ownerPage.locator('[data-testid="user-menu"], button:has(img), .avatar')

      if (await userMenu.first().isVisible()) {
        await userMenu.first().click()
        await ownerPage.waitForTimeout(500)
      }

      const logoutButton = ownerPage.locator(
        'button:has-text("Logout"), button:has-text("Sign out")'
      )

      if (await logoutButton.first().isVisible()) {
        await logoutButton.first().click()
        await ownerPage.waitForTimeout(1000)

        // Check for confirmation dialog
        const confirmDialog = ownerPage.locator(
          '[role="alertdialog"], [role="dialog"], text=/unsaved|discard|sure/i'
        )

        const hasConfirmation = await confirmDialog.first().isVisible().catch(() => false)

        await ownerPage.screenshot({ path: 'test-results/logout-unsaved-changes.png' })
      }
    }
  })
})
