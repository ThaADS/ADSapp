# Redis Cache Integration Guide

**Date:** November 9, 2025
**Status:** Implementation Guide
**Impact:** 50-90% API response time reduction

---

## Overview

This guide shows how to integrate Redis caching into API routes using the existing cache infrastructure in `/src/lib/cache/`.

### Benefits
- **70-90% faster responses** for cached data
- **Reduced database load** by 60-80%
- **Better user experience** with sub-100ms responses
- **Cost savings** from reduced database queries

---

## Quick Start

### 1. Import Cache Utilities

```typescript
import {
  getCachedApiResponse,
  cacheApiResponse,
  generateApiCacheKey,
  CacheConfigs,
  invalidateCache,
  addCacheHitHeader,
  getCacheHeaders,
} from '@/lib/cache/api-cache'
```

### 2. Basic Caching Pattern

```typescript
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    // Generate cache key
    const cacheKey = generateApiCacheKey(
      organizationId,
      'templates',  // Resource name
      request       // Includes query params
    )

    // Try to get from cache
    const cached = await getCachedApiResponse(cacheKey, CacheConfigs.templates)
    if (cached) {
      const response = NextResponse.json(cached.data)
      addCacheHitHeader(response.headers, true, cached.cacheAge)
      return response
    }

    // Execute database query
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('message_templates')
      .select('*')
      .eq('organization_id', organizationId)

    if (error) throw error

    // Transform and prepare response
    const responseData = {
      templates: data,
      pagination: { /* ... */ },
    }

    // Cache the result
    await cacheApiResponse(cacheKey, responseData, CacheConfigs.templates)

    // Return with cache headers
    const response = NextResponse.json(responseData)
    addCacheHitHeader(response.headers, false)
    Object.entries(getCacheHeaders(CacheConfigs.templates.ttl)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  } catch (error) {
    return createErrorResponse(error)
  }
}
```

### 3. Cache Invalidation on Mutations

```typescript
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const body = await request.json()

    // Create resource
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('message_templates')
      .insert({ ...body, organization_id: organizationId })
      .select()
      .single()

    if (error) throw error

    // Invalidate cache after mutation
    await invalidateCache.templates(organizationId)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return createErrorResponse(error)
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  // ... update logic ...

  // Invalidate cache
  await invalidateCache.templates(organizationId)

  return NextResponse.json(data)
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  // ... delete logic ...

  // Invalidate cache
  await invalidateCache.templates(organizationId)

  return NextResponse.json({ success: true })
}
```

---

## Complete Examples

### Example 1: Templates Route (Full Implementation)

**File:** `/src/app/api/templates/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  requireAuthenticatedUser,
  getUserOrganization,
  createErrorResponse,
  validatePagination,
} from '@/lib/api-utils'
import {
  getCachedApiResponse,
  cacheApiResponse,
  generateApiCacheKey,
  CacheConfigs,
  invalidateCache,
  addCacheHitHeader,
  getCacheHeaders,
} from '@/lib/cache/api-cache'

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Authentication
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    // Generate cache key (includes all query params)
    const cacheKey = generateApiCacheKey(organizationId, 'templates', request)

    // Try cache first
    const cached = await getCachedApiResponse(cacheKey, CacheConfigs.templates)
    if (cached) {
      console.log(`[Cache HIT] templates - ${Date.now() - startTime}ms (age: ${cached.cacheAge}s)`)
      const response = NextResponse.json(cached.data)
      addCacheHitHeader(response.headers, true, cached.cacheAge)
      return response
    }

    console.log(`[Cache MISS] templates - ${Date.now() - startTime}ms`)

    // Parse query params
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const { page, limit, offset } = validatePagination(request)

    // Execute query
    const supabase = await createClient()
    let query = supabase
      .from('message_templates')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)

    if (category) {
      query = query.eq('category', category)
    }

    const { data: templates, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Transform data
    const transformedTemplates = (templates || []).map(template => ({
      id: template.id,
      name: template.name,
      category: template.category,
      content: template.content,
      variables: template.variables,
      created_at: template.created_at,
      updated_at: template.updated_at,
    }))

    const responseData = {
      templates: transformedTemplates,
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      },
    }

    // Cache the response
    await cacheApiResponse(cacheKey, responseData, CacheConfigs.templates)

    console.log(`[DB Query] templates - ${Date.now() - startTime}ms`)

    // Return with cache headers
    const response = NextResponse.json(responseData)
    addCacheHitHeader(response.headers, false)
    Object.entries(getCacheHeaders(CacheConfigs.templates.ttl)).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    return response
  } catch (error) {
    console.error('Error fetching templates:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const body = await request.json()
    const { name, category, content, variables } = body

    // Validation
    if (!name || !content) {
      return NextResponse.json(
        { error: 'Name and content are required' },
        { status: 400 }
      )
    }

    // Create template
    const supabase = await createClient()
    const { data: template, error } = await supabase
      .from('message_templates')
      .insert({
        organization_id: organizationId,
        name,
        category,
        content,
        variables,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error

    // Invalidate cache
    await invalidateCache.templates(organizationId)
    console.log(`[Cache Invalidated] templates for org ${organizationId}`)

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return createErrorResponse(error)
  }
}
```

### Example 2: Contacts Route (with Search Parameters)

**File:** `/src/app/api/contacts/route.ts`

```typescript
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    // Generate cache key (includes search, tags, filters)
    const cacheKey = generateApiCacheKey(organizationId, 'contacts', request)

    // Check cache
    const cached = await getCachedApiResponse(cacheKey, CacheConfigs.contacts)
    if (cached) {
      const response = NextResponse.json(cached.data)
      addCacheHitHeader(response.headers, true, cached.cacheAge)
      return response
    }

    // Query params
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const { page, limit, offset } = validatePagination(request)

    // Execute query
    const supabase = await createClient()
    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .eq('organization_id', organizationId)

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,phone_number.ilike.%${search}%`
      )
    }

    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags)
    }

    const { data: contacts, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const responseData = {
      contacts,
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore: offset + limit < (count || 0),
      },
    }

    // Cache result
    await cacheApiResponse(cacheKey, responseData, CacheConfigs.contacts)

    const response = NextResponse.json(responseData)
    addCacheHitHeader(response.headers, false)
    return response
  } catch (error) {
    return createErrorResponse(error)
  }
}
```

### Example 3: Analytics Route (Longer TTL)

**File:** `/src/app/api/analytics/dashboard/route.ts`

```typescript
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('range') || '7d'

    // Generate cache key with date range
    const cacheKey = generateApiCacheKey(
      organizationId,
      'analytics-dashboard',
      request
    )

    // Check cache (10 minute TTL for analytics)
    const cached = await getCachedApiResponse(cacheKey, CacheConfigs.analytics)
    if (cached) {
      const response = NextResponse.json(cached.data)
      addCacheHitHeader(response.headers, true, cached.cacheAge)
      return response
    }

    // Execute heavy analytics queries
    const supabase = await createClient()

    const [conversationsData, messagesData, contactsData] = await Promise.all([
      supabase
        .from('conversations')
        .select('*')
        .eq('organization_id', organizationId),
      supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds),
      supabase
        .from('contacts')
        .select('count')
        .eq('organization_id', organizationId),
    ])

    const analytics = {
      totalConversations: conversationsData.data?.length || 0,
      totalMessages: messagesData.data?.length || 0,
      totalContacts: contactsData.count || 0,
      // ... more metrics
    }

    // Cache for 10 minutes (analytics don't need real-time updates)
    await cacheApiResponse(cacheKey, analytics, CacheConfigs.analytics)

    const response = NextResponse.json(analytics)
    addCacheHitHeader(response.headers, false)
    return response
  } catch (error) {
    return createErrorResponse(error)
  }
}
```

---

## Cache Configuration Reference

### Predefined Configurations

```typescript
export const CacheConfigs = {
  conversations: {
    ttl: 30,        // 30 seconds - frequently changing
    tags: ['conversations'],
  },
  contacts: {
    ttl: 300,       // 5 minutes - semi-static
    tags: ['contacts'],
  },
  templates: {
    ttl: 1800,      // 30 minutes - static
    tags: ['templates'],
  },
  analytics: {
    ttl: 600,       // 10 minutes - aggregated data
    tags: ['analytics'],
  },
  campaigns: {
    ttl: 300,       // 5 minutes
    tags: ['campaigns'],
  },
  organization: {
    ttl: 900,       // 15 minutes
    tags: ['organization'],
  },
}
```

### Custom Configuration

```typescript
const customConfig = {
  ttl: 120,  // 2 minutes
  tags: ['custom-resource'],
  skipCache: false,
  cacheOnlySuccess: true,
}
```

---

## Cache Invalidation Strategies

### 1. Invalidate on Write Operations

```typescript
// After POST, PUT, DELETE
await invalidateCache.templates(organizationId)
```

### 2. Invalidate Multiple Resources

```typescript
// When one change affects multiple caches
await Promise.all([
  invalidateCache.contacts(organizationId),
  invalidateCache.conversations(organizationId),
  invalidateCache.analytics(organizationId),
])
```

### 3. Invalidate All Organization Data

```typescript
// Nuclear option - clear all caches for organization
await invalidateCache.all(organizationId)
```

### 4. Time-Based Invalidation

TTL handles automatic invalidation. No manual intervention needed.

---

## Performance Monitoring

### Add Logging

```typescript
const startTime = Date.now()

// ... cache check ...

if (cached) {
  console.log(`[Cache HIT] ${resource} - ${Date.now() - startTime}ms (age: ${cached.cacheAge}s)`)
} else {
  console.log(`[Cache MISS] ${resource} - ${Date.now() - startTime}ms`)
  // ... database query ...
  console.log(`[DB Query] ${resource} - ${Date.now() - startTime}ms`)
}
```

### Response Headers

All cached responses include:
- `X-Cache: HIT` or `X-Cache: MISS`
- `X-Cache-Age: <seconds>` (for cache hits)
- `Cache-Control: private, max-age=<ttl>`

---

## Priority Routes to Cache

### 🔴 **HIGH PRIORITY** (Implement First)

1. **`/api/templates`** - Static data, high read volume
   - Expected improvement: 80-90%
   - TTL: 30 minutes
   - Estimated time: 30 minutes

2. **`/api/contacts`** - Large datasets, frequent access
   - Expected improvement: 70-80%
   - TTL: 5 minutes
   - Estimated time: 45 minutes

3. **`/api/analytics/dashboard`** - Heavy aggregation queries
   - Expected improvement: 85-95%
   - TTL: 10 minutes
   - Estimated time: 1 hour

4. **`/api/broadcast`** - Campaign lists
   - Expected improvement: 75-85%
   - TTL: 5 minutes
   - Estimated time: 30 minutes

5. **`/api/drip-campaigns`** - Campaign data
   - Expected improvement: 70-80%
   - TTL: 5 minutes
   - Estimated time: 30 minutes

### 🟡 **MEDIUM PRIORITY**

6. **`/api/conversations`** - Needs real-time, short TTL
   - Expected improvement: 40-60%
   - TTL: 30 seconds
   - Estimated time: 45 minutes

7. **`/api/organizations/current`** - Organization settings
   - Expected improvement: 80-90%
   - TTL: 15 minutes
   - Estimated time: 20 minutes

### 🟢 **LOW PRIORITY**

8. **`/api/webhook-logs`** - Admin/debugging only
9. **`/api/automation-rules`** - Low traffic
10. **`/api/profiles`** - Low traffic

---

## Testing Cache Integration

### 1. Manual Testing

```bash
# First request (cache miss)
curl -X GET "http://localhost:3000/api/templates" -H "Authorization: Bearer TOKEN"
# Check: X-Cache: MISS

# Second request (cache hit)
curl -X GET "http://localhost:3000/api/templates" -H "Authorization: Bearer TOKEN"
# Check: X-Cache: HIT, X-Cache-Age: <seconds>

# Create template (invalidates cache)
curl -X POST "http://localhost:3000/api/templates" -H "Authorization: Bearer TOKEN" -d '{...}'

# Next GET request (cache miss again)
curl -X GET "http://localhost:3000/api/templates" -H "Authorization: Bearer TOKEN"
# Check: X-Cache: MISS
```

### 2. Monitor Redis

```typescript
import { getCacheStats, getCacheHitRate } from '@/lib/cache/redis-client'

console.log(getCacheStats())
// { hits: 150, misses: 50, errors: 0 }

console.log(getCacheHitRate())
// 75.0 (percent)
```

---

## Common Pitfalls

### ❌ **Don't Cache User-Specific Data Without User ID in Key**

```typescript
// BAD
const cacheKey = generateApiCacheKey(organizationId, 'user-settings')

// GOOD
const cacheKey = generateApiCacheKey(
  organizationId,
  'user-settings',
  undefined,
  { userId: user.id }
)
```

### ❌ **Don't Forget to Invalidate on Mutations**

```typescript
export async function POST(request: NextRequest) {
  // ... create resource ...

  // MUST invalidate cache
  await invalidateCache.templates(organizationId)

  return response
}
```

### ❌ **Don't Cache Errors**

```typescript
// The caching helper already handles this with cacheOnlySuccess: true by default
await cacheApiResponse(cacheKey, data, CacheConfigs.templates)
```

### ❌ **Don't Use Too Long TTL for Frequently Updated Data**

```typescript
// BAD for conversations (changes every second)
const config = { ttl: 3600 }

// GOOD
const config = { ttl: 30 }
```

---

## Rollout Plan

### Week 1: High-Impact Routes
1. Monday: `/api/templates` (30 min TTL)
2. Tuesday: `/api/contacts` (5 min TTL)
3. Wednesday: `/api/analytics/*` (10 min TTL)
4. Thursday: `/api/broadcast` (5 min TTL)
5. Friday: `/api/drip-campaigns` (5 min TTL)

**Expected Results:** 60-70% reduction in database load

### Week 2: Medium-Impact Routes
6. Monday: `/api/conversations` (30 sec TTL)
7. Tuesday: `/api/organizations/current` (15 min TTL)
8. Wednesday: Performance testing and optimization
9. Thursday: Cache hit rate analysis
10. Friday: Documentation and training

**Expected Results:** 70-80% cache hit rate

### Week 3: Monitoring & Optimization
- Set up cache performance dashboard
- Monitor cache hit rates
- Adjust TTLs based on real data
- Document patterns and best practices

---

## Environment Setup

### Required Environment Variables

```env
# Upstash Redis (already configured)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### Verify Redis Connection

```typescript
import { isRedisAvailable } from '@/lib/cache/redis-client'

const available = await isRedisAvailable()
console.log('Redis available:', available)
```

---

## Success Metrics

### Before Caching
- Average API response time: 500ms
- Database queries per minute: 1000
- Cache hit rate: 0%
- Server cost: $X/month

### After Caching (Target)
- Average API response time: 100ms (80% improvement)
- Database queries per minute: 200 (80% reduction)
- Cache hit rate: 75%+
- Server cost: $X/month (30% reduction from reduced DB load)

---

## Next Steps

1. **Start with templates route** (highest ROI, easiest implementation)
2. **Monitor cache hit rates** using Redis stats
3. **Gradually roll out** to other high-traffic routes
4. **Adjust TTLs** based on real-world usage
5. **Build performance dashboard** to track improvements

---

## Support & Resources

- Redis Client Documentation: `/src/lib/cache/redis-client.ts`
- API Cache Helper: `/src/lib/cache/api-cache.ts`
- Performance Audit: `/docs/PERFORMANCE_AUDIT.md`
- Cache Infrastructure: `/src/lib/cache/`

**Questions?** Check the cache infrastructure files for inline documentation.

---

**Last Updated:** November 9, 2025
**Status:** Ready for Implementation
**Estimated ROI:** 80% faster responses, 70% less database load
