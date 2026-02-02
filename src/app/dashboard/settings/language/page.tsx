import { requireOrganization } from '@/lib/auth'
import { LanguageSettings } from '@/components/settings/language-settings'

// Cache page for faster tab switches
export const revalidate = 300

export default async function LanguageSettingsPage() {
  const profile = await requireOrganization()

  return (
    <div className='space-y-6'>
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Language Settings</h1>
        <p className='mt-1 text-sm text-gray-600'>
          Choose your preferred language for the ADSapp interface.
        </p>
      </div>

      <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
        <LanguageSettings
          userId={profile.id}
          currentPreference={profile.preferred_language as 'nl' | 'en' | null}
        />
      </div>
    </div>
  )
}
