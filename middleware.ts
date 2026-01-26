/**
 * Next.js Middleware Configuration
 *
 * This middleware integrates:
 * - Tenant routing for multi-tenant domain resolution
 * - Supabase session management for authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createTenantMiddleware } from './src/middleware/tenant-routing'

// Environment variables (fail gracefully if not set during build)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Use localhost for development, adsapp.nl for production
const mainDomain =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_APP_DOMAIN || 'adsapp.nl'
    : 'localhost'

// Create tenant middleware instance (only if env vars are available)
const tenantMiddleware = supabaseUrl && supabaseServiceKey
  ? createTenantMiddleware({
      supabaseUrl,
      supabaseKey: supabaseServiceKey,
      mainDomain,
    })
  : null

// Supabase session handler
async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request })

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect to login if no user and accessing protected routes
  if (
    !user &&
    !request.nextUrl.pathname.startsWith('/auth') &&
    !request.nextUrl.pathname.startsWith('/api') &&
    request.nextUrl.pathname !== '/' &&
    !request.nextUrl.pathname.startsWith('/_next')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and API routes that don't need tenant context
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Skip middleware for admin routes (they use different logic)
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    return NextResponse.next()
  }

  try {
    // First, handle Supabase session
    const sessionResponse = await updateSession(request)

    // If session handler returned a redirect, return it
    if (sessionResponse.status === 307 || sessionResponse.status === 308) {
      return sessionResponse
    }

    // Apply tenant routing middleware if available
    if (tenantMiddleware) {
      return await tenantMiddleware(request)
    }

    return sessionResponse
  } catch (error) {
    console.error('Middleware error:', error)

    // Fallback to normal routing on error
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
