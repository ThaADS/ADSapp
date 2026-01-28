# Testing Patterns

**Analysis Date:** 2026-01-28

## Test Framework Overview

ADSapp uses a comprehensive testing strategy with Jest for unit/integration tests and Playwright for E2E tests.

| Framework | Version | Purpose | Location |
|-----------|---------|---------|----------|
| Jest | 29.7.0 | Unit & Integration tests | `tests/unit/`, `tests/integration/` |
| Playwright | 1.47.0+ | E2E browser testing | `tests/e2e/` |
| Testing Library | 14.3.1+ | React component testing | `tests/components/` |
| @swc/jest | 0.2.39+ | TypeScript transformation | Jest transpiler |
| @jest/globals | Latest | Jest type definitions | Global test functions |

## Jest Configuration

**File:** `jest.config.js`

### Key Settings
```javascript
{
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['@swc/jest', { /* SWC TypeScript config */ }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
  },
  testTimeout: 10000,
  maxWorkers: '50%',
  maxConcurrency: 10,
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  forceExit: true,
}
```

### Coverage Thresholds

**Phase 6 Baseline (2026-01-24):**
```javascript
coverageThreshold: {
  global: {
    branches: 0.3,
    functions: 0.5,
    lines: 0.5,
    statements: 0.5,
  },
  // Per-directory thresholds disabled until global coverage improves
  // Re-enable when global reaches 20%+
}
```

**Note:** Coverage is incrementally increasing. Current baseline: 0.5-0.7% with 15 passing test suites and 250 tests.

### Coverage Collection
```javascript
collectCoverageFrom: [
  'src/**/*.{ts,tsx}',
  '!src/**/*.d.ts',
  '!src/**/index.ts',
  '!src/**/*.stories.{ts,tsx}',
  '!src/**/*.config.{ts,tsx}',
  '!src/app/**/layout.tsx',
  '!src/app/**/loading.tsx',
  '!src/app/**/error.tsx',
  '!src/app/**/not-found.tsx',
  '!src/app/global-error.tsx',
  '!src/types/**',
  '!src/**/__tests__/**',
  '!src/**/__mocks__/**',
]
```

### Coverage Reporting
- `text` - Console summary
- `text-summary` - Brief output
- `lcov` - CI/CD integration
- `html` - Browser-viewable at `coverage/lcov-report/index.html`
- `json` - Machine-readable format
- `json-summary` - Summary JSON
- `junit` - JUnit XML for CI systems

### Test File Patterns
```javascript
testMatch: [
  '<rootDir>/__tests__/**/*.{ts,tsx}',
  '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  '<rootDir>/tests/**/*.{test,spec}.{ts,tsx}'
]

testPathIgnorePatterns: [
  '<rootDir>/.next/',
  '<rootDir>/node_modules/',
  '<rootDir>/tests/e2e/',
  '<rootDir>/tests/fixtures/',
  '<rootDir>/tests/helpers/',
  '<rootDir>/tests/_deferred/',
  '<rootDir>/tests/mobile/',
]
```

## Jest Setup

**File:** `jest.setup.js`

### Global Mocks

**React/Next.js Mocks:**
```typescript
// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }),
}))

// Mock Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))
```

**Browser API Mocks:**
```typescript
// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  },
  writable: true,
})

// Mock Request/Response for Next.js API tests
global.Request = class Request {
  // Implements full Request interface
}

global.Response = class Response {
  // Implements full Response interface with json(), text(), clone()
  static json(data, init) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  }
}

// Mock Headers
global.Headers = class Headers {
  // Implements full Headers interface
}
```

### Console Filtering
```typescript
// Suppress expected React warnings during tests
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: useLayoutEffect') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return // Suppress
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
```

### Cleanup
```typescript
afterEach(() => {
  jest.clearAllMocks()
})
```

## Test Commands

### Unit & Integration Tests
```bash
npm run test             # Run all tests once
npm run test:watch      # Watch mode (re-run on changes)
npm run test:coverage   # With coverage report
npm run test:ci         # CI mode (no watch, with coverage)

# Run specific test
npm run test -- path/to/test.test.ts
npm run test -- --testNamePattern="pattern"
```

### E2E Tests (Playwright)
```bash
npm run test:e2e        # Run Playwright tests (headless)
npm run test:e2e:ui     # With Playwright Inspector UI

# Run specific E2E test
npm run test:e2e -- tests/e2e/02-authentication.spec.ts
```

### Route Auditing (via Playwright)
```bash
npm run test:routes:owner   # Test owner role routes
npm run test:routes:admin   # Test admin role routes
npm run test:routes:agent   # Test agent role routes
npm run test:routes:404     # Check for 404s
npm run test:routes:audit   # Full route audit
```

### Security & Performance
```bash
npm run test:security       # npm audit (dependency vulnerabilities)
npm run test:performance    # Lighthouse CI
```

## Directory Structure

```
tests/
├── unit/                    # Jest unit tests
│   ├── channels/
│   │   ├── contact-dedup.test.ts
│   │   ├── router.test.ts
│   │   └── whatsapp-adapter.test.ts
│   └── utils/
│       └── formatting.test.ts
│
├── integration/             # Integration tests
│   ├── api/
│   │   ├── admin.test.ts
│   │   ├── analytics.test.ts
│   │   ├── auth.test.ts
│   │   ├── conversations.test.ts
│   │   ├── contacts.test.ts
│   │   ├── health.test.ts
│   │   └── templates.test.ts
│   ├── channels/
│   │   └── rls.test.ts
│
├── e2e/                     # Playwright E2E tests
│   ├── 01-landing-page.spec.ts
│   ├── 02-authentication.spec.ts
│   ├── 03-api-health.spec.ts
│   ├── 04-dashboard-pages.spec.ts
│   ├── 05-performance.spec.ts
│   ├── 06-super-admin-login.spec.ts
│   └── ... (numbered sequentially)
│
├── components/              # React component tests
│   ├── admin.test.tsx
│   ├── dashboard.test.tsx
│   ├── messaging.test.tsx
│   └── templates.test.tsx
│
├── _deferred/               # Tests needing fixes (not auto-run)
│   ├── accessibility/
│   ├── auth/
│   ├── cache/
│   ├── security/
│   └── ... (deferred until fixed)
│
├── helpers/                 # Test utilities
│   └── test-utils.ts
│
├── utils/                   # Test helpers & mocks
│   ├── api-test-helpers.ts
│   ├── mock-redis.ts
│   ├── mock-whatsapp.ts
│   └── test-helpers.ts
│
└── fixtures/                # Test data
    └── e2e/auth-fixtures.ts
```

## Test Patterns

### Unit Test Pattern - Phone Number Normalization

**File:** `tests/unit/channels/contact-dedup.test.ts`

```typescript
import { normalizePhoneNumber } from '@/lib/channels/contact-dedup'

describe('Contact Deduplication', () => {
  describe('normalizePhoneNumber', () => {
    describe('basic format', () => {
      it('should add + prefix if missing', () => {
        expect(normalizePhoneNumber('1234567890')).toBe('+1234567890')
      })

      it('should keep + prefix if present', () => {
        expect(normalizePhoneNumber('+1234567890')).toBe('+1234567890')
      })
    })

    describe('whitespace handling', () => {
      it('should remove spaces', () => {
        expect(normalizePhoneNumber('+1 234 567 890')).toBe('+1234567890')
      })

      it('should remove tabs and newlines', () => {
        expect(normalizePhoneNumber('+1\t234\n567\t890')).toBe('+1234567890')
      })
    })

    describe('special character handling', () => {
      it('should remove dashes and parentheses', () => {
        expect(normalizePhoneNumber('+1 (234) 567-890')).toBe('+1234567890')
      })

      it('should handle mixed formatting', () => {
        expect(normalizePhoneNumber('(+1) 234-567.890')).toBe('+1234567890')
      })
    })

    describe('international formats', () => {
      it('should handle Netherlands format', () => {
        expect(normalizePhoneNumber('+31 6 12345678')).toBe('+31612345678')
      })

      it('should handle UK format', () => {
        expect(normalizePhoneNumber('+44 20 7946 0958')).toBe('+442079460958')
      })
    })
  })
})
```

**Key Patterns:**
- Organized by feature/scenario with nested `describe()` blocks
- Descriptive test names explaining behavior
- Arrange-Act-Assert implied through test structure
- Groups related tests together for readability

### Integration Test Pattern - API Conversations

**File:** `tests/integration/api/conversations.test.ts`

```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import {
  createAuthenticatedRequest,
  parseResponse,
  expectErrorResponse,
  expectPaginatedResponse,
} from '../../utils/api-test-helpers'
import {
  createMockUser,
  createMockConversation,
  createMockSupabaseClient,
  generateMockConversations,
} from '../../utils/test-helpers'

jest.mock('@/lib/supabase/server')

describe('GET /api/conversations', () => {
  let mockSupabase: any
  let mockUser: any
  let mockConversations: any[]

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = createMockUser()
    mockConversations = generateMockConversations(20, { organization_id: mockUser.organization_id })
    jest.clearAllMocks()
  })

  it('should list conversations with pagination', async () => {
    // Arrange
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockConversations.slice(0, 10),
        error: null,
        count: 20,
      }),
    })

    const request = createAuthenticatedRequest(
      'GET',
      '/api/conversations?page=1&limit=10',
      mockUser.id,
      mockUser.organization_id
    )

    // Act
    const response = await simulateGetConversations(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expectPaginatedResponse(data)
    expect(data.conversations).toHaveLength(10)
  })

  it('should filter conversations by status', async () => {
    // Arrange
    const openConversations = mockConversations.filter(c => c.status === 'open')
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: openConversations,
        error: null,
        count: openConversations.length,
      }),
    })

    // Act
    const request = createAuthenticatedRequest(
      'GET',
      '/api/conversations?status=open',
      mockUser.id,
      mockUser.organization_id
    )

    // Assert
    const response = await simulateGetConversations(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)
    expect(status).toBe(200)
    expect(data.filters.status).toBe('open')
  })

  it('should enforce tenant isolation', async () => {
    // Test that other organization's data is filtered out
    // ...
  })
})
```

**Key Patterns:**
- Uses factory functions for test data: `createMockUser()`, `generateMockConversations()`
- Mocks Supabase client at module level with `jest.mock()`
- Helper functions for common operations: `createAuthenticatedRequest()`, `parseResponse()`
- Clear Arrange-Act-Assert sections
- Tests both happy path and filtering/validation

### E2E Test Pattern - Landing Page

**File:** `tests/e2e/01-landing-page.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Landing Page', () => {
  test('should load the landing page successfully', async ({ page }) => {
    // Arrange & Act
    await page.goto('http://localhost:3000')

    // Assert
    await expect(page).toHaveTitle(/ADSapp/)
    await expect(page.locator('h1')).toBeVisible()

    // Visual verification
    await page.screenshot({ path: 'test-results/landing-page.png' })
  })

  test('should have working navigation links', async ({ page }) => {
    await page.goto('http://localhost:3000')

    // Check for auth links if visible
    const signinLink = page.getByRole('link', { name: /sign in/i })
    const signupLink = page.getByRole('link', { name: /sign up/i })

    if (await signinLink.isVisible()) {
      await expect(signinLink).toBeVisible()
    }

    if (await signupLink.isVisible()) {
      await expect(signupLink).toBeVisible()
    }
  })

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('http://localhost:3000')
    await expect(page.locator('body')).toBeVisible()

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.reload()
    await expect(page.locator('body')).toBeVisible()

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.reload()
    await expect(page.locator('body')).toBeVisible()
  })
})
```

**Key Patterns:**
- Each test is independent and can run standalone
- Uses Playwright selectors: `getByRole()`, `locator()`
- Handles async operations with `async/await`
- Tests responsive behavior with viewport changes
- Includes screenshot capture for visual verification
- Conditional assertions for optional elements

### Component Test Pattern

**File:** `tests/components/admin.test.tsx`

```typescript
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const OrganizationList = ({ organizations, onSuspend, onActivate, onView }: any) => (
  <div>
    <h2>Organizations</h2>
    <table>
      <tbody>
        {organizations.map((org: any) => (
          <tr key={org.id} data-testid={`org-${org.id}`}>
            <td>{org.name}</td>
            <td>
              <button onClick={() => onView(org.id)} aria-label={`View ${org.name}`}>
                View
              </button>
              {org.status === 'active' ? (
                <button onClick={() => onSuspend(org.id)}>Suspend</button>
              ) : (
                <button onClick={() => onActivate(org.id)}>Activate</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

describe('OrganizationList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render organizations in table', () => {
    const mockOrgs = [
      { id: '1', name: 'Org A', status: 'active' },
      { id: '2', name: 'Org B', status: 'suspended' },
    ]
    const handlers = {
      onView: jest.fn(),
      onSuspend: jest.fn(),
      onActivate: jest.fn(),
    }

    render(<OrganizationList organizations={mockOrgs} {...handlers} />)

    expect(screen.getByText('Org A')).toBeInTheDocument()
    expect(screen.getByText('Org B')).toBeInTheDocument()
  })

  it('should call onSuspend when suspend button clicked', async () => {
    const handlers = {
      onView: jest.fn(),
      onSuspend: jest.fn(),
      onActivate: jest.fn(),
    }
    const mockOrgs = [{ id: '1', name: 'Org A', status: 'active' }]

    render(<OrganizationList organizations={mockOrgs} {...handlers} />)

    const suspendButton = screen.getByRole('button', { name: /suspend/i })
    await userEvent.click(suspendButton)

    expect(handlers.onSuspend).toHaveBeenCalledWith('1')
  })
})
```

**Key Patterns:**
- Tests component rendering and interaction
- Uses `data-testid` for specific element selection
- Tests event handlers with mocked callbacks
- Uses `@testing-library/user-event` for realistic user interactions
- Tests ARIA labels for accessibility

## Mocking Patterns

### Factory Functions for Test Data

**File:** `tests/helpers/test-utils.ts`

```typescript
export interface MockUser {
  id: string
  organization_id: string
  email: string
  full_name: string
  role: 'owner' | 'admin' | 'agent'
  permissions: string[]
}

export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    id: 'user_test_123',
    organization_id: 'org_test_123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'admin',
    permissions: ['read', 'write'],
    ...overrides,
  }
}

export function generateMockConversations(
  count: number,
  overrides?: any
): any[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `conv_${i}`,
    organization_id: 'org_123',
    contact: { id: `contact_${i}`, name: `Contact ${i}`, phone_number: '+1234567890' },
    status: ['open', 'pending', 'resolved'][i % 3],
    priority: ['low', 'medium', 'high'][i % 3],
    created_at: new Date().toISOString(),
    ...overrides,
  }))
}
```

**Key Patterns:**
- Factory functions return realistic test data
- Accept `overrides` parameter for customization
- Generate bulk data with loop for pagination tests
- Include all required fields

### Supabase Mock Setup

```typescript
export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  }
}
```

### API Test Helpers

**File:** `tests/utils/api-test-helpers.ts`

```typescript
export function createAuthenticatedRequest(
  method: string,
  url: string,
  userId: string,
  organizationId: string,
  body?: any
): NextRequest {
  // Create request with auth context
  // ...
}

export async function parseResponse(response: Response) {
  return {
    status: response.status,
    data: await response.json(),
  }
}

export function expectPaginatedResponse(data: any) {
  expect(data).toHaveProperty('pagination')
  expect(data.pagination).toHaveProperty('total')
  expect(data.pagination).toHaveProperty('page')
  expect(data.pagination).toHaveProperty('limit')
}
```

## Best Practices

### Test Naming
- Use descriptive names: `should [action] when [condition]`
- Examples:
  - `should validate email format correctly`
  - `should reject invalid phone numbers`
  - `should return 401 when user not authenticated`
  - `should enforce tenant isolation`

### Test Organization
- Group with `describe()` blocks
- One behavior focus per test
- Use `beforeEach()` for setup, `afterEach()` for cleanup
- Tests should be independent - no ordering dependencies

### Isolation & Independence
- Each test runs standalone
- Mock external dependencies (Supabase, HTTP, Next.js)
- Reset mocks between tests: `jest.clearAllMocks()`
- No shared state between tests

### Async Testing
```typescript
// ✅ Preferred: async/await
it('should fetch data', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})

// Also OK: return promise
it('should handle promise', () => {
  return fetchData().then((result) => {
    expect(result).toBeDefined()
  })
})
```

### Error Testing
```typescript
// Synchronous error
it('should throw on invalid input', () => {
  expect(() => functionThatThrows(invalid)).toThrow()
  expect(() => functionThatThrows(invalid)).toThrow(ValidationError)
})

// Async error
it('should reject on error', async () => {
  await expect(asyncFunctionThatThrows()).rejects.toThrow()
})
```

### Coverage Guidelines
- Target 60%+ overall (from phase 6 baseline)
- Security modules: 70%+
- Cache system: 70%+
- NOT measured: `*.d.ts`, `index.ts`, `layout.tsx`, `page.tsx`
- Coverage increments with each phase

## Deferred Tests

Tests in `tests/_deferred/` are temporarily excluded (not auto-run) while being fixed:

```bash
# To run deferred tests (after fixes are applied):
npm run test -- tests/_deferred/
```

Current deferred test areas:
- `accessibility/` - Accessibility compliance tests
- `auth/` - Advanced authentication scenarios
- `cache/` - Cache manager and Redis tests
- `security/` - Security vulnerability tests
- `contacts.test.tsx` - Contact management tests
- `encryption-*` - Encryption flow tests
- `mfa-flow.test.ts` - Multi-factor authentication
- `tenant-isolation.test.ts` - Multi-tenant isolation
- `onboarding/` - Onboarding flow tests

## CI/CD Integration

Tests run automatically on PR and push to main via GitHub Actions.

```bash
# Local CI-like execution
npm run test:ci          # Jest in CI mode
npm run test:e2e         # Playwright headless
npm run test:security    # Security audit
```

## Debugging Tests

### Run Single Test
```bash
npm run test -- tests/unit/example.test.ts
npm run test -- --testNamePattern="should validate"
```

### Watch Mode
```bash
npm run test:watch
# Press 'o' to focus on changed files
# Press 'p' to filter by filename
```

### View Coverage Report
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

### Playwright Debug
```bash
npm run test:e2e -- --debug
# Opens inspector for step-by-step debugging
```

---

*Testing analysis: 2026-01-28*
