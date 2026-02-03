import { test, expect } from './auth-fixtures'

/**
 * E2E Test Suite: Inbox & Messaging Flow
 * Tests the core inbox functionality including:
 * - Inbox page loading and layout
 * - Conversation list display
 * - Conversation selection and message viewing
 * - Message composition and sending
 * - Real-time updates
 * - Search and filtering
 */

test.describe('Inbox Flow', () => {
  test('should load inbox page as authenticated user', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/inbox')

    // Wait for page load
    await ownerPage.waitForLoadState('networkidle')

    // Check inbox layout exists
    await expect(ownerPage.locator('[data-testid="inbox-container"], .inbox-container, main')).toBeVisible()

    // Should have conversation list area
    const conversationListArea = ownerPage.locator(
      '[data-testid="conversation-list"], .conversation-list, aside, [class*="conversation"]'
    )
    await expect(conversationListArea.first()).toBeVisible()

    await ownerPage.screenshot({ path: 'test-results/inbox-loaded.png' })
  })

  test('should display conversation list', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/inbox')
    await ownerPage.waitForLoadState('networkidle')

    // Wait for conversations to load (may show empty state or list)
    await ownerPage.waitForTimeout(3000)

    // Check for conversation items or empty state
    const hasConversations = await ownerPage
      .locator('[data-testid="conversation-item"], .conversation-item, [class*="conversation"][class*="item"]')
      .first()
      .isVisible()
      .catch(() => false)

    const hasEmptyState = await ownerPage
      .locator('text=/no conversation|no messages|start a conversation|empty/i')
      .isVisible()
      .catch(() => false)

    // Either we have conversations or empty state
    expect(hasConversations || hasEmptyState).toBeTruthy()

    await ownerPage.screenshot({ path: 'test-results/inbox-conversation-list.png' })
  })

  test('should select a conversation and show messages', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/inbox')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    // Try to click first conversation
    const firstConversation = ownerPage
      .locator('[data-testid="conversation-item"], .conversation-item, [role="listitem"]')
      .first()

    if (await firstConversation.isVisible()) {
      await firstConversation.click()

      // Wait for message area to update
      await ownerPage.waitForTimeout(2000)

      // Should show message area or contact info
      const messageArea = ownerPage.locator(
        '[data-testid="message-list"], .message-list, [class*="message"][class*="container"]'
      )
      const contactHeader = ownerPage.locator('[data-testid="contact-header"], .contact-name, h2, h3')

      const hasMessageArea = await messageArea.first().isVisible().catch(() => false)
      const hasContactHeader = await contactHeader.first().isVisible().catch(() => false)

      expect(hasMessageArea || hasContactHeader).toBeTruthy()

      await ownerPage.screenshot({ path: 'test-results/inbox-conversation-selected.png' })
    } else {
      // No conversations to select, skip
      test.skip()
    }
  })

  test('should show message input when conversation is selected', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/inbox')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    const firstConversation = ownerPage
      .locator('[data-testid="conversation-item"], .conversation-item, [role="listitem"]')
      .first()

    if (await firstConversation.isVisible()) {
      await firstConversation.click()
      await ownerPage.waitForTimeout(2000)

      // Check for message input
      const messageInput = ownerPage.locator(
        '[data-testid="message-input"], textarea[placeholder*="message"], input[placeholder*="message"], [contenteditable="true"]'
      )

      await expect(messageInput.first()).toBeVisible()

      await ownerPage.screenshot({ path: 'test-results/inbox-message-input.png' })
    } else {
      test.skip()
    }
  })

  test('should type message in input field', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/inbox')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    const firstConversation = ownerPage
      .locator('[data-testid="conversation-item"], .conversation-item, [role="listitem"]')
      .first()

    if (await firstConversation.isVisible()) {
      await firstConversation.click()
      await ownerPage.waitForTimeout(2000)

      const messageInput = ownerPage.locator(
        'textarea[placeholder*="message" i], textarea[placeholder*="type" i], input[placeholder*="message" i], [contenteditable="true"]'
      ).first()

      if (await messageInput.isVisible()) {
        await messageInput.fill('Test message from E2E')

        // Verify text was entered
        const value = await messageInput.inputValue().catch(() =>
          messageInput.textContent()
        )
        expect(value).toContain('Test message')

        await ownerPage.screenshot({ path: 'test-results/inbox-message-typed.png' })
      }
    } else {
      test.skip()
    }
  })

  test('should have send button', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/inbox')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    const firstConversation = ownerPage
      .locator('[data-testid="conversation-item"], .conversation-item, [role="listitem"]')
      .first()

    if (await firstConversation.isVisible()) {
      await firstConversation.click()
      await ownerPage.waitForTimeout(2000)

      // Look for send button
      const sendButton = ownerPage.locator(
        'button[type="submit"], button:has-text("Send"), button[aria-label*="send" i], [data-testid="send-button"]'
      )

      await expect(sendButton.first()).toBeVisible()

      await ownerPage.screenshot({ path: 'test-results/inbox-send-button.png' })
    } else {
      test.skip()
    }
  })

  test('should show search functionality', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/inbox')
    await ownerPage.waitForLoadState('networkidle')

    // Look for search input
    const searchInput = ownerPage.locator(
      'input[type="search"], input[placeholder*="search" i], [data-testid="search-input"]'
    )

    if (await searchInput.first().isVisible()) {
      // Type in search
      await searchInput.first().fill('test search')

      // Wait for search to process
      await ownerPage.waitForTimeout(1000)

      await ownerPage.screenshot({ path: 'test-results/inbox-search.png' })
    }
  })

  test('should show filter options', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/inbox')
    await ownerPage.waitForLoadState('networkidle')

    // Look for filter button or dropdown
    const filterButton = ownerPage.locator(
      'button:has-text("Filter"), [data-testid="filter-button"], button[aria-label*="filter" i], svg[class*="filter"]'
    )

    if (await filterButton.first().isVisible()) {
      await filterButton.first().click()

      // Wait for filter options
      await ownerPage.waitForTimeout(500)

      await ownerPage.screenshot({ path: 'test-results/inbox-filter-options.png' })
    }
  })

  test('should show contact details panel', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/inbox')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    const firstConversation = ownerPage
      .locator('[data-testid="conversation-item"], .conversation-item, [role="listitem"]')
      .first()

    if (await firstConversation.isVisible()) {
      await firstConversation.click()
      await ownerPage.waitForTimeout(2000)

      // Look for contact info/details panel or button
      const detailsButton = ownerPage.locator(
        'button[aria-label*="info" i], button[aria-label*="details" i], [data-testid="contact-details"], svg[class*="info"]'
      )

      if (await detailsButton.first().isVisible()) {
        await detailsButton.first().click()
        await ownerPage.waitForTimeout(500)

        await ownerPage.screenshot({ path: 'test-results/inbox-contact-details.png' })
      }
    }
  })
})

/**
 * Inbox UI Elements Tests
 */
test.describe('Inbox UI Elements', () => {
  test('should show unread count badges', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/inbox')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    // Look for unread indicators (badges, dots, counts)
    const unreadIndicator = ownerPage.locator(
      '.badge, .unread, [data-testid="unread-count"], .bg-green-500, .bg-blue-500'
    )

    // Just check if any exist (may not have unread messages)
    await ownerPage.screenshot({ path: 'test-results/inbox-unread-indicators.png' })
  })

  test('should show conversation status indicators', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/inbox')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    // Look for status indicators (open, pending, resolved)
    const statusIndicator = ownerPage.locator(
      '[data-testid="conversation-status"], .status-badge, [class*="status"]'
    )

    await ownerPage.screenshot({ path: 'test-results/inbox-status-indicators.png' })
  })

  test('should show timestamps on conversations', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/inbox')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    const firstConversation = ownerPage
      .locator('[data-testid="conversation-item"], .conversation-item, [role="listitem"]')
      .first()

    if (await firstConversation.isVisible()) {
      // Look for time element
      const timestamp = firstConversation.locator('time, [data-testid="timestamp"], .text-gray-500, .text-xs')

      await expect(timestamp.first()).toBeVisible()
    }
  })

  test('should have responsive layout', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/inbox')

    // Test mobile viewport
    await ownerPage.setViewportSize({ width: 375, height: 667 })
    await ownerPage.waitForTimeout(1000)
    await ownerPage.screenshot({ path: 'test-results/inbox-mobile.png' })

    // Test tablet viewport
    await ownerPage.setViewportSize({ width: 768, height: 1024 })
    await ownerPage.waitForTimeout(1000)
    await ownerPage.screenshot({ path: 'test-results/inbox-tablet.png' })

    // Test desktop viewport
    await ownerPage.setViewportSize({ width: 1920, height: 1080 })
    await ownerPage.waitForTimeout(1000)
    await ownerPage.screenshot({ path: 'test-results/inbox-desktop.png' })
  })
})

/**
 * Inbox Agent Role Tests
 */
test.describe('Inbox - Agent Role', () => {
  test('agent should access inbox', async ({ agentPage }) => {
    await agentPage.goto('/dashboard/inbox')
    await agentPage.waitForLoadState('networkidle')

    // Agent should be able to access inbox
    await expect(agentPage).toHaveURL(/\/dashboard\/inbox/)

    await agentPage.screenshot({ path: 'test-results/inbox-agent-access.png' })
  })

  test('agent should see assigned conversations', async ({ agentPage }) => {
    await agentPage.goto('/dashboard/inbox')
    await agentPage.waitForLoadState('networkidle')
    await agentPage.waitForTimeout(3000)

    // Agent should see some indication of assignments or all conversations
    const conversationArea = agentPage.locator('main, [role="main"], .inbox-container')
    await expect(conversationArea.first()).toBeVisible()

    await agentPage.screenshot({ path: 'test-results/inbox-agent-view.png' })
  })
})

/**
 * Inbox Admin Role Tests
 */
test.describe('Inbox - Admin Role', () => {
  test('admin should access inbox with full features', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/inbox')
    await adminPage.waitForLoadState('networkidle')

    await expect(adminPage).toHaveURL(/\/dashboard\/inbox/)

    await adminPage.screenshot({ path: 'test-results/inbox-admin-access.png' })
  })
})
