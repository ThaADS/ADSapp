/**
 * WhatsApp Provider Service
 * Purpose: Manage WhatsApp provider selection and adapter creation
 * Phase: 24 - Integration & Settings
 * Date: 2026-02-03
 */

import { createClient } from '@/lib/supabase/server'
import { ChannelAdapter } from '@/types/channels'
import { WhatsAppAdapter } from '@/lib/channels/adapters/whatsapp'
import { TwilioWhatsAppAdapter } from '@/lib/channels/adapters/twilio-whatsapp'
import type {
  WhatsAppProvider,
  WhatsAppProviderSettings,
  WhatsAppProviderSettingsRow,
  ProviderSettingsResponse,
  ProviderHealthStatus,
  UpdateProviderSettingsRequest,
  rowToSettings,
} from '@/types/whatsapp-settings'

// =============================================================================
// Provider Settings Functions
// =============================================================================

/**
 * Get the active WhatsApp provider for an organization
 */
export async function getActiveProvider(organizationId: string): Promise<WhatsAppProvider> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('whatsapp_provider_settings')
    .select('active_provider')
    .eq('organization_id', organizationId)
    .single()

  // Default to cloud_api if no settings exist
  return (data?.active_provider as WhatsAppProvider) || 'cloud_api'
}

/**
 * Get full provider settings for an organization
 */
export async function getProviderSettings(
  organizationId: string
): Promise<WhatsAppProviderSettings | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('whatsapp_provider_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (error || !data) {
    return null
  }

  return rowToSettingsObject(data as WhatsAppProviderSettingsRow)
}

/**
 * Get provider settings with connection details
 */
export async function getProviderSettingsWithConnections(
  organizationId: string
): Promise<ProviderSettingsResponse> {
  const supabase = await createClient()

  // Get or create provider settings
  let settings = await getProviderSettings(organizationId)

  if (!settings) {
    // Create default settings
    const { data: newSettings } = await supabase
      .from('whatsapp_provider_settings')
      .insert({
        organization_id: organizationId,
        active_provider: 'cloud_api',
      })
      .select('*')
      .single()

    settings = newSettings ? rowToSettingsObject(newSettings as WhatsAppProviderSettingsRow) : null
  }

  // Get Cloud API connection
  const { data: cloudApiConnection } = await supabase
    .from('whatsapp_connections')
    .select('id, phone_number, business_name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  // Get Twilio connection
  const { data: twilioConnection } = await supabase
    .from('twilio_whatsapp_connections')
    .select('id, whatsapp_number, friendly_name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  return {
    settings: settings || createDefaultSettings(organizationId),
    connections: {
      cloudApi: {
        connected: !!cloudApiConnection,
        connectionId: cloudApiConnection?.id || null,
        phoneNumber: cloudApiConnection?.phone_number || null,
        businessName: cloudApiConnection?.business_name || null,
      },
      twilio: {
        connected: !!twilioConnection,
        connectionId: twilioConnection?.id || null,
        whatsappNumber: twilioConnection?.whatsapp_number || null,
        friendlyName: twilioConnection?.friendly_name || null,
      },
    },
  }
}

/**
 * Update provider settings
 */
export async function updateProviderSettings(
  organizationId: string,
  updates: UpdateProviderSettingsRequest
): Promise<WhatsAppProviderSettings> {
  const supabase = await createClient()

  // Build update object
  const updateData: Record<string, unknown> = {}

  if (updates.activeProvider !== undefined) {
    updateData.active_provider = updates.activeProvider
  }
  if (updates.fallbackEnabled !== undefined) {
    updateData.fallback_enabled = updates.fallbackEnabled
  }
  if (updates.fallbackProvider !== undefined) {
    updateData.fallback_provider = updates.fallbackProvider
  }
  if (updates.preferTemplatesFrom !== undefined) {
    updateData.prefer_templates_from = updates.preferTemplatesFrom
  }

  // Upsert settings
  const { data, error } = await supabase
    .from('whatsapp_provider_settings')
    .upsert(
      {
        organization_id: organizationId,
        ...updateData,
      },
      { onConflict: 'organization_id' }
    )
    .select('*')
    .single()

  if (error) {
    throw new Error(`Failed to update provider settings: ${error.message}`)
  }

  return rowToSettingsObject(data as WhatsAppProviderSettingsRow)
}

/**
 * Set the active WhatsApp provider
 */
export async function setActiveProvider(
  organizationId: string,
  provider: WhatsAppProvider
): Promise<void> {
  await updateProviderSettings(organizationId, { activeProvider: provider })
}

// =============================================================================
// Provider Health Check
// =============================================================================

/**
 * Check health status of both providers
 */
export async function checkProviderHealth(
  organizationId: string
): Promise<ProviderHealthStatus> {
  const result: ProviderHealthStatus = {
    cloudApi: {
      connected: false,
      healthy: false,
      latency: null,
      lastError: null,
    },
    twilio: {
      connected: false,
      healthy: false,
      latency: null,
      lastError: null,
    },
  }

  // Check Cloud API health
  try {
    const cloudAdapter = await WhatsAppAdapter.createForOrganization(organizationId)
    const startTime = Date.now()
    const health = await cloudAdapter.healthCheck()

    result.cloudApi = {
      connected: true,
      healthy: health.isHealthy,
      latency: health.latency || Date.now() - startTime,
      lastError: health.lastError || null,
    }
  } catch (error) {
    result.cloudApi.lastError = error instanceof Error ? error.message : 'Connection not found'
  }

  // Check Twilio health
  try {
    const twilioAdapter = await TwilioWhatsAppAdapter.createForOrganization(organizationId)
    const startTime = Date.now()
    const health = await twilioAdapter.healthCheck()

    result.twilio = {
      connected: true,
      healthy: health.isHealthy,
      latency: health.latency || Date.now() - startTime,
      lastError: health.lastError || null,
    }
  } catch (error) {
    result.twilio.lastError = error instanceof Error ? error.message : 'Connection not found'
  }

  return result
}

// =============================================================================
// Adapter Factory with Provider Selection
// =============================================================================

/**
 * Get the appropriate WhatsApp adapter based on provider settings
 */
export async function getWhatsAppAdapter(
  organizationId: string
): Promise<ChannelAdapter> {
  const provider = await getActiveProvider(organizationId)

  if (provider === 'twilio') {
    return TwilioWhatsAppAdapter.createForOrganization(organizationId)
  }

  return WhatsAppAdapter.createForOrganization(organizationId)
}

/**
 * Get adapter with fallback support
 */
export async function getWhatsAppAdapterWithFallback(
  organizationId: string
): Promise<{ adapter: ChannelAdapter; provider: WhatsAppProvider; usingFallback: boolean }> {
  const settings = await getProviderSettings(organizationId)
  const activeProvider = settings?.activeProvider || 'cloud_api'

  try {
    // Try primary adapter
    const adapter = activeProvider === 'twilio'
      ? await TwilioWhatsAppAdapter.createForOrganization(organizationId)
      : await WhatsAppAdapter.createForOrganization(organizationId)

    // Health check
    const health = await adapter.healthCheck()

    if (health.isHealthy) {
      return { adapter, provider: activeProvider, usingFallback: false }
    }

    // Primary is unhealthy, try fallback if enabled
    if (settings?.fallbackEnabled && settings.fallbackProvider) {
      const fallbackAdapter = settings.fallbackProvider === 'twilio'
        ? await TwilioWhatsAppAdapter.createForOrganization(organizationId)
        : await WhatsAppAdapter.createForOrganization(organizationId)

      const fallbackHealth = await fallbackAdapter.healthCheck()

      if (fallbackHealth.isHealthy) {
        return {
          adapter: fallbackAdapter,
          provider: settings.fallbackProvider,
          usingFallback: true,
        }
      }
    }

    // Return primary anyway if fallback also fails
    return { adapter, provider: activeProvider, usingFallback: false }
  } catch (error) {
    // Primary failed to create, try fallback
    if (settings?.fallbackEnabled && settings.fallbackProvider) {
      try {
        const fallbackAdapter = settings.fallbackProvider === 'twilio'
          ? await TwilioWhatsAppAdapter.createForOrganization(organizationId)
          : await WhatsAppAdapter.createForOrganization(organizationId)

        return {
          adapter: fallbackAdapter,
          provider: settings.fallbackProvider,
          usingFallback: true,
        }
      } catch {
        // Fallback also failed
      }
    }

    throw error
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

function rowToSettingsObject(row: WhatsAppProviderSettingsRow): WhatsAppProviderSettings {
  return {
    id: row.id,
    organizationId: row.organization_id,
    activeProvider: row.active_provider as WhatsAppProvider,
    fallbackEnabled: row.fallback_enabled,
    fallbackProvider: row.fallback_provider as WhatsAppProvider | null,
    cloudApiConnectionId: row.cloud_api_connection_id,
    twilioConnectionId: row.twilio_connection_id,
    preferTemplatesFrom: row.prefer_templates_from as 'active' | 'cloud_api' | 'twilio',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

function createDefaultSettings(organizationId: string): WhatsAppProviderSettings {
  const now = new Date()
  return {
    id: '',
    organizationId,
    activeProvider: 'cloud_api',
    fallbackEnabled: false,
    fallbackProvider: null,
    cloudApiConnectionId: null,
    twilioConnectionId: null,
    preferTemplatesFrom: 'active',
    createdAt: now,
    updatedAt: now,
  }
}
