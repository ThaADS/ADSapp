# Tenant Validation Middleware - Quick Reference

## 🚀 Quick Start

### Standard API Route

```typescript
import { standardApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function GET(request: NextRequest) {
  const response = await standardApiMiddleware(request)
  if (response) return response

  const { organizationId } = getTenantContext(request)
  // Your logic here...
}
```

### Strict API Route (Sensitive Operations)

```typescript
import { strictApiMiddleware, getTenantContext } from '@/lib/middleware'

export async function POST(request: NextRequest) {
  const response = await strictApiMiddleware(request)
  if (response) return response

  // Your logic here...
}
```

## 📦 Pre-configured Middleware

| Middleware              | Use Case             | Rate Limit       |
| ----------------------- | -------------------- | ---------------- |
| `standardApiMiddleware` | Most API endpoints   | 100 req/min      |
| `strictApiMiddleware`   | Sensitive operations | 30 req/min       |
| `publicApiMiddleware`   | Public endpoints     | 300 req/min      |
| `authMiddleware`        | Authentication       | 5 attempts/15min |

## 🔑 Key Functions

### Get Tenant Context

```typescript
const { userId, organizationId, userRole, userEmail } = getTenantContext(request)
```

### Validate Resource Access

```typescript
if (!validateResourceAccess(resource.organization_id, context)) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}
```

### Check Super Admin

```typescript
if (isSuperAdmin(request)) {
  // Allow access to all resources
}
```

## 🛠️ Custom Rate Limiters

### IP-Based

```typescript
import { createIpRateLimiter } from '@/lib/middleware'

const rateLimit = createIpRateLimiter({
  windowMs: 60000,
  maxRequests: 100,
})
```

### User-Based

```typescript
import { createUserRateLimiter } from '@/lib/middleware'

const rateLimit = createUserRateLimiter({
  windowMs: 60000,
  maxRequests: 50,
})
```

### Organization-Based

```typescript
import { createOrgRateLimiter } from '@/lib/middleware'

const rateLimit = createOrgRateLimiter({
  windowMs: 60000,
  maxRequests: 1000,
})
```

## 🔧 API Utils Helpers

### Get Context from Headers

```typescript
import { getTenantContextFromHeaders } from '@/lib/api-utils'

const { organizationId, isSuperAdmin } = getTenantContextFromHeaders(request)
```

### Validate Resource Ownership

```typescript
import { validateResourceOwnership } from '@/lib/api-utils'

// Throws ApiException if access denied
validateResourceOwnership(resource.organization_id, organizationId, isSuperAdmin)
```

### Create Scoped Query

```typescript
import { createTenantScopedQuery } from '@/lib/api-utils'

const { data } = await createTenantScopedQuery(supabase, 'contacts', organizationId).eq(
  'is_blocked',
  false
)
```

## ⚠️ Error Responses

| Status | Code                | Description                |
| ------ | ------------------- | -------------------------- |
| 401    | UNAUTHORIZED        | Authentication required    |
| 403    | FORBIDDEN           | Cross-tenant access denied |
| 429    | RATE_LIMIT_EXCEEDED | Too many requests          |

## 📊 Rate Limit Headers

All responses include:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## 🎯 Rate Limit Configurations

```typescript
import { rateLimitConfigs } from '@/lib/middleware'

rateLimitConfigs.standard // 100 req/min
rateLimitConfigs.strict // 30 req/min
rateLimitConfigs.relaxed // 300 req/min
rateLimitConfigs.auth // 5 attempts/15min
rateLimitConfigs.passwordReset // 3 attempts/hour
rateLimitConfigs.ddos // 100 req/sec
```

## 🧩 Middleware Composition

```typescript
import { composeMiddleware, validateTenantAccess, createRateLimiter } from '@/lib/middleware'

const customMiddleware = composeMiddleware(
  validateTenantAccess,
  createRateLimiter({ windowMs: 60000, maxRequests: 50 })
)

export async function POST(request: NextRequest) {
  const response = await customMiddleware(request)
  if (response) return response
  // Your logic...
}
```

## 🔍 Conditional Middleware

```typescript
import { conditionalMiddleware, createRateLimiter } from '@/lib/middleware'

// Only rate limit POST requests
const conditionalLimit = conditionalMiddleware(
  req => req.method === 'POST',
  createRateLimiter(rateLimitConfigs.strict)
)
```

## 🚨 Security Best Practices

1. ✅ Always apply middleware first
2. ✅ Validate resource ownership after fetching
3. ✅ Use proper rate limits for operations
4. ✅ Check super admin status when needed
5. ✅ Monitor security events in production
6. ✅ Use Redis for distributed systems

## 📖 Full Documentation

See `src/lib/middleware/README.md` for complete documentation.

## 🧪 Testing

```bash
npm run test tests/integration/tenant-validation.test.ts
```

## 🏭 Production Setup

### With Redis

```typescript
import Redis from 'ioredis'
import { RedisRateLimiter } from '@/lib/middleware'

const redis = new Redis(process.env.REDIS_URL)
const rateLimiter = new RedisRateLimiter(redis)

const rateLimit = rateLimiter.createMiddleware(rateLimitConfigs.standard)
```

## 📞 Support

- Documentation: `src/lib/middleware/README.md`
- Tests: `tests/integration/tenant-validation.test.ts`
- Issues: Contact backend team

---

**Version:** 1.0.0
**Last Updated:** 2025-10-13
