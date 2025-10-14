/**
 * Core Encryption Library
 *
 * Provides low-level AES-256-GCM encryption and decryption functions
 * for field-level encryption of sensitive PII data.
 *
 * Features:
 * - AES-256-GCM encryption with authentication
 * - Secure IV generation for each encryption
 * - Key derivation from environment variables
 * - Version support for key rotation
 * - Comprehensive error handling
 * - Audit logging capabilities
 *
 * @module crypto/encryption
 */

import * as crypto from 'crypto';
import {
  EncryptionConfig,
  EncryptionResult,
  DecryptionResult,
  EncryptionError,
  DecryptionError,
  KeyManagementError,
  ENCRYPTION_CONSTANTS,
  ValidationResult,
} from './types';

/**
 * Default encryption configuration
 */
const DEFAULT_CONFIG: Partial<EncryptionConfig> = {
  algorithm: ENCRYPTION_CONSTANTS.ALGORITHM,
  version: ENCRYPTION_CONSTANTS.CURRENT_VERSION,
  ivLength: ENCRYPTION_CONSTANTS.IV_SIZE,
  authTagLength: ENCRYPTION_CONSTANTS.AUTH_TAG_SIZE,
};

/**
 * Load encryption key from environment variable (legacy method)
 * For KMS-managed keys, use getKeyManager().getEncryptionKey() instead
 *
 * @deprecated Use KMS-managed keys via KeyManager for production
 * @throws {KeyManagementError} If ENCRYPTION_KEY is not set or invalid
 * @returns Master encryption key as Buffer
 */
export function loadEncryptionKey(): Buffer {
  const keyBase64 = process.env.ENCRYPTION_KEY;

  if (!keyBase64) {
    throw new KeyManagementError(
      'ENCRYPTION_KEY environment variable is not set',
      'MISSING_KEY',
      {
        hint: 'For production, use AWS KMS-managed keys. For development, run: npm run generate-encryption-key',
      }
    );
  }

  try {
    const key = Buffer.from(keyBase64, 'base64');

    if (key.length !== ENCRYPTION_CONSTANTS.KEY_SIZE) {
      throw new KeyManagementError(
        `Invalid key length: expected ${ENCRYPTION_CONSTANTS.KEY_SIZE} bytes, got ${key.length}`,
        'INVALID_KEY_LENGTH',
        { expected: ENCRYPTION_CONSTANTS.KEY_SIZE, actual: key.length }
      );
    }

    return key;
  } catch (error) {
    if (error instanceof KeyManagementError) {
      throw error;
    }

    throw new KeyManagementError(
      'Failed to decode encryption key from base64',
      'INVALID_KEY_FORMAT',
      { originalError: error }
    );
  }
}

/**
 * Load encryption key with KMS support
 * Automatically uses KMS-managed keys if AWS_KMS_KEY_ID is configured,
 * otherwise falls back to environment variable
 *
 * @param tenantId - Tenant identifier for KMS key retrieval
 * @returns Master encryption key as Buffer
 */
export async function loadEncryptionKeyWithKMS(tenantId?: string): Promise<Buffer> {
  // Check if KMS is configured
  const useKMS = !!process.env.AWS_KMS_KEY_ID;

  if (useKMS && tenantId) {
    // Use KMS-managed keys for production
    try {
      const { getKeyManager } = await import('@/lib/security/key-manager');
      const keyManager = getKeyManager();
      return await keyManager.getEncryptionKey(tenantId);
    } catch (error) {
      console.error('Failed to load KMS key, falling back to environment key:', error);
      // Fall through to legacy method
    }
  }

  // Fall back to environment variable (development/testing)
  return loadEncryptionKey();
}

/**
 * Get encryption configuration with defaults
 *
 * @param customConfig - Optional custom configuration
 * @returns Complete encryption configuration
 */
export function getEncryptionConfig(
  customConfig?: Partial<EncryptionConfig>
): EncryptionConfig {
  const key = loadEncryptionKey();

  return {
    key,
    ...DEFAULT_CONFIG,
    ...customConfig,
  } as EncryptionConfig;
}

/**
 * Generate a cryptographically secure random IV
 *
 * @param length - IV length in bytes (default: 12 for GCM)
 * @returns Random IV as Buffer
 */
export function generateIV(length: number = ENCRYPTION_CONSTANTS.IV_SIZE): Buffer {
  return crypto.randomBytes(length);
}

/**
 * Validate encryption configuration
 *
 * @param config - Configuration to validate
 * @throws {KeyManagementError} If configuration is invalid
 */
function validateConfig(config: EncryptionConfig): void {
  if (!config.key || config.key.length !== ENCRYPTION_CONSTANTS.KEY_SIZE) {
    throw new KeyManagementError(
      'Invalid encryption key',
      'INVALID_KEY',
      { keyLength: config.key?.length }
    );
  }

  if (!config.version) {
    throw new KeyManagementError(
      'Version is required for key rotation support',
      'MISSING_VERSION'
    );
  }

  if (!config.algorithm) {
    throw new KeyManagementError(
      'Algorithm is required',
      'MISSING_ALGORITHM'
    );
  }
}

/**
 * Encrypt plaintext using AES-256-GCM
 *
 * @param plaintext - Data to encrypt
 * @param config - Optional encryption configuration
 * @returns Encryption result with encrypted data and metadata
 * @throws {EncryptionError} If encryption fails
 *
 * @example
 * ```typescript
 * const result = encrypt('+1234567890');
 * console.log(result.encrypted); // Base64 encoded encrypted data
 * ```
 */
export function encrypt(
  plaintext: string,
  config?: Partial<EncryptionConfig>
): EncryptionResult {
  try {
    const fullConfig = getEncryptionConfig(config);
    validateConfig(fullConfig);

    // Generate random IV for this encryption
    const iv = generateIV(fullConfig.ivLength);

    // Create cipher
    const cipher = crypto.createCipheriv(
      fullConfig.algorithm!,
      fullConfig.key,
      iv,
      {
        authTagLength: fullConfig.authTagLength,
      }
    );

    // Encrypt the data
    let encrypted = cipher.update(
      plaintext,
      ENCRYPTION_CONSTANTS.STRING_ENCODING,
      ENCRYPTION_CONSTANTS.ENCODING
    );
    encrypted += cipher.final(ENCRYPTION_CONSTANTS.ENCODING);

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    // Combine IV + encrypted data + authTag for storage
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, ENCRYPTION_CONSTANTS.ENCODING),
      authTag,
    ]);

    const encryptedBase64 = combined.toString(ENCRYPTION_CONSTANTS.ENCODING);

    return {
      encrypted: encryptedBase64,
      version: fullConfig.version,
      algorithm: fullConfig.algorithm!,
      iv: iv.toString(ENCRYPTION_CONSTANTS.ENCODING),
      authTag: authTag.toString(ENCRYPTION_CONSTANTS.ENCODING),
    };
  } catch (error) {
    // If it's already an encryption-related error, rethrow
    if (
      error instanceof EncryptionError ||
      error instanceof KeyManagementError
    ) {
      throw error;
    }

    // Wrap other errors
    throw new EncryptionError(
      'Encryption failed',
      'ENCRYPTION_FAILED',
      {
        originalError: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }
    );
  }
}

/**
 * Decrypt data encrypted with AES-256-GCM
 *
 * @param encryptedData - Base64 encoded encrypted data (IV + ciphertext + authTag)
 * @param version - Key version used for encryption
 * @param config - Optional decryption configuration
 * @returns Decryption result with plaintext and metadata
 * @throws {DecryptionError} If decryption fails
 *
 * @example
 * ```typescript
 * const result = decrypt(encryptedData, 'v1');
 * console.log(result.plaintext); // Original plaintext
 * ```
 */
export function decrypt(
  encryptedData: string,
  version: string,
  config?: Partial<EncryptionConfig>
): DecryptionResult {
  try {
    const fullConfig = getEncryptionConfig({ ...config, version });
    validateConfig(fullConfig);

    // Decode the combined data
    const combined = Buffer.from(encryptedData, ENCRYPTION_CONSTANTS.ENCODING);

    // Extract components
    const ivLength = fullConfig.ivLength || ENCRYPTION_CONSTANTS.IV_SIZE;
    const authTagLength = fullConfig.authTagLength || ENCRYPTION_CONSTANTS.AUTH_TAG_SIZE;

    if (combined.length < ivLength + authTagLength) {
      throw new DecryptionError(
        'Invalid encrypted data: too short',
        'INVALID_DATA_LENGTH',
        {
          dataLength: combined.length,
          minimumLength: ivLength + authTagLength,
        }
      );
    }

    const iv = combined.subarray(0, ivLength);
    const authTag = combined.subarray(combined.length - authTagLength);
    const ciphertext = combined.subarray(ivLength, combined.length - authTagLength);

    // Create decipher
    const decipher = crypto.createDecipheriv(
      fullConfig.algorithm!,
      fullConfig.key,
      iv,
      {
        authTagLength,
      }
    );

    // Set auth tag for verification
    decipher.setAuthTag(authTag);

    // Decrypt the data
    let plaintext = decipher.update(
      ciphertext,
      undefined,
      ENCRYPTION_CONSTANTS.STRING_ENCODING
    );
    plaintext += decipher.final(ENCRYPTION_CONSTANTS.STRING_ENCODING);

    return {
      plaintext,
      version: fullConfig.version,
      algorithm: fullConfig.algorithm!,
    };
  } catch (error) {
    // If it's already a decryption-related error, rethrow
    if (
      error instanceof DecryptionError ||
      error instanceof KeyManagementError
    ) {
      throw error;
    }

    // Authentication tag verification failure
    if (error instanceof Error && error.message.includes('Unsupported state')) {
      throw new DecryptionError(
        'Authentication tag verification failed: data may be corrupted or tampered',
        'AUTH_TAG_VERIFICATION_FAILED',
        { originalError: error.message }
      );
    }

    // Wrap other errors
    throw new DecryptionError(
      'Decryption failed',
      'DECRYPTION_FAILED',
      {
        originalError: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }
    );
  }
}

/**
 * Validate that encrypted data has the correct structure
 *
 * @param encryptedData - Data to validate
 * @param version - Expected version
 * @returns Validation result
 */
export function validateEncryptedData(
  encryptedData: string,
  version?: string
): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    details: {
      hasVersion: !!version,
      hasEncrypted: !!encryptedData,
      isBase64: false,
      hasValidStructure: false,
    },
  };

  // Check if data exists
  if (!encryptedData) {
    result.valid = false;
    result.error = 'Encrypted data is empty';
    return result;
  }

  // Check if it's valid base64
  try {
    const buffer = Buffer.from(encryptedData, ENCRYPTION_CONSTANTS.ENCODING);
    result.details!.isBase64 = buffer.toString(ENCRYPTION_CONSTANTS.ENCODING) === encryptedData;

    // Check minimum length (IV + at least 1 byte + authTag)
    const minLength = ENCRYPTION_CONSTANTS.IV_SIZE + 1 + ENCRYPTION_CONSTANTS.AUTH_TAG_SIZE;
    result.details!.hasValidStructure = buffer.length >= minLength;

    if (!result.details!.hasValidStructure) {
      result.valid = false;
      result.error = `Data too short: expected at least ${minLength} bytes, got ${buffer.length}`;
    }
  } catch (error) {
    result.valid = false;
    result.error = 'Invalid base64 encoding';
    result.details!.isBase64 = false;
  }

  return result;
}

/**
 * Encrypt multiple values in batch
 *
 * @param values - Array of plaintext values to encrypt
 * @param config - Optional encryption configuration
 * @returns Array of encryption results
 */
export function encryptBatch(
  values: string[],
  config?: Partial<EncryptionConfig>
): EncryptionResult[] {
  return values.map((value) => encrypt(value, config));
}

/**
 * Decrypt multiple values in batch
 *
 * @param encryptedValues - Array of encrypted values
 * @param version - Key version used for encryption
 * @param config - Optional decryption configuration
 * @returns Array of decryption results
 */
export function decryptBatch(
  encryptedValues: Array<{ data: string; version: string }>,
  config?: Partial<EncryptionConfig>
): DecryptionResult[] {
  return encryptedValues.map((item) => decrypt(item.data, item.version, config));
}

/**
 * Re-encrypt data with a new key version (for key rotation)
 *
 * @param encryptedData - Currently encrypted data
 * @param currentVersion - Current key version
 * @param newVersion - New key version to use
 * @param oldConfig - Configuration for old key
 * @param newConfig - Configuration for new key
 * @returns New encryption result
 * @throws {EncryptionError | DecryptionError} If re-encryption fails
 */
export function reEncrypt(
  encryptedData: string,
  currentVersion: string,
  newVersion: string,
  oldConfig?: Partial<EncryptionConfig>,
  newConfig?: Partial<EncryptionConfig>
): EncryptionResult {
  // Decrypt with old key
  const decrypted = decrypt(encryptedData, currentVersion, oldConfig);

  // Encrypt with new key
  return encrypt(decrypted.plaintext, { ...newConfig, version: newVersion });
}

/**
 * Test encryption/decryption round-trip
 *
 * @param testData - Test data to encrypt and decrypt
 * @returns True if round-trip successful, false otherwise
 */
export function testEncryption(testData: string = 'test-encryption-data'): boolean {
  try {
    const encrypted = encrypt(testData);
    const decrypted = decrypt(encrypted.encrypted, encrypted.version);
    return decrypted.plaintext === testData;
  } catch (error) {
    console.error('Encryption test failed:', error);
    return false;
  }
}

/**
 * Get encryption system status
 *
 * @returns Status information
 */
export function getEncryptionStatus(): {
  keyLoaded: boolean;
  version: string;
  algorithm: string;
  testPassed: boolean;
} {
  try {
    const config = getEncryptionConfig();
    const testPassed = testEncryption();

    return {
      keyLoaded: true,
      version: config.version,
      algorithm: config.algorithm!,
      testPassed,
    };
  } catch (error) {
    return {
      keyLoaded: false,
      version: 'unknown',
      algorithm: 'unknown',
      testPassed: false,
    };
  }
}

/**
 * Clear sensitive data from memory
 *
 * @param buffer - Buffer containing sensitive data
 */
export function clearBuffer(buffer: Buffer): void {
  if (buffer && buffer.length > 0) {
    crypto.randomFillSync(buffer);
  }
}

/**
 * Encrypt with KMS-managed key (recommended for production)
 *
 * @param plaintext - Data to encrypt
 * @param tenantId - Tenant identifier for key retrieval
 * @param config - Optional encryption configuration
 * @returns Encryption result with encrypted data and metadata
 * @throws {EncryptionError} If encryption fails
 */
export async function encryptWithKMS(
  plaintext: string,
  tenantId: string,
  config?: Partial<Omit<EncryptionConfig, 'key'>>
): Promise<EncryptionResult> {
  try {
    const key = await loadEncryptionKeyWithKMS(tenantId);
    return encrypt(plaintext, { ...config, key });
  } catch (error) {
    throw new EncryptionError(
      'KMS encryption failed',
      'KMS_ENCRYPTION_FAILED',
      {
        tenantId,
        originalError: error instanceof Error ? error.message : String(error),
      }
    );
  }
}

/**
 * Decrypt with KMS-managed key (recommended for production)
 *
 * @param encryptedData - Base64 encoded encrypted data
 * @param version - Key version used for encryption
 * @param tenantId - Tenant identifier for key retrieval
 * @param config - Optional decryption configuration
 * @returns Decryption result with plaintext and metadata
 * @throws {DecryptionError} If decryption fails
 */
export async function decryptWithKMS(
  encryptedData: string,
  version: string,
  tenantId: string,
  config?: Partial<Omit<EncryptionConfig, 'key'>>
): Promise<DecryptionResult> {
  try {
    const key = await loadEncryptionKeyWithKMS(tenantId);
    return decrypt(encryptedData, version, { ...config, key });
  } catch (error) {
    throw new DecryptionError(
      'KMS decryption failed',
      'KMS_DECRYPTION_FAILED',
      {
        tenantId,
        originalError: error instanceof Error ? error.message : String(error),
      }
    );
  }
}

/**
 * Batch encrypt with KMS-managed keys
 *
 * @param values - Array of plaintext values to encrypt
 * @param tenantId - Tenant identifier
 * @param config - Optional encryption configuration
 * @returns Array of encryption results
 */
export async function encryptBatchWithKMS(
  values: string[],
  tenantId: string,
  config?: Partial<Omit<EncryptionConfig, 'key'>>
): Promise<EncryptionResult[]> {
  const key = await loadEncryptionKeyWithKMS(tenantId);
  return values.map((value) => encrypt(value, { ...config, key }));
}

/**
 * Batch decrypt with KMS-managed keys
 *
 * @param encryptedValues - Array of encrypted values
 * @param tenantId - Tenant identifier
 * @param config - Optional decryption configuration
 * @returns Array of decryption results
 */
export async function decryptBatchWithKMS(
  encryptedValues: Array<{ data: string; version: string }>,
  tenantId: string,
  config?: Partial<Omit<EncryptionConfig, 'key'>>
): Promise<DecryptionResult[]> {
  const key = await loadEncryptionKeyWithKMS(tenantId);
  return encryptedValues.map((item) => decrypt(item.data, item.version, { ...config, key }));
}

/**
 * Export for testing purposes only
 * DO NOT use in production code
 */
export const __testing__ = {
  generateIV,
  validateConfig,
  DEFAULT_CONFIG,
};
