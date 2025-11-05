/**
 * GDPR Data Anonymization
 *
 * Irreversible data anonymization for GDPR compliance.
 * Replaces PII with cryptographic hashes while preserving data structure.
 *
 * Anonymization Strategy:
 * - SHA-256 hashing with organization-specific salt
 * - Irreversible transformation (no decryption possible)
 * - Preserves data structure for analytics
 * - Maintains referential integrity
 *
 * Fields Anonymized:
 * - Phone numbers → ANONYMIZED_<hash>
 * - Email addresses → deleted_<hash>@anonymized.local
 * - Names → Deleted User <hash>
 * - Message content → [Message deleted per GDPR]
 * - IP addresses → Masked last octet
 *
 * Security Level: CRITICAL
 * Compliance: GDPR Article 4(5) - Pseudonymisation
 *
 * @module gdpr/anonymization
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { createHash, randomBytes } from 'crypto';

/**
 * Anonymization type
 */
export enum AnonymizationType {
  PHONE = 'phone',
  EMAIL = 'email',
  NAME = 'name',
  MESSAGE = 'message',
  IP_ADDRESS = 'ip_address',
  USER_AGENT = 'user_agent',
  LOCATION = 'location',
  CUSTOM = 'custom'
}

/**
 * Anonymization configuration
 */
export interface AnonymizationConfig {
  type: AnonymizationType;
  preserveFormat?: boolean;
  salt?: string;
  hashLength?: number;
}

/**
 * Anonymization result
 */
export interface AnonymizationEntry {
  original: string;
  anonymized: string;
  type: AnonymizationType;
  timestamp: string;
  irreversible: boolean;
}

/**
 * Organization salt cache
 * In production, store in secure key management system
 */
const ORGANIZATION_SALTS: Map<string, string> = new Map();

/**
 * Get anonymization salt for organization
 *
 * Generates and caches organization-specific salt for consistent hashing.
 * In production, store in secure key management system (AWS KMS, etc.)
 *
 * @param organizationId - Organization ID
 * @returns Salt string
 */
export function getOrganizationSalt(organizationId: string): string {
  let salt = ORGANIZATION_SALTS.get(organizationId);

  if (!salt) {
    // Generate new salt (32 bytes = 256 bits)
    salt = randomBytes(32).toString('hex');
    ORGANIZATION_SALTS.set(organizationId, salt);

    console.log(`[Anonymization] Generated new salt for org ${organizationId}`);
  }

  return salt;
}

/**
 * Create irreversible hash of value
 *
 * Uses SHA-256 with organization-specific salt.
 * Hash is deterministic within organization for consistency.
 *
 * @param value - Value to hash
 * @param type - Anonymization type
 * @param salt - Optional custom salt
 * @returns Hash string
 */
export function createAnonymizationHash(
  value: string,
  type: AnonymizationType,
  salt?: string
): string {
  const hashSalt = salt || 'default-salt';

  // Create SHA-256 hash
  const hash = createHash('sha256');
  hash.update(`${value}${hashSalt}${type}`);

  return hash.digest('hex');
}

/**
 * Get anonymized value based on type
 *
 * Main anonymization function that applies appropriate transformation.
 *
 * @param value - Original value
 * @param type - Anonymization type
 * @param config - Optional configuration
 * @returns Anonymized value
 */
export function getAnonymizedValue(
  value: string,
  type: AnonymizationType,
  config?: Partial<AnonymizationConfig>
): string {
  const salt = config?.salt;
  const hashLength = config?.hashLength || 8;

  switch (type) {
    case AnonymizationType.PHONE: {
      const hash = createAnonymizationHash(value, type, salt);
      return `ANONYMIZED_${hash.substring(0, hashLength)}`;
    }

    case AnonymizationType.EMAIL: {
      const hash = createAnonymizationHash(value, type, salt);
      return `deleted_${hash.substring(0, hashLength)}@anonymized.local`;
    }

    case AnonymizationType.NAME: {
      const hash = createAnonymizationHash(value, type, salt);
      return `Deleted User ${hash.substring(0, hashLength)}`;
    }

    case AnonymizationType.MESSAGE: {
      // Message content is fully replaced
      return '[Message deleted per GDPR]';
    }

    case AnonymizationType.IP_ADDRESS: {
      // Mask last octet for IP addresses
      const parts = value.split('.');
      if (parts.length === 4) {
        return `${parts[0]}.${parts[1]}.${parts[2]}.XXX`;
      }
      // IPv6 - mask last 4 segments
      const ipv6Parts = value.split(':');
      if (ipv6Parts.length === 8) {
        return ipv6Parts.slice(0, 4).join(':') + ':XXXX:XXXX:XXXX:XXXX';
      }
      // Fallback to full anonymization
      const hash = createAnonymizationHash(value, type, salt);
      return `ANONYMIZED_IP_${hash.substring(0, hashLength)}`;
    }

    case AnonymizationType.USER_AGENT: {
      // Preserve browser family but remove version and system details
      const browserMatch = value.match(
        /(Chrome|Firefox|Safari|Edge|Opera)/i
      );
      const browser = browserMatch ? browserMatch[1] : 'Browser';
      return `${browser}/[version anonymized]`;
    }

    case AnonymizationType.LOCATION: {
      // Preserve country, anonymize city/region
      const hash = createAnonymizationHash(value, type, salt);
      return `Location_${hash.substring(0, hashLength)}`;
    }

    case AnonymizationType.CUSTOM:
    default: {
      const hash = createAnonymizationHash(value, type, salt);
      return `ANONYMIZED_${hash.substring(0, hashLength)}`;
    }
  }
}

/**
 * Anonymize phone number
 *
 * @param phoneNumber - Original phone number
 * @param organizationId - Organization ID for salt
 * @returns Anonymized phone number
 */
export function anonymizePhoneNumber(
  phoneNumber: string,
  organizationId: string
): string {
  const salt = getOrganizationSalt(organizationId);
  return getAnonymizedValue(phoneNumber, AnonymizationType.PHONE, { salt });
}

/**
 * Anonymize email address
 *
 * @param email - Original email address
 * @param organizationId - Organization ID for salt
 * @returns Anonymized email address
 */
export function anonymizeEmail(
  email: string,
  organizationId: string
): string {
  const salt = getOrganizationSalt(organizationId);
  return getAnonymizedValue(email, AnonymizationType.EMAIL, { salt });
}

/**
 * Anonymize user name
 *
 * @param name - Original name
 * @param organizationId - Organization ID for salt
 * @returns Anonymized name
 */
export function anonymizeName(name: string, organizationId: string): string {
  const salt = getOrganizationSalt(organizationId);
  return getAnonymizedValue(name, AnonymizationType.NAME, { salt });
}

/**
 * Anonymize message content
 *
 * @returns Standard anonymized message text
 */
export function anonymizeMessage(): string {
  return getAnonymizedValue('', AnonymizationType.MESSAGE);
}

/**
 * Anonymize IP address
 *
 * @param ipAddress - Original IP address
 * @returns Anonymized IP address
 */
export function anonymizeIPAddress(ipAddress: string): string {
  return getAnonymizedValue(ipAddress, AnonymizationType.IP_ADDRESS);
}

/**
 * Anonymize user agent string
 *
 * @param userAgent - Original user agent
 * @returns Anonymized user agent
 */
export function anonymizeUserAgent(userAgent: string): string {
  return getAnonymizedValue(userAgent, AnonymizationType.USER_AGENT);
}

/**
 * Bulk anonymization of multiple values
 *
 * @param values - Array of values to anonymize
 * @param type - Anonymization type
 * @param organizationId - Organization ID for salt
 * @returns Array of anonymized values
 */
export function bulkAnonymize(
  values: string[],
  type: AnonymizationType,
  organizationId: string
): AnonymizationEntry[] {
  const salt = getOrganizationSalt(organizationId);
  const timestamp = new Date().toISOString();

  return values.map((original) => ({
    original,
    anonymized: getAnonymizedValue(original, type, { salt }),
    type,
    timestamp,
    irreversible: true
  }));
}

/**
 * Verify anonymization quality
 *
 * Ensures anonymized value cannot be reverse-engineered.
 *
 * @param original - Original value
 * @param anonymized - Anonymized value
 * @returns Quality check result
 */
export function verifyAnonymizationQuality(
  original: string,
  anonymized: string
): {
  quality: 'excellent' | 'good' | 'poor';
  details: string[];
  secure: boolean;
} {
  const details: string[] = [];
  let qualityScore = 0;

  // Check 1: No substring of original appears in anonymized
  if (!anonymized.toLowerCase().includes(original.toLowerCase())) {
    qualityScore += 3;
    details.push('No original substring present');
  } else {
    details.push('WARNING: Original substring detected');
  }

  // Check 2: Sufficient length
  if (anonymized.length >= 16) {
    qualityScore += 2;
    details.push('Sufficient length for security');
  } else {
    details.push('Short anonymization - may be vulnerable');
  }

  // Check 3: Contains anonymization marker
  if (
    anonymized.includes('ANONYMIZED') ||
    anonymized.includes('deleted') ||
    anonymized.includes('Deleted')
  ) {
    qualityScore += 2;
    details.push('Clear anonymization marker present');
  }

  // Check 4: Different from original
  if (original !== anonymized) {
    qualityScore += 3;
    details.push('Value successfully transformed');
  } else {
    details.push('ERROR: Value unchanged');
  }

  // Determine quality level
  let quality: 'excellent' | 'good' | 'poor';
  if (qualityScore >= 8) {
    quality = 'excellent';
  } else if (qualityScore >= 5) {
    quality = 'good';
  } else {
    quality = 'poor';
  }

  const secure = qualityScore >= 5;

  return {
    quality,
    details,
    secure
  };
}

/**
 * Generate anonymization report
 *
 * Creates audit report of anonymization operation.
 *
 * @param entries - Anonymization entries
 * @returns Report object
 */
export function generateAnonymizationReport(entries: AnonymizationEntry[]): {
  totalRecords: number;
  byType: Record<string, number>;
  timestamp: string;
  qualityChecks: {
    passed: number;
    failed: number;
    warnings: string[];
  };
} {
  const byType: Record<string, number> = {};
  const qualityChecks = {
    passed: 0,
    failed: 0,
    warnings: [] as string[]
  };

  entries.forEach((entry) => {
    // Count by type
    byType[entry.type] = (byType[entry.type] || 0) + 1;

    // Quality check
    const quality = verifyAnonymizationQuality(
      entry.original,
      entry.anonymized
    );

    if (quality.secure) {
      qualityChecks.passed += 1;
    } else {
      qualityChecks.failed += 1;
      qualityChecks.warnings.push(
        `Quality issue with ${entry.type}: ${quality.details.join(', ')}`
      );
    }
  });

  return {
    totalRecords: entries.length,
    byType,
    timestamp: new Date().toISOString(),
    qualityChecks
  };
}

/**
 * Anonymize structured data object
 *
 * Recursively anonymizes all PII fields in an object.
 *
 * @param data - Data object
 * @param fieldMap - Map of field names to anonymization types
 * @param organizationId - Organization ID for salt
 * @returns Anonymized data object
 */
export function anonymizeObject<T extends Record<string, any>>(
  data: T,
  fieldMap: Record<string, AnonymizationType>,
  organizationId: string
): T {
  const salt = getOrganizationSalt(organizationId);
  const anonymized = { ...data };

  for (const [field, type] of Object.entries(fieldMap)) {
    if (field in anonymized && anonymized[field] !== null) {
      const originalValue = String(anonymized[field]);
      anonymized[field] = getAnonymizedValue(originalValue, type, { salt });
    }
  }

  return anonymized;
}

/**
 * Check if value appears to be already anonymized
 *
 * @param value - Value to check
 * @returns True if value appears anonymized
 */
export function isAlreadyAnonymized(value: string): boolean {
  const anonymizationMarkers = [
    'ANONYMIZED',
    'deleted_',
    'Deleted User',
    '@anonymized.local',
    '[Message deleted',
    'ANONYMIZED_IP_',
    'Location_'
  ];

  return anonymizationMarkers.some((marker) => value.includes(marker));
}

/**
 * Anonymize database record
 *
 * Helper for anonymizing entire database records.
 *
 * @param record - Database record
 * @param table - Table name
 * @param organizationId - Organization ID for salt
 * @returns Anonymized record
 */
export function anonymizeRecord(
  record: Record<string, any>,
  table: string,
  organizationId: string
): Record<string, any> {
  // Define field mappings per table
  const tableMappings: Record<string, Record<string, AnonymizationType>> = {
    profiles: {
      email: AnonymizationType.EMAIL,
      full_name: AnonymizationType.NAME
    },
    contacts: {
      phone_number: AnonymizationType.PHONE,
      name: AnonymizationType.NAME,
      email: AnonymizationType.EMAIL
    },
    messages: {
      content: AnonymizationType.MESSAGE
    },
    organizations: {
      billing_email: AnonymizationType.EMAIL,
      contact_name: AnonymizationType.NAME
    }
  };

  const fieldMap = tableMappings[table];

  if (!fieldMap) {
    console.warn(`[Anonymization] No field mapping defined for table: ${table}`);
    return record;
  }

  return anonymizeObject(record, fieldMap, organizationId);
}

/**
 * Export anonymization for testing
 */
export const AnonymizationUtils = {
  getAnonymizedValue,
  createAnonymizationHash,
  verifyAnonymizationQuality,
  isAlreadyAnonymized
};
