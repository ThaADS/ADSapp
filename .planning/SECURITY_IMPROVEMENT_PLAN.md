# Security, Tenant Isolation & Protection Improvement Plan

**Analysis Date:** 2026-01-23
**Priority Legend:** 🔴 Critical | 🟡 High | 🟢 Medium

---

## Executive Summary

Based on analysis of the codebase documentation, the following critical areas require attention:

| Category | Critical Issues | High Priority | Medium Priority |
|----------|-----------------|---------------|-----------------|
| **Tenant Isolation** | 3 | 2 | 1 |
| **Security** | 4 | 3 | 2 |
| **Type Safety** | 2 | 1 | 1 |
| **Audit & Compliance** | 2 | 2 | 1 |

**Total Estimated Effort:** 6-8 weeks for Phase 1-2 (Critical + High)

---

## Phase 1: Critical Security Fixes (Week 1-2)

### 🔴 1.1 RLS Policy Hardening
**Problem:** Multiple RLS policy fixes needed (70+ migrations). Nested queries cause recursion issues.
**Risk:** Cross-tenant data leakage

**Actions:**
```sql
-- Create standardized RLS policy template function
CREATE OR REPLACE FUNCTION auth.org_isolation_policy(table_name text)
RETURNS text AS $$
BEGIN
  RETURN format(
    'CREATE POLICY org_isolation ON %I
     FOR ALL USING (organization_id = auth.org_id())
     WITH CHECK (organization_id = auth.org_id())',
    table_name
  );
END;
$$ LANGUAGE plpgsql;

-- Create helper function that doesn't cause recursion
CREATE OR REPLACE FUNCTION auth.org_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'organization_id',
    (SELECT organization_id FROM profiles WHERE id = auth.uid())
  )::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

**Files to modify:**
- `supabase/migrations/` - New consolidated RLS migration
- `src/lib/supabase/server.ts` - Add org_id to JWT claims

**Validation:**
- [ ] Create multi-org test suite
- [ ] Test nested queries with 2+ organizations
- [ ] Verify no data leakage between tenants

---

### 🔴 1.2 Service Role Client Access Control
**Problem:** `createServiceRoleClient()` bypasses RLS. No explicit super-admin verification in all usages.
**Risk:** Unauthorized cross-tenant data access

**Current state (5 callers):**
- `src/lib/supabase/server.ts`
- `src/app/api/onboarding/route.ts`
- `src/app/api/organizations/[id]/branding/route.ts`

**Actions:**

```typescript
// src/lib/supabase/server.ts - Add guard
export function createServiceRoleClient() {
  // Log all service role client creations for audit
  console.warn('[AUDIT] Service role client created', {
    timestamp: new Date().toISOString(),
    stack: new Error().stack?.split('\n')[2]
  })

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { ... }
  )
}

// Create guarded version for admin routes
export async function createAdminClient(userId: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .single()

  if (!profile?.is_super_admin) {
    throw new ApiException('Forbidden: Super admin access required', 403)
  }

  return createServiceRoleClient()
}
```

**Files to modify:**
- `src/lib/supabase/server.ts` - Add `createAdminClient()`
- All `/api/admin/*` routes - Replace `createServiceRoleClient()` with `createAdminClient()`

---

### 🔴 1.3 Input Validation Enforcement
**Problem:** Not all API routes use QueryValidators. Arbitrary JSON payloads accepted.
**Risk:** SQL injection, XSS, data corruption

**Gaps identified:**
- `src/app/api/bulk/campaigns/route.ts`
- `src/app/api/workflows/[id]/execute/route.ts`

**Actions:**

```typescript
// src/lib/api-middleware.ts - Create validation middleware
import { z } from 'zod'
import { QueryValidators, detectSQLInjection } from '@/lib/security/input-validation'

export function validateRequest<T extends z.ZodSchema>(schema: T) {
  return async (request: Request) => {
    const body = await request.json()

    // Check for SQL injection in all string fields
    const checkInjection = (obj: any, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && detectSQLInjection(value)) {
          throw new ApiException(`SQL injection detected in ${path}${key}`, 400, 'SQL_INJECTION')
        }
        if (typeof value === 'object' && value !== null) {
          checkInjection(value, `${path}${key}.`)
        }
      }
    }
    checkInjection(body)

    // Validate against schema
    const result = schema.safeParse(body)
    if (!result.success) {
      throw new ApiException(result.error.message, 400, 'VALIDATION_ERROR')
    }

    return result.data
  }
}
```

**Create Zod schemas for all POST/PUT/PATCH routes:**
- `src/lib/schemas/bulk-campaign.ts`
- `src/lib/schemas/workflow-execution.ts`
- `src/lib/schemas/contact.ts`
- etc.

---

### 🔴 1.4 Credential Access Audit Trail
**Problem:** No audit logging for credential decryption. Can't trace who accessed WhatsApp tokens.
**Risk:** Compliance failure, security forensics impossible

**Actions:**

```typescript
// src/lib/security/credential-manager.ts
export async function decryptCredential(
  encryptedData: string,
  userId: string,
  purpose: string
): Promise<string> {
  // Log access BEFORE decryption
  await auditLog({
    event: 'CREDENTIAL_ACCESS',
    userId,
    purpose,
    timestamp: new Date().toISOString(),
    credentialType: 'encrypted',
    success: false // Will update after
  })

  try {
    const decrypted = await kmsDecrypt(encryptedData)

    // Update audit log on success
    await auditLog({
      event: 'CREDENTIAL_ACCESS',
      userId,
      purpose,
      timestamp: new Date().toISOString(),
      credentialType: 'encrypted',
      success: true
    })

    return decrypted
  } catch (error) {
    // Log failed decryption attempt
    await auditLog({
      event: 'CREDENTIAL_ACCESS_FAILED',
      userId,
      purpose,
      error: error.message
    })
    throw error
  }
}
```

**New table:**
```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  organization_id uuid REFERENCES organizations(id),
  resource_type text,
  resource_id text,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Index for fast queries
CREATE INDEX idx_audit_logs_org_created ON audit_logs(organization_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);

-- RLS: Only super admins can read audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_read ON audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));
```

---

## Phase 2: High Priority Improvements (Week 3-4)

### 🟡 2.1 TypeScript Strict Mode Migration
**Problem:** `strict: false` with 247 files using `@ts-nocheck`. Type errors hidden.
**Risk:** Runtime failures, refactoring danger

**Migration Strategy:**
1. Enable strict mode for critical paths first
2. Create separate tsconfig for security modules

```json
// tsconfig.strict.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  },
  "include": [
    "src/lib/supabase/**/*",
    "src/lib/security/**/*",
    "src/lib/auth*.ts",
    "src/app/api/admin/**/*"
  ]
}
```

**Pre-commit hook:**
```bash
# .husky/pre-commit
npx tsc --project tsconfig.strict.json --noEmit
```

**Priority files to fix (security-critical):**
1. `src/lib/supabase/server.ts`
2. `src/lib/security/input-validation.ts`
3. `src/lib/security/credential-manager.ts`
4. `src/lib/auth.ts`
5. `src/lib/auth-optimized.ts`

---

### 🟡 2.2 Organization Context Validation
**Problem:** If organization_id missing, RLS silently returns empty (no error). Easy to miss.
**Risk:** Data appears missing instead of authorization error

**Actions:**

```typescript
// src/lib/api-utils.ts - Add strict org validation
export async function requireOrganizationContext(userId: string): Promise<{
  organizationId: string
  role: UserRole
}> {
  const supabase = await createClient()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    throw new ApiException('User profile not found', 401, 'NO_PROFILE')
  }

  if (!profile.organization_id) {
    throw new ApiException('No organization context', 403, 'NO_ORG_CONTEXT')
  }

  return {
    organizationId: profile.organization_id,
    role: profile.role as UserRole
  }
}

// Usage in all API routes:
export async function GET(request: Request) {
  const user = await requireAuthenticatedUser()
  const { organizationId, role } = await requireOrganizationContext(user.id)

  // Now guaranteed to have org context
  const { data } = await supabase
    .from('contacts')
    .select()
    .eq('organization_id', organizationId)
}
```

---

### 🟡 2.3 Webhook Signature Validation Hardening
**Problem:** WhatsApp webhook validation not fully tested. Potential for forged webhooks.
**Risk:** Accepting malicious webhook payloads

**Actions:**

```typescript
// src/lib/middleware/whatsapp-webhook-validator.ts
import crypto from 'crypto'

export function validateWhatsAppWebhook(
  rawBody: string,
  signature: string | null
): boolean {
  if (!signature) {
    console.error('[SECURITY] Missing webhook signature')
    return false
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.WHATSAPP_APP_SECRET!)
    .update(rawBody)
    .digest('hex')

  const providedSignature = signature.replace('sha256=', '')

  // Timing-safe comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(providedSignature)
  )

  if (!isValid) {
    console.error('[SECURITY] Invalid webhook signature', {
      expected: expectedSignature.slice(0, 10) + '...',
      provided: providedSignature.slice(0, 10) + '...'
    })
  }

  return isValid
}
```

**Add idempotency for webhook processing:**

```typescript
// src/lib/webhooks/idempotency.ts
export async function processWebhookIdempotent(
  webhookId: string,
  processor: () => Promise<void>
): Promise<{ processed: boolean; cached: boolean }> {
  const redis = getRedisClient()
  const key = `webhook:${webhookId}`

  // Check if already processed
  const existing = await redis.get(key)
  if (existing) {
    return { processed: true, cached: true }
  }

  // Set processing flag with 24h TTL
  const acquired = await redis.set(key, 'processing', 'NX', 'EX', 86400)
  if (!acquired) {
    // Another instance is processing
    return { processed: false, cached: false }
  }

  try {
    await processor()
    await redis.set(key, 'completed', 'EX', 86400)
    return { processed: true, cached: false }
  } catch (error) {
    await redis.del(key)
    throw error
  }
}
```

---

### 🟡 2.4 Console Logging Sanitization
**Problem:** 732 console.log calls in `src/lib/`. May expose sensitive data.
**Risk:** PII exposure in logs

**Actions:**

```typescript
// src/lib/logger.ts - Create secure logger
const SENSITIVE_KEYS = [
  'password', 'token', 'secret', 'key', 'authorization',
  'phone', 'email', 'ssn', 'credit_card', 'api_key'
]

function sanitize(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj

  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj }

  for (const key of Object.keys(sanitized)) {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitize(sanitized[key])
    }
  }

  return sanitized
}

export const logger = {
  info: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG) {
      console.log(`[INFO] ${message}`, data ? sanitize(data) : '')
    }
  },
  error: (message: string, error?: any, context?: any) => {
    console.error(`[ERROR] ${message}`, {
      error: error?.message || error,
      stack: error?.stack?.split('\n').slice(0, 3),
      context: context ? sanitize(context) : undefined
    })
  },
  security: (event: string, data: any) => {
    // Always log security events
    console.log(`[SECURITY] ${event}`, sanitize(data))
  }
}
```

**Migration script to replace console.log:**
```bash
# Find and replace console.log in security-critical files
find src/lib/security src/lib/auth* src/lib/supabase -name "*.ts" -exec \
  sed -i 's/console\.log/logger.info/g' {} \;
```

---

## Phase 3: Medium Priority Improvements (Week 5-6)

### 🟢 3.1 Encryption Key Rotation
**Problem:** Single master key for all credentials. No rotation mechanism.
**Risk:** If key compromised, all credentials exposed

**Actions:**
1. Implement versioned encryption keys
2. Create key rotation procedure
3. Add re-encryption job

```typescript
// src/lib/security/key-rotation.ts
interface EncryptedData {
  version: number
  ciphertext: string
  iv: string
}

export async function encryptWithVersion(
  plaintext: string,
  keyVersion: number = getCurrentKeyVersion()
): Promise<EncryptedData> {
  const key = await getKeyByVersion(keyVersion)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ])

  return {
    version: keyVersion,
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64')
  }
}

export async function rotateAllCredentials() {
  const newVersion = getCurrentKeyVersion() + 1

  // Get all encrypted credentials
  const serviceSupabase = createServiceRoleClient()
  const { data: credentials } = await serviceSupabase
    .from('organization_credentials')
    .select('id, encrypted_data')
    .lt('key_version', newVersion)

  for (const cred of credentials || []) {
    // Decrypt with old key
    const decrypted = await decryptWithVersion(cred.encrypted_data)

    // Re-encrypt with new key
    const reEncrypted = await encryptWithVersion(decrypted, newVersion)

    // Update in database
    await serviceSupabase
      .from('organization_credentials')
      .update({
        encrypted_data: reEncrypted,
        key_version: newVersion
      })
      .eq('id', cred.id)
  }
}
```

---

### 🟢 3.2 RLS Policy Automated Testing
**Problem:** No automated tests for RLS policy correctness.
**Risk:** Policy changes may introduce data leakage

**Actions:**

```typescript
// tests/integration/rls-policies.test.ts
import { createClient } from '@supabase/supabase-js'

describe('RLS Policy Isolation', () => {
  const org1User = createAuthenticatedClient('org1-user@test.com')
  const org2User = createAuthenticatedClient('org2-user@test.com')

  beforeAll(async () => {
    // Create test data in both orgs
    await seedTestData('org1', 'org2')
  })

  it('should not allow org1 user to see org2 contacts', async () => {
    const { data, error } = await org1User
      .from('contacts')
      .select()
      .eq('organization_id', 'org2-id')

    expect(data).toHaveLength(0) // RLS should filter
  })

  it('should not allow org1 user to insert into org2', async () => {
    const { error } = await org1User
      .from('contacts')
      .insert({
        name: 'Malicious',
        organization_id: 'org2-id' // Trying to insert into wrong org
      })

    expect(error).toBeTruthy()
    expect(error.code).toBe('42501') // RLS violation
  })

  it('should prevent org1 user from updating org2 data', async () => {
    const { error } = await org1User
      .from('contacts')
      .update({ name: 'Hacked' })
      .eq('organization_id', 'org2-id')

    // Should silently affect 0 rows (RLS filters)
    expect(error).toBeNull()
  })

  // Test all tables with organization_id
  const tables = [
    'contacts', 'conversations', 'messages',
    'automation_rules', 'workflows', 'message_templates'
  ]

  tables.forEach(table => {
    it(`should isolate ${table} by organization`, async () => {
      const { data } = await org1User
        .from(table)
        .select('organization_id')

      // All returned rows should belong to org1
      data?.forEach(row => {
        expect(row.organization_id).toBe('org1-id')
      })
    })
  })
})
```

---

### 🟢 3.3 Session Security Hardening
**Problem:** Token re-validated on every request. No efficient caching.
**Risk:** Performance issues, potential token replay

**Actions:**

```typescript
// src/lib/session/secure-session.ts
import { SignJWT, jwtVerify } from 'jose'

const SESSION_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
const SESSION_TTL = 15 * 60 // 15 minutes

export async function createSecureSession(userId: string, orgId: string) {
  const token = await new SignJWT({
    sub: userId,
    org: orgId,
    iat: Date.now()
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .sign(SESSION_SECRET)

  // Store session fingerprint in Redis
  const redis = getRedisClient()
  await redis.set(
    `session:${userId}`,
    JSON.stringify({
      token: hashToken(token),
      orgId,
      createdAt: Date.now()
    }),
    'EX',
    SESSION_TTL
  )

  return token
}

export async function validateSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET)

    // Check Redis for session validity
    const redis = getRedisClient()
    const session = await redis.get(`session:${payload.sub}`)

    if (!session) {
      throw new Error('Session expired or invalidated')
    }

    const parsed = JSON.parse(session)
    if (parsed.token !== hashToken(token)) {
      throw new Error('Token mismatch - possible replay attack')
    }

    return {
      userId: payload.sub as string,
      orgId: payload.org as string
    }
  } catch (error) {
    throw new ApiException('Invalid session', 401, 'INVALID_SESSION')
  }
}

// Invalidate all sessions for a user (e.g., password change)
export async function invalidateAllSessions(userId: string) {
  const redis = getRedisClient()
  await redis.del(`session:${userId}`)
}
```

---

## Phase 4: Compliance & Monitoring (Week 7-8)

### 🟢 4.1 Complete Audit Trail System
**Extend audit logging to cover:**
- All CRUD operations on sensitive tables
- Authentication events (login, logout, MFA)
- Role changes
- Billing operations
- Data exports

### 🟢 4.2 Security Headers Enhancement
```typescript
// next.config.ts - Add missing security headers
const securityHeaders = [
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  }
]
```

### 🟢 4.3 Automated Security Scanning
```yaml
# .github/workflows/security.yml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run npm audit
        run: npm audit --audit-level=high

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

      - name: Run CodeQL analysis
        uses: github/codeql-action/analyze@v2
        with:
          languages: typescript
```

---

## Implementation Checklist

### Week 1-2 (Critical)
- [ ] Implement RLS policy helper functions
- [ ] Add service role client guards
- [ ] Create Zod validation schemas for all routes
- [ ] Implement credential access audit logging
- [ ] Create audit_logs table

### Week 3-4 (High Priority)
- [ ] Create tsconfig.strict.json for security modules
- [ ] Fix type errors in security-critical files
- [ ] Implement `requireOrganizationContext()`
- [ ] Harden webhook signature validation
- [ ] Add idempotency to webhook processing
- [ ] Create secure logger utility

### Week 5-6 (Medium Priority)
- [ ] Implement encryption key versioning
- [ ] Create key rotation procedure
- [ ] Add RLS policy integration tests
- [ ] Implement secure session management

### Week 7-8 (Compliance)
- [ ] Extend audit logging coverage
- [ ] Add security headers
- [ ] Set up automated security scanning
- [ ] Document security procedures

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Files with @ts-nocheck in security paths | 12 | 0 |
| API routes without input validation | ~15 | 0 |
| RLS policy test coverage | 0% | 100% |
| Audit trail coverage | 0% | 95% |
| Security headers score (securityheaders.com) | D | A |
| npm audit vulnerabilities (high+) | Unknown | 0 |

---

*Security improvement plan: 2026-01-23*
