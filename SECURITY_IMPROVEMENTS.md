# 🛡️ Security Improvements Implementation Guide

**Priority:** High
**Target Completion:** Before Production Launch
**Estimated Time:** 6 hours total

---

## Critical: SVG Sanitization (2 hours)

### Why It's Important

SVG files can contain JavaScript and other executable content that poses XSS risks. Currently, the logo upload accepts SVG files without sanitization.

### Implementation

**Step 1: Install Dependencies**

```bash
npm install isomorphic-dompurify
npm install @types/dompurify --save-dev
```

**Step 2: Update Logo Upload Handler**
File: `src/app/api/organizations/logo/route.ts`

```typescript
import DOMPurify from 'isomorphic-dompurify'

export async function POST(request: NextRequest) {
  // ... existing code ...

  // After file validation, before upload
  if (file.type === 'image/svg+xml') {
    // Read SVG content
    const svgContent = await file.text()

    // Sanitize SVG
    const cleanSVG = DOMPurify.sanitize(svgContent, {
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_TAGS: ['use'], // Allow common SVG tags
      FORBID_TAGS: ['script', 'style'], // Block dangerous tags
      FORBID_ATTR: ['onerror', 'onload'], // Block event handlers
    })

    // Create new File from sanitized content
    const sanitizedBlob = new Blob([cleanSVG], { type: 'image/svg+xml' })
    const buffer = Buffer.from(await sanitizedBlob.arrayBuffer())

    // Upload sanitized version
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('organization-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })
  } else {
    // For non-SVG files, proceed as normal
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('organization-logos')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      })
  }

  // ... rest of code ...
}
```

**Step 3: Test**

```bash
# Create test SVG with script tag
cat > test-xss.svg <<EOF
<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg">
  <script>alert('XSS')</script>
  <rect width="100" height="100" fill="red"/>
</svg>
EOF

# Upload via UI - should be sanitized
# Verify script tag is removed from stored file
```

---

## High Priority: Security Headers (1 hour)

### Why It's Important

Security headers provide defense-in-depth protection against XSS, clickjacking, and other attacks.

### Implementation

**File:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
              "frame-ancestors 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ]
  },

  // ... rest of config
}

module.exports = nextConfig
```

**Test:**

```bash
# Rebuild and test
npm run build
npm run start

# Check headers
curl -I http://localhost:3000

# Should see:
# Strict-Transport-Security: max-age=63072000
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# Content-Security-Policy: default-src 'self'; ...
```

---

## Medium Priority: Rate Limiting (3 hours)

### Why It's Important

Prevents API abuse, brute force attacks, and DoS attempts.

### Implementation

**Step 1: Install Dependencies**

```bash
npm install @upstash/ratelimit @upstash/redis
```

**Step 2: Set Up Upstash Redis** (Free tier available)

1. Sign up at https://upstash.com
2. Create Redis database
3. Add to `.env.local`:

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

**Step 3: Create Rate Limiter Utility**

**File:** `src/lib/rate-limit.ts`

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Create Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Create rate limiter
export const rateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests per 10 seconds
  analytics: true,
  prefix: '@adsapp/ratelimit',
})

// Strict rate limiter for sensitive endpoints
export const strictRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '60 s'), // 3 requests per minute
  analytics: true,
  prefix: '@adsapp/ratelimit/strict',
})

// Helper function to apply rate limiting
export async function applyRateLimit(
  identifier: string,
  limiter = rateLimiter
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const result = await limiter.limit(identifier)

  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}
```

**Step 4: Apply to API Routes**

**Example for Logo Upload:**

```typescript
import { applyRateLimit, strictRateLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting (3 uploads per minute)
    const rateLimitResult = await applyRateLimit(user.id, strictRateLimiter)

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: new Date(rateLimitResult.reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          },
        }
      )
    }

    // ... rest of upload logic ...
  } catch (error) {
    // ... error handling ...
  }
}
```

**Step 5: Apply to Other Endpoints**

Apply rate limiting to:

- `/api/organizations/business-hours` (10 req/min)
- `/api/organizations/logo` (3 req/min - already done)
- `/api/integrations/status` (20 req/min)
- `/api/auth/*` (5 req/min - strict)

**Test:**

```bash
# Test rate limiting
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/organizations/logo
  sleep 0.5
done

# Should see 429 after hitting limit
```

---

## Optional: File Signature Validation (1 hour)

### Why It's Important

Prevents MIME type spoofing - ensures uploaded files are actually images.

### Implementation

**Step 1: Install Dependency**

```bash
npm install file-type
```

**Step 2: Add Validation**

**File:** `src/app/api/organizations/logo/route.ts`

```typescript
import { fileTypeFromBuffer } from 'file-type'

export async function POST(request: NextRequest) {
  // ... existing code ...

  // After file type check, before upload
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Verify actual file type
  const detectedType = await fileTypeFromBuffer(buffer)

  if (!detectedType) {
    return NextResponse.json({ error: 'Could not determine file type' }, { status: 400 })
  }

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowedMimeTypes.includes(detectedType.mime)) {
    return NextResponse.json(
      {
        error: 'Invalid file type detected',
        expected: allowedMimeTypes,
        detected: detectedType.mime,
      },
      { status: 400 }
    )
  }

  // Proceed with upload
  // ... upload logic ...
}
```

---

## Testing Checklist

After implementing all security improvements:

### SVG Sanitization

- [ ] Upload SVG with `<script>` tag - should be removed
- [ ] Upload SVG with `onerror` attribute - should be removed
- [ ] Upload valid SVG - should work normally
- [ ] Check stored file has no dangerous content

### Security Headers

- [ ] Check all headers present in response
- [ ] Verify CSP doesn't block legitimate resources
- [ ] Test iframe embedding (should be blocked)
- [ ] Verify HSTS header on HTTPS

### Rate Limiting

- [ ] Make 10 rapid requests - should hit limit
- [ ] Wait for reset - should work again
- [ ] Check rate limit headers in response
- [ ] Verify different users have separate limits

### File Signature

- [ ] Rename .txt to .png and upload - should be rejected
- [ ] Upload valid images - should work
- [ ] Check error messages are helpful

---

## Deployment Checklist

Before deploying to production:

- [ ] All security improvements implemented
- [ ] Security tests pass
- [ ] Environment variables configured
- [ ] Rate limiting tested in staging
- [ ] CSP headers tested with real app
- [ ] SVG sanitization verified
- [ ] File signature validation working
- [ ] Security audit passed
- [ ] Documentation updated

---

## Monitoring & Maintenance

### Set Up Alerts

```typescript
// Example: Alert on repeated rate limit hits
if (rateLimitHits > 100) {
  await sendSecurityAlert({
    type: 'rate_limit_abuse',
    user: user.id,
    count: rateLimitHits,
  })
}
```

### Regular Reviews

- Monthly: Review rate limit logs for abuse patterns
- Quarterly: Update dependencies for security patches
- Annually: Full security audit

### Incident Response

1. Detect: Monitor logs for anomalies
2. Respond: Block abusive IPs/users
3. Recover: Restore service if needed
4. Learn: Update security measures

---

## Additional Recommendations

### Future Enhancements

1. **Virus Scanning** (Low Priority)
   - Use ClamAV or cloud service
   - Scan all uploaded files
   - Quarantine suspicious files

2. **Advanced Threat Detection**
   - Implement behavior analysis
   - Detect brute force attempts
   - Monitor for SQL injection attempts

3. **Security Monitoring Dashboard**
   - Track failed login attempts
   - Monitor rate limit violations
   - Alert on suspicious patterns

4. **Automated Security Testing**
   - Integrate Snyk for dependency scanning
   - Use OWASP ZAP for penetration testing
   - Regular vulnerability assessments

---

**Total Implementation Time:** ~6 hours
**Security Impact:** High
**Production Readiness:** After implementation

**Next Steps:**

1. Implement SVG sanitization (Critical - 2 hours)
2. Add security headers (High - 1 hour)
3. Set up rate limiting (Medium - 3 hours)
4. Test all improvements (1 hour)
5. Deploy to production

---

**Last Updated:** 2025-10-20
**Review Date:** 2025-11-20
