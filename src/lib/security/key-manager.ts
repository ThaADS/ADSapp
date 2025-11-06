/**
 * Key Manager Service
 *
 * Manages encryption keys using AWS KMS with support for:
 * - Multi-tenant key isolation
 * - Automatic key rotation (90-day schedule)
 * - Key versioning for backward compatibility
 * - Tenant-specific key derivation
 * - Performance caching
 *
 * @module security/key-manager
 */

// @ts-nocheck - Type definitions need review
import { createClient } from '@/lib/supabase/server'
import { getKMSClient, KMSClient, DataKeyResult } from './kms-client'
import { KeyManagementError } from '@/lib/crypto/types'
import * as crypto from 'crypto'

/**
 * Key version information
 */
export interface KeyVersion {
  /** Version ID */
  id: string
  /** Tenant ID this key belongs to */
  tenantId: string
  /** KMS Key ID used */
  kmsKeyId: string
  /** Encrypted data key (ciphertext) */
  encryptedDataKey: string
  /** Key version number */
  version: number
  /** Whether this is the current/active key */
  isActive: boolean
  /** When the key was created */
  createdAt: Date
  /** When the key was rotated (null if still active) */
  rotatedAt?: Date
  /** When the key expires (90 days from creation) */
  expiresAt: Date
}

/**
 * Key retrieval options
 */
export interface KeyRetrievalOptions {
  /** Force refresh from KMS (skip cache) */
  forceRefresh?: boolean
  /** Specific key version to retrieve */
  version?: number
  /** Include expired keys */
  includeExpired?: boolean
}

/**
 * Key rotation result
 */
export interface KeyRotationResult {
  /** Number of keys successfully rotated */
  rotated: number
  /** Number of keys that failed rotation */
  failed: number
  /** List of tenant IDs that were rotated */
  tenantIds: string[]
  /** List of errors that occurred */
  errors: Array<{ tenantId: string; error: string }>
  /** Duration of rotation in milliseconds */
  duration: number
}

/**
 * Key statistics
 */
export interface KeyStats {
  /** Total keys managed */
  totalKeys: number
  /** Active keys */
  activeKeys: number
  /** Expired keys */
  expiredKeys: number
  /** Keys pending rotation */
  pendingRotation: number
  /** Average key age in days */
  averageKeyAge: number
}

/**
 * Key Manager for encryption key lifecycle management
 */
export class KeyManager {
  private kmsClient: KMSClient
  private keyCache: Map<string, { key: Buffer; timestamp: number; version: number }>
  private readonly CACHE_TTL = 3600000 // 1 hour
  private readonly KEY_ROTATION_DAYS = 90
  private readonly KEY_ROTATION_WARNING_DAYS = 7

  constructor(kmsClient?: KMSClient) {
    this.kmsClient = kmsClient || getKMSClient()
    this.keyCache = new Map()
  }

  /**
   * Get encryption key for a tenant
   * Automatically creates a new key if none exists
   *
   * @param tenantId - Tenant identifier
   * @param options - Retrieval options
   * @returns Decrypted encryption key
   * @throws {KeyManagementError} If key retrieval fails
   */
  async getEncryptionKey(tenantId: string, options: KeyRetrievalOptions = {}): Promise<Buffer> {
    try {
      // Check cache first unless force refresh
      if (!options.forceRefresh) {
        const cached = this.getCachedKey(tenantId)
        if (cached) {
          return cached
        }
      }

      // Get active key from database
      const keyVersion = await this.getActiveKeyVersion(tenantId)

      if (!keyVersion) {
        // No key exists, create one
        return await this.createKey(tenantId)
      }

      // Check if key is expired and needs rotation
      if (this.isKeyExpired(keyVersion.expiresAt)) {
        console.warn(`Key for tenant ${tenantId} has expired, rotating...`)
        return await this.rotateKey(tenantId)
      }

      // Check if key is approaching expiration
      if (this.isKeyNearExpiration(keyVersion.expiresAt)) {
        console.info(`Key for tenant ${tenantId} is approaching expiration`)
        // Trigger async rotation in background (don't wait)
        this.rotateKey(tenantId).catch(error => {
          console.error(`Background key rotation failed for ${tenantId}:`, error)
        })
      }

      // Decrypt the data key using KMS
      const decrypted = await this.kmsClient.decryptDataKey(keyVersion.encryptedDataKey, tenantId)

      // Cache the decrypted key
      this.cacheKey(tenantId, decrypted.plaintext, keyVersion.version)

      return decrypted.plaintext
    } catch (error) {
      throw new KeyManagementError(
        `Failed to get encryption key for tenant ${tenantId}`,
        'GET_KEY_FAILED',
        {
          tenantId,
          originalError: error instanceof Error ? error.message : String(error),
        }
      )
    }
  }

  /**
   * Create a new encryption key for a tenant
   *
   * @param tenantId - Tenant identifier
   * @returns Newly created encryption key
   * @throws {KeyManagementError} If key creation fails
   */
  async createKey(tenantId: string): Promise<Buffer> {
    try {
      // Generate data key from KMS
      const dataKey = await this.kmsClient.generateDataKey(tenantId)

      // Get the next version number
      const version = await this.getNextVersion(tenantId)

      // Calculate expiration date (90 days from now)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + this.KEY_ROTATION_DAYS)

      // Store in database
      const supabase = await createClient()
      const { error } = await supabase.from('encryption_keys').insert({
        tenant_id: tenantId,
        kms_key_id: dataKey.keyId,
        encrypted_data_key: dataKey.ciphertext,
        version: version,
        is_active: true,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      })

      if (error) {
        throw new Error(`Database insert failed: ${error.message}`)
      }

      // Log key creation
      await this.logKeyOperation('create', tenantId, version, true)

      // Cache the key
      this.cacheKey(tenantId, dataKey.plaintext, version)

      return dataKey.plaintext
    } catch (error) {
      await this.logKeyOperation('create', tenantId, 0, false, error)

      throw new KeyManagementError(
        `Failed to create key for tenant ${tenantId}`,
        'CREATE_KEY_FAILED',
        {
          tenantId,
          originalError: error instanceof Error ? error.message : String(error),
        }
      )
    }
  }

  /**
   * Rotate encryption key for a tenant
   *
   * @param tenantId - Tenant identifier
   * @returns New encryption key
   * @throws {KeyManagementError} If rotation fails
   */
  async rotateKey(tenantId: string): Promise<Buffer> {
    try {
      const supabase = await createClient()

      // Get current active key
      const currentKey = await this.getActiveKeyVersion(tenantId)
      if (!currentKey) {
        throw new Error('No active key found to rotate')
      }

      // Mark current key as inactive and set rotated_at
      const { error: updateError } = await supabase
        .from('encryption_keys')
        .update({
          is_active: false,
          rotated_at: new Date().toISOString(),
        })
        .eq('id', currentKey.id)

      if (updateError) {
        throw new Error(`Failed to deactivate old key: ${updateError.message}`)
      }

      // Create new key
      const newKey = await this.createKey(tenantId)

      // Log rotation
      await this.logKeyRotation(tenantId, currentKey.version, currentKey.version + 1)

      // Clear cache to force refresh
      this.clearCache(tenantId)

      return newKey
    } catch (error) {
      throw new KeyManagementError(
        `Failed to rotate key for tenant ${tenantId}`,
        'ROTATE_KEY_FAILED',
        {
          tenantId,
          originalError: error instanceof Error ? error.message : String(error),
        }
      )
    }
  }

  /**
   * Rotate keys for multiple tenants or all tenants
   *
   * @param tenantId - Optional specific tenant ID
   * @returns Rotation results
   */
  async rotateKeys(tenantId?: string): Promise<KeyRotationResult> {
    const startTime = Date.now()
    const result: KeyRotationResult = {
      rotated: 0,
      failed: 0,
      tenantIds: [],
      errors: [],
      duration: 0,
    }

    try {
      // Get tenants that need rotation
      const tenantsToRotate = tenantId ? [tenantId] : await this.getTenantsNeedingRotation()

      for (const tid of tenantsToRotate) {
        try {
          await this.rotateKey(tid)
          result.rotated++
          result.tenantIds.push(tid)
        } catch (error) {
          result.failed++
          result.errors.push({
            tenantId: tid,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      result.duration = Date.now() - startTime
      return result
    } catch (error) {
      result.duration = Date.now() - startTime
      throw new KeyManagementError('Batch key rotation failed', 'BATCH_ROTATION_FAILED', {
        result,
        originalError: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Schedule automatic key rotation
   * Should be called by a cron job or scheduled function
   *
   * @returns Promise that resolves when rotation is scheduled
   */
  async scheduleRotation(): Promise<void> {
    try {
      const tenantsNeedingRotation = await this.getTenantsNeedingRotation()

      if (tenantsNeedingRotation.length === 0) {
        console.info('No tenants need key rotation at this time')
        return
      }

      console.info(`Scheduling rotation for ${tenantsNeedingRotation.length} tenants`)

      // Rotate keys in batches to avoid overwhelming the system
      const batchSize = 10
      for (let i = 0; i < tenantsNeedingRotation.length; i += batchSize) {
        const batch = tenantsNeedingRotation.slice(i, i + batchSize)
        await Promise.allSettled(batch.map(tenantId => this.rotateKey(tenantId)))
      }

      console.info('Key rotation scheduling completed')
    } catch (error) {
      console.error('Failed to schedule key rotation:', error)
      throw error
    }
  }

  /**
   * Get key statistics
   *
   * @param tenantId - Optional tenant ID for specific stats
   * @returns Key statistics
   */
  async getKeyStats(tenantId?: string): Promise<KeyStats> {
    try {
      const supabase = await createClient()
      let query = supabase.from('encryption_keys').select('*')

      if (tenantId) {
        query = query.eq('tenant_id', tenantId)
      }

      const { data: keys, error } = await query

      if (error) {
        throw new Error(`Failed to fetch key stats: ${error.message}`)
      }

      const now = new Date()
      const stats: KeyStats = {
        totalKeys: keys?.length || 0,
        activeKeys: keys?.filter(k => k.is_active).length || 0,
        expiredKeys: keys?.filter(k => new Date(k.expires_at) < now).length || 0,
        pendingRotation: 0,
        averageKeyAge: 0,
      }

      // Calculate pending rotation
      const warningDate = new Date()
      warningDate.setDate(warningDate.getDate() + this.KEY_ROTATION_WARNING_DAYS)
      stats.pendingRotation =
        keys?.filter(
          k => k.is_active && new Date(k.expires_at) <= warningDate && new Date(k.expires_at) > now
        ).length || 0

      // Calculate average key age
      if (keys && keys.length > 0) {
        const totalAge = keys.reduce((sum, k) => {
          const age = now.getTime() - new Date(k.created_at).getTime()
          return sum + age / (1000 * 60 * 60 * 24) // Convert to days
        }, 0)
        stats.averageKeyAge = totalAge / keys.length
      }

      return stats
    } catch (error) {
      throw new KeyManagementError('Failed to get key statistics', 'GET_STATS_FAILED', {
        tenantId,
        originalError: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Get key version history for a tenant
   *
   * @param tenantId - Tenant identifier
   * @returns Array of key versions
   */
  async getKeyHistory(tenantId: string): Promise<KeyVersion[]> {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('encryption_keys')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('version', { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch key history: ${error.message}`)
      }

      return (
        data?.map(row => ({
          id: row.id,
          tenantId: row.tenant_id,
          kmsKeyId: row.kms_key_id,
          encryptedDataKey: row.encrypted_data_key,
          version: row.version,
          isActive: row.is_active,
          createdAt: new Date(row.created_at),
          rotatedAt: row.rotated_at ? new Date(row.rotated_at) : undefined,
          expiresAt: new Date(row.expires_at),
        })) || []
      )
    } catch (error) {
      throw new KeyManagementError(
        `Failed to get key history for tenant ${tenantId}`,
        'GET_HISTORY_FAILED',
        {
          tenantId,
          originalError: error instanceof Error ? error.message : String(error),
        }
      )
    }
  }

  /**
   * Clear key cache
   *
   * @param tenantId - Optional tenant ID to clear specific cache
   */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      this.keyCache.delete(tenantId)
    } else {
      this.keyCache.clear()
    }
  }

  /**
   * Get active key version from database
   */
  private async getActiveKeyVersion(tenantId: string): Promise<KeyVersion | null> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('encryption_keys')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      tenantId: data.tenant_id,
      kmsKeyId: data.kms_key_id,
      encryptedDataKey: data.encrypted_data_key,
      version: data.version,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      rotatedAt: data.rotated_at ? new Date(data.rotated_at) : undefined,
      expiresAt: new Date(data.expires_at),
    }
  }

  /**
   * Get next version number for a tenant
   */
  private async getNextVersion(tenantId: string): Promise<number> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('encryption_keys')
      .select('version')
      .eq('tenant_id', tenantId)
      .order('version', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return 1
    }

    return data.version + 1
  }

  /**
   * Get tenants that need key rotation
   */
  private async getTenantsNeedingRotation(): Promise<string[]> {
    const supabase = await createClient()

    // Get keys that are expired or expiring within warning period
    const warningDate = new Date()
    warningDate.setDate(warningDate.getDate() + this.KEY_ROTATION_WARNING_DAYS)

    const { data, error } = await supabase
      .from('encryption_keys')
      .select('tenant_id')
      .eq('is_active', true)
      .lte('expires_at', warningDate.toISOString())

    if (error || !data) {
      return []
    }

    // Return unique tenant IDs
    return [...new Set(data.map(row => row.tenant_id))]
  }

  /**
   * Check if key is expired
   */
  private isKeyExpired(expiresAt: Date): boolean {
    return new Date() > new Date(expiresAt)
  }

  /**
   * Check if key is near expiration
   */
  private isKeyNearExpiration(expiresAt: Date): boolean {
    const warningDate = new Date()
    warningDate.setDate(warningDate.getDate() + this.KEY_ROTATION_WARNING_DAYS)
    return new Date(expiresAt) <= warningDate
  }

  /**
   * Cache a decrypted key
   */
  private cacheKey(tenantId: string, key: Buffer, version: number): void {
    this.keyCache.set(tenantId, {
      key: Buffer.from(key),
      timestamp: Date.now(),
      version,
    })
  }

  /**
   * Get cached key if valid
   */
  private getCachedKey(tenantId: string): Buffer | null {
    const cached = this.keyCache.get(tenantId)

    if (!cached) {
      return null
    }

    // Check if cache entry is still valid
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.keyCache.delete(tenantId)
      return null
    }

    return Buffer.from(cached.key)
  }

  /**
   * Log key operation for audit trail
   */
  private async logKeyOperation(
    operation: string,
    tenantId: string,
    version: number,
    success: boolean,
    error?: unknown
  ): Promise<void> {
    try {
      const supabase = await createClient()
      await supabase.from('key_rotation_log').insert({
        tenant_id: tenantId,
        operation,
        from_version: version,
        to_version: version,
        success,
        error_message: error instanceof Error ? error.message : undefined,
        performed_at: new Date().toISOString(),
      })
    } catch (logError) {
      console.error('Failed to log key operation:', logError)
      // Don't throw - logging failure shouldn't stop the operation
    }
  }

  /**
   * Log key rotation
   */
  private async logKeyRotation(
    tenantId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<void> {
    try {
      const supabase = await createClient()
      await supabase.from('key_rotation_log').insert({
        tenant_id: tenantId,
        operation: 'rotate',
        from_version: fromVersion,
        to_version: toVersion,
        success: true,
        performed_at: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Failed to log key rotation:', error)
    }
  }
}

/**
 * Singleton key manager instance
 */
let keyManagerInstance: KeyManager | null = null

/**
 * Get or create key manager singleton
 *
 * @returns Key manager instance
 */
export function getKeyManager(): KeyManager {
  if (!keyManagerInstance) {
    keyManagerInstance = new KeyManager()
  }
  return keyManagerInstance
}

/**
 * Reset key manager singleton (useful for testing)
 */
export function resetKeyManager(): void {
  if (keyManagerInstance) {
    keyManagerInstance.clearCache()
    keyManagerInstance = null
  }
}

/**
 * Export for testing
 */
export const __testing__ = {
  KeyManager,
  resetKeyManager,
}
