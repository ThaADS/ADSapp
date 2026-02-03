# ADSapp Agent Integration Configuration

This document configures the wshobson/agents (claude-code-workflows) marketplace for ADSapp development, integrated with GSD and Ralph Loop workflows.

## Enabled Agents by Domain

### Core Development (Daily Use)

| Agent | Plugin | Use Case |
|-------|--------|----------|
| `typescript-pro` | javascript-typescript | TypeScript strict mode migration, type fixes |
| `javascript-pro` | javascript-typescript | ES6+, async patterns, Node.js |
| `backend-architect` | backend-development | Next.js API routes, Supabase RLS patterns |
| `graphql-architect` | backend-development | GraphQL if needed for mobile API v2 |
| `frontend-developer` | frontend-mobile-development | React 19 components, Tailwind CSS 4 |

### Database & Security (Critical)

| Agent | Plugin | Use Case |
|-------|--------|----------|
| `database-architect` | database-design | Supabase schema, RLS policies, migrations |
| `sql-pro` | database-design | Complex queries, pgvector for RAG |
| `security-auditor` | security-scanning | Multi-tenant security audits |
| `backend-security-coder` | backend-api-security | API security, auth patterns |
| `threat-modeling-expert` | security-scanning | STRIDE threat models for new features |

### Testing & Quality

| Agent | Plugin | Use Case |
|-------|--------|----------|
| `test-automator` | unit-testing | Jest unit tests, Playwright E2E |
| `tdd-orchestrator` | tdd-workflows | Test-driven development |
| `code-reviewer` | code-review-ai | Code review with security focus |
| `performance-engineer` | full-stack-orchestration | Performance optimization |

### AI & Integrations

| Agent | Plugin | Use Case |
|-------|--------|----------|
| `ai-engineer` | llm-application-dev | AI drafts, sentiment, RAG (Phase 19) |
| `prompt-engineer` | llm-application-dev | Prompt optimization for AI features |
| `payment-integration` | payment-processing | Stripe billing, subscriptions |

### Observability & Deployment

| Agent | Plugin | Use Case |
|-------|--------|----------|
| `observability-engineer` | observability-monitoring | Production monitoring, SLI/SLO |
| `deployment-engineer` | full-stack-orchestration | Vercel deployment, CI/CD |
| `debugger` | debugging-toolkit | Error analysis, troubleshooting |

## GSD Integration

### Phase-to-Agent Mapping

```yaml
Phase 1-7 (v1.0 Debt Cleanup):
  primary: [typescript-pro, code-reviewer, test-automator]
  support: [security-auditor, performance-engineer]

Phase 8 (Foundation Layer):
  primary: [backend-architect, database-architect]
  support: [typescript-pro, security-auditor]

Phase 9 (WhatsApp Catalog):
  primary: [backend-architect, frontend-developer]
  support: [test-automator]

Phase 10 (Zapier Integration):
  primary: [backend-architect, security-auditor]
  support: [api-documenter, test-automator]

Phase 11 (Team Collaboration):
  primary: [frontend-developer, backend-architect]
  support: [test-automator]

Phase 12 (Shopify Integration):
  primary: [backend-architect, payment-integration]
  support: [security-auditor, test-automator]

Phase 13-14 (Meta Channels):
  primary: [backend-architect, frontend-developer]
  support: [security-auditor, test-automator]

Phase 15 (SMS/Twilio):
  primary: [backend-architect, security-auditor]
  support: [test-automator]

Phase 16-17 (Mobile):
  primary: [mobile-developer, frontend-developer]
  support: [backend-architect, test-automator]

Phase 18 (WhatsApp Calling):
  primary: [backend-architect, frontend-developer]
  support: [security-auditor, performance-engineer]

Phase 19 (Knowledge Base AI):
  primary: [ai-engineer, database-architect]
  support: [backend-architect, security-auditor]
```

### GSD Commands with Agents

```bash
# Start new phase with agent selection
/gsd:plan-phase 8 --agents "backend-architect,database-architect"

# Execute phase with full-stack orchestration
/gsd:execute-phase --orchestration full-stack

# Quick fix with security focus
/gsd:quick "fix RLS policy" --agents "security-auditor,database-architect"

# Debug with specialized agent
/gsd:debug --agent "debugger"
```

## Ralph Loop Integration

### PROMPT.md Agent Directives

When running Ralph Loop on ADSapp, include these directives:

```markdown
## Agent Selection Rules

For each task, select appropriate agents:

### Type Detection
- `*.ts` files → typescript-pro
- `*.tsx` files → frontend-developer
- `**/api/**` routes → backend-architect
- `**/supabase/**` → database-architect
- `**/*.test.*` → test-automator
- Security-related → security-auditor

### Task Patterns
- "fix type" → typescript-pro
- "add endpoint" → backend-architect
- "create component" → frontend-developer
- "write test" → test-automator
- "optimize query" → database-optimizer
- "secure" → security-auditor
```

### Ralph Status Extensions

```
---RALPH_STATUS---
STATUS: IN_PROGRESS | COMPLETE | BLOCKED
ACTIVE_AGENTS: [list of agents used this loop]
AGENT_RECOMMENDATIONS: [suggested agents for next task]
TASKS_COMPLETED_THIS_LOOP: <number>
FILES_MODIFIED: <number>
TESTS_STATUS: PASSING | FAILING | NOT_RUN
WORK_TYPE: IMPLEMENTATION | TESTING | SECURITY | OPTIMIZATION
EXIT_SIGNAL: false | true
RECOMMENDATION: <one line summary>
---END_RALPH_STATUS---
```

## Workflow Patterns

### Full-Stack Feature Development

```bash
# 1. Architecture design
/full-stack-orchestration:full-stack-feature "new channel adapter"

# 2. Plan phase with GSD
/gsd:plan-phase 13 --think-hard

# 3. Execute with monitoring
/gsd:execute-phase --validate

# 4. Security review
/security-scanning:security-sast
```

### Technical Debt Cleanup (v1.0 Focus)

```bash
# 1. Identify issues
/debugging-toolkit:smart-debug "ts-nocheck analysis"

# 2. Fix types
# Use typescript-pro agent via Task tool

# 3. Test coverage
/unit-testing:generate-tests

# 4. Review
/code-review-ai:review --focus security
```

### Database Migration Pattern

```bash
# 1. Design schema
# Use database-architect agent

# 2. Validate RLS
/security-scanning:security-sast --focus rls

# 3. Generate migration
npm run migration:generate

# 4. Review and apply
npm run migration:apply
```

## Model Strategy for ADSapp

Based on wshobson/agents three-tier model strategy:

| Tier | Model | ADSapp Use Cases |
|------|-------|------------------|
| **Opus** | Critical | Security audits, RLS design, architecture decisions |
| **Sonnet** | Complex | Feature development, type migration, API design |
| **Haiku** | Fast | Test generation, documentation, simple fixes |

### GSD Profile Setting

```bash
# For security-critical work
/gsd:set-profile quality

# For rapid iteration
/gsd:set-profile balanced

# For bulk operations
/gsd:set-profile budget
```

## Quick Reference

### Essential Commands

| Task | Command |
|------|---------|
| Plan phase | `/gsd:plan-phase <N>` |
| Execute phase | `/gsd:execute-phase` |
| Quick task | `/gsd:quick "task"` |
| Security scan | `/security-scanning:security-sast` |
| Code review | `/code-review-ai:review` |
| Generate tests | `/unit-testing:generate-tests` |
| Full-stack feature | `/full-stack-orchestration:full-stack-feature` |

### Agent Invocation

```bash
# Via Task tool in conversation
"Use backend-architect to design the UnifiedMessageRouter"

# Via slash command
/backend-development:feature-development "channel adapter"

# Via GSD
/gsd:quick "fix" --agents "typescript-pro"
```

---
*Configuration for wshobson/agents v1.3.7 with GSD v1.9.13*
