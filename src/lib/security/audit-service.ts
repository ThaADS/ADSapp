/**
 * Audit Service
 * Phase 1.4: Database-backed audit logging for compliance
 *
 * Provides functions to log security-relevant events to the audit_logs table
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { logger } from './logger'

// Event categories for organization
export type AuditEventCategory =
  | 'authentication'
  | 'authorization'
  | 'credential_access'
  | 'data_access'
  | 'data_modification'
  | 'configuration'
  | 'billing'
  | 'user_management'
  | 'maintenance'

// Specific event types
export type AuditEventType =
  // Authentication
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'MFA_ENABLED'
  | 'MFA_DISABLED'
  | 'MFA_CHALLENGE'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET'
  | 'SESSION_CREATED'
  | 'SESSION_INVALIDATED'
  // Authorization
  | 'ACCESS_DENIED'
  | 'ROLE_CHANGE'
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  // Credential Access
  | 'CREDENTIAL_ACCESS'
  | 'CREDENTIAL_CREATED'
  | 'CREDENTIAL_UPDATED'
  | 'CREDENTIAL_DELETED'
  | 'CREDENTIAL_ROTATED'
  | 'API_KEY_GENERATED'
  | 'API_KEY_REVOKED'
  // Data Access
  | 'DATA_EXPORT'
  | 'DATA_IMPORT'
  | 'BULK_OPERATION'
  | 'REPORT_GENERATED'
  // Data Modification
  | 'RECORD_CREATED'
  | 'RECORD_UPDATED'
  | 'RECORD_DELETED'
  | 'BULK_DELETE'
  // Configuration
  | 'SETTINGS_CHANGED'
  | 'INTEGRATION_ENABLED'
  | 'INTEGRATION_DISABLED'
  | 'WEBHOOK_CONFIGURED'
  // Billing
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_UPDATED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'PAYMENT_PROCESSED'
  | 'REFUND_ISSUED'
  // User Management
  | 'USER_INVITED'
  | 'USER_JOINED'
  | 'USER_REMOVED'
  | 'USER_SUSPENDED'
  | 'USER_REACTIVATED'
  // Maintenance
  | 'AUDIT_CLEANUP'
  | 'DATA_PURGE'
  | 'BACKUP_CREATED'

export type AuditActionResult = 'success' | 'failure' | 'denied' | 'error'

export interface AuditLogEntry {
  eventType: AuditEventType
  eventCategory: AuditEventCategory
  action: string
  userId?: string
  organizationId?: string
  resourceType?: string
  resourceId?: string
  actionResult?: AuditActionResult
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  errorMessage?: string
  errorCode?: string
}

/**
 * Logs an audit event to the database
 * Uses service role client to bypass RLS for audit logging
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<string | null> {
  try {
    // Also log to console for immediate visibility
    logger.audit(entry.eventType, entry.action, {
      userId: entry.userId,
      organizationId: entry.organizationId,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      result: entry.actionResult || 'success',
      metadata: entry.metadata,
    })

    // Log to database
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase.rpc('log_audit_event', {
      p_event_type: entry.eventType,
      p_event_category: entry.eventCategory,
      p_action: entry.action,
      p_user_id: entry.userId || null,
      p_organization_id: entry.organizationId || null,
      p_resource_type: entry.resourceType || null,
      p_resource_id: entry.resourceId || null,
      p_action_result: entry.actionResult || 'success',
      p_metadata: entry.metadata || {},
      p_ip_address: entry.ipAddress || null,
      p_user_agent: entry.userAgent || null,
      p_error_message: entry.errorMessage || null,
      p_error_code: entry.errorCode || null,
    })

    if (error) {
      logger.error('Failed to write audit log to database', error)
      return null
    }

    return data as string
  } catch (error) {
    // Audit logging should never throw - just log the failure
    logger.error('Audit logging failed', error)
    return null
  }
}

/**
 * Convenience functions for common audit events
 */
export const auditEvents = {
  // Authentication events
  async loginSuccess(userId: string, ipAddress?: string, userAgent?: string) {
    return logAuditEvent({
      eventType: 'LOGIN',
      eventCategory: 'authentication',
      action: 'user_login',
      userId,
      actionResult: 'success',
      ipAddress,
      userAgent,
    })
  },

  async loginFailed(email: string, reason: string, ipAddress?: string) {
    return logAuditEvent({
      eventType: 'LOGIN_FAILED',
      eventCategory: 'authentication',
      action: 'user_login',
      actionResult: 'failure',
      metadata: { email_prefix: email.split('@')[0]?.slice(0, 3) + '***', reason },
      ipAddress,
    })
  },

  async logout(userId: string) {
    return logAuditEvent({
      eventType: 'LOGOUT',
      eventCategory: 'authentication',
      action: 'user_logout',
      userId,
      actionResult: 'success',
    })
  },

  // Credential access events
  async credentialAccess(
    userId: string,
    organizationId: string,
    credentialType: string,
    purpose: string,
    success: boolean
  ) {
    return logAuditEvent({
      eventType: 'CREDENTIAL_ACCESS',
      eventCategory: 'credential_access',
      action: 'decrypt_credential',
      userId,
      organizationId,
      resourceType: 'credential',
      actionResult: success ? 'success' : 'failure',
      metadata: { credentialType, purpose },
    })
  },

  // Authorization events
  async accessDenied(
    userId: string,
    resourceType: string,
    resourceId: string,
    requiredPermission: string
  ) {
    return logAuditEvent({
      eventType: 'ACCESS_DENIED',
      eventCategory: 'authorization',
      action: 'access_check',
      userId,
      resourceType,
      resourceId,
      actionResult: 'denied',
      metadata: { requiredPermission },
    })
  },

  async roleChange(
    userId: string,
    targetUserId: string,
    organizationId: string,
    oldRole: string,
    newRole: string
  ) {
    return logAuditEvent({
      eventType: 'ROLE_CHANGE',
      eventCategory: 'authorization',
      action: 'change_role',
      userId,
      organizationId,
      resourceType: 'user',
      resourceId: targetUserId,
      actionResult: 'success',
      metadata: { oldRole, newRole },
    })
  },

  // Data events
  async dataExport(
    userId: string,
    organizationId: string,
    exportType: string,
    recordCount: number
  ) {
    return logAuditEvent({
      eventType: 'DATA_EXPORT',
      eventCategory: 'data_access',
      action: 'export_data',
      userId,
      organizationId,
      resourceType: exportType,
      actionResult: 'success',
      metadata: { recordCount },
    })
  },

  async bulkOperation(
    userId: string,
    organizationId: string,
    operation: string,
    resourceType: string,
    affectedCount: number
  ) {
    return logAuditEvent({
      eventType: 'BULK_OPERATION',
      eventCategory: 'data_modification',
      action: operation,
      userId,
      organizationId,
      resourceType,
      actionResult: 'success',
      metadata: { affectedCount },
    })
  },

  // Configuration events
  async settingsChanged(
    userId: string,
    organizationId: string,
    settingName: string,
    changedFields: string[]
  ) {
    return logAuditEvent({
      eventType: 'SETTINGS_CHANGED',
      eventCategory: 'configuration',
      action: 'update_settings',
      userId,
      organizationId,
      resourceType: 'settings',
      resourceId: settingName,
      actionResult: 'success',
      metadata: { changedFields },
    })
  },

  // User management events
  async userInvited(
    inviterId: string,
    organizationId: string,
    invitedEmail: string,
    role: string
  ) {
    return logAuditEvent({
      eventType: 'USER_INVITED',
      eventCategory: 'user_management',
      action: 'invite_user',
      userId: inviterId,
      organizationId,
      resourceType: 'user',
      actionResult: 'success',
      metadata: {
        invitedEmailPrefix: invitedEmail.split('@')[0]?.slice(0, 3) + '***',
        role,
      },
    })
  },

  async userRemoved(
    removerId: string,
    organizationId: string,
    removedUserId: string,
    reason?: string
  ) {
    return logAuditEvent({
      eventType: 'USER_REMOVED',
      eventCategory: 'user_management',
      action: 'remove_user',
      userId: removerId,
      organizationId,
      resourceType: 'user',
      resourceId: removedUserId,
      actionResult: 'success',
      metadata: { reason },
    })
  },
}

export default auditEvents
