# Performance Optimization Guide

## Overview

This guide provides practical optimization strategies discovered during load testing, organized by impact level and implementation complexity. Use this as a reference for improving ADSapp performance.

## Quick Wins (High Impact, Low Effort)

### 1. Database Index Optimization

**Impact**: 50-80% reduction in query time
**Effort**: 1-2 hours
**Implementation**:

```sql
-- Add missing indexes for common queries

-- Conversations by status and organization
CREATE INDEX CONCURRENTLY idx_conversations_org_status_updated
ON conversations(organization_id, status, updated_at DESC);

-- Messages by conversation and timestamp
CREATE INDEX CONCURRENTLY idx_messages_conversation_timestamp
ON messages(conversation_id, created_at DESC);

-- Contacts search optimization
CREATE INDEX CONCURRENTLY idx_contacts_search
ON contacts USING gin(to_tsvector('english', name || ' ' || COALESCE(email, '')));

-- User lookup by organization
CREATE INDEX CONCURRENTLY idx_profiles_org_active
ON profiles(organization_id, is_active) WHERE is_active = true;

-- Analytics queries optimization
CREATE INDEX CONCURRENTLY idx_messages_org_created
ON messages(organization_id, created_at DESC);
```

**Validation**:
```sql
-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%'
ORDER BY idx_scan DESC;
```

---

### 2. Response Caching

**Impact**: 60-90% reduction in response time for cached endpoints
**Effort**: 2-4 hours
**Implementation**:

```typescript
// src/lib/cache/response-cache.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
});

export async function cacheResponse<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> {
  // Try cache first
  const cached = await redis.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache (fire and forget)
  redis.setex(key, ttl, data).catch(console.error);

  return data;
}

// Usage in API route
export async function GET(request: Request) {
  const { organizationId } = await getAuth(request);

  const conversations = await cacheResponse(
    `conversations:${organizationId}:open`,
    () => fetchConversations(organizationId, 'open'),
    300 // 5 minutes
  );

  return Response.json({ data: conversations });
}
```

**Recommended TTL by Endpoint**:
- Health check: 30 seconds
- Conversations list: 5 minutes
- Contact list: 10 minutes
- Analytics dashboard: 15 minutes
- Templates: 1 hour
- Organization settings: 1 hour

---

### 3. N+1 Query Elimination

**Impact**: 70-90% reduction in database queries
**Effort**: 2-6 hours per endpoint
**Implementation**:

```typescript
// BEFORE: N+1 queries
async function getConversationsWithMessages() {
  const conversations = await db
    .from('conversations')
    .select('*')
    .eq('organization_id', orgId);

  // N queries for messages!
  for (const conv of conversations) {
    conv.lastMessage = await db
      .from('messages')
      .select('*')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
  }

  return conversations;
}

// AFTER: Single query with JOIN
async function getConversationsWithMessages() {
  const conversations = await db
    .from('conversations')
    .select(`
      *,
      last_message:messages!inner(*)
    `)
    .eq('organization_id', orgId)
    .order('messages.created_at', { ascending: false })
    .limit(1);

  return conversations;
}

// ALTERNATIVE: Using window functions
const { data } = await db.rpc('get_conversations_with_last_message', {
  org_id: orgId
});

-- SQL function
CREATE OR REPLACE FUNCTION get_conversations_with_last_message(org_id uuid)
RETURNS TABLE (
  conversation_id uuid,
  contact_name text,
  last_message_content text,
  last_message_at timestamptz
) AS $$
  SELECT DISTINCT ON (c.id)
    c.id,
    c.contact_name,
    m.content,
    m.created_at
  FROM conversations c
  LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
  ) m ON true
  WHERE c.organization_id = org_id
  ORDER BY c.id, m.created_at DESC;
$$ LANGUAGE sql STABLE;
```

---

### 4. Connection Pool Configuration

**Impact**: 40-60% improvement in concurrent request handling
**Effort**: 30 minutes
**Implementation**:

```typescript
// src/lib/supabase/server.ts
export const createClient = async () => {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: false,
      },
      // Optimize connection pooling
      global: {
        headers: {
          'sb-connection-mode': 'transaction', // Use transaction mode for better pooling
        },
      },
    }
  );

  return supabase;
};
```

**Database Configuration**:
```sql
-- Increase connection limits (requires admin access)
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '128MB';
ALTER SYSTEM SET work_mem = '8MB';

-- Reload configuration
SELECT pg_reload_conf();
```

---

### 5. Compression Enablement

**Impact**: 70-80% reduction in bandwidth
**Effort**: 15 minutes
**Implementation**:

```typescript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true, // Enable gzip compression

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 3600,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },

  // Enable SWC minification
  swcMinify: true,

  // Optimize production builds
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
};
```

## Medium Impact Optimizations

### 6. Read Replica Implementation

**Impact**: 50% reduction in primary database load
**Effort**: 1-2 days
**Implementation**:

```typescript
// src/lib/database/client.ts
import { createClient } from '@supabase/supabase-js';

// Primary database (write operations)
export const primaryDb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Read replica (read-only operations)
export const replicaDb = createClient(
  process.env.SUPABASE_REPLICA_URL!,
  process.env.SUPABASE_REPLICA_KEY!
);

// Smart routing
export function getDbClient(operation: 'read' | 'write') {
  return operation === 'read' ? replicaDb : primaryDb;
}

// Usage
const conversations = await getDbClient('read')
  .from('conversations')
  .select('*');

await getDbClient('write')
  .from('messages')
  .insert({ content: 'Hello' });
```

---

### 7. Query Result Pagination

**Impact**: 80-90% reduction in memory usage and response time
**Effort**: 4-6 hours
**Implementation**:

```typescript
// src/lib/pagination/cursor-pagination.ts
export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

export async function paginateQuery<T>(
  query: any,
  params: PaginationParams,
  cursorField: string = 'created_at'
): Promise<PaginatedResponse<T>> {
  const limit = Math.min(params.limit || 50, 100); // Max 100 per page

  let paginatedQuery = query.limit(limit + 1);

  // Apply cursor if provided
  if (params.cursor) {
    const decoded = Buffer.from(params.cursor, 'base64').toString();
    const [timestamp, id] = decoded.split(':');

    paginatedQuery = paginatedQuery
      .lt(cursorField, timestamp)
      .neq('id', id);
  }

  paginatedQuery = paginatedQuery.order(cursorField, { ascending: false });

  const { data, error } = await paginatedQuery;

  if (error) throw error;

  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  let nextCursor: string | null = null;
  if (hasMore && items.length > 0) {
    const lastItem = items[items.length - 1];
    const cursorValue = `${lastItem[cursorField]}:${lastItem.id}`;
    nextCursor = Buffer.from(cursorValue).toString('base64');
  }

  return {
    data: items,
    pagination: {
      nextCursor,
      hasMore,
    },
  };
}

// Usage
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor') || undefined;
  const limit = parseInt(searchParams.get('limit') || '50');

  const query = db
    .from('conversations')
    .select('*')
    .eq('organization_id', orgId);

  const result = await paginateQuery(query, { cursor, limit });

  return Response.json(result);
}
```

---

### 8. WebSocket Connection Optimization

**Impact**: 50% reduction in connection overhead
**Effort**: 1 day
**Implementation**:

```typescript
// src/lib/websocket/connection-manager.ts
class ConnectionManager {
  private connections = new Map<string, WebSocket>();
  private heartbeatInterval = 30000; // 30 seconds
  private reconnectDelay = 1000;
  private maxReconnectAttempts = 5;

  async connect(userId: string, organizationId: string): Promise<WebSocket> {
    const connectionKey = `${userId}:${organizationId}`;

    // Reuse existing connection
    if (this.connections.has(connectionKey)) {
      const existing = this.connections.get(connectionKey)!;
      if (existing.readyState === WebSocket.OPEN) {
        return existing;
      }
      // Clean up dead connection
      this.connections.delete(connectionKey);
    }

    const ws = new WebSocket(process.env.WS_URL!);

    // Connection management
    ws.on('open', () => {
      this.connections.set(connectionKey, ws);
      this.startHeartbeat(ws);
    });

    ws.on('close', () => {
      this.connections.delete(connectionKey);
      this.stopHeartbeat(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleReconnect(connectionKey, userId, organizationId);
    });

    return ws;
  }

  private startHeartbeat(ws: WebSocket) {
    const timer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, this.heartbeatInterval);

    ws.on('close', () => clearInterval(timer));
  }

  private stopHeartbeat(ws: WebSocket) {
    // Cleanup handled by close event
  }

  private async handleReconnect(
    key: string,
    userId: string,
    organizationId: string,
    attempt: number = 1
  ) {
    if (attempt > this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, attempt - 1);

    setTimeout(async () => {
      try {
        await this.connect(userId, organizationId);
      } catch (error) {
        this.handleReconnect(key, userId, organizationId, attempt + 1);
      }
    }, delay);
  }

  disconnect(userId: string, organizationId: string) {
    const key = `${userId}:${organizationId}`;
    const ws = this.connections.get(key);

    if (ws) {
      ws.close();
      this.connections.delete(key);
    }
  }

  getConnectionCount(): number {
    return this.connections.size;
  }
}

export const connectionManager = new ConnectionManager();
```

---

### 9. Batch Operations

**Impact**: 70-80% reduction in API calls
**Effort**: 2-3 days
**Implementation**:

```typescript
// src/lib/batch/batch-processor.ts
class BatchProcessor<T, R> {
  private queue: T[] = [];
  private batchSize: number;
  private flushInterval: number;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private processor: (batch: T[]) => Promise<R[]>,
    options: { batchSize?: number; flushInterval?: number } = {}
  ) {
    this.batchSize = options.batchSize || 100;
    this.flushInterval = options.flushInterval || 1000; // 1 second
  }

  async add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.queue.push(item);

      // Start flush timer if not already running
      if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.flushInterval);
      }

      // Flush immediately if batch size reached
      if (this.queue.length >= this.batchSize) {
        this.flush();
      }
    });
  }

  private async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);

    try {
      const results = await this.processor(batch);
      return results;
    } catch (error) {
      console.error('Batch processing error:', error);
      throw error;
    }
  }
}

// Usage for message sending
const messageBatcher = new BatchProcessor(
  async (messages: Message[]) => {
    return await db.from('messages').insert(messages).select();
  },
  { batchSize: 50, flushInterval: 1000 }
);

// Instead of individual inserts
await messageBatcher.add({
  conversation_id: conversationId,
  content: 'Hello',
  sender_id: senderId,
});
```

## Advanced Optimizations

### 10. Database Query Optimization

**Impact**: Variable (20-90% depending on query)
**Effort**: Ongoing
**Implementation**:

```sql
-- Analyze slow queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time,
  rows
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- queries taking > 100ms on average
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Optimize specific query example
-- BEFORE: Slow conversation search
SELECT * FROM conversations
WHERE organization_id = $1
  AND (
    contact_name ILIKE '%' || $2 || '%'
    OR phone_number ILIKE '%' || $2 || '%'
  );

-- AFTER: Using full-text search with index
CREATE INDEX conversations_search_idx ON conversations
USING gin(to_tsvector('english', contact_name || ' ' || COALESCE(phone_number, '')));

SELECT * FROM conversations
WHERE organization_id = $1
  AND to_tsvector('english', contact_name || ' ' || COALESCE(phone_number, ''))
      @@ plainto_tsquery('english', $2);
```

---

### 11. Serverless Function Optimization

**Impact**: 40-60% reduction in cold start time
**Effort**: 1-2 days
**Implementation**:

```typescript
// Minimize dependencies in serverless functions
// BEFORE: Large bundle with unused imports
import * as _ from 'lodash';
import moment from 'moment';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const db = createClient(...);
  const formatted = moment().format('YYYY-MM-DD');
  const result = _.groupBy(data, 'type');
  return Response.json(result);
}

// AFTER: Minimal imports, native alternatives
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const db = createClient(...);
  const formatted = new Date().toISOString().split('T')[0];
  const result = data.reduce((acc, item) => {
    (acc[item.type] = acc[item.type] || []).push(item);
    return acc;
  }, {});
  return Response.json(result);
}

// Use dynamic imports for heavy dependencies
export async function POST(request: Request) {
  const data = await request.json();

  if (needsExport) {
    const { exportToCSV } = await import('@/lib/export');
    return exportToCSV(data);
  }

  return Response.json({ success: true });
}
```

---

### 12. Monitoring & Alerting

**Impact**: Proactive issue detection
**Effort**: 2-3 days
**Implementation**:

```typescript
// src/lib/monitoring/performance-monitor.ts
import { monitoring } from '@/lib/monitoring';

export function monitorPerformance() {
  // Track API endpoint performance
  return async (request: Request, handler: Function) => {
    const start = Date.now();
    const endpoint = new URL(request.url).pathname;

    try {
      const response = await handler(request);
      const duration = Date.now() - start;

      await monitoring.logPerformance({
        endpoint,
        method: request.method,
        duration,
        statusCode: response.status,
        timestamp: new Date().toISOString(),
      });

      return response;
    } catch (error) {
      const duration = Date.now() - start;

      await monitoring.logError({
        type: 'api_error',
        message: error.message,
        endpoint,
        severity: 'high',
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  };
}

// Usage in API routes
export const GET = monitorPerformance()(async (request: Request) => {
  // Your handler code
  const data = await fetchData();
  return Response.json(data);
});
```

## Performance Testing Checklist

After implementing optimizations, validate with:

- [ ] Run load tests with same scenarios
- [ ] Compare before/after metrics
- [ ] Check for regressions in other areas
- [ ] Validate error rates haven't increased
- [ ] Monitor production for 24-48 hours
- [ ] Document performance improvements
- [ ] Update capacity planning based on results

## Continuous Optimization Strategy

1. **Weekly**: Review performance metrics and alerts
2. **Monthly**: Analyze slow query logs and optimize
3. **Quarterly**: Full load test and capacity planning review
4. **Annually**: Architecture review and major optimizations

---

**Document Version**: 1.0
**Last Updated**: 2025-10-14
**Owner**: Performance Engineering Team
