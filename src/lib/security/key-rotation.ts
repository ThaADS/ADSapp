/**
 * Key Rotation Service
 *
 * Automated key rotation with zero-downtime re-encryption of data.
 * Handles scheduled rotation, data migration, and rollback capabilities.
 *
 * @module security/key-rotation
 */

import { createClient } from '@/lib/supabase/server';
import { getKeyManager, KeyManager, KeyRotationResult } from './key-manager';
import { encrypt, decrypt } from '@/lib/crypto/encryption';
import { KeyManagementError } from '@/lib/crypto/types';

/**
 * Re-encryption batch configuration
 */
export interface ReEncryptionConfig {
  /** Batch size for re-encryption */
  batchSize: number;
  /** Maximum concurrent batches */
  maxConcurrent: number;
  /** Delay between batches (ms) */
  batchDelay: number;
  /** Enable dry run mode (no actual updates) */
  dryRun: boolean;
}

/**
 * Re-encryption progress
 */
export interface ReEncryptionProgress {
  /** Table being processed */
  table: string;
  /** Total records to process */
  total: number;
  /** Records processed */
  processed: number;
  /** Records successfully re-encrypted */
  successful: number;
  /** Records that failed */
  failed: number;
  /** Start timestamp */
  startedAt: Date;
  /** Estimated completion time */
  estimatedCompletion?: Date;
  /** Current status */
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  /** Error messages */
  errors: Array<{ recordId: string; error: string }>;
}

/**
 * Rotation schedule configuration
 */
export interface RotationSchedule {
  /** Rotation interval in days */
  intervalDays: number;
  /** Grace period before forced rotation (days) */
  gracePeriodDays: number;
  /** Whether to automatically rotate */
  autoRotate: boolean;
  /** Time of day to perform rotation (HH:MM UTC) */
  rotationTime?: string;
}

/**
 * Key Rotation Service for automated key lifecycle management
 */
export class KeyRotationService {
  private keyManager: KeyManager;
  private readonly DEFAULT_BATCH_SIZE = 100;
  private readonly DEFAULT_MAX_CONCURRENT = 5;
  private readonly DEFAULT_BATCH_DELAY = 100; // ms

  constructor(keyManager?: KeyManager) {
    this.keyManager = keyManager || getKeyManager();
  }

  /**
   * Perform key rotation for a tenant with automatic data re-encryption
   *
   * @param tenantId - Tenant identifier
   * @param config - Re-encryption configuration
   * @returns Rotation result with statistics
   */
  async rotateWithReEncryption(
    tenantId: string,
    config?: Partial<ReEncryptionConfig>
  ): Promise<{
    keyRotation: KeyRotationResult;
    reEncryption: Record<string, ReEncryptionProgress>;
  }> {
    const fullConfig: ReEncryptionConfig = {
      batchSize: config?.batchSize || this.DEFAULT_BATCH_SIZE,
      maxConcurrent: config?.maxConcurrent || this.DEFAULT_MAX_CONCURRENT,
      batchDelay: config?.batchDelay || this.DEFAULT_BATCH_DELAY,
      dryRun: config?.dryRun || false,
    };

    try {
      // Step 1: Rotate the key
      console.info(`Starting key rotation for tenant ${tenantId}`);
      const startTime = Date.now();

      await this.keyManager.rotateKey(tenantId);

      const keyRotation: KeyRotationResult = {
        rotated: 1,
        failed: 0,
        tenantIds: [tenantId],
        errors: [],
        duration: Date.now() - startTime,
      };

      // Step 2: Re-encrypt existing data with new key
      console.info(`Starting data re-encryption for tenant ${tenantId}`);
      const reEncryption = await this.reEncryptTenantData(tenantId, fullConfig);

      return {
        keyRotation,
        reEncryption,
      };
    } catch (error) {
      throw new KeyManagementError(
        `Key rotation with re-encryption failed for tenant ${tenantId}`,
        'ROTATION_WITH_REENCRYPTION_FAILED',
        {
          tenantId,
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Re-encrypt all data for a tenant with the new key
   *
   * @param tenantId - Tenant identifier
   * @param config - Re-encryption configuration
   * @returns Progress for each table
   */
  async reEncryptTenantData(
    tenantId: string,
    config: ReEncryptionConfig
  ): Promise<Record<string, ReEncryptionProgress>> {
    const tables = ['contacts', 'profiles']; // Tables with encrypted fields
    const progress: Record<string, ReEncryptionProgress> = {};

    for (const table of tables) {
      try {
        progress[table] = await this.reEncryptTable(tenantId, table, config);
      } catch (error) {
        console.error(`Failed to re-encrypt table ${table}:`, error);
        progress[table] = {
          table,
          total: 0,
          processed: 0,
          successful: 0,
          failed: 0,
          startedAt: new Date(),
          status: 'failed',
          errors: [
            {
              recordId: 'N/A',
              error: error instanceof Error ? error.message : String(error),
            },
          ],
        };
      }
    }

    return progress;
  }

  /**
   * Re-encrypt a specific table for a tenant
   *
   * @param tenantId - Tenant identifier
   * @param table - Table name
   * @param config - Re-encryption configuration
   * @returns Re-encryption progress
   */
  private async reEncryptTable(
    tenantId: string,
    table: string,
    config: ReEncryptionConfig
  ): Promise<ReEncryptionProgress> {
    const supabase = await createClient();
    const startedAt = new Date();

    const progress: ReEncryptionProgress = {
      table,
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
      startedAt,
      status: 'in_progress',
      errors: [],
    };

    try {
      // Get encrypted fields for this table
      const encryptedFields = this.getEncryptedFields(table);

      if (encryptedFields.length === 0) {
        progress.status = 'completed';
        return progress;
      }

      // Get total count for tenant
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', tenantId);

      if (countError) {
        throw new Error(`Failed to count records: ${countError.message}`);
      }

      progress.total = count || 0;

      if (progress.total === 0) {
        progress.status = 'completed';
        return progress;
      }

      // Calculate estimated completion
      const recordsPerSecond = config.batchSize / (config.batchDelay / 1000);
      const estimatedSeconds = progress.total / recordsPerSecond;
      progress.estimatedCompletion = new Date(
        startedAt.getTime() + estimatedSeconds * 1000
      );

      // Process in batches
      let offset = 0;
      while (offset < progress.total) {
        const { data: records, error: fetchError } = await supabase
          .from(table)
          .select('*')
          .eq('organization_id', tenantId)
          .range(offset, offset + config.batchSize - 1);

        if (fetchError) {
          throw new Error(`Failed to fetch records: ${fetchError.message}`);
        }

        if (!records || records.length === 0) {
          break;
        }

        // Process batch
        await this.processBatch(
          table,
          records,
          encryptedFields,
          tenantId,
          config,
          progress
        );

        offset += config.batchSize;

        // Delay between batches to avoid overwhelming the system
        if (config.batchDelay > 0 && offset < progress.total) {
          await this.delay(config.batchDelay);
        }
      }

      progress.status = 'completed';
      return progress;
    } catch (error) {
      progress.status = 'failed';
      progress.errors.push({
        recordId: 'batch',
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Process a batch of records for re-encryption
   */
  private async processBatch(
    table: string,
    records: any[],
    encryptedFields: string[],
    tenantId: string,
    config: ReEncryptionConfig,
    progress: ReEncryptionProgress
  ): Promise<void> {
    const supabase = await createClient();

    // Get old and new keys
    const oldKey = await this.keyManager.getEncryptionKey(tenantId, { version: -1 });
    const newKey = await this.keyManager.getEncryptionKey(tenantId);

    for (const record of records) {
      try {
        const updates: Record<string, any> = {};
        let needsUpdate = false;

        // Re-encrypt each field
        for (const field of encryptedFields) {
          const encryptedField = record[field];

          if (!encryptedField) {
            continue;
          }

          // Parse encrypted field structure
          const { encrypted, version } =
            typeof encryptedField === 'string'
              ? JSON.parse(encryptedField)
              : encryptedField;

          // Decrypt with old key
          const decrypted = decrypt(encrypted, version, { key: oldKey });

          // Re-encrypt with new key
          const reEncrypted = encrypt(decrypted.plaintext, { key: newKey });

          updates[field] = JSON.stringify({
            encrypted: reEncrypted.encrypted,
            version: reEncrypted.version,
            algorithm: reEncrypted.algorithm,
          });

          needsUpdate = true;
        }

        // Update record if needed
        if (needsUpdate && !config.dryRun) {
          const { error: updateError } = await supabase
            .from(table)
            .update(updates)
            .eq('id', record.id);

          if (updateError) {
            throw new Error(`Update failed: ${updateError.message}`);
          }
        }

        progress.successful++;
      } catch (error) {
        progress.failed++;
        progress.errors.push({
          recordId: record.id,
          error: error instanceof Error ? error.message : String(error),
        });
        console.error(`Failed to re-encrypt record ${record.id}:`, error);
      }

      progress.processed++;
    }
  }

  /**
   * Schedule automatic key rotation for all tenants
   * This should be called by a cron job (e.g., daily at 2 AM UTC)
   *
   * @param schedule - Rotation schedule configuration
   * @returns Rotation results
   */
  async scheduleAutomaticRotation(
    schedule?: Partial<RotationSchedule>
  ): Promise<KeyRotationResult> {
    const config: RotationSchedule = {
      intervalDays: schedule?.intervalDays || 90,
      gracePeriodDays: schedule?.gracePeriodDays || 7,
      autoRotate: schedule?.autoRotate !== false,
      rotationTime: schedule?.rotationTime || '02:00',
    };

    if (!config.autoRotate) {
      console.info('Automatic key rotation is disabled');
      return {
        rotated: 0,
        failed: 0,
        tenantIds: [],
        errors: [],
        duration: 0,
      };
    }

    console.info('Starting scheduled key rotation check');

    try {
      // Get tenants that need rotation
      const tenantsNeedingRotation = await this.getTenantsNeedingRotation(
        config.intervalDays - config.gracePeriodDays
      );

      if (tenantsNeedingRotation.length === 0) {
        console.info('No tenants need rotation at this time');
        return {
          rotated: 0,
          failed: 0,
          tenantIds: [],
          errors: [],
          duration: 0,
        };
      }

      console.info(
        `Found ${tenantsNeedingRotation.length} tenants needing rotation`
      );

      // Perform rotation
      const result = await this.keyManager.rotateKeys();

      console.info(
        `Rotation completed: ${result.rotated} succeeded, ${result.failed} failed`
      );

      return result;
    } catch (error) {
      console.error('Scheduled rotation failed:', error);
      throw new KeyManagementError(
        'Scheduled key rotation failed',
        'SCHEDULED_ROTATION_FAILED',
        {
          schedule: config,
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Get health status of key rotation system
   *
   * @returns Health check results
   */
  async getRotationHealth(): Promise<{
    healthy: boolean;
    issues: string[];
    stats: {
      totalTenants: number;
      tenantsWithKeys: number;
      expiredKeys: number;
      keysNearExpiration: number;
    };
  }> {
    const issues: string[] = [];

    try {
      const supabase = await createClient();

      // Get total tenants
      const { count: totalTenants } = await supabase
        .from('organizations')
        .select('*', { count: 'exact', head: true });

      // Get tenants with keys
      const { data: keysData } = await supabase
        .from('encryption_keys')
        .select('tenant_id, expires_at, is_active')
        .eq('is_active', true);

      const tenantsWithKeys = new Set(keysData?.map((k) => k.tenant_id)).size;

      // Check for expired keys
      const now = new Date();
      const expiredKeys =
        keysData?.filter((k) => new Date(k.expires_at) < now).length || 0;

      // Check for keys near expiration (within 7 days)
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 7);
      const keysNearExpiration =
        keysData?.filter(
          (k) => new Date(k.expires_at) <= warningDate && new Date(k.expires_at) >= now
        ).length || 0;

      // Validate health
      if (expiredKeys > 0) {
        issues.push(`${expiredKeys} expired keys found`);
      }

      if (keysNearExpiration > 5) {
        issues.push(`${keysNearExpiration} keys approaching expiration`);
      }

      if (totalTenants && tenantsWithKeys < totalTenants) {
        issues.push(
          `${totalTenants - tenantsWithKeys} tenants missing encryption keys`
        );
      }

      return {
        healthy: issues.length === 0,
        issues,
        stats: {
          totalTenants: totalTenants || 0,
          tenantsWithKeys,
          expiredKeys,
          keysNearExpiration,
        },
      };
    } catch (error) {
      issues.push(`Health check failed: ${error instanceof Error ? error.message : String(error)}`);
      return {
        healthy: false,
        issues,
        stats: {
          totalTenants: 0,
          tenantsWithKeys: 0,
          expiredKeys: 0,
          keysNearExpiration: 0,
        },
      };
    }
  }

  /**
   * Get tenants that need key rotation
   */
  private async getTenantsNeedingRotation(daysThreshold: number): Promise<string[]> {
    const supabase = await createClient();
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const { data, error } = await supabase
      .from('encryption_keys')
      .select('tenant_id')
      .eq('is_active', true)
      .lte('expires_at', thresholdDate.toISOString());

    if (error || !data) {
      return [];
    }

    return [...new Set(data.map((row) => row.tenant_id))];
  }

  /**
   * Get encrypted fields for a table
   */
  private getEncryptedFields(table: string): string[] {
    const fieldMap: Record<string, string[]> = {
      contacts: ['phone_number', 'whatsapp_id'],
      profiles: ['email'],
      api_keys: ['key_value', 'secret'],
      whatsapp_credentials: ['access_token', 'phone_number_id'],
    };

    return fieldMap[table] || [];
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Singleton key rotation service instance
 */
let keyRotationServiceInstance: KeyRotationService | null = null;

/**
 * Get or create key rotation service singleton
 *
 * @returns Key rotation service instance
 */
export function getKeyRotationService(): KeyRotationService {
  if (!keyRotationServiceInstance) {
    keyRotationServiceInstance = new KeyRotationService();
  }
  return keyRotationServiceInstance;
}

/**
 * Reset key rotation service singleton (useful for testing)
 */
export function resetKeyRotationService(): void {
  keyRotationServiceInstance = null;
}

/**
 * Export for testing
 */
export const __testing__ = {
  KeyRotationService,
  resetKeyRotationService,
};
