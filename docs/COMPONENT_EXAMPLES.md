# Component Usage Examples

Complete voorbeelden voor alle UI components in ADSapp Phase 1.

## Inhoudsopgave

- [Campaign Builders](#campaign-builders)
- [Analytics Components](#analytics-components)
- [UI Components](#ui-components)
- [Common Patterns](#common-patterns)

---

## Campaign Builders

### Drip Campaign Builder

Complete wizard voor het maken van drip campagnes.

**Basic Usage**:

```typescript
// app/dashboard/drip-campaigns/new/page.tsx
import { DripCampaignBuilder } from '@/components/campaigns/drip-campaign-builder'

export default function NewDripCampaignPage() {
  return (
    <div className="container mx-auto py-8">
      <DripCampaignBuilder />
    </div>
  )
}
```

**Customization**:

```typescript
// Custom onSuccess handler
import { useRouter } from 'next/navigation'

export function CustomDripBuilder() {
  const router = useRouter()

  const handleSuccess = (campaignId: string) => {
    // Custom logic na succesvol maken
    console.log('Campaign created:', campaignId)
    
    // Redirect naar campagne detail
    router.push(`/dashboard/drip-campaigns/${campaignId}`)
    
    // Of toon success toast
    toast.success('Campagne succesvol aangemaakt!')
  }

  return (
    <DripCampaignBuilder onSuccess={handleSuccess} />
  )
}
```

---

### Broadcast Campaign Builder

Multi-step wizard voor broadcast campagnes.

**Basic Usage**:

```typescript
import { BroadcastCampaignBuilder } from '@/components/campaigns/broadcast-campaign-builder'

export default function NewBroadcastPage() {
  return <BroadcastCampaignBuilder />
}
```

**With Pre-filled Data**:

```typescript
// Duplicate bestaande campagne
export function DuplicateCampaignBuilder({ 
  originalCampaign 
}: {
  originalCampaign: Campaign
}) {
  const [initialData] = useState({
    name: `${originalCampaign.name} (Copy)`,
    description: originalCampaign.description,
    targetingType: originalCampaign.targeting.type,
    messageContent: originalCampaign.message.content,
    // ... andere velden
  })

  return <BroadcastCampaignBuilder initialData={initialData} />
}
```

---

### Campaign Lists

**Drip Campaigns List**:

```typescript
import { DripCampaignsListimport from '@/components/campaigns/drip-campaigns-list'

export default async function DripCampaignsPage() {
  const supabase = await createClient()
  
  const { data: campaigns } = await supabase
    .from('drip_campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Drip Campagnes</h1>
        <Link href="/dashboard/drip-campaigns/new">
          <Button>+ Nieuwe Campagne</Button>
        </Link>
      </div>

      <DripCampaignsList campaigns={campaigns} />
    </div>
  )
}
```

**With Filtering**:

```typescript
'use client'

export function FilteredCampaignsList() {
  const [filter, setFilter] = useState<'all' | 'active' | 'draft'>('all')
  const [campaigns, setCampaigns] = useState([])

  useEffect(() => {
    fetchCampaigns()
  }, [filter])

  const fetchCampaigns = async () => {
    let query = supabase.from('drip_campaigns').select('*')
    
    if (filter !== 'all') {
      query = query.eq('status', filter)
    }

    const { data } = await query
    setCampaigns(data || [])
  }

  return (
    <div>
      {/* Filter Buttons */}
      <div className="flex gap-2 mb-4">
        <Button 
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Alle
        </Button>
        <Button 
          variant={filter === 'active' ? 'default' : 'outline'}
          onClick={() => setFilter('active')}
        >
          Actief
        </Button>
        <Button 
          variant={filter === 'draft' ? 'default' : 'outline'}
          onClick={() => setFilter('draft')}
        >
          Concept
        </Button>
      </div>

      <DripCampaignsList campaigns={campaigns} />
    </div>
  )
}
```

---

## Analytics Components

### Campaign Analytics Dashboard

**Basic Usage**:

```typescript
import { CampaignAnalyticsDashboard } from '@/components/analytics/campaign-analytics-dashboard'

export default function AnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <CampaignAnalyticsDashboard />
    </div>
  )
}
```

**With Custom Date Range**:

```typescript
'use client'

export function CustomAnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    start: new Date('2025-01-01'),
    end: new Date()
  })

  return (
    <div>
      {/* Custom Date Picker */}
      <DateRangePicker 
        start={dateRange.start}
        end={dateRange.end}
        onChange={setDateRange}
      />

      {/* Dashboard with custom range */}
      <CampaignAnalyticsDashboard 
        startDate={dateRange.start}
        endDate={dateRange.end}
      />
    </div>
  )
}
```

---

### Performance Charts

**Campaign Performance Chart**:

```typescript
import { CampaignPerformanceChart } from '@/components/analytics/campaign-performance-chart'

export function CampaignDetailPage({ campaignId }: { campaignId: string }) {
  return (
    <div className="space-y-6">
      <h2>Campagne Prestaties</h2>
      
      {/* Show performance over last 30 days */}
      <CampaignPerformanceChart 
        campaignId={campaignId}
        dateRange="30d"
      />
    </div>
  )
}
```

**Campaign Comparison**:

```typescript
import { CampaignComparisonChart } from '@/components/analytics/campaign-comparison-chart'

export function CompareCampaigns() {
  const [selectedCampaigns, setSelectedCampaigns] = useState([
    'campaign-1-id',
    'campaign-2-id'
  ])

  return (
    <div>
      {/* Campaign Selector */}
      <CampaignSelector 
        selected={selectedCampaigns}
        onChange={setSelectedCampaigns}
        max={5}
      />

      {/* Comparison Chart */}
      <CampaignComparisonChart campaignIds={selectedCampaigns} />
    </div>
  )
}
```

**Message Engagement Funnel**:

```typescript
import { MessageEngagementChart } from '@/components/analytics/message-engagement-chart'

export function EngagementAnalytics() {
  return (
    <div className="bg-white rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">
        Bericht Engagement Funnel
      </h3>
      
      <MessageEngagementChart />

      {/* Additional insights */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <InsightCard 
          title="Beste Conversie"
          value="Stap 2 → 3"
          percentage={85.3}
        />
        <InsightCard 
          title="Grootste Drop-off"
          value="Stap 4 → 5"
          percentage={32.1}
        />
        <InsightCard 
          title="Optimalisatie Potentieel"
          value="+23% mogelijk"
        />
      </div>
    </div>
  )
}
```

---

### Agent Performance

**Agent Dashboard**:

```typescript
import { AgentPerformanceDashboard } from '@/components/analytics/agent-performance-dashboard'

export default function AgentAnalyticsPage() {
  return <AgentPerformanceDashboard />
}
```

**Agent Leaderboard**:

```typescript
import { AgentLeaderboard } from '@/components/analytics/agent-leaderboard'

export function TeamPerformance() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2>Team Leaderboard</h2>
        <Button onClick={handleExportToCSV}>
          Export naar CSV
        </Button>
      </div>

      <AgentLeaderboard dateRange="30d" />

      {/* Team Insights */}
      <div className="grid grid-cols-2 gap-4">
        <TeamInsight 
          title="Top Performer"
          agent="Sophie Jansen"
          metric="327 gesprekken"
        />
        <TeamInsight 
          title="Snelste Reactie"
          agent="Lars van Dijk"
          metric="2.3 min gem."
        />
      </div>
    </div>
  )
}
```

---

## UI Components

### Button Component

**Basic Variants**:

```typescript
import { Button } from '@/components/ui/button'

export function ButtonExamples() {
  return (
    <div className="space-x-2">
      {/* Default (filled) */}
      <Button>
        Opslaan
      </Button>

      {/* Outline */}
      <Button variant="outline">
        Annuleren
      </Button>

      {/* Ghost */}
      <Button variant="ghost">
        Meer Info
      </Button>
    </div>
  )
}
```

**Sizes**:

```typescript
export function ButtonSizes() {
  return (
    <div className="space-x-2">
      {/* Small */}
      <Button size="sm">
        Klein
      </Button>

      {/* Default */}
      <Button>
        Normaal
      </Button>

      {/* Large */}
      <Button size="lg">
        Groot
      </Button>
    </div>
  )
}
```

**With Icons**:

```typescript
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline'

export function ButtonsWithIcons() {
  return (
    <div className="space-x-2">
      {/* Icon + Text */}
      <Button>
        <PlusIcon className="h-4 w-4 mr-2" />
        Toevoegen
      </Button>

      {/* Icon Only */}
      <Button size="sm">
        <TrashIcon className="h-4 w-4" />
      </Button>

      {/* Loading State */}
      <Button disabled>
        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
        Laden...
      </Button>
    </div>
  )
}
```

---

## Common Patterns

### Loading States

**Skeleton Loader**:

```typescript
export function CampaignCardSkeleton() {
  return (
    <div className="bg-white rounded-lg p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
      
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="h-12 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-200 rounded" />
        <div className="h-12 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

// Usage
export function CampaignsList() {
  const [campaigns, setCampaigns] = useState(null)

  if (!campaigns) {
    return (
      <div className="grid gap-4">
        <CampaignCardSkeleton />
        <CampaignCardSkeleton />
        <CampaignCardSkeleton />
      </div>
    )
  }

  return <div>{/* Render campaigns */}</div>
}
```

**Spinner**:

```typescript
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className={`${sizeClasses[size]} border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin`} />
  )
}

// Usage in component
export function DataLoader() {
  const [loading, setLoading] = useState(true)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return <div>{/* Data */}</div>
}
```

---

### Error Handling

**Error Boundary**:

```typescript
'use client'

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo)
    
    // Log to error tracking service
    // logErrorToService(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-900 font-semibold mb-2">
            Er ging iets mis
          </h3>
          <p className="text-red-700 text-sm mb-4">
            {this.state.error?.message || 'Onbekende fout'}
          </p>
          <Button onClick={() => this.setState({ hasError: false })}>
            Probeer Opnieuw
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}

// Usage
export function DashboardPage() {
  return (
    <ErrorBoundary>
      <CampaignAnalyticsDashboard />
    </ErrorBoundary>
  )
}
```

**API Error Handling**:

```typescript
export function useCampaignData(campaignId: string) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [campaignId])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/drip-campaigns/${campaignId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch')
      }

      const data = await response.json()
      setData(data)

    } catch (err) {
      console.error('Fetch error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch: fetchData }
}

// Usage in component
export function CampaignDetail({ id }: { id: string }) {
  const { data, loading, error } = useCampaignData(id)

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error} />
  if (!data) return <EmptyState />

  return <CampaignDetailView campaign={data} />
}
```

---

### Form Validation

**With React Hook Form**:

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

const campaignSchema = z.object({
  name: z.string()
    .min(1, 'Naam is verplicht')
    .max(255, 'Naam te lang'),
  description: z.string().optional(),
  triggerType: z.enum(['manual', 'contact_created', 'tag_added']),
  tags: z.array(z.string()).min(1, 'Selecteer minimaal 1 tag')
    .when('triggerType', {
      is: 'tag_added',
      then: schema => schema,
      otherwise: schema => schema.optional()
    })
})

type CampaignFormData = z.infer<typeof campaignSchema>

export function CampaignForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema)
  })

  const onSubmit = async (data: CampaignFormData) => {
    try {
      const response = await fetch('/api/drip-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Failed to create')

      toast.success('Campagne aangemaakt!')
      router.push('/dashboard/drip-campaigns')

    } catch (error) {
      toast.error('Er ging iets mis')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Campaign Name */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Campagne Naam *
        </label>
        <input
          {...register('name')}
          className="w-full px-3 py-2 border rounded-lg"
        />
        {errors.name && (
          <p className="text-red-600 text-sm mt-1">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Trigger Type */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Trigger Type *
        </label>
        <select
          {...register('triggerType')}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="manual">Handmatig</option>
          <option value="contact_created">Contact Aangemaakt</option>
          <option value="tag_added">Tag Toegevoegd</option>
        </select>
        {errors.triggerType && (
          <p className="text-red-600 text-sm mt-1">
            {errors.triggerType.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Aanmaken...' : 'Campagne Aanmaken'}
      </Button>
    </form>
  )
}
```

---

### Real-time Updates

**With Supabase Realtime**:

```typescript
'use client'

export function LiveCampaignStats({ campaignId }: { campaignId: string }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    const supabase = createClient()

    // Initial fetch
    fetchStats()

    // Subscribe to changes
    const channel = supabase
      .channel(`campaign-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'drip_message_logs',
          filter: `campaign_id=eq.${campaignId}`
        },
        (payload) => {
          console.log('Message log updated:', payload)
          fetchStats() // Refetch stats
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [campaignId])

  const fetchStats = async () => {
    const response = await fetch(`/api/drip-campaigns/${campaignId}/stats`)
    const data = await response.json()
    setStats(data.stats)
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard title="Verzonden" value={stats?.sent || 0} />
      <StatCard title="Afgeleverd" value={stats?.delivered || 0} />
      <StatCard title="Gelezen" value={stats?.read || 0} />
      <StatCard title="Geklikt" value={stats?.clicked || 0} />
    </div>
  )
}
```

---

## Tips & Best Practices

### 1. Component Composition

Bouw grote components uit kleinere herbruikbare delen:

```typescript
// ❌ BAD - Monolithic component
export function CampaignDashboard() {
  return (
    <div>
      {/* 500+ lines of code */}
    </div>
  )
}

// ✅ GOOD - Composed from smaller components
export function CampaignDashboard() {
  return (
    <div>
      <CampaignHeader />
      <CampaignFilters />
      <CampaignList />
      <CampaignPagination />
    </div>
  )
}
```

### 2. Props Destructuring

Maak props expliciet in de functie signature:

```typescript
// ❌ BAD
export function Campaign(props) {
  return <div>{props.campaign.name}</div>
}

// ✅ GOOD
interface Props {
  campaign: Campaign
  onUpdate: (id: string) => void
  showStats?: boolean
}

export function CampaignCard({ 
  campaign, 
  onUpdate, 
  showStats = true 
}: Props) {
  return <div>{campaign.name}</div>
}
```

### 3. Avoid Prop Drilling

Gebruik context voor deeply nested props:

```typescript
// CampaignContext.tsx
const CampaignContext = createContext<Campaign | null>(null)

export function CampaignProvider({ 
  campaign, 
  children 
}: {
  campaign: Campaign
  children: ReactNode
}) {
  return (
    <CampaignContext.Provider value={campaign}>
      {children}
    </CampaignContext.Provider>
  )
}

export function useCampaign() {
  const context = useContext(CampaignContext)
  if (!context) throw new Error('useCampaign must be used within CampaignProvider')
  return context
}

// Usage
export function CampaignDetail() {
  return (
    <CampaignProvider campaign={campaign}>
      <CampaignHeader />
      <CampaignStats />
      <CampaignMessages />
    </CampaignProvider>
  )
}

// In nested component
export function CampaignStats() {
  const campaign = useCampaign()
  return <div>{campaign.statistics.sent}</div>
}
```

---

Voor meer voorbeelden, zie `/src/components/` in de codebase!
