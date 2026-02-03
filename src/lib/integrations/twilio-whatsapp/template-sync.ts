/**
 * Twilio WhatsApp Template Sync Service
 * Purpose: Sync templates from Twilio Content API
 * Date: 2026-02-03
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTwilioWhatsAppClient } from './client'
import type {
  TwilioWhatsAppTemplate,
  TwilioWhatsAppTemplateRow,
  TwilioContentApiTemplate,
  TwilioTemplateVariable,
  TwilioTemplateAction,
  TwilioTemplateType,
} from '@/types/twilio-whatsapp'

// =============================================================================
// Types
// =============================================================================

export interface TemplateSyncResult {
  success: boolean
  synced: number
  added: number
  updated: number
  removed: number
  error?: string
}

// =============================================================================
// Template Sync Service
// =============================================================================

/**
 * Sync all templates from Twilio Content API for a connection
 */
export async function syncTwilioTemplates(
  connectionId: string
): Promise<TemplateSyncResult> {
  const supabase = createServiceRoleClient()

  try {
    // Get connection details
    const { data: connection, error: connError } = await supabase
      .from('twilio_whatsapp_connections')
      .select('id, organization_id, twilio_account_sid')
      .eq('id', connectionId)
      .eq('is_active', true)
      .single()

    if (connError || !connection) {
      return {
        success: false,
        synced: 0,
        added: 0,
        updated: 0,
        removed: 0,
        error: 'Connection not found or inactive',
      }
    }

    // Get Twilio client
    const client = await getTwilioWhatsAppClient(connection.organization_id)

    // Fetch templates from Twilio Content API
    const templates = await client.listContentTemplates()

    if (!templates.success || !templates.data) {
      return {
        success: false,
        synced: 0,
        added: 0,
        updated: 0,
        removed: 0,
        error: templates.error || 'Failed to fetch templates',
      }
    }

    // Get existing templates for this connection
    const { data: existingTemplates } = await supabase
      .from('twilio_whatsapp_templates')
      .select('id, content_sid')
      .eq('connection_id', connectionId)

    const existingMap = new Map(
      (existingTemplates || []).map((t: { id: string; content_sid: string }) => [t.content_sid, t.id])
    )
    const fetchedSids = new Set<string>()

    let added = 0
    let updated = 0

    // Upsert templates
    for (const template of templates.data) {
      fetchedSids.add(template.sid)
      const parsed = parseContentApiTemplate(template)

      const templateData = {
        organization_id: connection.organization_id,
        connection_id: connectionId,
        content_sid: template.sid,
        friendly_name: template.friendly_name,
        language: template.language,
        template_type: parsed.templateType,
        body: parsed.body,
        variables: parsed.variables,
        media_url: parsed.mediaUrl,
        media_type: parsed.mediaType,
        actions: parsed.actions,
        approval_status: 'approved', // Content API only returns approved templates
        last_synced_at: new Date().toISOString(),
        raw_response: template,
      }

      if (existingMap.has(template.sid)) {
        // Update existing
        await supabase
          .from('twilio_whatsapp_templates')
          .update(templateData)
          .eq('id', existingMap.get(template.sid))

        updated++
      } else {
        // Insert new
        await supabase.from('twilio_whatsapp_templates').insert(templateData)

        added++
      }
    }

    // Remove templates that no longer exist in Twilio
    const toRemove = Array.from(existingMap.entries())
      .filter(([sid]) => !fetchedSids.has(sid))
      .map(([, id]) => id)

    let removed = 0
    if (toRemove.length > 0) {
      await supabase
        .from('twilio_whatsapp_templates')
        .delete()
        .in('id', toRemove)

      removed = toRemove.length
    }

    return {
      success: true,
      synced: templates.data.length,
      added,
      updated,
      removed,
    }
  } catch (error) {
    return {
      success: false,
      synced: 0,
      added: 0,
      updated: 0,
      removed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Parse Twilio Content API template into our format
 */
function parseContentApiTemplate(template: TwilioContentApiTemplate): {
  templateType: TwilioTemplateType
  body: string | null
  variables: TwilioTemplateVariable[]
  mediaUrl: string | null
  mediaType: string | null
  actions: TwilioTemplateAction[]
} {
  // Determine template type from available types
  const types = template.types || {}
  let templateType: TwilioTemplateType = 'twilio/text'
  let body: string | null = null
  let mediaUrl: string | null = null
  let mediaType: string | null = null
  let actions: TwilioTemplateAction[] = []

  // Check for text type
  if (types['twilio/text']) {
    templateType = 'twilio/text'
    body = types['twilio/text'].body || null
  }

  // Check for media type
  if (types['twilio/media']) {
    templateType = 'twilio/media'
    body = types['twilio/media'].body || null
    const media = types['twilio/media'].media
    if (media && media.length > 0) {
      mediaUrl = media[0]
      // Infer media type from URL
      if (mediaUrl) {
        if (mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
          mediaType = 'image'
        } else if (mediaUrl.match(/\.(mp4|mov|avi)$/i)) {
          mediaType = 'video'
        } else if (mediaUrl.match(/\.(mp3|ogg|wav)$/i)) {
          mediaType = 'audio'
        } else {
          mediaType = 'document'
        }
      }
    }
  }

  // Check for quick-reply type
  if (types['twilio/quick-reply']) {
    templateType = 'twilio/quick-reply'
    body = types['twilio/quick-reply'].body || null
    actions = (types['twilio/quick-reply'].actions || []).map((a) => ({
      type: 'QUICK_REPLY' as const,
      title: a.title,
    }))
  }

  // Check for call-to-action type
  if (types['twilio/call-to-action']) {
    templateType = 'twilio/call-to-action'
    body = types['twilio/call-to-action'].body || null
    actions = (types['twilio/call-to-action'].actions || []).map((a) => ({
      type: a.type === 'URL' ? ('URL' as const) : ('PHONE_NUMBER' as const),
      title: a.title,
      url: a.url,
      phoneNumber: a.phone,
    }))
  }

  // Parse variables from template.variables
  const variables: TwilioTemplateVariable[] = Object.entries(
    template.variables || {}
  ).map(([key, name]) => ({
    key,
    name: name as string,
  }))

  return {
    templateType,
    body,
    variables,
    mediaUrl,
    mediaType,
    actions,
  }
}

// =============================================================================
// Template Retrieval
// =============================================================================

/**
 * Get all templates for an organization
 */
export async function getTemplatesForOrganization(
  organizationId: string
): Promise<TwilioWhatsAppTemplate[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('twilio_whatsapp_templates')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('approval_status', 'approved')
    .order('friendly_name')

  if (error || !data) {
    return []
  }

  return data.map(rowToTemplate)
}

/**
 * Get a single template by ID
 */
export async function getTemplateById(
  templateId: string,
  organizationId: string
): Promise<TwilioWhatsAppTemplate | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('twilio_whatsapp_templates')
    .select('*')
    .eq('id', templateId)
    .eq('organization_id', organizationId)
    .single()

  if (error || !data) {
    return null
  }

  return rowToTemplate(data)
}

/**
 * Get template by Content SID
 */
export async function getTemplateByContentSid(
  contentSid: string,
  connectionId: string
): Promise<TwilioWhatsAppTemplate | null> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('twilio_whatsapp_templates')
    .select('*')
    .eq('content_sid', contentSid)
    .eq('connection_id', connectionId)
    .single()

  if (error || !data) {
    return null
  }

  return rowToTemplate(data)
}

/**
 * Convert database row to template object
 */
function rowToTemplate(row: TwilioWhatsAppTemplateRow): TwilioWhatsAppTemplate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    connectionId: row.connection_id,
    contentSid: row.content_sid,
    friendlyName: row.friendly_name,
    language: row.language,
    templateType: row.template_type as TwilioTemplateType,
    body: row.body,
    variables: row.variables || [],
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    actions: row.actions || [],
    approvalStatus: row.approval_status as 'approved' | 'pending' | 'rejected',
    lastSyncedAt: new Date(row.last_synced_at),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }
}

// =============================================================================
// Scheduled Sync
// =============================================================================

/**
 * Sync templates for all active connections
 * Called by cron job or after connection
 */
export async function syncAllActiveConnections(): Promise<{
  success: boolean
  results: Array<{ connectionId: string; result: TemplateSyncResult }>
}> {
  const supabase = createServiceRoleClient()

  const { data: connections, error } = await supabase
    .from('twilio_whatsapp_connections')
    .select('id')
    .eq('is_active', true)

  if (error || !connections) {
    return { success: false, results: [] }
  }

  const results = await Promise.all(
    connections.map(async (conn: { id: string }) => ({
      connectionId: conn.id,
      result: await syncTwilioTemplates(conn.id),
    }))
  )

  return {
    success: results.every((r) => r.result.success),
    results,
  }
}
