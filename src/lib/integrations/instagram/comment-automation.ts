/**
 * Instagram Comment-to-DM Automation
 * Purpose: Process comment triggers and send automated DM responses
 * Date: 2026-01-28
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendInstagramMessage, getInstagramConnection } from './client'
import type { InstagramCommentRule, InstagramConnection } from '@/types/instagram'

// =============================================================================
// Comment Rule Management
// =============================================================================

/**
 * Creates a new comment-to-DM rule
 */
export async function createCommentRule(
  organizationId: string,
  rule: {
    name: string
    triggerKeywords: string[]
    triggerMediaIds?: string[]
    dmTemplate: string
    dmDelaySeconds?: number
    maxPerUserPerDay?: number
  }
): Promise<InstagramCommentRule | null> {
  const supabase = createServiceRoleClient()

  // Get Instagram connection
  const connection = await getInstagramConnection(organizationId)
  if (!connection) {
    throw new Error('Instagram not connected')
  }

  const { data, error } = await supabase
    .from('instagram_comment_rules')
    .insert({
      organization_id: organizationId,
      instagram_connection_id: connection.id,
      name: rule.name,
      trigger_keywords: rule.triggerKeywords,
      trigger_media_ids: rule.triggerMediaIds || null,
      dm_template: rule.dmTemplate,
      dm_delay_seconds: rule.dmDelaySeconds || 0,
      max_per_user_per_day: rule.maxPerUserPerDay || 1,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create comment rule:', error)
    return null
  }

  return data as InstagramCommentRule
}

/**
 * Gets all comment rules for an organization
 */
export async function getCommentRules(
  organizationId: string
): Promise<InstagramCommentRule[]> {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('instagram_comment_rules')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to get comment rules:', error)
    return []
  }

  return (data || []) as InstagramCommentRule[]
}

/**
 * Updates a comment rule
 */
export async function updateCommentRule(
  ruleId: string,
  organizationId: string,
  updates: Partial<{
    name: string
    triggerKeywords: string[]
    triggerMediaIds: string[] | null
    dmTemplate: string
    dmDelaySeconds: number
    maxPerUserPerDay: number
    isActive: boolean
  }>
): Promise<InstagramCommentRule | null> {
  const supabase = createServiceRoleClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (updates.name !== undefined) updateData.name = updates.name
  if (updates.triggerKeywords !== undefined) updateData.trigger_keywords = updates.triggerKeywords
  if (updates.triggerMediaIds !== undefined) updateData.trigger_media_ids = updates.triggerMediaIds
  if (updates.dmTemplate !== undefined) updateData.dm_template = updates.dmTemplate
  if (updates.dmDelaySeconds !== undefined) updateData.dm_delay_seconds = updates.dmDelaySeconds
  if (updates.maxPerUserPerDay !== undefined) updateData.max_per_user_per_day = updates.maxPerUserPerDay
  if (updates.isActive !== undefined) updateData.is_active = updates.isActive

  const { data, error } = await supabase
    .from('instagram_comment_rules')
    .update(updateData)
    .eq('id', ruleId)
    .eq('organization_id', organizationId)
    .select()
    .single()

  if (error) {
    console.error('Failed to update comment rule:', error)
    return null
  }

  return data as InstagramCommentRule
}

/**
 * Deletes a comment rule
 */
export async function deleteCommentRule(
  ruleId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('instagram_comment_rules')
    .delete()
    .eq('id', ruleId)
    .eq('organization_id', organizationId)

  return !error
}

// =============================================================================
// Comment Processing
// =============================================================================

/**
 * Processes a comment and triggers DM if rules match
 */
export async function processComment(
  connection: InstagramConnection,
  comment: {
    id: string
    text: string
    from: { id: string; username: string }
    mediaId?: string
  }
): Promise<{
  triggered: boolean
  ruleId?: string
  dmSent?: boolean
  error?: string
}> {
  const supabase = createServiceRoleClient()

  // Get active rules for this connection
  const { data: rules } = await supabase
    .from('instagram_comment_rules')
    .select('*')
    .eq('instagram_connection_id', connection.id)
    .eq('is_active', true)

  if (!rules || rules.length === 0) {
    return { triggered: false }
  }

  const commentTextLower = comment.text.toLowerCase()

  for (const rule of rules) {
    // Check keyword match
    const matchesKeyword = rule.trigger_keywords.some((keyword: string) =>
      commentTextLower.includes(keyword.toLowerCase())
    )

    if (!matchesKeyword) {
      continue
    }

    // Check media filter
    if (rule.trigger_media_ids && rule.trigger_media_ids.length > 0) {
      if (!comment.mediaId || !rule.trigger_media_ids.includes(comment.mediaId)) {
        continue
      }
    }

    // Check daily limit
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase
      .from('instagram_comment_dm_tracking')
      .select('*', { count: 'exact', head: true })
      .eq('instagram_comment_rule_id', rule.id)
      .eq('user_id', comment.from.id)
      .gte('dm_sent_at', dayAgo)

    if ((count || 0) >= rule.max_per_user_per_day) {
      continue
    }

    // Rule matched! Queue or send DM
    try {
      if (rule.dm_delay_seconds > 0) {
        // Queue for delayed sending
        await queueDelayedDM(rule, comment.from.id, comment.id)

        return {
          triggered: true,
          ruleId: rule.id,
          dmSent: false // Will be sent later
        }
      } else {
        // Send immediately
        await sendAutomatedDM(connection, rule, comment.from.id, comment.id)

        return {
          triggered: true,
          ruleId: rule.id,
          dmSent: true
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        triggered: true,
        ruleId: rule.id,
        dmSent: false,
        error: message
      }
    }
  }

  return { triggered: false }
}

/**
 * Queues a DM to be sent after a delay
 */
async function queueDelayedDM(
  rule: InstagramCommentRule,
  userId: string,
  commentId: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  // For now, just record the tracking entry
  // A background job would pick up and send these
  await supabase
    .from('instagram_comment_dm_tracking')
    .insert({
      instagram_comment_rule_id: rule.id,
      user_id: userId,
      comment_id: commentId,
      dm_sent_at: new Date(Date.now() + rule.dm_delay_seconds * 1000).toISOString()
    })

  // Update trigger count
  await supabase
    .from('instagram_comment_rules')
    .update({
      trigger_count: rule.trigger_count + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', rule.id)
}

/**
 * Sends an automated DM based on a rule
 */
async function sendAutomatedDM(
  connection: InstagramConnection,
  rule: InstagramCommentRule,
  userId: string,
  commentId: string
): Promise<void> {
  const supabase = createServiceRoleClient()

  // Send the DM
  await sendInstagramMessage(
    connection,
    userId,
    { text: rule.dm_template }
  )

  // Record tracking
  await supabase
    .from('instagram_comment_dm_tracking')
    .insert({
      instagram_comment_rule_id: rule.id,
      user_id: userId,
      comment_id: commentId,
      dm_sent_at: new Date().toISOString()
    })

  // Update stats
  await supabase
    .from('instagram_comment_rules')
    .update({
      trigger_count: rule.trigger_count + 1,
      dm_sent_count: rule.dm_sent_count + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', rule.id)
}

// =============================================================================
// Delayed DM Processing (for background job)
// =============================================================================

/**
 * Processes pending delayed DMs that are due to be sent
 */
export async function processPendingDelayedDMs(): Promise<{
  processed: number
  errors: string[]
}> {
  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()
  const results = { processed: 0, errors: [] as string[] }

  // Get pending DMs that should be sent now
  // Note: This is a simplified version - in production, you'd want
  // a proper job queue system
  const { data: pendingDMs } = await supabase
    .from('instagram_comment_dm_tracking')
    .select(`
      *,
      instagram_comment_rules (
        id,
        dm_template,
        dm_sent_count,
        instagram_connection_id,
        instagram_connections (*)
      )
    `)
    .lte('dm_sent_at', now)
    .is('comment_id', 'not.null') // Use comment_id presence as a flag for pending

  if (!pendingDMs || pendingDMs.length === 0) {
    return results
  }

  for (const dm of pendingDMs) {
    try {
      const rule = dm.instagram_comment_rules
      const connection = rule?.instagram_connections

      if (!rule || !connection) {
        continue
      }

      // Send the DM
      await sendInstagramMessage(
        connection as InstagramConnection,
        dm.user_id,
        { text: rule.dm_template }
      )

      // Update dm_sent_count
      await supabase
        .from('instagram_comment_rules')
        .update({
          dm_sent_count: rule.dm_sent_count + 1,
          updated_at: now
        })
        .eq('id', rule.id)

      results.processed++
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      results.errors.push(`DM ${dm.id}: ${message}`)
    }
  }

  return results
}

// =============================================================================
// Analytics
// =============================================================================

/**
 * Gets comment rule analytics
 */
export async function getCommentRuleStats(
  ruleId: string,
  organizationId: string
): Promise<{
  triggerCount: number
  dmSentCount: number
  uniqueUsers: number
  last24Hours: {
    triggers: number
    dmsSent: number
  }
} | null> {
  const supabase = createServiceRoleClient()

  // Get rule
  const { data: rule } = await supabase
    .from('instagram_comment_rules')
    .select('trigger_count, dm_sent_count')
    .eq('id', ruleId)
    .eq('organization_id', organizationId)
    .single()

  if (!rule) {
    return null
  }

  // Get unique users
  const { count: uniqueUsers } = await supabase
    .from('instagram_comment_dm_tracking')
    .select('user_id', { count: 'exact', head: true })
    .eq('instagram_comment_rule_id', ruleId)

  // Get last 24 hours stats
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { count: last24HoursDMs } = await supabase
    .from('instagram_comment_dm_tracking')
    .select('*', { count: 'exact', head: true })
    .eq('instagram_comment_rule_id', ruleId)
    .gte('dm_sent_at', dayAgo)

  return {
    triggerCount: rule.trigger_count,
    dmSentCount: rule.dm_sent_count,
    uniqueUsers: uniqueUsers || 0,
    last24Hours: {
      triggers: last24HoursDMs || 0, // Approximate
      dmsSent: last24HoursDMs || 0
    }
  }
}
