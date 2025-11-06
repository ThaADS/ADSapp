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
  | 'demo_data'

/**
 * Deletion request types
 */
export type DeletionRequestType =
  | 'user_account' // Delete entire user account
  | 'contact_data' // Delete specific contact
  | 'conversation_data' // Delete conversation history
  | 'all_personal_data' // Delete all personal data (GDPR Right to Erasure)

/**
 * Deletion request status
 */
export type DeletionStatus =
  | 'pending' // Request created, awaiting verification
  | 'verified' // Identity verified, awaiting processing
  | 'in_progress' // Deletion in progress
  | 'completed' // Successfully completed
  | 'failed' // Failed with error
  | 'cancelled' // Cancelled by user or admin

/**
 * Deletion action types for audit trail
 */
export type DeletionActionType =
  | 'soft_delete' // Set deleted_at timestamp
  | 'hard_delete' // Permanently remove from database
  | 'anonymize' // Replace with anonymized data
  | 'export_before_delete' // Export data before deletion
  | 'retention_policy_delete' // Deleted by retention policy

/**
 * GDPR legal basis for processing
 */
export type GDPRLegalBasis =
  | 'consent' // User consent
  | 'contract' // Necessary for contract
  | 'legal_obligation' // Legal requirement
  | 'vital_interests' // Protect vital interests
  | 'public_task' // Public interest task
  | 'legitimate_interests' // Legitimate interests

/**
 * Data retention policy
 */
export interface DataRetentionPolicy {
  id: string
  organization_id: string | null // null = system default
  data_type: DataType
  retention_days: number
  is_active: boolean
  enforcement_enabled: boolean
  auto_delete_enabled: boolean
  last_enforced_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Default retention policy (system-wide)
 */
export interface DefaultRetentionPolicy {
  id: string
  data_type: DataType
  retention_days: number
  legal_requirement: boolean
  description: string | null
  created_at: string
  updated_at: string
}

/**
 * Deletion request
 */
export interface DeletionRequest {
  id: string
  organization_id: string
  user_id: string | null
  contact_id: string | null
  request_type: DeletionRequestType
  status: DeletionStatus
  reason: string | null
  verification_token: string | null
  verification_expires_at: string | null
  verified_at: string | null
  requested_by: string | null
  processed_by: string | null
  started_at: string | null
  completed_at: string | null
  failed_reason: string | null
  records_deleted: RecordsDeletionSummary
  created_at: string
  updated_at: string
}

/**
 * Summary of deleted records
 */
export interface RecordsDeletionSummary {
  profiles?: number
  contacts?: number
  conversations?: number
  messages?: number
  media_files?: number
  sessions?: number
  total: number
}

/**
 * Deletion audit log entry
 */
export interface DeletionAuditLog {
  id: string
  organization_id: string
  deletion_request_id: string | null
  action_type: DeletionActionType
  table_name: string
  record_id: string
  record_data: any | null // Encrypted snapshot of deleted data
  deleted_by: string | null
  deletion_reason: string
  is_reversible: boolean
  legal_basis: GDPRLegalBasis | null
  created_at: string
  ip_address: string | null
  user_agent: string | null
}

/**
 * Retention policy creation input
 */
export interface CreateRetentionPolicyInput {
  organization_id: string
  data_type: DataType
  retention_days: number
  enforcement_enabled?: boolean
  auto_delete_enabled?: boolean
}

/**
 * Retention policy update input
 */
export interface UpdateRetentionPolicyInput {
  retention_days?: number
  is_active?: boolean
  enforcement_enabled?: boolean
  auto_delete_enabled?: boolean
}

/**
 * Deletion request creation input
 */
export interface CreateDeletionRequestInput {
  organization_id: string
  request_type: DeletionRequestType
  user_id?: string
  contact_id?: string
  reason?: string
}

/**
 * Expired record information
 */
export interface ExpiredRecord {
  id: string
  created_at: string
  age_days: number
}

/**
 * Data export format
 */
export type ExportFormat = 'json' | 'csv' | 'pdf'

/**
 * Data export request
 */
export interface DataExportRequest {
  organization_id: string
  user_id?: string
  contact_id?: string
  include_messages?: boolean
  include_contacts?: boolean
  include_conversations?: boolean
  include_profile?: boolean
  format: ExportFormat
}

/**
 * Data export result
 */
export interface DataExportResult {
  format: ExportFormat
  filename: string
  data: any
  generated_at: string
  expires_at: string
  download_url?: string
  size_bytes: number
}

/**
 * Personal data package (GDPR Article 20)
 */
export interface PersonalDataPackage {
  user_profile?: any
  contacts?: any[]
  conversations?: any[]
  messages?: any[]
  media_files?: any[]
  settings?: any
  metadata: {
    exported_at: string
    format: string
    version: string
    organization: string
  }
}

/**
 * Retention enforcement result
 */
export interface RetentionEnforcementResult {
  organization_id: string
  data_type: DataType
  records_found: number
  records_deleted: number
  oldest_record_age_days: number | null
  enforcement_time_ms: number
  errors: string[]
}

/**
 * Deletion service options
 */
export interface DeletionServiceOptions {
  soft_delete?: boolean // Default: true
  cascade?: boolean // Delete related records
  create_backup?: boolean // Export before delete
  audit_log?: boolean // Log to audit trail (default: true)
}

/**
 * Data cleanup job data
 */
export interface DataCleanupJobData {
  organization_id: string
  data_type: DataType
  dry_run?: boolean
  batch_size?: number
}

/**
 * Data cleanup result
 */
export interface DataCleanupResult {
  organization_id: string
  data_type: DataType
  records_processed: number
  records_deleted: number
  errors: number
  duration_ms: number
  completed_at: string
}

/**
 * GDPR compliance status
 */
export interface GDPRComplianceStatus {
  organization_id: string
  retention_policies_configured: boolean
  auto_deletion_enabled: boolean
  data_types_covered: DataType[]
  pending_deletion_requests: number
  last_retention_enforcement: string | null
  compliance_score: number // 0-100
  issues: string[]
  recommendations: string[]
}

/**
 * Anonymization options
 */
export interface AnonymizationOptions {
  anonymize_name?: boolean
  anonymize_email?: boolean
  anonymize_phone?: boolean
  preserve_analytics?: boolean // Keep anonymized data for analytics
}

/**
 * Soft delete filter for queries
 */
export interface SoftDeleteFilter {
  include_deleted?: boolean // Include soft-deleted records
  deleted_only?: boolean // Only return deleted records
}

/**
 * Batch deletion options
 */
export interface BatchDeletionOptions {
  batch_size?: number // Records per batch (default: 100)
  delay_between_batches?: number // Milliseconds (default: 1000)
  max_total_records?: number // Maximum total deletions
  stop_on_error?: boolean // Stop if any deletion fails
}

/**
 * Retention policy statistics
 */
export interface RetentionPolicyStats {
  organization_id: string
  data_type: DataType
  total_records: number
  expired_records: number
  oldest_record_age_days: number | null
  retention_days: number
  last_enforced_at: string | null
  estimated_cleanup_time_ms: number
}

// ============================================================================
// ENHANCED GDPR COMPLIANCE TYPES (Phase 5, Week 31-34)
// ============================================================================

/**
 * Data Subject Request Types (GDPR Articles 15-22)
 */
export type DSRType =
  | 'access' // Article 15: Right to access
  | 'rectification' // Article 16: Right to rectification
  | 'erasure' // Article 17: Right to erasure (right to be forgotten)
  | 'portability' // Article 20: Right to data portability
  | 'restriction' // Article 18: Right to restriction of processing
  | 'objection' // Article 21: Right to object

/**
 * DSR Status
 */
export type DSRStatus =
  | 'pending'
  | 'verification'
  | 'verified'
  | 'processing'
  | 'completed'
  | 'rejected'
  | 'cancelled'

/**
 * Data Subject Request
 */
export interface DataSubjectRequest {
  id: string
  organization_id: string
  user_email: string
  user_id?: string
  requester_name?: string
  request_type: DSRType
  status: DSRStatus
  verification_method?: string
  verification_token?: string
  verification_completed_at?: string
  request_data?: any
  request_reason?: string
  assigned_to?: string
  processing_started_at?: string
  processing_notes?: string
  export_file_path?: string
  export_file_size_bytes?: number
  export_generated_at?: string
  export_expires_at?: string
  completed_at?: string
  completion_notes?: string
  rejection_reason?: string
  due_date: string
  requested_at: string
  updated_at: string
  ip_address?: string
  user_agent?: string
}

/**
 * Consent Purpose
 */
export interface ConsentPurpose {
  id: string
  organization_id: string
  purpose_code: string
  purpose_name: string
  purpose_description: string
  purpose_category: 'essential' | 'functional' | 'analytics' | 'marketing'
  legal_basis: GDPRLegalBasis
  required: boolean
  default_granted: boolean
  requires_opt_in: boolean
  data_categories: string[]
  data_recipients?: string[]
  retention_period: string
  consent_text: string
  consent_text_version: string
  privacy_policy_url?: string
  active: boolean
  created_at: string
  updated_at: string
}

/**
 * Consent Record
 */
export interface ConsentRecord {
  id: string
  organization_id: string
  user_id?: string
  user_email: string
  purpose_id: string
  purpose_code: string
  granted: boolean
  granted_at?: string
  withdrawn_at?: string
  consent_method: string
  consent_text: string
  consent_version: string
  ip_address?: string
  user_agent?: string
  page_url?: string
  recorded_at: string
  updated_at: string
}

/**
 * Processing Activity (ROPA - Record of Processing Activities)
 */
export interface ProcessingActivity {
  id: string
  organization_id: string
  activity_code: string
  activity_name: string
  activity_description: string
  processing_purpose: string
  legal_basis: GDPRLegalBasis
  legitimate_interest_assessment?: string
  data_categories: string[]
  data_sources?: string[]
  data_subjects: string[]
  recipients?: string[]
  recipient_categories?: string[]
  transfers_outside_eea: boolean
  transfer_countries?: string[]
  transfer_safeguards?: string
  transfer_safeguards_details?: string
  retention_period: string
  retention_criteria: string
  deletion_procedure?: string
  security_measures: string[]
  encryption_used: boolean
  access_controls?: string
  dpo_name?: string
  dpo_contact?: string
  controller_name?: string
  controller_contact?: string
  processor_names?: string[]
  dpia_required: boolean
  dpia_completed: boolean
  dpia_id?: string
  status: 'active' | 'inactive' | 'under_review'
  last_reviewed_at?: string
  next_review_date?: string
  review_frequency: string
  created_at: string
  updated_at: string
}

/**
 * Privacy Impact Assessment (DPIA)
 */
export interface PrivacyImpactAssessment {
  id: string
  organization_id: string
  assessment_code: string
  assessment_name: string
  assessment_description: string
  processing_activity_id?: string
  processing_description: string
  processing_purpose: string
  necessity_justification: string
  proportionality_assessment: string
  alternatives_considered?: string
  data_types: string[]
  data_volume?: string
  data_sensitivity: 'low' | 'medium' | 'high' | 'critical'
  special_categories_data: boolean
  special_categories_details?: string
  data_subjects_description: string
  vulnerable_subjects: boolean
  vulnerable_subjects_details?: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  risks_identified: any[]
  likelihood_assessment?: string
  impact_assessment?: string
  mitigation_measures: any[]
  residual_risk_level?: string
  security_measures: string[]
  dpo_consulted: boolean
  dpo_opinion?: string
  data_subjects_consulted: boolean
  consultation_details?: string
  status: 'draft' | 'under_review' | 'dpo_review' | 'approved' | 'rejected' | 'requires_revision'
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  review_frequency: string
  last_reviewed_at?: string
  next_review_date?: string
  supporting_documents?: any[]
  conclusions?: string
  recommendations?: string
  created_at: string
  updated_at: string
}

/**
 * Data Breach Incident
 */
export interface DataBreachIncident {
  id: string
  organization_id: string
  incident_code: string
  incident_name: string
  incident_description: string
  incident_date: string
  discovered_date: string
  contained_date?: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  risk_to_rights: 'low' | 'medium' | 'high'
  data_types_affected: string[]
  special_categories_affected: boolean
  data_volume_affected?: string
  affected_users_count?: number
  affected_users_identified: boolean
  affected_users_list?: any[]
  vulnerable_individuals: boolean
  breach_type: string
  breach_cause?: string
  breach_vector?: string
  unauthorized_access: boolean
  data_loss: boolean
  containment_actions?: any[]
  containment_effective?: boolean
  recovery_actions?: any[]
  notification_required: boolean
  dpa_notification_required: boolean
  dpa_notified_at?: string
  dpa_notification_method?: string
  dpa_reference_number?: string
  dpa_within_72h?: boolean
  delay_justification?: string
  subjects_notification_required: boolean
  subjects_notified_at?: string
  subjects_notification_method?: string
  subjects_notification_count?: number
  investigation_status: 'ongoing' | 'completed' | 'closed'
  root_cause?: string
  root_cause_analysis?: string
  contributing_factors?: string[]
  remediation_plan?: string
  remediation_actions?: any[]
  remediation_completed: boolean
  remediation_completed_at?: string
  preventive_measures?: any[]
  policy_changes_required: boolean
  training_required: boolean
  lessons_learned?: string
  recommendations?: string
  follow_up_required: boolean
  follow_up_actions?: any[]
  status: 'investigating' | 'contained' | 'resolved' | 'closed'
  closed_at?: string
  reported_by?: string
  assigned_to?: string
  created_at: string
  updated_at: string
}

/**
 * Compliance Metrics
 */
export interface ComplianceMetrics {
  id: string
  organization_id: string
  overall_score: number
  data_protection_score?: number
  consent_management_score?: number
  data_subject_rights_score?: number
  security_measures_score?: number
  accountability_score?: number
  dsr_average_response_days?: number
  dsr_completion_rate?: number
  consent_rate?: number
  active_processing_activities?: number
  completed_dpias?: number
  open_data_breaches?: number
  gaps?: any[]
  recommendations?: any[]
  calculated_at: string
  calculated_by?: string
}

/**
 * GDPR Audit Log
 */
export interface GDPRAuditLog {
  id: string
  organization_id: string
  event_type: string
  event_category: 'dsr' | 'consent' | 'breach' | 'compliance' | 'processing' | 'dpia'
  event_description: string
  actor_id?: string
  actor_email?: string
  actor_role?: string
  subject_id?: string
  subject_type?: string
  ip_address?: string
  user_agent?: string
  changes_before?: any
  changes_after?: any
  success: boolean
  error_message?: string
  created_at: string
}

/**
 * Compliance Score Breakdown
 */
export interface ComplianceScoreBreakdown {
  overall_score: number
  baseline_score: number
  category_scores: {
    data_subject_rights: {
      score: number
      weight: number
      details: {
        dsr_automation: number
        avg_response_time: number
        completion_rate: number
      }
    }
    consent_management: {
      score: number
      weight: number
      details: {
        purposes_configured: number
        consent_rate: number
        granularity: number
      }
    }
    processing_records: {
      score: number
      weight: number
      details: {
        activities_documented: number
        review_currency: number
        completeness: number
      }
    }
    privacy_assessments: {
      score: number
      weight: number
      details: {
        dpias_completed: number
        risk_coverage: number
      }
    }
    breach_management: {
      score: number
      weight: number
      details: {
        process_established: boolean
        notification_compliance: number
      }
    }
  }
  gaps: Array<{
    category: string
    description: string
    impact: number
    recommendation: string
  }>
  improvement_plan: Array<{
    priority: 'high' | 'medium' | 'low'
    action: string
    expected_gain: number
  }>
}
