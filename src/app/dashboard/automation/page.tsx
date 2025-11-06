import { requireOrganization } from '@/lib/auth'
import AutomationTabs from '@/components/automation/automation-tabs'

export const dynamic = 'force-dynamic'

// ⚡ PERFORMANCE: Cache page for faster tab switches
export const revalidate = 300

export default async function AutomationPage() {
  const profile = await requireOrganization()

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Intelligent Automation</h1>
        <p className='mt-1 text-sm text-gray-600'>
          Create powerful automated workflows, monitor agent capacity, and manage escalations
        </p>
      </div>

      <AutomationTabs organizationId={profile.organization_id} />
    </div>
  )
}
