# Testing Guide - ADSapp

Complete gids voor het schrijven en uitvoeren van tests in ADSapp.

## Inhoudsopgave

- [Test Strategy](#test-strategy)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [E2E Testing](#e2e-testing)
- [Testing Best Practices](#testing-best-practices)
- [CI/CD Integration](#cicd-integration)

---

## Test Strategy

ADSapp gebruikt een 3-laags test strategie:

### 1. Unit Tests (70%)
-Jest voor business logic
- Fast en geïsoleerd
- Mock external dependencies
- Coverage goal: 80%+

### 2. Integration Tests (20%)
- API endpoint testing
- Database integration
- Service integration
- Real Supabase (test database)

### 3. E2E Tests (10%)
- Playwright voor user flows
- Critical paths only
- Login, campaign creation, analytics
- Run on staging environment

---

## Unit Testing

### Setup

```bash
# Install dependencies (already in package.json)
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

**Jest Configuration** (`jest.config.js`):

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/**/_*.{js,jsx,ts,tsx}',
  ],
  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

### Testing Business Logic

**Example: DripCampaignEngine**

```typescript
// tests/unit/lib/drip-campaigns.test.ts
import { DripCampaignEngine } from '@/lib/whatsapp/drip-campaigns'
import { createMockSupabaseClient } from '../helpers/supabase-mock'

describe('DripCampaignEngine', () => {
  let engine: DripCampaignEngine
  let mockSupabase: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    engine = new DripCampaignEngine(mockSupabase)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createCampaign', () => {
    it('should create a campaign with valid data', async () => {
      // Arrange
      const campaignData = {
        name: 'Test Campaign',
        triggerType: 'manual' as const,
        settings: { timezone: 'Europe/Amsterdam' }
      }

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{
              id: 'campaign-123',
              ...campaignData,
              status: 'draft'
            }],
            error: null
          })
        })
      })

      // Act
      const result = await engine.createCampaign('org-123', campaignData)

      // Assert
      expect(result).toHaveProperty('id', 'campaign-123')
      expect(result.name).toBe('Test Campaign')
      expect(result.status).toBe('draft')
      expect(mockSupabase.from).toHaveBeenCalledWith('drip_campaigns')
    })

    it('should throw error with invalid data', async () => {
      // Arrange
      const invalidData = {
        name: '', // Invalid: empty name
        triggerType: 'manual' as const
      }

      // Act & Assert
      await expect(
        engine.createCampaign('org-123', invalidData)
      ).rejects.toThrow('Campaign name is required')
    })
  })

  describe('calculateDelay', () => {
    it('should calculate minutes correctly', () => {
      const delay = engine.calculateDelay('minutes', 30)
      expect(delay).toBe(30 * 60 * 1000) // 30 minutes in ms
    })

    it('should calculate hours correctly', () => {
      const delay = engine.calculateDelay('hours', 2)
      expect(delay).toBe(2 * 60 * 60 * 1000) // 2 hours in ms
    })

    it('should calculate days correctly', () => {
      const delay = engine.calculateDelay('days', 1)
      expect(delay).toBe(24 * 60 * 60 * 1000) // 1 day in ms
    })

    it('should return 0 for immediate', () => {
      const delay = engine.calculateDelay('immediate', 0)
      expect(delay).toBe(0)
    })
  })

  describe('enrollContact', () => {
    it('should enroll contact successfully', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: [{
              id: 'enrollment-123',
              campaign_id: 'campaign-123',
              contact_id: 'contact-123',
              status: 'active'
            }],
            error: null
          })
        })
      })

      // Act
      const result = await engine.enrollContact('campaign-123', 'contact-123')

      // Assert
      expect(result).toHaveProperty('id', 'enrollment-123')
      expect(result.status).toBe('active')
    })

    it('should prevent duplicate enrollment', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { code: '23505' } // Unique constraint violation
          })
        })
      })

      // Act & Assert
      await expect(
        engine.enrollContact('campaign-123', 'contact-123')
      ).rejects.toThrow('Contact already enrolled')
    })
  })
})
```

### Testing React Components

**Example: Button Component**

```typescript
// tests/unit/components/ui/button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('should render with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    fireEvent.click(screen.getByText('Click me'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should apply variant styles', () => {
    const { container } = render(
      <Button variant="outline">Outline Button</Button>
    )

    const button = container.querySelector('button')
    expect(button).toHaveClass('border')
    expect(button).toHaveClass('border-gray-300')
  })

  it('should apply size styles', () => {
    const { container } = render(
      <Button size="sm">Small Button</Button>
    )

    const button = container.querySelector('button')
    expect(button).toHaveClass('px-3')
    expect(button).toHaveClass('py-1.5')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>)

    const button = screen.getByText('Disabled Button')
    expect(button).toBeDisabled()
  })
})
```

### Mock Helpers

**Supabase Mock**:

```typescript
// tests/helpers/supabase-mock.ts
export function createMockSupabaseClient() {
  return {
    from: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com'
          }
        },
        error: null
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null
      })
    },
    storage: {
      from: jest.fn()
    }
  }
}
```

**WhatsApp API Mock**:

```typescript
// tests/helpers/whatsapp-mock.ts
export function createMockWhatsAppClient() {
  return {
    sendMessage: jest.fn().mockResolvedValue({
      success: true,
      message_id: 'wamid.test123'
    }),
    sendTemplate: jest.fn().mockResolvedValue({
      success: true,
      message_id: 'wamid.test456'
    })
  }
}
```

---

## Integration Testing

### API Route Testing

```typescript
// tests/integration/api/drip-campaigns.test.ts
import { createMocks } from 'node-mocks-http'
import { GET, POST } from '@/app/api/drip-campaigns/route'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase
jest.mock('@/lib/supabase/server')

describe('/api/drip-campaigns', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('should return campaigns for authenticated user', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null
          })
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            data: [
              { id: 'camp-1', name: 'Campaign 1' },
              { id: 'camp-2', name: 'Campaign 2' }
            ],
            error: null
          })
        })
      }

      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      const { req } = createMocks({ method: 'GET' })

      // Act
      const response = await GET(req as any)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.campaigns).toHaveLength(2)
      expect(data.campaigns[0].name).toBe('Campaign 1')
    })

    it('should return 401 for unauthenticated user', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' }
          })
        }
      }

      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      const { req } = createMocks({ method: 'GET' })

      // Act
      const response = await GET(req as any)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('POST', () => {
    it('should create campaign with valid data', async () => {
      // Arrange
      const campaignData = {
        name: 'New Campaign',
        triggerType: 'manual'
      }

      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null
          })
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { organization_id: 'org-123', role: 'admin' },
                error: null
              })
            })
          }),
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: [{ id: 'camp-123', ...campaignData }],
              error: null
            })
          })
        })
      }

      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      const { req } = createMocks({
        method: 'POST',
        body: campaignData
      })

      // Act
      const response = await POST(req as any)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.id).toBe('camp-123')
      expect(data.name).toBe('New Campaign')
    })

    it('should return 403 for agent role', async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123' } },
            error: null
          })
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { organization_id: 'org-123', role: 'agent' },
                error: null
              })
            })
          })
        })
      }

      ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)

      const { req } = createMocks({
        method: 'POST',
        body: { name: 'Test' }
      })

      // Act
      const response = await POST(req as any)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toContain('permissions')
    })
  })
})
```

---

## E2E Testing

### Setup Playwright

```bash
# Install Playwright
npm install --save-dev @playwright/test

# Install browsers
npx playwright install
```

**Playwright Configuration** (`playwright.config.ts`):

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

### E2E Test Examples

**Authentication Flow**:

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can sign in', async ({ page }) => {
    // Navigate to signin page
    await page.goto('/auth/signin')

    // Fill in credentials
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'TestPassword123!')

    // Submit form
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard')

    // Verify logged in
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/auth/signin')

    await page.fill('[name="email"]', 'invalid@example.com')
    await page.fill('[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // Should show error message
    await expect(page.locator('.error-message')).toBeVisible()
    await expect(page.locator('.error-message')).toContainText('Invalid credentials')
  })
})
```

**Campaign Creation Flow**:

```typescript
// tests/e2e/drip-campaigns.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Drip Campaigns', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/signin')
    await page.fill('[name="email"]', 'admin@example.com')
    await page.fill('[name="password"]', 'AdminPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('admin can create drip campaign', async ({ page }) => {
    // Navigate to campaign builder
    await page.goto('/dashboard/drip-campaigns/new')

    // Step 1: Basic Info
    await page.fill('[name="name"]', 'E2E Test Campaign')
    await page.fill('[name="description"]', 'Campaign created by E2E test')
    await page.click('button:has-text("Volgende")')

    // Step 2: Trigger Setup
    await page.click('[data-trigger="manual"]')
    await page.click('button:has-text("Volgende")')

    // Step 3: Add Steps
    await page.click('button:has-text("+ Voeg Step Toe")')
    await page.fill('[name="step_name"]', 'Welcome Message')
    await page.fill('[name="message_content"]', 'Welcome to our platform!')
    await page.click('button:has-text("Opslaan")')
    await page.click('button:has-text("Volgende")')

    // Step 4: Review & Activate
    await expect(page.locator('.campaign-name')).toContainText('E2E Test Campaign')
    await page.click('button:has-text("Activeren")')

    // Verify success
    await expect(page.locator('.success-toast')).toBeVisible()
    await page.waitForURL('/dashboard/drip-campaigns')

    // Verify campaign appears in list
    await expect(page.locator('text=E2E Test Campaign')).toBeVisible()
  })

  test('prevents campaign activation without steps', async ({ page }) => {
    await page.goto('/dashboard/drip-campaigns/new')

    // Fill basic info
    await page.fill('[name="name"]', 'Invalid Campaign')
    await page.click('button:has-text("Volgende")')

    // Select trigger
    await page.click('[data-trigger="manual"]')
    await page.click('button:has-text("Volgende")')

    // Skip adding steps
    await page.click('button:has-text("Volgende")')

    // Try to activate (should fail)
    const activateButton = page.locator('button:has-text("Activeren")')
    await expect(activateButton).toBeDisabled()
  })
})
```

**Analytics Dashboard**:

```typescript
// tests/e2e/analytics.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/signin')
    await page.fill('[name="email"]', 'admin@example.com')
    await page.fill('[name="password"]', 'AdminPass123!')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('displays campaign analytics', async ({ page }) => {
    await page.goto('/dashboard/analytics/campaigns')

    // Wait for data to load
    await page.waitForSelector('.metric-card')

    // Verify metric cards are visible
    await expect(page.locator('text=Berichten Verzonden')).toBeVisible()
    await expect(page.locator('text=Aflevering Rate')).toBeVisible()
    await expect(page.locator('text=Open Rate')).toBeVisible()
    await expect(page.locator('text=Click Rate')).toBeVisible()

    // Verify charts render
    await expect(page.locator('svg')).toBeVisible()
  })

  test('can filter by date range', async ({ page }) => {
    await page.goto('/dashboard/analytics/campaigns')

    // Click 7 days filter
    await page.click('button:has-text("7 dagen")')

    // Wait for data to reload
    await page.waitForTimeout(1000)

    // Verify URL or state updated
    // (implementation specific)
  })
})
```

---

## Testing Best Practices

### 1. AAA Pattern

Always use Arrange-Act-Assert pattern:

```typescript
it('should calculate total correctly', () => {
  // Arrange
  const items = [
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 }
  ]

  // Act
  const total = calculateTotal(items)

  // Assert
  expect(total).toBe(35)
})
```

### 2. Test Names

Use descriptive test names that explain behavior:

```typescript
// ❌ BAD
it('test 1', () => {})
it('works', () => {})

// ✅ GOOD
it('should return 401 when user is not authenticated', () => {})
it('should create campaign with valid data', () => {})
```

### 3. One Assertion Per Test

Keep tests focused:

```typescript
// ❌ BAD - Testing multiple things
it('creates and updates campaign', async () => {
  const campaign = await create()
  expect(campaign.id).toBeDefined()

  const updated = await update(campaign.id)
  expect(updated.name).toBe('Updated')
})

// ✅ GOOD - Separate tests
it('creates campaign successfully', async () => {
  const campaign = await create()
  expect(campaign.id).toBeDefined()
})

it('updates campaign name', async () => {
  const campaign = await create()
  const updated = await update(campaign.id, { name: 'Updated' })
  expect(updated.name).toBe('Updated')
})
```

### 4. Test Edge Cases

Don't just test happy paths:

```typescript
describe('enrollContact', () => {
  it('enrolls contact successfully', () => {
    // Happy path
  })

  it('handles duplicate enrollment', () => {
    // Edge case 1
  })

  it('validates contact ID format', () => {
    // Edge case 2
  })

  it('handles database errors gracefully', () => {
    // Error case
  })
})
```

### 5. Use Test Data Builders

Create helper functions for test data:

```typescript
// tests/helpers/builders.ts
export function buildCampaign(overrides = {}) {
  return {
    id: 'camp-123',
    name: 'Test Campaign',
    status: 'active',
    trigger_type: 'manual',
    created_at: new Date().toISOString(),
    ...overrides
  }
}

export function buildContact(overrides = {}) {
  return {
    id: 'contact-123',
    name: 'John Doe',
    phone_number: '+31612345678',
    ...overrides
  }
}

// Usage
const campaign = buildCampaign({ name: 'Custom Name' })
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Run Tests

```bash
# All tests
npm run test:all

# Unit tests only
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E with UI
npm run test:e2e:ui

# Specific test file
npm run test -- tests/unit/lib/drip-campaigns.test.ts
```

---

Voor meer informatie, zie de officiële documentatie:
- Jest: https://jestjs.io/docs/getting-started
- Testing Library: https://testing-library.com/docs/react-testing-library/intro/
- Playwright: https://playwright.dev/docs/intro
