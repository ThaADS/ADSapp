import { requireOrganization } from '@/lib/auth'
import { OrganizationSettings } from '@/components/dashboard/organization-settings'
import { SettingsErrorBoundary } from '@/components/error-boundary'
import { redirect } from 'next/navigation'

// ⚡ PERFORMANCE: Cache page for faster tab switches
export const revalidate = 300

export default async function OrganizationSettingsPage() {
  const profile = await requireOrganization()

  // Only owner/admin can access organization settings
  if (profile.role !== 'owner' && profile.role !== 'admin') {
    redirect('/dashboard/settings')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your organization details, branding, and general settings.
        </p>
      </div>

      <SettingsErrorBoundary>
        <OrganizationSettings profile={profile} />
      </SettingsErrorBoundary>
    </div>
  )
}
