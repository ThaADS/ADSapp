import { NextRequest, NextResponse } from 'next/server'
import { createRateLimit, ddosProtection } from './rate-limit'
import { hasSqlInjection, hasXss } from './validation'

export interface SecurityOptions {
  enableDdosProtection?: boolean
  enableInputValidation?: boolean
  enableRequestLogging?: boolean
  enableIpWhitelisting?: boolean
  allowedIps?: string[]
  blockedIps?: string[]
  maxRequestSize?: number
}

const defaultOptions: SecurityOptions = {
  enableDdosProtection: true,
  enableInputValidation: true,
  enableRequestLogging: true,
  enableIpWhitelisting: false,
  allowedIps: [],
  blockedIps: [],
  maxRequestSize: 10 * 1024 * 1024, // 10MB
}

export class SecurityMiddleware {
  private options: SecurityOptions

  constructor(options: Partial<SecurityOptions> = {}) {
    this.options = { ...defaultOptions, ...options }
  }

  async handle(request: NextRequest): Promise<NextResponse | null> {
    try {
      // 1. Check request size
      const sizeCheck = this.checkRequestSize(request)
      if (sizeCheck) return sizeCheck

      // 2. IP-based security checks
      const ipCheck = this.checkIpSecurity(request)
      if (ipCheck) return ipCheck

      // 3. DDoS protection
      if (this.options.enableDdosProtection) {
        const ddosCheck = await ddosProtection(request)
        if (ddosCheck) return ddosCheck
      }

      // 4. Input validation
      if (this.options.enableInputValidation) {
        const inputCheck = await this.checkInputSecurity(request)
        if (inputCheck) return inputCheck
      }

      // 5. Request logging
      if (this.options.enableRequestLogging) {
        this.logRequest(request)
      }

      return null // Continue to next middleware
    } catch (error) {
      console.error('Security middleware error:', error)
      return NextResponse.json(
        { error: 'Security check failed' },
        { status: 500 }
      )
    }
  }

  private checkRequestSize(request: NextRequest): NextResponse | null {
    const contentLength = request.headers.get('content-length')
    if (contentLength) {
      const size = parseInt(contentLength, 10)
      if (size > (this.options.maxRequestSize || defaultOptions.maxRequestSize!)) {
        return NextResponse.json(
          { error: 'Request too large' },
          { status: 413 }
        )
      }
    }
    return null
  }

  private checkIpSecurity(request: NextRequest): NextResponse | null {
    const ip = this.getClientIp(request)

    // Check blocked IPs
    if (this.options.blockedIps?.includes(ip)) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check whitelist if enabled
    if (this.options.enableIpWhitelisting && this.options.allowedIps?.length) {
      if (!this.options.allowedIps.includes(ip)) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    return null
  }

  private async checkInputSecurity(request: NextRequest): Promise<NextResponse | null> {
    try {
      // Check URL for malicious patterns
      if (this.hasMaliciousUrl(request.url)) {
        this.logSecurityEvent('malicious_url', request, { url: request.url })
        return NextResponse.json(
          { error: 'Invalid request' },
          { status: 400 }
        )
      }

      // Check headers for malicious content
      const maliciousHeader = this.checkMaliciousHeaders(request)
      if (maliciousHeader) {
        this.logSecurityEvent('malicious_header', request, { header: maliciousHeader })
        return NextResponse.json(
          { error: 'Invalid request headers' },
          { status: 400 }
        )
      }

      // Check request body for malicious content
      if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
        const bodyCheck = await this.checkRequestBody(request)
        if (bodyCheck) return bodyCheck
      }

      return null
    } catch (error) {
      console.error('Input validation error:', error)
      return null // Allow request to proceed on validation errors
    }
  }

  private hasMaliciousUrl(url: string): boolean {
    const maliciousPatterns = [
      // Path traversal
      /\.\.\//g,
      /\.\.\\\\/g,
      /%2e%2e%2f/gi,
      /%2e%2e%5c/gi,

      // SQL injection in URL
      /union.*select/gi,
      /select.*from/gi,
      /insert.*into/gi,
      /delete.*from/gi,
      /drop.*table/gi,

      // XSS in URL
      /<script/gi,
      /javascript:/gi,
      /on\w+=/gi,

      // Command injection
      /;.*cat/gi,
      /;.*ls/gi,
      /;.*curl/gi,
      /;.*wget/gi,
    ]

    return maliciousPatterns.some(pattern => pattern.test(url))
  }

  private checkMaliciousHeaders(request: NextRequest): string | null {
    const dangerousHeaders = [
      'x-forwarded-host',
      'x-original-url',
      'x-rewrite-url',
    ]

    for (const header of dangerousHeaders) {
      const value = request.headers.get(header)
      if (value && (hasSqlInjection(value) || hasXss(value))) {
        return header
      }
    }

    return null
  }

  private async checkRequestBody(request: NextRequest): Promise<NextResponse | null> {
    try {
      const contentType = request.headers.get('content-type')

      if (contentType?.includes('application/json')) {
        // Clone request to avoid consuming the body
        const clonedRequest = request.clone()
        const text = await clonedRequest.text()

        if (text.length > 0) {
          // Check for malicious JSON content
          if (hasSqlInjection(text) || hasXss(text)) {
            this.logSecurityEvent('malicious_json_body', request, {
              contentLength: text.length,
              sample: text.substring(0, 100)
            })
            return NextResponse.json(
              { error: 'Invalid request content' },
              { status: 400 }
            )
          }

          // Check for suspicious patterns in JSON
          const suspiciousPatterns = [
            /__proto__/g,
            /constructor/g,
            /prototype/g,
            /eval\(/g,
            /function\(/g,
          ]

          if (suspiciousPatterns.some(pattern => pattern.test(text))) {
            this.logSecurityEvent('suspicious_json_content', request)
            return NextResponse.json(
              { error: 'Invalid request content' },
              { status: 400 }
            )
          }
        }
      }

      return null
    } catch (error) {
      // If we can't parse the body, log but don't block
      console.warn('Failed to check request body:', error)
      return null
    }
  }

  private getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const cfConnectingIp = request.headers.get('cf-connecting-ip')

    return cfConnectingIp || forwarded?.split(',')[0] || realIp || 'unknown'
  }

  private logRequest(request: NextRequest): void {
    const logData = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      ip: this.getClientIp(request),
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      contentLength: request.headers.get('content-length'),
    }

    // In production, send to logging service
    if (process.env.NODE_ENV === 'production') {
      // Send to your logging service (Datadog, CloudWatch, etc.)
      this.sendToLoggingService('request', logData)
    } else {
      console.log('Request:', logData)
    }
  }

  private logSecurityEvent(
    eventType: string,
    request: NextRequest,
    additionalData?: any
  ): void {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      type: eventType,
      ip: this.getClientIp(request),
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      ...additionalData,
    }

    // Always log security events
    console.warn('Security Event:', securityEvent)

    // Send to security monitoring service
    this.sendToSecurityService(securityEvent)
  }

  private async sendToLoggingService(type: string, data: any): Promise<void> {
    try {
      // Send to external logging service
      if (process.env.LOGGING_ENDPOINT) {
        await fetch(process.env.LOGGING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.LOGGING_API_KEY}`,
          },
          body: JSON.stringify({ type, data }),
        })
      }
    } catch (error) {
      console.error('Failed to send log:', error)
    }
  }

  private async sendToSecurityService(event: any): Promise<void> {
    try {
      // Send to security monitoring service
      if (process.env.SECURITY_ENDPOINT) {
        await fetch(process.env.SECURITY_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.SECURITY_API_KEY}`,
          },
          body: JSON.stringify(event),
        })
      }

      // Also send to Sentry for critical events
      if (typeof window === 'undefined') {
        const Sentry = await import('@sentry/nextjs')
        Sentry.addBreadcrumb({
          message: `Security event: ${event.type}`,
          level: 'warning',
          data: event,
        })
      }
    } catch (error) {
      console.error('Failed to send security event:', error)
    }
  }
}

// Pre-configured security middleware instances
export const defaultSecurityMiddleware = new SecurityMiddleware()

export const strictSecurityMiddleware = new SecurityMiddleware({
  enableDdosProtection: true,
  enableInputValidation: true,
  enableRequestLogging: true,
  maxRequestSize: 1 * 1024 * 1024, // 1MB
})

export const apiSecurityMiddleware = new SecurityMiddleware({
  enableDdosProtection: true,
  enableInputValidation: true,
  enableRequestLogging: true,
  maxRequestSize: 5 * 1024 * 1024, // 5MB
})

// Helper function to apply security middleware
export async function withSecurity(
  request: NextRequest,
  options?: Partial<SecurityOptions>
): Promise<NextResponse | null> {
  const middleware = new SecurityMiddleware(options)
  return middleware.handle(request)
}

// CSRF Protection
export function generateCsrfToken(): string {
  return crypto.randomUUID()
}

export function validateCsrfToken(token: string, expectedToken: string): boolean {
  return token === expectedToken
}

// Secure random string generation
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const randomArray = new Uint8Array(length)
  crypto.getRandomValues(randomArray)

  for (let i = 0; i < length; i++) {
    result += chars.charAt(randomArray[i] % chars.length)
  }

  return result
}