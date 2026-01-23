'use strict'

/**
 * AES-256-GCM Encryption Utility for Sensitive API Credentials
 *
 * This module provides secure encryption for sensitive data like API tokens.
 * Uses AES-256-GCM which provides both confidentiality and integrity.
 *
 * Security features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - Random IV for each encryption operation
 * - Per-tenant salt for key derivation
 * - PBKDF2 for key derivation from master key
 */

import crypto from 'crypto'

// Constants
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128 bits
const AUTH_TAG_LENGTH = 16 // 128 bits
const SALT_LENGTH = 32 // 256 bits
const KEY_LENGTH = 32 // 256 bits for AES-256
const PBKDF2_ITERATIONS = 100000 // OWASP recommended minimum

/**
 * Get the master encryption key from environment
 * @throws Error if ENCRYPTION_MASTER_KEY is not set
 */
function getMasterKey(): string {
  const masterKey = process.env.ENCRYPTION_MASTER_KEY
  if (!masterKey) {
    throw new Error(
      'ENCRYPTION_MASTER_KEY environment variable is not set. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    )
  }
  if (masterKey.length < 32) {
    throw new Error('ENCRYPTION_MASTER_KEY must be at least 32 characters long')
  }
  return masterKey
}

/**
 * Derive a tenant-specific encryption key using PBKDF2
 * @param tenantId - The organization/tenant ID for isolation
 * @param salt - Random salt for key derivation
 */
function deriveKey(tenantId: string, salt: Buffer): Buffer {
  const masterKey = getMasterKey()
  // Combine master key with tenant ID for tenant isolation
  const keyMaterial = `${masterKey}:${tenantId}`

  return crypto.pbkdf2Sync(keyMaterial, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512')
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): string {
  return crypto.randomBytes(SALT_LENGTH).toString('hex')
}

/**
 * Encrypt sensitive data with AES-256-GCM
 *
 * @param plaintext - The data to encrypt
 * @param tenantId - Organization ID for tenant isolation
 * @param existingSalt - Optional existing salt (for re-encryption)
 * @returns Object containing encrypted data, IV, auth tag, and salt
 *
 * @example
 * const encrypted = encrypt('my-api-token', 'org-123')
 * // Store encrypted.ciphertext, encrypted.iv, encrypted.authTag, encrypted.salt
 */
export function encrypt(
  plaintext: string,
  tenantId: string,
  existingSalt?: string
): {
  ciphertext: string
  iv: string
  authTag: string
  salt: string
} {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty or null value')
  }
  if (!tenantId) {
    throw new Error('tenantId is required for encryption')
  }

  // Generate or use existing salt
  const salt = existingSalt ? Buffer.from(existingSalt, 'hex') : crypto.randomBytes(SALT_LENGTH)

  // Derive tenant-specific key
  const key = deriveKey(tenantId, salt)

  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH)

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  // Encrypt
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex')
  ciphertext += cipher.final('hex')

  // Get authentication tag
  const authTag = cipher.getAuthTag()

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    salt: salt.toString('hex'),
  }
}

/**
 * Decrypt data encrypted with AES-256-GCM
 *
 * @param ciphertext - The encrypted data
 * @param iv - The initialization vector used during encryption
 * @param authTag - The authentication tag from encryption
 * @param salt - The salt used for key derivation
 * @param tenantId - Organization ID for tenant isolation
 * @returns The decrypted plaintext
 *
 * @example
 * const plaintext = decrypt(
 *   encrypted.ciphertext,
 *   encrypted.iv,
 *   encrypted.authTag,
 *   encrypted.salt,
 *   'org-123'
 * )
 */
export function decrypt(
  ciphertext: string,
  iv: string,
  authTag: string,
  salt: string,
  tenantId: string
): string {
  if (!ciphertext || !iv || !authTag || !salt) {
    throw new Error('Missing required decryption parameters')
  }
  if (!tenantId) {
    throw new Error('tenantId is required for decryption')
  }

  // Derive the same tenant-specific key
  const key = deriveKey(tenantId, Buffer.from(salt, 'hex'))

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'))

  // Set auth tag for verification
  decipher.setAuthTag(Buffer.from(authTag, 'hex'))

  // Decrypt
  let plaintext = decipher.update(ciphertext, 'hex', 'utf8')
  plaintext += decipher.final('utf8')

  return plaintext
}

/**
 * Encrypted credential storage format
 */
export interface EncryptedCredential {
  ciphertext: string
  iv: string
  authTag: string
  salt: string
  version: number // For future algorithm upgrades
}

/**
 * Encrypt a credential and return in storage format
 *
 * @param credential - The credential value to encrypt
 * @param tenantId - Organization ID for tenant isolation
 * @returns Encrypted credential object ready for database storage
 */
export function encryptCredential(credential: string, tenantId: string): EncryptedCredential {
  const encrypted = encrypt(credential, tenantId)
  return {
    ...encrypted,
    version: 1, // Current encryption version
  }
}

/**
 * Decrypt a credential from storage format
 *
 * @param encryptedCredential - The encrypted credential object from database
 * @param tenantId - Organization ID for tenant isolation
 * @returns The decrypted credential value
 */
export function decryptCredential(
  encryptedCredential: EncryptedCredential,
  tenantId: string
): string {
  // Version check for future algorithm upgrades
  if (encryptedCredential.version !== 1) {
    throw new Error(`Unsupported encryption version: ${encryptedCredential.version}`)
  }

  return decrypt(
    encryptedCredential.ciphertext,
    encryptedCredential.iv,
    encryptedCredential.authTag,
    encryptedCredential.salt,
    tenantId
  )
}

/**
 * Check if a value appears to be an encrypted credential
 */
export function isEncryptedCredential(value: unknown): value is EncryptedCredential {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.ciphertext === 'string' &&
    typeof obj.iv === 'string' &&
    typeof obj.authTag === 'string' &&
    typeof obj.salt === 'string' &&
    typeof obj.version === 'number'
  )
}

/**
 * Safely encrypt a credential, returning null if the input is empty
 */
export function safeEncryptCredential(
  credential: string | null | undefined,
  tenantId: string
): EncryptedCredential | null {
  if (!credential) return null
  return encryptCredential(credential, tenantId)
}

/**
 * Safely decrypt a credential, returning null if the input is empty
 */
export function safeDecryptCredential(
  encryptedCredential: EncryptedCredential | null | undefined,
  tenantId: string
): string | null {
  if (!encryptedCredential) return null
  return decryptCredential(encryptedCredential, tenantId)
}

// ============================================================================
// KEY ROTATION SUPPORT (Phase 3.1)
// ============================================================================

/**
 * Key version configuration
 * Maps key version numbers to their master key environment variables
 */
const KEY_VERSIONS: Record<number, string> = {
  1: 'ENCRYPTION_MASTER_KEY',
  2: 'ENCRYPTION_MASTER_KEY_V2',
}

/**
 * Get the current active key version
 */
export function getCurrentKeyVersion(): number {
  // Check if V2 key is available, if so use it as current
  if (process.env.ENCRYPTION_MASTER_KEY_V2) {
    return 2
  }
  return 1
}

/**
 * Get master key for a specific version
 * @param version - Key version number
 * @throws Error if the key for this version is not set
 */
function getMasterKeyForVersion(version: number): string {
  const envVar = KEY_VERSIONS[version]
  if (!envVar) {
    throw new Error(`Unknown key version: ${version}`)
  }

  const masterKey = process.env[envVar]
  if (!masterKey) {
    throw new Error(
      `${envVar} environment variable is not set for key version ${version}`
    )
  }
  if (masterKey.length < 32) {
    throw new Error(`${envVar} must be at least 32 characters long`)
  }
  return masterKey
}

/**
 * Derive a tenant-specific encryption key using PBKDF2 with versioned master key
 * @param tenantId - The organization/tenant ID for isolation
 * @param salt - Random salt for key derivation
 * @param version - Key version to use
 */
function deriveKeyWithVersion(tenantId: string, salt: Buffer, version: number): Buffer {
  const masterKey = getMasterKeyForVersion(version)
  const keyMaterial = `${masterKey}:${tenantId}`
  return crypto.pbkdf2Sync(keyMaterial, salt, PBKDF2_ITERATIONS, KEY_LENGTH, 'sha512')
}

/**
 * Extended encrypted credential with key version tracking
 */
export interface VersionedEncryptedCredential extends EncryptedCredential {
  keyVersion: number
}

/**
 * Encrypt a credential with explicit key version tracking
 */
export function encryptCredentialVersioned(
  credential: string,
  tenantId: string,
  keyVersion?: number
): VersionedEncryptedCredential {
  const version = keyVersion ?? getCurrentKeyVersion()

  if (!credential) {
    throw new Error('Cannot encrypt empty or null value')
  }
  if (!tenantId) {
    throw new Error('tenantId is required for encryption')
  }

  // Generate salt
  const salt = crypto.randomBytes(SALT_LENGTH)

  // Derive tenant-specific key with version
  const key = deriveKeyWithVersion(tenantId, salt, version)

  // Generate random IV
  const iv = crypto.randomBytes(IV_LENGTH)

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  // Encrypt
  let ciphertext = cipher.update(credential, 'utf8', 'hex')
  ciphertext += cipher.final('hex')

  // Get authentication tag
  const authTag = cipher.getAuthTag()

  return {
    ciphertext,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    salt: salt.toString('hex'),
    version: 1, // Encryption algorithm version
    keyVersion: version, // Key version used for encryption
  }
}

/**
 * Decrypt a credential with automatic key version detection
 */
export function decryptCredentialVersioned(
  encryptedCredential: VersionedEncryptedCredential,
  tenantId: string
): string {
  if (encryptedCredential.version !== 1) {
    throw new Error(`Unsupported encryption version: ${encryptedCredential.version}`)
  }

  const keyVersion = encryptedCredential.keyVersion ?? 1

  // Derive the key with the correct version
  const key = deriveKeyWithVersion(
    tenantId,
    Buffer.from(encryptedCredential.salt, 'hex'),
    keyVersion
  )

  // Create decipher
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(encryptedCredential.iv, 'hex')
  )

  // Set auth tag for verification
  decipher.setAuthTag(Buffer.from(encryptedCredential.authTag, 'hex'))

  // Decrypt
  let plaintext = decipher.update(encryptedCredential.ciphertext, 'hex', 'utf8')
  plaintext += decipher.final('utf8')

  return plaintext
}

/**
 * Rotate a credential to use the current key version
 * Decrypts with old key, re-encrypts with new key
 *
 * @param encryptedCredential - The credential encrypted with old key
 * @param tenantId - Organization ID for tenant isolation
 * @returns New encrypted credential with current key version, or null if already current
 */
export function rotateCredentialKey(
  encryptedCredential: VersionedEncryptedCredential,
  tenantId: string
): VersionedEncryptedCredential | null {
  const currentVersion = getCurrentKeyVersion()

  // Check if already using current key
  if ((encryptedCredential.keyVersion ?? 1) === currentVersion) {
    return null // No rotation needed
  }

  // Decrypt with old key
  const plaintext = decryptCredentialVersioned(encryptedCredential, tenantId)

  // Re-encrypt with current key
  return encryptCredentialVersioned(plaintext, tenantId, currentVersion)
}

/**
 * Check if a credential needs key rotation
 */
export function needsKeyRotation(encryptedCredential: VersionedEncryptedCredential): boolean {
  const currentVersion = getCurrentKeyVersion()
  return (encryptedCredential.keyVersion ?? 1) < currentVersion
}

/**
 * Result of a batch key rotation operation
 */
export interface KeyRotationResult {
  success: boolean
  credentialId: string
  oldKeyVersion: number
  newKeyVersion: number
  error?: string
}

/**
 * Batch rotate multiple credentials
 * Returns results for each credential indicating success/failure
 *
 * @param credentials - Array of { id, credential, tenantId } objects
 * @returns Array of rotation results
 */
export async function batchRotateCredentials(
  credentials: Array<{
    id: string
    credential: VersionedEncryptedCredential
    tenantId: string
  }>
): Promise<KeyRotationResult[]> {
  const results: KeyRotationResult[] = []
  const currentVersion = getCurrentKeyVersion()

  for (const { id, credential, tenantId } of credentials) {
    const oldVersion = credential.keyVersion ?? 1

    try {
      const rotated = rotateCredentialKey(credential, tenantId)

      if (rotated) {
        results.push({
          success: true,
          credentialId: id,
          oldKeyVersion: oldVersion,
          newKeyVersion: currentVersion,
        })
      } else {
        // Already current
        results.push({
          success: true,
          credentialId: id,
          oldKeyVersion: oldVersion,
          newKeyVersion: oldVersion,
        })
      }
    } catch (error) {
      results.push({
        success: false,
        credentialId: id,
        oldKeyVersion: oldVersion,
        newKeyVersion: oldVersion,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return results
}

/**
 * Check if a value is a versioned encrypted credential
 */
export function isVersionedEncryptedCredential(
  value: unknown
): value is VersionedEncryptedCredential {
  if (!isEncryptedCredential(value)) return false
  const obj = value as Record<string, unknown>
  return typeof obj.keyVersion === 'number' || obj.keyVersion === undefined
}

/**
 * Migrate legacy EncryptedCredential to VersionedEncryptedCredential
 * Legacy credentials are assumed to be key version 1
 */
export function migrateLegacyCredential(
  credential: EncryptedCredential
): VersionedEncryptedCredential {
  return {
    ...credential,
    keyVersion: 1, // Legacy credentials used version 1
  }
}
