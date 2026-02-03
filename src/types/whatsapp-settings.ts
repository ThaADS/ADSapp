/**
 * WhatsApp Provider Settings Types
 * Purpose: Type definitions for WhatsApp provider selection
 * Phase: 24 - Integration & Settings
 * Date: 2026-02-03
 */

// =============================================================================
// Provider Types
// =============================================================================

/**
 * Available WhatsApp providers
 * - cloud_api: Meta WhatsApp Cloud API (direct)
 * - twilio: Twilio WhatsApp Business API
 */
export type WhatsAppProvider = 'cloud_api' | 'twilio'

/**
 * Template source preference
 * - active: Use templates from the active provider
 * - cloud_api: Always use Meta Cloud API templates
 * - twilio: Always use Twilio Content API templates
 */
export type TemplatePreference = 'active' | 'cloud_api' | 'twilio'

// =============================================================================
// Settings Interface
// =============================================================================

/**
 * WhatsApp provider settings for an organization
 */
export interface WhatsAppProviderSettings {
  id: string
  organizationId: string

  // Provider selection
  activeProvider: WhatsAppProvider
  fallbackEnabled: boolean
  fallbackProvider: WhatsAppProvider | null

  // Connection references
  cloudApiConnectionId: string | null
  twilioConnectionId: string | null

  // Feature flags
  preferTemplatesFrom: TemplatePreference

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

/**
 * Database row type (snake_case for Supabase)
 */
export interface WhatsAppProviderSettingsRow {
  id: string
  organization_id: string
  active_provider: string
  fallback_enabled: boolean
  fallback_provider: string | null
  cloud_api_connection_id: string | null
  twilio_connection_id: string | null
  prefer_templates_from: string
  created_at: string
  updated_at: string
}

// =============================================================================
// API Request/Response Types
// =============================================================================

/**
 * Request body for updating provider settings
 */
export interface UpdateProviderSettingsRequest {
  activeProvider?: WhatsAppProvider
  fallbackEnabled?: boolean
  fallbackProvider?: WhatsAppProvider | null
  preferTemplatesFrom?: TemplatePreference
}

/**
 * Provider settings response with connection status
 */
export interface ProviderSettingsResponse {
  settings: WhatsAppProviderSettings
  connections: {
    cloudApi: {
      connected: boolean
      connectionId: string | null
      phoneNumber: string | null
      businessName: string | null
    }
    twilio: {
      connected: boolean
      connectionId: string | null
      whatsappNumber: string | null
      friendlyName: string | null
    }
  }
}

/**
 * Provider health status
 */
export interface ProviderHealthStatus {
  cloudApi: {
    connected: boolean
    healthy: boolean
    latency: number | null
    lastError: string | null
  }
  twilio: {
    connected: boolean
    healthy: boolean
    latency: number | null
    lastError: string | null
  }
}

// =============================================================================
// Converter Functions
// =============================================================================

/**
 * Convert database row to settings object
 */
export function rowToSettings(row: WhatsAppProviderSettingsRow): WhatsAppProviderSettings {
  return {
    id: row.id,
    organizationId: row.organization_id,
    activeProvider: row.active_provider as WhatsAppProvider,
    fallbackEnabled: row.fallback_enabled,
    fallbackProvider: row.fallback_provider as WhatsAppProvider | null,
    cloudApiConnectionId: row.cloud_api_connection_id,
    twilioConnectionId: row.twilio_connection_id,
    preferTemplatesFrom: row.prefer_templates_from as TemplatePreference,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

/**
 * Convert settings object to database row format
 */
export function settingsToRow(
  settings: Partial<WhatsAppProviderSettings>
): Partial<WhatsAppProviderSettingsRow> {
  const row: Partial<WhatsAppProviderSettingsRow> = {}

  if (settings.activeProvider !== undefined) {
    row.active_provider = settings.activeProvider
  }
  if (settings.fallbackEnabled !== undefined) {
    row.fallback_enabled = settings.fallbackEnabled
  }
  if (settings.fallbackProvider !== undefined) {
    row.fallback_provider = settings.fallbackProvider
  }
  if (settings.cloudApiConnectionId !== undefined) {
    row.cloud_api_connection_id = settings.cloudApiConnectionId
  }
  if (settings.twilioConnectionId !== undefined) {
    row.twilio_connection_id = settings.twilioConnectionId
  }
  if (settings.preferTemplatesFrom !== undefined) {
    row.prefer_templates_from = settings.preferTemplatesFrom
  }

  return row
}

// =============================================================================
// Default Settings
// =============================================================================

/**
 * Default provider settings for new organizations
 */
export const DEFAULT_PROVIDER_SETTINGS: Omit<WhatsAppProviderSettings, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'> = {
  activeProvider: 'cloud_api',
  fallbackEnabled: false,
  fallbackProvider: null,
  cloudApiConnectionId: null,
  twilioConnectionId: null,
  preferTemplatesFrom: 'active',
}
