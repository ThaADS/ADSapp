import { requireOrganization } from '@/lib/auth'
import { DashboardLayoutClient } from '@/components/dashboard/layout-client'
import { Suspense } from 'react'

// Loading skeleton for lazy-loaded pages
function PageLoadingSkeleton() {
  return (
    <div className='animate-pulse'>
      <div className='mb-6 h-8 w-1/4 rounded bg-gray-200'></div>
      <div className='space-y-4'>
        <div className='h-32 rounded bg-gray-200'></div>
        <div className='h-32 rounded bg-gray-200'></div>
        <div className='h-32 rounded bg-gray-200'></div>
      </div>
    </div>
  )
}

// ⚡ PERFORMANCE: Remove conflicting settings
// dynamic = 'force-dynamic' is required for auth, but we handle caching in the auth layer
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // ⚡ PERFORMANCE: Profile is now cached in the auth layer
  const profile = await requireOrganization()

  return (
    <DashboardLayoutClient profile={profile}>
      <Suspense fallback={<PageLoadingSkeleton />}>{children}</Suspense>
    </DashboardLayoutClient>
  )
}
