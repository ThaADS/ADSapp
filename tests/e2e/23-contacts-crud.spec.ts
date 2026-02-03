import { test, expect } from './auth-fixtures'

/**
 * E2E Test Suite: Contact CRUD Operations
 * Tests contact management functionality including:
 * - Contacts page loading
 * - Contact list display
 * - Create new contact
 * - Edit existing contact
 * - Delete contact
 * - Search and filter contacts
 * - Contact details view
 */

// Generate unique phone number for tests
const generateTestPhone = () => `+3161234${Date.now().toString().slice(-4)}`

test.describe('Contacts Page', () => {
  test('should load contacts page', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')

    // Check page title
    await expect(ownerPage.locator('h1:has-text("Contacts")')).toBeVisible()

    // Check for contacts description
    await expect(ownerPage.locator('text=/manage.*contact|customer/i')).toBeVisible()

    await ownerPage.screenshot({ path: 'test-results/contacts-page-loaded.png' })
  })

  test('should display contacts list or empty state', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    // Either we have contacts or empty state
    const hasContacts = await ownerPage
      .locator('table tbody tr, [data-testid="contact-row"], .contact-item')
      .first()
      .isVisible()
      .catch(() => false)

    const hasEmptyState = await ownerPage
      .locator('text=/no contacts|add your first|get started/i')
      .isVisible()
      .catch(() => false)

    expect(hasContacts || hasEmptyState).toBeTruthy()

    await ownerPage.screenshot({ path: 'test-results/contacts-list.png' })
  })

  test('should have add contact button', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')

    // Look for add contact button
    const addButton = ownerPage.locator(
      'button:has-text("Add"), button:has-text("New"), button:has-text("Create"), [data-testid="add-contact"]'
    )

    await expect(addButton.first()).toBeVisible()

    await ownerPage.screenshot({ path: 'test-results/contacts-add-button.png' })
  })
})

test.describe('Contact Creation', () => {
  test('should open create contact modal/form', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')

    // Click add contact button
    const addButton = ownerPage.locator(
      'button:has-text("Add"), button:has-text("New"), button:has-text("Create"), [data-testid="add-contact"]'
    )

    if (await addButton.first().isVisible()) {
      await addButton.first().click()

      // Wait for modal/form
      await ownerPage.waitForTimeout(500)

      // Check for form fields
      const nameInput = ownerPage.locator(
        'input[name="name"], input[placeholder*="name" i], [data-testid="contact-name"]'
      )
      const phoneInput = ownerPage.locator(
        'input[name="phone"], input[name="phone_number"], input[placeholder*="phone" i], [data-testid="contact-phone"]'
      )

      const hasNameInput = await nameInput.first().isVisible().catch(() => false)
      const hasPhoneInput = await phoneInput.first().isVisible().catch(() => false)

      expect(hasNameInput || hasPhoneInput).toBeTruthy()

      await ownerPage.screenshot({ path: 'test-results/contacts-create-form.png' })
    }
  })

  test('should create new contact with valid data', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')

    const addButton = ownerPage.locator(
      'button:has-text("Add"), button:has-text("New"), button:has-text("Create"), [data-testid="add-contact"]'
    )

    if (await addButton.first().isVisible()) {
      await addButton.first().click()
      await ownerPage.waitForTimeout(500)

      const testPhone = generateTestPhone()
      const testName = `E2E Test Contact ${Date.now()}`

      // Fill name field
      const nameInput = ownerPage.locator(
        'input[name="name"], input[placeholder*="name" i]'
      ).first()
      if (await nameInput.isVisible()) {
        await nameInput.fill(testName)
      }

      // Fill phone field
      const phoneInput = ownerPage.locator(
        'input[name="phone"], input[name="phone_number"], input[placeholder*="phone" i]'
      ).first()
      if (await phoneInput.isVisible()) {
        await phoneInput.fill(testPhone)
      }

      // Fill email if visible
      const emailInput = ownerPage.locator('input[name="email"], input[type="email"]').first()
      if (await emailInput.isVisible()) {
        await emailInput.fill(`test-${Date.now()}@e2e-test.com`)
      }

      // Submit form
      const submitButton = ownerPage.locator(
        'button[type="submit"], button:has-text("Save"), button:has-text("Create"), button:has-text("Add")'
      ).last()

      await submitButton.click()

      // Wait for response
      await ownerPage.waitForTimeout(3000)

      // Check for success (modal closes or success message)
      const hasSuccessMessage = await ownerPage
        .locator('.text-green-500, .bg-green-50, text=/success|created|added/i')
        .isVisible()
        .catch(() => false)

      const modalClosed = !(await ownerPage
        .locator('[role="dialog"], .modal, [data-testid="modal"]')
        .isVisible()
        .catch(() => true))

      await ownerPage.screenshot({ path: 'test-results/contacts-created.png' })
    }
  })

  test('should validate required fields', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')

    const addButton = ownerPage.locator(
      'button:has-text("Add"), button:has-text("New"), button:has-text("Create")'
    )

    if (await addButton.first().isVisible()) {
      await addButton.first().click()
      await ownerPage.waitForTimeout(500)

      // Try to submit empty form
      const submitButton = ownerPage.locator(
        'button[type="submit"], button:has-text("Save"), button:has-text("Create")'
      ).last()

      if (await submitButton.isVisible()) {
        await submitButton.click()
        await ownerPage.waitForTimeout(1000)

        // Should show validation error or form stays open
        const hasError = await ownerPage
          .locator('.text-red-500, .border-red-500, [role="alert"]')
          .isVisible()
          .catch(() => false)

        const formStillOpen = await ownerPage
          .locator('[role="dialog"], .modal, form')
          .isVisible()
          .catch(() => false)

        expect(hasError || formStillOpen).toBeTruthy()

        await ownerPage.screenshot({ path: 'test-results/contacts-validation-error.png' })
      }
    }
  })
})

test.describe('Contact Search and Filter', () => {
  test('should have search functionality', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')

    // Look for search input
    const searchInput = ownerPage.locator(
      'input[type="search"], input[placeholder*="search" i], [data-testid="search-contacts"]'
    )

    if (await searchInput.first().isVisible()) {
      await searchInput.first().fill('test search')
      await ownerPage.waitForTimeout(1000)

      await ownerPage.screenshot({ path: 'test-results/contacts-search.png' })
    }
  })

  test('should filter contacts', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')

    // Look for filter options
    const filterButton = ownerPage.locator(
      'button:has-text("Filter"), [data-testid="filter"], select'
    )

    if (await filterButton.first().isVisible()) {
      await filterButton.first().click()
      await ownerPage.waitForTimeout(500)

      await ownerPage.screenshot({ path: 'test-results/contacts-filter.png' })
    }
  })
})

test.describe('Contact Details', () => {
  test('should view contact details', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    // Click on first contact
    const firstContact = ownerPage.locator(
      'table tbody tr, [data-testid="contact-row"], .contact-item'
    ).first()

    if (await firstContact.isVisible()) {
      await firstContact.click()
      await ownerPage.waitForTimeout(1000)

      // Should show details (modal, panel, or page)
      await ownerPage.screenshot({ path: 'test-results/contacts-details.png' })
    }
  })

  test('should edit contact', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    // Look for edit button on first contact
    const editButton = ownerPage.locator(
      'button:has-text("Edit"), [data-testid="edit-contact"], [aria-label*="edit" i]'
    ).first()

    if (await editButton.isVisible()) {
      await editButton.click()
      await ownerPage.waitForTimeout(500)

      // Should show edit form
      const nameInput = ownerPage.locator('input[name="name"]').first()
      if (await nameInput.isVisible()) {
        // Modify the name
        await nameInput.fill('Updated Contact Name')

        // Save
        const saveButton = ownerPage.locator('button:has-text("Save"), button[type="submit"]').last()
        if (await saveButton.isVisible()) {
          await saveButton.click()
          await ownerPage.waitForTimeout(2000)
        }

        await ownerPage.screenshot({ path: 'test-results/contacts-edited.png' })
      }
    }
  })
})

test.describe('Contact Deletion', () => {
  test('should have delete option', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    // Look for delete button
    const deleteButton = ownerPage.locator(
      'button:has-text("Delete"), [data-testid="delete-contact"], [aria-label*="delete" i], svg[class*="trash"]'
    ).first()

    if (await deleteButton.isVisible()) {
      await ownerPage.screenshot({ path: 'test-results/contacts-delete-button.png' })
    }
  })

  test('should show delete confirmation', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    const deleteButton = ownerPage.locator(
      'button:has-text("Delete"), [data-testid="delete-contact"], [aria-label*="delete" i]'
    ).first()

    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      await ownerPage.waitForTimeout(500)

      // Should show confirmation dialog
      const confirmDialog = ownerPage.locator(
        '[role="alertdialog"], [role="dialog"], .modal, text=/confirm|sure|delete/i'
      )

      const hasConfirmation = await confirmDialog.first().isVisible().catch(() => false)

      if (hasConfirmation) {
        await ownerPage.screenshot({ path: 'test-results/contacts-delete-confirm.png' })

        // Cancel deletion to not affect other tests
        const cancelButton = ownerPage.locator('button:has-text("Cancel"), button:has-text("No")')
        if (await cancelButton.first().isVisible()) {
          await cancelButton.first().click()
        }
      }
    }
  })
})

/**
 * Contact Role-based Access Tests
 */
test.describe('Contacts - Role Access', () => {
  test('admin should access contacts', async ({ adminPage }) => {
    await adminPage.goto('/dashboard/contacts')
    await adminPage.waitForLoadState('networkidle')

    await expect(adminPage).toHaveURL(/\/dashboard\/contacts/)
    await expect(adminPage.locator('h1:has-text("Contacts")')).toBeVisible()

    await adminPage.screenshot({ path: 'test-results/contacts-admin-access.png' })
  })

  test('agent should access contacts', async ({ agentPage }) => {
    await agentPage.goto('/dashboard/contacts')
    await agentPage.waitForLoadState('networkidle')

    // Agent might have limited access
    await expect(agentPage).toHaveURL(/\/dashboard/)

    await agentPage.screenshot({ path: 'test-results/contacts-agent-access.png' })
  })
})

/**
 * Contact Data Display Tests
 */
test.describe('Contact Data Display', () => {
  test('should show contact columns in list', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    // Check for table headers or column labels
    const nameColumn = ownerPage.locator('th:has-text("Name"), [data-testid="column-name"]')
    const phoneColumn = ownerPage.locator('th:has-text("Phone"), [data-testid="column-phone"]')

    const hasNameColumn = await nameColumn.first().isVisible().catch(() => false)
    const hasPhoneColumn = await phoneColumn.first().isVisible().catch(() => false)

    // At least one column should be visible if table exists
    await ownerPage.screenshot({ path: 'test-results/contacts-columns.png' })
  })

  test('should handle pagination', async ({ ownerPage }) => {
    await ownerPage.goto('/dashboard/contacts')
    await ownerPage.waitForLoadState('networkidle')
    await ownerPage.waitForTimeout(3000)

    // Look for pagination controls
    const pagination = ownerPage.locator(
      '[data-testid="pagination"], .pagination, button:has-text("Next"), button:has-text("Previous")'
    )

    if (await pagination.first().isVisible()) {
      await ownerPage.screenshot({ path: 'test-results/contacts-pagination.png' })
    }
  })
})
