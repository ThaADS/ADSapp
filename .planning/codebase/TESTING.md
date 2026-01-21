# Testing Structure

**Generated:** 2026-01-21

## Overview

ADSapp uses a comprehensive testing strategy with Jest for unit/integration tests and Playwright for E2E tests.

## Test Frameworks

| Framework | Purpose | Location |
|-----------|---------|----------|
| Jest | Unit & Integration | `tests/unit/`, `tests/integration/` |
| Playwright | E2E | `tests/e2e/` |
| Testing Library | React components | `tests/components/` |
| Nock | HTTP mocking | Used in integration tests |
| Supertest | API testing | Used in integration tests |

## Directory Structure

```
tests/
├── e2e/                    # Playwright E2E tests
│   ├── 01-landing-page.spec.ts
│   └── ...
│
├── unit/                   # Jest unit tests
│   └── encryption.test.ts
│
├── integration/            # Integration tests
│   └── encryption-flow.test.ts
│
├── components/             # React component tests
│
├── load/                   # Load testing
│   ├── k6-scenarios.js
│   ├── artillery-config.yml
│   ├── data/
│   │   └── generate-test-data.js
│   ├── scripts/
│   └── monitors/
│
├── fixtures/               # Test data
└── README.md               # Test documentation
```

## Jest Configuration

### Key Settings (`jest.config.js`)
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
  maxWorkers: '50%'
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
  }
}
```

### Test Patterns
```javascript
testMatch: [
  '<rootDir>/__tests__/**/*.{ts,tsx}',
  '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
  '<rootDir>/tests/**/*.{test,spec}.{ts,tsx}'
]
```

## Commands

### Unit Tests
```bash
npm run test             # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage
npm run test:ci          # CI mode (no watch, with coverage)

# Specific tests
npm run test -- path/to/test.test.ts
npm run test -- --testNamePattern="pattern"
```

### E2E Tests
```bash
npm run test:e2e         # Run Playwright tests
npm run test:e2e:ui      # With UI inspector

# Specific E2E test
npm run test:e2e -- tests/e2e/specific.spec.ts
```

### Route Auditing
```bash
npm run test:routes:owner   # Test owner role routes
npm run test:routes:admin   # Test admin role routes
npm run test:routes:agent   # Test agent role routes
npm run test:routes:404     # Check for 404s
npm run test:routes:audit   # Full route audit
```

### Special Tests
```bash
npm run test:security       # npm audit
npm run test:performance    # Lighthouse CI
npm run test:encryption     # Encryption tests
```

## Load Testing

### Tools
| Tool | Config | Purpose |
|------|--------|---------|
| k6 | `k6-scenarios.js` | HTTP load testing |
| Artillery | `artillery-config.yml` | Load simulation |

### Commands
```bash
npm run load:generate-data  # Generate test data
npm run load:k6             # Run k6 scenarios
npm run load:artillery      # Run Artillery tests
npm run load:monitor        # Metrics collection
```

## Test Patterns

### Unit Test Pattern
```typescript
// tests/unit/example.test.ts
import { functionToTest } from '@/lib/module'

describe('functionToTest', () => {
  beforeEach(() => {
    // Setup
  })

  afterEach(() => {
    // Cleanup
  })

  it('should return expected result', () => {
    const result = functionToTest(input)
    expect(result).toBe(expected)
  })

  it('should handle edge case', () => {
    expect(() => functionToTest(invalid)).toThrow()
  })

  it('should handle async operation', async () => {
    const result = await asyncFunction()
    expect(result).toBeDefined()
  })
})
```

### Integration Test Pattern
```typescript
// tests/integration/api.test.ts
import { createMocks } from 'node-mocks-http'
import { GET } from '@/app/api/route'

describe('API Route', () => {
  it('should return data for authenticated user', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      headers: {
        authorization: 'Bearer token'
      }
    })

    await GET(req)
    expect(res._getStatusCode()).toBe(200)
  })
})
```

### E2E Test Pattern
```typescript
// tests/e2e/flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should complete flow', async ({ page }) => {
    // Navigate
    await page.click('[data-testid="start-button"]')

    // Fill form
    await page.fill('[name="email"]', 'test@example.com')
    await page.click('[type="submit"]')

    // Verify result
    await expect(page.locator('.success')).toBeVisible()
  })
})
```

### Component Test Pattern
```typescript
// tests/components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  it('should render with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('should call onClick handler', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    fireEvent.click(screen.getByText('Click'))
    expect(handleClick).toHaveBeenCalled()
  })
})
```

## Mocking Patterns

### Supabase Client
```typescript
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'user-123' } }
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: mockData
          }))
        }))
      }))
    }))
  }))
}))
```

### HTTP Requests (Nock)
```typescript
import nock from 'nock'

beforeEach(() => {
  nock('https://api.external.com')
    .get('/endpoint')
    .reply(200, { data: 'response' })
})

afterEach(() => {
  nock.cleanAll()
})
```

### Environment Variables
```typescript
const originalEnv = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = { ...originalEnv, API_KEY: 'test-key' }
})

afterEach(() => {
  process.env = originalEnv
})
```

## Coverage Reports

### Output Formats
- `text` - Console summary
- `text-summary` - Brief console output
- `lcov` - For CI/CD integration
- `html` - Browser-viewable report
- `json` - Machine-readable

### Viewing Coverage
```bash
npm run test:coverage

# Open HTML report
open coverage/lcov-report/index.html
```

## CI/CD Integration

### GitHub Actions
- Tests run on PR and push to main
- Coverage uploaded to tracking service
- E2E tests in headless mode

### Commands for CI
```bash
npm run test:ci          # Jest in CI mode
npm run test:e2e         # Playwright headless
```

## Best Practices

1. **Test naming**: Use descriptive names that explain the behavior
2. **Isolation**: Each test should be independent
3. **Coverage**: Aim for 70%+ on critical paths
4. **Mocking**: Mock external dependencies, not internal logic
5. **Speed**: Keep unit tests fast (<100ms each)
6. **E2E scope**: Test critical user journeys, not every feature

---
*Testing mapped: 2026-01-21*
