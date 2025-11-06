import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'

// Cache getUser for request lifecycle
export const getUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
})

// Optimized getUserProfile with single query and request-level caching
export const getUserProfile = cache(async () => {
  const supabase = await createClient()
  const user = await getUser()

  if (!user) {
    return null
  }

  // Single optimized query with proper join
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(
      `
      *,
      organization:organizations (
        id,
        name,
        slug,
        timezone,
        locale,
        whatsapp_business_account_id,
        stripe_customer_id,
        created_at,
        updated_at
      )
    `
    )
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Failed to fetch profile:', error)
    return null
  }

  return profile
})

export async function requireAuth() {
  const user = await getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  return user
}

export async function requireOrganization() {
  const profile = await getUserProfile()

  // If no profile exists at all, redirect to sign in
  if (!profile) {
    console.error('requireOrganization: No profile found, redirecting to signin')
    redirect('/auth/signin')
  }

  // Check if user is super admin - they don't need an organization
  if (profile.is_super_admin) {
    console.log('requireOrganization: Super admin detected, redirecting to admin')
    redirect('/admin')
  }

  // Require organization_id for regular users
  if (!profile.organization_id) {
    console.error('requireOrganization: No organization_id, redirecting to onboarding')
    redirect('/onboarding')
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
