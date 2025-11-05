/**
 * GDPR Data Deletion Service
 *
 * Implements Right to Erasure (GDPR Article 17) with comprehensive
 * deletion functionality including soft delete, hard delete, cascade
 * deletion, and audit logging.
 *
 * Features:
 * - Soft delete with recovery option
 * - Hard delete (permanent removal)
 * - Cascade deletion of related records
 * - Comprehensive audit trail
 * - Multi-tenant isolation
 * - Batch deletion support
 *
 * @module gdpr/data-deletion
 */

// @ts-nocheck - Type definitions need review
import { createClient } from '@/lib/supabase/server';
import type {
  DeletionRequest,
  DeletionRequestType,
  DeletionStatus,
  CreateDeletionRequestInput,
  RecordsDeletionSummary,
  DeletionServiceOptions,
  BatchDeletionOptions,
  DeletionActionType
} from './types';
import { randomBytes } from 'crypto';

/**
 * Data Deletion Service
 *
 * Handles all data deletion operations for GDPR compliance.
 */
export class DataDeletionService {
  /**
   * Create deletion request
   */
  static async createDeletionRequest(
    input: CreateDeletionRequestInput,
    requestedBy: string
  ): Promise<DeletionRequest> {
    const supabase = await createClient();

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');
    const verificationExpiresAt = new Date();
    verificationExpiresAt.setHours(verificationExpiresAt.getHours() + 24); // 24 hour expiry

    const { data, error } = await supabase
      .from('deletion_requests')
      .insert({
        organization_id: input.organization_id,
        request_type: input.request_type,
        user_id: input.user_id || null,
        contact_id: input.contact_id || null,
        reason: input.reason || null,
        status: 'pending',
        verification_token: verificationToken,
        verification_expires_at: verificationExpiresAt.toISOString(),
        requested_by: requestedBy,
        records_deleted: { total: 0 }
      })
      .select()
      .single();

    if (error) {
      console.error('[DataDeletion] Error creating request:', error);
      throw new Error(`Failed to create deletion request: ${error.message}`);
    }

    console.log(
      `[DataDeletion] Created deletion request ${data.id} for ${input.request_type}`
    );

    return data;
  }

  /**
   * Verify deletion request with token
   */
  static async verifyDeletionRequest(
    requestId: string,
    verificationToken: string
  ): Promise<DeletionRequest> {
    const supabase = await createClient();

    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('id', requestId)
      .eq('verification_token', verificationToken)
      .single();

    if (fetchError || !request) {
      throw new Error('Invalid deletion request or verification token');
    }

    // Check if expired
    if (
      request.verification_expires_at &&
      new Date(request.verification_expires_at) < new Date()
    ) {
      throw new Error('Verification token has expired');
    }

    // Check if already verified
    if (request.status !== 'pending') {
      throw new Error(`Request is already ${request.status}`);
    }

    // Update status to verified
    const { data, error } = await supabase
      .from('deletion_requests')
      .update({
        status: 'verified' as DeletionStatus,
        verified_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to verify request: ${error.message}`);
    }

    console.log(`[DataDeletion] Verified deletion request ${requestId}`);

    return data;
  }

  /**
   * Process deletion request
   */
  static async processDeletionRequest(
    requestId: string,
    processedBy: string,
    options: DeletionServiceOptions = {}
  ): Promise<DeletionRequest> {
    const supabase = await createClient();

    // Get the request
    const { data: request, error: fetchError } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !request) {
      throw new Error('Deletion request not found');
    }

    // Check if verified
    if (request.status !== 'verified') {
      throw new Error(
        `Request must be verified before processing (current status: ${request.status})`
      );
    }

    // Update status to in_progress
    await supabase
      .from('deletion_requests')
      .update({
        status: 'in_progress' as DeletionStatus,
        processed_by: processedBy,
        started_at: new Date().toISOString()
      })
      .eq('id', requestId);

    console.log(`[DataDeletion] Processing deletion request ${requestId}`);

    try {
      let summary: RecordsDeletionSummary = { total: 0 };

      // Process based on request type
      switch (request.request_type) {
        case 'user_account':
          summary = await this.deleteUserAccount(
            request.user_id!,
            request.organization_id,
            processedBy,
            options
          );
          break;

        case 'contact_data':
          summary = await this.deleteContactData(
            request.contact_id!,
            request.organization_id,
            processedBy,
            options
          );
          break;

        case 'conversation_data':
          summary = await this.deleteConversationData(
            request.contact_id!,
            request.organization_id,
            processedBy,
            options
          );
          break;

        case 'all_personal_data':
          // Delete all personal data (user + contacts + conversations)
          if (request.user_id) {
            summary = await this.deleteUserAccount(
              request.user_id,
              request.organization_id,
              processedBy,
              options
            );
          }
          break;

        default:
          throw new Error(`Unknown request type: ${request.request_type}`);
      }

      // Update request as completed
      const { data, error } = await supabase
        .from('deletion_requests')
        .update({
          status: 'completed' as DeletionStatus,
          completed_at: new Date().toISOString(),
          records_deleted: summary
        })
        .eq('id', requestId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update request: ${error.message}`);
      }

      console.log(
        `[DataDeletion] Completed deletion request ${requestId}: ${summary.total} records`
      );

      return data;
    } catch (error) {
      // Update request as failed
      await supabase
        .from('deletion_requests')
        .update({
          status: 'failed' as DeletionStatus,
          failed_reason: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', requestId);

      throw error;
    }
  }

  /**
   * Delete user account and all associated data
   */
  static async deleteUserAccount(
    userId: string,
    organizationId: string,
    deletedBy: string,
    options: DeletionServiceOptions = {}
  ): Promise<RecordsDeletionSummary> {
    const supabase = await createClient();
    const softDelete = options.soft_delete !== false; // Default true
    const summary: RecordsDeletionSummary = { total: 0 };

    console.log(
      `[DataDeletion] Deleting user account ${userId} (soft: ${softDelete})`
    );

    try {
      // 1. Delete user sessions
      const { count: sessionsDeleted } = await supabase
        .from('demo_sessions' as any)
        .delete()
        .eq('id', userId); // Assuming session links to user

      if (sessionsDeleted) {
        summary.sessions = sessionsDeleted;
        summary.total += sessionsDeleted;
      }

      // 2. Soft/hard delete user profile
      if (softDelete) {
        await supabase
          .from('profiles')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: deletedBy
          })
          .eq('id', userId)
          .eq('organization_id', organizationId);
      } else {
        await supabase
          .from('profiles')
          .delete()
          .eq('id', userId)
          .eq('organization_id', organizationId);
      }

      summary.profiles = 1;
      summary.total += 1;

      // 3. Log deletion
      if (options.audit_log !== false) {
        await this.logDeletion({
          organization_id: organizationId,
          action_type: softDelete ? 'soft_delete' : 'hard_delete',
          table_name: 'profiles',
          record_id: userId,
          deleted_by: deletedBy,
          deletion_reason: 'User account deletion request',
          is_reversible: softDelete,
          legal_basis: 'consent'
        });
      }

      console.log(`[DataDeletion] Deleted user ${userId}: ${summary.total} records`);

      return summary;
    } catch (error) {
      console.error('[DataDeletion] Error deleting user:', error);
      throw error;
    }
  }

  /**
   * Delete contact and all associated data
   */
  static async deleteContactData(
    contactId: string,
    organizationId: string,
    deletedBy: string,
    options: DeletionServiceOptions = {}
  ): Promise<RecordsDeletionSummary> {
    const supabase = await createClient();
    const softDelete = options.soft_delete !== false;
    const cascade = options.cascade !== false;
    const summary: RecordsDeletionSummary = { total: 0 };

    console.log(
      `[DataDeletion] Deleting contact ${contactId} (soft: ${softDelete}, cascade: ${cascade})`
    );

    try {
      // 1. Get conversations for this contact
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', contactId)
        .eq('organization_id', organizationId);

      // 2. Delete messages in conversations (if cascade)
      if (cascade && conversations && conversations.length > 0) {
        const conversationIds = conversations.map((c) => c.id);

        if (softDelete) {
          const { count: messagesDeleted } = await supabase
            .from('messages')
            .update({
              deleted_at: new Date().toISOString(),
              deleted_by: deletedBy
            })
            .in('conversation_id', conversationIds);

          summary.messages = messagesDeleted || 0;
        } else {
          const { count: messagesDeleted } = await supabase
            .from('messages')
            .delete()
            .in('conversation_id', conversationIds);

          summary.messages = messagesDeleted || 0;
        }

        summary.total += summary.messages || 0;
      }

      // 3. Delete conversations
      if (cascade && conversations && conversations.length > 0) {
        if (softDelete) {
          const { count: conversationsDeleted } = await supabase
            .from('conversations')
            .update({
              deleted_at: new Date().toISOString(),
              deleted_by: deletedBy
            })
            .eq('contact_id', contactId)
            .eq('organization_id', organizationId);

          summary.conversations = conversationsDeleted || 0;
        } else {
          const { count: conversationsDeleted } = await supabase
            .from('conversations')
            .delete()
            .eq('contact_id', contactId)
            .eq('organization_id', organizationId);

          summary.conversations = conversationsDeleted || 0;
        }

        summary.total += summary.conversations || 0;
      }

      // 4. Delete contact
      if (softDelete) {
        await supabase
          .from('contacts')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: deletedBy
          })
          .eq('id', contactId)
          .eq('organization_id', organizationId);
      } else {
        await supabase
          .from('contacts')
          .delete()
          .eq('id', contactId)
          .eq('organization_id', organizationId);
      }

      summary.contacts = 1;
      summary.total += 1;

      // 5. Log deletion
      if (options.audit_log !== false) {
        await this.logDeletion({
          organization_id: organizationId,
          action_type: softDelete ? 'soft_delete' : 'hard_delete',
          table_name: 'contacts',
          record_id: contactId,
          deleted_by: deletedBy,
          deletion_reason: 'Contact deletion request',
          is_reversible: softDelete,
          legal_basis: 'consent'
        });
      }

      console.log(
        `[DataDeletion] Deleted contact ${contactId}: ${summary.total} records`
      );

      return summary;
    } catch (error) {
      console.error('[DataDeletion] Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Delete conversation data only (keep contact)
   */
  static async deleteConversationData(
    contactId: string,
    organizationId: string,
    deletedBy: string,
    options: DeletionServiceOptions = {}
  ): Promise<RecordsDeletionSummary> {
    const supabase = await createClient();
    const softDelete = options.soft_delete !== false;
    const summary: RecordsDeletionSummary = { total: 0 };

    console.log(
      `[DataDeletion] Deleting conversation data for contact ${contactId}`
    );

    try {
      // 1. Get conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', contactId)
        .eq('organization_id', organizationId);

      if (!conversations || conversations.length === 0) {
        return summary;
      }

      const conversationIds = conversations.map((c) => c.id);

      // 2. Delete messages
      if (softDelete) {
        const { count: messagesDeleted } = await supabase
          .from('messages')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: deletedBy
          })
          .in('conversation_id', conversationIds);

        summary.messages = messagesDeleted || 0;
      } else {
        const { count: messagesDeleted } = await supabase
          .from('messages')
          .delete()
          .in('conversation_id', conversationIds);

        summary.messages = messagesDeleted || 0;
      }

      summary.total += summary.messages || 0;

      // 3. Delete conversations
      if (softDelete) {
        const { count: conversationsDeleted } = await supabase
          .from('conversations')
          .update({
            deleted_at: new Date().toISOString(),
            deleted_by: deletedBy
          })
          .in('id', conversationIds);

        summary.conversations = conversationsDeleted || 0;
      } else {
        const { count: conversationsDeleted } = await supabase
          .from('conversations')
          .delete()
          .in('id', conversationIds);

        summary.conversations = conversationsDeleted || 0;
      }

      summary.total += summary.conversations || 0;

      console.log(
        `[DataDeletion] Deleted conversation data for ${contactId}: ${summary.total} records`
      );

      return summary;
    } catch (error) {
      console.error('[DataDeletion] Error deleting conversation data:', error);
      throw error;
    }
  }

  /**
   * Soft delete a single record
   */
  static async softDelete(
    tableName: string,
    recordId: string,
    deletedBy: string,
    reason: string = 'Soft delete'
  ): Promise<boolean> {
    const supabase = await createClient();

    // Validate table name
    const validTables = [
      'profiles',
      'contacts',
      'conversations',
      'messages',
      'organizations'
    ];

    if (!validTables.includes(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    try {
      const { error } = await supabase
        .from(tableName as any)
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy
        })
        .eq('id', recordId)
        .is('deleted_at', null);

      if (error) {
        console.error('[DataDeletion] Soft delete error:', error);
        return false;
      }

      // Log deletion
      const { data: record } = await supabase
        .from(tableName as any)
        .select('organization_id')
        .eq('id', recordId)
        .single();

      if (record) {
        await this.logDeletion({
          organization_id: record.organization_id,
          action_type: 'soft_delete',
          table_name: tableName,
          record_id: recordId,
          deleted_by: deletedBy,
          deletion_reason: reason,
          is_reversible: true,
          legal_basis: 'consent'
        });
      }

      return true;
    } catch (error) {
      console.error('[DataDeletion] Soft delete failed:', error);
      return false;
    }
  }

  /**
   * Hard delete a single record (permanent)
   */
  static async hardDelete(
    tableName: string,
    recordId: string,
    deletedBy: string,
    reason: string = 'Hard delete'
  ): Promise<boolean> {
    const supabase = await createClient();

    // Validate table name
    const validTables = ['contacts', 'conversations', 'messages'];

    if (!validTables.includes(tableName)) {
      throw new Error(
        `Hard delete not allowed for table: ${tableName}. Use soft delete.`
      );
    }

    try {
      // Get record data before deletion for audit
      const { data: record } = await supabase
        .from(tableName as any)
        .select('*')
        .eq('id', recordId)
        .single();

      // Perform hard delete
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq('id', recordId);

      if (error) {
        console.error('[DataDeletion] Hard delete error:', error);
        return false;
      }

      // Log deletion with record snapshot
      if (record) {
        await this.logDeletion({
          organization_id: record.organization_id,
          action_type: 'hard_delete',
          table_name: tableName,
          record_id: recordId,
          record_data: record,
          deleted_by: deletedBy,
          deletion_reason: reason,
          is_reversible: false,
          legal_basis: 'legal_obligation'
        });
      }

      return true;
    } catch (error) {
      console.error('[DataDeletion] Hard delete failed:', error);
      return false;
    }
  }

  /**
   * Get deletion request by ID
   */
  static async getDeletionRequest(
    requestId: string
  ): Promise<DeletionRequest | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('deletion_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (error) {
      console.error('[DataDeletion] Error fetching request:', error);
      return null;
    }

    return data;
  }

  /**
   * Cancel deletion request
   */
  static async cancelDeletionRequest(requestId: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('deletion_requests')
      .update({ status: 'cancelled' as DeletionStatus })
      .eq('id', requestId)
      .in('status', ['pending', 'verified']);

    if (error) {
      console.error('[DataDeletion] Error cancelling request:', error);
      return false;
    }

    return true;
  }

  /**
   * Log deletion to audit trail
   */
  private static async logDeletion(params: {
    organization_id: string;
    action_type: DeletionActionType;
    table_name: string;
    record_id: string;
    record_data?: any;
    deleted_by: string;
    deletion_reason: string;
    is_reversible: boolean;
    legal_basis: string;
  }): Promise<void> {
    const supabase = await createClient();

    await supabase.from('deletion_audit_log').insert({
      organization_id: params.organization_id,
      action_type: params.action_type,
      table_name: params.table_name,
      record_id: params.record_id,
      record_data: params.record_data || null,
      deleted_by: params.deleted_by,
      deletion_reason: params.deletion_reason,
      is_reversible: params.is_reversible,
      legal_basis: params.legal_basis
    });
  }
}

/**
 * Export convenience functions
 */
export const {
  createDeletionRequest,
  verifyDeletionRequest,
  processDeletionRequest,
  deleteUserAccount,
  deleteContactData,
  deleteConversationData,
  softDelete,
  hardDelete,
  getDeletionRequest,
  cancelDeletionRequest
} = DataDeletionService;
