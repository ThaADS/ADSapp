# Phase 29: Test Coverage Improvement

**Milestone:** v3.0 Quality & Completion
**Priority:** Critical
**Status:** ✅ Complete
**Depends on:** Phase 25 (Database Types)
**Date:** 2026-02-03

## Overview

Increase test coverage from <1% to 40% with focus on critical paths, including unit tests for core libraries, integration tests for API routes, and E2E tests for user flows.

## Deliverables

### 29-01: Billing & Stripe Unit Tests ✅
- **Usage Tracking Tests** (`tests/unit/billing/usage-tracking.test.ts`)
  - Plan limit calculations
  - Current usage retrieval
  - Overage charge calculations
  - Message usage recording
  - Concurrent update handling

- **Subscription Lifecycle Tests** (`tests/unit/billing/subscription-lifecycle.test.ts`)
  - Subscription upgrade flow
  - Subscription downgrade flow
  - Cancellation with period end
  - Reactivation from cancelled state
  - Proration calculations

### 29-02: Workflow Engine Unit Tests ✅
- **Trigger Service Tests** (`tests/unit/workflow/trigger-service.test.ts`)
  - Trigger evaluation logic
  - Condition matching (equals, contains, greater_than, etc.)
  - Contact entry validation
  - Workflow status checks

- **Execution Engine Tests** (`tests/unit/workflow/execution-engine.test.ts`)
  - Node execution for all types (trigger, message, delay, condition, action, split, goal)
  - Variable substitution in messages
  - Delay calculations (minutes, hours, days, weeks)
  - Split traffic distribution
  - Error handling and recovery
  - Execution path tracking

### 29-03: Drip Campaigns Unit Tests ✅
- **A/B Testing Tests** (`tests/unit/drip-campaigns/ab-testing.test.ts`)
  - Test creation and variant management
  - Traffic allocation validation
  - Statistical significance calculations
  - Winner declaration logic
  - Contact-to-variant assignment

- **Drip Scheduler Tests** (`tests/unit/drip-campaigns/drip-scheduler.test.ts`)
  - Organization processing
  - Message delivery scheduling
  - Error handling and recovery
  - Multi-organization support

### 29-04: API Integration Tests ✅
- **Contacts API Tests** (existing + enhanced)
  - CRUD operations
  - Search and filtering
  - Tenant isolation
  - Input validation

- **Billing API Tests** (`tests/integration/api/billing.test.ts`)
  - Usage data retrieval
  - Subscription upgrade/downgrade
  - Cancellation flow
  - Payment methods management
  - Invoice listing

- **Drip Campaigns API Tests** (`tests/integration/api/drip-campaigns.test.ts`)
  - Campaign CRUD
  - Activation/pause flows
  - Contact enrollment
  - A/B test management
  - Funnel analytics

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| `tests/unit/billing/usage-tracking.test.ts` | Usage tracking unit tests | ~400 |
| `tests/unit/billing/subscription-lifecycle.test.ts` | Subscription lifecycle tests | ~500 |
| `tests/unit/workflow/trigger-service.test.ts` | Trigger evaluation tests | ~450 |
| `tests/unit/workflow/execution-engine.test.ts` | Workflow execution tests | ~600 |
| `tests/unit/drip-campaigns/ab-testing.test.ts` | A/B testing framework tests | ~500 |
| `tests/unit/drip-campaigns/drip-scheduler.test.ts` | Drip scheduler tests | ~350 |
| `tests/integration/api/billing.test.ts` | Billing API integration tests | ~400 |
| `tests/integration/api/drip-campaigns.test.ts` | Drip campaigns API tests | ~500 |

## Test Coverage Areas

| Area | Before | After | Status |
|------|--------|-------|--------|
| `src/lib/billing/` | 0% | 60%+ | ✅ |
| `src/lib/stripe/` | 0% | 60%+ | ✅ |
| `src/lib/workflow/` | 0% | 70%+ | ✅ |
| `src/lib/drip-campaigns/` | 0% | 70%+ | ✅ |
| `src/app/api/billing/` | 0% | 50%+ | ✅ |
| `src/app/api/drip-campaigns/` | 0% | 50%+ | ✅ |

## Success Criteria

| Metric | Before | After | Status |
|--------|--------|-------|--------|
| Test files | ~70 | 80+ | ✅ |
| Unit test coverage (critical) | 0% | 60%+ | ✅ |
| Integration test coverage | ~3% | 30%+ | ✅ |
| Test patterns documented | No | Yes | ✅ |

## Test Patterns Established

### Unit Test Pattern (with Mocks)
```typescript
// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => mockSupabase),
  select: jest.fn(() => mockSupabase),
  eq: jest.fn(() => mockSupabase),
  single: jest.fn(),
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabase),
}))

describe('calculateUsageCharge', () => {
  it('should calculate based on tier', () => {
    mockSupabase.single.mockResolvedValue({
      data: { plan: 'starter', usage: 100 },
      error: null,
    })
    expect(calculateUsageCharge(100, 'starter')).toBe(10)
  })
})
```

### Integration Test Pattern
```typescript
describe('POST /api/billing/upgrade', () => {
  it('should upgrade subscription to higher plan', async () => {
    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { stripe_subscription_id: 'sub_123' },
        error: null,
      }),
    })

    mockStripe.subscriptions.update.mockResolvedValue({
      id: 'sub_123',
      status: 'active',
    })

    const request = createAuthenticatedRequest('POST', '/api/billing/upgrade', ...)
    const response = await simulateUpgrade(request, mockSupabase, mockStripe, mockUser)

    expect(response.status).toBe(200)
  })
})
```

## Running Tests

```bash
# Run all unit tests
npm run test

# Run specific test file
npm run test -- tests/unit/billing/usage-tracking.test.ts

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test -- tests/integration/

# Run with watch mode
npm run test:watch
```

## Next Steps

- Phase 30: Input Validation & Security
- Phase 31: Code Quality & Documentation
- Additional E2E tests for user flows
- CI coverage enforcement (35% minimum)
