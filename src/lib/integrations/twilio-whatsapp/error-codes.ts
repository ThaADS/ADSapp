/**
 * Twilio WhatsApp Error Codes
 * Purpose: Map Twilio error codes to user-friendly messages
 * Phase: 23 - Status & Delivery
 * Date: 2026-02-03
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { TwilioErrorInfo, TwilioErrorCodeRow } from '@/types/twilio-whatsapp'

// =============================================================================
// In-Memory Error Code Cache
// =============================================================================

// Cache error codes in memory to avoid DB lookups
let errorCodeCache: Map<string, TwilioErrorInfo> | null = null
let cacheLoadedAt: number = 0
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

/**
 * Static fallback error codes when DB is unavailable
 */
const FALLBACK_ERROR_CODES: Record<string, TwilioErrorInfo> = {
  '63001': {
    code: '63001',
    message: 'Invalid destination number',
    userMessage: 'The recipient phone number is invalid or not registered on WhatsApp.',
    retryable: false,
    retryAfterSeconds: null,
    category: 'invalid_number',
  },
  '63003': {
    code: '63003',
    message: 'Rate limit exceeded',
    userMessage: 'Too many messages sent. Please wait a moment and try again.',
    retryable: true,
    retryAfterSeconds: 60,
    category: 'rate_limit',
  },
  '63007': {
    code: '63007',
    message: 'WhatsApp policy violation',
    userMessage: 'This message violates WhatsApp\'s messaging policy.',
    retryable: false,
    retryAfterSeconds: null,
    category: 'policy',
  },
  '63016': {
    code: '63016',
    message: 'Message content policy violation',
    userMessage: 'The message content violates WhatsApp\'s content policy.',
    retryable: false,
    retryAfterSeconds: null,
    category: 'policy',
  },
  '63024': {
    code: '63024',
    message: 'Session window expired',
    userMessage: 'The 24-hour messaging window has expired. Use a template message instead.',
    retryable: false,
    retryAfterSeconds: null,
    category: 'policy',
  },
  '63025': {
    code: '63025',
    message: 'Recipient has opted out',
    userMessage: 'The recipient has opted out of receiving messages.',
    retryable: false,
    retryAfterSeconds: null,
    category: 'policy',
  },
  '30003': {
    code: '30003',
    message: 'Unreachable destination handset',
    userMessage: 'The recipient\'s phone is unreachable. They may have their phone off.',
    retryable: true,
    retryAfterSeconds: 300,
    category: 'network',
  },
  '30005': {
    code: '30005',
    message: 'Unknown destination handset',
    userMessage: 'The recipient\'s phone number could not be found.',
    retryable: false,
    retryAfterSeconds: null,
    category: 'invalid_number',
  },
  '30006': {
    code: '30006',
    message: 'Landline or unreachable carrier',
    userMessage: 'This number appears to be a landline or is not reachable.',
    retryable: false,
    retryAfterSeconds: null,
    category: 'invalid_number',
  },
  '30007': {
    code: '30007',
    message: 'Carrier violation',
    userMessage: 'The message was blocked by the carrier.',
    retryable: false,
    retryAfterSeconds: null,
    category: 'policy',
  },
  '30008': {
    code: '30008',
    message: 'Unknown error',
    userMessage: 'An unknown error occurred. Please try again.',
    retryable: true,
    retryAfterSeconds: 30,
    category: 'unknown',
  },
  '21211': {
    code: '21211',
    message: 'Invalid phone number format',
    userMessage: 'The phone number format is invalid.',
    retryable: false,
    retryAfterSeconds: null,
    category: 'invalid_number',
  },
  '21610': {
    code: '21610',
    message: 'Message body required',
    userMessage: 'The message must contain text or media content.',
    retryable: false,
    retryAfterSeconds: null,
    category: 'policy',
  },
  '21612': {
    code: '21612',
    message: 'Body exceeds 1600 chars',
    userMessage: 'The message is too long. Maximum 1600 characters allowed.',
    retryable: false,
    retryAfterSeconds: null,
    category: 'policy',
  },
}

/**
 * Default error info for unknown codes
 */
const DEFAULT_ERROR_INFO: TwilioErrorInfo = {
  code: 'unknown',
  message: 'Unknown error',
  userMessage: 'An unexpected error occurred. Please try again or contact support.',
  retryable: true,
  retryAfterSeconds: 30,
  category: 'unknown',
}

// =============================================================================
// Error Code Lookup Functions
// =============================================================================

/**
 * Load error codes from database into cache
 */
async function loadErrorCodesFromDb(): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('twilio_error_codes')
      .select('*')

    if (error) {
      console.error('Failed to load error codes from DB:', error)
      return
    }

    if (data && data.length > 0) {
      errorCodeCache = new Map()
      for (const row of data as TwilioErrorCodeRow[]) {
        errorCodeCache.set(row.code, {
          code: row.code,
          message: row.message,
          userMessage: row.user_message,
          retryable: row.retryable,
          retryAfterSeconds: row.retry_after_seconds,
          category: row.category as TwilioErrorInfo['category'],
        })
      }
      cacheLoadedAt = Date.now()
    }
  } catch (error) {
    console.error('Error loading error codes:', error)
  }
}

/**
 * Check if cache needs refresh
 */
function isCacheStale(): boolean {
  return !errorCodeCache || (Date.now() - cacheLoadedAt) > CACHE_TTL_MS
}

/**
 * Get error info for a Twilio error code
 */
export async function getErrorInfo(errorCode: string): Promise<TwilioErrorInfo> {
  // Refresh cache if stale
  if (isCacheStale()) {
    await loadErrorCodesFromDb()
  }

  // Try cache first
  if (errorCodeCache?.has(errorCode)) {
    return errorCodeCache.get(errorCode)!
  }

  // Fall back to static codes
  if (FALLBACK_ERROR_CODES[errorCode]) {
    return FALLBACK_ERROR_CODES[errorCode]
  }

  // Return default for unknown codes
  return { ...DEFAULT_ERROR_INFO, code: errorCode }
}

/**
 * Synchronous version using only fallback codes (for immediate use)
 */
export function getErrorInfoSync(errorCode: string): TwilioErrorInfo {
  // Try cache if available
  if (errorCodeCache?.has(errorCode)) {
    return errorCodeCache.get(errorCode)!
  }

  // Fall back to static codes
  if (FALLBACK_ERROR_CODES[errorCode]) {
    return FALLBACK_ERROR_CODES[errorCode]
  }

  // Return default for unknown codes
  return { ...DEFAULT_ERROR_INFO, code: errorCode }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(errorCode: string): boolean {
  const info = getErrorInfoSync(errorCode)
  return info.retryable
}

/**
 * Get retry delay in seconds for an error
 */
export function getRetryDelay(errorCode: string): number {
  const info = getErrorInfoSync(errorCode)
  return info.retryAfterSeconds || 30
}

/**
 * Get user-friendly error message
 */
export function getUserErrorMessage(errorCode: string): string {
  const info = getErrorInfoSync(errorCode)
  return info.userMessage
}

/**
 * Get error category
 */
export function getErrorCategory(errorCode: string): TwilioErrorInfo['category'] {
  const info = getErrorInfoSync(errorCode)
  return info.category
}

// =============================================================================
// Preload cache on module load
// =============================================================================

// Trigger initial cache load (non-blocking)
loadErrorCodesFromDb().catch(console.error)
