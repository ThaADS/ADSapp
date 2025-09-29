import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function getUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
}

export async function getUserProfile() {
  const supabase = await createClient()
  const user = await getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single()

  return profile
}

export async function requireAuth() {
  const user = await getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  return user
}

export async function requireOrganization() {
  const profile = await getUserProfile()

  if (!profile?.organization_id) {
    // Check if user is super admin - they don't need an organization
    if (profile?.is_super_admin) {
      // Super admins should go to admin dashboard instead
      redirect('/admin')
    } else {
      redirect('/onboarding')
    }
  }

  return profile
}

export async function requireSuperAdminOrOrganization() {
  const profile = await getUserProfile()

  // If user is super admin, they can access without organization
  if (profile?.is_super_admin) {
    return profile
  }

  // Otherwise, require organization
  if (!profile?.organization_id) {
    redirect('/onboarding')
  }

  return profile
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/signin')
}