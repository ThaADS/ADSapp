import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/api-utils'
import { sendPasswordResetEmail, getUserLocale, getLocaleForNewUser } from '@/lib/email/auth-emails'
import { cookies } from 'next/headers'

// i18n configuration
const LOCALE_COOKIE = 'NEXT_LOCALE'
type Locale = 'nl' | 'en'

// 🔒 SECURITY: Rate limiting for password reset to prevent abuse
// 3 attempts per 15 minutes per IP address
const resetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 attempts
  keyGenerator: request => {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
    return `password-reset:${ip}`
  },
})

/**
 * Get locale for password reset
 * Priority: User's saved preference > Cookie > Email heuristic > Default (en)
 */
async function getResetLocale(email: string): Promise<Locale> {
  // First, try to get the user's saved preference from the database
  try {
    const serviceSupabase = createServiceRoleClient()
    const { data: users } = await serviceSupabase.auth.admin.listUsers()

    if (users?.users) {
      const user = users.users.find(u => u.email === email)
      if (user) {
        // Get user's profile with language preference
        const { data: profile } = await serviceSupabase
          .from('profiles')
          .select('preferred_language')
          .eq('id', user.id)
          .single()

        if (profile?.preferred_language === 'nl' || profile?.preferred_language === 'en') {
          return profile.preferred_language
        }
      }
    }
  } catch {
    // Failed to get user preference, fall back to cookie
  }

  // Try cookie
  try {
    const cookieStore = await cookies()
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value

    if (cookieLocale === 'nl' || cookieLocale === 'en') {
      return cookieLocale
    }
  } catch {
    // Cookie access failed
  }

  // Fall back to email heuristic
  return getLocaleForNewUser(email)
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Apply rate limiting
    await resetRateLimit(request)

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Get locale for the user
    const locale = await getResetLocale(email)

    // Generate password reset link using admin API
    const serviceSupabase = createServiceRoleClient()
    const { data: linkData, error: linkError } = await serviceSupabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`,
      },
    })

    if (linkError) {
      console.error('Failed to generate password reset link:', linkError)
      // Don't reveal if user exists - return success anyway for security
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
        success: true,
      })
    }

    if (!linkData?.properties?.action_link) {
      console.error('No action link returned from generateLink')
      return NextResponse.json({
        message: 'If an account with that email exists, a password reset link has been sent.',
        success: true,
      })
    }

    // Send localized password reset email via Resend
    try {
      await sendPasswordResetEmail({
        to: email,
        locale,
        resetUrl: linkData.properties.action_link,
      })

      console.log(`Localized password reset email sent to ${email} in ${locale}`)
    } catch (emailError) {
      console.error('Failed to send localized password reset email:', emailError)
      // Don't fail the request - the link was generated
    }

    return NextResponse.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      success: true,
    })
  } catch (error) {
    console.error('Password reset API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
