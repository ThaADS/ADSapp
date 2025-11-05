/**
 * Organization Settings Validation Schemas
 *
 * Comprehensive Zod schemas for validating organization settings API requests
 * Includes security checks, XSS prevention, and business rule validation
 */

import { z } from 'zod';
import { organizationNameSchema, urlSchema } from '@/lib/security/validation';

// Timezone validation - IANA timezone database
export const timezoneSchema = z
  .string()
  .refine(
    (tz) => {
      // Validate IANA timezone format
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid timezone. Must be a valid IANA timezone identifier (e.g., America/New_York)' }
  );

// Language/locale validation - ISO 639-1 with optional region
export const localeSchema = z
  .string()
  .regex(
    /^[a-z]{2}(-[A-Z]{2})?$/,
    'Invalid locale format. Use ISO 639-1 format (e.g., en, en-US, pt-BR)'
  )
  .refine(
    (locale) => {
      const supportedLocales = [
        'en', 'en-US', 'en-GB', 'pt', 'pt-BR', 'es', 'es-ES', 'es-MX',
        'fr', 'fr-FR', 'de', 'de-DE', 'it', 'it-IT', 'nl', 'nl-NL'
      ];
      return supportedLocales.some(supported =>
        locale.toLowerCase().startsWith(supported.toLowerCase())
      );
    },
    { message: 'Locale not supported' }
  );

// Subdomain validation - lowercase alphanumeric with hyphens
export const subdomainSchema = z
  .string()
  .min(3, 'Subdomain must be at least 3 characters')
  .max(63, 'Subdomain must not exceed 63 characters')
  .regex(
    /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
    'Subdomain must contain only lowercase letters, numbers, and hyphens (cannot start or end with hyphen)'
  )
  .refine(
    (subdomain) => {
      // Reserved subdomains
      const reserved = [
        'api', 'www', 'admin', 'app', 'dashboard', 'help', 'support',
        'blog', 'mail', 'smtp', 'ftp', 'cdn', 'static', 'assets'
      ];
      return !reserved.includes(subdomain.toLowerCase());
    },
    { message: 'Subdomain is reserved and cannot be used' }
  );

// Color validation - hex color codes
export const colorSchema = z
  .string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format. Use hex color code (e.g., #FF5733)');

// Business hours schema - day-based configuration
export const businessHoursSchema = z.record(
  z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  z.object({
    enabled: z.boolean(),
    open: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM (24-hour)'),
    close: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Use HH:MM (24-hour)'),
  }).refine(
    (hours) => {
      if (!hours.enabled) return true;
      const [openHour, openMin] = hours.open.split(':').map(Number);
      const [closeHour, closeMin] = hours.close.split(':').map(Number);
      const openMinutes = openHour * 60 + openMin;
      const closeMinutes = closeHour * 60 + closeMin;
      return closeMinutes > openMinutes;
    },
    { message: 'Closing time must be after opening time' }
  )
);

// Organization general settings schema
export const updateOrganizationGeneralSchema = z.object({
  name: organizationNameSchema.optional(),
  subdomain: subdomainSchema.optional(),
  timezone: timezoneSchema.optional(),
  locale: localeSchema.optional(),
  business_hours: businessHoursSchema.optional(),
  whatsapp_business_account_id: z
    .string()
    .regex(/^\d{15,20}$/, 'Invalid WhatsApp Business Account ID')
    .optional()
    .nullable(),
  whatsapp_phone_number_id: z
    .string()
    .regex(/^\d{15,20}$/, 'Invalid WhatsApp Phone Number ID')
    .optional()
    .nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);

// Organization branding schema
export const updateOrganizationBrandingSchema = z.object({
  logo_url: urlSchema.optional().nullable(),
  primary_color: colorSchema.optional().nullable(),
  secondary_color: colorSchema.optional().nullable(),
  accent_color: colorSchema.optional().nullable(),
  custom_css: z
    .string()
    .max(50000, 'Custom CSS must not exceed 50KB')
    .refine(
      (css) => {
        // Prevent malicious CSS patterns
        const maliciousPatterns = [
          /javascript:/gi,
          /expression\s*\(/gi,
          /import\s+/gi,
          /@import/gi,
          /behavior:/gi,
          /-moz-binding:/gi,
        ];
        return !maliciousPatterns.some(pattern => pattern.test(css));
      },
      { message: 'Custom CSS contains prohibited patterns' }
    )
    .optional()
    .nullable(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one branding field must be provided for update' }
);

// File upload validation for logo
export const logoFileSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename too long')
    .refine(
      (filename) => {
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.svg', '.webp'];
        return allowedExtensions.some(ext => filename.toLowerCase().endsWith(ext));
      },
      { message: 'Logo must be JPG, PNG, SVG, or WebP format' }
    ),
  size: z
    .number()
    .min(1, 'File cannot be empty')
    .max(2 * 1024 * 1024, 'Logo file size cannot exceed 2MB'),
  mimeType: z
    .string()
    .refine(
      (mimeType) => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'];
        return allowedTypes.includes(mimeType);
      },
      { message: 'Invalid logo file type' }
    ),
});

// Query parameter validation
export const organizationIdParamSchema = z.object({
  id: z.string().uuid('Invalid organization ID format'),
});

// Response type definitions
export interface OrganizationSettingsResponse {
  id: string;
  name: string;
  slug: string;
  timezone: string | null;
  locale: string | null;
  business_hours: Record<string, any> | null;
  whatsapp_business_account_id: string | null;
  whatsapp_phone_number_id: string | null;
  subscription_status: string;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationBrandingResponse {
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  custom_css: string | null;
}

// Validation helper functions
export function validateOrganizationUpdate(data: unknown) {
  return updateOrganizationGeneralSchema.safeParse(data);
}

export function validateBrandingUpdate(data: unknown) {
  return updateOrganizationBrandingSchema.safeParse(data);
}

export function validateLogoFile(file: { filename: string; size: number; mimeType: string }) {
  return logoFileSchema.safeParse(file);
}

export function validateOrganizationId(id: string) {
  return organizationIdParamSchema.safeParse({ id });
}
