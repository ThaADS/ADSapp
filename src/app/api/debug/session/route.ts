import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    // Get user profile if user exists
    let profile = null
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, organization_id, is_super_admin')
        .eq('id', user.id)
        .single()

      profile = data
    }

    return NextResponse.json({
      session: session ? {
        user_id: session.user.id,
        user_email: session.user.email,
        expires_at: session.expires_at,
        access_token_preview: session.access_token.substring(0, 20) + '...'
      } : null,
      user: user ? {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      } : null,
      profile,
      errors: {
        sessionError: sessionError?.message || null,
        userError: userError?.message || null
      },
      debug: {
        cookies: request.cookies.getAll().map(c => ({ name: c.name, value: c.value.substring(0, 20) + '...' })),
        headers: {
          authorization: request.headers.get('authorization')?.substring(0, 20) + '...' || null
        }
      }
    })
  } catch (error) {
    console.error('Debug session error:', error)
    return NextResponse.json({
      error: 'Failed to fetch session debug info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
