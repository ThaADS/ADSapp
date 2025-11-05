/**
 * SOC 2 Type II Compliance Type Definitions
 *
 * Comprehensive TypeScript types for SOC 2 Trust Service Criteria (TSC)
 * compliance tracking, audit evidence, continuous monitoring, and reporting.
 *
 * Trust Service Categories:
 * - CC: Common Criteria (Security)
 * - A: Availability
 * - PI: Processing Integrity
 * - C: Confidentiality
 * - P: Privacy
 */

// ============================================================================
// Trust Service Categories and Criteria
// ============================================================================

export enum TrustServiceCategory {
  COMMON_CRITERIA = 'Security',
  AVAILABILITY = 'Availability',
  PROCESSING_INTEGRITY = 'ProcessingIntegrity',
  CONFIDENTIALITY = 'Confidentiality',
  PRIVACY = 'Privacy',
}

export enum TrustPrinciple {
  // Common Criteria (Security)
  CC_CONTROL_ENVIRONMENT = 'Control Environment',
  CC_COMMUNICATION = 'Communication and Information',
  CC_RISK_ASSESSMENT = 'Risk Assessment Process',
  CC_MONITORING = 'Monitoring Activities',
  CC_CONTROL_ACTIVITIES = 'Control Activities',
  CC_LOGICAL_ACCESS = 'Logical and Physical Access Controls',
  CC_SYSTEM_OPERATIONS = 'System Operations',
  CC_CHANGE_MANAGEMENT = 'Change Management',
  CC_RISK_MITIGATION = 'Risk Mitigation',

  // Availability
  A_AVAILABILITY = 'Availability',

  // Processing Integrity
  PI_PROCESSING_INTEGRITY = 'Processing Integrity',

  // Confidentiality
  C_CONFIDENTIALITY = 'Confidentiality',

  // Privacy
  P_PRIVACY = 'Privacy',
}

export type TSCIdentifier = string; // Format: "CC6.1", "A1.2", "PI1.1", etc.

export enum ControlImplementationStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  IMPLEMENTED = 'implemented',
  VERIFIED = 'verified',
}

// ============================================================================
// SOC 2 Control Definition
// ============================================================================

export interface ImplementationProcedure {
  step: number;
  description: string;
  responsible_role: string;
  estimated_duration: string;
  dependencies?: string[];
}

export interface EvidenceRequirement {
  evidence_type: EvidenceType;
  description: string;
  frequency: EvidenceFrequency;
  automated: boolean;
}

export interface TestingProcedure {
  procedure: string;
  frequency: TestingFrequency;
  sample_size?: string;
  acceptance_criteria: string;
}

export interface SOC2Control {
  id: string;
  tsc_id: TSCIdentifier;
  category: TrustServiceCategory;
  trust_principle: TrustPrinciple;
  title: string;
  description: string;
  control_objective: string;
  implementation_procedures: ImplementationProcedure[];
  evidence_requirements: EvidenceRequirement[];
  testing_procedures: TestingProcedure[];
  implementation_status: ControlImplementationStatus;
  effectiveness_rating?: number; // 1-5
  last_tested_at?: Date;
  next_test_due?: Date;
  owner_role: string;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  updated_by?: string;
}

// ============================================================================
// Audit Evidence
// ============================================================================

export enum EvidenceType {
  SCREENSHOT = 'screenshot',
  LOG_EXPORT = 'log_export',
  POLICY_DOCUMENT = 'policy_document',
  SYSTEM_REPORT = 'system_report',
  INTERVIEW_NOTES = 'interview_notes',
  CONFIGURATION_EXPORT = 'configuration_export',
  ACCESS_REPORT = 'access_report',
  MONITORING_DASHBOARD = 'monitoring_dashboard',
  CHANGE_RECORD = 'change_record',
  INCIDENT_REPORT = 'incident_report',
  TRAINING_RECORD = 'training_record',
  VENDOR_ASSESSMENT = 'vendor_assessment',
  PENETRATION_TEST = 'penetration_test',
  VULNERABILITY_SCAN = 'vulnerability_scan',
  BACKUP_VERIFICATION = 'backup_verification',
}

export enum EvidenceFrequency {
  REAL_TIME = 'real_time',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUALLY = 'annually',
  ON_DEMAND = 'on_demand',
}

export interface SOC2Evidence {
  id: string;
  control_id: string;
  evidence_type: EvidenceType;
  evidence_title: string;
  description?: string;
  file_path?: string;
  file_hash?: string; // SHA-256 hash for integrity
  file_size_bytes?: number;
  mime_type?: string;
  collection_date: Date;
  period_start?: Date;
  period_end?: Date;
  automated_collection: boolean;
  auditor_verified: boolean;
  auditor_notes?: string;
  verified_at?: Date;
  verified_by?: string;
  retention_until: Date; // 7 years minimum
  metadata: Record<string, any>;
  created_at: Date;
  created_by?: string;
}

// ============================================================================
// Continuous Monitoring
// ============================================================================

export enum MonitoringMetricSource {
  OPENTELEMETRY = 'opentelemetry',
  DATABASE = 'database',
  EXTERNAL_API = 'external_api',
  APPLICATION_LOG = 'application_log',
  SYSTEM_LOG = 'system_log',
}

export enum ThresholdType {
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  RANGE = 'range',
}

export enum AlertChannel {
  SLACK = 'slack',
  EMAIL = 'email',
  PAGERDUTY = 'pagerduty',
  WEBHOOK = 'webhook',
  SMS = 'sms',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface MonitoringCheckResult {
  timestamp: Date;
  metric_value: number;
  threshold_breached: boolean;
  status: 'pass' | 'fail';
  details?: string;
}

export interface SOC2MonitoringRule {
  id: string;
  control_id: string;
  rule_name: string;
  description?: string;
  metric_name: string;
  metric_source: MonitoringMetricSource;
  threshold_type: ThresholdType;
  threshold_value?: number;
  threshold_min?: number;
  threshold_max?: number;
  check_frequency_minutes: number;
  alert_channel: AlertChannel;
  alert_severity: AlertSeverity;
  is_active: boolean;
  last_check_at?: Date;
  last_check_result?: MonitoringCheckResult;
  last_alert_at?: Date;
  consecutive_failures: number;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

// ============================================================================
// Access Reviews
// ============================================================================

export enum AccessReviewStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  APPROVED = 'approved',
}

export interface RemediationAction {
  action_type: 'grant_access' | 'revoke_access' | 'modify_permissions' | 'investigate';
  user_id: string;
  description: string;
  completed: boolean;
  completed_at?: Date;
}

export interface AccessReviewData {
  users_reviewed: Array<{
    user_id: string;
    current_role: string;
    access_appropriate: boolean;
    recommended_action?: string;
  }>;
}

export interface SOC2AccessReview {
  id: string;
  review_quarter: string; // e.g., "2024-Q1"
  review_period_start: Date;
  review_period_end: Date;
  review_status: AccessReviewStatus;
  reviewer_id?: string;
  approver_id?: string;
  total_users_reviewed?: number;
  users_with_changes?: number;
  access_granted_count?: number;
  access_revoked_count?: number;
  findings: string[];
  remediation_actions: RemediationAction[];
  completed_at?: Date;
  approved_at?: Date;
  review_data: AccessReviewData;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Change Management
// ============================================================================

export enum ChangeType {
  INFRASTRUCTURE = 'infrastructure',
  APPLICATION = 'application',
  SECURITY = 'security',
  CONFIGURATION = 'configuration',
  DATABASE = 'database',
}

export enum ChangeCategory {
  STANDARD = 'standard',
  NORMAL = 'normal',
  EMERGENCY = 'emergency',
}

export enum ChangeApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  IMPLEMENTED = 'implemented',
  ROLLED_BACK = 'rolled_back',
}

export interface RiskAssessment {
  impact: 'low' | 'medium' | 'high' | 'critical';
  likelihood: 'low' | 'medium' | 'high';
  overall_risk: 'low' | 'medium' | 'high' | 'critical';
  mitigation_steps: string[];
}

export interface SOC2ChangeLog {
  id: string;
  change_number: string; // e.g., "CHG-2024-0001"
  change_type: ChangeType;
  change_category: ChangeCategory;
  title: string;
  description: string;
  business_justification?: string;
  risk_assessment: RiskAssessment;
  affected_systems: string[];
  implementation_plan?: string;
  rollback_plan?: string;
  testing_results?: string;
  requestor_id?: string;
  implementer_id?: string;
  approver_id?: string;
  approval_status: ChangeApprovalStatus;
  approved_at?: Date;
  scheduled_start?: Date;
  scheduled_end?: Date;
  actual_start?: Date;
  actual_end?: Date;
  implementation_status: string;
  success?: boolean;
  failure_reason?: string;
  related_control_ids?: string[];
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Incident Response
// ============================================================================

export enum IncidentType {
  SECURITY_BREACH = 'security_breach',
  DATA_LOSS = 'data_loss',
  SERVICE_OUTAGE = 'service_outage',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  MALWARE = 'malware',
  PHISHING = 'phishing',
  DDOS = 'ddos',
  INSIDER_THREAT = 'insider_threat',
}

export enum IncidentSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  CONTAINED = 'contained',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum DetectionMethod {
  AUTOMATED_MONITORING = 'automated_monitoring',
  USER_REPORT = 'user_report',
  AUDIT = 'audit',
  EXTERNAL_NOTIFICATION = 'external_notification',
}

export interface CorrectiveAction {
  action: string;
  responsible: string;
  deadline?: Date;
  completed: boolean;
  completed_at?: Date;
}

export interface NotificationRecord {
  notification_type: 'customer' | 'regulatory' | 'internal';
  recipients: string[];
  sent_at: Date;
  content?: string;
}

export interface SOC2Incident {
  id: string;
  incident_number: string; // e.g., "INC-2024-0001"
  incident_type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  detected_date: Date;
  detected_by?: string;
  detection_method: DetectionMethod;
  affected_systems: string[];
  affected_data_types: string[];
  estimated_impact?: string;
  containment_actions?: string;
  containment_date?: Date;
  investigation_findings?: string;
  root_cause_analysis?: string;
  corrective_actions: CorrectiveAction[];
  preventive_actions: CorrectiveAction[];
  resolved_date?: Date;
  resolved_by?: string;
  notification_required: boolean;
  notifications_sent: NotificationRecord[];
  related_control_ids?: string[];
  lessons_learned?: string;
  assigned_to?: string;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Vendor Management
// ============================================================================

export enum VendorType {
  INFRASTRUCTURE = 'infrastructure',
  SAAS = 'saas',
  CONSULTING = 'consulting',
  SECURITY = 'security',
}

export enum DataAccessLevel {
  NONE = 'none',
  LIMITED = 'limited',
  FULL = 'full',
  CUSTOMER_DATA = 'customer_data',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum SOC2CertificationStatus {
  NOT_APPLICABLE = 'not_applicable',
  TYPE_1 = 'type_1',
  TYPE_2 = 'type_2',
  EXPIRED = 'expired',
}

export enum VendorApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_REMEDIATION = 'needs_remediation',
}

export interface VendorDocument {
  document_type: 'soc2_report' | 'contract' | 'security_questionnaire' | 'insurance';
  file_path: string;
  upload_date: Date;
  expiry_date?: Date;
}

export interface SOC2VendorAssessment {
  id: string;
  vendor_name: string;
  vendor_website?: string;
  vendor_contact_email?: string;
  vendor_type: VendorType;
  services_provided: string;
  data_access_level: DataAccessLevel;
  assessment_date: Date;
  next_assessment_due: Date;
  assessor_id?: string;
  risk_score?: number; // 1-100
  risk_level: RiskLevel;
  soc2_certification_status: SOC2CertificationStatus;
  soc2_report_date?: Date;
  soc2_report_expiry?: Date;
  iso27001_certified: boolean;
  gdpr_compliant: boolean;
  hipaa_compliant: boolean;
  security_questionnaire_completed: boolean;
  contract_includes_data_protection: boolean;
  right_to_audit: boolean;
  findings: string[];
  remediation_required: Array<{
    issue: string;
    deadline: Date;
    completed: boolean;
  }>;
  approval_status: VendorApprovalStatus;
  approved_by?: string;
  approved_at?: Date;
  documents: VendorDocument[];
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Penetration Testing
// ============================================================================

export enum PentestType {
  EXTERNAL = 'external',
  INTERNAL = 'internal',
  WEB_APPLICATION = 'web_application',
  SOCIAL_ENGINEERING = 'social_engineering',
  PHYSICAL = 'physical',
}

export enum PentestRemediationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export interface PentestFinding {
  finding_id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'informational';
  title: string;
  description: string;
  affected_system: string;
  cvss_score?: number;
  remediation_recommendation: string;
  remediation_status: 'open' | 'in_progress' | 'remediated' | 'accepted_risk';
  remediated_at?: Date;
}

export interface RetestResult {
  retest_date: Date;
  findings_retested: string[];
  findings_remediated: string[];
  findings_remaining: string[];
  notes?: string;
}

export interface SOC2PentestResult {
  id: string;
  test_number: string; // e.g., "PENTEST-2024-Q1"
  test_type: PentestType;
  test_date: Date;
  test_duration_days?: number;
  tester_organization: string;
  tester_contact_email?: string;
  scope_description: string;
  systems_tested: string[];
  methodology?: string;
  findings_count: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  informational_findings: number;
  findings_detail: PentestFinding[];
  executive_summary?: string;
  technical_report_path?: string;
  remediation_status: PentestRemediationStatus;
  remediation_deadline?: Date;
  remediation_actions: Array<{
    finding_id: string;
    action: string;
    responsible: string;
    completed: boolean;
  }>;
  retest_required: boolean;
  retest_date?: Date;
  retest_results?: RetestResult;
  approved_by?: string;
  approved_at?: Date;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// Testing Frequencies
// ============================================================================

export enum TestingFrequency {
  CONTINUOUS = 'continuous',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUALLY = 'semi_annually',
  ANNUALLY = 'annually',
}

// ============================================================================
// Compliance Dashboard Metrics
// ============================================================================

export interface ComplianceDashboardMetrics {
  overall_compliance_score: number; // 0-100
  controls_implemented: number;
  controls_verified: number;
  controls_pending: number;
  evidence_items_collected: number;
  evidence_items_verified: number;
  active_monitoring_rules: number;
  monitoring_rules_passing: number;
  monitoring_rules_failing: number;
  open_incidents: number;
  critical_incidents: number;
  pending_changes: number;
  approved_changes: number;
  vendors_assessed: number;
  high_risk_vendors: number;
  pentest_findings_open: number;
  pentest_critical_open: number;
  last_access_review: Date;
  next_access_review_due: Date;
  audit_readiness_score: number; // 0-100
}

// ============================================================================
// Compliance Report
// ============================================================================

export interface ComplianceReport {
  report_id: string;
  report_type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'audit';
  report_period_start: Date;
  report_period_end: Date;
  generated_at: Date;
  generated_by: string;
  metrics: ComplianceDashboardMetrics;
  control_summary: Array<{
    category: TrustServiceCategory;
    total_controls: number;
    implemented: number;
    verified: number;
    effectiveness_avg: number;
  }>;
  incidents_summary: Array<{
    incident_type: IncidentType;
    count: number;
    avg_resolution_time_hours: number;
  }>;
  changes_summary: {
    total_changes: number;
    successful: number;
    failed: number;
    rolled_back: number;
  };
  evidence_summary: {
    total_evidence: number;
    verified_evidence: number;
    pending_verification: number;
  };
  recommendations: string[];
  action_items: Array<{
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    owner: string;
    due_date?: Date;
  }>;
}

// ============================================================================
// Audit Readiness Checklist
// ============================================================================

export interface AuditChecklistItem {
  item_id: string;
  category: string;
  description: string;
  required: boolean;
  status: 'not_started' | 'in_progress' | 'completed' | 'verified';
  owner: string;
  due_date?: Date;
  completed_at?: Date;
  evidence_references?: string[];
  notes?: string;
}

export interface AuditReadinessAssessment {
  assessment_id: string;
  assessment_date: Date;
  target_audit_date: Date;
  overall_readiness_score: number; // 0-100
  checklist_items: AuditChecklistItem[];
  gaps_identified: string[];
  remediation_plan: Array<{
    gap: string;
    action: string;
    owner: string;
    deadline: Date;
    status: string;
  }>;
  estimated_audit_cost: number;
  recommended_auditor?: string;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isSOC2Control(obj: any): obj is SOC2Control {
  return obj && typeof obj.tsc_id === 'string' && typeof obj.title === 'string';
}

export function isSOC2Evidence(obj: any): obj is SOC2Evidence {
  return obj && typeof obj.control_id === 'string' && typeof obj.evidence_type === 'string';
}

export function isSOC2Incident(obj: any): obj is SOC2Incident {
  return obj && typeof obj.incident_number === 'string' && typeof obj.incident_type === 'string';
}
