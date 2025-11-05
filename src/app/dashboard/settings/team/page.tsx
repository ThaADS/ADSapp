import { requireOrganization } from '@/lib/auth'
import { TeamManagement } from '@/components/dashboard/team-management'
import { SettingsErrorBoundary } from '@/components/error-boundary'
import { redirect } from 'next/navigation'

// ⚡ PERFORMANCE: Cache page for faster tab switches
export const revalidate = 300

export default async function TeamManagementPage() {
  const profile = await requireOrganization()

  // Only owner/admin can access team management
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    redirect('/dashboard/settings')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Invite team members, manage roles, and set permissions.
        </p>
      </div>

      <SettingsErrorBoundary>
        <TeamManagement profile={profile} />
      </SettingsErrorBoundary>
    </div>
  )
}
