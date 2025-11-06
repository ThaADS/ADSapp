# PHASE 1: CRITICAL FIXES - IMPLEMENTATION PLAN

## Security, Testing, & Stripe Completion to 100%

**Duration**: 4 weeks (Weeks 1-4)
**Investment**: €48,000
**Team**: 4 engineers (2 Senior Full-Stack, 1 DevOps, 1 QA)
**Status**: 🔴 BLOCKING - Must complete before production deployment

---

## OVERVIEW

Phase 1 addresses all **BLOCKING** production deployment issues:

1. 8 critical security vulnerabilities (CVSS 7.0-9.1)
2. Zero unit/integration test coverage
3. Multi-tenant isolation unverified
4. Stripe integration incomplete (85% → 100%)
5. Missing production infrastructure (Redis, job queue)

**Success Criteria**:

- ✅ All 8 critical security issues resolved
- ✅ 270+ tests created (60% critical path coverage)
- ✅ Multi-tenant isolation 100% verified
- ✅ Stripe integration 100% complete
- ✅ Redis caching operational
- ✅ Job queue processing bulk operations

---

## WEEK 1-2: SECURITY & MULTI-TENANT HARDENING

### Day 1-2: C-001 - Tenant Validation Middleware (16 hours)

**Problem**: API routes lack comprehensive tenant validation, allowing potential cross-tenant data access.

**Implementation Steps**:

#### Step 1: Create Tenant Validation Middleware (4 hours)

**File**: `src/lib/middleware/tenant-validation.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserOrganization } from '@/lib/auth/get-user-org'

/**
 * Tenant Validation Middleware
 * Ensures all API requests are scoped to the authenticated user's organization
 *
 * @param request - Next.js request object
 * @returns Response with tenant context or 403 Forbidden
 */
export async function validateTenantAccess(request: NextRequest) {
  const supabase = await createClient()

  // 1. Verify user authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // 2. Get user's organization from JWT or database
  const userOrg = await getUserOrganization(user.id)

  if (!userOrg) {
    return NextResponse.json(
      { error: 'User not associated with any organization' },
      { status: 403 }
    )
  }

  // 3. Validate tenant context in request
  const requestedOrgId =
    request.headers.get('x-organization-id') || request.nextUrl.searchParams.get('organization_id')

  if (requestedOrgId && requestedOrgId !== userOrg.id) {
    // Attempting to access different organization's data
    console.warn('[SECURITY] Cross-tenant access attempt:', {
      userId: user.id,
      userOrg: userOrg.id,
      requestedOrg: requestedOrgId,
      path: request.nextUrl.pathname,
      method: request.method,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      { error: 'Forbidden: Access to this organization denied' },
      { status: 403 }
    )
  }

  // 4. Attach tenant context to request for downstream use
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', user.id)
  requestHeaders.set('x-organization-id', userOrg.id)
  requestHeaders.set('x-user-role', userOrg.role)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

/**
 * Helper to extract tenant context from validated request
 */
export function getTenantContext(request: NextRequest) {
  return {
    userId: request.headers.get('x-user-id')!,
    organizationId: request.headers.get('x-organization-id')!,
    userRole: request.headers.get('x-user-role') as 'owner' | 'admin' | 'agent',
  }
}
```

#### Step 2: Apply Middleware to All API Routes (4 hours)

**File**: `src/app/api/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { validateTenantAccess } from '@/lib/middleware/tenant-validation'
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit'

// Public routes that don't require tenant validation
const PUBLIC_ROUTES = [
  '/api/auth/signin',
  '/api/auth/signup',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
  '/api/webhooks/stripe', // Validated via signature
  '/api/webhooks/whatsapp', // Validated via signature
]

// Super admin routes with special validation
const SUPER_ADMIN_ROUTES = ['/api/admin']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Skip public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // 2. Apply rate limiting to all routes
  const rateLimitResponse = await rateLimitMiddleware(request)
  if (rateLimitResponse.status === 429) {
    return rateLimitResponse
  }

  // 3. Super admin routes - validate super admin role
  if (SUPER_ADMIN_ROUTES.some(route => pathname.startsWith(route))) {
    return validateSuperAdminAccess(request)
  }

  // 4. Standard tenant validation for all other API routes
  return validateTenantAccess(request)
}

export const config = {
  matcher: '/api/:path*',
}
```

#### Step 3: Update All API Routes with Tenant Context (8 hours)

**Example**: `src/app/api/contacts/route.ts`

**Before**:

```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // ❌ No tenant validation!
  const { data, error } = await supabase.from('contacts').select('*')

  return NextResponse.json(data)
}
```

**After**:

```typescript
import { getTenantContext } from '@/lib/middleware/tenant-validation'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { organizationId, userId } = getTenantContext(request)

  // ✅ Tenant-scoped query (RLS will also enforce this at DB level)
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('organization_id', organizationId) // Explicit tenant filter

  if (error) {
    console.error('[API] Error fetching contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }

  return NextResponse.json({ data, count: data.length })
}
```

**Routes to Update** (67 total):

- `/api/contacts/*` (8 routes)
- `/api/conversations/*` (10 routes)
- `/api/templates/*` (8 routes)
- `/api/analytics/*` (6 routes)
- `/api/billing/*` (15 routes)
- `/api/admin/*` (10 routes) - Special handling
- `/api/bulk/*` (5 routes)
- `/api/media/*` (5 routes)

**Validation**: Each route must have explicit `organization_id` filter

---

### Day 3-4: C-002 - RLS Policy Gaps (16 hours)

**Problem**: RLS policies exist but have gaps and are untested.

#### Step 1: Audit Current RLS Policies (4 hours)

**Script**: `database-scripts/audit-rls-policies.sql`

```sql
-- Check which tables have RLS enabled
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check existing RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Find tables without RLS
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN ('migrations', 'schema_migrations');
```

#### Step 2: Implement Complete RLS Coverage (8 hours)

**File**: `supabase/migrations/20251013_complete_rls_coverage.sql`

```sql
-- ==============================================
-- COMPLETE RLS POLICY COVERAGE
-- Ensures all tenant-scoped tables have proper RLS
-- ==============================================

-- 1. ORGANIZATIONS TABLE
-- Only allow users to see their own organization
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
        AND role = 'owner'
    )
  );

-- 2. PROFILES TABLE
-- Users can only see profiles in their organization
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view profiles in their organization"
  ON profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can update profiles"
  ON profiles FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- 3. CONTACTS TABLE
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contacts in their organization"
  ON contacts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create contacts in their organization"
  ON contacts FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update contacts in their organization"
  ON contacts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- 4. CONVERSATIONS TABLE
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view conversations in their organization"
  ON conversations FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations in their organization"
  ON conversations FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update conversations in their organization"
  ON conversations FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- 5. MESSAGES TABLE
-- Messages are accessed via conversations (indirect tenant scope)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their organization's conversations"
  ON messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id
      FROM conversations
      WHERE organization_id IN (
        SELECT organization_id
        FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create messages in their organization's conversations"
  ON messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id
      FROM conversations
      WHERE organization_id IN (
        SELECT organization_id
        FROM profiles
        WHERE id = auth.uid()
      )
    )
  );

-- 6. MESSAGE_TEMPLATES TABLE
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates in their organization"
  ON message_templates FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create templates in their organization"
  ON message_templates FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update templates in their organization"
  ON message_templates FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete templates in their organization"
  ON message_templates FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- 7. AUTOMATION_RULES TABLE
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view automation rules in their organization"
  ON automation_rules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can manage automation rules"
  ON automation_rules FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- 8. SUBSCRIPTION_PLANS TABLE
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's subscription"
  ON subscription_plans FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Only owners can modify subscriptions"
  ON subscription_plans FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
        AND role = 'owner'
    )
  );

-- 9. BILLING_EVENTS TABLE
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view billing events in their organization"
  ON billing_events FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- 10. AUDIT_LOGS TABLE
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs in their organization"
  ON audit_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM profiles
      WHERE id = auth.uid()
    )
  );

-- System can always insert audit logs (service role)
CREATE POLICY "Service role can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ==============================================
-- RLS BYPASS DETECTION
-- Create a function to detect RLS bypass attempts
-- ==============================================

CREATE OR REPLACE FUNCTION detect_rls_bypass()
RETURNS trigger AS $$
BEGIN
  -- Log potential RLS bypass attempts
  IF current_setting('role') = 'authenticated' AND NEW.organization_id IS NULL THEN
    RAISE EXCEPTION 'RLS Bypass Attempt: organization_id cannot be NULL';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to all tenant-scoped tables
CREATE TRIGGER enforce_organization_id_contacts
  BEFORE INSERT OR UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION detect_rls_bypass();

CREATE TRIGGER enforce_organization_id_conversations
  BEFORE INSERT OR UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION detect_rls_bypass();

-- Repeat for all 30+ tables...

-- ==============================================
-- INDEXES FOR RLS PERFORMANCE
-- Ensure organization_id is indexed on all tables
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversations_organization_id ON conversations(organization_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_templates_organization_id ON message_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_automation_organization_id ON automation_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_organization_id ON billing_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_organization_id ON audit_logs(organization_id);

-- ==============================================
-- VERIFICATION QUERIES
-- ==============================================

-- Count tables with RLS enabled
SELECT
  COUNT(*) AS tables_with_rls
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = true;

-- Count tables without RLS (should be system tables only)
SELECT
  tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN ('migrations', 'schema_migrations');
```

#### Step 3: RLS Testing Framework (4 hours)

**File**: `tests/integration/rls-policies.test.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll } from '@jest/globals'

describe('RLS Policy Enforcement', () => {
  let userAClient: any
  let userBClient: any
  let orgAId: string
  let orgBId: string

  beforeAll(async () => {
    // Set up test users in different organizations
    // User A in Organization A
    userAClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userAClient.auth.signInWithPassword({
      email: 'userA@orgA.com',
      password: 'testpass123',
    })

    const { data: profileA } = await userAClient.from('profiles').select('organization_id').single()

    orgAId = profileA.organization_id

    // User B in Organization B
    userBClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    await userBClient.auth.signInWithPassword({
      email: 'userB@orgB.com',
      password: 'testpass123',
    })

    const { data: profileB } = await userBClient.from('profiles').select('organization_id').single()

    orgBId = profileB.organization_id
  })

  describe('Organizations Table', () => {
    it('should allow users to view only their organization', async () => {
      const { data, error } = await userAClient.from('organizations').select('*')

      expect(error).toBeNull()
      expect(data).toHaveLength(1)
      expect(data[0].id).toBe(orgAId)
    })

    it('should prevent users from viewing other organizations', async () => {
      const { data, error } = await userAClient.from('organizations').select('*').eq('id', orgBId)

      expect(data).toHaveLength(0) // RLS blocks access
    })
  })

  describe('Contacts Table', () => {
    it('should allow users to view only their organization contacts', async () => {
      // Create contact in Org A
      const { data: contactA } = await userAClient
        .from('contacts')
        .insert({
          organization_id: orgAId,
          name: 'Contact A',
          phone_number: '+1234567890',
        })
        .select()
        .single()

      // User A can see it
      const { data: viewA } = await userAClient.from('contacts').select('*').eq('id', contactA.id)

      expect(viewA).toHaveLength(1)

      // User B cannot see it
      const { data: viewB } = await userBClient.from('contacts').select('*').eq('id', contactA.id)

      expect(viewB).toHaveLength(0) // RLS blocks access
    })

    it('should prevent cross-tenant data insertion', async () => {
      // User A tries to create contact in Org B
      const { data, error } = await userAClient.from('contacts').insert({
        organization_id: orgBId, // Different org!
        name: 'Malicious Contact',
        phone_number: '+9876543210',
      })

      expect(error).not.toBeNull()
      expect(error?.message).toContain('new row violates row-level security policy')
    })
  })

  describe('Conversations Table', () => {
    it('should enforce tenant isolation on conversations', async () => {
      // Similar tests for conversations...
    })
  })

  describe('Messages Table', () => {
    it('should enforce tenant isolation via conversation relationship', async () => {
      // Create conversation in Org A
      const { data: conv } = await userAClient
        .from('conversations')
        .insert({
          organization_id: orgAId,
          status: 'open',
        })
        .select()
        .single()

      // Create message in that conversation
      const { data: msg } = await userAClient
        .from('messages')
        .insert({
          conversation_id: conv.id,
          content: 'Test message',
          message_type: 'text',
        })
        .select()
        .single()

      // User B cannot see message
      const { data: viewB } = await userBClient.from('messages').select('*').eq('id', msg.id)

      expect(viewB).toHaveLength(0)
    })
  })

  // Add 15+ more test scenarios for each table...
})
```

**Test Coverage Target**: 20+ RLS tests per critical table

---

### Day 5-6: C-003 - Multi-Factor Authentication (24 hours)

**Problem**: No MFA implementation increases account takeover risk.

#### Step 1: Backend MFA Implementation (12 hours)

**File**: `src/lib/auth/mfa.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

/**
 * MFA Management Service
 * Implements TOTP-based two-factor authentication
 */
export class MFAService {
  private appName = 'ADSapp'

  /**
   * Generate MFA secret and QR code for user enrollment
   */
  async generateMFASecret(userId: string): Promise<{
    secret: string
    qrCodeUrl: string
    backupCodes: string[]
  }> {
    // Generate TOTP secret
    const secret = authenticator.generateSecret()

    // Generate QR code
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    const otpauthUrl = authenticator.keyuri(profile.email, this.appName, secret)

    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl)

    // Generate backup codes (10 codes)
    const backupCodes = this.generateBackupCodes(10)

    // Store encrypted secret and backup codes
    await this.storeMFASecret(userId, secret, backupCodes)

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    }
  }

  /**
   * Verify MFA token during enrollment
   */
  async verifyMFAEnrollment(userId: string, token: string): Promise<boolean> {
    const secret = await this.getMFASecret(userId)

    if (!secret) {
      throw new Error('MFA secret not found')
    }

    const isValid = authenticator.verify({
      token,
      secret,
    })

    if (isValid) {
      // Enable MFA for user
      await this.enableMFA(userId)
    }

    return isValid
  }

  /**
   * Verify MFA token during login
   */
  async verifyMFALogin(userId: string, token: string): Promise<boolean> {
    const secret = await this.getMFASecret(userId)

    if (!secret) {
      return false
    }

    // Check if it's a TOTP token
    const isTOTPValid = authenticator.verify({
      token,
      secret,
    })

    if (isTOTPValid) {
      return true
    }

    // Check if it's a backup code
    const isBackupCode = await this.verifyBackupCode(userId, token)

    return isBackupCode
  }

  /**
   * Generate cryptographically secure backup codes
   */
  private generateBackupCodes(count: number): string[] {
    const codes: string[] = []

    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric code
      const code = Array.from(crypto.getRandomValues(new Uint8Array(4)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase()

      codes.push(code)
    }

    return codes
  }

  /**
   * Store MFA secret and backup codes (encrypted)
   */
  private async storeMFASecret(
    userId: string,
    secret: string,
    backupCodes: string[]
  ): Promise<void> {
    const supabase = await createClient()

    // Hash backup codes before storage
    const hashedBackupCodes = await Promise.all(backupCodes.map(code => this.hashBackupCode(code)))

    await supabase
      .from('profiles')
      .update({
        mfa_secret: secret, // Should be encrypted at rest
        mfa_backup_codes: hashedBackupCodes,
        mfa_enabled: false, // Not enabled until verified
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
  }

  /**
   * Get MFA secret for user
   */
  private async getMFASecret(userId: string): Promise<string | null> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('profiles')
      .select('mfa_secret, mfa_enabled')
      .eq('id', userId)
      .single()

    if (!data?.mfa_enabled) {
      return null
    }

    return data.mfa_secret
  }

  /**
   * Enable MFA for user after successful verification
   */
  private async enableMFA(userId: string): Promise<void> {
    const supabase = await createClient()

    await supabase
      .from('profiles')
      .update({
        mfa_enabled: true,
        mfa_enrolled_at: new Date().toISOString(),
      })
      .eq('id', userId)
  }

  /**
   * Verify backup code
   */
  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const supabase = await createClient()

    const { data } = await supabase
      .from('profiles')
      .select('mfa_backup_codes')
      .eq('id', userId)
      .single()

    if (!data?.mfa_backup_codes) {
      return false
    }

    const hashedCode = await this.hashBackupCode(code)
    const codeIndex = data.mfa_backup_codes.indexOf(hashedCode)

    if (codeIndex === -1) {
      return false
    }

    // Remove used backup code
    const updatedCodes = [...data.mfa_backup_codes]
    updatedCodes.splice(codeIndex, 1)

    await supabase.from('profiles').update({ mfa_backup_codes: updatedCodes }).eq('id', userId)

    return true
  }

  /**
   * Hash backup code for secure storage
   */
  private async hashBackupCode(code: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(code)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }
}
```

#### Step 2: MFA API Endpoints (6 hours)

**File**: `src/app/api/auth/mfa/enroll/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { MFAService } from '@/lib/auth/mfa'
import { getTenantContext } from '@/lib/middleware/tenant-validation'

export async function POST(request: NextRequest) {
  try {
    const { userId } = getTenantContext(request)

    const mfaService = new MFAService()
    const { secret, qrCodeUrl, backupCodes } = await mfaService.generateMFASecret(userId)

    return NextResponse.json({
      qrCodeUrl,
      backupCodes,
      // Don't send secret to client, only QR code
    })
  } catch (error) {
    console.error('[MFA] Enrollment error:', error)
    return NextResponse.json({ error: 'Failed to generate MFA enrollment' }, { status: 500 })
  }
}
```

**File**: `src/app/api/auth/mfa/verify/route.ts`

```typescript
export async function POST(request: NextRequest) {
  try {
    const { userId } = getTenantContext(request)
    const { token } = await request.json()

    if (!token || token.length !== 6) {
      return NextResponse.json({ error: 'Invalid MFA token format' }, { status: 400 })
    }

    const mfaService = new MFAService()
    const isValid = await mfaService.verifyMFAEnrollment(userId, token)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid MFA token' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      message: 'MFA enabled successfully',
    })
  } catch (error) {
    console.error('[MFA] Verification error:', error)
    return NextResponse.json({ error: 'Failed to verify MFA token' }, { status: 500 })
  }
}
```

#### Step 3: MFA Frontend Components (6 hours)

**File**: `src/components/auth/mfa-enrollment.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';

export function MFAEnrollment() {
  const [step, setStep] = useState<'generate' | 'verify' | 'complete'>('generate');
  const [qrCode, setQrCode] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/mfa/enroll', {
        method: 'POST'
      });

      const data = await response.json();
      setQrCode(data.qrCodeUrl);
      setBackupCodes(data.backupCodes);
      setStep('verify');
    } catch (error) {
      console.error('MFA generation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (response.ok) {
        setStep('complete');
      } else {
        alert('Invalid token. Please try again.');
      }
    } catch (error) {
      console.error('MFA verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'generate') {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Enable Two-Factor Authentication</h2>
        <p className="text-gray-600">
          Add an extra layer of security to your account by enabling 2FA.
        </p>
        <Button onClick={handleGenerate} disabled={loading}>
          {loading ? 'Generating...' : 'Get Started'}
        </Button>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Scan QR Code</h2>
        <p className="text-gray-600">
          Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
        </p>

        <div className="flex justify-center">
          <Image src={qrCode} alt="MFA QR Code" width={200} height={200} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Enter the 6-digit code</label>
          <Input
            type="text"
            maxLength={6}
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <Button onClick={handleVerify} disabled={loading || token.length !== 6}>
          {loading ? 'Verifying...' : 'Verify and Enable'}
        </Button>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <h3 className="font-semibold text-yellow-800">Backup Codes</h3>
          <p className="text-sm text-yellow-700 mb-2">
            Save these backup codes in a safe place. You can use them if you lose access to your authenticator.
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {backupCodes.map((code, i) => (
              <div key={i} className="bg-white p-2 rounded">{code}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <div className="text-green-600 text-6xl">✓</div>
      <h2 className="text-2xl font-bold">Two-Factor Authentication Enabled!</h2>
      <p className="text-gray-600">
        Your account is now protected with an additional layer of security.
      </p>
      <Button onClick={() => window.location.href = '/dashboard'}>
        Go to Dashboard
      </Button>
    </div>
  );
}
```

**Deliverables - Week 1-2**:

- ✅ C-001: Tenant validation in all 67 API routes
- ✅ C-002: Complete RLS coverage on 30+ tables
- ✅ C-003: MFA enrollment and verification system
- ✅ 20+ RLS policy tests
- ✅ Security middleware operational
- ✅ Multi-tenant isolation verified

---

## WEEK 1-2: TESTING FOUNDATION & INFRASTRUCTURE (80 hours)

### Unit Test Infrastructure Setup (16 hours)

**File**: `tests/setup/jest.setup.ts`

```typescript
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder as any

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
  })),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
```

**File**: `tests/factories/user-factory.ts`

```typescript
import { faker } from '@faker-js/faker'

export class UserFactory {
  static createOwner(overrides?: Partial<any>) {
    return {
      id: faker.string.uuid(),
      email: faker.internet.email(),
      full_name: faker.person.fullName(),
      role: 'owner' as const,
      organization_id: faker.string.uuid(),
      created_at: new Date().toISOString(),
      ...overrides,
    }
  }

  static createAdmin(overrides?: Partial<any>) {
    return {
      ...this.createOwner(),
      role: 'admin' as const,
      ...overrides,
    }
  }

  static createAgent(overrides?: Partial<any>) {
    return {
      ...this.createOwner(),
      role: 'agent' as const,
      ...overrides,
    }
  }
}
```

**Remaining implementation continues with Days 7-28...**

Would you like me to continue with the complete 4-week Phase 1 implementation plan? I'll detail every day, every task, every file, every test with 100% clarity.
