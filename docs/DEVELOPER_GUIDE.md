# ADSapp Developer Onboarding Guide

Welkom bij het ADSapp development team! Deze guide helpt je om snel productief te worden.

## Inhoudsopgave

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- Node.js 18+ (gebruik `nvm`)
- PostgreSQL 14+ (of Supabase account)
- Git
- VS Code (recommended)

### Initial Setup

```bash
# Clone repository
git clone https://github.com/ThaADS/ADSapp.git
cd ADSapp

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Setup Supabase (volg prompts)
npx supabase init
npx supabase start

# Run migrations
npm run migration:apply

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
ADSapp/
├── src/
│   ├── app/                  # Next.js 15 App Router
│   │   ├── api/             # API routes (backend)
│   │   │   ├── drip-campaigns/
│   │   │   ├── bulk/        # Broadcast campaigns
│   │   │   ├── analytics/
│   │   │   └── webhooks/
│   │   ├── dashboard/       # Protected app pages
│   │   └── auth/            # Authentication pages
│   ├── components/          # React components
│   │   ├── ui/             # Base UI components
│   │   ├── campaigns/      # Campaign-specific
│   │   └── analytics/      # Analytics widgets
│   ├── lib/                 # Utility libraries
│   │   ├── supabase/       # Database client
│   │   ├── whatsapp/       # WhatsApp integration
│   │   └── security/       # Input validation
│   └── types/
│       └── database.ts     # TypeScript types
├── supabase/
│   └── migrations/         # Database migrations
├── tests/
│   ├── unit/              # Jest unit tests
│   └── e2e/               # Playwright E2E tests
└── docs/                  # Documentation
```

### Key Directories Explained

**`src/app/api/`**: Backend API routes
- Each folder = API endpoint
- `route.ts` = HTTP methods (GET, POST, PUT, DELETE)
- Uses Supabase for database access
- Always verify authentication

**`src/lib/`**: Reusable business logic
- `supabase/server.ts` - Server-side client (RLS enabled)
- `supabase/client.ts` - Client-side client
- `whatsapp/` - WhatsApp Business API integration
- `security/` - Input validation helpers

**`src/components/`**: React components
- Server Components by default
- Add `'use client'` for interactivity
- Keep components small and focused

---

## Development Workflow

### 1. Branch Strategy

```bash
# Feature branch
git checkout -b feature/campaign-templates

# Bug fix
git checkout -b fix/drip-enrollment-issue

# Always branch from main
git checkout main
git pull origin main
git checkout -b feature/my-feature
```

### 2. Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Features
git commit -m "feat: add campaign duplication feature"

# Bug fixes
git commit -m "fix: resolve drip message scheduling bug"

# Documentation
git commit -m "docs: update API documentation"

# Refactoring
git commit -m "refactor: optimize campaign query performance"

# Tests
git commit -m "test: add unit tests for DripCampaignEngine"
```

### 3. Before Committing

```bash
# Run all checks
npm run lint           # Linting
npm run type-check     # TypeScript
npm run test           # Unit tests
npm run build          # Verify build works
```

Pre-commit hooks run automatically via Husky.

### 4. Pull Request Process

1. Push branch: `git push origin feature/my-feature`
2. Create PR on GitHub
3. Fill in PR template
4. Request review from team
5. Address feedback
6. Merge after approval

---

## Coding Standards

### TypeScript

**Always use strict typing**:

```typescript
// ❌ BAD - Using any
function processData(data: any) {
  return data.map(item => item.value)
}

// ✅ GOOD - Proper typing
interface DataItem {
  value: string
  timestamp: Date
}

function processData(data: DataItem[]): string[] {
  return data.map(item => item.value)
}
```

**Use interfaces for objects**:

```typescript
// ✅ GOOD
interface CampaignConfig {
  name: string
  description?: string
  settings: {
    timezone: string
    maxDailyMessages: number
  }
}
```

### React Components

**Use functional components**:

```typescript
// ✅ GOOD - Functional component
interface Props {
  campaign: Campaign
  onUpdate: (id: string) => void
}

export function CampaignCard({ campaign, onUpdate }: Props) {
  return (
    <div>
      <h3>{campaign.name}</h3>
      <button onClick={() => onUpdate(campaign.id)}>
        Update
      </button>
    </div>
  )
}
```

**Server vs Client Components**:

```typescript
// Server Component (default)
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('campaigns').select()
  
  return <CampaignList campaigns={data} />
}

// Client Component (interactive)
'use client'

export function CampaignList({ campaigns }: Props) {
  const [selected, setSelected] = useState(null)
  
  return (
    <div>
      {campaigns.map(c => (
        <button onClick={() => setSelected(c.id)}>
          {c.name}
        </button>
      ))}
    </div>
  )
}
```

### API Routes

**Standard pattern**:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = 
      await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    // 3. Fetch data (RLS auto-filters by org)
    const { data, error } = await supabase
      .from('campaigns')
      .select()

    if (error) throw error

    // 4. Return response
    return NextResponse.json({ campaigns: data })
    
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Input Validation

**Always validate user input**:

```typescript
import { QueryValidators } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Validate UUID
  const idValidation = QueryValidators.uuid(body.campaign_id)
  if (!idValidation.isValid) {
    return NextResponse.json(
      { error: 'Invalid campaign ID' },
      { status: 400 }
    )
  }

  // Validate text
  const nameValidation = QueryValidators.text(body.name, 255)
  if (!nameValidation.isValid) {
    return NextResponse.json(
      { error: 'Name too long' },
      { status: 400 }
    )
  }

  // Validate enum
  const statusValidation = QueryValidators.enum(
    body.status,
    ['active', 'paused', 'draft']
  )
  if (!statusValidation.isValid) {
    return NextResponse.json(
      { error: 'Invalid status' },
      { status: 400 }
    )
  }

  // Continue with validated data...
}
```

---

## Testing

### Unit Tests (Jest)

Location: `tests/unit/`

```typescript
// tests/unit/lib/drip-campaigns.test.ts
import { DripCampaignEngine } from '@/lib/whatsapp/drip-campaigns'

describe('DripCampaignEngine', () => {
  let engine: DripCampaignEngine

  beforeEach(() => {
    engine = new DripCampaignEngine(mockSupabase)
  })

  it('should create a campaign', async () => {
    const campaign = await engine.createCampaign('org-id', {
      name: 'Test Campaign',
      triggerType: 'manual'
    })

    expect(campaign).toHaveProperty('id')
    expect(campaign.name).toBe('Test Campaign')
  })

  it('should calculate delays correctly', () => {
    const delay = engine.calculateDelay('days', 2)
    expect(delay).toBe(2 * 24 * 60 * 60 * 1000)
  })
})
```

**Run tests**:
```bash
npm run test              # All tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
```

### E2E Tests (Playwright)

Location: `tests/e2e/`

```typescript
// tests/e2e/campaigns.spec.ts
import { test, expect } from '@playwright/test'

test('user can create drip campaign', async ({ page }) => {
  // Login
  await page.goto('/auth/signin')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password123')
  await page.click('button[type="submit"]')

  // Navigate to campaign builder
  await page.goto('/dashboard/drip-campaigns/new')

  // Fill campaign details
  await page.fill('[name="name"]', 'Test Campaign')
  await page.click('button:has-text("Volgende")')

  // Verify success
  await expect(page.locator('.success-message')).toBeVisible()
})
```

**Run E2E tests**:
```bash
npm run test:e2e          # Headless
npm run test:e2e:ui       # With UI
```

---

## Common Tasks

### Adding a New API Endpoint

1. **Create route file**:
```bash
mkdir -p src/app/api/campaigns/stats
touch src/app/api/campaigns/stats/route.ts
```

2. **Implement endpoint**:
```typescript
// src/app/api/campaigns/stats/route.ts
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  
  // Your logic here
  
  return Response.json({ stats: data })
}
```

3. **Add tests**:
```typescript
// tests/unit/api/campaigns/stats.test.ts
describe('GET /api/campaigns/stats', () => {
  it('should return campaign statistics', async () => {
    // Test implementation
  })
})
```

### Adding a Database Migration

1. **Generate migration**:
```bash
npm run migration:generate
```

2. **Edit migration file**:
```sql
-- supabase/migrations/042_add_campaign_tags.sql

-- Add tags column
ALTER TABLE drip_campaigns
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Create index
CREATE INDEX idx_drip_campaigns_tags 
ON drip_campaigns USING GIN (tags);

-- Add RLS policy
CREATE POLICY "Users can filter by tags"
ON drip_campaigns
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id 
    FROM profiles 
    WHERE id = auth.uid()
  )
);
```

3. **Apply migration**:
```bash
npm run migration:apply
```

4. **Update TypeScript types**:
```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

### Adding a New Component

1. **Create component file**:
```typescript
// src/components/campaigns/campaign-stats.tsx
'use client'

interface Props {
  campaignId: string
}

export function CampaignStats({ campaignId }: Props) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    fetchStats()
  }, [campaignId])

  const fetchStats = async () => {
    const response = await fetch(`/api/campaigns/${campaignId}/stats`)
    const data = await response.json()
    setStats(data.stats)
  }

  if (!stats) return <div>Loading...</div>

  return (
    <div>
      <h3>Campaign Statistics</h3>
      {/* Render stats */}
    </div>
  )
}
```

2. **Use in page**:
```typescript
// src/app/dashboard/campaigns/[id]/page.tsx
import { CampaignStats } from '@/components/campaigns/campaign-stats'

export default function CampaignDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  return (
    <div>
      <CampaignStats campaignId={params.id} />
    </div>
  )
}
```

---

## Troubleshooting

### Issue: "Unauthorized" on API calls

**Cause**: Supabase session expired or missing

**Solution**:
```typescript
// Check auth status
const supabase = createClient()
const { data: { session } } = await supabase.auth.getSession()
console.log('Session:', session)

// Refresh session if expired
const { data, error } = await supabase.auth.refreshSession()
```

### Issue: RLS Policy Blocking Query

**Cause**: User's `organization_id` not set

**Solution**:
```sql
-- Check user profile
SELECT * FROM profiles WHERE id = 'user-id';

-- Update if needed
UPDATE profiles 
SET organization_id = 'org-id'
WHERE id = 'user-id';
```

### Issue: TypeScript Errors After DB Changes

**Solution**:
```bash
# Regenerate types
npx supabase gen types typescript --linked > src/types/database.ts

# Restart TypeScript server in VS Code
# Cmd+Shift+P > "TypeScript: Restart TS Server"
```

### Issue: Build Failing Locally

**Solution**:
```bash
# Clear cache
rm -rf .next node_modules

# Reinstall
npm install

# Try build again
npm run build
```

---

## Useful Commands

```bash
# Development
npm run dev                # Start dev server
npm run build              # Build for production
npm run start              # Start production server

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Auto-fix lint issues
npm run type-check         # TypeScript check
npm run format             # Format with Prettier

# Testing
npm run test               # Jest tests
npm run test:watch         # Jest watch mode
npm run test:e2e           # Playwright tests

# Database
npm run migration:generate # Create new migration
npm run migration:apply    # Apply migrations
npx supabase db reset      # Reset DB (DEV ONLY)

# Supabase
npx supabase start         # Start local Supabase
npx supabase stop          # Stop local Supabase
npx supabase status        # Check status
```

---

## Resources

- **Next.js Docs**: https://nextjs.org/docs
- **Supabase Docs**: https://supabase.com/docs
- **WhatsApp API**: https://developers.facebook.com/docs/whatsapp
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Internal Wiki**: [Notion workspace]

---

## Getting Help

- **Code Questions**: Ask in #dev-questions Slack channel
- **Bugs**: Create issue on GitHub
- **Urgent**: Contact lead developer

Welkom bij het team! 🚀
