# ADSapp Production Monitoring Setup Guide

**Version**: 1.0.0
**Last Updated**: October 2025
**Status**: Production Ready
**Target Audience**: DevOps Engineers, SREs, Platform Engineers

---

## Table of Contents

1. [Overview](#overview)
2. [Monitoring Architecture](#monitoring-architecture)
3. [Vercel Analytics Setup](#vercel-analytics-setup)
4. [Sentry Error Tracking](#sentry-error-tracking)
5. [Database Monitoring](#database-monitoring)
6. [Custom Metrics & Logging](#custom-metrics--logging)
7. [Health Check Configuration](#health-check-configuration)
8. [Alert Configuration](#alert-configuration)
9. [Incident Response Procedures](#incident-response-procedures)
10. [Monitoring Dashboard](#monitoring-dashboard)
11. [Performance Optimization](#performance-optimization)

---

## Overview

ADSapp production monitoring is designed to provide comprehensive visibility into application health, performance, errors, and user experience. This multi-layered approach ensures rapid detection and response to issues.

### Monitoring Goals

**Primary Objectives**:
- Detect issues before users report them
- Maintain 99.9% uptime SLA
- Keep error rate below 1%
- Ensure response times meet targets
- Track business metrics in real-time

**Key Performance Indicators (KPIs)**:
```yaml
Availability:
  Target: 99.9% uptime
  Measurement: Health check endpoint monitoring
  Alert Threshold: < 99.5%

Performance:
  API Response Time: < 500ms (p95)
  Page Load Time: < 2s (p95)
  Database Query Time: < 100ms (p95)
  Alert Threshold: > 1000ms

Error Rate:
  Target: < 1%
  Measurement: Error tracking via Sentry
  Alert Threshold: > 5%

Business Metrics:
  Message Delivery Rate: > 99%
  Payment Success Rate: > 95%
  User Sign-up Success: > 90%
```

### Monitoring Stack

```
┌─────────────────────────────────────────────────────┐
│           ADSapp Monitoring Architecture             │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐│
│  │   Vercel     │  │    Sentry    │  │  Supabase  ││
│  │  Analytics   │  │    Error     │  │  Database  ││
│  │  + Speed     │  │   Tracking   │  │ Monitoring ││
│  │  Insights    │  │              │  │            ││
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘│
│         │                 │                 │       │
│         └─────────────────┼─────────────────┘       │
│                           │                         │
│                  ┌────────▼────────┐                │
│                  │   Monitoring    │                │
│                  │   Dashboard     │                │
│                  │   (Grafana)     │                │
│                  └─────────────────┘                │
│                           │                         │
│                  ┌────────▼────────┐                │
│                  │  Alert Manager  │                │
│                  │  (PagerDuty/    │                │
│                  │   Slack)        │                │
│                  └─────────────────┘                │
│                                                       │
└─────────────────────────────────────────────────────┘
```

---

## Monitoring Architecture

### Monitoring Layers

#### Layer 1: Infrastructure Monitoring (Vercel)
- **Scope**: Application availability, deployment status, function execution
- **Tools**: Vercel Dashboard, Vercel Analytics
- **Metrics**: Uptime, deployment success rate, function errors

#### Layer 2: Application Performance Monitoring (Vercel + Sentry)
- **Scope**: Response times, throughput, error rates
- **Tools**: Vercel Speed Insights, Sentry Performance
- **Metrics**: API response times, page load times, Core Web Vitals

#### Layer 3: Error Tracking (Sentry)
- **Scope**: Application errors, exceptions, crashes
- **Tools**: Sentry Error Tracking
- **Metrics**: Error count, error rate, affected users

#### Layer 4: Database Monitoring (Supabase)
- **Scope**: Database performance, query analysis, connection health
- **Tools**: Supabase Dashboard, pg_stat_statements
- **Metrics**: Query times, connection count, database size

#### Layer 5: Business Metrics (Custom)
- **Scope**: User activity, message delivery, payment success
- **Tools**: Custom logging, analytics database
- **Metrics**: Message count, payment volume, user growth

### Data Flow

```
User Request
    │
    ├──▶ Vercel Analytics (Web Vitals, Navigation)
    │
    ├──▶ API Routes
    │     │
    │     ├──▶ Error? → Sentry Error Tracking
    │     │
    │     └──▶ Performance → Sentry Performance
    │
    ├──▶ Database Queries
    │     │
    │     └──▶ Supabase Monitoring
    │
    └──▶ Response
          │
          └──▶ Custom Metrics Logger
```

---

## Vercel Analytics Setup

Vercel provides built-in analytics for web performance and user behavior monitoring.

### Step 1: Enable Vercel Analytics

#### Web Analytics

1. **Navigate to Project Settings**:
   ```
   Vercel Dashboard → Your Project → Analytics
   ```

2. **Enable Web Analytics**:
   - Toggle "Enable Web Analytics"
   - Configure data retention: 90 days (recommended)
   - Enable "Audiences" for user segmentation

3. **Add Analytics Package** (Optional for Enhanced Tracking):
   ```bash
   npm install @vercel/analytics
   ```

4. **Integrate in Application**:
   ```typescript
   // src/app/layout.tsx
   import { Analytics } from '@vercel/analytics/react'

   export default function RootLayout({
     children,
   }: {
     children: React.ReactNode
   }) {
     return (
       <html lang="en">
         <body>
           {children}
           <Analytics />
         </body>
       </html>
     )
   }
   ```

#### Speed Insights

1. **Enable Speed Insights**:
   ```
   Vercel Dashboard → Your Project → Speed Insights
   ```

2. **Configure Performance Budgets**:
   ```yaml
   First Contentful Paint (FCP):
     Target: < 1.8s
     Budget: 2.5s
     Alert: > 3.0s

   Largest Contentful Paint (LCP):
     Target: < 2.5s
     Budget: 3.0s
     Alert: > 4.0s

   Total Blocking Time (TBT):
     Target: < 300ms
     Budget: 500ms
     Alert: > 1000ms

   Cumulative Layout Shift (CLS):
     Target: < 0.1
     Budget: 0.15
     Alert: > 0.25
   ```

3. **Install Speed Insights Package**:
   ```bash
   npm install @vercel/speed-insights
   ```

4. **Integrate in Application**:
   ```typescript
   // src/app/layout.tsx
   import { SpeedInsights } from '@vercel/speed-insights/next'

   export default function RootLayout({
     children,
   }: {
     children: React.ReactNode
   }) {
     return (
       <html lang="en">
         <body>
           {children}
           <SpeedInsights />
         </body>
       </html>
     )
   }
   ```

### Step 2: Configure Custom Events

Track custom business events for deeper insights:

```typescript
// src/lib/analytics.ts
import { track } from '@vercel/analytics'

export function trackMessageSent(messageId: string, organizationId: string) {
  track('message_sent', {
    messageId,
    organizationId,
    timestamp: new Date().toISOString(),
  })
}

export function trackSubscriptionUpgrade(
  userId: string,
  fromPlan: string,
  toPlan: string
) {
  track('subscription_upgrade', {
    userId,
    fromPlan,
    toPlan,
    timestamp: new Date().toISOString(),
  })
}

export function trackConversationResolved(conversationId: string) {
  track('conversation_resolved', {
    conversationId,
    timestamp: new Date().toISOString(),
  })
}
```

**Usage in Components**:
```typescript
// src/components/messaging/chat-window.tsx
import { trackMessageSent } from '@/lib/analytics'

const handleSendMessage = async (content: string) => {
  const message = await sendMessage(content)
  trackMessageSent(message.id, organizationId)
}
```

### Step 3: Vercel Dashboard Configuration

**Key Metrics to Monitor**:

1. **Real User Monitoring (RUM)**:
   - Pageviews per day
   - Unique visitors
   - Session duration
   - Bounce rate
   - Geographic distribution

2. **Core Web Vitals**:
   - FCP (First Contentful Paint)
   - LCP (Largest Contentful Paint)
   - FID (First Input Delay)
   - CLS (Cumulative Layout Shift)
   - TTFB (Time to First Byte)

3. **Function Metrics**:
   - Invocations per minute
   - Error rate
   - Execution duration
   - Cold start frequency

**Dashboard Access**:
```
URL: https://vercel.com/your-team/adsapp/analytics
Update Frequency: Real-time
Data Retention: 90 days
Export: CSV, JSON
```

---

## Sentry Error Tracking

Sentry provides comprehensive error tracking, performance monitoring, and release tracking.

### Step 1: Sentry Project Setup

1. **Create Sentry Account**:
   - Visit: https://sentry.io
   - Create new organization
   - Create new project: "ADSapp Production"
   - Platform: Next.js

2. **Obtain Credentials**:
   ```bash
   SENTRY_DSN=https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
   SENTRY_AUTH_TOKEN=your-auth-token
   SENTRY_ORG=your-organization
   SENTRY_PROJECT=adsapp
   ```

3. **Install Sentry SDK**:
   ```bash
   npm install @sentry/nextjs
   ```

### Step 2: Configure Sentry

#### Sentry Configuration Files

**sentry.client.config.ts**:
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 1.0, // 100% of transactions

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Environment
  environment: process.env.NODE_ENV,

  // Release Tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Error Filtering
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    // Network errors (user connectivity issues)
    'NetworkError',
    'Failed to fetch',
  ],

  // Performance Monitoring
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: [
        'localhost',
        /^https:\/\/app\.yourdomain\.com/,
      ],
    }),
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
})
```

**sentry.server.config.ts**:
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Release Tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION,

  // Server-specific configuration
  beforeSend(event) {
    // Remove sensitive data
    if (event.request) {
      delete event.request.cookies
      delete event.request.headers
    }
    return event
  },
})
```

**sentry.edge.config.ts**:
```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
})
```

#### Environment Variables

Add to Vercel environment variables:
```bash
SENTRY_DSN=https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@oxxxxx.ingest.sentry.io/xxxxx
SENTRY_ORG=your-organization
SENTRY_PROJECT=adsapp
SENTRY_AUTH_TOKEN=your-auth-token
```

### Step 3: Custom Error Tracking

**Create Error Utility**:
```typescript
// src/lib/error-tracking.ts
import * as Sentry from '@sentry/nextjs'

export function captureError(
  error: Error,
  context?: Record<string, any>
) {
  Sentry.captureException(error, {
    extra: context,
    level: 'error',
  })
}

export function captureWarning(
  message: string,
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level: 'warning',
    extra: context,
  })
}

export function setUserContext(
  userId: string,
  email: string,
  organizationId: string
) {
  Sentry.setUser({
    id: userId,
    email,
    organizationId,
  })
}

export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: 'info',
  })
}
```

**Usage Example**:
```typescript
// src/app/api/messages/route.ts
import { captureError, addBreadcrumb } from '@/lib/error-tracking'

export async function POST(request: Request) {
  try {
    addBreadcrumb('Sending WhatsApp message', 'api', {
      endpoint: '/api/messages',
    })

    const result = await sendWhatsAppMessage(data)

    return NextResponse.json(result)
  } catch (error) {
    captureError(error as Error, {
      endpoint: '/api/messages',
      data,
    })

    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
```

### Step 4: Performance Monitoring

**Track Custom Transactions**:
```typescript
// src/lib/performance-monitoring.ts
import * as Sentry from '@sentry/nextjs'

export function startTransaction(name: string, operation: string) {
  return Sentry.startTransaction({
    name,
    op: operation,
  })
}

export async function trackDatabaseQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const span = Sentry.startSpan({
    name: queryName,
    op: 'db.query',
  })

  try {
    const result = await queryFn()
    span.setStatus('ok')
    return result
  } catch (error) {
    span.setStatus('error')
    throw error
  } finally {
    span.finish()
  }
}
```

**Usage**:
```typescript
import { trackDatabaseQuery } from '@/lib/performance-monitoring'

const conversations = await trackDatabaseQuery(
  'fetch_conversations',
  () => supabase
    .from('conversations')
    .select('*')
    .eq('organization_id', orgId)
)
```

### Step 5: Alert Configuration

**Configure Sentry Alerts**:

1. **Error Alerts**:
   ```yaml
   Name: High Error Rate
   Condition: Error count > 50 per hour
   Actions:
     - Send email to: devops@yourdomain.com
     - Post to Slack: #alerts
     - Create PagerDuty incident: P2
   ```

2. **Performance Alerts**:
   ```yaml
   Name: Slow API Response
   Condition: P95 response time > 1000ms
   Actions:
     - Send email to: devops@yourdomain.com
     - Post to Slack: #performance
   ```

3. **Release Alerts**:
   ```yaml
   Name: New Release Errors
   Condition: Error rate increase > 50% after deployment
   Actions:
     - Send email to: engineering@yourdomain.com
     - Post to Slack: #deployments
     - Create PagerDuty incident: P1
   ```

**Sentry Dashboard Configuration**:
```
Issues: Group by error type, stack trace
Performance: Monitor transactions by endpoint
Releases: Track deployments and error rates
Alerts: Configure email, Slack, PagerDuty
```

---

## Database Monitoring

Supabase provides comprehensive database monitoring through the dashboard and PostgreSQL extensions.

### Step 1: Enable Database Monitoring

1. **Access Supabase Dashboard**:
   ```
   URL: https://app.supabase.com/project/your-project
   Navigate to: Database → Query Performance
   ```

2. **Enable pg_stat_statements**:
   ```sql
   -- Already enabled by default in Supabase
   -- Verify installation
   SELECT * FROM pg_available_extensions
   WHERE name = 'pg_stat_statements';
   ```

3. **Configure Query Logging**:
   ```sql
   -- Enable slow query logging
   ALTER DATABASE postgres SET log_min_duration_statement = 100;

   -- Log all statements
   ALTER DATABASE postgres SET log_statement = 'all';
   ```

### Step 2: Key Database Metrics

**Create Monitoring Views**:

```sql
-- Save as: sql/monitoring/database-metrics.sql

-- 1. Database Size Monitoring
CREATE OR REPLACE VIEW monitoring_database_size AS
SELECT
  pg_size_pretty(pg_database_size('postgres')) as total_size,
  (SELECT pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))::bigint)
   FROM pg_tables
   WHERE schemaname = 'public') as public_schema_size;

-- 2. Table Size Monitoring
CREATE OR REPLACE VIEW monitoring_table_sizes AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                 pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 3. Connection Monitoring
CREATE OR REPLACE VIEW monitoring_connections AS
SELECT
  COUNT(*) as total_connections,
  COUNT(*) FILTER (WHERE state = 'active') as active_connections,
  COUNT(*) FILTER (WHERE state = 'idle') as idle_connections,
  COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity;

-- 4. Slow Query Monitoring
CREATE OR REPLACE VIEW monitoring_slow_queries AS
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- queries slower than 100ms
ORDER BY mean_exec_time DESC
LIMIT 20;

-- 5. Index Usage Monitoring
CREATE OR REPLACE VIEW monitoring_index_usage AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- 6. Bloat Monitoring
CREATE OR REPLACE VIEW monitoring_table_bloat AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  (100 * (SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public' AND n_dead_tup > 0) /
   NULLIF((SELECT COUNT(*) FROM pg_stat_user_tables WHERE schemaname = 'public'), 0))::int as bloat_percentage
FROM pg_tables
WHERE schemaname = 'public';
```

### Step 3: Monitoring Queries

**Daily Health Check Script**:
```sql
-- Save as: sql/monitoring/daily-health-check.sql

-- Database Health Report
SELECT 'Database Size' as metric, * FROM monitoring_database_size
UNION ALL
SELECT 'Connection Count' as metric, total_connections::text, null FROM monitoring_connections
UNION ALL
SELECT 'Active Connections' as metric, active_connections::text, null FROM monitoring_connections;

-- Top 10 Largest Tables
SELECT 'Large Tables' as category, tablename, total_size
FROM monitoring_table_sizes
LIMIT 10;

-- Slow Queries
SELECT 'Slow Queries' as category,
       query,
       mean_exec_time::text || 'ms' as avg_time
FROM monitoring_slow_queries
LIMIT 10;

-- Unused Indexes
SELECT 'Unused Indexes' as category,
       indexname,
       index_size
FROM monitoring_index_usage
WHERE index_scans = 0
LIMIT 10;
```

### Step 4: Automated Monitoring

**Create Monitoring Function**:
```sql
-- Function to collect and store monitoring data
CREATE OR REPLACE FUNCTION collect_monitoring_data()
RETURNS void AS $$
BEGIN
  -- Insert monitoring snapshot
  INSERT INTO monitoring_snapshots (
    collected_at,
    database_size_mb,
    connection_count,
    active_connections,
    slow_query_count,
    avg_response_time_ms
  )
  SELECT
    NOW(),
    pg_database_size('postgres') / 1024 / 1024,
    (SELECT COUNT(*) FROM pg_stat_activity),
    (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active'),
    (SELECT COUNT(*) FROM pg_stat_statements WHERE mean_exec_time > 100),
    (SELECT AVG(mean_exec_time) FROM pg_stat_statements)
  ;
END;
$$ LANGUAGE plpgsql;

-- Create monitoring snapshots table
CREATE TABLE IF NOT EXISTS monitoring_snapshots (
  id SERIAL PRIMARY KEY,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  database_size_mb INTEGER,
  connection_count INTEGER,
  active_connections INTEGER,
  slow_query_count INTEGER,
  avg_response_time_ms FLOAT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for time-based queries
CREATE INDEX idx_monitoring_snapshots_collected_at
  ON monitoring_snapshots(collected_at DESC);

-- Schedule function to run every 5 minutes
-- (Requires pg_cron extension - may need Supabase Enterprise plan)
-- SELECT cron.schedule('collect-monitoring-data', '*/5 * * * *', 'SELECT collect_monitoring_data()');
```

### Step 5: Database Alerts

**Configure Supabase Alerts**:

1. **High Connection Count**:
   ```sql
   -- Alert when connections > 80% of max
   SELECT
     CASE
       WHEN connection_count > 160 THEN 'CRITICAL'
       WHEN connection_count > 120 THEN 'WARNING'
       ELSE 'OK'
     END as status,
     connection_count
   FROM monitoring_connections;
   ```

2. **Slow Query Alert**:
   ```sql
   -- Alert when queries slower than 1 second
   SELECT COUNT(*) as critical_slow_queries
   FROM pg_stat_statements
   WHERE mean_exec_time > 1000;
   ```

3. **Database Size Alert**:
   ```sql
   -- Alert when database > 80% of plan limit
   SELECT
     pg_size_pretty(pg_database_size('postgres')) as current_size,
     CASE
       WHEN pg_database_size('postgres') > 8589934592 THEN 'CRITICAL'
       WHEN pg_database_size('postgres') > 6442450944 THEN 'WARNING'
       ELSE 'OK'
     END as status
   FROM pg_database;
   ```

---

## Custom Metrics & Logging

Implement custom application-level metrics and structured logging.

### Step 1: Metrics Collection

**Create Metrics Service**:
```typescript
// src/lib/metrics/collector.ts
interface Metric {
  name: string
  value: number
  tags: Record<string, string>
  timestamp: Date
}

class MetricsCollector {
  private metrics: Metric[] = []

  record(name: string, value: number, tags: Record<string, string> = {}) {
    this.metrics.push({
      name,
      value,
      tags,
      timestamp: new Date(),
    })
  }

  async flush() {
    if (this.metrics.length === 0) return

    try {
      // Send to custom analytics endpoint
      await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics: this.metrics }),
      })

      this.metrics = []
    } catch (error) {
      console.error('Failed to flush metrics:', error)
    }
  }

  // Message metrics
  recordMessageSent(organizationId: string, channel: string) {
    this.record('messages.sent', 1, { organizationId, channel })
  }

  recordMessageDelivered(organizationId: string, deliveryTime: number) {
    this.record('messages.delivered', 1, { organizationId })
    this.record('messages.delivery_time', deliveryTime, { organizationId })
  }

  // Payment metrics
  recordPaymentSuccess(organizationId: string, amount: number, plan: string) {
    this.record('payments.success', 1, { organizationId, plan })
    this.record('payments.amount', amount, { organizationId, plan })
  }

  recordPaymentFailure(organizationId: string, reason: string) {
    this.record('payments.failure', 1, { organizationId, reason })
  }

  // User metrics
  recordUserSignup(organizationId: string) {
    this.record('users.signup', 1, { organizationId })
  }

  recordUserLogin(organizationId: string) {
    this.record('users.login', 1, { organizationId })
  }

  // API metrics
  recordApiCall(endpoint: string, method: string, duration: number, status: number) {
    this.record('api.requests', 1, { endpoint, method, status: status.toString() })
    this.record('api.duration', duration, { endpoint, method })
  }
}

export const metrics = new MetricsCollector()

// Flush metrics every 10 seconds
if (typeof window !== 'undefined') {
  setInterval(() => metrics.flush(), 10000)
}
```

### Step 2: Structured Logging

**Create Logger Service**:
```typescript
// src/lib/logging/logger.ts
enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: Date
  context?: Record<string, any>
  userId?: string
  organizationId?: string
  requestId?: string
}

class Logger {
  private context: Record<string, any> = {}

  setContext(context: Record<string, any>) {
    this.context = { ...this.context, ...context }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      context: { ...this.context, ...context },
    }

    // Console logging (development)
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify(entry, null, 2))
    }

    // Production logging
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(entry)
    }
  }

  private async sendToLoggingService(entry: LogEntry) {
    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
    } catch (error) {
      console.error('Failed to send log:', error)
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log(LogLevel.DEBUG, message, context)
  }

  info(message: string, context?: Record<string, any>) {
    this.log(LogLevel.INFO, message, context)
  }

  warn(message: string, context?: Record<string, any>) {
    this.log(LogLevel.WARN, message, context)
  }

  error(message: string, context?: Record<string, any>) {
    this.log(LogLevel.ERROR, message, context)
  }
}

export const logger = new Logger()
```

**Usage**:
```typescript
import { logger } from '@/lib/logging/logger'
import { metrics } from '@/lib/metrics/collector'

export async function POST(request: Request) {
  const startTime = Date.now()

  try {
    logger.info('Processing message send request', {
      endpoint: '/api/messages',
    })

    const result = await sendMessage(data)

    const duration = Date.now() - startTime
    metrics.recordApiCall('/api/messages', 'POST', duration, 200)
    metrics.recordMessageSent(organizationId, 'whatsapp')

    logger.info('Message sent successfully', {
      messageId: result.id,
      duration,
    })

    return NextResponse.json(result)
  } catch (error) {
    const duration = Date.now() - startTime
    metrics.recordApiCall('/api/messages', 'POST', duration, 500)

    logger.error('Failed to send message', {
      error: error.message,
      duration,
    })

    throw error
  }
}
```

### Step 3: Metrics API Endpoint

**Create Metrics Collection Endpoint**:
```typescript
// src/app/api/metrics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { metrics } = await request.json()

    const supabase = await createClient()

    // Store metrics in database
    const { error } = await supabase
      .from('metrics')
      .insert(
        metrics.map((m: any) => ({
          name: m.name,
          value: m.value,
          tags: m.tags,
          timestamp: m.timestamp,
        }))
      )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to store metrics:', error)
    return NextResponse.json(
      { error: 'Failed to store metrics' },
      { status: 500 }
    )
  }
}
```

**Create Metrics Table**:
```sql
-- Metrics storage table
CREATE TABLE IF NOT EXISTS metrics (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  value NUMERIC NOT NULL,
  tags JSONB,
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for time-series queries
CREATE INDEX idx_metrics_timestamp ON metrics(timestamp DESC);
CREATE INDEX idx_metrics_name_timestamp ON metrics(name, timestamp DESC);

-- Enable RLS
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to insert metrics
CREATE POLICY metrics_insert_policy ON metrics
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow authenticated users to read their organization's metrics
CREATE POLICY metrics_select_policy ON metrics
  FOR SELECT
  USING (true);
```

---

## Health Check Configuration

Comprehensive health check system for monitoring service availability.

### Step 1: Enhanced Health Check Endpoint

The existing health check at `/api/health/route.ts` is already comprehensive. Let's add additional endpoints for specific checks:

**Database Health Check**:
```typescript
// src/app/api/health/db/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // Test database connectivity
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .single()

    const responseTime = Date.now() - startTime

    if (error && !error.message.includes('PGRST116')) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: error.message,
          responseTime: `${responseTime}ms`,
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      connectionPool: {
        // Add connection pool stats if available
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${Date.now() - startTime}ms`,
      },
      { status: 503 }
    )
  }
}
```

**Stripe Health Check**:
```typescript
// src/app/api/health/stripe/route.ts
import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function GET() {
  const startTime = Date.now()

  try {
    // Test Stripe API connectivity
    await stripe.accounts.retrieve()

    const responseTime = Date.now() - startTime

    return NextResponse.json({
      status: 'healthy',
      responseTime: `${responseTime}ms`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${Date.now() - startTime}ms`,
      },
      { status: 503 }
    )
  }
}
```

**WhatsApp Health Check**:
```typescript
// src/app/api/health/whatsapp/route.ts
import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    )

    const responseTime = Date.now() - startTime

    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: `HTTP ${response.status}`,
          responseTime: `${responseTime}ms`,
        },
        { status: 503 }
      )
    }

    return NextResponse.json({
      status: 'healthy',
      responseTime: `${responseTime}ms`,
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: `${Date.now() - startTime}ms`,
      },
      { status: 503 }
    )
  }
}
```

### Step 2: External Health Monitoring

**UptimeRobot Setup**:
```yaml
Service: UptimeRobot
URL: https://uptimerobot.com
Plan: Free (50 monitors)

Monitors:
  - Name: ADSapp Main Health
    URL: https://app.yourdomain.com/api/health
    Type: HTTP(s)
    Interval: 5 minutes
    Timeout: 30 seconds
    Expected Status: 200
    Alert Contacts: devops@yourdomain.com

  - Name: ADSapp Database
    URL: https://app.yourdomain.com/api/health/db
    Type: HTTP(s)
    Interval: 5 minutes

  - Name: ADSapp Stripe
    URL: https://app.yourdomain.com/api/health/stripe
    Type: HTTP(s)
    Interval: 15 minutes

  - Name: ADSapp WhatsApp
    URL: https://app.yourdomain.com/api/health/whatsapp
    Type: HTTP(s)
    Interval: 15 minutes
```

**Pingdom Setup** (Alternative):
```yaml
Service: Pingdom
URL: https://www.pingdom.com
Plan: Starter ($10/month)

Checks:
  - Name: ADSapp Production
    URL: https://app.yourdomain.com
    Interval: 1 minute
    Locations: US East, US West, Europe
    Alert Thresholds:
      Down: Immediate
      Slow: > 3 seconds
```

---

## Alert Configuration

Configure comprehensive alerting across all monitoring systems.

### Alert Channels

#### Slack Integration

**Setup Slack Webhook**:
```typescript
// src/lib/alerts/slack.ts
export async function sendSlackAlert(
  message: string,
  severity: 'info' | 'warning' | 'critical'
) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) return

  const color = {
    info: '#36a64f',
    warning: '#ff9900',
    critical: '#ff0000',
  }[severity]

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attachments: [
        {
          color,
          title: 'ADSapp Production Alert',
          text: message,
          footer: 'ADSapp Monitoring',
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    }),
  })
}
```

#### Email Alerts

**Setup Email Alerting**:
```typescript
// src/lib/alerts/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmailAlert(
  subject: string,
  message: string,
  recipients: string[]
) {
  await resend.emails.send({
    from: 'alerts@yourdomain.com',
    to: recipients,
    subject: `[ADSapp Alert] ${subject}`,
    html: `
      <h2>${subject}</h2>
      <p>${message}</p>
      <hr>
      <p><small>ADSapp Production Monitoring</small></p>
    `,
  })
}
```

### Alert Rules

**Configure Alert Thresholds**:
```typescript
// src/lib/alerts/rules.ts
export const alertRules = {
  errorRate: {
    warning: 0.01, // 1%
    critical: 0.05, // 5%
  },
  responseTime: {
    warning: 1000, // 1s
    critical: 3000, // 3s
  },
  databaseConnections: {
    warning: 120, // 60% of 200 max
    critical: 160, // 80% of 200 max
  },
  databaseSize: {
    warning: 8_000_000_000, // 8GB
    critical: 9_500_000_000, // 9.5GB
  },
  messageDeliveryRate: {
    warning: 0.95, // 95%
    critical: 0.90, // 90%
  },
}
```

---

## Incident Response Procedures

### Incident Severity Levels

```yaml
P1 - Critical:
  Definition: Complete service outage or data loss
  Response Time: Immediate
  Notification: All on-call engineers, management
  Examples:
    - Application completely down
    - Database inaccessible
    - Payment processing failing
    - Data breach or security incident

P2 - High:
  Definition: Major functionality impaired
  Response Time: 15 minutes
  Notification: On-call engineer, team lead
  Examples:
    - WhatsApp messages not sending
    - Authentication failures
    - Significant performance degradation

P3 - Medium:
  Definition: Minor functionality impaired
  Response Time: 1 hour
  Notification: On-call engineer
  Examples:
    - Email delivery delays
    - UI rendering issues
    - Non-critical API errors

P4 - Low:
  Definition: Minimal impact, cosmetic issues
  Response Time: Next business day
  Notification: Development team
  Examples:
    - UI styling issues
    - Slow analytics dashboard
    - Non-essential feature bugs
```

### Incident Response Process

**Step 1: Detection**
```
1. Alert triggered (automated monitoring)
2. User report (support ticket)
3. Team member discovery
```

**Step 2: Triage**
```
1. Assess severity (P1-P4)
2. Identify affected services
3. Estimate user impact
4. Assign incident commander
```

**Step 3: Response**
```
1. Create incident channel (#incident-YYYY-MM-DD)
2. Notify stakeholders
3. Begin investigation
4. Implement immediate mitigation
5. Deploy fix or rollback
6. Verify resolution
```

**Step 4: Recovery**
```
1. Restore full service
2. Verify all systems healthy
3. Monitor for recurring issues
4. Update status page
5. Notify users of resolution
```

**Step 5: Post-Mortem**
```
1. Document incident timeline
2. Identify root cause
3. List contributing factors
4. Define action items
5. Update runbooks
6. Schedule follow-up review
```

### Incident Communication Template

```markdown
# Incident Report: [Title]

**Incident ID**: INC-2025-10-20-001
**Severity**: P1 / P2 / P3 / P4
**Status**: Investigating / Identified / Monitoring / Resolved
**Started**: 2025-10-20 14:30 UTC
**Ended**: 2025-10-20 15:15 UTC
**Duration**: 45 minutes

## Impact
- **Users Affected**: 1,250 users
- **Services Affected**: WhatsApp message sending
- **Geographic Region**: US East
- **Business Impact**: $X,XXX estimated revenue loss

## Timeline
- **14:30 UTC**: Alert triggered - high error rate detected
- **14:32 UTC**: Incident declared, team notified
- **14:35 UTC**: Root cause identified - WhatsApp API rate limit
- **14:45 UTC**: Mitigation deployed - rate limiting implemented
- **15:00 UTC**: Service restored
- **15:15 UTC**: Incident closed

## Root Cause
WhatsApp API rate limit exceeded due to sudden spike in message volume.

## Resolution
Implemented message queue with rate limiting and retry logic.

## Action Items
1. [ ] Implement better rate limiting (Owner: DevOps, Due: 2025-10-22)
2. [ ] Add queue monitoring (Owner: Backend, Due: 2025-10-23)
3. [ ] Update runbooks (Owner: SRE, Due: 2025-10-24)

## Lessons Learned
- Need better visibility into third-party API rate limits
- Queue system should have been in place proactively
- Alert thresholds need tuning to catch this earlier
```

---

## Monitoring Dashboard

### Recommended Dashboard Tools

**Grafana** (Recommended):
```yaml
Advantages:
  - Open source and free
  - Excellent visualization
  - Wide data source support
  - Alerting capabilities

Setup:
  - Host: Grafana Cloud (free tier) or self-hosted
  - Data Sources: PostgreSQL, Prometheus, JSON API
  - Dashboards: Pre-built templates available
```

**Datadog** (Premium Alternative):
```yaml
Advantages:
  - All-in-one monitoring
  - Excellent APM features
  - Great alerting system
  - Good mobile app

Disadvantages:
  - Expensive ($15-31/host/month)
  - Overkill for small teams
```

### Key Dashboard Panels

**1. System Overview**:
```yaml
Panels:
  - Uptime (last 24h, 7d, 30d)
  - Request rate (requests/minute)
  - Error rate (%)
  - Average response time (ms)
  - Active users
  - Database connections
```

**2. Application Performance**:
```yaml
Panels:
  - API endpoint response times (p50, p95, p99)
  - Throughput by endpoint
  - Error rate by endpoint
  - Cache hit rate
  - Function execution duration
```

**3. Database Metrics**:
```yaml
Panels:
  - Query performance (slow queries)
  - Connection pool usage
  - Database size growth
  - Table sizes
  - Index efficiency
  - Replication lag (if applicable)
```

**4. Business Metrics**:
```yaml
Panels:
  - Messages sent/received (per hour)
  - Active conversations
  - New user signups
  - Subscription conversions
  - Payment success rate
  - Revenue (daily, monthly)
```

**5. External Services**:
```yaml
Panels:
  - WhatsApp API status
  - Stripe API status
  - Resend delivery rate
  - Third-party API latency
```

---

## Performance Optimization

Based on monitoring data, implement continuous performance optimization.

### Optimization Checklist

**Database Optimization**:
- [ ] Identify and optimize slow queries (> 100ms)
- [ ] Add missing indexes
- [ ] Remove unused indexes
- [ ] Configure connection pooling
- [ ] Implement query caching
- [ ] Schedule regular VACUUM ANALYZE

**API Optimization**:
- [ ] Implement response caching
- [ ] Add request rate limiting
- [ ] Optimize payload sizes
- [ ] Enable compression (gzip)
- [ ] Use CDN for static assets
- [ ] Implement pagination for large datasets

**Frontend Optimization**:
- [ ] Code splitting
- [ ] Lazy loading components
- [ ] Image optimization
- [ ] Font optimization
- [ ] Reduce JavaScript bundle size
- [ ] Implement service worker caching

**Infrastructure Optimization**:
- [ ] Use edge functions where applicable
- [ ] Implement proper caching headers
- [ ] Configure CDN properly
- [ ] Optimize database queries
- [ ] Review and optimize function timeouts

---

## Summary

### Monitoring Checklist

**Production Monitoring Setup**:
- [ ] Vercel Analytics enabled
- [ ] Vercel Speed Insights configured
- [ ] Sentry error tracking configured
- [ ] Database monitoring views created
- [ ] Custom metrics collection implemented
- [ ] Structured logging implemented
- [ ] Health check endpoints verified
- [ ] External monitoring configured (UptimeRobot/Pingdom)
- [ ] Alert rules configured
- [ ] Slack/Email alerts set up
- [ ] Incident response procedures documented
- [ ] Monitoring dashboard created
- [ ] Team trained on monitoring tools
- [ ] On-call rotation established

### Key Contacts

```
Monitoring Lead: ____________________
Database Admin: ____________________
DevOps Engineer: ____________________
On-Call Engineer: ____________________
Emergency Contact: ____________________
```

### Monitoring Dashboard URLs

```
Vercel Analytics: https://vercel.com/your-team/adsapp/analytics
Sentry Dashboard: https://sentry.io/organizations/your-org/projects/adsapp/
Supabase Monitoring: https://app.supabase.com/project/your-project/database/query-performance
Grafana Dashboard: https://your-grafana-instance/d/adsapp
UptimeRobot: https://uptimerobot.com
```

---

**Document Version**: 1.0.0
**Last Updated**: October 2025
**Next Review**: November 2025
**Owner**: DevOps Team
**Status**: Production Ready ✅
