import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cache } from 'react'

// ⚡ PERFORMANCE: Use React cache() to deduplicate auth calls within a single request
// This prevents multiple Supabase calls when getUser is called multiple times
const getCachedUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
})

export async function getUser() {
  return getCachedUser()
}

// ⚡ PERFORMANCE: Cached profile fetch - only called once per request
const getCachedUserProfile = cache(async () => {
  const supabase = await createClient()
  const user = await getCachedUser()

  if (!user) {
    return null
  }

  // Try to fetch profile with organization join
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*, organization:organizations(*)')
    .eq('id', user.id)
    .single()

  // If join query succeeds, return the profile
  if (!error && profile) {
    return profile
  }

  // Fallback: Fetch profile and organization separately if join fails
  // Note: Join failure is handled gracefully - attempting fallback fetch

  const { data: basicProfile, error: basicError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (basicError || !basicProfile) {
    // Profile fetch failed - user may need to complete onboarding
    return null
  }

  // Fetch organization separately if profile has organization_id
  if (basicProfile.organization_id) {
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', basicProfile.organization_id)
      .single()

    if (!orgError && org) {
      // Return profile with organization attached
      return { ...basicProfile, organization: org } as any
    }

    // Organization fetch failed - continuing with basic profile only
  }

  return basicProfile
})

// ⚡ PERFORMANCE: Export the cached version
export async function getUserProfile() {
  return getCachedUserProfile()
}

export async function requireAuth() {
  const user = await getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  return user
}

// ⚡ PERFORMANCE: This now benefits from React cache() - multiple calls = one DB query
export async function requireOrganization() {
  const profile = await getCachedUserProfile()

  // If no profile exists at all, redirect to sign in
  if (!profile) {
    redirect('/auth/signin')
  }

  // Check if user is super admin - they don't need an organization
  if (profile.is_super_admin) {
    // Super admins should go to admin dashboard instead
    redirect('/admin')
  }

  // Require organization_id for regular users
  if (!profile.organization_id) {
    redirect('/onboarding')
  }

  return profile
}

export async function requireSuperAdminOrOrganization() {
  const profile = await getCachedUserProfile()

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
