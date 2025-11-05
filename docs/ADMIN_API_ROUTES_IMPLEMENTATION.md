# Admin API Routes Implementation Summary

## Overview
Created 6 missing backend API routes to fix 404 errors on admin dashboard tabs. All routes follow established patterns from the codebase with proper authentication, error handling, and data aggregation.

## Routes Created

### 1. Analytics Route
**File**: `src/app/api/admin/analytics/route.ts`
**Endpoint**: `GET /api/admin/analytics?range={7d|30d|90d|1y}`

**Features**:
- Time-series analytics data for dashboard charts
- Metrics with percentage change calculations:
  - User growth (total users, change vs previous period)
  - Message volume (total messages, change vs previous period)
  - Active organizations (count, change vs previous period)
  - Revenue (total, change vs previous period)
- Chart data aggregated by day with users, messages, and revenue
- Supports multiple time ranges: 7d, 30d, 90d, 1y

**Response Format**:
```json
{
  "userGrowth": { "total": 150, "change": 12.5 },
  "messageVolume": { "total": 5432, "change": 8.3 },
  "activeOrganizations": { "total": 45, "change": 5.0 },
  "revenue": { "total": 4485.00, "change": 15.2 },
  "chartData": [
    { "date": "2025-09-21", "users": 5, "messages": 234, "revenue": 145.50 },
    ...
  ],
  "range": "30d",
  "startDate": "2025-09-21T...",
  "endDate": "2025-10-21T..."
}
```

### 2. Billing Metrics Route
**File**: `src/app/api/admin/billing/metrics/route.ts`
**Endpoint**: `GET /api/admin/billing/metrics`

**Features**:
- High-level billing KPIs for dashboard
- Metrics calculated:
  - MRR (Monthly Recurring Revenue)
  - ARR (Annual Recurring Revenue)
  - Active subscriptions count
  - Churn rate (30-day rolling)
  - Average revenue per organization
  - Actual monthly revenue from billing events
- Subscription distribution by tier

**Response Format**:
```json
{
  "mrr": 4485.00,
  "arr": 53820.00,
  "activeSubscriptions": 45,
  "churnRate": 2.5,
  "avgRevenuePerOrg": 99.67,
  "actualMonthlyRevenue": 4512.50,
  "metrics": {
    "totalOrganizations": 48,
    "activeOrganizations": 45,
    "trialOrganizations": 3,
    "cancelledThisMonth": 1
  }
}
```

### 3. Billing Subscriptions Route
**File**: `src/app/api/admin/billing/subscriptions/route.ts`
**Endpoint**: `GET /api/admin/billing/subscriptions`

**Features**:
- Detailed subscription list for billing dashboard
- Includes for each subscription:
  - Organization details (name, slug)
  - Subscription tier and status
  - MRR value
  - Stripe customer and subscription IDs
  - Billing email
  - Start date and next billing date
  - Trial end date (if applicable)
- Sorted by MRR descending (highest paying customers first)
- Summary statistics

**Response Format**:
```json
{
  "subscriptions": [
    {
      "id": "uuid",
      "organizationName": "Acme Corp",
      "organizationSlug": "acme-corp",
      "tier": "enterprise",
      "status": "active",
      "mrr": 299.00,
      "stripeCustomerId": "cus_xxx",
      "stripeSubscriptionId": "sub_xxx",
      "billingEmail": "billing@acme.com",
      "startDate": "2025-09-01T...",
      "nextBillingDate": "2025-11-01T...",
      "trialEndsAt": null,
      "createdAt": "2025-09-01T...",
      "updatedAt": "2025-10-01T..."
    },
    ...
  ],
  "summary": {
    "totalSubscriptions": 48,
    "activeSubscriptions": 45,
    "trialSubscriptions": 3,
    "cancelledSubscriptions": 0,
    "totalMRR": 4485.00,
    "byTier": {
      "starter": 20,
      "professional": 15,
      "enterprise": 10
    }
  }
}
```

### 4. Webhooks Main Route
**File**: `src/app/api/admin/webhooks/route.ts`
**Endpoint**: `GET /api/admin/webhooks?limit=50&offset=0&eventType=xxx&status=xxx`

**Features**:
- Main webhook events listing endpoint
- Moved from `/events` sub-path to main `/webhooks` path
- Pagination support (limit, offset)
- Filtering by event type and status
- Includes webhook statistics from `WebhookHandler`
- Lists available event types and statuses for filters

**Response Format**:
```json
{
  "success": true,
  "events": [
    {
      "id": "uuid",
      "stripe_event_id": "evt_xxx",
      "event_type": "customer.subscription.created",
      "status": "completed",
      "payload": {...},
      "error_message": null,
      "retry_count": 0,
      "next_retry_at": null,
      "processed_at": "2025-10-21T...",
      "created_at": "2025-10-21T..."
    },
    ...
  ],
  "statistics": {...},
  "pagination": {
    "total": 1234,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  },
  "filters": {
    "available": {
      "eventTypes": [...],
      "statuses": ["processing", "completed", "failed"]
    },
    "applied": { "eventType": null, "status": null }
  }
}
```

### 5. Webhooks Stats Route
**File**: `src/app/api/admin/webhooks/stats/route.ts`
**Endpoint**: `GET /api/admin/webhooks/stats`

**Features**:
- Comprehensive webhook processing statistics
- Metrics calculated:
  - Total events count
  - Successful events count
  - Failed events count
  - Processing events count
  - Average processing time (milliseconds)
  - Success rate (percentage)
- Event type distribution with status breakdown
- Recent errors (last 24 hours)

**Response Format**:
```json
{
  "total": 1234,
  "successful": 1180,
  "failed": 42,
  "pending": 0,
  "processing": 12,
  "avgProcessingTime": 234,
  "successRate": 95.62,
  "eventTypeStats": {
    "customer.subscription.created": {
      "total": 45,
      "completed": 44,
      "failed": 1,
      "pending": 0,
      "processing": 0
    },
    ...
  },
  "recentErrors": [
    {
      "id": "uuid",
      "event_type": "invoice.payment_failed",
      "error_message": "Payment method failed",
      "created_at": "2025-10-21T..."
    },
    ...
  ]
}
```

### 6. Webhooks Retry Route
**File**: `src/app/api/admin/webhooks/[id]/retry/route.ts`
**Endpoints**:
- `POST /api/admin/webhooks/{eventId}/retry` - Retry failed webhook
- `GET /api/admin/webhooks/{eventId}/retry` - Check retry status

**Features**:
- Manual retry of failed webhook events
- Validation:
  - Event ID must be valid UUID
  - Event must exist
  - Event must be in failed status
  - Retry count must be below maximum (5)
- Uses `WebhookHandler.retryFailedWebhook()` for actual retry
- GET endpoint provides retry eligibility check

**POST Response Format**:
```json
{
  "success": true,
  "message": "Webhook event retried successfully",
  "eventId": "uuid",
  "processed": true,
  "alreadyProcessed": false
}
```

**GET Response Format**:
```json
{
  "event": {
    "id": "uuid",
    "stripeEventId": "evt_xxx",
    "eventType": "invoice.payment_failed",
    "status": "failed",
    "retryCount": 2,
    "errorMessage": "Payment method failed",
    "createdAt": "2025-10-21T...",
    "processedAt": null,
    "nextRetryAt": "2025-10-21T..."
  },
  "retryInfo": {
    "canRetry": true,
    "maxRetries": 5,
    "remainingRetries": 3,
    "reason": null
  }
}
```

## Implementation Details

### Authentication & Authorization
- All routes use `adminMiddleware` from `@/lib/middleware`
- Validates super admin access via `is_super_admin` field in profiles table
- Returns 401 for unauthenticated requests
- Returns 403 for non-super-admin users

### Error Handling
- Consistent error response format across all routes
- Proper HTTP status codes (400, 401, 403, 404, 500)
- Error logging to console for debugging
- Graceful fallbacks for missing data

### Database Queries
- Uses RLS-enabled Supabase client for data access
- Parallel queries with `Promise.all()` for performance
- Proper date range filtering for time-series data
- Efficient aggregation queries

### Data Validation
- UUID format validation for route parameters
- Query parameter parsing with defaults
- Null/undefined checks for optional fields
- Type-safe database queries

### Performance Optimizations
- Parallel database queries where possible
- Efficient aggregation using reduce operations
- Limited result sets for large data (e.g., 1000 events max for stats)
- Date-based indexing for time-series queries

## Schema Fixes Applied

### Webhook Events Table
- Field name: `created_at` (not `received_at`)
- Status enum: `'processing' | 'completed' | 'failed'` (no `'pending'`)
- Updated all routes to use correct field names and status values

## Testing Recommendations

1. **Analytics Route**:
   - Test with different time ranges (7d, 30d, 90d, 1y)
   - Verify chart data aggregation accuracy
   - Check percentage change calculations

2. **Billing Routes**:
   - Verify MRR/ARR calculations
   - Test churn rate with recent cancellations
   - Check subscription sorting by MRR

3. **Webhook Routes**:
   - Test pagination with large event sets
   - Verify filtering by event type and status
   - Test retry functionality with failed events
   - Check retry limits enforcement

## API Documentation

All routes are documented with:
- JSDoc comments explaining purpose
- Clear parameter descriptions
- Response format examples
- Error scenarios

## Next Steps

1. Update frontend components to use new API endpoints
2. Remove `/api/admin/webhooks/events/route.ts` if no longer needed
3. Add integration tests for all routes
4. Monitor performance in production
5. Consider adding rate limiting for retry endpoint

## Files Modified

- Created: `src/app/api/admin/analytics/route.ts`
- Created: `src/app/api/admin/billing/metrics/route.ts`
- Created: `src/app/api/admin/billing/subscriptions/route.ts`
- Created: `src/app/api/admin/webhooks/route.ts`
- Created: `src/app/api/admin/webhooks/stats/route.ts`
- Created: `src/app/api/admin/webhooks/[id]/retry/route.ts`
- Updated: Schema alignment for webhook_events table references

## Related Files

- `src/lib/middleware/index.ts` - Admin middleware for authentication
- `src/lib/billing/webhook-handler.ts` - Webhook processing and retry logic
- `src/app/api/admin/billing/route.ts` - Original billing route (kept for events view)
- `src/app/api/admin/organizations/route.ts` - Pattern reference
- `src/app/api/admin/dashboard/route.ts` - Pattern reference
