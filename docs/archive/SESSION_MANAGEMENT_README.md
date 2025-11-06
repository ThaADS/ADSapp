# Session Management System - Implementation Guide

## Overview

Enterprise-grade session management system for ADSapp implementing **C-004: Session Management** security fix.

**Security Objective**: Fix CVSS 7.5 vulnerability "Session Management Issues"

### Key Features

- ✅ 30-minute inactivity timeout
- ✅ Secure session storage with Upstash Redis
- ✅ Session regeneration on privilege changes
- ✅ Concurrent session management (max 5 per user)
- ✅ Session revocation capability
- ✅ Comprehensive audit logging
- ✅ Multi-device tracking
- ✅ Automatic session cleanup

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Request                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Session Middleware                             │
│  - Extract session token from cookie                        │
│  - Validate session with Redis                              │
│  - Check privilege changes                                  │
│  - Update last activity                                     │
│  - Extend session TTL                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Session Manager                                │
│  - Create/validate/refresh sessions                         │
│  - Enforce concurrent session limits                        │
│  - Handle session revocation                                │
│  - Detect privilege changes                                 │
│  - Audit logging                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Redis Session Store (Upstash)                  │
│  - Fast session storage/retrieval                           │
│  - Automatic TTL expiration                                 │
│  - Atomic concurrent session limits                         │
│  - Device fingerprinting                                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          Supabase PostgreSQL (Audit Log)                    │
│  - Persistent session records                               │
│  - Security event logging                                   │
│  - Session analytics                                        │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── lib/
│   ├── session/
│   │   ├── redis-store.ts          # Upstash Redis integration
│   │   └── manager.ts               # Session business logic
│   └── middleware/
│       └── session.ts               # Request validation
├── app/api/auth/session/
│   ├── refresh/route.ts             # POST /api/auth/session/refresh
│   ├── revoke/route.ts              # DELETE /api/auth/session/revoke
│   ├── revoke-all/route.ts          # DELETE /api/auth/session/revoke-all
│   └── list/route.ts                # GET /api/auth/session/list
└── types/
    └── database.ts                  # TypeScript definitions

supabase/migrations/
└── 20251014_session_management.sql  # Database schema

tests/
├── unit/
│   └── session.test.ts              # Unit tests (15+ tests)
└── integration/
    └── session-flow.test.ts         # Integration tests (12+ tests)
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @upstash/redis
```

### 2. Configure Upstash Redis

1. Sign up at https://console.upstash.com/redis
2. Create a new Redis database
3. Copy the REST URL and token

### 3. Environment Variables

Add to `.env.local`:

```env
# Session Management (Upstash Redis)
UPSTASH_REDIS_REST_URL=https://your-upstash-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
SESSION_TIMEOUT_MINUTES=30
MAX_CONCURRENT_SESSIONS=5
```

### 4. Run Database Migration

```bash
# Apply migration to Supabase
npm run migration:apply

# Or manually via SQL
psql -h your-supabase-host -d postgres -f supabase/migrations/20251014_session_management.sql
```

### 5. Verify Installation

```bash
# Type checking
npm run type-check

# Run unit tests
npm run test tests/unit/session.test.ts

# Run integration tests
npm run test tests/integration/session-flow.test.ts
```

## Usage

### Creating a Session

```typescript
import { getSessionManager } from '@/lib/session/manager'

const manager = getSessionManager()

const { session, token } = await manager.createSession({
  userId: 'user-123',
  organizationId: 'org-456',
  userRole: 'admin',
  deviceInfo: {
    userAgent: req.headers.get('user-agent') || '',
    ip: getClientIp(req),
    platform: 'web',
  },
})

// Set cookie with session token
response.cookies.set('adsapp_session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 60, // 30 minutes
})
```

### Validating a Session

```typescript
import { validateSession, getSessionContext } from '@/lib/middleware/session'

export async function GET(request: NextRequest) {
  // Validate session
  const validation = await validateSession(request)
  if (validation) return validation // Returns error response if invalid

  // Get session context
  const context = getSessionContext(request)
  console.log('User:', context.userId)
  console.log('Organization:', context.organizationId)
  console.log('Expires:', context.expiresAt)

  // Your business logic here
}
```

### Refreshing a Session

```typescript
// Client-side: Send POST to /api/auth/session/refresh
const response = await fetch('/api/auth/session/refresh', {
  method: 'POST',
  credentials: 'include', // Include cookies
})

const { success, session } = await response.json()
```

### Listing Active Sessions

```typescript
// Client-side: Get all active sessions
const response = await fetch('/api/auth/session/list')
const { sessions, totalSessions } = await response.json()

sessions.forEach(session => {
  console.log('Device:', session.deviceInfo.platform)
  console.log('Last Activity:', session.lastActivity)
  console.log('Current:', session.isCurrent)
})
```

### Revoking a Session

```typescript
// Revoke specific session
await fetch('/api/auth/session/revoke', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sessionToken: 'token-to-revoke',
  }),
})

// Revoke all sessions (e.g., on password change)
await fetch('/api/auth/session/revoke-all', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reason: 'password_changed',
  }),
})
```

## API Endpoints

### POST /api/auth/session/refresh

Refresh an active session, extending its TTL.

**Request**: No body required (uses session cookie)

**Response**:

```json
{
  "success": true,
  "session": {
    "userId": "user-123",
    "organizationId": "org-456",
    "lastActivity": "2025-10-14T10:30:00Z",
    "expiresAt": "2025-10-14T11:00:00Z"
  }
}
```

### GET /api/auth/session/list

List all active sessions for the authenticated user.

**Response**:

```json
{
  "success": true,
  "sessions": [
    {
      "sessionToken": "token-123",
      "deviceInfo": {
        "userAgent": "Chrome/100 on Mac OS",
        "ip": "192.168.*.*",
        "platform": "web"
      },
      "createdAt": "2025-10-14T10:00:00Z",
      "lastActivity": "2025-10-14T10:30:00Z",
      "expiresAt": "2025-10-14T11:00:00Z",
      "isCurrent": true
    }
  ],
  "totalSessions": 3,
  "maxSessions": 5
}
```

### DELETE /api/auth/session/revoke

Revoke a specific session.

**Request**:

```json
{
  "sessionToken": "token-to-revoke" // Optional, defaults to current
}
```

**Response**:

```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

### DELETE /api/auth/session/revoke-all

Revoke all user sessions.

**Request**:

```json
{
  "reason": "password_changed" // Required
}
```

Valid reasons:

- `password_changed`
- `security_event`
- `user_action`
- `account_compromise`

**Response**:

```json
{
  "success": true,
  "message": "Revoked 3 session(s)",
  "count": 3,
  "reason": "password_changed"
}
```

## Security Features

### 1. Session Timeout

- **Inactivity Timeout**: 30 minutes (configurable)
- **Automatic Extension**: On each authenticated request
- **Hard Expiration**: Session expires even if active
- **Graceful Handling**: User redirected to login on expiration

### 2. Concurrent Session Management

- **Maximum Sessions**: 5 per user (configurable)
- **FIFO Eviction**: Oldest session removed when limit reached
- **Device Tracking**: Identify sessions by device/browser
- **User Control**: Users can view and revoke specific sessions

### 3. Privilege Change Detection

- **Automatic Detection**: Compares session role with current user role
- **Session Regeneration**: New session token issued on privilege change
- **Seamless Transition**: User maintains authentication
- **Audit Logging**: All privilege changes logged

### 4. Session Revocation

- **Individual Revocation**: Logout from specific device
- **Bulk Revocation**: Revoke all sessions (password change, security event)
- **Immediate Effect**: Revoked sessions invalid immediately
- **Audit Trail**: All revocations logged with reason

### 5. Device Fingerprinting

- **Unique Identification**: User agent + IP + platform
- **Session Tracking**: Identify suspicious activity
- **Multi-Device Support**: Different sessions per device
- **Privacy Aware**: IP addresses masked in logs

## Database Schema

### sessions Table

```sql
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  session_token text NOT NULL UNIQUE,
  device_info jsonb NOT NULL,
  user_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  revoked_at timestamptz,
  revoked_reason text
);
```

### Key Indexes

```sql
-- Performance indexes
CREATE INDEX idx_sessions_user_id ON sessions(user_id) WHERE NOT revoked;
CREATE INDEX idx_sessions_session_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at) WHERE NOT revoked;

-- Query optimization
CREATE INDEX idx_sessions_user_active ON sessions(user_id, last_activity DESC) WHERE NOT revoked;
```

### Functions

- `cleanup_expired_sessions()`: Automatic session cleanup
- `revoke_all_user_sessions(user_id, reason)`: Bulk revocation
- `get_user_session_stats(user_id)`: Session analytics
- `check_privilege_change(user_id, token)`: Privilege detection

## Testing

### Running Tests

```bash
# All tests
npm run test

# Unit tests only
npm run test tests/unit/session.test.ts

# Integration tests only
npm run test tests/integration/session-flow.test.ts

# With coverage
npm run test:coverage
```

### Test Coverage

- ✅ Session creation and storage
- ✅ Session validation and retrieval
- ✅ Session activity updates
- ✅ Concurrent session limits (FIFO eviction)
- ✅ Session revocation (individual and bulk)
- ✅ Session expiration handling
- ✅ Privilege change detection
- ✅ API endpoint integration
- ✅ Error handling and edge cases

## Monitoring & Observability

### Health Check

```typescript
import { checkSessionHealth } from '@/lib/middleware/session'

const health = await checkSessionHealth()
if (!health.healthy) {
  console.error('Redis unhealthy:', health.error)
  // Alert operations team
}
```

### Session Metrics

```typescript
import { getSessionManager } from '@/lib/session/manager'

const manager = getSessionManager()
const stats = await manager.getStore().getUserSessionStats(userId)

console.log('Total Sessions:', stats.totalSessions)
console.log('Active Sessions:', stats.activeSessions)
console.log('Revoked Sessions:', stats.revokedSessions)
```

### Audit Events

All session operations are logged:

- `session_created`: New session created
- `session_validated`: Session validated successfully
- `session_refreshed`: Session activity updated
- `session_revoked`: Session revoked
- `session_expired`: Session expired
- `privilege_changed`: User role changed
- `concurrent_limit`: Session limit reached
- `security_event`: Security-related event

Events are logged to:

- **Development**: Console
- **Production**: Sentry + Custom monitoring

## Troubleshooting

### Session Not Found

**Symptom**: Users logged out unexpectedly

**Causes**:

1. Redis connection lost
2. Session expired (30 min inactivity)
3. Session revoked (security event)

**Solution**:

1. Check Redis health: `checkSessionHealth()`
2. Review session timeout configuration
3. Check audit logs for revocation events

### Concurrent Session Limit

**Symptom**: Old sessions evicted when new sessions created

**Causes**:

1. User exceeds 5 concurrent sessions
2. Multiple devices/browsers

**Solution**:

1. User should revoke unused sessions
2. Increase `MAX_CONCURRENT_SESSIONS` if needed
3. Review active sessions via `/api/auth/session/list`

### Privilege Changes Not Detected

**Symptom**: User role changes not triggering session regeneration

**Causes**:

1. Role not updated in database
2. Session middleware not applied
3. Cache issue

**Solution**:

1. Verify role in `profiles` table
2. Ensure `validateSession` middleware used
3. Clear Redis cache if needed

## Performance Optimization

### Redis Configuration

```typescript
// Optimize connection pooling
const store = new RedisSessionStore({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  sessionTimeoutMinutes: 30,
  maxConcurrentSessions: 5,
})
```

### Caching Strategy

- **Session TTL**: 30 minutes (Redis automatic expiration)
- **User Sessions Index**: Cached with session TTL
- **Organization Sessions**: Cached per organization
- **Cleanup**: Automatic via Redis TTL + daily batch cleanup

### Query Optimization

```sql
-- Use appropriate indexes
EXPLAIN ANALYZE SELECT * FROM sessions
WHERE user_id = 'user-123'
AND NOT revoked
ORDER BY last_activity DESC;

-- Should use idx_sessions_user_active
```

## Production Checklist

- [ ] Upstash Redis configured and tested
- [ ] Environment variables set correctly
- [ ] Database migration applied
- [ ] Session middleware integrated
- [ ] All tests passing
- [ ] Health checks configured
- [ ] Monitoring/alerting set up
- [ ] Audit logging verified
- [ ] Load testing completed
- [ ] Documentation reviewed

## Security Compliance

✅ **OWASP Session Management**

- Secure cookie attributes (HttpOnly, Secure, SameSite)
- Session timeout enforcement
- Session regeneration on privilege change
- Concurrent session management
- Session revocation capability

✅ **CVSS 7.5 Vulnerability Addressed**

- 30-minute inactivity timeout
- Secure Redis storage
- Privilege change detection
- Comprehensive audit logging

## Support & Maintenance

### Maintenance Tasks

**Daily**:

- Monitor Redis health
- Review audit logs for anomalies

**Weekly**:

- Analyze session metrics
- Review revocation patterns

**Monthly**:

- Database cleanup (old revoked sessions)
- Performance optimization review
- Security audit

### Getting Help

1. Check this README
2. Review test files for examples
3. Check Sentry for error logs
4. Review Supabase audit logs

## License

Enterprise license - ADSapp internal use only.
