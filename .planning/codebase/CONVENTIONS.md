# Code Conventions

**Generated:** 2026-01-21

## Language & Style

### TypeScript
- **Strict Mode:** Disabled (`strict: false`, `noImplicitAny: false`)
- **Path Aliases:** `@/*` → `./src/*`
- **Module Resolution:** Bundler mode

### Formatting
- **Tool:** Prettier with Tailwind plugin
- **Config:** `.prettierrc` or package.json
- **Git Hooks:** Husky + lint-staged

### Linting
- **Tool:** ESLint 9 with Next.js config
- **Plugins:** jsx-a11y, security
- **Auto-fix:** `npm run lint:fix`

## Naming Conventions

### Files
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `OnboardingForm.tsx` |
| Pages/Routes | kebab-case | `forgot-password/page.tsx` |
| Utilities | camelCase | `api-middleware.ts` |
| Types | camelCase | `database.ts` |
| Tests | `.test.ts` / `.spec.ts` | `encryption.test.ts` |

### Code
| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `DashboardHeader` |
| Functions | camelCase | `createClient` |
| Constants | UPPER_SNAKE | `RATE_LIMIT_MAX` |
| Types/Interfaces | PascalCase | `Organization` |
| Enums | PascalCase | `UserRole` |

## Component Patterns

### React Component Structure
```typescript
// 1. Imports
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// 2. Types (if not in separate file)
interface Props {
  organizationId: string
}

// 3. Component
export function ComponentName({ organizationId }: Props) {
  // Hooks first
  const [state, setState] = useState()

  // Effects
  useEffect(() => {}, [])

  // Handlers
  const handleClick = () => {}

  // Render
  return <div />
}
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

### Standard Structure
```typescript
import { createClient } from '@/lib/supabase/server'
import { QueryValidators } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get profile/org context
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    // 3. Validate inputs
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (id) {
      const validation = QueryValidators.uuid(id)
      if (!validation.isValid) {
        return Response.json({ error: 'Invalid ID' }, { status: 400 })
      }
    }

    // 4. Execute query (RLS auto-filters)
    const { data, error } = await supabase
      .from('table')
      .select('*')

    if (error) throw error

    // 5. Return response
    return Response.json({ data })

  } catch (error) {
    console.error('API Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### Admin Routes (Service Role)
```typescript
// ONLY in /api/admin/* routes
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // Verify super admin first
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Then use service role for cross-tenant operations
  const serviceSupabase = createServiceRoleClient()
  const { data } = await serviceSupabase
    .from('organizations')
    .select('*')  // No RLS filtering
}
```

## Error Handling

### Try-Catch Pattern
```typescript
try {
  const result = await operation()
  return Response.json({ data: result })
} catch (error) {
  console.error('Operation failed:', error)
  return Response.json(
    { error: 'Operation failed' },
    { status: 500 }
  )
}
```

### Validation Errors
```typescript
const validation = QueryValidators.uuid(id)
if (!validation.isValid) {
  return Response.json(
    { error: validation.error },
    { status: 400 }
  )
}
```

## State Management

### Zustand Store Pattern
```typescript
// src/stores/example-store.ts
import { create } from 'zustand'

interface State {
  items: Item[]
  loading: boolean
  setItems: (items: Item[]) => void
  addItem: (item: Item) => void
}

export const useExampleStore = create<State>((set) => ({
  items: [],
  loading: false,
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  })),
}))
```

## Real-Time Subscriptions

### Subscription Pattern
```typescript
'use client'

useEffect(() => {
  const supabase = createClient()

  const channel = supabase
    .channel('channel-name')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'table_name',
      filter: `column=eq.${value}`,
    }, (payload) => {
      // Handle change
    })
    .subscribe()

  return () => {
    channel.unsubscribe()
  }
}, [dependencies])
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
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@headlessui/react'
import { clsx } from 'clsx'

import { DashboardHeader } from '@/components/dashboard/header'
import { createClient } from '@/lib/supabase/client'
import type { Organization } from '@/types/database'
```

## Comments

### When to Comment
- Complex business logic
- Non-obvious workarounds
- TODO items (tracked as tech debt)
- Type overrides (`@ts-nocheck` with reason)

### Format
```typescript
// Single-line explanation

/**
 * Multi-line documentation
 * @param id - The organization ID
 * @returns The organization data
 */

// TODO: Description of what needs to be done

// @ts-nocheck - Reason for disabling type checking
```

## Testing Conventions

### Unit Tests (Jest)
```typescript
describe('functionName', () => {
  it('should do expected behavior', () => {
    const result = functionName(input)
    expect(result).toBe(expected)
  })

  it('should handle edge case', () => {
    expect(() => functionName(invalid)).toThrow()
  })
})
```

### E2E Tests (Playwright)
```typescript
test.describe('Feature', () => {
  test('should complete user flow', async ({ page }) => {
    await page.goto('/path')
    await page.click('button')
    await expect(page.locator('.result')).toBeVisible()
  })
})
```

---
*Conventions mapped: 2026-01-21*
