import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/api-utils'

// 🔒 SECURITY: Strict rate limiting for signin to prevent brute force attacks
// 10 attempts per 5 minutes per IP address
const signinRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 attempts
  keyGenerator: request => {
    // Use IP address + email combination for more granular limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous'
    return `signin:${ip}`
  },
})

export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Apply rate limiting before processing
    await signinRateLimit(request)

    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Create Supabase client
    const supabase = await createClient()

    // Sign in the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      console.error('Auth signin error:', authError)
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user || !authData.session) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Success
    return NextResponse.json({
      message: 'Signed in successfully',
      user: authData.user,
      session: authData.session,
    })
  } catch (error) {
    console.error('Signin API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
