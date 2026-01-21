# Technical Concerns

**Generated:** 2026-01-21

## Critical Issues

### TypeScript Strict Mode Disabled

**Severity:** High
**Impact:** Type safety compromised across entire codebase

```json
// tsconfig.json
{
  "strict": false,
  "noImplicitAny": false
}
```

**Files Affected:** Entire codebase
**Recommendation:** Incrementally enable strict mode, starting with new files

---

### Extensive @ts-nocheck Usage

**Severity:** High
**Impact:** Type checking disabled in 200+ files

**Most Affected Areas:**
| Area | File Count | Common Reason |
|------|------------|---------------|
| API Routes | 60+ | Database types mismatch |
| Components | 30+ | Props type issues |
| Lib modules | 50+ | External API types |
| Test files | 20+ | Mock type issues |

**Example Files:**
- `src/lib/whatsapp/service.ts` - "Database types need regeneration"
- `src/types/workflow.ts` - "React Flow type compatibility"
- `src/app/dashboard/settings/crm/page.tsx` - "CRMConnection type mismatch"
- `src/lib/workflow/templates.ts` - "Workflow node type definitions"

**Root Cause:** Database types out of sync with Supabase schema

**Fix:**
```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

---

### Build Errors Ignored

**Severity:** High
**Location:** `next.config.ts`

TypeScript and ESLint errors are ignored during build:
```typescript
typescript: {
  ignoreBuildErrors: true
},
eslint: {
  ignoreDuringBuilds: true
}
```

**Risk:** Production deployments may contain broken code

---

## Medium Priority

### TODO/FIXME Comments

**Count:** 36+ occurrences across 30 files

**Notable Files:**
- `src/lib/auth/mfa.ts` - 3 TODOs
- `tests/utils/test-helpers.ts` - 4 TODOs
- Various API routes and lib files

**Categories:**
- Implementation incomplete
- Error handling improvements needed
- Performance optimizations pending

---

### Database Type Regeneration Needed

**Severity:** Medium
**Impact:** Type mismatches throughout data layer

Multiple files explicitly note this issue:
```typescript
// @ts-nocheck - Database types need regeneration from Supabase schema
```

**Affected Systems:**
- WhatsApp service
- CRM integration
- Workflow engine
- Contact management

---

### Test Coverage Gaps

**Current Thresholds:**
```javascript
global: {
  branches: 60,
  functions: 60,
  lines: 60,
  statements: 60
}
```

**Areas Needing More Coverage:**
- API routes (50% branches)
- Integration flows
- Error handling paths

---

## Low Priority / Tech Debt

### Migration Files Cleanup

**Location:** `supabase/migrations/`

Many sequential fix migrations suggest incremental patches:
- `step1_enable_rls.sql` through `step18_*.sql`
- Multiple versions of same fixes (e.g., `step6_fix_remaining_issues_v5.sql`)

**Recommendation:** Consolidate migrations for cleaner history

---

### Temporary/Debug Files

**Files to Clean Up:**
- `src/app/debug-profile/page.tsx` - Debug page in production
- Various `.temp/` directories in `supabase/`
- Untracked test output files

---

### Duplicate React Flow Dependencies

**Issue:** Both `@xyflow/react` and `reactflow` are installed

```json
"@xyflow/react": "^12.9.2",
"reactflow": "^11.11.4"
```

**Recommendation:** Standardize on one (prefer @xyflow/react as it's newer)

---

### Console Logging in Production

**Check for:** `console.log`, `console.error` statements that should be replaced with proper logging

---

## Security Considerations

### Input Validation Coverage

While `QueryValidators` exists in `src/lib/supabase/server.ts`, verify:
- All API routes use validators
- SQL injection detection on all user inputs
- XSS prevention via DOMPurify is consistent

### RLS Policy Complexity

**Location:** `supabase/migrations/`

Multiple RLS fixes suggest complexity:
- `20251203_security_hardening.sql`
- `20251204_fix_profiles_rls_recursion.sql`

**Risk:** RLS recursion or performance issues

---

## Performance Concerns

### Bundle Size

Consider running:
```bash
npm run analyze
```

**Potential Issues:**
- Large charting libraries (recharts)
- Multiple icon libraries
- OpenTelemetry instrumentation overhead

### Real-time Subscription Management

Verify subscriptions are properly unsubscribed in cleanup effects to prevent memory leaks.

---

## Recommendations by Priority

### Immediate (P0)
1. Regenerate database types from Supabase
2. Enable TypeScript checking in build

### Short-term (P1)
1. Address @ts-nocheck files systematically
2. Increase test coverage to 70%
3. Clean up migration history

### Medium-term (P2)
1. Enable TypeScript strict mode incrementally
2. Remove duplicate dependencies
3. Add comprehensive logging

### Long-term (P3)
1. Performance audit and optimization
2. Security audit
3. Documentation improvements

---

## Tracking

| Issue | Status | Assignee | Target |
|-------|--------|----------|--------|
| Regenerate DB types | Open | - | - |
| Enable strict mode | Open | - | - |
| @ts-nocheck cleanup | Open | - | - |
| Test coverage 70% | Open | - | - |
| Migration cleanup | Open | - | - |

---
*Concerns mapped: 2026-01-21*
