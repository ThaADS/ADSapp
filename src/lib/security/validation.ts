import { z } from 'zod'

// Email validation with additional security checks
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email must not exceed 254 characters')
  .refine(
    (email) => !email.includes('..'),
    'Email cannot contain consecutive dots'
  )
  .refine(
    (email) => !email.startsWith('.') && !email.endsWith('.'),
    'Email cannot start or end with a dot'
  )
  .refine(
    (email) => {
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /script/i,
        /javascript/i,
        /vbscript/i,
        /onload/i,
        /onclick/i,
        /<.*>/,
      ]
      return !suspiciousPatterns.some(pattern => pattern.test(email))
    },
    'Email contains invalid characters'
  )

// Password validation with security requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[0-9]/.test(password),
    'Password must contain at least one number'
  )
  .refine(
    (password) => /[^a-zA-Z0-9]/.test(password),
    'Password must contain at least one special character'
  )
  .refine(
    (password) => {
      // Check against common weak passwords
      const weakPasswords = [
        'password',
        '123456789',
        'qwertyuiop',
        'asdfghjkl',
        'zxcvbnm',
        'admin123',
        'password123',
      ]
      return !weakPasswords.some(weak =>
        password.toLowerCase().includes(weak.toLowerCase())
      )
    },
    'Password is too common or weak'
  )

// Name validation to prevent XSS and injection
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .refine(
    (name) => /^[a-zA-Z\s\-\.\']+$/.test(name),
    'Name can only contain letters, spaces, hyphens, dots, and apostrophes'
  )
  .refine(
    (name) => {
      // Prevent XSS patterns
      const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
      ]
      return !xssPatterns.some(pattern => pattern.test(name))
    },
    'Name contains invalid characters'
  )

// Phone number validation
export const phoneSchema = z
  .string()
  .regex(
    /^\+?[1-9]\d{1,14}$/,
    'Invalid phone number format (use international format)'
  )
  .min(10, 'Phone number must be at least 10 digits')
  .max(17, 'Phone number must not exceed 17 characters')

// Organization name validation
export const organizationNameSchema = z
  .string()
  .min(2, 'Organization name must be at least 2 characters')
  .max(100, 'Organization name must not exceed 100 characters')
  .refine(
    (name) => /^[a-zA-Z0-9\s\-\.\'&]+$/.test(name),
    'Organization name contains invalid characters'
  )
  .refine(
    (name) => {
      // Prevent XSS and injection patterns
      const maliciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+=/i,
        /sql/i,
        /union/i,
        /select/i,
        /drop/i,
        /delete/i,
        /insert/i,
        /update/i,
      ]
      return !maliciousPatterns.some(pattern => pattern.test(name))
    },
    'Organization name contains prohibited content'
  )

// URL validation for custom domains
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .refine(
    (url) => {
      try {
        const parsedUrl = new URL(url)
        // Only allow HTTPS in production
        if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
          return false
        }
        // Prevent localhost and private IPs in production
        if (process.env.NODE_ENV === 'production') {
          const hostname = parsedUrl.hostname
          if (
            hostname === 'localhost' ||
            hostname.startsWith('127.') ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.match(/^172\.(1[6-9]|2\d|3[01])\./)
          ) {
            return false
          }
        }
        return true
      } catch {
        return false
      }
    },
    'URL is not allowed or uses invalid protocol'
  )

// Generic text input validation to prevent XSS
export const sanitizedTextSchema = z
  .string()
  .max(1000, 'Text must not exceed 1000 characters')
  .refine(
    (text) => {
      // Prevent XSS patterns
      const xssPatterns = [
        /<script.*?>.*?<\/script>/gi,
        /<.*?on\w+.*?=.*?>/gi,
        /javascript:/gi,
        /vbscript:/gi,
        /<iframe.*?>/gi,
        /<object.*?>/gi,
        /<embed.*?>/gi,
        /<form.*?>/gi,
      ]
      return !xssPatterns.some(pattern => pattern.test(text))
    },
    'Text contains potentially harmful content'
  )
  .transform((text) => {
    // Basic HTML entity encoding for safety
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  })

// Pagination validation
export const paginationSchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, 'Page must be a positive number')
    .transform(Number)
    .refine(n => n >= 1, 'Page must be at least 1')
    .refine(n => n <= 10000, 'Page number too large'),
  limit: z
    .string()
    .regex(/^\d+$/, 'Limit must be a positive number')
    .transform(Number)
    .refine(n => n >= 1, 'Limit must be at least 1')
    .refine(n => n <= 100, 'Limit cannot exceed 100'),
})

// File upload validation
export const fileUploadSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .refine(
      (filename) => {
        // Check for path traversal attempts
        return !filename.includes('..') && !filename.includes('/')
      },
      'Invalid filename'
    )
    .refine(
      (filename) => {
        // Allow only safe file extensions
        const allowedExtensions = [
          '.jpg', '.jpeg', '.png', '.gif', '.webp',
          '.pdf', '.doc', '.docx', '.txt', '.csv'
        ]
        return allowedExtensions.some(ext =>
          filename.toLowerCase().endsWith(ext)
        )
      },
      'File type not allowed'
    ),
  size: z
    .number()
    .min(1, 'File cannot be empty')
    .max(10 * 1024 * 1024, 'File size cannot exceed 10MB'),
  mimeType: z
    .string()
    .refine(
      (mimeType) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain',
          'text/csv',
        ]
        return allowedMimeTypes.includes(mimeType)
      },
      'File type not allowed'
    ),
})

// Auth schemas
export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  full_name: nameSchema,
  organization_name: organizationNameSchema.optional(),
})

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const resetPasswordSchema = z.object({
  email: emailSchema,
})

export const updatePasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
})

// Profile update schema
export const updateProfileSchema = z.object({
  full_name: nameSchema.optional(),
  phone: phoneSchema.optional(),
})

// Organization update schema
export const updateOrganizationSchema = z.object({
  name: organizationNameSchema.optional(),
  domain: urlSchema.optional(),
})

// Validation helper functions
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean
  data?: T
  error?: string
} {
  try {
    const validated = schema.parse(data)
    return { success: true, data: validated }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0]
      return {
        success: false,
        error: firstError.message
      }
    }
    return {
      success: false,
      error: 'Validation failed'
    }
  }
}

// Sanitize user input
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Check for SQL injection patterns
export function hasSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(;|\-\-|\#|\/\*|\*\/)/g,
    /(\bOR\b|\bAND\b).*?(\b\d+\b.*?=.*?\b\d+\b)/gi,
    /(\'\s*(OR|AND)\s*\'\w*?\'\s*=\s*\'\w*?\')/gi,
  ]

  return sqlPatterns.some(pattern => pattern.test(input))
}

// Check for XSS patterns
export function hasXss(input: string): boolean {
  const xssPatterns = [
    /<script.*?>.*?<\/script>/gi,
    /<.*?on\w+.*?=.*?>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /<iframe.*?>/gi,
    /<object.*?>/gi,
    /<embed.*?>/gi,
  ]

  return xssPatterns.some(pattern => pattern.test(input))
}

// Validate and sanitize all object properties
export function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}