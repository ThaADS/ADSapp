# Tenant Validation Middleware

Comprehensive middleware infrastructure for securing multi-tenant API routes in ADSapp.

## Overview

This middleware provides:

- **Tenant Validation**: Prevents cross-tenant data access
- **Rate Limiting**: Protects against abuse and DDoS attacks
- **Middleware Composition**: Flexible combination of security layers
- **Redis-Ready**: Production-ready with Redis backend support

## Quick Start

### Basic Usage in API Routes

```typescript
import { NextRequest } from 'next/server'
import { standardApiMiddleware, getTenantContext } from '@/lib/middleware'
import { createClient } from '@/lib/supabase/server'
import { createSuccessResponse, createErrorResponse } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  // Apply tenant validation and rate limiting
  const middlewareResponse = await standardApiMiddleware(request)
  if (middlewareResponse) return middlewareResponse

  // Extract tenant context from request headers
  const { userId, organizationId } = getTenantContext(request)

  try {
    const supabase = await createClient()

    // Query is automatically scoped to user's organization
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return createSuccessResponse({ contacts })
  } catch (error) {
    return createErrorResponse(error)
  }
}
```

## Middleware Components

### 1. Tenant Validation

Ensures all requests are scoped to the authenticated user's organization.

```typescript
import { validateTenantAccess, getTenantContext } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  // Validate tenant access
  const validation = await validateTenantAccess(request)
  if (validation) return validation // Returns error if validation fails

  // Get tenant context
  const { userId, organizationId, userRole } = getTenantContext(request)

  // Your API logic here...
}
```

**Features:**

- JWT authentication verification
- Organization membership validation
- Cross-tenant access prevention
- Security event logging
- Super admin bypass support

### 2. Rate Limiting

Protects endpoints from abuse with configurable rate limits.

```typescript
import { createRateLimiter, rateLimitConfigs } from '@/lib/middleware'

// Standard rate limiting (100 req/min)
const rateLimit = createRateLimiter(rateLimitConfigs.standard)

export async function GET(request: NextRequest) {
  const limitResponse = await rateLimit(request)
  if (limitResponse) return limitResponse

  // Your API logic here...
}
```

**Available Configurations:**

- `standard`: 100 requests per minute
- `strict`: 30 requests per minute (sensitive operations)
- `relaxed`: 300 requests per minute (read operations)
- `auth`: 5 attempts per 15 minutes (authentication)
- `passwordReset`: 3 attempts per hour
- `ddos`: 100 requests per second (DDoS protection)

### 3. Middleware Composition

Combine multiple middleware functions for layered security.

```typescript
import {
  composeMiddleware,
  validateTenantAccess,
  createRateLimiter,
  rateLimitConfigs,
} from '@/lib/middleware'

// Create custom middleware stack
const customMiddleware = composeMiddleware(
  validateTenantAccess,
  createRateLimiter(rateLimitConfigs.strict)
)

export async function DELETE(request: NextRequest) {
  const response = await customMiddleware(request)
  if (response) return response

  // Your API logic here...
}
```

## Pre-configured Middleware

### Standard API Middleware

For most API endpoints (tenant validation + standard rate limit).

```typescript
import { standardApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  const response = await standardApiMiddleware(request)
  if (response) return response

  const { organizationId } = getTenantContext(request)
  // Your logic...
}
```

### Strict API Middleware

For sensitive operations (tenant validation + strict rate limit).

```typescript
import { strictApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  const response = await strictApiMiddleware(request)
  if (response) return response

  // Your logic for sensitive operation...
}
```

### Public API Middleware

For public endpoints (rate limiting only, no tenant validation).

```typescript
import { publicApiMiddleware } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  const response = await publicApiMiddleware(request)
  if (response) return response

  // Public endpoint logic...
}
```

### Auth Middleware

For authentication endpoints (strict rate limiting).

```typescript
import { authMiddleware } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  const response = await authMiddleware(request)
  if (response) return response

  // Authentication logic...
}
```

## Advanced Usage

### Custom Rate Limiter

Create rate limiters with custom configurations.

```typescript
import { createRateLimiter } from '@/lib/middleware'

const customRateLimit = createRateLimiter({
  windowMs: 30000, // 30 seconds
  maxRequests: 50, // 50 requests per 30 seconds
  message: 'Custom rate limit exceeded',
})

export async function POST(request: NextRequest) {
  const limitResponse = await customRateLimit(request)
  if (limitResponse) return limitResponse

  // Your logic...
}
```

### User-Based Rate Limiting

Rate limit by authenticated user instead of IP address.

```typescript
import { createUserRateLimiter, rateLimitConfigs } from '@/lib/middleware'

const userRateLimit = createUserRateLimiter({
  windowMs: 60000,
  maxRequests: 30, // 30 requests per minute per user
})

export async function POST(request: NextRequest) {
  const limitResponse = await userRateLimit(request)
  if (limitResponse) return limitResponse

  // Your logic...
}
```

### Organization-Based Rate Limiting

Rate limit by organization for fair resource allocation.

```typescript
import { createOrgRateLimiter, rateLimitConfigs } from '@/lib/middleware'

const orgRateLimit = createOrgRateLimiter({
  windowMs: 60000,
  maxRequests: 1000, // 1000 requests per minute per organization
})

export async function GET(request: NextRequest) {
  const limitResponse = await orgRateLimit(request)
  if (limitResponse) return limitResponse

  // Your logic...
}
```

### Conditional Middleware

Apply middleware only when certain conditions are met.

```typescript
import { conditionalMiddleware, createRateLimiter, rateLimitConfigs } from '@/lib/middleware'

// Only rate limit POST requests
const conditionalLimit = conditionalMiddleware(
  req => req.method === 'POST',
  createRateLimiter(rateLimitConfigs.strict)
)

export async function POST(request: NextRequest) {
  const response = await conditionalLimit(request)
  if (response) return response

  // Your logic...
}
```

### Resource Ownership Validation

Validate that a resource belongs to the user's organization.

```typescript
import { standardApiMiddleware, getTenantContext, validateResourceAccess } from '@/lib/middleware'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const response = await standardApiMiddleware(request)
  if (response) return response

  const context = getTenantContext(request)
  const supabase = await createClient()

  // Fetch the resource
  const { data: contact } = await supabase
    .from('contacts')
    .select('organization_id')
    .eq('id', params.id)
    .single()

  // Validate ownership
  if (!contact || !validateResourceAccess(contact.organization_id, context)) {
    return NextResponse.json({ error: 'Contact not found or access denied' }, { status: 404 })
  }

  // Proceed with deletion...
}
```

## Helper Functions

### getTenantContextFromHeaders (api-utils)

Extract tenant context in API routes after middleware has run.

```typescript
import { getTenantContextFromHeaders } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  const { userId, organizationId, userRole, isSuperAdmin } = getTenantContextFromHeaders(request)

  // Use tenant context in your logic...
}
```

### validateResourceOwnership (api-utils)

Validate resource ownership and throw ApiException if access denied.

```typescript
import { validateResourceOwnership, getTenantContextFromHeaders } from '@/lib/api-utils'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const { organizationId, isSuperAdmin } = getTenantContextFromHeaders(request)
  const resource = await fetchResource(params.id)

  // Throws ApiException if access denied
  validateResourceOwnership(resource.organization_id, organizationId, isSuperAdmin)

  // Proceed with update...
}
```

### createTenantScopedQuery (api-utils)

Create Supabase query automatically scoped to organization.

```typescript
import { createTenantScopedQuery, getTenantContextFromHeaders } from '@/lib/api-utils'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { organizationId } = getTenantContextFromHeaders(request)

  // Automatically filters by organization_id
  const { data } = await createTenantScopedQuery(supabase, 'contacts', organizationId)
    .eq('is_blocked', false)
    .order('created_at', { ascending: false })

  // Use data...
}
```

## Production Deployment with Redis

For production environments, use Redis for distributed rate limiting across multiple server instances.

### Setup Redis

```typescript
// lib/redis.ts
import Redis from 'ioredis'

export const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')
```

### Use Redis Rate Limiter

```typescript
import { RedisRateLimiter, rateLimitConfigs } from '@/lib/middleware'
import { redis } from '@/lib/redis'

const redisRateLimiter = new RedisRateLimiter(redis)

const rateLimit = redisRateLimiter.createMiddleware(rateLimitConfigs.standard)

export async function GET(request: NextRequest) {
  const limitResponse = await rateLimit(request)
  if (limitResponse) return limitResponse

  // Your logic...
}
```

## Security Best Practices

1. **Always Apply Middleware First**: Run middleware before any business logic
2. **Validate Resource Ownership**: Double-check resource ownership after fetching
3. **Use Super Admin Checks**: Properly handle super admin access patterns
4. **Log Security Events**: All cross-tenant attempts are logged for monitoring
5. **Rate Limit Appropriately**: Use stricter limits for sensitive operations
6. **Monitor Headers**: Check X-RateLimit-\* headers in responses

## Testing

The middleware includes comprehensive integration tests. Run them with:

```bash
npm run test tests/integration/tenant-validation.test.ts
```

## Error Responses

### 401 Unauthorized

```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

### 403 Forbidden

```json
{
  "error": "Forbidden: Access to this organization denied",
  "code": "FORBIDDEN"
}
```

### 429 Too Many Requests

```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45
}
```

**Headers:**

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds until retry allowed

## Migration Guide

### Migrating Existing API Routes

**Before:**

```typescript
export async function GET(request: NextRequest) {
  const user = await requireAuthenticatedUser()
  const userOrg = await getUserOrganization(user.id)

  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('organization_id', userOrg.organization_id)

  return createSuccessResponse({ contacts: data })
}
```

**After:**

```typescript
export async function GET(request: NextRequest) {
  // Apply middleware
  const response = await standardApiMiddleware(request)
  if (response) return response

  // Get tenant context from headers
  const { organizationId } = getTenantContext(request)

  const { data } = await supabase.from('contacts').select('*').eq('organization_id', organizationId)

  return createSuccessResponse({ contacts: data })
}
```

## Support

For issues or questions about the middleware:

1. Check this documentation
2. Review integration tests for examples
3. Contact the backend team

## License

Internal use only - ADSapp proprietary code
