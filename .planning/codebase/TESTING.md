# Testing Patterns

**Analysis Date:** 2026-01-23

## Test Framework Overview

ADSapp uses a comprehensive testing strategy with Jest for unit/integration tests and Playwright for E2E tests.

| Framework | Version | Purpose | Location |
|-----------|---------|---------|----------|
| Jest | 29.7.0 | Unit & Integration tests | `tests/unit/`, `tests/integration/` |
| Playwright | 1.47.0 | E2E browser testing | `tests/e2e/` |
| Testing Library | 14.3.1 | React component testing | `tests/components/` |
| Nock | 13.5.5 | HTTP request mocking | Integration tests |
| Supertest | 7.0.0 | API testing | Integration tests |
| @swc/jest | 0.2.39 | TypeScript transformation | Jest transpiler |

## Jest Configuration

**File:** `jest.config.js`

### Key Settings
```javascript
{
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.(ts|tsx)$': ['@swc/jest', { /* SWC config */ }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 10000,
  maxWorkers: '50%',
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache'
}
```

### Coverage Thresholds
```javascript
coverageThreshold: {
  global: {
    branches: 60,
    functions: 60,
    lines: 60,
    statements: 60
  },
  './src/lib/security/': {
    branches: 70,
    functions: 75,
    lines: 75,
    statements: 75
  },
  './src/lib/cache/': {
    branches: 70,
    functions: 75,
    lines: 75,
    statements: 75
  },
  './src/app/api/': {
    branches: 50,
    functions: 60,
    lines: 60,
    statements: 60
  }
}
```

### Coverage Reporting Formats
- `text` - Console summary
- `text-summary` - Brief output
- `lcov` - CI/CD integration
- `html` - Browser-viewable report (at `coverage/lcov-report/index.html`)
- `json` - Machine-readable format
- `json-summary` - Summary JSON

### Test File Patterns
```javascript
testMatch: [
  '<rootDir>/__tests__/**/*.{ts,tsx}',
  '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  '<rootDir>/tests/**/*.{test,spec}.{ts,tsx}'
]
```

## Jest Setup & Fixtures

**File:** `jest.setup.js`

### Console Mock Configuration
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

### Global Mock Setup
```typescript
// Mocks applied before all tests
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

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
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
  }),
}))
```

### Cleanup After Each Test
```typescript
afterEach(() => {
  jest.clearAllMocks()
})
```

## Test Commands

### Unit Tests
```bash
npm run test             # Run all tests once
npm run test:watch       # Watch mode (re-run on changes)
npm run test:coverage    # With coverage report
npm run test:ci          # CI mode (no watch, with coverage, watchAll=false)

# Run specific test
npm run test -- path/to/test.test.ts
npm run test -- --testNamePattern="pattern"
```

### E2E Tests
```bash
npm run test:e2e         # Run Playwright tests (headless)
npm run test:e2e:ui      # With Playwright UI inspector

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

### Specialized Tests
```bash
npm run test:security       # npm audit (dependency vulnerabilities)
npm run test:performance    # Lighthouse CI
npm run test:encryption     # Encryption-specific tests
```

## Directory Structure

```
tests/
├── unit/                   # Jest unit tests
│   ├── lib/
│   │   ├── security/
│   │   │   ├── input-validation.test.ts
│   │   │   ├── encryption.test.ts
│   │   │   └── key-manager.test.ts
│   │   └── cache/
│   │       ├── cache-manager.test.ts
│   │       └── redis-client.test.ts
│   ├── auth/
│   │   └── authentication.test.ts
│   └── utils/
│       └── formatting.test.ts
│
├── integration/            # Integration tests
│   ├── api/
│   │   ├── admin.test.ts
│   │   ├── analytics.test.ts
│   │   ├── auth.test.ts
│   │   ├── contacts.test.ts
│   │   ├── conversations.test.ts
│   │   └── templates.test.ts
│   ├── rls-policies.test.ts
│   ├── tenant-validation.test.ts
│   ├── session-flow.test.ts
│   ├── mfa-flow.test.ts
│   ├── encryption-flow.test.ts
│   └── job-queue.test.ts
│
├── e2e/                    # Playwright E2E tests
│   ├── 01-landing-page.spec.ts
│   ├── 02-authentication.spec.ts
│   ├── 03-api-health.spec.ts
│   ├── 04-dashboard-pages.spec.ts
│   └── 05-performance.spec.ts
│
├── components/             # React component tests
│   └── (component tests)
│
├── fixtures/               # Test data & mocks
│   └── test-helpers.ts
│
├── utils/                  # Test utilities
│   ├── api-test-helpers.ts
│   └── test-helpers.ts
│
├── load/                   # Load testing
│   ├── k6-scenarios.js
│   ├── artillery-config.yml
│   ├── data/
│   │   └── generate-test-data.js
│   ├── scripts/
│   │   └── run-load-test.sh
│   └── monitors/
│       └── metrics-collector.js
│
└── mobile/                 # Mobile experience tests
    └── mobile-experience.test.ts
```

## Test Patterns

### Unit Test Pattern (Example: `tests/unit/lib/security/input-validation.test.ts`)
```typescript
import {
  validateUUID,
  validateEmail,
  containsSQLInjection,
  ValidationErrorCodes,
} from '@/lib/security/input-validation'

describe('Input Validation - SQL Injection Prevention', () => {
  describe('SQL Injection Detection', () => {
    it('should detect common SQL injection patterns', () => {
      // Arrange
      const maliciousInputs = [
        "' OR '1'='1",
        "1'; DROP TABLE users--",
        "' UNION SELECT * FROM passwords--",
      ]

      // Act & Assert
      maliciousInputs.forEach((input) => {
        expect(containsSQLInjection(input)).toBe(true)
      })
    })

    it('should allow safe text without SQL patterns', () => {
      // Arrange
      const safeInputs = [
        'John Doe',
        'hello@example.com',
        'Product name: Widget v2.0',
      ]

      // Act & Assert
      safeInputs.forEach((input) => {
        expect(containsSQLInjection(input)).toBe(false)
      })
    })

    it('should reject text with SQL injection attempts', () => {
      // Arrange
      const maliciousInput = "'; DROP TABLE users--"

      // Act
      const result = validateText(maliciousInput)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.errorCode).toBe(ValidationErrorCodes.SQL_INJECTION_DETECTED)
    })
  })
})
```

### Integration Test Pattern (Example: `tests/integration/api/contacts.test.ts`)
```typescript
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'
import {
  createAuthenticatedRequest,
  parseResponse,
  expectPaginatedResponse,
} from '../../utils/api-test-helpers'
import { createMockSupabaseClient } from '../../utils/test-helpers'

jest.mock('@/lib/supabase/server')

describe('GET /api/contacts', () => {
  let mockSupabase: any
  let mockUser: any

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockUser = { id: 'user-123', organization_id: 'org-456' }
    jest.clearAllMocks()
  })

  it('should list contacts with pagination', async () => {
    // Arrange
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockResolvedValue({
        data: mockContacts.slice(0, 10),
        error: null,
        count: 15,
      }),
    })

    const url = `/api/contacts?page=1&limit=10`
    const request = createAuthenticatedRequest('GET', url, mockUser.id, mockUser.organization_id)

    // Act
    const response = await simulateGetContacts(request, mockSupabase, mockUser)
    const { status, data } = await parseResponse(response)

    // Assert
    expect(status).toBe(200)
    expectPaginatedResponse(data)
    expect(data.contacts).toHaveLength(10)
    expect(data.pagination.total).toBe(15)
  })

  it('should filter contacts by search term', async () => {
    // Arrange - setup mock with filtered results
    // Act - call API with search param
    // Assert - verify filtered results
  })
})
```

### E2E Test Pattern (Example: `tests/e2e/02-authentication.spec.ts`)
```typescript
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('should navigate to sign in page', async ({ page }) => {
    // Arrange
    await page.goto('http://localhost:3000/auth/signin')

    // Act
    const emailInput = page.locator('input[type="email"], input[name="email"]')
    const passwordInput = page.locator('input[type="password"], input[name="password"]')

    // Assert
    await expect(page).toHaveURL(/\/auth\/signin/)
    if (await emailInput.isVisible()) {
      await expect(emailInput).toBeVisible()
    }
    if (await passwordInput.isVisible()) {
      await expect(passwordInput).toBeVisible()
    }

    // Screenshot for debugging
    await page.screenshot({ path: 'test-results/signin-page.png' })
  })

  test('should complete sign up flow', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/signup')

    // Fill form
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'TestPassword123!')
    await page.click('[type="submit"]')

    // Verify redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
```

### Component Test Pattern (Example: React component test)
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('should render with text', () => {
    // Arrange
    render(<Button>Click me</Button>)

    // Act
    const button = screen.getByText('Click me')

    // Assert
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('button')
  })

  it('should call onClick handler', async () => {
    // Arrange
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    // Act
    const button = screen.getByText('Click')
    await userEvent.click(button)

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should handle disabled state', () => {
    // Arrange
    render(<Button disabled>Disabled</Button>)

    // Act
    const button = screen.getByText('Disabled')

    // Assert
    expect(button).toBeDisabled()
  })
})
```

## Mocking Patterns

### Supabase Client Mock
```typescript
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
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
  })),
}))
```

### HTTP Request Mocking (Nock)
```typescript
import nock from 'nock'

beforeEach(() => {
  nock('https://api.external.com')
    .get('/endpoint')
    .reply(200, { data: 'response' })

  nock('https://api.external.com')
    .post('/endpoint', { id: '123' })
    .reply(201, { success: true })
})

afterEach(() => {
  nock.cleanAll()
})
```

### Environment Variables Mock
```typescript
const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = {
    ...originalEnv,
    API_KEY: 'test-key',
    DATABASE_URL: 'postgresql://test',
    NODE_ENV: 'test',
  }
})

afterEach(() => {
  process.env = originalEnv
})
```

### Next.js Router Mock
```typescript
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
    get: jest.fn((key) => {
      const params = { page: '1', limit: '10' }
      return params[key as keyof typeof params]
    }),
  }),
  usePathname: () => '/dashboard',
}))
```

## Load Testing

### Tools
| Tool | Config | Purpose |
|------|--------|---------|
| k6 | `tests/load/k6-scenarios.js` | HTTP load testing & stress testing |
| Artillery | `tests/load/artillery-config.yml` | Load simulation & performance analysis |

### Commands
```bash
npm run load:generate-data  # Generate test data fixtures
npm run load:k6             # Run k6 load scenarios
npm run load:artillery      # Run Artillery tests
npm run load:monitor        # Start metrics collection
```

### K6 Pattern
```javascript
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 VUs
    { duration: '1m30s', target: 10 }, // Ramp down to 10
    { duration: '20s', target: 0 },   // Ramp down to 0
  ],
}

export default function () {
  const url = 'http://localhost:3000/api/contacts'
  const payload = JSON.stringify({ name: 'Test' })
  const params = { headers: { 'Content-Type': 'application/json' } }

  const res = http.get(url, params)

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  })

  sleep(1)
}
```

## Best Practices

### Test Naming
- Use descriptive names that explain the behavior
- Format: "should [expected behavior] when [condition]"
- Examples:
  - `should validate email format correctly`
  - `should reject invalid phone numbers with error message`
  - `should return 401 when user not authenticated`

### Test Organization
- Group related tests with `describe()` blocks
- One assertion focus per test (but multiple asserts okay if related)
- Use `beforeEach()` for common setup
- Use `afterEach()` for cleanup (especially important for mocks)

### Isolation
- Each test should be independent
- No reliance on test execution order
- Mock external dependencies (Supabase, HTTP calls, Next.js)
- Reset mocks between tests: `jest.clearAllMocks()`

### Coverage Goals
- Target 70%+ on critical paths
- Security modules: 75%+
- Cache system: 75%+
- API routes: 60%+
- Global target: 60%+
- NOT measured: `*.d.ts`, `index.ts`, `layout.tsx`, `page.tsx`

### Mocking Guidelines
- Mock external dependencies (APIs, databases, filesystem)
- Don't mock internal application logic
- Mock as close to real behavior as possible
- Use factory functions for complex mock data

### Performance
- Keep unit tests fast (<100ms each)
- Use `jest.mock()` at module level for setup
- Run tests in parallel with `maxWorkers`
- E2E tests can be slower (1-10s each)

### Async Testing
```typescript
// Use async/await for clarity
it('should fetch data', async () => {
  const result = await fetchData()
  expect(result).toBeDefined()
})

// Or return promise
it('should handle promise', () => {
  return fetchData().then((result) => {
    expect(result).toBeDefined()
  })
})
```

### Error Testing
```typescript
it('should throw on invalid input', () => {
  expect(() => functionThatThrows(invalid)).toThrow()
  expect(() => functionThatThrows(invalid)).toThrow(ValidationError)
})

it('should reject on async error', async () => {
  await expect(asyncFunctionThatThrows()).rejects.toThrow()
})
```

## CI/CD Integration

### GitHub Actions
- Tests run on PR and push to main
- Coverage uploaded to tracking service
- E2E tests run in headless mode
- Parallel test execution for speed

### CI Commands
```bash
npm run test:ci          # Jest in CI mode (no watch, with coverage)
npm run test:e2e         # Playwright headless mode
npm run test:security    # Dependency audit
```

### Coverage Reports
View HTML coverage report:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Debugging Tests

### Run Single Test
```bash
npm run test -- tests/unit/example.test.ts
npm run test -- --testNamePattern="should validate email"
```

### Watch Mode
```bash
npm run test:watch
# Then type "o" to focus on changed files
# Type "p" to filter by filename
```

### Debug in VSCode
```json
{
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Playwright Debug
```bash
npm run test:e2e -- --debug
```

---

*Testing analysis: 2026-01-23*
