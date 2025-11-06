/**
 * Organization Settings Type Definitions
 *
 * Comprehensive TypeScript types for organization settings, branding,
 * business hours, and related configurations
 */

// ============================================================================
// Organization General Settings
// ============================================================================

export interface OrganizationSettings {
  id: string
  name: string
  slug: string
  timezone: string | null
  locale: string | null
  business_hours: BusinessHours | null
  whatsapp_business_account_id: string | null
  whatsapp_phone_number_id: string | null
  subscription_status: SubscriptionStatus
  subscription_tier: SubscriptionTier
  status: OrganizationStatus
  created_at: string
  updated_at: string
}

export type SubscriptionStatus = 'trial' | 'active' | 'cancelled' | 'past_due'
export type SubscriptionTier = 'starter' | 'professional' | 'enterprise'
export type OrganizationStatus = 'active' | 'suspended' | 'cancelled'

// ============================================================================
// Business Hours Configuration
// ============================================================================

export interface BusinessHours {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

export interface DaySchedule {
  enabled: boolean
  open: string // HH:MM format (24-hour)
  close: string // HH:MM format (24-hour)
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { enabled: true, open: '09:00', close: '17:00' },
  tuesday: { enabled: true, open: '09:00', close: '17:00' },
  wednesday: { enabled: true, open: '09:00', close: '17:00' },
  thursday: { enabled: true, open: '09:00', close: '17:00' },
  friday: { enabled: true, open: '09:00', close: '17:00' },
  saturday: { enabled: false, open: '09:00', close: '17:00' },
  sunday: { enabled: false, open: '09:00', close: '17:00' },
}

// ============================================================================
// Organization Branding
// ============================================================================

export interface OrganizationBranding {
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  accent_color: string | null
  custom_css: string | null
}

export const DEFAULT_BRANDING: OrganizationBranding = {
  logo_url: null,
  primary_color: '#3B82F6', // Tailwind blue-500
  secondary_color: '#10B981', // Tailwind green-500
  accent_color: '#F59E0B', // Tailwind amber-500
  custom_css: null,
}

// ============================================================================
// Update Request Types
// ============================================================================

export interface UpdateOrganizationSettingsRequest {
  name?: string
  subdomain?: string
  timezone?: string
  locale?: string
  business_hours?: BusinessHours
  whatsapp_business_account_id?: string | null
  whatsapp_phone_number_id?: string | null
}

export interface UpdateOrganizationBrandingRequest {
  logo_url?: string | null
  primary_color?: string | null
  secondary_color?: string | null
  accent_color?: string | null
  custom_css?: string | null
}

export interface UploadLogoRequest {
  logo: File
  primary_color?: string
  secondary_color?: string
  accent_color?: string
}

// ============================================================================
// Response Types
// ============================================================================

export interface OrganizationSettingsResponse {
  success: boolean
  organization: OrganizationSettings
  message?: string
}

export interface OrganizationBrandingResponse {
  success: boolean
  branding: OrganizationBranding
  message?: string
}

export interface OrganizationUpdateResponse {
  success: boolean
  organization: OrganizationSettings
  message: string
  changed_fields: string[]
}

export interface BrandingUpdateResponse {
  success: boolean
  branding: OrganizationBranding
  message: string
  updated_fields: string[]
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationError {
  field: string
  message: string
  code: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  code: string
  details?: ValidationError[]
}

// ============================================================================
// Audit Log Types
// ============================================================================

export interface OrganizationAuditLog {
  id: string
  action: OrganizationAuditAction
  actor_id: string
  actor_email: string
  resource_type: 'organization'
  resource_id: string
  metadata: OrganizationAuditMetadata
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export type OrganizationAuditAction =
  | 'organization.created'
  | 'organization.updated'
  | 'organization.deleted'
  | 'organization.suspended'
  | 'organization.reactivated'
  | 'organization.branding_updated'
  | 'organization.settings_updated'
  | 'organization.subdomain_changed'

export interface OrganizationAuditMetadata {
  organization_name: string
  changed_fields?: Record<string, { old: any; new: any }>
  branding_changes?: Partial<OrganizationBranding>
  logo_uploaded?: boolean
  [key: string]: any
}

// ============================================================================
// Permission Types
// ============================================================================

export interface OrganizationPermissions {
  can_view: boolean
  can_update: boolean
  can_delete: boolean
  can_update_branding: boolean
  can_change_subdomain: boolean
  can_manage_users: boolean
  can_view_billing: boolean
  can_manage_billing: boolean
}

export function getOrganizationPermissions(role: string): OrganizationPermissions {
  switch (role) {
    case 'owner':
      return {
        can_view: true,
        can_update: true,
        can_delete: true,
        can_update_branding: true,
        can_change_subdomain: true,
        can_manage_users: true,
        can_view_billing: true,
        can_manage_billing: true,
      }

    case 'admin':
      return {
        can_view: true,
        can_update: true,
        can_delete: false,
        can_update_branding: true,
        can_change_subdomain: false,
        can_manage_users: true,
        can_view_billing: true,
        can_manage_billing: false,
      }

    case 'agent':
      return {
        can_view: true,
        can_update: false,
        can_delete: false,
        can_update_branding: false,
        can_change_subdomain: false,
        can_manage_users: false,
        can_view_billing: false,
        can_manage_billing: false,
      }

    default:
      return {
        can_view: false,
        can_update: false,
        can_delete: false,
        can_update_branding: false,
        can_change_subdomain: false,
        can_manage_users: false,
        can_view_billing: false,
        can_manage_billing: false,
      }
  }
}

// ============================================================================
// Utility Types
// ============================================================================

export interface SubdomainAvailabilityCheck {
  subdomain: string
  available: boolean
  suggested_alternatives?: string[]
}

export interface TimezoneInfo {
  value: string // IANA timezone identifier
  label: string // Human-readable label
  offset: string // UTC offset (e.g., "UTC-05:00")
}

export interface LocaleInfo {
  code: string // ISO 639-1 code
  name: string // Language name
  native_name: string // Native language name
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if organization is within business hours
 */
export function isWithinBusinessHours(
  businessHours: BusinessHours,
  timezone: string,
  date?: Date
): boolean {
  const now = date || new Date()
  const dayName = now
    .toLocaleString('en-US', { weekday: 'long', timeZone: timezone })
    .toLowerCase() as keyof BusinessHours
  const schedule = businessHours[dayName]

  if (!schedule.enabled) {
    return false
  }

  const currentTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  })
  return currentTime >= schedule.open && currentTime <= schedule.close
}

/**
 * Get next available business hour
 */
export function getNextBusinessHour(
  businessHours: BusinessHours,
  timezone: string,
  date?: Date
): Date | null {
  const now = date || new Date()
  const currentDay = new Date(now)

  // Check next 7 days
  for (let i = 0; i < 7; i++) {
    const dayName = currentDay
      .toLocaleString('en-US', { weekday: 'long', timeZone: timezone })
      .toLowerCase() as keyof BusinessHours
    const schedule = businessHours[dayName]

    if (schedule.enabled) {
      const [hour, minute] = schedule.open.split(':').map(Number)
      const nextOpen = new Date(currentDay)
      nextOpen.setHours(hour, minute, 0, 0)

      if (nextOpen > now) {
        return nextOpen
      }
    }

    currentDay.setDate(currentDay.getDate() + 1)
  }

  return null
}

/**
 * Validate color format
 */
export function isValidColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
}

/**
 * Generate subdomain from organization name
 */
export function generateSubdomain(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 63)
}
