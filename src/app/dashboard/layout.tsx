import { requireOrganization } from '@/lib/auth'
import { DashboardNav } from '@/components/dashboard/nav'
import { DashboardHeader } from '@/components/dashboard/header'

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
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}