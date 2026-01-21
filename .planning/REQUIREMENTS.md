# Requirements: ADSapp Technical Debt Cleanup

**Defined:** 2026-01-21
**Core Value:** Improve codebase quality, type safety, and maintainability

## v1 Requirements

Requirements for this milestone. Each maps to roadmap phases.

### Database Types

- [ ] **TYPE-01**: Regenerate `src/types/database.ts` from Supabase schema
- [ ] **TYPE-02**: Verify regenerated types compile without errors
- [ ] **TYPE-03**: Update type imports across codebase to use new types

### @ts-nocheck Removal

- [ ] **TSNC-01**: Remove @ts-nocheck from `src/lib/supabase/` files
- [ ] **TSNC-02**: Remove @ts-nocheck from `src/lib/whatsapp/` files
- [ ] **TSNC-03**: Remove @ts-nocheck from `src/lib/billing/` files
- [ ] **TSNC-04**: Remove @ts-nocheck from `src/lib/ai/` files
- [ ] **TSNC-05**: Remove @ts-nocheck from `src/lib/auth/` files
- [ ] **TSNC-06**: Remove @ts-nocheck from `src/app/api/` routes
- [ ] **TSNC-07**: Remove @ts-nocheck from `src/components/` files
- [ ] **TSNC-08**: Remove @ts-nocheck from `src/stores/` files

### TypeScript Strict Mode

- [ ] **STRICT-01**: Enable `noImplicitAny` in tsconfig.json
- [ ] **STRICT-02**: Fix all implicit any errors
- [ ] **STRICT-03**: Enable `strictNullChecks`
- [ ] **STRICT-04**: Fix all null check errors
- [ ] **STRICT-05**: Enable remaining strict mode options
- [ ] **STRICT-06**: Enable TypeScript checking in build

### Build Quality

- [ ] **BUILD-01**: Enable TypeScript errors in Next.js build
- [ ] **BUILD-02**: Enable ESLint errors in Next.js build
- [ ] **BUILD-03**: Verify clean build with no errors

### Test Coverage

- [ ] **TEST-01**: Identify untested critical paths
- [ ] **TEST-02**: Add tests for `src/lib/supabase/` utilities
- [ ] **TEST-03**: Add tests for `src/lib/whatsapp/` services
- [ ] **TEST-04**: Add tests for API route handlers
- [ ] **TEST-05**: Achieve 70% global coverage threshold

### Dependency Cleanup

- [ ] **DEPS-01**: Audit duplicate/unused dependencies
- [ ] **DEPS-02**: Remove `reactflow` in favor of `@xyflow/react`
- [ ] **DEPS-03**: Update remaining @xyflow references

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Advanced Type Safety

- **ADV-01**: Enable `strictFunctionTypes`
- **ADV-02**: Enable `strictPropertyInitialization`
- **ADV-03**: Add runtime type validation with Zod schemas

### Documentation

- **DOC-01**: Add JSDoc comments to public APIs
- **DOC-02**: Generate API documentation from types

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| New features | Focus is debt reduction, not feature development |
| Schema changes | Only regenerating types, not modifying schema |
| UI changes | No visual/UX changes this milestone |
| Performance optimization | Separate milestone |
| Dependency upgrades | Only removing duplicates, not upgrading |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TYPE-01 | Phase 1 | Pending |
| TYPE-02 | Phase 1 | Pending |
| TYPE-03 | Phase 1 | Pending |
| TSNC-01 | Phase 2 | Pending |
| TSNC-02 | Phase 2 | Pending |
| TSNC-03 | Phase 2 | Pending |
| TSNC-04 | Phase 2 | Pending |
| TSNC-05 | Phase 2 | Pending |
| TSNC-06 | Phase 3 | Pending |
| TSNC-07 | Phase 3 | Pending |
| TSNC-08 | Phase 3 | Pending |
| STRICT-01 | Phase 4 | Pending |
| STRICT-02 | Phase 4 | Pending |
| STRICT-03 | Phase 4 | Pending |
| STRICT-04 | Phase 4 | Pending |
| STRICT-05 | Phase 4 | Pending |
| STRICT-06 | Phase 4 | Pending |
| BUILD-01 | Phase 5 | Pending |
| BUILD-02 | Phase 5 | Pending |
| BUILD-03 | Phase 5 | Pending |
| TEST-01 | Phase 6 | Pending |
| TEST-02 | Phase 6 | Pending |
| TEST-03 | Phase 6 | Pending |
| TEST-04 | Phase 6 | Pending |
| TEST-05 | Phase 6 | Pending |
| DEPS-01 | Phase 7 | Pending |
| DEPS-02 | Phase 7 | Pending |
| DEPS-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-21*
*Last updated: 2026-01-21 after initial definition*
