import { requireOrganization } from '@/lib/auth'
import { OrganizationSettings } from '@/components/dashboard/organization-settings'
import WhiteLabelBranding from '@/components/dashboard/white-label-branding'
import { BusinessHoursEditor } from '@/components/settings/business-hours-editor'
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
    <div className='space-y-8'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Organization Settings</h1>
        <p className='mt-1 text-sm text-gray-600'>
          Manage your organization details, branding, and general settings.
        </p>
      </div>

      <SettingsErrorBoundary>
        <OrganizationSettings profile={profile} />
      </SettingsErrorBoundary>

      {/* Business Hours Section */}
      <div>
        <h2 className='mb-4 text-xl font-semibold text-gray-900'>Business Hours</h2>
        <SettingsErrorBoundary>
          <BusinessHoursEditor organizationId={profile.organization_id!} />
        </SettingsErrorBoundary>
      </div>

      {/* White-Label Branding Section */}
      <div>
        <h2 className='mb-4 text-xl font-semibold text-gray-900'>White-Label Branding</h2>
        <SettingsErrorBoundary>
          <WhiteLabelBranding
            organizationId={profile.organization_id!}
            currentLogoUrl={profile.organization?.logo_url}
            primaryColor={profile.organization?.branding?.primaryColor}
            secondaryColor={profile.organization?.branding?.secondaryColor}
          />
        </SettingsErrorBoundary>
      </div>
    </div>
  )
}
