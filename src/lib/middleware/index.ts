import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware Function Type
 * Returns NextResponse to short-circuit, null to continue
 */
type MiddlewareFunction = (request: NextRequest) => Promise<NextResponse | null>;

/**
 * Compose Multiple Middleware Functions
 *
 * Executes middleware functions in sequence. If any middleware returns a NextResponse,
 * the chain is short-circuited and that response is returned. If all middleware
 * return null, NextResponse.next() is returned to continue the request.
 *
 * @param middlewares - Array of middleware functions to compose
 * @returns Composed middleware function
 *
 * @example
 * ```typescript
 * import { composeMiddleware, validateTenantAccess, createRateLimiter, rateLimitConfigs } from '@/lib/middleware';
 *
 * const apiMiddleware = composeMiddleware(
 *   validateTenantAccess,
 *   createRateLimiter(rateLimitConfigs.standard)
 * );
 *
 * export async function GET(request: NextRequest) {
 *   const response = await apiMiddleware(request);
 *   if (response) return response; // Error occurred in middleware
 *
 *   // Continue with API logic
 * }
 * ```
 */
export function composeMiddleware(...middlewares: MiddlewareFunction[]): MiddlewareFunction {
  return async function composedMiddleware(request: NextRequest): Promise<NextResponse | null> {
    for (const middleware of middlewares) {
      try {
        const response = await middleware(request);

        // If middleware returns a response, short-circuit the chain
        if (response && response instanceof NextResponse) {
          return response;
        }
      } catch (error) {
        console.error('[MIDDLEWARE_COMPOSITION] Error in middleware:', error);

        // Log to Sentry in production
        if (process.env.NODE_ENV === 'production') {
          try {
            const Sentry = await import('@sentry/nextjs');
            Sentry.captureException(error, {
              tags: {
                middleware: 'composition'
              }
            });
          } catch (sentryError) {
            console.error('Failed to log middleware error to Sentry:', sentryError);
          }
        }

        // Return 500 error for unexpected middleware failures
        return NextResponse.json(
          {
            error: 'Internal server error in middleware',
            code: 'MIDDLEWARE_ERROR'
          },
          { status: 500 }
        );
      }
    }

    // All middleware passed, continue request
    return null;
  };
}

/**
 * Conditional Middleware Execution
 *
 * Only executes middleware if the condition function returns true
 *
 * @param condition - Function that determines if middleware should run
 * @param middleware - Middleware to conditionally execute
 * @returns Conditional middleware function
 *
 * @example
 * ```typescript
 * // Only apply rate limiting to POST requests
 * const conditionalRateLimit = conditionalMiddleware(
 *   (req) => req.method === 'POST',
 *   createRateLimiter(rateLimitConfigs.strict)
 * );
 * ```
 */
export function conditionalMiddleware(
  condition: (request: NextRequest) => boolean,
  middleware: MiddlewareFunction
): MiddlewareFunction {
  return async function conditionalMiddleware(request: NextRequest): Promise<NextResponse | null> {
    if (condition(request)) {
      return middleware(request);
    }
    return null; // Skip middleware if condition not met
  };
}

/**
 * Middleware Pipeline with Error Handling
 *
 * Similar to composeMiddleware but with enhanced error handling and logging
 *
 * @param middlewares - Array of middleware functions
 * @returns Pipeline middleware function
 */
export function createMiddlewarePipeline(...middlewares: MiddlewareFunction[]): MiddlewareFunction {
  return async function pipelineMiddleware(request: NextRequest): Promise<NextResponse | null> {
    const startTime = Date.now();

    for (let i = 0; i < middlewares.length; i++) {
      const middleware = middlewares[i];

      try {
        const response = await middleware(request);

        if (response && response instanceof NextResponse) {
          // Log middleware execution time in development
          if (process.env.NODE_ENV === 'development') {
            console.log(`[MIDDLEWARE_PIPELINE] Middleware ${i + 1} short-circuited after ${Date.now() - startTime}ms`);
          }
          return response;
        }
      } catch (error) {
        console.error(`[MIDDLEWARE_PIPELINE] Error in middleware ${i + 1}:`, error);

        // Continue to next middleware instead of failing entire pipeline
        continue;
      }
    }

    // Log successful pipeline execution in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[MIDDLEWARE_PIPELINE] Pipeline completed in ${Date.now() - startTime}ms`);
    }

    return null;
  };
}

/**
 * Retry Middleware with Exponential Backoff
 *
 * Retries failed middleware with exponential backoff
 *
 * @param middleware - Middleware to retry
 * @param maxRetries - Maximum number of retries (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 100)
 * @returns Retry middleware function
 */
export function withRetry(
  middleware: MiddlewareFunction,
  maxRetries: number = 3,
  baseDelay: number = 100
): MiddlewareFunction {
  return async function retryMiddleware(request: NextRequest): Promise<NextResponse | null> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await middleware(request);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on last attempt
        if (attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
          console.log(`[RETRY_MIDDLEWARE] Retry attempt ${attempt + 1} after ${delay}ms`);
        }
      }
    }

    // All retries failed
    console.error('[RETRY_MIDDLEWARE] All retries failed:', lastError);

    return NextResponse.json(
      {
        error: 'Service temporarily unavailable',
        code: 'RETRY_FAILED'
      },
      { status: 503 }
    );
  };
}

// Re-export middleware components for convenience
export {
  validateTenantAccess,
  getTenantContext,
  isSuperAdmin,
  validateResourceAccess,
  createTenantScope
} from './tenant-validation';

export type { TenantContext } from './tenant-validation';

export {
  createRateLimiter,
  createIpRateLimiter,
  createUserRateLimiter,
  createOrgRateLimiter,
  rateLimitConfigs,
  RedisRateLimiter,
  combineRateLimiters
} from './rate-limit';

export type { RateLimitConfig } from './rate-limit';

/**
 * Pre-configured Middleware Compositions for Common Use Cases
 */

/**
 * Standard API Middleware
 * Applies tenant validation and standard rate limiting
 *
 * @example
 * ```typescript
 * import { standardApiMiddleware } from '@/lib/middleware';
 *
 * export async function GET(request: NextRequest) {
 *   const response = await standardApiMiddleware(request);
 *   if (response) return response;
 *
 *   // Continue with API logic
 * }
 * ```
 */
export const standardApiMiddleware = async (request: NextRequest): Promise<NextResponse | null> => {
  const { validateTenantAccess } = await import('./tenant-validation');
  const { createRateLimiter, rateLimitConfigs } = await import('./rate-limit');

  const middleware = composeMiddleware(
    validateTenantAccess,
    createRateLimiter(rateLimitConfigs.standard)
  );

  return middleware(request);
};

/**
 * Strict API Middleware
 * Applies tenant validation and strict rate limiting (for sensitive operations)
 */
export const strictApiMiddleware = async (request: NextRequest): Promise<NextResponse | null> => {
  const { validateTenantAccess } = await import('./tenant-validation');
  const { createRateLimiter, rateLimitConfigs } = await import('./rate-limit');

  const middleware = composeMiddleware(
    validateTenantAccess,
    createRateLimiter(rateLimitConfigs.strict)
  );

  return middleware(request);
};

/**
 * Public API Middleware
 * Only applies rate limiting (no tenant validation for public endpoints)
 */
export const publicApiMiddleware = async (request: NextRequest): Promise<NextResponse | null> => {
  const { createIpRateLimiter, rateLimitConfigs } = await import('./rate-limit');

  const rateLimit = createIpRateLimiter(rateLimitConfigs.relaxed);
  return rateLimit(request);
};

/**
 * Auth Middleware
 * Applies strict rate limiting for authentication endpoints
 */
export const authMiddleware = async (request: NextRequest): Promise<NextResponse | null> => {
  const { createIpRateLimiter, rateLimitConfigs } = await import('./rate-limit');

  const rateLimit = createIpRateLimiter(rateLimitConfigs.auth);
  return rateLimit(request);
};
