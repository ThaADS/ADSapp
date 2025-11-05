import { requireOrganization } from '@/lib/auth'
import { IntegrationsSettings } from '@/components/dashboard/integrations-settings'
import { SettingsErrorBoundary } from '@/components/error-boundary'

// ⚡ PERFORMANCE: Cache page for faster tab switches
export const revalidate = 300

export default async function IntegrationsPage() {
  const profile = await requireOrganization()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-600">
          Connect third-party apps and manage API integrations.
        </p>
      </div>

      <SettingsErrorBoundary>
        <IntegrationsSettings profile={profile} />
      </SettingsErrorBoundary>
    </div>
  )
}
