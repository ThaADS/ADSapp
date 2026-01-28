import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/api-utils'
import { sendConfirmationEmail, getLocaleForNewUser } from '@/lib/email/auth-emails'
import { cookies } from 'next/headers'

// i18n configuration
const LOCALE_COOKIE = 'NEXT_LOCALE'
type Locale = 'nl' | 'en'

// 🔒 SECURITY: Strict rate limiting for signup to prevent spam and abuse
// 5 attempts per 15 minutes per IP address
const signupRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts (stricter than signin)
  keyGenerator: request => {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
    return `signup:${ip}`
  },
})

/**
 * Determine the locale to use for the new user
 * Priority: Cookie > Email heuristic > Default (en)
 */
async function getSignupLocale(email: string): Promise<Locale> {
  try {
    const cookieStore = await cookies()
    const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value

    if (cookieLocale === 'nl' || cookieLocale === 'en') {
      return cookieLocale
    }
  } catch {
    // Cookie access failed, fall back to heuristic
  }

  return getLocaleForNewUser(email)
}

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Apply rate limiting before processing
    await signupRateLimit(request)

    const body = await request.json()
    console.log('Signup request body:', body)

    const { email, password, fullName, organizationName } = body

    // Validate input
    if (!email || !password) {
      console.log('Validation failed: missing email or password')
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Get locale for the new user (for localized email)
    const locale = await getSignupLocale(email)

    // Create Supabase client
    const supabase = await createClient()

    // Sign up the user
    const signUpOptions = {
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
          organization_name: organizationName || '',
          preferred_language: locale, // Store locale preference in user metadata
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback`,
      },
    }

    console.log('Calling supabase.auth.signUp with:', signUpOptions)
    const { data: authData, error: authError } = await supabase.auth.signUp(signUpOptions)

    if (authError) {
      console.error('Auth signup error:', authError)
      console.error('Error details:', {
        message: authError.message,
        status: authError.status,
        code: 'AuthError',
      })
      return NextResponse.json(
        { error: authError.message || 'Registration failed' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 400 })
    }

    // If we have a user but no session, email confirmation is required
    // Send localized confirmation email via Resend
    if (authData.user && !authData.session) {
      try {
        // Generate confirmation link using admin API
        const serviceSupabase = createServiceRoleClient()
        const { data: linkData, error: linkError } = await serviceSupabase.auth.admin.generateLink({
          type: 'signup',
          email: email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback`,
          },
        })

        if (linkError || !linkData?.properties?.action_link) {
          console.error('Failed to generate confirmation link:', linkError)
          // Fall back to Supabase's default email (already sent during signUp)
          return NextResponse.json({
            message: 'Please check your email to confirm your account',
            user: authData.user,
            confirmationRequired: true,
          })
        }

        // Send localized email via Resend
        await sendConfirmationEmail({
          to: email,
          locale,
          confirmationUrl: linkData.properties.action_link,
        })

        console.log(`Localized confirmation email sent to ${email} in ${locale}`)
      } catch (emailError) {
        // Log but don't fail - Supabase already sent a backup email
        console.error('Failed to send localized confirmation email:', emailError)
      }

      return NextResponse.json({
        message: 'Please check your email to confirm your account',
        user: authData.user,
        confirmationRequired: true,
      })
    }

    // Success - user is created and logged in (no email confirmation required)
    // In this case, redirect directly to onboarding
    return NextResponse.json({
      message: 'Account created successfully',
      user: authData.user,
      session: authData.session,
      redirectTo: '/onboarding',
    })
  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
