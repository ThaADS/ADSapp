import { SuperAdminDashboard } from '@/components/admin/super-admin-dashboard'
import { requireAuth, getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  // Ensure user is authenticated
  await requireAuth()

  // Get user profile to check super admin status
  const profile = await getUserProfile()

  // If not super admin, redirect to appropriate page
  if (!profile?.is_super_admin) {
    if (profile?.organization_id) {
      redirect('/dashboard')
    } else {
      redirect('/onboarding')
    }
  }

  return <SuperAdminDashboard />
}
