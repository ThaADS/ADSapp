/**
 * Secure Logger Utility
 * Phase 2.4: Sanitized logging to prevent PII exposure
 *
 * Features:
 * - Automatic PII/sensitive data redaction
 * - Structured logging format
 * - Environment-aware verbosity
 * - Security event tracking
 */

// Sensitive keys that should be redacted
const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'bearer',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'session',
  'cookie',
  'credential',
  'private',
  // PII fields
  'ssn',
  'social_security',
  'credit_card',
  'card_number',
  'cvv',
  'pin',
  // Partial PII (will be masked, not fully redacted)
  'email',
  'phone',
  'phone_number',
  'address',
  'ip_address',
]

// Keys that should be partially masked (show first/last chars)
const MASK_KEYS = ['email', 'phone', 'phone_number', 'ip_address']

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'security'

interface LogContext {
  userId?: string
  organizationId?: string
  requestId?: string
  [key: string]: unknown
}

/**
 * Sanitizes an object by redacting sensitive fields
 */
function sanitize(obj: unknown, depth = 0): unknown {
  // Prevent infinite recursion
  if (depth > 10) return '[MAX_DEPTH]'

  if (obj === null || obj === undefined) return obj

  if (typeof obj === 'string') {
    // Check if string looks like a secret (long base64 or hex)
    if (obj.length > 32 && /^[A-Za-z0-9+/=_-]+$/.test(obj)) {
      return '[REDACTED_SECRET]'
    }
    return obj
  }

  if (typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item, depth + 1))
  }

  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase()

    // Check if key contains sensitive terms
    const isSensitive = SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))
    const shouldMask = MASK_KEYS.some(mk => lowerKey.includes(mk))

    if (isSensitive && !shouldMask) {
      sanitized[key] = '[REDACTED]'
    } else if (shouldMask && typeof value === 'string') {
      sanitized[key] = maskValue(value)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value, depth + 1)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Masks a value showing only first and last characters
 */
function maskValue(value: string): string {
  if (value.length <= 4) return '****'

  // For emails, show first char and domain
  if (value.includes('@')) {
    const [local, domain] = value.split('@')
    return `${local[0]}***@${domain}`
  }

  // For other values, show first 2 and last 2
  return `${value.slice(0, 2)}${'*'.repeat(Math.min(value.length - 4, 8))}${value.slice(-2)}`
}

/**
 * Formats log message with timestamp and level
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const levelUpper = level.toUpperCase().padEnd(8)

  let formatted = `[${timestamp}] ${levelUpper} ${message}`

  if (context?.requestId) {
    formatted = `[${context.requestId}] ${formatted}`
  }

  return formatted
}

/**
 * Determines if logging should occur based on environment
 */
function shouldLog(level: LogLevel): boolean {
  const nodeEnv = process.env.NODE_ENV
  const debug = process.env.DEBUG

  // Always log security events
  if (level === 'security') return true

  // Always log errors
  if (level === 'error') return true

  // In production, only log warn and above unless DEBUG is set
  if (nodeEnv === 'production' && !debug) {
    return level === 'warn'
  }

  // In development or with DEBUG, log everything
  return true
}

/**
 * Main logger object with methods for each log level
 */
export const logger = {
  /**
   * Debug level logging - only in development or with DEBUG flag
   */
  debug(message: string, data?: unknown, context?: LogContext): void {
    if (!shouldLog('debug')) return

    const sanitizedData = data ? sanitize(data) : undefined
    console.debug(
      formatMessage('debug', message, context),
      sanitizedData ? JSON.stringify(sanitizedData, null, 2) : ''
    )
  },

  /**
   * Info level logging - general operational information
   */
  info(message: string, data?: unknown, context?: LogContext): void {
    if (!shouldLog('info')) return

    const sanitizedData = data ? sanitize(data) : undefined
    console.log(
      formatMessage('info', message, context),
      sanitizedData ? JSON.stringify(sanitizedData) : ''
    )
  },

  /**
   * Warning level logging - potential issues
   */
  warn(message: string, data?: unknown, context?: LogContext): void {
    if (!shouldLog('warn')) return

    const sanitizedData = data ? sanitize(data) : undefined
    console.warn(
      formatMessage('warn', message, context),
      sanitizedData ? JSON.stringify(sanitizedData) : ''
    )
  },

  /**
   * Error level logging - errors and exceptions
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    const errorData = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        }
      : error

    const sanitizedData = errorData ? sanitize(errorData) : undefined
    console.error(
      formatMessage('error', message, context),
      sanitizedData ? JSON.stringify(sanitizedData) : ''
    )
  },

  /**
   * Security event logging - always logged, special formatting
   */
  security(event: string, data: unknown, context?: LogContext): void {
    const sanitizedData = sanitize(data)
    console.log(
      formatMessage('security', `[SECURITY_EVENT] ${event}`, context),
      JSON.stringify(sanitizedData)
    )
  },

  /**
   * Audit logging - for compliance tracking
   * This should be used alongside database audit logging
   */
  audit(
    eventType: string,
    action: string,
    data: {
      userId?: string
      organizationId?: string
      resourceType?: string
      resourceId?: string
      result: 'success' | 'failure' | 'denied'
      metadata?: unknown
    }
  ): void {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      action,
      ...data,
      metadata: data.metadata ? sanitize(data.metadata) : undefined,
    }

    console.log(
      formatMessage('security', `[AUDIT] ${eventType}:${action}`, {
        userId: data.userId,
        organizationId: data.organizationId,
      }),
      JSON.stringify(auditEntry)
    )
  },

  /**
   * API request logging
   */
  apiRequest(
    method: string,
    path: string,
    statusCode: number,
    durationMs: number,
    context?: LogContext
  ): void {
    if (!shouldLog('info')) return

    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info'
    const message = `${method} ${path} ${statusCode} ${durationMs}ms`

    if (level === 'error') {
      console.error(formatMessage('error', message, context))
    } else if (level === 'warn') {
      console.warn(formatMessage('warn', message, context))
    } else {
      console.log(formatMessage('info', message, context))
    }
  },

  /**
   * Database query logging (sanitized)
   */
  dbQuery(
    operation: string,
    table: string,
    durationMs: number,
    context?: LogContext
  ): void {
    if (!shouldLog('debug')) return

    console.debug(
      formatMessage('debug', `DB ${operation} ${table} ${durationMs}ms`, context)
    )
  },
}

/**
 * Creates a child logger with preset context
 */
export function createLogger(baseContext: LogContext) {
  return {
    debug: (message: string, data?: unknown) =>
      logger.debug(message, data, baseContext),
    info: (message: string, data?: unknown) =>
      logger.info(message, data, baseContext),
    warn: (message: string, data?: unknown) =>
      logger.warn(message, data, baseContext),
    error: (message: string, error?: unknown) =>
      logger.error(message, error, baseContext),
    security: (event: string, data: unknown) =>
      logger.security(event, data, baseContext),
  }
}

/**
 * Utility to generate request IDs
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export default logger
