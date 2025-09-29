import { getUser, getUserProfile } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function RedirectPage() {
  const user = await getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const profile = await getUserProfile()

  // If user is super admin, redirect to admin dashboard
  if (profile?.is_super_admin) {
    redirect('/admin')
  }

  // If user has organization, redirect to dashboard
  if (profile?.organization_id) {
    redirect('/dashboard')
  }

  // Otherwise, redirect to onboarding
  redirect('/onboarding')
}
