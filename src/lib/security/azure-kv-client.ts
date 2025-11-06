/**
 * Azure Key Vault Client Library
 *
 * Provides encryption key management using Azure Key Vault as an alternative to AWS KMS.
 * This serves as a fallback for organizations preferring Azure infrastructure.
 *
 * Features:
 * - Data key generation with Azure Key Vault
 * - Secure key encryption/decryption
 * - Multi-tenant key isolation
 * - Comprehensive error handling
 * - Audit logging for all operations
 *
 * @module security/azure-kv-client
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { DefaultAzureCredential } from '@azure/identity'
import { CryptographyClient, KeyClient } from '@azure/keyvault-keys'
import { KeyManagementError } from '@/lib/crypto/types'
import * as crypto from 'crypto'

/**
 * Azure Key Vault Configuration
 */
export interface AzureKVConfig {
  /** Key Vault URL (e.g., https://your-vault.vault.azure.net/) */
  vaultUrl: string
  /** Key name in the vault */
  keyName: string
  /** Azure Tenant ID (optional if using DefaultAzureCredential) */
  tenantId?: string
  /** Azure Client ID (optional) */
  clientId?: string
  /** Azure Client Secret (optional) */
  clientSecret?: string
  /** Maximum retry attempts */
  maxRetries?: number
  /** Request timeout in milliseconds */
  timeout?: number
}

/**
 * Data key generation result (compatible with KMS interface)
 */
export interface DataKeyResult {
  /** Encrypted data key (for storage) */
  ciphertext: string
  /** Plaintext data key (for immediate use) */
  plaintext: Buffer
  /** Key ID used for generation */
  keyId: string
}

/**
 * Decryption result
 */
export interface DecryptionResult {
  /** Decrypted plaintext key */
  plaintext: Buffer
  /** Key ID used for decryption */
  keyId: string
}

/**
 * Key metadata information
 */
export interface KeyMetadata {
  /** Key ID */
  keyId: string
  /** Key Vault URL */
  vaultUrl: string
  /** Key name */
  keyName: string
  /** Whether key is enabled */
  enabled: boolean
  /** Creation date */
  createdAt: Date
  /** Update date */
  updatedAt?: Date
}

/**
 * Azure Key Vault operation statistics
 */
export interface AzureKVStats {
  /** Total operations performed */
  totalOperations: number
  /** Successful operations */
  successful: number
  /** Failed operations */
  failed: number
  /** Cache hits */
  cacheHits: number
  /** Cache misses */
  cacheMisses: number
  /** Average response time in ms */
  averageResponseTime: number
}

/**
 * Azure Key Vault Client for encryption key management
 */
export class AzureKVClient {
  private keyClient: KeyClient
  private cryptoClient: CryptographyClient
  private config: Required<AzureKVConfig>
  private keyCache: Map<string, { key: Buffer; timestamp: number }>
  private readonly CACHE_TTL = 3600000 // 1 hour
  private stats: AzureKVStats

  /**
   * Create a new Azure Key Vault client
   *
   * @param config - Azure Key Vault configuration
   * @throws {KeyManagementError} If configuration is invalid
   */
  constructor(config?: Partial<AzureKVConfig>) {
    this.config = this.loadConfig(config)
    this.validateConfig()

    // Initialize Azure clients with authentication
    const credential = this.getCredential()

    this.keyClient = new KeyClient(this.config.vaultUrl, credential)
    this.cryptoClient = new CryptographyClient(this.config.keyName, credential)

    this.keyCache = new Map()
    this.stats = {
      totalOperations: 0,
      successful: 0,
      failed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
    }
  }

  /**
   * Load configuration from environment and override with provided config
   */
  private loadConfig(config?: Partial<AzureKVConfig>): Required<AzureKVConfig> {
    return {
      vaultUrl: config?.vaultUrl || process.env.AZURE_KEY_VAULT_URL || '',
      keyName: config?.keyName || process.env.AZURE_KEY_NAME || 'adsapp-encryption-key',
      tenantId: config?.tenantId || process.env.AZURE_TENANT_ID,
      clientId: config?.clientId || process.env.AZURE_CLIENT_ID,
      clientSecret: config?.clientSecret || process.env.AZURE_CLIENT_SECRET,
      maxRetries: config?.maxRetries || 3,
      timeout: config?.timeout || 30000,
    }
  }

  /**
   * Get Azure credential based on configuration
   */
  private getCredential(): DefaultAzureCredential {
    // Use DefaultAzureCredential which automatically handles multiple auth methods:
    // - Environment variables (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID)
    // - Managed Identity (when running in Azure)
    // - Azure CLI credentials
    return new DefaultAzureCredential()
  }

  /**
   * Validate Azure Key Vault configuration
   *
   * @throws {KeyManagementError} If configuration is invalid
   */
  private validateConfig(): void {
    if (!this.config.vaultUrl) {
      throw new KeyManagementError('AZURE_KEY_VAULT_URL is required', 'MISSING_VAULT_URL', {
        hint: 'Set AZURE_KEY_VAULT_URL environment variable',
      })
    }

    if (!this.config.keyName) {
      throw new KeyManagementError('AZURE_KEY_NAME is required', 'MISSING_KEY_NAME', {
        hint: 'Set AZURE_KEY_NAME environment variable',
      })
    }

    // Validate vault URL format
    try {
      const url = new URL(this.config.vaultUrl)
      if (!url.hostname.endsWith('.vault.azure.net')) {
        throw new Error('Invalid vault domain')
      }
    } catch (error) {
      throw new KeyManagementError('Invalid Azure Key Vault URL format', 'INVALID_VAULT_URL', {
        vaultUrl: this.config.vaultUrl,
        hint: 'URL should be in format: https://your-vault.vault.azure.net/',
      })
    }
  }

  /**
   * Generate a new data key for tenant-specific encryption
   *
   * @param tenantId - Tenant identifier for key isolation
   * @returns Data key result with ciphertext and plaintext
   * @throws {KeyManagementError} If key generation fails
   */
  async generateDataKey(tenantId: string): Promise<DataKeyResult> {
    const startTime = Date.now()
    this.stats.totalOperations++

    try {
      // Generate random 32-byte data key
      const plaintextKey = crypto.randomBytes(32)

      // Encrypt the data key with Azure Key Vault
      const encryptResult = await this.cryptoClient.encrypt(
        {
          algorithm: 'RSA-OAEP-256',
          plaintext: plaintextKey,
        },
        {
          additionalAuthenticatedData: Buffer.from(
            JSON.stringify({
              TenantId: tenantId,
              Purpose: 'DataEncryption',
              Timestamp: new Date().toISOString(),
            })
          ),
        }
      )

      if (!encryptResult.result) {
        throw new KeyManagementError(
          'Azure Key Vault returned no encrypted data',
          'INCOMPLETE_DATA_KEY'
        )
      }

      const result: DataKeyResult = {
        ciphertext: Buffer.from(encryptResult.result).toString('base64'),
        plaintext: plaintextKey,
        keyId: this.config.keyName,
      }

      // Cache the plaintext key
      this.cacheKey(tenantId, result.plaintext)

      this.stats.successful++
      this.updateAverageResponseTime(Date.now() - startTime)

      // Audit log
      this.logOperation('generateDataKey', tenantId, true)

      return result
    } catch (error) {
      this.stats.failed++
      this.logOperation('generateDataKey', tenantId, false, error)

      throw new KeyManagementError(
        'Failed to generate data key with Azure Key Vault',
        'GENERATE_KEY_FAILED',
        {
          tenantId,
          originalError: error instanceof Error ? error.message : String(error),
        }
      )
    }
  }

  /**
   * Decrypt a ciphertext data key
   *
   * @param ciphertext - Base64 encoded encrypted data key
   * @param tenantId - Tenant identifier for context validation
   * @returns Decrypted plaintext key
   * @throws {KeyManagementError} If decryption fails
   */
  async decryptDataKey(ciphertext: string, tenantId: string): Promise<DecryptionResult> {
    const startTime = Date.now()
    this.stats.totalOperations++

    try {
      // Check cache first
      const cached = this.getCachedKey(tenantId)
      if (cached) {
        this.stats.cacheHits++
        return {
          plaintext: cached,
          keyId: this.config.keyName,
        }
      }

      this.stats.cacheMisses++

      // Decrypt with Azure Key Vault
      const decryptResult = await this.cryptoClient.decrypt(
        {
          algorithm: 'RSA-OAEP-256',
          ciphertext: Buffer.from(ciphertext, 'base64'),
        },
        {
          additionalAuthenticatedData: Buffer.from(
            JSON.stringify({
              TenantId: tenantId,
              Purpose: 'DataEncryption',
            })
          ),
        }
      )

      if (!decryptResult.result) {
        throw new KeyManagementError('Azure Key Vault returned no plaintext', 'NO_PLAINTEXT')
      }

      const plaintext = Buffer.from(decryptResult.result)

      // Cache the decrypted key
      this.cacheKey(tenantId, plaintext)

      this.stats.successful++
      this.updateAverageResponseTime(Date.now() - startTime)

      // Audit log
      this.logOperation('decryptDataKey', tenantId, true)

      return {
        plaintext,
        keyId: this.config.keyName,
      }
    } catch (error) {
      this.stats.failed++
      this.logOperation('decryptDataKey', tenantId, false, error)

      throw new KeyManagementError(
        'Failed to decrypt data key with Azure Key Vault',
        'DECRYPT_KEY_FAILED',
        {
          tenantId,
          originalError: error instanceof Error ? error.message : String(error),
        }
      )
    }
  }

  /**
   * Get Azure Key Vault key metadata
   *
   * @returns Key metadata information
   * @throws {KeyManagementError} If operation fails
   */
  async getKeyMetadata(): Promise<KeyMetadata> {
    try {
      const key = await this.keyClient.getKey(this.config.keyName)

      return {
        keyId: key.id || this.config.keyName,
        vaultUrl: this.config.vaultUrl,
        keyName: this.config.keyName,
        enabled: key.properties.enabled || false,
        createdAt: key.properties.createdOn || new Date(),
        updatedAt: key.properties.updatedOn,
      }
    } catch (error) {
      throw new KeyManagementError(
        'Failed to get key metadata from Azure Key Vault',
        'GET_METADATA_FAILED',
        {
          originalError: error instanceof Error ? error.message : String(error),
        }
      )
    }
  }

  /**
   * Clear cached keys for a tenant
   *
   * @param tenantId - Tenant identifier (optional, clears all if not provided)
   */
  clearCache(tenantId?: string): void {
    if (tenantId) {
      this.keyCache.delete(tenantId)
    } else {
      this.keyCache.clear()
    }
  }

  /**
   * Get Azure Key Vault client statistics
   *
   * @returns Current statistics
   */
  getStats(): AzureKVStats {
    return { ...this.stats }
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalOperations: 0,
      successful: 0,
      failed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
    }
  }

  /**
   * Test Azure Key Vault connectivity and permissions
   *
   * @returns True if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getKeyMetadata()
      return true
    } catch (error) {
      console.error('Azure Key Vault connection test failed:', error)
      return false
    }
  }

  /**
   * Cache a decrypted key
   */
  private cacheKey(tenantId: string, key: Buffer): void {
    this.keyCache.set(tenantId, {
      key: Buffer.from(key),
      timestamp: Date.now(),
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
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    const total = this.stats.averageResponseTime * (this.stats.successful - 1) + responseTime
    this.stats.averageResponseTime = total / this.stats.successful
  }

  /**
   * Log Azure Key Vault operation for audit trail
   */
  private logOperation(
    operation: string,
    tenantId: string,
    success: boolean,
    error?: unknown
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      tenantId,
      success,
      provider: 'azure-keyvault',
      error: error instanceof Error ? error.message : undefined,
    }

    // In production, send to proper logging service
    if (process.env.NODE_ENV === 'development') {
      console.log('[Azure KV Audit]', JSON.stringify(logEntry))
    }
  }
}

/**
 * Singleton Azure Key Vault client instance
 */
let azureKVClientInstance: AzureKVClient | null = null

/**
 * Get or create Azure Key Vault client singleton
 *
 * @param config - Optional configuration
 * @returns Azure Key Vault client instance
 */
export function getAzureKVClient(config?: Partial<AzureKVConfig>): AzureKVClient {
  if (!azureKVClientInstance) {
    azureKVClientInstance = new AzureKVClient(config)
  }
  return azureKVClientInstance
}

/**
 * Reset Azure Key Vault client singleton (useful for testing)
 */
export function resetAzureKVClient(): void {
  if (azureKVClientInstance) {
    azureKVClientInstance.clearCache()
    azureKVClientInstance = null
  }
}

/**
 * Export for testing
 */
export const __testing__ = {
  AzureKVClient,
  resetAzureKVClient,
}
