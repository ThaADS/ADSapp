/**
 * Next.js Middleware Configuration
 *
 * This middleware integrates the tenant routing system with Next.js
 * to handle multi-tenant domain resolution and request routing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTenantMiddleware } from './src/middleware/tenant-routing';

// Debug environment variables
console.log('🔍 Middleware Environment Debug:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_APP_DOMAIN:', process.env.NEXT_PUBLIC_APP_DOMAIN || 'Using default: adsapp.com');

// Fallback values for development (temporary fix)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://egaiyydjgeqlhthxmvbn.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnYWl5eWRqZ2VxbGh0aHhtdmJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODgzMzg2NCwiZXhwIjoyMDc0NDA5ODY0fQ.lShvQ---Poi9yQCzUzpVKWmfQtSkFY83W4VauXEIjxE';

// Use localhost for development, adsapp.nl for production
const mainDomain = process.env.NODE_ENV === 'production' 
  ? (process.env.NEXT_PUBLIC_APP_DOMAIN || 'adsapp.nl')
  : 'localhost';

console.log('🔧 Using values:', { 
  url: supabaseUrl ? '✅ Set' : '❌ Missing', 
  key: supabaseKey ? '✅ Set' : '❌ Missing',
  domain: mainDomain,
  environment: process.env.NODE_ENV || 'development'
});

// Create the tenant middleware instance
const tenantMiddleware = createTenantMiddleware({
  supabaseUrl,
  supabaseKey,
  mainDomain,
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and API routes that don't need tenant context
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/health') ||
    pathname.startsWith('/api/auth') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Skip middleware for admin routes (they use different logic)
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }

  try {
    // Apply tenant routing middleware
    return await tenantMiddleware(request);
  } catch (error) {
    console.error('Middleware error:', error);

    // Fallback to normal routing on error
    return NextResponse.next();
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
};