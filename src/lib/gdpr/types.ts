/**
 * GDPR Compliance Types
 *
 * Type definitions for GDPR data retention, deletion, and export functionality.
 * Implements: Right to access, Right to erasure, Right to data portability
 *
 * @module gdpr/types
 */

/**
 * Data types subject to retention policies
 */
export type DataType =
  | 'messages'
  | 'contacts'
  | 'conversations'
  | 'sessions'
  | 'audit_logs'
  | 'analytics'
  | 'media_files'
  | 'demo_data';

/**
 * Deletion request types
 */
export type DeletionRequestType =
  | 'user_account'        // Delete entire user account
  | 'contact_data'        // Delete specific contact
  | 'conversation_data'   // Delete conversation history
  | 'all_personal_data';  // Delete all personal data (GDPR Right to Erasure)

/**
 * Deletion request status
 */
export type DeletionStatus =
  | 'pending'       // Request created, awaiting verification
  | 'verified'      // Identity verified, awaiting processing
  | 'in_progress'   // Deletion in progress
  | 'completed'     // Successfully completed
  | 'failed'        // Failed with error
  | 'cancelled';    // Cancelled by user or admin

/**
 * Deletion action types for audit trail
 */
export type DeletionActionType =
  | 'soft_delete'              // Set deleted_at timestamp
  | 'hard_delete'              // Permanently remove from database
  | 'anonymize'                // Replace with anonymized data
  | 'export_before_delete'     // Export data before deletion
  | 'retention_policy_delete'; // Deleted by retention policy

/**
 * GDPR legal basis for processing
 */
export type GDPRLegalBasis =
  | 'consent'             // User consent
  | 'contract'            // Necessary for contract
  | 'legal_obligation'    // Legal requirement
  | 'vital_interests'     // Protect vital interests
  | 'public_task'         // Public interest task
  | 'legitimate_interests'; // Legitimate interests

/**
 * Data retention policy
 */
export interface DataRetentionPolicy {
  id: string;
  organization_id: string | null; // null = system default
  data_type: DataType;
  retention_days: number;
  is_active: boolean;
  enforcement_enabled: boolean;
  auto_delete_enabled: boolean;
  last_enforced_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Default retention policy (system-wide)
 */
export interface DefaultRetentionPolicy {
  id: string;
  data_type: DataType;
  retention_days: number;
  legal_requirement: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Deletion request
 */
export interface DeletionRequest {
  id: string;
  organization_id: string;
  user_id: string | null;
  contact_id: string | null;
  request_type: DeletionRequestType;
  status: DeletionStatus;
  reason: string | null;
  verification_token: string | null;
  verification_expires_at: string | null;
  verified_at: string | null;
  requested_by: string | null;
  processed_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  failed_reason: string | null;
  records_deleted: RecordsDeletionSummary;
  created_at: string;
  updated_at: string;
}

/**
 * Summary of deleted records
 */
export interface RecordsDeletionSummary {
  profiles?: number;
  contacts?: number;
  conversations?: number;
  messages?: number;
  media_files?: number;
  sessions?: number;
  total: number;
}

/**
 * Deletion audit log entry
 */
export interface DeletionAuditLog {
  id: string;
  organization_id: string;
  deletion_request_id: string | null;
  action_type: DeletionActionType;
  table_name: string;
  record_id: string;
  record_data: any | null; // Encrypted snapshot of deleted data
  deleted_by: string | null;
  deletion_reason: string;
  is_reversible: boolean;
  legal_basis: GDPRLegalBasis | null;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
}

/**
 * Retention policy creation input
 */
export interface CreateRetentionPolicyInput {
  organization_id: string;
  data_type: DataType;
  retention_days: number;
  enforcement_enabled?: boolean;
  auto_delete_enabled?: boolean;
}

/**
 * Retention policy update input
 */
export interface UpdateRetentionPolicyInput {
  retention_days?: number;
  is_active?: boolean;
  enforcement_enabled?: boolean;
  auto_delete_enabled?: boolean;
}

/**
 * Deletion request creation input
 */
export interface CreateDeletionRequestInput {
  organization_id: string;
  request_type: DeletionRequestType;
  user_id?: string;
  contact_id?: string;
  reason?: string;
}

/**
 * Expired record information
 */
export interface ExpiredRecord {
  id: string;
  created_at: string;
  age_days: number;
}

/**
 * Data export format
 */
export type ExportFormat = 'json' | 'csv' | 'pdf';

/**
 * Data export request
 */
export interface DataExportRequest {
  organization_id: string;
  user_id?: string;
  contact_id?: string;
  include_messages?: boolean;
  include_contacts?: boolean;
  include_conversations?: boolean;
  include_profile?: boolean;
  format: ExportFormat;
}

/**
 * Data export result
 */
export interface DataExportResult {
  format: ExportFormat;
  filename: string;
  data: any;
  generated_at: string;
  expires_at: string;
  download_url?: string;
  size_bytes: number;
}

/**
 * Personal data package (GDPR Article 20)
 */
export interface PersonalDataPackage {
  user_profile?: any;
  contacts?: any[];
  conversations?: any[];
  messages?: any[];
  media_files?: any[];
  settings?: any;
  metadata: {
    exported_at: string;
    format: string;
    version: string;
    organization: string;
  };
}

/**
 * Retention enforcement result
 */
export interface RetentionEnforcementResult {
  organization_id: string;
  data_type: DataType;
  records_found: number;
  records_deleted: number;
  oldest_record_age_days: number | null;
  enforcement_time_ms: number;
  errors: string[];
}

/**
 * Deletion service options
 */
export interface DeletionServiceOptions {
  soft_delete?: boolean; // Default: true
  cascade?: boolean;     // Delete related records
  create_backup?: boolean; // Export before delete
  audit_log?: boolean;   // Log to audit trail (default: true)
}

/**
 * Data cleanup job data
 */
export interface DataCleanupJobData {
  organization_id: string;
  data_type: DataType;
  dry_run?: boolean;
  batch_size?: number;
}

/**
 * Data cleanup result
 */
export interface DataCleanupResult {
  organization_id: string;
  data_type: DataType;
  records_processed: number;
  records_deleted: number;
  errors: number;
  duration_ms: number;
  completed_at: string;
}

/**
 * GDPR compliance status
 */
export interface GDPRComplianceStatus {
  organization_id: string;
  retention_policies_configured: boolean;
  auto_deletion_enabled: boolean;
  data_types_covered: DataType[];
  pending_deletion_requests: number;
  last_retention_enforcement: string | null;
  compliance_score: number; // 0-100
  issues: string[];
  recommendations: string[];
}

/**
 * Anonymization options
 */
export interface AnonymizationOptions {
  anonymize_name?: boolean;
  anonymize_email?: boolean;
  anonymize_phone?: boolean;
  preserve_analytics?: boolean; // Keep anonymized data for analytics
}

/**
 * Soft delete filter for queries
 */
export interface SoftDeleteFilter {
  include_deleted?: boolean; // Include soft-deleted records
  deleted_only?: boolean;    // Only return deleted records
}

/**
 * Batch deletion options
 */
export interface BatchDeletionOptions {
  batch_size?: number;        // Records per batch (default: 100)
  delay_between_batches?: number; // Milliseconds (default: 1000)
  max_total_records?: number;     // Maximum total deletions
  stop_on_error?: boolean;        // Stop if any deletion fails
}

/**
 * Retention policy statistics
 */
export interface RetentionPolicyStats {
  organization_id: string;
  data_type: DataType;
  total_records: number;
  expired_records: number;
  oldest_record_age_days: number | null;
  retention_days: number;
  last_enforced_at: string | null;
  estimated_cleanup_time_ms: number;
}
