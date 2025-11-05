/**
 * GDPR Data Retention Policies
 *
 * Defines and enforces data retention periods for GDPR compliance.
 * Supports tenant-specific policy overrides and policy validation.
 *
 * Retention Periods (Default):
 * - Messages: 2 years from last activity
 * - Contacts: 3 years from last interaction
 * - Conversations: 2 years from closure
 * - Audit logs: 7 years (compliance requirement)
 * - Analytics (anonymized): Indefinite
 * - Financial records: 7 years (legal requirement)
 *
 * Security Level: HIGH
 * Compliance: GDPR Article 5(1)(e) - Storage Limitation
 *
 * @module gdpr/retention-policies
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { createServerClient } from '@/lib/supabase/server';

/**
 * Data type categories
 */
export enum DataType {
  MESSAGES = 'messages',
  CONTACTS = 'contacts',
  CONVERSATIONS = 'conversations',
  AUDIT_LOGS = 'audit_logs',
  ANALYTICS = 'analytics',
  FINANCIAL_RECORDS = 'financial_records',
  USER_PROFILES = 'user_profiles',
  ORGANIZATION_DATA = 'organization_data',
  MEDIA_FILES = 'media_files',
  SYSTEM_LOGS = 'system_logs'
}

/**
 * Retention policy interface
 */
export interface RetentionPolicy {
  dataType: DataType;
  retentionDays: number;
  description: string;
  legalBasis: string;
  canOverride: boolean;
  minimumRetentionDays?: number;
  maximumRetentionDays?: number;
}

/**
 * Tenant-specific retention override
 */
export interface RetentionOverride {
  id: string;
  organization_id: string;
  data_type: DataType;
  retention_days: number;
  reason: string;
  approved_by: string;
  approved_at: string;
  effective_from: string;
  created_at: string;
}

/**
 * Policy validation result
 */
export interface PolicyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: PolicyConflict[];
}

/**
 * Policy conflict interface
 */
export interface PolicyConflict {
  dataType: DataType;
  defaultPolicy: number;
  overridePolicy: number;
  conflictReason: string;
}

/**
 * Data expiration check result
 */
export interface ExpirationCheckResult {
  expired: boolean;
  dataType: DataType;
  recordId: string;
  lastActivityDate: string;
  expirationDate: string;
  daysOverdue?: number;
}

/**
 * Default retention policies
 *
 * Based on GDPR best practices and legal requirements.
 */
export const DEFAULT_RETENTION_POLICIES: Record<DataType, RetentionPolicy> = {
  [DataType.MESSAGES]: {
    dataType: DataType.MESSAGES,
    retentionDays: 730, // 2 years
    description: 'WhatsApp messages and conversation content',
    legalBasis: 'GDPR Article 6(1)(b) - Contract performance',
    canOverride: true,
    minimumRetentionDays: 365, // 1 year minimum
    maximumRetentionDays: 1825 // 5 years maximum
  },

  [DataType.CONTACTS]: {
    dataType: DataType.CONTACTS,
    retentionDays: 1095, // 3 years
    description: 'Contact information and metadata',
    legalBasis: 'GDPR Article 6(1)(f) - Legitimate interests',
    canOverride: true,
    minimumRetentionDays: 365, // 1 year minimum
    maximumRetentionDays: 2555 // 7 years maximum
  },

  [DataType.CONVERSATIONS]: {
    dataType: DataType.CONVERSATIONS,
    retentionDays: 730, // 2 years
    description: 'Conversation threads and metadata',
    legalBasis: 'GDPR Article 6(1)(b) - Contract performance',
    canOverride: true,
    minimumRetentionDays: 365, // 1 year minimum
    maximumRetentionDays: 1825 // 5 years maximum
  },

  [DataType.AUDIT_LOGS]: {
    dataType: DataType.AUDIT_LOGS,
    retentionDays: 2555, // 7 years
    description: 'System audit logs and security events',
    legalBasis: 'Legal obligation - SOC 2 compliance',
    canOverride: false, // Cannot be reduced for compliance
    minimumRetentionDays: 2555, // 7 years mandatory
    maximumRetentionDays: 3650 // 10 years maximum
  },

  [DataType.ANALYTICS]: {
    dataType: DataType.ANALYTICS,
    retentionDays: -1, // Indefinite (anonymized)
    description: 'Anonymized analytics and aggregated statistics',
    legalBasis: 'GDPR Article 89 - Archiving purposes',
    canOverride: false,
    minimumRetentionDays: -1,
    maximumRetentionDays: -1
  },

  [DataType.FINANCIAL_RECORDS]: {
    dataType: DataType.FINANCIAL_RECORDS,
    retentionDays: 2555, // 7 years
    description: 'Billing, invoices, and financial transactions',
    legalBasis: 'Legal obligation - Tax regulations',
    canOverride: false, // Cannot be reduced for legal compliance
    minimumRetentionDays: 2555, // 7 years mandatory
    maximumRetentionDays: 3650 // 10 years maximum
  },

  [DataType.USER_PROFILES]: {
    dataType: DataType.USER_PROFILES,
    retentionDays: 1095, // 3 years
    description: 'User profiles and account information',
    legalBasis: 'GDPR Article 6(1)(b) - Contract performance',
    canOverride: true,
    minimumRetentionDays: 365, // 1 year minimum
    maximumRetentionDays: 2555 // 7 years maximum
  },

  [DataType.ORGANIZATION_DATA]: {
    dataType: DataType.ORGANIZATION_DATA,
    retentionDays: 2555, // 7 years
    description: 'Organization settings and configuration',
    legalBasis: 'GDPR Article 6(1)(f) - Legitimate interests',
    canOverride: true,
    minimumRetentionDays: 1825, // 5 years minimum
    maximumRetentionDays: 3650 // 10 years maximum
  },

  [DataType.MEDIA_FILES]: {
    dataType: DataType.MEDIA_FILES,
    retentionDays: 730, // 2 years
    description: 'Uploaded images, documents, and media',
    legalBasis: 'GDPR Article 6(1)(b) - Contract performance',
    canOverride: true,
    minimumRetentionDays: 365, // 1 year minimum
    maximumRetentionDays: 1825 // 5 years maximum
  },

  [DataType.SYSTEM_LOGS]: {
    dataType: DataType.SYSTEM_LOGS,
    retentionDays: 90, // 90 days
    description: 'Application logs and error tracking',
    legalBasis: 'GDPR Article 32 - Security of processing',
    canOverride: true,
    minimumRetentionDays: 30, // 30 days minimum
    maximumRetentionDays: 365 // 1 year maximum
  }
};

/**
 * Get retention policy for a data type
 *
 * Returns tenant-specific override if exists, otherwise default policy.
 *
 * @param dataType - Data type to get policy for
 * @param organizationId - Optional organization ID for overrides
 * @returns Retention policy
 */
export async function getRetentionPolicy(
  dataType: DataType,
  organizationId?: string
): Promise<RetentionPolicy> {
  // Get default policy
  const defaultPolicy = DEFAULT_RETENTION_POLICIES[dataType];

  if (!defaultPolicy) {
    throw new Error(`No retention policy defined for data type: ${dataType}`);
  }

  // If no organization specified or policy cannot be overridden, return default
  if (!organizationId || !defaultPolicy.canOverride) {
    return defaultPolicy;
  }

  // Check for tenant-specific override
  const supabase = await createServerClient();
  const { data: override, error } = await supabase
    .from('retention_policy_overrides')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('data_type', dataType)
    .eq('active', true)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();

  if (error || !override) {
    return defaultPolicy;
  }

  // Validate override is within allowed range
  const overrideRetentionDays = override.retention_days;

  if (
    defaultPolicy.minimumRetentionDays &&
    overrideRetentionDays < defaultPolicy.minimumRetentionDays
  ) {
    console.warn(
      `[RetentionPolicy] Override for ${dataType} below minimum, using default`
    );
    return defaultPolicy;
  }

  if (
    defaultPolicy.maximumRetentionDays &&
    overrideRetentionDays > defaultPolicy.maximumRetentionDays
  ) {
    console.warn(
      `[RetentionPolicy] Override for ${dataType} above maximum, using default`
    );
    return defaultPolicy;
  }

  // Return policy with override
  return {
    ...defaultPolicy,
    retentionDays: overrideRetentionDays
  };
}

/**
 * Create tenant-specific retention policy override
 *
 * @param override - Override configuration
 * @returns Created override record
 */
export async function createRetentionOverride(
  override: Omit<RetentionOverride, 'id' | 'created_at'>
): Promise<RetentionOverride> {
  const supabase = await createServerClient();

  // Validate override
  const validation = await validateRetentionOverride(
    override.data_type,
    override.retention_days
  );

  if (!validation.valid) {
    throw new Error(
      `Invalid retention override: ${validation.errors.join(', ')}`
    );
  }

  // Deactivate existing overrides
  await supabase
    .from('retention_policy_overrides')
    .update({ active: false })
    .eq('organization_id', override.organization_id)
    .eq('data_type', override.data_type);

  // Create new override
  const { data: newOverride, error } = await supabase
    .from('retention_policy_overrides')
    .insert({
      organization_id: override.organization_id,
      data_type: override.data_type,
      retention_days: override.retention_days,
      reason: override.reason,
      approved_by: override.approved_by,
      approved_at: override.approved_at,
      effective_from: override.effective_from,
      active: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create retention override: ${error.message}`);
  }

  console.log(
    `[RetentionPolicy] Override created for ${override.data_type}: ${override.retention_days} days`
  );

  return newOverride as RetentionOverride;
}

/**
 * Validate retention policy override
 *
 * @param dataType - Data type
 * @param retentionDays - Proposed retention days
 * @returns Validation result
 */
export async function validateRetentionOverride(
  dataType: DataType,
  retentionDays: number
): Promise<PolicyValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const conflicts: PolicyConflict[] = [];

  // Get default policy
  const defaultPolicy = DEFAULT_RETENTION_POLICIES[dataType];

  if (!defaultPolicy) {
    errors.push(`No retention policy defined for data type: ${dataType}`);
    return { valid: false, errors, warnings, conflicts };
  }

  // Check if override is allowed
  if (!defaultPolicy.canOverride) {
    errors.push(`Retention policy for ${dataType} cannot be overridden`);
  }

  // Check minimum retention
  if (
    defaultPolicy.minimumRetentionDays &&
    retentionDays < defaultPolicy.minimumRetentionDays
  ) {
    errors.push(
      `Retention period ${retentionDays} days is below minimum ${defaultPolicy.minimumRetentionDays} days`
    );
  }

  // Check maximum retention
  if (
    defaultPolicy.maximumRetentionDays &&
    defaultPolicy.maximumRetentionDays !== -1 &&
    retentionDays > defaultPolicy.maximumRetentionDays
  ) {
    errors.push(
      `Retention period ${retentionDays} days exceeds maximum ${defaultPolicy.maximumRetentionDays} days`
    );
  }

  // Warn if significantly different from default
  const percentDifference =
    Math.abs(retentionDays - defaultPolicy.retentionDays) /
    defaultPolicy.retentionDays;

  if (percentDifference > 0.5) {
    warnings.push(
      `Override differs by ${(percentDifference * 100).toFixed(0)}% from default policy`
    );
  }

  // Check for conflicts with related data types
  if (dataType === DataType.MESSAGES && retentionDays > 730) {
    warnings.push(
      'Message retention exceeds 2 years - ensure compliance with data minimization principles'
    );
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    conflicts
  };
}

/**
 * Check if data has expired based on retention policy
 *
 * @param dataType - Data type
 * @param lastActivityDate - Last activity timestamp
 * @param organizationId - Optional organization ID for overrides
 * @returns Expiration check result
 */
export async function isDataExpired(
  dataType: DataType,
  lastActivityDate: Date,
  organizationId?: string
): Promise<boolean> {
  const policy = await getRetentionPolicy(dataType, organizationId);

  // Indefinite retention (analytics)
  if (policy.retentionDays === -1) {
    return false;
  }

  const expirationDate = new Date(lastActivityDate);
  expirationDate.setDate(expirationDate.getDate() + policy.retentionDays);

  const now = new Date();
  return now >= expirationDate;
}

/**
 * Calculate expiration date for data
 *
 * @param dataType - Data type
 * @param lastActivityDate - Last activity timestamp
 * @param organizationId - Optional organization ID for overrides
 * @returns Expiration date
 */
export async function calculateExpirationDate(
  dataType: DataType,
  lastActivityDate: Date,
  organizationId?: string
): Promise<Date | null> {
  const policy = await getRetentionPolicy(dataType, organizationId);

  // Indefinite retention
  if (policy.retentionDays === -1) {
    return null;
  }

  const expirationDate = new Date(lastActivityDate);
  expirationDate.setDate(expirationDate.getDate() + policy.retentionDays);

  return expirationDate;
}

/**
 * Get all expired records for a data type
 *
 * @param dataType - Data type to check
 * @param organizationId - Organization ID
 * @param limit - Maximum records to return
 * @returns Array of expired record IDs
 */
export async function getExpiredRecords(
  dataType: DataType,
  organizationId: string,
  limit: number = 1000
): Promise<ExpirationCheckResult[]> {
  const supabase = await createServerClient();
  const policy = await getRetentionPolicy(dataType, organizationId);

  // Skip if indefinite retention
  if (policy.retentionDays === -1) {
    return [];
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

  const expiredRecords: ExpirationCheckResult[] = [];

  // Query varies by data type
  switch (dataType) {
    case DataType.MESSAGES: {
      const { data: messages } = await supabase
        .from('messages')
        .select('id, created_at, conversation_id')
        .eq('organization_id', organizationId)
        .lt('created_at', cutoffDate.toISOString())
        .limit(limit);

      if (messages) {
        for (const msg of messages) {
          const expirationDate = await calculateExpirationDate(
            dataType,
            new Date(msg.created_at),
            organizationId
          );

          expiredRecords.push({
            expired: true,
            dataType,
            recordId: msg.id,
            lastActivityDate: msg.created_at,
            expirationDate: expirationDate?.toISOString() || '',
            daysOverdue: Math.floor(
              (Date.now() - new Date(msg.created_at).getTime()) /
                (1000 * 60 * 60 * 24) -
                policy.retentionDays
            )
          });
        }
      }
      break;
    }

    case DataType.CONTACTS: {
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, last_message_at, updated_at')
        .eq('organization_id', organizationId)
        .lt('last_message_at', cutoffDate.toISOString())
        .limit(limit);

      if (contacts) {
        for (const contact of contacts) {
          const lastActivity = new Date(
            contact.last_message_at || contact.updated_at
          );
          const expirationDate = await calculateExpirationDate(
            dataType,
            lastActivity,
            organizationId
          );

          expiredRecords.push({
            expired: true,
            dataType,
            recordId: contact.id,
            lastActivityDate: lastActivity.toISOString(),
            expirationDate: expirationDate?.toISOString() || '',
            daysOverdue: Math.floor(
              (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24) -
                policy.retentionDays
            )
          });
        }
      }
      break;
    }

    case DataType.CONVERSATIONS: {
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, last_message_at, updated_at')
        .eq('organization_id', organizationId)
        .eq('status', 'closed')
        .lt('last_message_at', cutoffDate.toISOString())
        .limit(limit);

      if (conversations) {
        for (const conv of conversations) {
          const lastActivity = new Date(
            conv.last_message_at || conv.updated_at
          );
          const expirationDate = await calculateExpirationDate(
            dataType,
            lastActivity,
            organizationId
          );

          expiredRecords.push({
            expired: true,
            dataType,
            recordId: conv.id,
            lastActivityDate: lastActivity.toISOString(),
            expirationDate: expirationDate?.toISOString() || '',
            daysOverdue: Math.floor(
              (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24) -
                policy.retentionDays
            )
          });
        }
      }
      break;
    }

    // Add more data types as needed
  }

  console.log(
    `[RetentionPolicy] Found ${expiredRecords.length} expired ${dataType} records`
  );

  return expiredRecords;
}

/**
 * Get retention policy summary for organization
 *
 * @param organizationId - Organization ID
 * @returns Policy summary for all data types
 */
export async function getRetentionPolicySummary(
  organizationId: string
): Promise<Record<DataType, RetentionPolicy>> {
  const summary: Record<DataType, RetentionPolicy> = {} as any;

  for (const dataType of Object.values(DataType)) {
    summary[dataType] = await getRetentionPolicy(dataType, organizationId);
  }

  return summary;
}

/**
 * Validate all retention policies for conflicts
 *
 * @param organizationId - Organization ID
 * @returns Validation result
 */
export async function validateAllPolicies(
  organizationId: string
): Promise<PolicyValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const conflicts: PolicyConflict[] = [];

  const supabase = await createServerClient();

  // Get all active overrides
  const { data: overrides } = await supabase
    .from('retention_policy_overrides')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('active', true);

  if (overrides) {
    for (const override of overrides) {
      const validation = await validateRetentionOverride(
        override.data_type as DataType,
        override.retention_days
      );

      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
      conflicts.push(...validation.conflicts);
    }
  }

  // Check for logical conflicts between related data types
  const messagesPolicy = await getRetentionPolicy(
    DataType.MESSAGES,
    organizationId
  );
  const conversationsPolicy = await getRetentionPolicy(
    DataType.CONVERSATIONS,
    organizationId
  );

  if (
    messagesPolicy.retentionDays > conversationsPolicy.retentionDays &&
    conversationsPolicy.retentionDays !== -1
  ) {
    warnings.push(
      'Messages retention exceeds conversations retention - may cause orphaned messages'
    );
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    conflicts
  };
}
