# Coding Conventions

**Analysis Date:** 2026-01-28

## Language & Style

### TypeScript
- **Strict Mode:** Enabled (`strict: true` in tsconfig.json)
- **Path Aliases:** `@/*` → `./src/*`
- **Module Resolution:** Bundler mode
- **Note:** Despite strict mode enabled, many files use `@ts-nocheck` comments due to database type mismatches during Supabase schema migrations

### Formatting
- **Tool:** Prettier with Tailwind CSS plugin
- **Config:** `.prettierrc` (Prettier 3.1.1+)
- **Git Hooks:** Husky + lint-staged for pre-commit formatting
- **Key Settings:**
  - No semicolons: `"semi": false`
  - Single quotes for JS/TS and JSX: `"singleQuote": true`, `"jsxSingleQuote": true`
  - Print width: 100 characters (printWidth: 100)
  - Tab width: 2 spaces (NO tabs)
  - Trailing commas: ES5 style (trailingComma: "es5")
  - Arrow function parens: Omitted when single param (arrowParens: "avoid")
  - Bracket spacing: true - `{ key: value }`
  - Tailwind class sorting: enabled via prettier-plugin-tailwindcss

**Run:**
```bash
npm run format           # Auto-format with Prettier
npm run format:check    # Check formatting without changes
```

### Linting
- **Tool:** ESLint 9 with Next.js config (flat config format: `eslint.config.mjs`)
- **Extends:** `next/core-web-vitals` and `next/typescript`
- **Rules (warnings for legacy migration):**
  - `@typescript-eslint/ban-ts-comment`: warn
  - `@typescript-eslint/no-explicit-any`: warn
  - `@typescript-eslint/no-unused-vars`: warn
  - `react/no-unescaped-entities`: warn
  - `react-hooks/rules-of-hooks`: warn
  - `prefer-const`: warn
  - `react/jsx-no-undef`: warn

**Run:**
```bash
npm run lint            # Check for linting issues
npm run lint:fix        # Auto-fix where possible
npm run type-check      # TypeScript validation
```

## Naming Conventions

### Files
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `WhatsAppInbox.tsx`, `MessageInputWithTyping.tsx` |
| Pages/Routes | kebab-case route files | `forgot-password/page.tsx`, `api/contacts/route.ts` |
| Utilities/Helpers | camelCase | `input-validation.ts`, `audit-service.ts`, `api-utils.ts` |
| Types | camelCase | `database.ts`, `workflow.ts`, `channels.ts` |
| Tests | Test suffix pattern | `contact-dedup.test.ts`, `01-landing-page.spec.ts` |
| Config | *.config.ts/js | `jest.config.js`, `eslint.config.mjs` |
| Stores | -store.ts suffix | `workflow-store.ts` |

### Code Naming
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `WhatsAppInbox`, `OnboardingForm`, `DashboardHeader` |
| Functions | camelCase | `validateEmail()`, `createClient()`, `normalizePhoneNumber()` |
| Event handlers | on[EventName] | `onNodesChange()`, `onConnect()`, `onSuspend()` |
| Factory functions | create[Type] / generate[Type] | `createMockUser()`, `generateMockConversations()` |
| Boolean functions | is[State] / has[Property] / can[Action] | `isUUID()`, `hasErrors()`, `canDelete()` |
| Constants | UPPER_SNAKE_CASE | `SQL_INJECTION_PATTERNS`, `SENSITIVE_KEYS`, `MAX_DEPTH` |
| Variables | camelCase | `organizationId`, `phoneNumber`, `mockConversations` |
| Boolean variables | is[State] / has[Property] | `isValidating`, `isDirty`, `hasError` |
| Types/Interfaces | PascalCase | `ValidationResult`, `Conversation`, `ApiException` |
| Enums | PascalCase (type) + UPPER_SNAKE_CASE (values) | `type Role = 'OWNER' \| 'ADMIN'` |

**Files with `@ts-nocheck`:**
- Many files during migration phase due to database type mismatches
- Temporary while running: `npx supabase gen types typescript --linked > src/types/database.ts`

## Component Patterns

### React Component Structure
```typescript
// 1. Imports (order: React → Next → external → internal)
import { useState, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Settings, Trash2 } from 'lucide-react'
import EnhancedConversationList from './enhanced-conversation-list'
import { createClient } from '@/lib/supabase/client'
import type { Conversation } from '@/types/database'

// 2. Types (if not in separate file)
interface Props {
  organizationId: string
  currentUserId: string
  userRole: 'owner' | 'admin' | 'agent'
  onMenuClick?: () => void
}

// 3. Memoization for performance-critical components
const MenuIcon = memo(() => (
  <svg>...</svg>
))
MenuIcon.displayName = 'MenuIcon'

// 4. Main component
function ComponentNameInner({ organizationId, onMenuClick }: Props) {
  // Hooks first
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const router = useRouter()

  // Memoized callbacks for event handlers
  const toggleUserMenu = useCallback(() => setUserMenuOpen(prev => !prev), [])
  const handleClick = useCallback(async () => {
    // Handler logic
  }, [dependencies])

  // Render
  return <div>{/* JSX */}</div>
}

// 5. Export (with optional memo wrapper)
export const ComponentName = memo(ComponentNameInner)
ComponentName.displayName = 'ComponentName'
```

### Client Components
```typescript
'use client'  // Mark at top for client-side features

import { createClient } from '@/lib/supabase/client'

export function ClientComponent() {
  const supabase = createClient()  // Synchronous
  // ...
}
```

### Server Components (default)
```typescript
// No 'use client' directive needed

import { createClient } from '@/lib/supabase/server'

export default async function ServerComponent() {
  const supabase = await createClient()  // MUST await
  // ...
}
```

## API Route Patterns

### Standard Structure (Example: `src/app/api/conversations/[id]/tags/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Helper to check if a string is a valid UUID
function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // 1. Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user's organization context
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    // 3. Parse & validate inputs
    const { id: conversationId } = await params
    const { tagId, tagName } = await request.json()

    if (!tagId && !tagName) {
      return NextResponse.json({ error: 'Tag ID or name is required' }, { status: 400 })
    }

    // 4. Validate inputs with QueryValidators
    // 5. Execute query (RLS auto-filters by organization_id)
    // 6. Return response

    return NextResponse.json({ data })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Admin Routes (Service Role - `src/app/api/admin/*`)
```typescript
// ONLY in /api/admin/* routes - bypasses RLS
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Verify super admin first
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Check super admin role or admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    // 3. Then use service role ONLY for cross-tenant admin operations
    const serviceSupabase = createServiceRoleClient()
    const { data } = await serviceSupabase
      .from('organizations')
      .select('*')  // No RLS filtering

    return Response.json({ data })
  } catch (error) {
    console.error('Admin API Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## Error Handling

### Try-Catch Pattern with Proper Status Codes
```typescript
export async function POST(request: NextRequest) {
  try {
    // ... operation code
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Operation failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Custom ApiException Class
```typescript
export class ApiException extends Error {
  public statusCode: number
  public code: string

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.name = 'ApiException'
  }
}

// Usage
throw new ApiException('Resource not found', 404, 'NOT_FOUND')
```

### Input Validation Errors
```typescript
import { QueryValidators, ValidationErrorCodes, detectSQLInjection } from '@/lib/security/input-validation'

// Validate UUID
const orgValidation = QueryValidators.uuid(organizationId)
if (!orgValidation.isValid) {
  return NextResponse.json({ error: orgValidation.error }, { status: 400 })
}

// Detect SQL injection
if (detectSQLInjection(userInput)) {
  return NextResponse.json(
    { error: 'Invalid input', code: ValidationErrorCodes.SQL_INJECTION_DETECTED },
    { status: 400 }
  )
}
```

## State Management

### Zustand Store Pattern (Example: `src/stores/workflow-store.ts`)
```typescript
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface WorkflowState {
  workflow: Workflow | null
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  isValidating: boolean

  // Actions
  setWorkflow: (workflow: Workflow) => void
  addNode: (type: WorkflowNodeType, position: { x: number; y: number }) => void
  validateWorkflow: () => Promise<ValidationResult>
}

export const useWorkflowStore = create<WorkflowState>(
  devtools(
    persist(
      (set) => ({
        workflow: null,
        nodes: [],
        edges: [],
        isValidating: false,

        setWorkflow: (workflow) => set({ workflow }),
        addNode: (type, position) => set((state) => ({
          nodes: [...state.nodes, { id: generateId(), type, position, data: {} }]
        })),
        validateWorkflow: async () => {
          set({ isValidating: true })
          // Validation logic
          set({ isValidating: false })
        },
      }),
      { name: 'workflow-store' }
    ),
    { name: 'WorkflowStore' }
  )
)
```

## Import Organization

### Order
1. React and Next.js imports
2. Third-party library imports (alphabetical)
3. Internal components (`@/components/`)
4. Internal hooks (`@/hooks/`)
5. Internal utilities and lib (`@/lib/`, `@/utils/`)
6. Internal types (`@/types/`)
7. Styles/CSS imports

### Example
```typescript
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Settings, Trash2 } from 'lucide-react'

import { clsx } from 'clsx'

import EnhancedConversationList from './enhanced-conversation-list'
import ConversationTagSelector from './conversation-tag-selector'
import { createClient } from '@/lib/supabase/client'
import { useTranslations } from '@/components/providers/translation-provider'
import type { Conversation, Message } from '@/types/database'
```

## Comments & Documentation

### When to Comment
- Complex business logic or algorithms
- Security-critical decisions (marked with 🔒)
- Performance optimizations (marked with ⚡)
- Non-obvious algorithmic approaches
- Workarounds or hacks (marked with 🔧)
- TODO items for deferred work
- Migration notes explaining `@ts-nocheck` usage

### Section Dividers
```typescript
// ============================================================================
// AUTHENTICATION & VALIDATION
// ============================================================================
```

### JSDoc Format
```typescript
/**
 * Creates a Supabase server client with cookie handling for Next.js 15 App Router.
 * This function MUST be awaited in server components and API routes.
 *
 * @example
 * ```typescript
 * const supabase = await createClient()
 * const { data } = await supabase.from('table').select()
 * ```
 */
export async function createClient() {
  // ... implementation
}
```

### Security Comments
```typescript
/**
 * Input Validation Library for SQL Injection Prevention
 *
 * Provides comprehensive validation and sanitization functions for all user inputs
 * that will be used in database queries. This library follows a whitelist-first
 * approach and ensures that all inputs meet strict security criteria before
 * being passed to RPC functions or database queries.
 *
 * Security Standards:
 * - OWASP Top 10 Compliance
 * - Parameterized query enforcement
 * - Strict type validation
 * - Whitelist-based validation
 */
```

### Performance Comments
```typescript
// ⚡ PERFORMANCE: Memoized icons to prevent recreation on render
const MenuIcon = memo(() => <svg>...</svg>)

// ⚡ PERFORMANCE: Cache key from request parameters to avoid repeated computation
const cacheKey = generateApiCacheKey(organizationId, 'contacts', request)
```

### Workaround Comments
```typescript
// 🔧 FIX: Query organization directly instead of relying on middleware headers
// Root cause: Next.js 15 doesn't propagate headers when middleware returns null
const userOrg = await getUserOrganization(user.id)
```

### Security Risk Markers
```typescript
// 🔒 SECURITY: Service role key logging removed
// Previously logged service role key prefix - security risk in production
// Service role client creation should be minimal and secure
```

## Logging

### Framework
Custom `logger` utility in `src/lib/security/logger.ts`

**Features:**
- Automatic PII/sensitive data redaction (passwords, tokens, SSN, emails, phone numbers)
- Structured logging format
- Environment-aware verbosity
- Security event tracking

### Patterns
- **DO NOT use:** `console.log()`, `console.error()`, `console.warn()` in new code
- **Use instead:** `logger.debug()`, `logger.info()`, `logger.warn()`, `logger.error()`, `logger.security()`
- Always include context: `{ userId, organizationId, requestId }`
- Sensitive keys are automatically redacted

**Note:** Console methods appear in legacy code and API routes for compatibility. Gradually migrate to logger utility.

### Example
```typescript
import { logger } from '@/lib/security/logger'

// ✅ Correct - uses logger with context
logger.info('User login successful', {
  userId: user.id,
  organizationId: org.id,
  requestId: req.id,
})

// Sensitive data is automatically redacted:
logger.info('Request received', {
  userId: 'user-123',
  password: 'secret123',  // Will be [REDACTED_SECRET]
  email: 'user@example.com',  // Will be masked as u***@example.com
})
```

## Function Design

**Size Guidelines:**
- Aim for functions under 50 lines
- Single responsibility principle - one job per function
- Extract complex logic into separate named functions

**Parameters:**
- Maximum 3-4 parameters; use object destructuring for more
- Type all parameters explicitly
- Use options objects for optional parameters

**Return Values:**
- Always explicit return type in TypeScript
- Use discriminated unions for success/error patterns
- Return early to reduce nesting

**Example:**
```typescript
// ✅ Good - clear, single purpose
function normalizePhoneNumber(input: string): string {
  return input
    .trim()
    .replace(/[\s\-().\/]/g, '')
    .replace(/^(?!\+)/, '+')
}

// ✅ Better with object destructuring
function processUser({
  id,
  email,
  role,
  organization,
  onComplete,
}: UserProcessingOptions) {
  // ...
}
```

## Real-Time Subscriptions

### Supabase Realtime Pattern
```typescript
'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

useEffect(() => {
  const supabase = createClient()

  const channel = supabase
    .channel('channel-name')
    .on('postgres_changes', {
      event: '*',  // or 'INSERT', 'UPDATE', 'DELETE'
      schema: 'public',
      table: 'table_name',
      filter: `organization_id=eq.${organizationId}`,
    }, (payload) => {
      // Handle change: INSERT, UPDATE, DELETE
      console.log('Change received:', payload)
      handleChange(payload)
    })
    .subscribe()

  return () => {
    channel.unsubscribe()
  }
}, [organizationId])
```

## Multi-Tenant Security

**Critical:** All database queries must include organization context.

```typescript
// Server component - RLS-enforced auto-filtering
const supabase = await createClient()
const { data } = await supabase
  .from('contacts')
  .select('id, name, phone_number')
  .eq('organization_id', organizationId)  // ALWAYS include org_id

// Client component - same pattern
const supabase = createClient()
const { data } = await supabase
  .from('contacts')
  .select()
  .eq('organization_id', organizationId)
```

**RLS (Row Level Security):**
- Prevents data leaks between organizations
- Server client automatically enforces via RLS policies
- Service role client bypasses RLS (admin routes only in `/api/admin/*`)

## Current State Notes

**TypeScript Strict Migration:**
- Strict mode is ENABLED (`strict: true`)
- Many files have `@ts-nocheck` comments due to database type mismatches
- This is temporary - regenerate types with: `npx supabase gen types typescript --linked > src/types/database.ts`
- Target: eliminate `@ts-nocheck` comments within next phase

**Legacy Rules Relaxed:**
- ESLint warnings (not errors) allow gradual migration
- Refactoring components should add explicit types
- Reducing type errors reduces reliance on `@ts-nocheck`

---

*Convention analysis: 2026-01-28*
