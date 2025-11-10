/**
 * Lazy Loading Utilities for Heavy Components
 *
 * This file provides dynamic imports for components that significantly impact bundle size.
 * By lazy loading these components, we reduce the initial JavaScript bundle and improve
 * Time to Interactive (TTI) and First Contentful Paint (FCP).
 *
 * Bundle Size Impact:
 * - Charts (recharts): ~150KB
 * - Workflow Canvas (reactflow): ~180KB
 * - Rich Text Editor: ~100KB
 * - CSV Parser UI: ~80KB
 *
 * Total savings: ~510KB from initial bundle
 */

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

// Loading skeleton components
const ChartSkeleton = () => (
  <div className="h-64 w-full animate-pulse rounded-lg bg-gray-200">
    <div className="flex h-full items-center justify-center text-gray-400">
      Loading chart...
    </div>
  </div>
)

const CanvasSkeleton = () => (
  <div className="h-[600px] w-full animate-pulse rounded-lg bg-gray-200">
    <div className="flex h-full items-center justify-center text-gray-400">
      Loading workflow canvas...
    </div>
  </div>
)

const EditorSkeleton = () => (
  <div className="h-48 w-full animate-pulse rounded-lg bg-gray-200">
    <div className="flex h-full items-center justify-center text-gray-400">
      Loading editor...
    </div>
  </div>
)

const TableSkeleton = () => (
  <div className="h-96 w-full animate-pulse rounded-lg bg-gray-200">
    <div className="flex h-full items-center justify-center text-gray-400">
      Loading data...
    </div>
  </div>
)

// 🚀 PERFORMANCE: Lazy load analytics charts (recharts library ~150KB)
export const AnalyticsCharts = dynamic(
  () => import('@/components/analytics/charts').then((mod) => mod.AnalyticsCharts),
  {
    loading: () => <ChartSkeleton />,
    ssr: false, // Charts don't need SSR
  }
)

// 🚀 PERFORMANCE: Lazy load dashboard charts
export const DashboardCharts = dynamic(
  () => import('@/components/dashboard/charts').then((mod) => mod.DashboardCharts),
  {
    loading: () => <ChartSkeleton />,
    ssr: false,
  }
)

// 🚀 PERFORMANCE: Lazy load workflow canvas (reactflow library ~180KB)
export const WorkflowCanvas = dynamic(
  () => import('@/components/automation/workflow-canvas').then((mod) => mod.WorkflowCanvas),
  {
    loading: () => <CanvasSkeleton />,
    ssr: false, // Canvas requires browser APIs
  }
)

// 🚀 PERFORMANCE: Lazy load drip campaign builder
export const DripCampaignBuilder = dynamic(
  () =>
    import('@/components/drip-campaigns/campaign-builder').then(
      (mod) => mod.DripCampaignBuilder
    ),
  {
    loading: () => <CanvasSkeleton />,
    ssr: false,
  }
)

// 🚀 PERFORMANCE: Lazy load rich text editor
export const RichTextEditor = dynamic(
  () => import('@/components/messaging/rich-text-editor').then((mod) => mod.RichTextEditor),
  {
    loading: () => <EditorSkeleton />,
    ssr: false, // Editor requires browser APIs
  }
)

// 🚀 PERFORMANCE: Lazy load CSV import UI
export const CSVImporter = dynamic(
  () => import('@/components/contacts/csv-importer').then((mod) => mod.CSVImporter),
  {
    loading: () => <TableSkeleton />,
    ssr: false,
  }
)

// 🚀 PERFORMANCE: Lazy load broadcast campaign creator
export const BroadcastCampaignCreator = dynamic(
  () =>
    import('@/components/broadcast/campaign-creator').then((mod) => mod.BroadcastCampaignCreator),
  {
    loading: () => <CanvasSkeleton />,
    ssr: false,
  }
)

// 🚀 PERFORMANCE: Lazy load template editor
export const TemplateEditor = dynamic(
  () => import('@/components/templates/template-editor').then((mod) => mod.TemplateEditor),
  {
    loading: () => <EditorSkeleton />,
    ssr: false,
  }
)

// 🚀 PERFORMANCE: Lazy load analytics export UI
export const AnalyticsExporter = dynamic(
  () => import('@/components/analytics/exporter').then((mod) => mod.AnalyticsExporter),
  {
    loading: () => <TableSkeleton />,
    ssr: false,
  }
)

// 🚀 PERFORMANCE: Lazy load settings panels
export const AISettingsPanel = dynamic(
  () => import('@/components/settings/ai-settings').then((mod) => mod.AISettingsPanel),
  {
    loading: () => <div className="animate-pulse">Loading settings...</div>,
    ssr: true, // Settings can be server-rendered
  }
)

export const BillingPanel = dynamic(
  () => import('@/components/settings/billing-panel').then((mod) => mod.BillingPanel),
  {
    loading: () => <div className="animate-pulse">Loading billing...</div>,
    ssr: false, // Billing integrates with Stripe (client-side)
  }
)

// 🚀 PERFORMANCE: Generic lazy loader for any component
export function lazyLoad<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T } | T>,
  options?: {
    loading?: ComponentType
    ssr?: boolean
  }
): ComponentType<React.ComponentProps<T>> {
  return dynamic(
    async () => {
      const mod = await importFn()
      // Handle both default and named exports
      return 'default' in mod ? mod.default : mod
    },
    {
      loading: options?.loading || (() => <div className="animate-pulse">Loading...</div>),
      ssr: options?.ssr ?? false,
    }
  ) as ComponentType<React.ComponentProps<T>>
}

/**
 * Usage Examples:
 *
 * 1. In pages/components:
 * ```tsx
 * import { AnalyticsCharts, WorkflowCanvas } from '@/lib/lazy-imports'
 *
 * export default function AnalyticsPage() {
 *   return <AnalyticsCharts data={data} />
 * }
 * ```
 *
 * 2. Custom lazy loading:
 * ```tsx
 * const MyHeavyComponent = lazyLoad(
 *   () => import('./my-heavy-component'),
 *   { ssr: false }
 * )
 * ```
 *
 * 3. Route-based code splitting (automatic in Next.js 15):
 * - Each page in /app is automatically code-split
 * - Use lazy imports for components within pages
 */
