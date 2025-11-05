# ADSapp Testing Infrastructure

Comprehensive testing setup for the ADSapp Multi-Tenant WhatsApp Business Inbox SaaS platform.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Utilities](#test-utilities)
- [Mock Clients](#mock-clients)
- [Writing Tests](#writing-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The ADSapp testing infrastructure provides comprehensive test utilities, mock clients, and helpers for testing:

- **Unit Tests**: Individual component and function testing
- **Integration Tests**: API endpoints and service integration
- **Component Tests**: React component rendering and interaction
- **E2E Tests**: Full user journey testing with Playwright

### Technology Stack

- **Jest**: Test runner and assertion library
- **React Testing Library**: React component testing
- **@swc/jest**: Fast TypeScript compilation
- **Playwright**: End-to-end browser testing
- **Custom Mocks**: Redis, BullMQ, WhatsApp, Stripe

## Test Structure

```
tests/
├── README.md                    # This file
├── setup.ts                     # Global test setup (402 lines)
├── utils/                       # Test utilities and helpers
│   ├── test-helpers.ts         # Mock data factories and utilities
│   ├── api-test-helpers.ts     # API testing utilities
│   ├── render-helpers.ts       # React component rendering utilities
│   ├── mock-redis.ts           # Redis mock client (NEW)
│   ├── mock-bullmq.ts          # BullMQ job queue mock (NEW)
│   ├── mock-whatsapp.ts        # WhatsApp API mock handlers (NEW)
│   └── mock-stripe.ts          # Stripe API mock handlers (NEW)
├── unit/                        # Unit tests
├── integration/                 # Integration tests
├── component/                   # Component tests
└── e2e/                        # End-to-end tests (Playwright)
```

## Running Tests

### All Tests
```bash
npm run test                    # Run all tests
npm run test:watch             # Watch mode for development
npm run test:coverage          # Run with coverage reporting
npm run test:ci                # CI/CD mode (no watch, with coverage)
```

### Specific Test Types
```bash
npm run test:e2e               # End-to-end tests with Playwright
npm run test:e2e:ui            # E2E tests with Playwright UI
npm run test:routes            # Route audit tests
npm run test:security          # Security audit
npm run test:performance       # Performance testing
```

### Running Specific Tests
```bash
npm run test -- path/to/test.test.ts                    # Single file
npm run test -- --testNamePattern="test name"           # By test name
npm run test -- --testPathPattern="path/pattern"        # By path pattern
```

## Test Utilities

### Mock Data Factories (`test-helpers.ts`)

Create realistic test data aligned with the actual database schema:

```typescript
import {
  createMockUser,
  createMockOrganization,
  createMockContact,
  createMockConversation,
  createMockMessage,
  generateMockUsers,
  generateMockContacts,
} from '@/tests/utils/test-helpers'

// Create individual mock objects
const user = createMockUser({ email: 'test@example.com', role: 'admin' })
const organization = createMockOrganization({ name: 'Test Org' })
const contact = createMockContact({ name: 'John Doe', phone_number: '+15551234567' })

// Generate multiple mock objects
const users = generateMockUsers(5, { organization_id: organization.id })
const contacts = generateMockContacts(10, { organization_id: organization.id })
```

### Supabase Mock Client

```typescript
import { createMockSupabaseClient } from '@/tests/utils/test-helpers'

const mockSupabase = createMockSupabaseClient()

// Mock query responses
mockSupabase.from('profiles').select.mockResolvedValue({
  data: [user],
  error: null,
})

// Test your code
const result = await mockSupabase.from('profiles').select('*')
expect(result.data).toEqual([user])
```

### Async Testing Utilities

```typescript
import { waitForAsync, wait, flushPromises } from '@/tests/utils/test-helpers'

// Wait for async operations
await waitForAsync()

// Wait for specific time
await wait(1000) // 1 second

// Flush all pending promises
await flushPromises()
```

## Mock Clients

### Redis Mock Client (`mock-redis.ts`)

Mock Redis operations with in-memory storage:

```typescript
import { createMockRedisClient, createSharedRedisStorage } from '@/tests/utils/mock-redis'

// Basic usage
const mockRedis = createMockRedisClient()
await mockRedis.set('key', 'value', { ex: 60 })
const value = await mockRedis.get('key')
expect(value).toBe('value')

// Shared storage for coordinated tests
const storage = createSharedRedisStorage()
const client1 = createMockRedisClient(storage)
const client2 = createMockRedisClient(storage)
await client1.set('shared-key', 'shared-value')
const value = await client2.get('shared-key')
expect(value).toBe('shared-value')

// Verify mock calls
expect(mockRedis.get).toHaveBeenCalledWith('key')
expect(mockRedis.set).toHaveBeenCalledWith('key', 'value', { ex: 60 })
```

**Supported Operations:**
- String: `get`, `set`, `del`, `exists`, `expire`, `ttl`, `incr`, `decr`
- Hash: `hget`, `hset`, `hdel`, `hgetall`
- Set: `sadd`, `smembers`, `srem`
- Sorted Set: `zadd`, `zrange`, `zrem`
- List: `lpush`, `rpush`, `lpop`, `rpop`, `lrange`
- Database: `flushall`, `flushdb`, `keys`, `scan`, `ping`

### BullMQ Mock (`mock-bullmq.ts`)

Mock job queue operations without Redis:

```typescript
import {
  createMockQueue,
  createMockWorker,
  createMockQueueEvents,
  simulateJobProcessing,
} from '@/tests/utils/mock-bullmq'

// Create queue and add jobs
const queue = createMockQueue('email-queue')
const job = await queue.add('send-email', {
  to: 'test@example.com',
  subject: 'Test Email',
})

// Create worker with processor
const worker = createMockWorker('email-queue', async (job) => {
  console.log('Processing:', job.data)
  await job.updateProgress(50)
  return { sent: true }
})

// Simulate job processing
await simulateJobProcessing(queue, worker, job.id)

// Queue events
const queueEvents = createMockQueueEvents('email-queue')
queueEvents.on('completed', (job) => {
  console.log('Job completed:', job.id)
})

// Verify operations
expect(queue.add).toHaveBeenCalledWith('send-email', expect.any(Object))
expect(worker.process).toHaveBeenCalled()
```

### WhatsApp API Mock (`mock-whatsapp.ts`)

Mock WhatsApp Business Cloud API responses:

```typescript
import {
  mockWhatsAppResponses,
  mockWhatsAppWebhooks,
  createWhatsAppFetchMock,
} from '@/tests/utils/mock-whatsapp'

// Mock fetch for WhatsApp API
global.fetch = createWhatsAppFetchMock()

// Test message sending
const response = await fetch('https://graph.facebook.com/v18.0/123456/messages', {
  method: 'POST',
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    to: '+15551234567',
    type: 'text',
    text: { body: 'Hello, World!' },
  }),
})
const data = await response.json()
expect(data.messages[0].id).toMatch(/^wamid\.test_/)

// Test webhook handling
const webhook = mockWhatsAppWebhooks.incomingTextMessage('+15559876543', 'Hello!')
await handleWebhook(webhook)

// Test error scenarios
const errorResponse = mockWhatsAppResponses.errors.invalidPhoneNumber()
```

### Stripe API Mock (`mock-stripe.ts`)

Mock Stripe SDK operations:

```typescript
import {
  createMockStripeClient,
  createMockStripeCustomer,
  createMockStripeSubscription,
  mockStripeWebhookEvents,
} from '@/tests/utils/mock-stripe'

// Mock Stripe client
const mockStripe = createMockStripeClient()
jest.mock('stripe', () => jest.fn(() => mockStripe))

// Test subscription creation
const subscription = await mockStripe.subscriptions.create({
  customer: 'cus_test123',
  items: [{ price: 'price_test123' }],
})
expect(subscription.status).toBe('active')
expect(mockStripe.subscriptions.create).toHaveBeenCalled()

// Test webhook handling
const customer = createMockStripeCustomer({ email: 'test@example.com' })
const subscription = createMockStripeSubscription({ customer: customer.id })
const event = mockStripeWebhookEvents.subscriptionCreated(subscription)
await handleStripeWebhook(event)
```

## Writing Tests

### Unit Test Example

```typescript
// src/lib/cache/__tests__/cache.test.ts
import { createMockRedisClient } from '@/tests/utils/mock-redis'
import { CacheService } from '../cache-service'

describe('CacheService', () => {
  let mockRedis: ReturnType<typeof createMockRedisClient>
  let cacheService: CacheService

  beforeEach(() => {
    mockRedis = createMockRedisClient()
    cacheService = new CacheService(mockRedis)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should set and get cache values', async () => {
    await cacheService.set('test-key', { data: 'test-value' })
    const value = await cacheService.get('test-key')

    expect(value).toEqual({ data: 'test-value' })
    expect(mockRedis.set).toHaveBeenCalledWith('test-key', expect.any(String), { ex: 3600 })
  })

  it('should return null for missing keys', async () => {
    const value = await cacheService.get('non-existent-key')
    expect(value).toBeNull()
  })
})
```

### Integration Test Example

```typescript
// tests/integration/api/messages.test.ts
import { createMockSupabaseClient } from '@/tests/utils/test-helpers'
import { createMockQueue } from '@/tests/utils/mock-bullmq'
import { POST } from '@/app/api/messages/route'

describe('/api/messages', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>
  let mockQueue: ReturnType<typeof createMockQueue>

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient()
    mockQueue = createMockQueue('message-queue')
  })

  it('should send a WhatsApp message', async () => {
    const request = new Request('http://localhost:3000/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        to: '+15551234567',
        message: 'Test message',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockQueue.add).toHaveBeenCalled()
  })
})
```

### Component Test Example

```typescript
// src/components/messaging/__tests__/MessageInput.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageInput } from '../MessageInput'

describe('MessageInput', () => {
  it('should send message on submit', async () => {
    const user = userEvent.setup()
    const onSend = jest.fn()

    render(<MessageInput onSend={onSend} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'Test message')

    const submitButton = screen.getByRole('button', { name: /send/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(onSend).toHaveBeenCalledWith('Test message')
    })
  })
})
```

## Best Practices

### 1. Test Organization

- **Unit tests**: Place in `__tests__` folder next to source files
- **Integration tests**: Place in `tests/integration/` directory
- **Component tests**: Place in `tests/component/` or component `__tests__` folders
- **E2E tests**: Place in `tests/e2e/` directory

### 2. Test Naming

```typescript
describe('ComponentName or FunctionName', () => {
  describe('when condition', () => {
    it('should expected behavior', async () => {
      // Test implementation
    })
  })
})
```

### 3. Mock Best Practices

- **Reset mocks**: Use `jest.clearAllMocks()` in `afterEach`
- **Avoid global mocks**: Create mocks in test setup when possible
- **Verify calls**: Use `.toHaveBeenCalledWith()` to verify mock interactions
- **Shared storage**: Use shared storage for coordinated mock tests

### 4. Async Testing

```typescript
// ✅ Good - properly handle async
it('should handle async operation', async () => {
  await someAsyncFunction()
  expect(result).toBe(expected)
})

// ❌ Bad - missing await
it('should handle async operation', () => {
  someAsyncFunction() // Missing await!
  expect(result).toBe(expected)
})
```

### 5. Coverage Requirements

Minimum coverage thresholds:
- **Global**: 60% statements, branches, functions, lines
- **Cache library**: 70% all metrics
- **Crypto library**: 70% all metrics
- **Security library**: 70% all metrics
- **API routes**: 50% all metrics

### 6. Test Data

- Use mock data factories from `test-helpers.ts`
- Align mock data with actual database schema
- Use realistic data values (phone numbers, emails, etc.)
- Generate multiple objects with `generate*` functions

## Troubleshooting

### Common Issues

#### 1. Module Resolution Errors

**Problem**: Cannot find module '@/...'

**Solution**: Check `jest.config.js` module name mapper:
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

#### 2. TypeScript Compilation Errors

**Problem**: TypeScript errors during test execution

**Solution**: Verify `tsconfig.json` and ensure strict mode is enabled

#### 3. Async Test Timeouts

**Problem**: Tests timeout waiting for async operations

**Solution**: Increase timeout or use proper async utilities:
```typescript
jest.setTimeout(10000) // Increase timeout to 10 seconds

it('should complete async operation', async () => {
  await waitFor(() => {
    expect(condition).toBe(true)
  }, { timeout: 5000 })
})
```

#### 4. React 19 Compatibility

**Problem**: React Testing Library warnings with React 19

**Solution**: Use React 19 compatible versions:
- `@testing-library/react@15.0.0+`
- `react@19.1.0`
- `react-dom@19.1.0`

#### 5. Mock Not Working

**Problem**: Mocks not intercepting calls

**Solution**:
- Verify mock is created before code execution
- Use `jest.mock()` at top of test file
- Clear mocks between tests with `jest.clearAllMocks()`

### Debug Tips

```typescript
// 1. Log mock calls
console.log(mockFunction.mock.calls)

// 2. Debug component state
const { debug } = render(<Component />)
debug() // Prints DOM

// 3. Check mock implementation
expect(mockFunction).toHaveBeenCalledTimes(1)
expect(mockFunction).toHaveBeenCalledWith(expectedArgs)

// 4. Use screen.debug() for component tests
import { screen } from '@testing-library/react'
screen.debug() // Print current DOM
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](https://testingjavascript.com/)

## Support

For issues or questions about the testing infrastructure:
1. Check this README for common solutions
2. Review existing tests for examples
3. Consult the project's main documentation
4. Ask the development team

---

**Last Updated**: Week 3 - Testing Infrastructure Implementation
**Version**: 1.0.0
**Maintainer**: ADSapp Development Team
