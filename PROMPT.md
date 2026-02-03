# ADSapp - Ralph Loop Configuration

## Project Context

**ADSapp** is a Multi-Tenant WhatsApp Business Inbox SaaS platform.

**Tech Stack:**
- Next.js 15 App Router + React 19 + TypeScript
- Supabase PostgreSQL with Row Level Security (RLS)
- Stripe Payments + WhatsApp Business Cloud API
- Tailwind CSS 4 + Zustand

## Current Focus

See `.planning/PROJECT.md` for milestone details and `.planning/ROADMAP.md` for phase breakdowns.

**Active Milestone:** Check `.planning/config.json` for current phase.

## Agent Selection Rules

For each task, automatically select appropriate agents from claude-code-workflows marketplace:

### File Type → Agent Mapping

| Pattern | Agent | Plugin |
|---------|-------|--------|
| `*.ts` (non-component) | typescript-pro | javascript-typescript |
| `*.tsx` | frontend-developer | frontend-mobile-development |
| `**/api/**/*.ts` | backend-architect | backend-development |
| `**/supabase/**` | database-architect | database-design |
| `**/*.test.*` | test-automator | unit-testing |
| `**/lib/security/**` | security-auditor | security-scanning |
| `**/lib/billing/**` | payment-integration | payment-processing |
| `**/lib/ai/**` | ai-engineer | llm-application-dev |

### Task Pattern → Agent Mapping

| Task Contains | Primary Agent | Support Agent |
|---------------|---------------|---------------|
| "fix type", "typescript" | typescript-pro | code-reviewer |
| "add endpoint", "api route" | backend-architect | security-auditor |
| "create component", "ui" | frontend-developer | - |
| "write test", "coverage" | test-automator | - |
| "rls", "policy", "migration" | database-architect | security-auditor |
| "stripe", "billing", "payment" | payment-integration | backend-architect |
| "security", "audit", "vulnerability" | security-auditor | backend-security-coder |
| "ai", "llm", "sentiment", "draft" | ai-engineer | prompt-engineer |

## Critical Rules

### Multi-Tenant Security (NEVER VIOLATE)

1. **Always use RLS-enabled client** for user data:
   ```typescript
   import { createClient } from '@/lib/supabase/server'
   const supabase = await createClient()  // Auto-filters by organization
   ```

2. **Service role client ONLY for admin operations**:
   ```typescript
   // ONLY in /api/admin/* routes
   import { createServiceRoleClient } from '@/lib/supabase/server'
   ```

3. **Validate all inputs**:
   ```typescript
   import { QueryValidators } from '@/lib/supabase/server'
   const orgValidation = QueryValidators.uuid(organizationId)
   ```

### Code Quality

1. **No @ts-nocheck** - Fix types properly
2. **No TODO placeholders** - Complete implementations
3. **Run type-check before marking complete**: `npm run type-check`
4. **Run tests before marking complete**: `npm run test`

### File Organization

- Tests in `tests/` directory (not next to source)
- API routes follow RESTful patterns
- Components in `src/components/` with proper subdirectories

## Status Reporting

At the end of each Ralph Loop iteration:

```
---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
ACTIVE_AGENTS: [agents used this iteration]
TASKS_COMPLETED_THIS_LOOP: <number>
FILES_MODIFIED: <number>
TESTS_STATUS: PASSING | FAILING | NOT_RUN
TYPE_CHECK_STATUS: PASSING | FAILING | NOT_RUN
SECURITY_CONCERNS: [any RLS or auth issues found]
WORK_TYPE: IMPLEMENTATION | TESTING | SECURITY | OPTIMIZATION | DEBT_CLEANUP
EXIT_SIGNAL: false | true
RECOMMENDATION: <one line summary>
---END_RALPH_STATUS---
```

## Exit Conditions

Set `EXIT_SIGNAL: true` ONLY when ALL conditions are met:

1. All tasks in current phase marked complete
2. `npm run type-check` passes
3. `npm run test` passes
4. No security concerns identified
5. `.planning/STATE.md` updated with outcomes

## Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm run type-check       # TypeScript checking
npm run lint             # ESLint

# Testing
npm run test             # Jest unit tests
npm run test:e2e         # Playwright E2E tests

# Database
npm run migration:generate  # Generate migration
npm run migration:apply     # Apply migrations
```

## GSD Integration

This project uses GSD for milestone/phase management:

```bash
/gsd:progress           # Check current state
/gsd:plan-phase <N>     # Plan phase N
/gsd:execute-phase      # Execute current phase
/gsd:verify-work        # Validate completion
```

Phase details in `.planning/phases/` and roadmap in `.planning/ROADMAP.md`.

---
*Ralph Loop + GSD + claude-code-workflows integration for ADSapp*
