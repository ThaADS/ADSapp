import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Sign out from Supabase (clears all sessions)
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Clear session error:', error)
      return NextResponse.json(
        { error: 'Failed to clear session', details: error.message },
        { status: 500 }
      )
    }

    // Create response that clears all Supabase cookies
    const response = NextResponse.json({
      success: true,
      message: 'Session cleared successfully',
    })

    // Clear all Supabase-related cookies
    const cookieNames = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token',
      'sb-egaiyydjgeqlhthxmvbn-auth-token',
      'sb-egaiyydjgeqlhthxmvbn-auth-token-code-verifier',
    ]

    cookieNames.forEach(name => {
      response.cookies.delete(name)
    })

    return response
  } catch (error) {
    console.error('Clear session API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
