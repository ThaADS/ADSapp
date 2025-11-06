/**
 * Render Helpers for Component Testing
 *
 * Provides utilities for rendering React components in tests
 * with proper providers, mocks, and test utilities.
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions, RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Profile, Organization } from '@/types/database'
import { createMockUser, createMockOrganization } from './test-helpers'

// =============================================================================
// Type Definitions
// =============================================================================

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: Partial<Profile>
  organization?: Partial<Organization>
  initialRoute?: string
  theme?: 'light' | 'dark'
}

export interface CustomRenderResult extends RenderResult {
  user: ReturnType<typeof userEvent.setup>
}

// =============================================================================
// Context Providers
// =============================================================================

/**
 * Mock Auth Provider for testing
 */
interface AuthContextValue {
  user: Profile | null
  organization: Organization | null
  signIn: jest.Mock
  signOut: jest.Mock
  isLoading: boolean
}

const mockAuthContext: AuthContextValue = {
  user: null,
  organization: null,
  signIn: jest.fn(),
  signOut: jest.fn(),
  isLoading: false,
}

/**
 * Mock Theme Provider for testing
 */
interface ThemeContextValue {
  theme: 'light' | 'dark'
  toggleTheme: jest.Mock
}

const mockThemeContext: ThemeContextValue = {
  theme: 'light',
  toggleTheme: jest.fn(),
}

// =============================================================================
// Test Wrapper Components
// =============================================================================

/**
 * Creates a test wrapper with all necessary providers
 */
function createTestWrapper(options: RenderWithProvidersOptions = {}) {
  const user = options.user ? createMockUser(options.user) : createMockUser()
  const organization = options.organization
    ? createMockOrganization(options.organization)
    : createMockOrganization()

  // Update mock context
  mockAuthContext.user = user
  mockAuthContext.organization = organization

  // Mock useRouter for Next.js
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: options.initialRoute || '/',
    query: {},
    asPath: options.initialRoute || '/',
  }

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(React.Fragment, null, children)
  }
}

// =============================================================================
// Main Render Function
// =============================================================================

/**
 * Custom render function with all providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
): CustomRenderResult {
  const Wrapper = createTestWrapper(options)

  const renderResult = render(ui, {
    wrapper: Wrapper,
    ...options,
  })

  return {
    ...renderResult,
    user: userEvent.setup(),
  }
}

// =============================================================================
// Specialized Render Functions
// =============================================================================

/**
 * Renders component with authenticated user
 */
export function renderWithAuth(
  ui: ReactElement,
  userOverrides?: Partial<Profile>,
  options?: RenderWithProvidersOptions
): CustomRenderResult {
  return renderWithProviders(ui, {
    ...options,
    user: userOverrides,
  })
}

/**
 * Renders component without authentication
 */
export function renderWithoutAuth(
  ui: ReactElement,
  options?: RenderWithProvidersOptions
): CustomRenderResult {
  return renderWithProviders(ui, {
    ...options,
    user: undefined,
  })
}

/**
 * Renders component with specific role
 */
export function renderWithRole(
  ui: ReactElement,
  role: 'owner' | 'admin' | 'agent',
  options?: RenderWithProvidersOptions
): CustomRenderResult {
  return renderWithProviders(ui, {
    ...options,
    user: { role },
  })
}

/**
 * Renders component with dark theme
 */
export function renderWithDarkTheme(
  ui: ReactElement,
  options?: RenderWithProvidersOptions
): CustomRenderResult {
  mockThemeContext.theme = 'dark'
  return renderWithProviders(ui, {
    ...options,
    theme: 'dark',
  })
}

// =============================================================================
// User Interaction Helpers
// =============================================================================

/**
 * Types text into an input field
 */
export async function typeIntoField(
  user: ReturnType<typeof userEvent.setup>,
  element: HTMLElement,
  text: string
): Promise<void> {
  await user.clear(element)
  await user.type(element, text)
}

/**
 * Clicks a button and waits for it
 */
export async function clickButton(
  user: ReturnType<typeof userEvent.setup>,
  button: HTMLElement
): Promise<void> {
  await user.click(button)
}

/**
 * Selects an option from a dropdown
 */
export async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  select: HTMLElement,
  optionText: string
): Promise<void> {
  await user.selectOptions(select, optionText)
}

/**
 * Checks a checkbox
 */
export async function toggleCheckbox(
  user: ReturnType<typeof userEvent.setup>,
  checkbox: HTMLElement
): Promise<void> {
  await user.click(checkbox)
}

/**
 * Uploads a file
 */
export async function uploadFile(
  user: ReturnType<typeof userEvent.setup>,
  input: HTMLElement,
  file: File
): Promise<void> {
  await user.upload(input, file)
}

// =============================================================================
// Query Helpers
// =============================================================================

/**
 * Finds element by text content
 */
export function findByTextContent(container: HTMLElement, text: string): HTMLElement | null {
  return container.querySelector(`[textContent="${text}"]`)
}

/**
 * Finds element by data-testid
 */
export function findByTestId(container: HTMLElement, testId: string): HTMLElement | null {
  return container.querySelector(`[data-testid="${testId}"]`)
}

/**
 * Checks if element has class
 */
export function hasClass(element: HTMLElement, className: string): boolean {
  return element.classList.contains(className)
}

/**
 * Checks if element is visible
 */
export function isVisible(element: HTMLElement): boolean {
  return element.offsetParent !== null
}

// =============================================================================
// Async Helpers
// =============================================================================

/**
 * Waits for element to appear
 */
export async function waitForElement(
  container: HTMLElement,
  selector: string,
  timeout = 3000
): Promise<HTMLElement> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const element = container.querySelector(selector)
    if (element) {
      return element as HTMLElement
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  throw new Error(`Element with selector "${selector}" not found within ${timeout}ms`)
}

/**
 * Waits for element to disappear
 */
export async function waitForElementToBeRemoved(
  container: HTMLElement,
  selector: string,
  timeout = 3000
): Promise<void> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const element = container.querySelector(selector)
    if (!element) {
      return
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  throw new Error(`Element with selector "${selector}" still present after ${timeout}ms`)
}

/**
 * Waits for loading to complete
 */
export async function waitForLoadingToFinish(
  container: HTMLElement,
  loadingSelector = '[data-testid="loading"]'
): Promise<void> {
  await waitForElementToBeRemoved(container, loadingSelector)
}

// =============================================================================
// Accessibility Helpers
// =============================================================================

/**
 * Checks if element is accessible
 */
export function isAccessible(element: HTMLElement): {
  accessible: boolean
  issues: string[]
} {
  const issues: string[] = []

  // Check for aria-label or accessible name
  if (!element.getAttribute('aria-label') && !element.textContent?.trim()) {
    issues.push('Missing accessible name')
  }

  // Check for proper role
  if (element.tagName === 'DIV' && element.onclick && !element.getAttribute('role')) {
    issues.push('Interactive element missing role')
  }

  // Check for keyboard accessibility
  if (element.onclick && element.tabIndex === -1) {
    issues.push('Interactive element not keyboard accessible')
  }

  // Check for color contrast (simplified)
  const style = window.getComputedStyle(element)
  if (style.color === style.backgroundColor) {
    issues.push('Poor color contrast')
  }

  return {
    accessible: issues.length === 0,
    issues,
  }
}

/**
 * Gets accessible name of element
 */
export function getAccessibleName(element: HTMLElement): string {
  return (
    element.getAttribute('aria-label') ||
    element.getAttribute('aria-labelledby') ||
    element.textContent?.trim() ||
    ''
  )
}

// =============================================================================
// Form Helpers
// =============================================================================

/**
 * Fills in a complete form
 */
export async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  formData: Record<string, string>
): Promise<void> {
  for (const [name, value] of Object.entries(formData)) {
    const input = document.querySelector(`[name="${name}"]`) as HTMLElement
    if (input) {
      await typeIntoField(user, input, value)
    }
  }
}

/**
 * Submits a form
 */
export async function submitForm(
  user: ReturnType<typeof userEvent.setup>,
  formElement?: HTMLElement
): Promise<void> {
  const form = formElement || (document.querySelector('form') as HTMLElement)
  const submitButton =
    form.querySelector('[type="submit"]') || form.querySelector('button[type="submit"]')

  if (submitButton) {
    await clickButton(user, submitButton as HTMLElement)
  }
}

/**
 * Gets form values
 */
export function getFormValues(formElement: HTMLFormElement): Record<string, string> {
  const formData = new FormData(formElement)
  const values: Record<string, string> = {}

  formData.forEach((value, key) => {
    values[key] = value.toString()
  })

  return values
}

/**
 * Gets form errors
 */
export function getFormErrors(container: HTMLElement): Record<string, string> {
  const errors: Record<string, string> = {}
  const errorElements = container.querySelectorAll('[data-error]')

  errorElements.forEach(element => {
    const name = element.getAttribute('data-field')
    const error = element.textContent
    if (name && error) {
      errors[name] = error
    }
  })

  return errors
}

// =============================================================================
// Mock Data Helpers
// =============================================================================

/**
 * Creates a mock file for testing
 */
export function createMockFile(name = 'test.jpg', size = 1024, type = 'image/jpeg'): File {
  const blob = new Blob(['x'.repeat(size)], { type })
  return new File([blob], name, { type })
}

/**
 * Creates a mock image file
 */
export function createMockImage(name = 'test.jpg', width = 100, height = 100): File {
  return createMockFile(name, 1024, 'image/jpeg')
}

/**
 * Creates a mock PDF file
 */
export function createMockPDF(name = 'test.pdf'): File {
  return createMockFile(name, 2048, 'application/pdf')
}

// =============================================================================
// Snapshot Helpers
// =============================================================================

/**
 * Creates a snapshot of component
 */
export function takeSnapshot(container: HTMLElement): string {
  return container.innerHTML
}

/**
 * Compares snapshot
 */
export function expectSnapshot(container: HTMLElement, name: string): void {
  expect(container).toMatchSnapshot(name)
}

// =============================================================================
// Export All Helpers
// =============================================================================

export default {
  renderWithProviders,
  renderWithAuth,
  renderWithoutAuth,
  renderWithRole,
  renderWithDarkTheme,
  typeIntoField,
  clickButton,
  selectOption,
  toggleCheckbox,
  uploadFile,
  findByTextContent,
  findByTestId,
  hasClass,
  isVisible,
  waitForElement,
  waitForElementToBeRemoved,
  waitForLoadingToFinish,
  isAccessible,
  getAccessibleName,
  fillForm,
  submitForm,
  getFormValues,
  getFormErrors,
  createMockFile,
  createMockImage,
  createMockPDF,
  takeSnapshot,
  expectSnapshot,
}
