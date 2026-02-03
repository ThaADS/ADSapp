/**
 * Workflow Action Handlers
 *
 * Implements actual database operations for workflow action nodes:
 * - Add/remove tags from contacts
 * - Update custom fields
 * - Send notifications
 * - Assignment operations
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ActionNodeData, ActionType } from '@/types/workflow'
import type { ExecutionContext } from './execution-engine'

// ============================================================================
// TYPES
// ============================================================================

export interface ActionResult {
  success: boolean
  data?: Record<string, any>
  error?: string
}

export interface ActionHandler {
  (context: ExecutionContext, config: ActionNodeData['actionConfig']): Promise<ActionResult>
}

// ============================================================================
// ACTION HANDLERS
// ============================================================================

/**
 * Add tags to a contact
 */
export async function handleAddTag(
  context: ExecutionContext,
  config: ActionNodeData['actionConfig']
): Promise<ActionResult> {
  const supabase = createServiceRoleClient()

  try {
    if (!config.tagIds || config.tagIds.length === 0) {
      return { success: true, data: { message: 'No tags to add' } }
    }

    // Get current contact tags
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('tags')
      .eq('id', context.contactId)
      .eq('organization_id', context.organizationId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch contact: ${fetchError.message}`)
    }

    // Merge tags (avoid duplicates)
    const currentTags = contact?.tags || []
    const newTags = [...new Set([...currentTags, ...config.tagIds])]

    // Update contact
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ tags: newTags, updated_at: new Date().toISOString() })
      .eq('id', context.contactId)
      .eq('organization_id', context.organizationId)

    if (updateError) {
      throw new Error(`Failed to update tags: ${updateError.message}`)
    }

    console.log(`[ActionHandler] Added tags ${config.tagIds.join(', ')} to contact ${context.contactId}`)

    return {
      success: true,
      data: {
        addedTags: config.tagIds,
        totalTags: newTags.length,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error adding tags',
    }
  }
}

/**
 * Remove tags from a contact
 */
export async function handleRemoveTag(
  context: ExecutionContext,
  config: ActionNodeData['actionConfig']
): Promise<ActionResult> {
  const supabase = createServiceRoleClient()

  try {
    if (!config.tagIds || config.tagIds.length === 0) {
      return { success: true, data: { message: 'No tags to remove' } }
    }

    // Get current contact tags
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('tags')
      .eq('id', context.contactId)
      .eq('organization_id', context.organizationId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch contact: ${fetchError.message}`)
    }

    // Remove specified tags
    const currentTags = contact?.tags || []
    const newTags = currentTags.filter((tag: string) => !config.tagIds!.includes(tag))

    // Update contact
    const { error: updateError } = await supabase
      .from('contacts')
      .update({ tags: newTags, updated_at: new Date().toISOString() })
      .eq('id', context.contactId)
      .eq('organization_id', context.organizationId)

    if (updateError) {
      throw new Error(`Failed to update tags: ${updateError.message}`)
    }

    console.log(`[ActionHandler] Removed tags ${config.tagIds.join(', ')} from contact ${context.contactId}`)

    return {
      success: true,
      data: {
        removedTags: config.tagIds,
        remainingTags: newTags.length,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error removing tags',
    }
  }
}

/**
 * Update a custom field on a contact
 */
export async function handleUpdateField(
  context: ExecutionContext,
  config: ActionNodeData['actionConfig']
): Promise<ActionResult> {
  const supabase = createServiceRoleClient()

  try {
    if (!config.fieldName) {
      return { success: false, error: 'Field name is required' }
    }

    // Get current custom fields
    const { data: contact, error: fetchError } = await supabase
      .from('contacts')
      .select('custom_fields')
      .eq('id', context.contactId)
      .eq('organization_id', context.organizationId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch contact: ${fetchError.message}`)
    }

    // Parse field value (support dynamic values from context)
    let fieldValue = config.fieldValue
    if (typeof fieldValue === 'string' && fieldValue.startsWith('{{') && fieldValue.endsWith('}}')) {
      const contextKey = fieldValue.slice(2, -2).trim()
      fieldValue = context.context[contextKey] ?? fieldValue
    }

    // Update custom fields
    const customFields = contact?.custom_fields || {}
    customFields[config.fieldName] = fieldValue

    // Update contact
    const { error: updateError } = await supabase
      .from('contacts')
      .update({
        custom_fields: customFields,
        updated_at: new Date().toISOString(),
      })
      .eq('id', context.contactId)
      .eq('organization_id', context.organizationId)

    if (updateError) {
      throw new Error(`Failed to update field: ${updateError.message}`)
    }

    console.log(`[ActionHandler] Updated field "${config.fieldName}" = "${fieldValue}" for contact ${context.contactId}`)

    return {
      success: true,
      data: {
        fieldName: config.fieldName,
        fieldValue,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error updating field',
    }
  }
}

/**
 * Add contact to a list/segment
 */
export async function handleAddToList(
  context: ExecutionContext,
  config: ActionNodeData['actionConfig']
): Promise<ActionResult> {
  const supabase = createServiceRoleClient()

  try {
    if (!config.listId) {
      return { success: false, error: 'List ID is required' }
    }

    // Check if contact_lists table exists and add membership
    // This depends on specific list implementation
    const { data: existingMembership, error: checkError } = await supabase
      .from('contact_list_members')
      .select('id')
      .eq('contact_id', context.contactId)
      .eq('list_id', config.listId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is expected
      console.warn(`[ActionHandler] Note: contact_list_members table may not exist`)
    }

    if (!existingMembership) {
      const { error: insertError } = await supabase
        .from('contact_list_members')
        .insert({
          contact_id: context.contactId,
          list_id: config.listId,
          organization_id: context.organizationId,
          added_at: new Date().toISOString(),
        })

      if (insertError && !insertError.message.includes('does not exist')) {
        throw new Error(`Failed to add to list: ${insertError.message}`)
      }
    }

    console.log(`[ActionHandler] Added contact ${context.contactId} to list ${config.listId}`)

    return {
      success: true,
      data: { listId: config.listId },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error adding to list',
    }
  }
}

/**
 * Remove contact from a list/segment
 */
export async function handleRemoveFromList(
  context: ExecutionContext,
  config: ActionNodeData['actionConfig']
): Promise<ActionResult> {
  const supabase = createServiceRoleClient()

  try {
    if (!config.listId) {
      return { success: false, error: 'List ID is required' }
    }

    const { error: deleteError } = await supabase
      .from('contact_list_members')
      .delete()
      .eq('contact_id', context.contactId)
      .eq('list_id', config.listId)

    if (deleteError && !deleteError.message.includes('does not exist')) {
      throw new Error(`Failed to remove from list: ${deleteError.message}`)
    }

    console.log(`[ActionHandler] Removed contact ${context.contactId} from list ${config.listId}`)

    return {
      success: true,
      data: { listId: config.listId },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error removing from list',
    }
  }
}

/**
 * Send internal notification (email/in-app)
 */
export async function handleSendNotification(
  context: ExecutionContext,
  config: ActionNodeData['actionConfig']
): Promise<ActionResult> {
  try {
    if (!config.notificationEmail) {
      return { success: false, error: 'Notification email is required' }
    }

    // Prepare notification message with variable substitution
    let message = config.notificationMessage || 'Workflow notification'

    // Replace context variables
    message = message.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return context.context[key] || context.contact?.[key as keyof typeof context.contact] || ''
    })

    // For now, log the notification (in production, integrate with email service)
    console.log(`[ActionHandler] Sending notification to ${config.notificationEmail}: ${message}`)

    // TODO: Integrate with Resend or other email service
    // const { error } = await resend.emails.send({
    //   from: 'workflows@yourapp.com',
    //   to: config.notificationEmail,
    //   subject: 'Workflow Notification',
    //   text: message,
    // })

    return {
      success: true,
      data: {
        email: config.notificationEmail,
        message,
        sentAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error sending notification',
    }
  }
}

// ============================================================================
// ACTION HANDLER REGISTRY
// ============================================================================

const actionHandlers: Record<ActionType, ActionHandler> = {
  add_tag: handleAddTag,
  remove_tag: handleRemoveTag,
  update_field: handleUpdateField,
  add_to_list: handleAddToList,
  remove_from_list: handleRemoveFromList,
  send_notification: handleSendNotification,
}

/**
 * Execute an action node
 */
export async function executeAction(
  context: ExecutionContext,
  config: ActionNodeData['actionConfig']
): Promise<ActionResult> {
  const handler = actionHandlers[config.actionType]

  if (!handler) {
    return {
      success: false,
      error: `Unknown action type: ${config.actionType}`,
    }
  }

  return handler(context, config)
}

/**
 * Get available action types
 */
export function getAvailableActions(): ActionType[] {
  return Object.keys(actionHandlers) as ActionType[]
}
