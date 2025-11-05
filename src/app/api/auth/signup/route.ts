import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Signup request body:', body)
    
    const { email, password, fullName, organizationName } = body

    // Validate input
    if (!email || !password) {
      console.log('Validation failed: missing email or password')
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = await createClient()

    // Sign up the user
    const signUpOptions = {
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
          organization_name: organizationName || ''
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback`
      }
    }
    
    console.log('Calling supabase.auth.signUp with:', signUpOptions)
    const { data: authData, error: authError } = await supabase.auth.signUp(signUpOptions)

    if (authError) {
      console.error('Auth signup error:', authError)
      console.error('Error details:', {
        message: authError.message,
        status: authError.status,
        code: 'AuthError'
      })
      return NextResponse.json(
        { error: authError.message || 'Registration failed' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 400 }
      )
    }

    // If we have a user but no session, it means email confirmation is required
    if (authData.user && !authData.session) {
      return NextResponse.json({
        message: 'Please check your email to confirm your account',
        user: authData.user,
        confirmationRequired: true
      })
    }

    // Success - user is created and logged in (no email confirmation required)
    // In this case, redirect directly to onboarding
    return NextResponse.json({
      message: 'Account created successfully',
      user: authData.user,
      session: authData.session,
      redirectTo: '/onboarding'
    })

  } catch (error) {
    console.error('Signup API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
