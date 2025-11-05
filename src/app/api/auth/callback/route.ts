import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/onboarding'

  if (code) {
    const supabase = await createClient()

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(new URL('/auth/signin?error=auth_callback_error', requestUrl.origin))
    }

    // Get the authenticated user
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // Check if user has a profile and organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, is_super_admin')
        .eq('id', user.id)
        .single()

      // Redirect based on user status
      if (profile?.is_super_admin) {
        return NextResponse.redirect(new URL('/admin', requestUrl.origin))
      } else if (profile?.organization_id) {
        return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
      } else {
        // New user without organization - go to onboarding
        return NextResponse.redirect(new URL('/onboarding', requestUrl.origin))
      }
    }
  }

  // Default redirect
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
