import { createServerClient } from '@supabase/ssr'
import { requireEnvVar } from '@/lib/build-safe-init'

export async function createClient() {

  // Dynamic import to avoid issues with client-side usage
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createServerClient(
    requireEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnvVar('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}