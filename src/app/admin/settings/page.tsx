import { AdminSettings } from '@/components/admin/admin-settings'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  await requireAuth()

  const profile = await getUserProfile()

  if (!profile?.is_super_admin) {
    if (profile?.organization_id) {
      redirect('/dashboard')
    } else {
      redirect('/onboarding')
    }
  }

  return <AdminSettings />
}
