/**
 * Field-Level Encryptor
 *
 * High-level API for encrypting and decrypting database fields.
 * Provides type-safe operations with comprehensive error handling,
 * batch processing support, and audit logging capabilities.
 *
 * Features:
 * - Type-safe field encryption/decryption
 * - Null/undefined handling
 * - Batch operations for migrations
 * - Audit logging for compliance
 * - Transparent error handling
 * - Support for all PII fields
 *
 * @module crypto/field-encryptor
 */

import {
  encrypt as encryptCore,
  decrypt as decryptCore,
  encryptBatch as encryptBatchCore,
  decryptBatch as decryptBatchCore,
  validateEncryptedData,
  getEncryptionStatus,
} from './encryption'
import {
  EncryptionError,
  DecryptionError,
  EncryptionAuditLog,
  BatchEncryptRequest,
  BatchEncryptResult,
  BatchDecryptRequest,
  BatchDecryptResult,
  ENCRYPTION_CONSTANTS,
  ENCRYPTED_FIELDS,
  EncryptedFieldsMap,
  needsEncryption,
} from './types'

/**
 * Field encryptor class for managing encrypted fields
 */
export class FieldEncryptor {
  private auditLogs: EncryptionAuditLog[] = []
  private enableAuditLogging: boolean

  constructor(options?: { enableAuditLogging?: boolean }) {
    this.enableAuditLogging = options?.enableAuditLogging ?? true
  }

  /**
   * Encrypt a single field value
   *
   * @param value - Plaintext value to encrypt
   * @param fieldName - Name of the field (for audit logging)
   * @param metadata - Additional metadata for audit log
   * @returns Encrypted value as base64 string, or null if input is null/empty
   *
   * @example
   * ```typescript
   * const encryptor = new FieldEncryptor();
   * const encrypted = encryptor.encryptField('+1234567890', 'phone_number');
   * ```
   */
  encryptField(
    value: string | null | undefined,
    fieldName?: string,
    metadata?: {
      table?: string
      recordId?: string
      userId?: string
      organizationId?: string
    }
  ): string | null {
    const startTime = Date.now()

    try {
      // Handle null/undefined/empty values
      if (!value || value.trim() === '') {
        this.logAudit({
          operation: 'encrypt',
          field: fieldName,
          success: true,
          timestamp: new Date(),
          ...metadata,
        })
        return null
      }

      // Perform encryption
      const result = encryptCore(value)

      // Log successful encryption
      this.logAudit({
        operation: 'encrypt',
        field: fieldName,
        success: true,
        timestamp: new Date(),
        ...metadata,
      })

      return result.encrypted
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Log failed encryption
      this.logAudit({
        operation: 'encrypt',
        field: fieldName,
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        ...metadata,
      })

      // Re-throw with context
      throw new EncryptionError(
        `Failed to encrypt field '${fieldName || 'unknown'}': ${errorMessage}`,
        'FIELD_ENCRYPTION_FAILED',
        {
          field: fieldName,
          originalError: errorMessage,
          duration: Date.now() - startTime,
          ...metadata,
        }
      )
    }
  }

  /**
   * Decrypt a single field value
   *
   * @param encryptedValue - Encrypted value (base64 string)
   * @param fieldName - Name of the field (for audit logging)
   * @param metadata - Additional metadata for audit log
   * @returns Decrypted plaintext value, or null if input is null/empty
   *
   * @example
   * ```typescript
   * const encryptor = new FieldEncryptor();
   * const decrypted = encryptor.decryptField(encryptedValue, 'phone_number');
   * ```
   */
  decryptField(
    encryptedValue: string | null | undefined,
    fieldName?: string,
    metadata?: {
      table?: string
      recordId?: string
      userId?: string
      organizationId?: string
    }
  ): string | null {
    const startTime = Date.now()

    try {
      // Handle null/undefined/empty values
      if (!encryptedValue || encryptedValue.trim() === '') {
        this.logAudit({
          operation: 'decrypt',
          field: fieldName,
          success: true,
          timestamp: new Date(),
          ...metadata,
        })
        return null
      }

      // Validate encrypted data format
      const validation = validateEncryptedData(encryptedValue, ENCRYPTION_CONSTANTS.CURRENT_VERSION)

      if (!validation.valid) {
        throw new DecryptionError(
          `Invalid encrypted data format: ${validation.error}`,
          'INVALID_ENCRYPTED_FORMAT',
          validation.details
        )
      }

      // Perform decryption
      const result = decryptCore(encryptedValue, ENCRYPTION_CONSTANTS.CURRENT_VERSION)

      // Log successful decryption
      this.logAudit({
        operation: 'decrypt',
        field: fieldName,
        success: true,
        timestamp: new Date(),
        ...metadata,
      })

      return result.plaintext
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Log failed decryption
      this.logAudit({
        operation: 'decrypt',
        field: fieldName,
        success: false,
        error: errorMessage,
        timestamp: new Date(),
        ...metadata,
      })

      // Re-throw with context
      throw new DecryptionError(
        `Failed to decrypt field '${fieldName || 'unknown'}': ${errorMessage}`,
        'FIELD_DECRYPTION_FAILED',
        {
          field: fieldName,
          originalError: errorMessage,
          duration: Date.now() - startTime,
          ...metadata,
        }
      )
    }
  }

  /**
   * Encrypt multiple fields in a record
   *
   * @param record - Record object with fields to encrypt
   * @param fields - Array of field names to encrypt
   * @param metadata - Metadata for audit logging
   * @returns New record object with encrypted fields
   *
   * @example
   * ```typescript
   * const encryptor = new FieldEncryptor();
   * const encrypted = encryptor.encryptRecord(
   *   { name: 'John', phone: '+1234567890', email: 'john@example.com' },
   *   ['phone', 'email']
   * );
   * ```
   */
  encryptRecord<T extends Record<string, unknown>>(
    record: T,
    fields: (keyof T)[],
    metadata?: {
      table?: string
      recordId?: string
      userId?: string
      organizationId?: string
    }
  ): T {
    const encryptedRecord = { ...record }

    for (const field of fields) {
      const value = record[field]

      if (typeof value === 'string') {
        encryptedRecord[field] = this.encryptField(value, String(field), {
          ...metadata,
          recordId: metadata?.recordId || (record.id as string),
        }) as T[keyof T]
      }
    }

    return encryptedRecord
  }

  /**
   * Decrypt multiple fields in a record
   *
   * @param record - Record object with encrypted fields
   * @param fields - Array of field names to decrypt
   * @param metadata - Metadata for audit logging
   * @returns New record object with decrypted fields
   *
   * @example
   * ```typescript
   * const encryptor = new FieldEncryptor();
   * const decrypted = encryptor.decryptRecord(
   *   encryptedRecord,
   *   ['phone', 'email']
   * );
   * ```
   */
  decryptRecord<T extends Record<string, unknown>>(
    record: T,
    fields: (keyof T)[],
    metadata?: {
      table?: string
      recordId?: string
      userId?: string
      organizationId?: string
    }
  ): T {
    const decryptedRecord = { ...record }

    for (const field of fields) {
      const value = record[field]

      if (typeof value === 'string') {
        decryptedRecord[field] = this.decryptField(value, String(field), {
          ...metadata,
          recordId: metadata?.recordId || (record.id as string),
        }) as T[keyof T]
      }
    }

    return decryptedRecord
  }

  /**
   * Batch encrypt multiple values
   *
   * @param requests - Array of encryption requests
   * @returns Array of encryption results
   *
   * @example
   * ```typescript
   * const encryptor = new FieldEncryptor();
   * const results = encryptor.batchEncrypt([
   *   { id: '1', field: 'phone', value: '+1234567890' },
   *   { id: '2', field: 'phone', value: '+9876543210' },
   * ]);
   * ```
   */
  batchEncrypt(requests: BatchEncryptRequest[]): BatchEncryptResult[] {
    const startTime = Date.now()
    const results: BatchEncryptResult[] = []

    for (const request of requests) {
      try {
        const encrypted = this.encryptField(request.value, request.field, {
          recordId: request.id,
        })

        results.push({
          id: request.id,
          field: request.field,
          encrypted,
          success: true,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        results.push({
          id: request.id,
          field: request.field,
          encrypted: null,
          success: false,
          error: errorMessage,
        })
      }
    }

    // Log batch operation
    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    this.logAudit({
      operation: 'batch_encrypt',
      recordCount: requests.length,
      success: failureCount === 0,
      error: failureCount > 0 ? `${failureCount} records failed` : undefined,
      timestamp: new Date(),
    })

    return results
  }

  /**
   * Batch decrypt multiple values
   *
   * @param requests - Array of decryption requests
   * @returns Array of decryption results
   *
   * @example
   * ```typescript
   * const encryptor = new FieldEncryptor();
   * const results = encryptor.batchDecrypt([
   *   { id: '1', field: 'phone', encrypted: 'base64...' },
   *   { id: '2', field: 'phone', encrypted: 'base64...' },
   * ]);
   * ```
   */
  batchDecrypt(requests: BatchDecryptRequest[]): BatchDecryptResult[] {
    const startTime = Date.now()
    const results: BatchDecryptResult[] = []

    for (const request of requests) {
      try {
        const decrypted = this.decryptField(request.encrypted, request.field, {
          recordId: request.id,
        })

        results.push({
          id: request.id,
          field: request.field,
          decrypted,
          success: true,
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)

        results.push({
          id: request.id,
          field: request.field,
          decrypted: null,
          success: false,
          error: errorMessage,
        })
      }
    }

    // Log batch operation
    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    this.logAudit({
      operation: 'batch_decrypt',
      recordCount: requests.length,
      success: failureCount === 0,
      error: failureCount > 0 ? `${failureCount} records failed` : undefined,
      timestamp: new Date(),
    })

    return results
  }

  /**
   * Get fields that should be encrypted for a given table
   *
   * @param tableName - Name of the database table
   * @returns Array of field names to encrypt
   */
  getEncryptedFieldsForTable(tableName: keyof EncryptedFieldsMap): string[] {
    return ENCRYPTED_FIELDS[tableName] || []
  }

  /**
   * Check if a field should be encrypted
   *
   * @param tableName - Name of the database table
   * @param fieldName - Name of the field
   * @returns True if field should be encrypted
   */
  shouldEncryptField(tableName: keyof EncryptedFieldsMap, fieldName: string): boolean {
    const fields = this.getEncryptedFieldsForTable(tableName)
    return fields.includes(fieldName)
  }

  /**
   * Encrypt all PII fields in a contacts record
   *
   * @param contact - Contact record
   * @returns Contact record with encrypted PII fields
   */
  encryptContact<T extends { phone_number?: string | null; whatsapp_id?: string | null }>(
    contact: T,
    metadata?: { organizationId?: string; userId?: string }
  ): T {
    return this.encryptRecord(contact, ['phone_number', 'whatsapp_id'], {
      table: 'contacts',
      recordId: (contact as { id?: string }).id,
      ...metadata,
    })
  }

  /**
   * Decrypt all PII fields in a contacts record
   *
   * @param contact - Contact record with encrypted fields
   * @returns Contact record with decrypted PII fields
   */
  decryptContact<T extends { phone_number?: string | null; whatsapp_id?: string | null }>(
    contact: T,
    metadata?: { organizationId?: string; userId?: string }
  ): T {
    return this.decryptRecord(contact, ['phone_number', 'whatsapp_id'], {
      table: 'contacts',
      recordId: (contact as { id?: string }).id,
      ...metadata,
    })
  }

  /**
   * Encrypt all PII fields in a profile record
   *
   * @param profile - Profile record
   * @returns Profile record with encrypted PII fields
   */
  encryptProfile<T extends { email?: string | null }>(
    profile: T,
    metadata?: { organizationId?: string; userId?: string }
  ): T {
    return this.encryptRecord(profile, ['email'], {
      table: 'profiles',
      recordId: (profile as { id?: string }).id,
      ...metadata,
    })
  }

  /**
   * Decrypt all PII fields in a profile record
   *
   * @param profile - Profile record with encrypted fields
   * @returns Profile record with decrypted PII fields
   */
  decryptProfile<T extends { email?: string | null }>(
    profile: T,
    metadata?: { organizationId?: string; userId?: string }
  ): T {
    return this.decryptRecord(profile, ['email'], {
      table: 'profiles',
      recordId: (profile as { id?: string }).id,
      ...metadata,
    })
  }

  /**
   * Get all audit logs
   *
   * @returns Array of audit log entries
   */
  getAuditLogs(): EncryptionAuditLog[] {
    return [...this.auditLogs]
  }

  /**
   * Clear audit logs
   */
  clearAuditLogs(): void {
    this.auditLogs = []
  }

  /**
   * Get audit logs filtered by criteria
   *
   * @param filter - Filter criteria
   * @returns Filtered audit log entries
   */
  getFilteredAuditLogs(filter: {
    operation?: EncryptionAuditLog['operation']
    table?: string
    field?: string
    success?: boolean
    startDate?: Date
    endDate?: Date
  }): EncryptionAuditLog[] {
    return this.auditLogs.filter(log => {
      if (filter.operation && log.operation !== filter.operation) return false
      if (filter.table && log.table !== filter.table) return false
      if (filter.field && log.field !== filter.field) return false
      if (filter.success !== undefined && log.success !== filter.success) return false
      if (filter.startDate && log.timestamp < filter.startDate) return false
      if (filter.endDate && log.timestamp > filter.endDate) return false
      return true
    })
  }

  /**
   * Export audit logs to JSON
   *
   * @param filter - Optional filter criteria
   * @returns JSON string of audit logs
   */
  exportAuditLogs(filter?: Parameters<typeof this.getFilteredAuditLogs>[0]): string {
    const logs = filter ? this.getFilteredAuditLogs(filter) : this.auditLogs
    return JSON.stringify(logs, null, 2)
  }

  /**
   * Get encryption statistics
   *
   * @returns Statistics about encryption operations
   */
  getStatistics(): {
    totalOperations: number
    successfulOperations: number
    failedOperations: number
    successRate: number
    operationsByType: Record<string, number>
    operationsByTable: Record<string, number>
  } {
    const stats = {
      totalOperations: this.auditLogs.length,
      successfulOperations: this.auditLogs.filter(log => log.success).length,
      failedOperations: this.auditLogs.filter(log => !log.success).length,
      successRate: 0,
      operationsByType: {} as Record<string, number>,
      operationsByTable: {} as Record<string, number>,
    }

    stats.successRate =
      stats.totalOperations > 0 ? (stats.successfulOperations / stats.totalOperations) * 100 : 0

    // Count by operation type
    for (const log of this.auditLogs) {
      stats.operationsByType[log.operation] = (stats.operationsByType[log.operation] || 0) + 1

      if (log.table) {
        stats.operationsByTable[log.table] = (stats.operationsByTable[log.table] || 0) + 1
      }
    }

    return stats
  }

  /**
   * Log an audit entry
   *
   * @param log - Audit log entry
   */
  private logAudit(log: EncryptionAuditLog): void {
    if (this.enableAuditLogging) {
      this.auditLogs.push(log)
    }
  }

  /**
   * Verify encryption is working correctly
   *
   * @returns Status object with encryption health information
   */
  static verifyEncryption(): {
    healthy: boolean
    status: ReturnType<typeof getEncryptionStatus>
    message: string
  } {
    try {
      const status = getEncryptionStatus()

      if (!status.keyLoaded) {
        return {
          healthy: false,
          status,
          message: 'Encryption key not loaded',
        }
      }

      if (!status.testPassed) {
        return {
          healthy: false,
          status,
          message: 'Encryption test failed',
        }
      }

      return {
        healthy: true,
        status,
        message: 'Encryption system operational',
      }
    } catch (error) {
      return {
        healthy: false,
        status: {
          keyLoaded: false,
          version: 'unknown',
          algorithm: 'unknown',
          testPassed: false,
        },
        message: error instanceof Error ? error.message : String(error),
      }
    }
  }
}

/**
 * Singleton instance of FieldEncryptor for convenience
 */
export const fieldEncryptor = new FieldEncryptor({ enableAuditLogging: true })

/**
 * Convenience functions using singleton instance
 */
export const encryptField = (
  value: string | null | undefined,
  fieldName?: string,
  metadata?: Parameters<typeof fieldEncryptor.encryptField>[2]
): string | null => fieldEncryptor.encryptField(value, fieldName, metadata)

export const decryptField = (
  value: string | null | undefined,
  fieldName?: string,
  metadata?: Parameters<typeof fieldEncryptor.decryptField>[2]
): string | null => fieldEncryptor.decryptField(value, fieldName, metadata)

export const encryptContact = <
  T extends { phone_number?: string | null; whatsapp_id?: string | null },
>(
  contact: T,
  metadata?: { organizationId?: string; userId?: string }
): T => fieldEncryptor.encryptContact(contact, metadata)

export const decryptContact = <
  T extends { phone_number?: string | null; whatsapp_id?: string | null },
>(
  contact: T,
  metadata?: { organizationId?: string; userId?: string }
): T => fieldEncryptor.decryptContact(contact, metadata)

export const encryptProfile = <T extends { email?: string | null }>(
  profile: T,
  metadata?: { organizationId?: string; userId?: string }
): T => fieldEncryptor.encryptProfile(profile, metadata)

export const decryptProfile = <T extends { email?: string | null }>(
  profile: T,
  metadata?: { organizationId?: string; userId?: string }
): T => fieldEncryptor.decryptProfile(profile, metadata)
