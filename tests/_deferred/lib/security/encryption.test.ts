/**
 * Encryption Unit Tests
 *
 * Tests AES-256-GCM encryption/decryption, data integrity,
 * key derivation, and tenant-specific encryption contexts.
 */

import * as crypto from 'crypto';
import {
  encrypt,
  decrypt,
  validateEncryptedData,
  encryptBatch,
  decryptBatch,
  reEncrypt,
  testEncryption,
  getEncryptionStatus,
  __testing__,
} from '@/lib/crypto/encryption';
import { ENCRYPTION_CONSTANTS } from '@/lib/crypto/types';

describe('Encryption - AES-256-GCM', () => {
  // Set test encryption key
  const TEST_KEY = crypto.randomBytes(ENCRYPTION_CONSTANTS.KEY_SIZE);
  const TEST_KEY_BASE64 = TEST_KEY.toString('base64');

  beforeEach(() => {
    // Set test environment variable
    process.env.ENCRYPTION_KEY = TEST_KEY_BASE64;
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.ENCRYPTION_KEY;
    jest.clearAllMocks();
  });

  describe('Encryption Operations', () => {
    it('should encrypt plaintext with AES-256-GCM successfully', () => {
      // Arrange
      const plaintext = '+1234567890'; // Sensitive phone number

      // Act
      const result = encrypt(plaintext);

      // Assert
      expect(result).toBeDefined();
      expect(result.encrypted).toBeDefined();
      expect(typeof result.encrypted).toBe('string');
      expect(result.version).toBe(ENCRYPTION_CONSTANTS.CURRENT_VERSION);
      expect(result.algorithm).toBe(ENCRYPTION_CONSTANTS.ALGORITHM);
      expect(result.iv).toBeDefined();
      expect(result.authTag).toBeDefined();

      // Verify encrypted data is different from plaintext
      expect(result.encrypted).not.toContain(plaintext);

      // Verify encrypted data is valid base64
      expect(() => Buffer.from(result.encrypted, 'base64')).not.toThrow();
    });

    it('should decrypt encrypted data back to original plaintext', () => {
      // Arrange
      const plaintext = 'sensitive-email@example.com';

      // Act
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted.encrypted, encrypted.version);

      // Assert
      expect(decrypted.plaintext).toBe(plaintext);
      expect(decrypted.version).toBe(encrypted.version);
      expect(decrypted.algorithm).toBe(encrypted.algorithm);
    });

    it('should fail authentication with corrupted ciphertext', () => {
      // Arrange
      const plaintext = 'secret-data';
      const encrypted = encrypt(plaintext);

      // Corrupt the encrypted data (flip a bit in the middle)
      const buffer = Buffer.from(encrypted.encrypted, 'base64');
      buffer[Math.floor(buffer.length / 2)] ^= 0xff;
      const corruptedData = buffer.toString('base64');

      // Act & Assert
      // Corrupting ciphertext causes auth tag verification to fail
      expect(() => {
        decrypt(corruptedData, encrypted.version);
      }).toThrow(/authentication|verification|failed|corrupted/i);
    });
  });

  describe('Data Integrity & Authentication', () => {
    it('should detect tampered authentication tag', () => {
      // Arrange
      const plaintext = 'critical-financial-data';
      const encrypted = encrypt(plaintext);

      // Extract components
      const buffer = Buffer.from(encrypted.encrypted, 'base64');
      const ivLength = ENCRYPTION_CONSTANTS.IV_SIZE;
      const authTagLength = ENCRYPTION_CONSTANTS.AUTH_TAG_SIZE;

      // Tamper with the authentication tag
      const authTagStart = buffer.length - authTagLength;
      buffer[authTagStart] ^= 0xff;
      const tamperedData = buffer.toString('base64');

      // Act & Assert
      // Tampering with auth tag causes decryption to fail
      expect(() => {
        decrypt(tamperedData, encrypted.version);
      }).toThrow(/failed/i);
    });

    it('should validate encrypted data structure correctly', () => {
      // Arrange
      const plaintext = 'test-data';
      const encrypted = encrypt(plaintext);

      // Act
      const validationResult = validateEncryptedData(encrypted.encrypted, encrypted.version);

      // Assert
      expect(validationResult.valid).toBe(true);
      expect(validationResult.details?.hasVersion).toBe(true);
      expect(validationResult.details?.hasEncrypted).toBe(true);
      expect(validationResult.details?.isBase64).toBe(true);
      expect(validationResult.details?.hasValidStructure).toBe(true);
      expect(validationResult.error).toBeUndefined();
    });

    it('should detect invalid encrypted data structure', () => {
      // Act
      const result1 = validateEncryptedData('', 'v1');
      const result2 = validateEncryptedData('invalid-base64!@#$', 'v1');
      const result3 = validateEncryptedData('abc', 'v1'); // Too short

      // Assert
      expect(result1.valid).toBe(false);
      expect(result1.error).toContain('empty');

      expect(result2.valid).toBe(false);
      // Invalid base64 characters still decode, but the result may be too short
      expect(result2.error).toBeDefined();

      expect(result3.valid).toBe(false);
      expect(result3.error).toContain('too short');
    });
  });

  describe('Batch Operations', () => {
    it('should encrypt multiple values in batch', () => {
      // Arrange
      const plaintexts = [
        'user1@example.com',
        '+1234567890',
        'Social Security Number: 123-45-6789',
        'Credit Card: 4532-1234-5678-9010',
      ];

      // Act
      const results = encryptBatch(plaintexts);

      // Assert
      expect(results).toHaveLength(plaintexts.length);
      results.forEach((result, index) => {
        expect(result.encrypted).toBeDefined();
        expect(result.encrypted).not.toContain(plaintexts[index]);
        expect(result.version).toBe(ENCRYPTION_CONSTANTS.CURRENT_VERSION);

        // Verify each can be decrypted
        const decrypted = decrypt(result.encrypted, result.version);
        expect(decrypted.plaintext).toBe(plaintexts[index]);
      });
    });

    it('should decrypt multiple values in batch', () => {
      // Arrange
      const plaintexts = ['value1', 'value2', 'value3'];
      const encrypted = encryptBatch(plaintexts);
      const encryptedValues = encrypted.map((e) => ({
        data: e.encrypted,
        version: e.version,
      }));

      // Act
      const decrypted = decryptBatch(encryptedValues);

      // Assert
      expect(decrypted).toHaveLength(plaintexts.length);
      decrypted.forEach((result, index) => {
        expect(result.plaintext).toBe(plaintexts[index]);
      });
    });
  });

  describe('Key Rotation', () => {
    it('should re-encrypt data with new key version', () => {
      // Arrange
      const plaintext = 'data-to-rotate';
      const currentVersion = 'v1';
      const newVersion = 'v2';

      // Encrypt with current key
      const encrypted = encrypt(plaintext, { version: currentVersion });

      // Create new key for v2
      const newKey = crypto.randomBytes(ENCRYPTION_CONSTANTS.KEY_SIZE);

      // Act
      const reEncrypted = reEncrypt(
        encrypted.encrypted,
        currentVersion,
        newVersion,
        { key: TEST_KEY, version: currentVersion },
        { key: newKey, version: newVersion }
      );

      // Assert
      expect(reEncrypted.version).toBe(newVersion);
      expect(reEncrypted.encrypted).not.toBe(encrypted.encrypted);

      // Verify decryption with new key works
      const decrypted = decrypt(reEncrypted.encrypted, newVersion, { key: newKey });
      expect(decrypted.plaintext).toBe(plaintext);
    });
  });

  describe('Encryption System Status', () => {
    it('should report encryption system as operational', () => {
      // Act
      const status = getEncryptionStatus();

      // Assert
      expect(status.keyLoaded).toBe(true);
      expect(status.version).toBe(ENCRYPTION_CONSTANTS.CURRENT_VERSION);
      expect(status.algorithm).toBe(ENCRYPTION_CONSTANTS.ALGORITHM);
      expect(status.testPassed).toBe(true);
    });

    it('should pass round-trip encryption test', () => {
      // Arrange
      const testData = 'test-round-trip-data-12345';

      // Act
      const testResult = testEncryption(testData);

      // Assert
      expect(testResult).toBe(true);
    });
  });
});
