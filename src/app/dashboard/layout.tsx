import { requireOrganization } from '@/lib/auth'
import { DashboardNav } from '@/components/dashboard/nav'
import { DashboardHeader } from '@/components/dashboard/header'
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

// ⚡ PERFORMANCE: Cache layout for 5 minutes to avoid re-renders on tab switches
export const revalidate = 300

// Dynamic routing optimization
export const dynamic = 'force-dynamic'
export const dynamicParams = true

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireOrganization()

  return (
    <div className='min-h-screen bg-gray-50'>
      <DashboardNav profile={profile} />
      <div className='lg:pl-64'>
        <DashboardHeader profile={profile} />
        <main className='py-8'>
          <div className='px-4 sm:px-6 lg:px-8'>
            <Suspense fallback={<PageLoadingSkeleton />}>{children}</Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
