# Phase 25: Database Types & Technical Debt

**Milestone:** v3.0 Quality & Completion
**Priority:** Critical (blocks all other v3.0 phases)
**Status:** Planning
**Date:** 2026-02-03

## Overview

This phase addresses the root cause of technical debt in the codebase: database types that have drifted from the actual Supabase schema. This has resulted in 200+ files with @ts-nocheck directives and 24 deferred test files.

## Phase Goals

1. **Regenerate database types** from current Supabase schema
2. **Remove all @ts-nocheck** directives from source files
3. **Re-enable deferred tests** that were disabled due to type issues
4. **Clean up dependencies** (reactflow → @xyflow/react migration)

## Plans

| Plan | Name | Wave | Status |
|------|------|------|--------|
| 25-01 | Database Types Regeneration | 1 | Not started |
| 25-02 | Remove @ts-nocheck from Source Files | 2 | Not started |
| 25-03 | Re-enable Deferred Tests | 2 | Not started |
| 25-04 | Dependency Cleanup | 3 | Not started |

## Wave Execution

```
Wave 1: 25-01 (Database Types)
         ↓
Wave 2: 25-02 (Source Files) + 25-03 (Tests) [parallel]
         ↓
Wave 3: 25-04 (Dependencies)
```

## Success Criteria

| Metric | Before | Target |
|--------|--------|--------|
| @ts-nocheck files | 200+ | 0 |
| Deferred tests | 24 | 0 |
| Duplicate deps | reactflow + @xyflow/react | @xyflow/react only |
| TypeScript errors | Unknown | 0 |
| Build status | Passes (with warnings) | Clean pass |

## Impact

Completing this phase will:
- Enable strict type safety across the codebase
- Restore full test suite functionality
- Reduce bundle size (~20KB)
- Improve developer experience
- Unblock all other v3.0 phases

## Commands

```bash
# Start Phase 25
/gsd:execute-phase 25

# Check progress
/gsd:progress

# Verify completion
npm run type-check && npm run test && npm run build
```

## References

- [Application Analysis Report](../../../docs/COMPLETE-APPLICATION-ANALYSIS.md)
- [ROADMAP.md](../../ROADMAP.md) - Phase 25 details
- [STATE.md](../../STATE.md) - Current project state
