import { requireOrganization } from '@/lib/auth'
import { ProfileSettings } from '@/components/dashboard/profile-settings'

export default async function ProfileSettingsPage() {
  const profile = await requireOrganization()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your personal information and account preferences.
        </p>
      </div>
      
      <ProfileSettings profile={profile} />
    </div>
  )
}
