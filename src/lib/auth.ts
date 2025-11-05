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
  console.warn('Profile join query failed, using fallback:', error)

  const { data: basicProfile, error: basicError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (basicError || !basicProfile) {
    console.error('Failed to fetch basic profile:', basicError)
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

    // Log warning but continue with basic profile
    console.warn('Failed to fetch organization, continuing with basic profile:', orgError)
  }

  return basicProfile
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

  // If no profile exists at all, redirect to sign in
  if (!profile) {
    console.error('requireOrganization: No profile found, redirecting to signin')
    redirect('/auth/signin')
  }

  // Check if user is super admin - they don't need an organization
  if (profile.is_super_admin) {
    // Super admins should go to admin dashboard instead
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