import { requireOrganization } from '@/lib/auth'
import RevenueDashboard from '@/components/analytics/revenue-dashboard'

export const metadata = {
  title: 'Revenue Analytics | ADSapp',
  description: 'Comprehensive revenue analytics and financial metrics',
}

export default async function RevenueAnalyticsPage() {
  const profile = await requireOrganization()

  // Only owner/admin can access revenue analytics
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    return (
      <div className='flex h-96 items-center justify-center'>
        <div className='text-center'>
          <h2 className='mb-2 text-xl font-semibold text-gray-900'>Geen toegang</h2>
          <p className='text-gray-600'>
            Alleen eigenaren en beheerders kunnen revenue analytics bekijken.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-3xl font-bold text-gray-900'>Revenue Analytics</h1>
        <p className='mt-2 text-gray-600'>
          Uitgebreide financiële metrics en omzetontwikkeling van uw organisatie
        </p>
      </div>

      <RevenueDashboard organizationId={profile.organization_id!} />
    </div>
  )
}
