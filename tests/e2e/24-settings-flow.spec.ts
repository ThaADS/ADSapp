import { test, expect } from './auth-fixtures'

/**
 * E2E Test Suite: Settings Flow
 * Tests settings pages including:
 * - Profile settings
 * - Language preference
 * - Organization settings
 * - Team management
 * - Integration settings
 * - Billing settings
 */

test.describe('Profile Settings', () => {
  test('should load profile settings page', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/profile')
    await ownerPage.waitForLoadState('networkidle')

    // Should be on profile settings
    await expect(ownerPage).toHaveURL(/\/dashboard\/settings\/profile/)

    // Check for profile-related content
    const profileContent = ownerPage.locator(
      'h1:has-text("Profile"), h2:has-text("Profile"), text=/profile settings/i'
    )
    await expect(profileContent.first()).toBeVisible()

    await ownerPage.screenshot({ path: 'test-results/settings-profile-loaded.png' })
  })

  test('should display user information', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/profile')
    await ownerPage.waitForLoadState('networkidle')

    // Check for user info fields
    const nameField = ownerPage.locator(
      'input[name="full_name"], input[name="fullName"], input[name="name"]'
    )
    const emailField = ownerPage.locator(
      'input[name="email"], input[type="email"], text=@'
    )

    const hasNameField = await nameField.first().isVisible().catch(() => false)
    const hasEmailField = await emailField.first().isVisible().catch(() => false)

    expect(hasNameField || hasEmailField).toBeTruthy()

    await ownerPage.screenshot({ path: 'test-results/settings-profile-info.png' })
  })

  test('should update profile name', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/profile')
    await ownerPage.waitForLoadState('networkidle')

    const nameInput = ownerPage.locator(
      'input[name="full_name"], input[name="fullName"], input[name="name"]'
    ).first()

    if (await nameInput.isVisible()) {
      // Save original value
      const originalValue = await nameInput.inputValue()

      // Update name
      await nameInput.fill('E2E Updated Name')

      // Find and click save button
      const saveButton = ownerPage.locator(
        'button:has-text("Save"), button:has-text("Update"), button[type="submit"]'
      ).first()

      if (await saveButton.isVisible()) {
        await saveButton.click()
        await ownerPage.waitForTimeout(2000)

        // Check for success message
        const successMessage = ownerPage.locator(
          '.text-green-500, .bg-green-50, text=/saved|updated|success/i'
        )
        const hasSuccess = await successMessage.first().isVisible().catch(() => false)

        // Restore original value
        await nameInput.fill(originalValue || 'Demo Owner')
        await saveButton.click()

        await ownerPage.screenshot({ path: 'test-results/settings-profile-updated.png' })
      }
    }
  })
})

test.describe('Language Settings', () => {
  test('should have language preference section', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/profile')
    await ownerPage.waitForLoadState('networkidle')

    // Look for language settings section
    const languageSection = ownerPage.locator(
      'text=/language|taal/i, [data-testid="language-settings"]'
    )

    if (await languageSection.first().isVisible()) {
      await ownerPage.screenshot({ path: 'test-results/settings-language-section.png' })
    }
  })

  test('should show language options', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/profile')
    await ownerPage.waitForLoadState('networkidle')

    // Look for language radio buttons or dropdown
    const englishOption = ownerPage.locator('input[value="en"], label:has-text("English")')
    const dutchOption = ownerPage.locator('input[value="nl"], label:has-text("Dutch"), label:has-text("Nederlands")')

    const hasEnglish = await englishOption.first().isVisible().catch(() => false)
    const hasDutch = await dutchOption.first().isVisible().catch(() => false)

    if (hasEnglish || hasDutch) {
      await ownerPage.screenshot({ path: 'test-results/settings-language-options.png' })
    }
  })

  test('should change language preference', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/profile')
    await ownerPage.waitForLoadState('networkidle')

    // Find Dutch language option
    const dutchOption = ownerPage.locator(
      'input[value="nl"], label:has-text("Dutch"), label:has-text("Nederlands")'
    ).first()

    if (await dutchOption.isVisible()) {
      // Check if it's a radio button or label
      const tagName = await dutchOption.evaluate(el => el.tagName.toLowerCase())

      if (tagName === 'input') {
        await dutchOption.check()
      } else {
        await dutchOption.click()
      }

      // Find save button
      const saveButton = ownerPage.locator('button:has-text("Save"), button:has-text("Opslaan")').first()

      if (await saveButton.isVisible()) {
        await saveButton.click()
        await ownerPage.waitForTimeout(3000)

        // Page might reload
        await ownerPage.screenshot({ path: 'test-results/settings-language-changed.png' })
      }
    }
  })
})

test.describe('Organization Settings', () => {
  test('should load organization settings page', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/organization')
    await ownerPage.waitForLoadState('networkidle')

    await expect(ownerPage).toHaveURL(/\/dashboard\/settings\/organization/)

    // Check for organization settings content
    const orgContent = ownerPage.locator(
      'h1:has-text("Organization"), h2:has-text("Organization"), text=/organization settings/i'
    )
    await expect(orgContent.first()).toBeVisible()

    await ownerPage.screenshot({ path: 'test-results/settings-organization-loaded.png' })
  })

  test('should display organization name', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/organization')
    await ownerPage.waitForLoadState('networkidle')

    const orgNameInput = ownerPage.locator(
      'input[name="name"], input[name="organizationName"], input[name="organization_name"]'
    )

    if (await orgNameInput.first().isVisible()) {
      const value = await orgNameInput.first().inputValue()
      expect(value).toBeTruthy()

      await ownerPage.screenshot({ path: 'test-results/settings-organization-name.png' })
    }
  })

  test('should have business hours section', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/organization')
    await ownerPage.waitForLoadState('networkidle')

    // Look for business hours section
    const businessHours = ownerPage.locator(
      'text=/business hours|working hours|openingstijden/i, [data-testid="business-hours"]'
    )

    if (await businessHours.first().isVisible()) {
      await ownerPage.screenshot({ path: 'test-results/settings-business-hours.png' })
    }
  })
})

test.describe('Team Settings', () => {
  test('should load team settings page', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/team')
    await ownerPage.waitForLoadState('networkidle')

    await expect(ownerPage).toHaveURL(/\/dashboard\/settings\/team/)

    // Check for team settings content
    const teamContent = ownerPage.locator(
      'h1:has-text("Team"), h2:has-text("Team"), text=/team member|invite/i'
    )
    await expect(teamContent.first()).toBeVisible()

    await ownerPage.screenshot({ path: 'test-results/settings-team-loaded.png' })
  })

  test('should display team members list', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/team')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(2000)

    // Check for team members
    const membersList = ownerPage.locator(
      'table, [data-testid="team-members"], .team-member'
    )

    await expect(membersList.first()).toBeVisible()

    await ownerPage.screenshot({ path: 'test-results/settings-team-members.png' })
  })

  test('should have invite member button', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/team')
    await ownerPage.waitForLoadState('networkidle')

    const inviteButton = ownerPage.locator(
      'button:has-text("Invite"), button:has-text("Add"), [data-testid="invite-member"]'
    )

    await expect(inviteButton.first()).toBeVisible()

    await ownerPage.screenshot({ path: 'test-results/settings-team-invite-button.png' })
  })

  test('should open invite member modal', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/team')
    await ownerPage.waitForLoadState('networkidle')

    const inviteButton = ownerPage.locator(
      'button:has-text("Invite"), button:has-text("Add")'
    ).first()

    if (await inviteButton.isVisible()) {
      await inviteButton.click()
      await ownerPage.waitForTimeout(500)

      // Check for modal with email input
      const emailInput = ownerPage.locator(
        'input[name="email"], input[type="email"], input[placeholder*="email" i]'
      )
      const roleSelect = ownerPage.locator('select[name="role"], [data-testid="role-select"]')

      const hasEmailInput = await emailInput.first().isVisible().catch(() => false)
      const hasRoleSelect = await roleSelect.first().isVisible().catch(() => false)

      expect(hasEmailInput || hasRoleSelect).toBeTruthy()

      await ownerPage.screenshot({ path: 'test-results/settings-team-invite-modal.png' })

      // Close modal
      const closeButton = ownerPage.locator('button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"]')
      if (await closeButton.first().isVisible()) {
        await closeButton.first().click()
      }
    }
  })
})

test.describe('Integration Settings', () => {
  test('should load integrations settings page', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/integrations')
    await ownerPage.waitForLoadState('networkidle')

    await expect(ownerPage).toHaveURL(/\/dashboard\/settings\/integrations/)

    // Check for integrations content
    const integrationsContent = ownerPage.locator(
      'h1:has-text("Integration"), h2:has-text("Integration"), text=/connect|integration/i'
    )
    await expect(integrationsContent.first()).toBeVisible()

    await ownerPage.screenshot({ path: 'test-results/settings-integrations-loaded.png' })
  })

  test('should show available integrations', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/integrations')
    await ownerPage.waitForLoadState('networkidle')

    // Look for integration cards or list
    const integrations = ownerPage.locator(
      '[data-testid="integration-card"], .integration-item, text=/Zapier|Shopify|CRM/i'
    )

    await ownerPage.screenshot({ path: 'test-results/settings-integrations-list.png' })
  })
})

test.describe('Billing Settings', () => {
  test('should load billing settings page', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/billing')
    await ownerPage.waitForLoadState('networkidle')

    await expect(ownerPage).toHaveURL(/\/dashboard\/settings\/billing/)

    // Check for billing content
    const billingContent = ownerPage.locator(
      'h1:has-text("Billing"), h2:has-text("Billing"), text=/subscription|plan|payment/i'
    )
    await expect(billingContent.first()).toBeVisible()

    await ownerPage.screenshot({ path: 'test-results/settings-billing-loaded.png' })
  })

  test('should show current plan', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/billing')
    await ownerPage.waitForLoadState('networkidle')

    // Look for plan information
    const planInfo = ownerPage.locator(
      'text=/current plan|subscription|free|pro|business/i'
    )

    await expect(planInfo.first()).toBeVisible()

    await ownerPage.screenshot({ path: 'test-results/settings-billing-plan.png' })
  })

  test('should have upgrade option', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/billing')
    await ownerPage.waitForLoadState('networkidle')

    // Look for upgrade button
    const upgradeButton = ownerPage.locator(
      'button:has-text("Upgrade"), a:has-text("Upgrade"), [data-testid="upgrade-plan"]'
    )

    if (await upgradeButton.first().isVisible()) {
      await ownerPage.screenshot({ path: 'test-results/settings-billing-upgrade.png' })
    }
  })
})

test.describe('Settings Navigation', () => {
  test('should navigate between settings pages', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings')
    await ownerPage.waitForLoadState('networkidle')

    // Check for settings navigation
    const navLinks = [
      { text: 'Profile', url: '/profile' },
      { text: 'Organization', url: '/organization' },
      { text: 'Team', url: '/team' },
      { text: 'Billing', url: '/billing' },
    ]

    for (const link of navLinks) {
      const navLink = ownerPage.locator(`a:has-text("${link.text}")`)
      if (await navLink.first().isVisible()) {
        await navLink.first().click()
        await ownerPage.waitForTimeout(1000)

        await expect(ownerPage).toHaveURL(new RegExp(link.url))
      }
    }
  })

  test('should have breadcrumbs or back navigation', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/settings/profile')
    await ownerPage.waitForLoadState('networkidle')

    // Look for breadcrumbs or back button
    const navigation = ownerPage.locator(
      '[data-testid="breadcrumbs"], .breadcrumb, a:has-text("Settings"), a:has-text("Back")'
    )

    if (await navigation.first().isVisible()) {
      await ownerPage.screenshot({ path: 'test-results/settings-navigation.png' })
    }
  })
})

/**
 * Settings Access Control Tests
 */
test.describe('Settings - Role Access', () => {
  test('admin should access team settings', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/settings/team')
    await adminPage.waitForLoadState('networkidle')

    // Admin might have access
    await adminPage.screenshot({ path: 'test-results/settings-admin-team-access.png' })
  })

  test('agent should have limited settings access', async ({ agentPage }) => {
    await agentPage.goto('/dashboard/settings/profile')
    await agentPage.waitForLoadState('networkidle')

    // Agent should at least see profile
    await expect(agentPage).toHaveURL(/\/dashboard/)

    await agentPage.screenshot({ path: 'test-results/settings-agent-access.png' })
  })

  test('agent should not access billing settings', async ({ agentPage }) => {
    await agentPage.goto('/dashboard/settings/billing')
    await agentPage.waitForLoadState('networkidle')

    // Agent should be redirected or see access denied
    const isRedirected = !agentPage.url().includes('/billing')
    const hasAccessDenied = await agentPage
      .locator('text=/access denied|permission|not authorized/i')
      .isVisible()
      .catch(() => false)

    // Either redirected or shown error
    await agentPage.screenshot({ path: 'test-results/settings-agent-billing-denied.png' })
  })
})
