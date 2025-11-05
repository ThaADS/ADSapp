import { requireOrganization } from '@/lib/auth'
import { DashboardNav } from '@/components/dashboard/nav'
import { DashboardHeader } from '@/components/dashboard/header'
import { Suspense } from 'react'

// Loading skeleton for lazy-loaded pages
function PageLoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
      <div className="space-y-4">
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const profile = await requireOrganization()

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav profile={profile} />
      <div className="lg:pl-64">
        <DashboardHeader profile={profile} />
        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<PageLoadingSkeleton />}>
              {children}
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}