/**
 * Next.js Middleware Configuration
 *
 * This middleware integrates:
 * - Tenant routing for multi-tenant domain resolution
 * - Supabase session management for authentication
 * - i18n language detection and routing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
// Tenant middleware disabled temporarily - re-enable when tenant_domains is set up
// import { createTenantMiddleware } from './src/middleware/tenant-routing'

// i18n configuration inline to avoid import issues
const LOCALE_COOKIE = 'NEXT_LOCALE'
const SUPPORTED_LOCALES = ['nl', 'en'] as const
type Locale = 'nl' | 'en'

/**
 * Detect locale from Accept-Language header
 * Returns 'nl' for Dutch browsers, 'en' for all others
 */
function detectLocale(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return 'en'

  const languages = acceptLanguage.toLowerCase()

  // Check if Dutch is preferred
  if (languages.startsWith('nl') || languages.includes(',nl') || languages.includes(';nl')) {
    return 'nl'
  }

  return 'en'
}

function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale)
}

// Environment variables (fail gracefully if not set during build)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Tenant middleware disabled temporarily - uncomment when tenant_domains table is set up
// const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
// const mainDomain = process.env.NODE_ENV === 'production'
//   ? process.env.NEXT_PUBLIC_APP_DOMAIN || 'adsapp.nl' : 'localhost'
// const tenantMiddleware = supabaseUrl && supabaseServiceKey
//   ? createTenantMiddleware({ supabaseUrl, supabaseKey: supabaseServiceKey, mainDomain })
//   : null

// Type for session result including user info
interface SessionResult {
  response: NextResponse
  user: { id: string } | null
  supabase: ReturnType<typeof createServerClient> | null
}

// Supabase session handler
async function updateSession(request: NextRequest): Promise<SessionResult> {
  let supabaseResponse = NextResponse.next({ request })

  if (!supabaseUrl || !supabaseAnonKey) {
    return { response: supabaseResponse, user: null, supabase: null }
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
    return { response: NextResponse.redirect(url), user: null, supabase: null }
  }

  return { response: supabaseResponse, user, supabase }
}

/**
 * Detect and set the user's preferred locale
 * Priority: 1. Cookie (user preference) 2. Browser Accept-Language 3. Default (nl)
 */
function getLocale(request: NextRequest): Locale {
  // Check for existing locale cookie (user's explicit choice)
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale
  }

  // Detect from browser's Accept-Language header
  const acceptLanguage = request.headers.get('accept-language')
  return detectLocale(acceptLanguage)
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
    const { response: sessionResponse, user, supabase } = await updateSession(request)

    // If session handler returned a redirect, return it
    if (sessionResponse.status === 307 || sessionResponse.status === 308) {
      return sessionResponse
    }

    // Detect and set locale (safe, non-blocking)
    try {
      let locale: Locale = getLocale(request) // Default to existing cookie/browser logic

      // For authenticated users, check database preference first
      if (user && supabase) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_language')
            .eq('id', user.id)
            .single()

          if (profile?.preferred_language && isValidLocale(profile.preferred_language)) {
            locale = profile.preferred_language as Locale
          }
        } catch (profileError) {
          // Profile lookup failed, use cookie/browser fallback
          console.warn('Profile locale lookup failed:', profileError)
        }
      }

      // Set locale cookie (always, to keep it in sync with DB preference)
      sessionResponse.cookies.set(LOCALE_COOKIE, locale, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        sameSite: 'lax',
      })

      // Add locale header for server components to access
      sessionResponse.headers.set('x-locale', locale)
    } catch (localeError) {
      // Locale detection failed, continue without it
      console.warn('Locale detection failed:', localeError)
    }

    // Skip tenant routing for now to avoid redirect issues
    // TODO: Re-enable when tenant_domains table is properly set up
    // if (tenantMiddleware) {
    //   return await tenantMiddleware(request)
    // }

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
