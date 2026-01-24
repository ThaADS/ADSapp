# Code Conventions

**Analysis Date:** 2026-01-23

## Language & Style

### TypeScript
- **Strict Mode:** Disabled (`strict: false`, `noImplicitAny: false`)
- **Path Aliases:** `@/*` → `./src/*`
- **Module Resolution:** Bundler mode
- **Rationale:** Intentionally relaxed to support legacy migration; enforcing incrementally

### Formatting
- **Tool:** Prettier with Tailwind plugin (v3.1.1)
- **Config:** `.prettierrc`
- **Git Hooks:** Husky + lint-staged for pre-commit formatting
- **Key Settings:**
  - No semicolons: `"semi": false`
  - Single quotes: `"singleQuote": true`, `"jsxSingleQuote": true`
  - Print width: 100 characters
  - Tab width: 2 spaces (NO tabs)
  - Trailing commas: ES5 style
  - Arrow function parens: Omitted when single param

### Linting
- **Tool:** ESLint 9 with Next.js config
- **Config:** `eslint.config.mjs` (flat config format)
- **Extends:** `next/core-web-vitals` and `next/typescript`
- **Plugin Security:** `eslint-plugin-security` enabled
- **Auto-fix:** `npm run lint:fix`
- **Rules (warnings for migration):**
  - `@typescript-eslint/ban-ts-comment`: warn
  - `@typescript-eslint/no-explicit-any`: warn
  - `@typescript-eslint/no-unused-vars`: warn
  - `react/no-unescaped-entities`: warn
  - `react-hooks/rules-of-hooks`: warn

## Naming Conventions

### Files
| Type | Convention | Example |
|------|------------|---------|
| Components | camelCase | `dashboardHeader.tsx` (or PascalCase: `DashboardHeader.tsx`) |
| Pages/Routes | route file in directory | `src/app/api/contacts/route.ts` |
| Utilities | camelCase | `api-utils.ts`, `input-validation.ts` |
| Types | camelCase | `workflow.ts`, `database.ts` |
| Tests | `.test.ts` or `.spec.ts` | `input-validation.test.ts` |
| Config | *.config.ts | `jest.config.js`, `eslint.config.mjs` |

### Code Naming
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `DashboardHeader`, `OnboardingForm` |
| Functions | camelCase | `validateEmail()`, `createClient()`, `handleSignOut()` |
| Constants | UPPER_SNAKE_CASE | `VALIDATION_ERROR_CODES`, `MAX_ATTEMPTS`, `PATTERNS` |
| Variables | camelCase | `organizationId`, `phoneNumber`, `isValidating` |
| Booleans | is/has/should/can prefix | `isValid`, `hasError`, `shouldRefresh`, `canUpdate` |
| Types/Interfaces | PascalCase | `ValidationResult`, `WorkflowNodeType`, `User` |
| Enums | PascalCase | `UserRole`, `MessageStatus` |
| Const Enums (objects) | UPPER_SNAKE_CASE | `ValidationErrorCodes`, `TRIGGER_EVENTS` |

**Files with @ts-nocheck:**
- `src/types/workflow.ts` - React Flow type compatibility
- `src/stores/workflow-store.ts` - Zustand middleware type issues
- `src/lib/api-utils.ts` - Database type regeneration pending

## Component Patterns

### React Component Structure
```typescript
// 1. Imports (order: React → Next → external → internal → types)
import { useState, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { CommandPalette } from '@/components/search/command-palette'

// 2. Types (if not in separate file)
interface Props {
  organizationId: string
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
'use client'  // Mark at top

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
  const supabase = await createClient()  // Must await
  // ...
}
```

## API Route Patterns

### Standard Structure (Example: `src/app/api/contacts/route.ts`)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthenticatedUser, getUserOrganization } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
  try {
    // 1. Authentication
    const user = await requireAuthenticatedUser()
    const userOrg = await getUserOrganization(user.id)
    const organizationId = userOrg.organization_id

    // 2. Parse & validate inputs
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const { page, limit, offset } = validatePagination(request)

    // 3. Check cache (if applicable)
    const cacheKey = generateApiCacheKey(organizationId, 'contacts', request)
    const cached = await getCachedApiResponse(cacheKey, CacheConfigs.contacts)
    if (cached) {
      const headers = new Headers(getCacheHeaders(CacheConfigs.contacts.ttl))
      return NextResponse.json(cached.data, { headers })
    }

    // 4. Execute query (RLS auto-filters by organization_id)
    const supabase = await createClient()
    let query = supabase
      .from('contacts')
      .select(...)
      .eq('organization_id', organizationId)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error, count } = await query.limit(limit).offset(offset)

    if (error) throw error

    // 5. Cache & return response
    await cacheApiResponse(cacheKey, { data, count }, CacheConfigs.contacts)
    return NextResponse.json({ data, pagination: { total: count, page, limit } })

  } catch (error) {
    console.error('Error fetching contacts:', error)
    return createErrorResponse(error)
  }
}
```

### Admin Routes (Service Role - `src/app/api/admin/*`)
```typescript
// ONLY in /api/admin/* routes
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // 1. Verify super admin first
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Check super admin role
  const isSuperAdmin = await checkSuperAdminStatus(user.id)
  if (!isSuperAdmin) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 3. Then use service role for cross-tenant operations
  const serviceSupabase = createServiceRoleClient()
  const { data } = await serviceSupabase
    .from('organizations')
    .select('*')  // No RLS filtering
}
```

## Error Handling

### Try-Catch Pattern with ApiException
```typescript
import { ApiException, createErrorResponse } from '@/lib/api-utils'

try {
  const result = await operation()
  return createSuccessResponse(result)
} catch (error) {
  console.error('Operation failed:', error)
  return createErrorResponse(error)
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

### Validation Errors
```typescript
import { QueryValidators, ValidationErrorCodes } from '@/lib/security/input-validation'

const validation = QueryValidators.uuid(id)
if (!validation.isValid) {
  return NextResponse.json(
    { error: validation.error, code: validation.errorCode },
    { status: 400 }
  )
}

// SQL injection detection
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

interface State {
  workflow: Workflow | null
  nodes: WorkflowNode[]
  isValidating: boolean

  // Actions
  setWorkflow: (workflow: Workflow) => void
  addNode: (type: WorkflowNodeType, position: { x: number; y: number }) => void
  validateWorkflow: () => Promise<ValidationResult>
}

export const useWorkflowStore = create<State>(
  devtools(
    persist(
      (set) => ({
        workflow: null,
        nodes: [],
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

## Real-Time Subscriptions

### Supabase Realtime Pattern
```typescript
'use client'

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

## Import Organization

### Order
1. React/Next.js imports
2. Third-party packages
3. Internal components (`@/components/`)
4. Internal lib (`@/lib/`)
5. Types (`@/types/`)
6. Styles

### Example
```typescript
import { useState, useEffect, memo } from 'react'
import { useRouter } from 'next/navigation'

import { clsx } from 'clsx'
import { framerMotion } from 'framer-motion'

import { DashboardHeader } from '@/components/dashboard/header'
import { createClient } from '@/lib/supabase/client'
import { validateEmail } from '@/lib/security/input-validation'
import type { Organization } from '@/types/database'
```

## Comments & Documentation

### When to Comment
- Security-critical logic (input validation, RLS policies)
- Complex business logic or algorithms (workflow engine, CRM sync)
- Migration notes: `// @ts-nocheck` with reason
- Performance optimizations: `// ⚡ PERFORMANCE:`
- Workarounds/hacks: `// 🔧 FIX:`
- TODO items: `// TODO:` (tracked as tech debt)

### JSDoc Format
```typescript
/**
 * Validates user input for SQL injection patterns
 * @param input - User-provided string to check
 * @returns true if injection detected, false otherwise
 * @throws Error if validation fails unexpectedly
 */
export function detectSQLInjection(input: string): boolean {
  // Implementation
}

// Single-line for simple functions
// Sanitizes HTML to prevent XSS attacks
export function sanitizeHTML(html: string): string {
  // Implementation
}
```

### Performance Optimization Comments
```typescript
// ⚡ PERFORMANCE: Memoized icons to prevent recreation on render
const MenuIcon = memo(() => <svg>...</svg>)

// ⚡ PERFORMANCE: Cache key from request parameters
const cacheKey = generateApiCacheKey(organizationId, 'contacts', request)
```

### Fix/Workaround Comments
```typescript
// 🔧 FIX: Query organization directly instead of relying on middleware headers
// Root cause: Next.js 15 doesn't propagate headers when middleware returns null
const userOrg = await getUserOrganization(user.id)
```

## Testing Conventions

### Unit Tests (Jest)
```typescript
describe('functionName', () => {
  beforeEach(() => {
    // Setup
    jest.clearAllMocks()
  })

  it('should do expected behavior', () => {
    const result = functionName(input)
    expect(result).toBe(expected)
  })

  it('should handle edge case', () => {
    expect(() => functionName(invalid)).toThrow()
  })

  it('should handle async operation', async () => {
    const result = await asyncFunction()
    expect(result).toBeDefined()
  })
})
```

### E2E Tests (Playwright)
```typescript
import { test, expect } from '@playwright/test'

test.describe('User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should complete flow', async ({ page }) => {
    // Arrange
    await page.goto('/path')

    // Act
    await page.click('[data-testid="start-button"]')
    await page.fill('[name="email"]', 'test@example.com')
    await page.click('[type="submit"]')

    // Assert
    await expect(page.locator('.success')).toBeVisible()
    await page.screenshot({ path: 'test-results/success.png' })
  })
})
```

## Database/ORM Patterns

### Supabase Query Pattern
```typescript
// Server component - RLS-enforced
const supabase = await createClient()
const { data, error } = await supabase
  .from('contacts')
  .select('id, name, phone_number')
  .eq('organization_id', organizationId)  // ALWAYS include org_id
  .order('created_at', { ascending: false })
  .limit(10)

if (error) throw error

// Client component
const supabase = createClient()  // Synchronous
const { data } = await supabase
  .from('contacts')
  .select()
  .eq('organization_id', organizationId)
```

### Multi-Tenant Isolation
All queries must include `organization_id` filter:
- Prevents data leaks between organizations
- Enforced via Row Level Security (RLS) policies
- RLS-enabled client automatically filters (use in server routes)
- Service role client bypasses RLS (admin routes only)

## Performance Markers & Optimization

Inline comments for intentional optimizations:
- `// ⚡ PERFORMANCE: description` - Performance optimization reason
- `// 🔧 FIX: description` - Workaround or fix reason
- `// @ts-nocheck` - Type checking relaxation justification

---

*Convention analysis: 2026-01-23*
