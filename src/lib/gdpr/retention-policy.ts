/**
 * GDPR Data Retention Policy Engine
 *
 * Implements automated data retention policies with configurable periods
 * per data type and organization. Enforces GDPR compliance through scheduled
 * cleanup and retention policy management.
 *
 * Features:
 * - Tenant-specific retention policies
 * - Automated policy enforcement
 * - Expired record identification
 * - Batch deletion with safety limits
 * - Comprehensive audit logging
 *
 * @module gdpr/retention-policy
 */

// @ts-nocheck - Type definitions need review
import { createClient } from '@/lib/supabase/server';
import type {
  DataType,
  DataRetentionPolicy,
  DefaultRetentionPolicy,
  ExpiredRecord,
  RetentionEnforcementResult,
  RetentionPolicyStats,
  CreateRetentionPolicyInput,
  UpdateRetentionPolicyInput
} from './types';

/**
 * Retention Policy Engine
 *
 * Manages data retention policies and automated cleanup for GDPR compliance.
 */
export class RetentionPolicyEngine {
  /**
   * Get retention policy for organization and data type
   */
  static async getRetentionPolicy(
    organizationId: string,
    dataType: DataType
  ): Promise<number> {
    const supabase = await createClient();

    // Check for organization-specific policy
    const { data: orgPolicy } = await supabase
      .from('data_retention_policies')
      .select('retention_days')
      .eq('organization_id', organizationId)
      .eq('data_type', dataType)
      .eq('is_active', true)
      .eq('enforcement_enabled', true)
      .single();

    if (orgPolicy) {
      return orgPolicy.retention_days;
    }

    // Fallback to default policy
    const { data: defaultPolicy } = await supabase
      .from('default_retention_policies')
      .select('retention_days')
      .eq('data_type', dataType)
      .single();

    return defaultPolicy?.retention_days || 365; // Default 1 year
  }

  /**
   * Get all retention policies for an organization
   */
  static async getOrganizationPolicies(
    organizationId: string
  ): Promise<DataRetentionPolicy[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('data_retention_policies')
      .select('*')
      .eq('organization_id', organizationId)
      .order('data_type');

    if (error) {
      console.error('[RetentionPolicy] Error fetching policies:', error);
      throw new Error(`Failed to fetch retention policies: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get all default retention policies
   */
  static async getDefaultPolicies(): Promise<DefaultRetentionPolicy[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('default_retention_policies')
      .select('*')
      .order('data_type');

    if (error) {
      console.error('[RetentionPolicy] Error fetching default policies:', error);
      throw new Error(`Failed to fetch default policies: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create or update retention policy for organization
   */
  static async setRetentionPolicy(
    input: CreateRetentionPolicyInput,
    userId: string
  ): Promise<DataRetentionPolicy> {
    const supabase = await createClient();

    // Check if policy already exists
    const { data: existing } = await supabase
      .from('data_retention_policies')
      .select('id')
      .eq('organization_id', input.organization_id)
      .eq('data_type', input.data_type)
      .single();

    if (existing) {
      // Update existing policy
      const { data, error } = await supabase
        .from('data_retention_policies')
        .update({
          retention_days: input.retention_days,
          enforcement_enabled: input.enforcement_enabled ?? true,
          auto_delete_enabled: input.auto_delete_enabled ?? false,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw new Error(`Failed to update policy: ${error.message}`);
      return data;
    }

    // Create new policy
    const { data, error } = await supabase
      .from('data_retention_policies')
      .insert({
        organization_id: input.organization_id,
        data_type: input.data_type,
        retention_days: input.retention_days,
        enforcement_enabled: input.enforcement_enabled ?? true,
        auto_delete_enabled: input.auto_delete_enabled ?? false,
        created_by: userId
      })
      .select()
      .single();

    if (error) {
      console.error('[RetentionPolicy] Error creating policy:', error);
      throw new Error(`Failed to create retention policy: ${error.message}`);
    }

    console.log(
      `[RetentionPolicy] Created policy for ${input.organization_id}:${input.data_type} - ${input.retention_days} days`
    );

    return data;
  }

  /**
   * Update retention policy
   */
  static async updateRetentionPolicy(
    policyId: string,
    updates: UpdateRetentionPolicyInput
  ): Promise<DataRetentionPolicy> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('data_retention_policies')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', policyId)
      .select()
      .single();

    if (error) {
      console.error('[RetentionPolicy] Error updating policy:', error);
      throw new Error(`Failed to update retention policy: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete retention policy (revert to default)
   */
  static async deleteRetentionPolicy(policyId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('data_retention_policies')
      .delete()
      .eq('id', policyId);

    if (error) {
      console.error('[RetentionPolicy] Error deleting policy:', error);
      throw new Error(`Failed to delete retention policy: ${error.message}`);
    }

    console.log(`[RetentionPolicy] Deleted policy ${policyId}`);
  }

  /**
   * Find expired records based on retention policy
   */
  static async findExpiredRecords(
    organizationId: string,
    dataType: DataType,
    limit: number = 1000
  ): Promise<ExpiredRecord[]> {
    const supabase = await createClient();

    // Use database function for efficient query
    const { data, error } = await supabase.rpc('find_expired_records', {
      p_organization_id: organizationId,
      p_data_type: dataType,
      p_limit: limit
    });

    if (error) {
      console.error('[RetentionPolicy] Error finding expired records:', error);
      throw new Error(`Failed to find expired records: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Enforce retention policy for organization and data type
   */
  static async enforceRetentionPolicy(
    organizationId: string,
    dataType: DataType,
    dryRun: boolean = false
  ): Promise<RetentionEnforcementResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      const supabase = await createClient();

      // Get retention policy
      const retentionDays = await this.getRetentionPolicy(
        organizationId,
        dataType
      );

      console.log(
        `[RetentionPolicy] Enforcing ${dataType} policy for org ${organizationId}: ${retentionDays} days`
      );

      // Find expired records
      const expiredRecords = await this.findExpiredRecords(
        organizationId,
        dataType,
        1000 // Process in batches
      );

      if (expiredRecords.length === 0) {
        console.log(`[RetentionPolicy] No expired ${dataType} found`);

        // Update enforcement timestamp
        if (!dryRun) {
          await supabase
            .from('data_retention_policies')
            .update({ last_enforced_at: new Date().toISOString() })
            .eq('organization_id', organizationId)
            .eq('data_type', dataType);
        }

        return {
          organization_id: organizationId,
          data_type: dataType,
          records_found: 0,
          records_deleted: 0,
          oldest_record_age_days: null,
          enforcement_time_ms: Date.now() - startTime,
          errors
        };
      }

      const oldestAge = Math.max(...expiredRecords.map((r) => r.age_days));

      console.log(
        `[RetentionPolicy] Found ${expiredRecords.length} expired ${dataType} (oldest: ${oldestAge} days)`
      );

      if (dryRun) {
        return {
          organization_id: organizationId,
          data_type: dataType,
          records_found: expiredRecords.length,
          records_deleted: 0,
          oldest_record_age_days: oldestAge,
          enforcement_time_ms: Date.now() - startTime,
          errors
        };
      }

      // Perform soft delete on expired records
      let deletedCount = 0;

      for (const record of expiredRecords) {
        try {
          const tableName = this.getTableNameForDataType(dataType);

          // Soft delete the record
          const { error: deleteError } = await supabase
            .from(tableName as any)
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', record.id)
            .is('deleted_at', null);

          if (deleteError) {
            errors.push(
              `Failed to delete ${tableName}:${record.id}: ${deleteError.message}`
            );
            continue;
          }

          // Log deletion to audit trail
          await supabase.from('deletion_audit_log').insert({
            organization_id: organizationId,
            action_type: 'retention_policy_delete',
            table_name: tableName,
            record_id: record.id,
            deletion_reason: `Retention policy: ${retentionDays} days exceeded (age: ${record.age_days} days)`,
            is_reversible: true,
            legal_basis: 'legal_obligation'
          });

          deletedCount++;
        } catch (err) {
          errors.push(`Error processing record ${record.id}: ${err}`);
        }
      }

      // Update enforcement timestamp
      await supabase
        .from('data_retention_policies')
        .update({ last_enforced_at: new Date().toISOString() })
        .eq('organization_id', organizationId)
        .eq('data_type', dataType);

      console.log(
        `[RetentionPolicy] Deleted ${deletedCount}/${expiredRecords.length} expired ${dataType}`
      );

      return {
        organization_id: organizationId,
        data_type: dataType,
        records_found: expiredRecords.length,
        records_deleted: deletedCount,
        oldest_record_age_days: oldestAge,
        enforcement_time_ms: Date.now() - startTime,
        errors
      };
    } catch (error) {
      console.error('[RetentionPolicy] Enforcement error:', error);
      errors.push(
        error instanceof Error ? error.message : 'Unknown error'
      );

      return {
        organization_id: organizationId,
        data_type: dataType,
        records_found: 0,
        records_deleted: 0,
        oldest_record_age_days: null,
        enforcement_time_ms: Date.now() - startTime,
        errors
      };
    }
  }

  /**
   * Enforce all retention policies for an organization
   */
  static async enforceAllPolicies(
    organizationId: string,
    dryRun: boolean = false
  ): Promise<RetentionEnforcementResult[]> {
    const dataTypes: DataType[] = [
      'messages',
      'contacts',
      'conversations',
      'sessions'
    ];

    const results: RetentionEnforcementResult[] = [];

    for (const dataType of dataTypes) {
      try {
        const result = await this.enforceRetentionPolicy(
          organizationId,
          dataType,
          dryRun
        );
        results.push(result);
      } catch (error) {
        console.error(
          `[RetentionPolicy] Error enforcing ${dataType}:`,
          error
        );
        results.push({
          organization_id: organizationId,
          data_type: dataType,
          records_found: 0,
          records_deleted: 0,
          oldest_record_age_days: null,
          enforcement_time_ms: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error']
        });
      }
    }

    return results;
  }

  /**
   * Get retention policy statistics
   */
  static async getPolicyStats(
    organizationId: string,
    dataType: DataType
  ): Promise<RetentionPolicyStats> {
    const supabase = await createClient();

    // Get retention policy
    const retentionDays = await this.getRetentionPolicy(
      organizationId,
      dataType
    );

    // Get policy enforcement info
    const { data: policyData } = await supabase
      .from('data_retention_policies')
      .select('last_enforced_at')
      .eq('organization_id', organizationId)
      .eq('data_type', dataType)
      .single();

    // Get expired records
    const expiredRecords = await this.findExpiredRecords(
      organizationId,
      dataType,
      10000
    );

    // Get total record count
    const tableName = this.getTableNameForDataType(dataType);
    const { count: totalRecords } = await supabase
      .from(tableName as any)
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    const oldestAge =
      expiredRecords.length > 0
        ? Math.max(...expiredRecords.map((r) => r.age_days))
        : null;

    // Estimate cleanup time (rough: 10ms per record)
    const estimatedCleanupTime = expiredRecords.length * 10;

    return {
      organization_id: organizationId,
      data_type: dataType,
      total_records: totalRecords || 0,
      expired_records: expiredRecords.length,
      oldest_record_age_days: oldestAge,
      retention_days: retentionDays,
      last_enforced_at: policyData?.last_enforced_at || null,
      estimated_cleanup_time_ms: estimatedCleanupTime
    };
  }

  /**
   * Get table name for data type
   */
  private static getTableNameForDataType(dataType: DataType): string {
    const tableMap: Record<DataType, string> = {
      messages: 'messages',
      contacts: 'contacts',
      conversations: 'conversations',
      sessions: 'demo_sessions', // or user_sessions if exists
      audit_logs: 'deletion_audit_log',
      analytics: 'demo_session_activities',
      media_files: 'messages', // Media is referenced in messages
      demo_data: 'demo_sessions'
    };

    return tableMap[dataType] || 'messages';
  }

  /**
   * Validate retention policy configuration
   */
  static validateRetentionDays(
    dataType: DataType,
    retentionDays: number
  ): { valid: boolean; error?: string } {
    // Minimum retention periods
    const minimums: Partial<Record<DataType, number>> = {
      audit_logs: 2555, // 7 years - legal requirement
      messages: 1, // At least 1 day
      contacts: 1,
      conversations: 1
    };

    const minimum = minimums[dataType] || 1;

    if (retentionDays < minimum) {
      return {
        valid: false,
        error: `${dataType} must be retained for at least ${minimum} days`
      };
    }

    // Maximum retention periods (10 years)
    if (retentionDays > 3650) {
      return {
        valid: false,
        error: 'Retention period cannot exceed 10 years (3650 days)'
      };
    }

    return { valid: true };
  }
}

/**
 * Export convenience functions
 */
export const {
  getRetentionPolicy,
  getOrganizationPolicies,
  getDefaultPolicies,
  setRetentionPolicy,
  updateRetentionPolicy,
  deleteRetentionPolicy,
  findExpiredRecords,
  enforceRetentionPolicy,
  enforceAllPolicies,
  getPolicyStats,
  validateRetentionDays
} = RetentionPolicyEngine;
