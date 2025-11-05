/**
 * Build-safe initialization utilities
 * Prevents services from being initialized during build time when environment variables may not be available
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


export function isBuildTime(): boolean {
  // Check if we're in a build environment
  return (
    // Next.js build process
    process.env.NEXT_PHASE === 'phase-production-build' ||
    // Vercel build environment without runtime secrets
    (process.env.VERCEL === '1' && process.env.VERCEL_ENV === undefined) ||
    // Production build without essential environment variables
    (process.env.NODE_ENV === 'production' && !process.env.STRIPE_SECRET_KEY) ||
    // Manual build time flag
    process.env.NEXT_BUILD_TIME === 'true'
  )
}

export function requireEnvVar(name: string): string {
  const value = process.env[name]

  if (!value) {
    if (isBuildTime()) {
      // During build time, return a placeholder to avoid errors
      console.warn(`Environment variable ${name} not available during build time`)
      return `build-time-placeholder-${name}`
    }
    throw new Error(`Environment variable ${name} is required but not set`)
  }

  return value
}

export function createBuildSafeService<T>(
  createService: () => T,
  serviceName: string
): T {
  if (isBuildTime()) {
    // Return a proxy that throws meaningful errors during build
    return new Proxy({} as T, {
      get(target, prop) {
        throw new Error(`${serviceName} cannot be used during build time. Property: ${String(prop)}`)
      }
    })
  }

  return createService()
}

export function withBuildSafeCheck<T extends any[], R>(
  fn: (...args: T) => R,
  fallbackValue?: R
): (...args: T) => R {
  return (...args: T): R => {
    if (isBuildTime()) {
      if (fallbackValue !== undefined) {
        return fallbackValue
      }
      throw new Error('Function cannot be executed during build time')
    }
    return fn(...args)
  }
}