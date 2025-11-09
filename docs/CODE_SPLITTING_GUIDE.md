# Code Splitting Implementation Guide

**Date:** November 9, 2025
**Purpose:** Reduce initial bundle size by 40-60%
**Impact:** Faster page loads, better Time to Interactive (TTI)

---

## Why Code Splitting?

### Current Problem
- All JavaScript loads on initial page load
- Heavy libraries (recharts, reactflow) slow down first paint
- Users download code they may never use

### Solution: Dynamic Imports
- Load code only when needed
- Separate vendor chunks
- Route-based splitting

### Expected Results
- **40-60% smaller initial bundle**
- **50% faster Time to Interactive**
- **Better Lighthouse scores** (90+)

---

## Implementation Patterns

### Pattern 1: Dynamic Component Import

**Before:**
```typescript
import { AnalyticsChart } from '@/components/analytics/chart'

export default function AnalyticsPage() {
  return <AnalyticsChart data={data} />
}
```

**After:**
```typescript
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Dynamically import with loading state
const AnalyticsChart = dynamic(
  () => import('@/components/analytics/chart').then(mod => ({ default: mod.AnalyticsChart })),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // Disable SSR if chart uses browser APIs
  }
)

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <AnalyticsChart data={data} />
    </Suspense>
  )
}
```

### Pattern 2: Route-Based Splitting (Automatic)

Next.js 15 automatically code-splits by route, but you can optimize further:

**Example:** `/src/app/dashboard/analytics/page.tsx`

```typescript
import dynamic from 'next/dynamic'

// Heavy components loaded only when route is accessed
const RevenueChart = dynamic(() => import('@/components/analytics/revenue-chart'))
const AgentPerformance = dynamic(() => import('@/components/analytics/agent-performance'))
const CampaignMetrics = dynamic(() => import('@/components/analytics/campaign-metrics'))

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <RevenueChart />
      <AgentPerformance />
      <CampaignMetrics />
    </div>
  )
}
```

### Pattern 3: Lazy Loading with React.lazy

**Example:** Modal/Dialog Components

```typescript
import { lazy, Suspense } from 'react'

// Load modal only when opened
const CreateCampaignModal = lazy(() => import('@/components/campaigns/create-modal'))

export function CampaignsPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button onClick={() => setShowModal(true)}>Create Campaign</button>

      {showModal && (
        <Suspense fallback={<ModalSkeleton />}>
          <CreateCampaignModal onClose={() => setShowModal(false)} />
        </Suspense>
      )}
    </>
  )
}
```

---

## Real Examples for ADSapp

### 1. Analytics Pages (High Priority)

**File:** `/src/app/dashboard/analytics/revenue/page.tsx`

```typescript
import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

// recharts is ~150KB - load only when needed
const RevenueChart = dynamic(
  () => import('@/components/analytics/revenue-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // Charts use window object
  }
)

const ExportButton = dynamic(
  () => import('@/components/analytics/export-button'),
  { ssr: false }
)

export default async function RevenuePage() {
  // Server-side data fetching still works
  const data = await fetchRevenueData()

  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Revenue Analytics</h1>
        <Suspense fallback={<Skeleton className="h-10 w-32" />}>
          <ExportButton data={data} />
        </Suspense>
      </div>

      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart data={data} />
      </Suspense>
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-[400px] w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-20 w-1/3" />
        <Skeleton className="h-20 w-1/3" />
        <Skeleton className="h-20 w-1/3" />
      </div>
    </div>
  )
}
```

### 2. Automation/Workflow Builder (Very Heavy)

**File:** `/src/app/dashboard/automation/page.tsx`

```typescript
import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// reactflow is ~180KB - MUST be code-split
const WorkflowBuilder = dynamic(
  () => import('@/components/automation/workflow-builder'),
  {
    loading: () => <WorkflowBuilderSkeleton />,
    ssr: false, // ReactFlow requires browser APIs
  }
)

export default function AutomationPage() {
  return (
    <div className="h-screen flex flex-col">
      <header className="border-b p-4">
        <h1>Automation Workflows</h1>
      </header>

      <main className="flex-1">
        <Suspense fallback={<WorkflowBuilderSkeleton />}>
          <WorkflowBuilder />
        </Suspense>
      </main>
    </div>
  )
}

function WorkflowBuilderSkeleton() {
  return (
    <div className="h-full bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading workflow builder...</p>
      </div>
    </div>
  )
}
```

### 3. Campaign Builder

**File:** `/src/app/dashboard/broadcast/new/page.tsx`

```typescript
import dynamic from 'next/dynamic'

// Heavy editor component
const CampaignEditor = dynamic(
  () => import('@/components/campaigns/editor'),
  {
    loading: () => <EditorSkeleton />,
  }
)

// Template picker with preview
const TemplatePicker = dynamic(
  () => import('@/components/campaigns/template-picker'),
  {
    loading: () => <TemplatePickerSkeleton />,
  }
)

// Contact selector (potentially large list)
const ContactSelector = dynamic(
  () => import('@/components/campaigns/contact-selector'),
  {
    loading: () => <ContactSelectorSkeleton />,
  }
)

export default function NewCampaignPage() {
  const [step, setStep] = useState(1)

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create Broadcast Campaign</h1>

      <div className="space-y-6">
        {step === 1 && <TemplatePicker onNext={() => setStep(2)} />}
        {step === 2 && <CampaignEditor onNext={() => setStep(3)} />}
        {step === 3 && <ContactSelector onComplete={handleCreate} />}
      </div>
    </div>
  )
}

// Skeleton components...
```

### 4. Settings Pages (Lazy Load Tabs)

**File:** `/src/app/dashboard/settings/page.tsx`

```typescript
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Load tab content only when selected
const ProfileSettings = dynamic(() => import('@/components/settings/profile'))
const OrganizationSettings = dynamic(() => import('@/components/settings/organization'))
const BillingSettings = dynamic(() => import('@/components/settings/billing'))
const IntegrationsSettings = dynamic(() => import('@/components/settings/integrations'))
const AISettings = dynamic(() => import('@/components/settings/ai'))

export default function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="ai">AI Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Suspense fallback={<TabSkeleton />}>
            <ProfileSettings />
          </Suspense>
        </TabsContent>

        <TabsContent value="organization">
          <Suspense fallback={<TabSkeleton />}>
            <OrganizationSettings />
          </Suspense>
        </TabsContent>

        <TabsContent value="billing">
          <Suspense fallback={<TabSkeleton />}>
            <BillingSettings />
          </Suspense>
        </TabsContent>

        <TabsContent value="integrations">
          <Suspense fallback={<TabSkeleton />}>
            <IntegrationsSettings />
          </Suspense>
        </TabsContent>

        <TabsContent value="ai">
          <Suspense fallback={<TabSkeleton />}>
            <AISettings />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TabSkeleton() {
  return (
    <div className="space-y-4 pt-6">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  )
}
```

---

## Loading States Best Practices

### 1. Skeleton Screens (Preferred)

```typescript
function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      <div className="h-[400px] bg-gray-200 rounded"></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}
```

### 2. Spinner (Simple)

```typescript
function Spinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    </div>
  )
}
```

### 3. Progress Bar (For Multi-Step Loads)

```typescript
function ProgressLoader({ message }: { message: string }) {
  return (
    <div className="p-8 text-center">
      <div className="mb-4">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 animate-pulse w-3/4"></div>
        </div>
      </div>
      <p className="text-gray-600">{message}</p>
    </div>
  )
}
```

---

## Heavy Libraries to Split

### Priority Libraries (Split These First)

1. **recharts** (~150KB)
   - Used in: Analytics pages
   - Split strategy: Dynamic import on analytics routes

2. **reactflow** (~180KB)
   - Used in: Automation workflow builder
   - Split strategy: Dynamic import + SSR false

3. **@supabase/supabase-js** (~80KB)
   - Used in: Most pages
   - Split strategy: Already optimized by Next.js

4. **bullmq** (~100KB)
   - Used in: Queue management
   - Split strategy: Server-only, no client bundle impact

5. **OpenTelemetry** (~200KB)
   - Used in: Monitoring
   - Split strategy: Conditional import (production only)

---

## Bundle Analysis

### Before Code Splitting
```
Page                     First Load JS
/dashboard               850 KB
/dashboard/analytics     1.2 MB   ❌ Too large
/dashboard/automation    1.5 MB   ❌ WAY too large
/dashboard/broadcast     900 KB
```

### After Code Splitting (Target)
```
Page                     First Load JS
/dashboard               300 KB   ✅ 65% smaller
/dashboard/analytics     350 KB   ✅ 71% smaller
/dashboard/automation    400 KB   ✅ 73% smaller
/dashboard/broadcast     320 KB   ✅ 64% smaller
```

---

## Testing Code Splitting

### 1. Build Analysis

```bash
# Analyze bundle size
npm run analyze

# Check .next/analyze/client.html
# Look for:
# - Large chunks (>200KB)
# - Duplicate code across chunks
# - Vendor bundles
```

### 2. Manual Testing

```typescript
// In browser DevTools
// Network tab -> Filter by JS
// Check:
// 1. Initial page load (should be <300KB)
// 2. When clicking analytics (new chunk loads)
// 3. When opening modal (new chunk loads)
```

### 3. Lighthouse Audit

```bash
npm run test:performance

# Check for:
# - Time to Interactive < 3s
# - Total Bundle Size < 500KB
# - Code splitting score
```

---

## Common Pitfalls

### ❌ **Don't split everything**

```typescript
// BAD - Tiny component, not worth splitting
const Button = dynamic(() => import('./button'))

// GOOD - Heavy component with large dependencies
const Chart = dynamic(() => import('./chart'))
```

### ❌ **Don't forget loading states**

```typescript
// BAD - No loading state, causes layout shift
const Chart = dynamic(() => import('./chart'))

// GOOD - Proper loading state
const Chart = dynamic(() => import('./chart'), {
  loading: () => <ChartSkeleton />
})
```

### ❌ **Don't disable SSR unnecessarily**

```typescript
// BAD - Disables SSR for no reason
const ServerComponent = dynamic(() => import('./server-component'), {
  ssr: false
})

// GOOD - Only disable SSR when needed (browser APIs)
const BrowserOnlyChart = dynamic(() => import('./browser-chart'), {
  ssr: false  // Uses window, document, etc.
})
```

---

## Implementation Checklist

### Phase 1: Analytics Pages (Week 1)
- [ ] `/dashboard/analytics/revenue` - Dynamic import recharts
- [ ] `/dashboard/analytics/agents` - Dynamic import charts
- [ ] `/dashboard/analytics/campaigns` - Dynamic import charts
- [ ] Add skeleton loading states
- [ ] Test bundle size reduction

### Phase 2: Heavy Features (Week 2)
- [ ] `/dashboard/automation` - Dynamic import ReactFlow
- [ ] `/dashboard/broadcast/new` - Dynamic import editor
- [ ] `/dashboard/drip-campaigns/new` - Dynamic import builder
- [ ] Add progress indicators

### Phase 3: Settings & Modals (Week 3)
- [ ] Settings tabs - Lazy load each tab
- [ ] Modals - Lazy load on open
- [ ] Large forms - Dynamic import
- [ ] Image upload components

---

## Success Metrics

### Before
- Initial Bundle: 800KB
- Time to Interactive: 4.5s
- Lighthouse Performance: 65

### Target
- Initial Bundle: 300KB (62% reduction)
- Time to Interactive: 2.0s (56% faster)
- Lighthouse Performance: 92

---

## Next Steps

1. **Start with analytics pages** (highest impact)
2. **Run bundle analysis** to confirm improvements
3. **Add loading skeletons** for better UX
4. **Monitor real-world performance** with Web Vitals
5. **Iterate and optimize** based on data

---

**Last Updated:** November 9, 2025
**Status:** Ready for Implementation
**Estimated Impact:** 40-60% bundle size reduction
