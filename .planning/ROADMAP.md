# Roadmap: ADSapp Technical Debt Cleanup

**Created:** 2026-01-21
**Milestone:** v1.0 - Technical Debt Cleanup

## Phases

### Phase 1: Database Types Regeneration
**Goal:** Fix the root cause - regenerate types from Supabase schema

| Task | Requirements | Complexity |
|------|--------------|------------|
| Run Supabase type generation | TYPE-01 | Low |
| Verify compilation | TYPE-02 | Low |
| Update imports if needed | TYPE-03 | Low |

**Entry Criteria:** Supabase CLI configured
**Exit Criteria:** `src/types/database.ts` regenerated, `npm run type-check` shows reduced errors

---

### Phase 2: Core Library @ts-nocheck Removal
**Goal:** Remove type suppression from critical library code

| Task | Requirements | Complexity |
|------|--------------|------------|
| Fix `src/lib/supabase/` types | TSNC-01 | Medium |
| Fix `src/lib/whatsapp/` types | TSNC-02 | High |
| Fix `src/lib/billing/` types | TSNC-03 | Medium |
| Fix `src/lib/ai/` types | TSNC-04 | Medium |
| Fix `src/lib/auth/` types | TSNC-05 | Medium |

**Entry Criteria:** Phase 1 complete
**Exit Criteria:** All listed lib files type-check without @ts-nocheck

---

### Phase 3: API & Components @ts-nocheck Removal
**Goal:** Remove type suppression from API routes and components

| Task | Requirements | Complexity |
|------|--------------|------------|
| Fix API route types | TSNC-06 | High |
| Fix component types | TSNC-07 | High |
| Fix store types | TSNC-08 | Low |

**Entry Criteria:** Phase 2 complete
**Exit Criteria:** All API routes and components type-check without @ts-nocheck

---

### Phase 4: TypeScript Strict Mode
**Goal:** Incrementally enable strict mode options

| Task | Requirements | Complexity |
|------|--------------|------------|
| Enable `noImplicitAny` | STRICT-01, STRICT-02 | High |
| Enable `strictNullChecks` | STRICT-03, STRICT-04 | High |
| Enable remaining strict options | STRICT-05 | Medium |
| Enable build checking | STRICT-06 | Low |

**Entry Criteria:** Phase 3 complete (most @ts-nocheck removed)
**Exit Criteria:** `strict: true` in tsconfig.json, build passes

---

### Phase 5: Build Quality Enforcement
**Goal:** Enable error checking in production builds

| Task | Requirements | Complexity |
|------|--------------|------------|
| Enable TS errors in build | BUILD-01 | Medium |
| Enable ESLint in build | BUILD-02 | Medium |
| Verify clean build | BUILD-03 | Low |

**Entry Criteria:** Phase 4 complete
**Exit Criteria:** `npm run build` succeeds with all checks enabled

---

### Phase 6: Test Coverage Improvement
**Goal:** Increase test coverage to 70%+

| Task | Requirements | Complexity |
|------|--------------|------------|
| Identify coverage gaps | TEST-01 | Low |
| Add Supabase utility tests | TEST-02 | Medium |
| Add WhatsApp service tests | TEST-03 | High |
| Add API route tests | TEST-04 | High |
| Achieve 70% threshold | TEST-05 | High |

**Entry Criteria:** Phase 5 complete
**Exit Criteria:** `npm run test:coverage` shows 70%+ global coverage

---

### Phase 7: Dependency Cleanup
**Goal:** Remove duplicate and unused dependencies

| Task | Requirements | Complexity |
|------|--------------|------------|
| Audit dependencies | DEPS-01 | Low |
| Remove `reactflow` | DEPS-02 | Medium |
| Update references | DEPS-03 | Low |

**Entry Criteria:** Phase 6 complete
**Exit Criteria:** No duplicate React Flow packages, all tests pass

---

## Phase Summary

| Phase | Name | Requirements | Est. Complexity |
|-------|------|--------------|-----------------|
| 1 | Database Types Regeneration | TYPE-01,02,03 | Low |
| 2 | Core Library @ts-nocheck | TSNC-01,02,03,04,05 | High |
| 3 | API & Components @ts-nocheck | TSNC-06,07,08 | High |
| 4 | TypeScript Strict Mode | STRICT-01-06 | High |
| 5 | Build Quality Enforcement | BUILD-01,02,03 | Medium |
| 6 | Test Coverage Improvement | TEST-01-05 | High |
| 7 | Dependency Cleanup | DEPS-01,02,03 | Low |

## Progress Tracking

| Phase | Status | Plans | Progress |
|-------|--------|-------|----------|
| 1 | ○ Pending | 0/1 | 0% |
| 2 | ○ Pending | 0/1 | 0% |
| 3 | ○ Pending | 0/1 | 0% |
| 4 | ○ Pending | 0/1 | 0% |
| 5 | ○ Pending | 0/1 | 0% |
| 6 | ○ Pending | 0/1 | 0% |
| 7 | ○ Pending | 0/1 | 0% |

**Overall Progress:** ░░░░░░░░░░ 0%

---
*Roadmap created: 2026-01-21*
*Last updated: 2026-01-21*
