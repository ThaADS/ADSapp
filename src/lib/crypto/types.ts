/**
 * Encryption Types and Interfaces
 *
 * Type definitions for the field-level encryption system.
 * Supports AES-256-GCM encryption with versioning for key rotation.
 *
 * @module crypto/types
 */

/**
 * Encrypted field structure with version support for key rotation
 */
export interface EncryptedField {
  /** Base64 encoded: IV + ciphertext + authTag */
  encrypted: string;
  /** Version identifier for key rotation (v1, v2, etc.) */
  version: string;
  /** Optional algorithm identifier for future flexibility */
  algorithm?: string;
}

/**
 * Encryption configuration
 */
export interface EncryptionConfig {
  /** Master encryption key (32 bytes for AES-256) */
  key: Buffer;
  /** Current key version */
  version: string;
  /** Algorithm to use (default: aes-256-gcm) */
  algorithm?: string;
  /** IV length in bytes (default: 12 for GCM) */
  ivLength?: number;
  /** Auth tag length in bytes (default: 16 for GCM) */
  authTagLength?: number;
}

/**
 * Encryption result with metadata
 */
export interface EncryptionResult {
  /** Encrypted data as base64 string */
  encrypted: string;
  /** Key version used */
  version: string;
  /** Algorithm used */
  algorithm: string;
  /** Initialization vector (base64) */
  iv: string;
  /** Authentication tag (base64) */
  authTag: string;
}

/**
 * Decryption result
 */
export interface DecryptionResult {
  /** Decrypted plaintext */
  plaintext: string;
  /** Key version that was used */
  version: string;
  /** Algorithm that was used */
  algorithm: string;
}

/**
 * Batch encryption request
 */
export interface BatchEncryptRequest {
  /** Field name */
  field: string;
  /** Value to encrypt */
  value: string | null;
  /** Record ID for tracking */
  id: string;
}

/**
 * Batch encryption result
 */
export interface BatchEncryptResult {
  /** Record ID */
  id: string;
  /** Field name */
  field: string;
  /** Encrypted value */
  encrypted: string | null;
  /** Whether encryption succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Batch decryption request
 */
export interface BatchDecryptRequest {
  /** Field name */
  field: string;
  /** Encrypted value */
  encrypted: string | null;
  /** Record ID for tracking */
  id: string;
}

/**
 * Batch decryption result
 */
export interface BatchDecryptResult {
  /** Record ID */
  id: string;
  /** Field name */
  field: string;
  /** Decrypted value */
  decrypted: string | null;
  /** Whether decryption succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Encryption audit log entry
 */
export interface EncryptionAuditLog {
  /** Timestamp of operation */
  timestamp: Date;
  /** Operation type */
  operation: 'encrypt' | 'decrypt' | 'batch_encrypt' | 'batch_decrypt';
  /** Table name */
  table?: string;
  /** Field name */
  field?: string;
  /** Record ID */
  recordId?: string;
  /** Number of records processed (for batch) */
  recordCount?: number;
  /** Whether operation succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** User ID who performed operation */
  userId?: string;
  /** Organization ID */
  organizationId?: string;
}

/**
 * Migration progress tracking
 */
export interface MigrationProgress {
  /** Table being migrated */
  table: string;
  /** Total records to migrate */
  total: number;
  /** Records processed so far */
  processed: number;
  /** Records successfully encrypted */
  successful: number;
  /** Records that failed */
  failed: number;
  /** Start time */
  startedAt: Date;
  /** End time (if completed) */
  completedAt?: Date;
  /** Current status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  /** Error message if failed */
  error?: string;
}

/**
 * Fields that require encryption by table
 */
export interface EncryptedFieldsMap {
  contacts: string[];
  profiles: string[];
  api_keys?: string[];
  whatsapp_credentials?: string[];
}

/**
 * Default encrypted fields configuration
 */
export const ENCRYPTED_FIELDS: EncryptedFieldsMap = {
  contacts: ['phone_number', 'whatsapp_id'],
  profiles: ['email'],
  api_keys: ['key_value', 'secret'],
  whatsapp_credentials: ['access_token', 'phone_number_id', 'business_account_id'],
};

/**
 * Encryption constants
 */
export const ENCRYPTION_CONSTANTS = {
  /** AES-256-GCM algorithm identifier */
  ALGORITHM: 'aes-256-gcm' as const,
  /** Key size in bytes (256 bits) */
  KEY_SIZE: 32,
  /** IV size in bytes (96 bits for GCM) */
  IV_SIZE: 12,
  /** Auth tag size in bytes (128 bits) */
  AUTH_TAG_SIZE: 16,
  /** Current encryption version */
  CURRENT_VERSION: 'v1' as const,
  /** Encoding for storage */
  ENCODING: 'base64' as const,
  /** UTF-8 encoding for strings */
  STRING_ENCODING: 'utf8' as const,
} as const;

/**
 * Error types for encryption operations
 */
export class EncryptionError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = 'EncryptionError';
  }
}

export class DecryptionError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = 'DecryptionError';
  }
}

export class KeyManagementError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = 'KeyManagementError';
  }
}

/**
 * Validation result for encrypted data
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Details about the validation */
  details?: {
    hasVersion?: boolean;
    hasEncrypted?: boolean;
    isBase64?: boolean;
    hasValidStructure?: boolean;
  };
}

/**
 * Type guard to check if value is EncryptedField
 */
export function isEncryptedField(value: unknown): value is EncryptedField {
  return (
    typeof value === 'object' &&
    value !== null &&
    'encrypted' in value &&
    'version' in value &&
    typeof (value as EncryptedField).encrypted === 'string' &&
    typeof (value as EncryptedField).version === 'string'
  );
}

/**
 * Type guard to check if value needs encryption
 */
export function needsEncryption(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
