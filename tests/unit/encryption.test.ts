/**
 * Unit Tests for Encryption System
 *
 * Comprehensive test suite for the field-level encryption implementation.
 * Tests core encryption/decryption, key management, error handling, and edge cases.
 *
 * @module tests/unit/encryption
 */

import * as crypto from 'crypto';
import {
  encrypt,
  decrypt,
  loadEncryptionKey,
  generateIV,
  validateEncryptedData,
  testEncryption,
  getEncryptionStatus,
  encryptBatch,
  decryptBatch,
  reEncrypt,
  clearBuffer,
} from '../../src/lib/crypto/encryption';
import {
  EncryptionError,
  DecryptionError,
  KeyManagementError,
  ENCRYPTION_CONSTANTS,
} from '../../src/lib/crypto/types';

describe('Encryption Core', () => {
  // Store original env to restore after tests
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeAll(() => {
    // Generate a test encryption key
    const testKey = crypto.randomBytes(32).toString('base64');
    process.env.ENCRYPTION_KEY = testKey;
  });

  afterAll(() => {
    // Restore original env
    if (originalEnv) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe('Key Management', () => {
    test('should load encryption key from environment', () => {
      const key = loadEncryptionKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(ENCRYPTION_CONSTANTS.KEY_SIZE);
    });

    test('should throw error when encryption key is missing', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => loadEncryptionKey()).toThrow(KeyManagementError);
      expect(() => loadEncryptionKey()).toThrow(/ENCRYPTION_KEY environment variable is not set/);

      process.env.ENCRYPTION_KEY = originalKey;
    });

    test('should throw error for invalid key length', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = Buffer.from('short').toString('base64');

      expect(() => loadEncryptionKey()).toThrow(KeyManagementError);
      expect(() => loadEncryptionKey()).toThrow(/Invalid key length/);

      process.env.ENCRYPTION_KEY = originalKey;
    });

    test('should throw error for invalid base64 key', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      process.env.ENCRYPTION_KEY = 'not-valid-base64!!!';

      expect(() => loadEncryptionKey()).toThrow(KeyManagementError);

      process.env.ENCRYPTION_KEY = originalKey;
    });

    test('should generate cryptographically secure IV', () => {
      const iv1 = generateIV();
      const iv2 = generateIV();

      expect(iv1).toBeInstanceOf(Buffer);
      expect(iv1.length).toBe(ENCRYPTION_CONSTANTS.IV_SIZE);
      expect(iv2.length).toBe(ENCRYPTION_CONSTANTS.IV_SIZE);
      expect(iv1.equals(iv2)).toBe(false); // IVs should be unique
    });
  });

  describe('Basic Encryption/Decryption', () => {
    test('should encrypt plaintext successfully', () => {
      const plaintext = 'sensitive data';
      const result = encrypt(plaintext);

      expect(result).toHaveProperty('encrypted');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');

      expect(result.version).toBe(ENCRYPTION_CONSTANTS.CURRENT_VERSION);
      expect(result.algorithm).toBe(ENCRYPTION_CONSTANTS.ALGORITHM);
      expect(result.encrypted).not.toBe(plaintext);
      expect(result.encrypted.length).toBeGreaterThan(0);
    });

    test('should decrypt encrypted data successfully', () => {
      const plaintext = 'test data 123';
      const encrypted = encrypt(plaintext);
      const decrypted = decrypt(encrypted.encrypted, encrypted.version);

      expect(decrypted.plaintext).toBe(plaintext);
      expect(decrypted.version).toBe(encrypted.version);
      expect(decrypted.algorithm).toBe(encrypted.algorithm);
    });

    test('should handle round-trip encryption/decryption', () => {
      const testCases = [
        'simple text',
        '+1234567890',
        'user@example.com',
        'Complex $tring with special chars!@#',
        '日本語 unicode テスト',
        ' ',
        'a',
        'x'.repeat(1000), // Long string
      ];

      for (const testCase of testCases) {
        const encrypted = encrypt(testCase);
        const decrypted = decrypt(encrypted.encrypted, encrypted.version);
        expect(decrypted.plaintext).toBe(testCase);
      }
    });

    test('should produce different ciphertext for same plaintext', () => {
      const plaintext = 'same data';
      const result1 = encrypt(plaintext);
      const result2 = encrypt(plaintext);

      // Different IVs should produce different ciphertext
      expect(result1.iv).not.toBe(result2.iv);
      expect(result1.encrypted).not.toBe(result2.encrypted);

      // But both should decrypt to same plaintext
      expect(decrypt(result1.encrypted, result1.version).plaintext).toBe(plaintext);
      expect(decrypt(result2.encrypted, result2.version).plaintext).toBe(plaintext);
    });
  });

  describe('Error Handling', () => {
    test('should throw DecryptionError for corrupted data', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);

      // Corrupt the encrypted data
      const buffer = Buffer.from(encrypted.encrypted, 'base64');
      buffer[buffer.length - 1] ^= 0xFF; // Flip bits in auth tag
      const corrupted = buffer.toString('base64');

      expect(() => decrypt(corrupted, encrypted.version)).toThrow(DecryptionError);
    });

    test('should throw DecryptionError for invalid encrypted data format', () => {
      expect(() => decrypt('invalid-data', ENCRYPTION_CONSTANTS.CURRENT_VERSION)).toThrow(
        DecryptionError
      );
    });

    test('should throw DecryptionError for too short data', () => {
      const shortData = Buffer.from('abc').toString('base64');
      expect(() => decrypt(shortData, ENCRYPTION_CONSTANTS.CURRENT_VERSION)).toThrow(
        DecryptionError
      );
      expect(() => decrypt(shortData, ENCRYPTION_CONSTANTS.CURRENT_VERSION)).toThrow(
        /too short/
      );
    });

    test('should handle empty encryption gracefully', () => {
      expect(() => encrypt('')).not.toThrow();
    });
  });

  describe('Data Validation', () => {
    test('should validate correct encrypted data structure', () => {
      const plaintext = 'test';
      const encrypted = encrypt(plaintext);
      const validation = validateEncryptedData(encrypted.encrypted, encrypted.version);

      expect(validation.valid).toBe(true);
      expect(validation.details?.isBase64).toBe(true);
      expect(validation.details?.hasValidStructure).toBe(true);
    });

    test('should reject empty encrypted data', () => {
      const validation = validateEncryptedData('', ENCRYPTION_CONSTANTS.CURRENT_VERSION);
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    test('should reject invalid base64', () => {
      const validation = validateEncryptedData('not-base64!!!', ENCRYPTION_CONSTANTS.CURRENT_VERSION);
      expect(validation.valid).toBe(false);
      expect(validation.details?.isBase64).toBe(false);
    });

    test('should reject data that is too short', () => {
      const shortData = Buffer.from('abc').toString('base64');
      const validation = validateEncryptedData(shortData, ENCRYPTION_CONSTANTS.CURRENT_VERSION);
      expect(validation.valid).toBe(false);
      expect(validation.details?.hasValidStructure).toBe(false);
    });
  });

  describe('Batch Operations', () => {
    test('should encrypt multiple values in batch', () => {
      const values = [
        '+1234567890',
        'user@example.com',
        'secret123',
      ];

      const results = encryptBatch(values);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.encrypted).toBeDefined();
        expect(result.version).toBe(ENCRYPTION_CONSTANTS.CURRENT_VERSION);

        // Verify can decrypt
        const decrypted = decrypt(result.encrypted, result.version);
        expect(decrypted.plaintext).toBe(values[index]);
      });
    });

    test('should decrypt multiple values in batch', () => {
      const plaintexts = ['data1', 'data2', 'data3'];
      const encrypted = encryptBatch(plaintexts);

      const encryptedValues = encrypted.map(e => ({
        data: e.encrypted,
        version: e.version,
      }));

      const decrypted = decryptBatch(encryptedValues);

      expect(decrypted).toHaveLength(3);
      decrypted.forEach((result, index) => {
        expect(result.plaintext).toBe(plaintexts[index]);
      });
    });
  });

  describe('Key Rotation', () => {
    test('should re-encrypt data with new version', () => {
      const plaintext = 'rotate this';
      const encrypted = encrypt(plaintext, { version: 'v1' });

      const reEncrypted = reEncrypt(
        encrypted.encrypted,
        'v1',
        'v2',
        { version: 'v1' },
        { version: 'v2' }
      );

      expect(reEncrypted.version).toBe('v2');
      expect(reEncrypted.encrypted).not.toBe(encrypted.encrypted);

      // Verify can decrypt with new version
      const decrypted = decrypt(reEncrypted.encrypted, 'v2');
      expect(decrypted.plaintext).toBe(plaintext);
    });
  });

  describe('System Tests', () => {
    test('should pass encryption system test', () => {
      const result = testEncryption();
      expect(result).toBe(true);
    });

    test('should return correct encryption status', () => {
      const status = getEncryptionStatus();

      expect(status.keyLoaded).toBe(true);
      expect(status.version).toBe(ENCRYPTION_CONSTANTS.CURRENT_VERSION);
      expect(status.algorithm).toBe(ENCRYPTION_CONSTANTS.ALGORITHM);
      expect(status.testPassed).toBe(true);
    });

    test('should report failed status when key is missing', () => {
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      const status = getEncryptionStatus();
      expect(status.keyLoaded).toBe(false);
      expect(status.testPassed).toBe(false);

      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  describe('Security Features', () => {
    test('should use unique IV for each encryption', () => {
      const plaintext = 'same data';
      const ivs = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const result = encrypt(plaintext);
        ivs.add(result.iv);
      }

      expect(ivs.size).toBe(100); // All IVs should be unique
    });

    test('should include authentication tag', () => {
      const plaintext = 'authenticated';
      const result = encrypt(plaintext);

      expect(result.authTag).toBeDefined();
      expect(result.authTag.length).toBeGreaterThan(0);

      // Verify auth tag is Base64
      expect(() => Buffer.from(result.authTag, 'base64')).not.toThrow();
    });

    test('should clear sensitive buffer data', () => {
      const buffer = Buffer.from('sensitive data');
      const original = Buffer.from(buffer);

      clearBuffer(buffer);

      // Buffer should be modified
      expect(buffer.equals(original)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string encryption', () => {
      const result = encrypt('');
      expect(result.encrypted).toBeDefined();

      const decrypted = decrypt(result.encrypted, result.version);
      expect(decrypted.plaintext).toBe('');
    });

    test('should handle very long strings', () => {
      const longString = 'x'.repeat(10000);
      const result = encrypt(longString);
      const decrypted = decrypt(result.encrypted, result.version);

      expect(decrypted.plaintext).toBe(longString);
      expect(decrypted.plaintext.length).toBe(10000);
    });

    test('should handle unicode characters', () => {
      const unicode = '🔒 日本語 العربية';
      const result = encrypt(unicode);
      const decrypted = decrypt(result.encrypted, result.version);

      expect(decrypted.plaintext).toBe(unicode);
    });

    test('should handle special characters', () => {
      const special = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
      const result = encrypt(special);
      const decrypted = decrypt(result.encrypted, result.version);

      expect(decrypted.plaintext).toBe(special);
    });

    test('should handle whitespace-only strings', () => {
      const whitespace = '   \n\t   ';
      const result = encrypt(whitespace);
      const decrypted = decrypt(result.encrypted, result.version);

      expect(decrypted.plaintext).toBe(whitespace);
    });
  });

  describe('Performance', () => {
    test('should encrypt/decrypt within acceptable time', () => {
      const plaintext = 'performance test';
      const iterations = 1000;

      const startEncrypt = Date.now();
      for (let i = 0; i < iterations; i++) {
        encrypt(plaintext);
      }
      const encryptTime = Date.now() - startEncrypt;

      const encrypted = encrypt(plaintext);
      const startDecrypt = Date.now();
      for (let i = 0; i < iterations; i++) {
        decrypt(encrypted.encrypted, encrypted.version);
      }
      const decryptTime = Date.now() - startDecrypt;

      console.log(`Encryption: ${iterations} operations in ${encryptTime}ms (${(iterations / encryptTime * 1000).toFixed(0)} ops/sec)`);
      console.log(`Decryption: ${iterations} operations in ${decryptTime}ms (${(iterations / decryptTime * 1000).toFixed(0)} ops/sec)`);

      // Should be reasonably fast (adjust thresholds as needed)
      expect(encryptTime).toBeLessThan(5000); // 5 seconds for 1000 encryptions
      expect(decryptTime).toBeLessThan(5000); // 5 seconds for 1000 decryptions
    });

    test('should handle batch operations efficiently', () => {
      const values = Array(100).fill('test data');

      const start = Date.now();
      const encrypted = encryptBatch(values);
      const encryptTime = Date.now() - start;

      const encryptedValues = encrypted.map(e => ({
        data: e.encrypted,
        version: e.version,
      }));

      const startDecrypt = Date.now();
      const decrypted = decryptBatch(encryptedValues);
      const decryptTime = Date.now() - startDecrypt;

      console.log(`Batch encrypt: ${values.length} values in ${encryptTime}ms`);
      console.log(`Batch decrypt: ${values.length} values in ${decryptTime}ms`);

      expect(encrypted).toHaveLength(100);
      expect(decrypted).toHaveLength(100);
      expect(encryptTime).toBeLessThan(1000);
      expect(decryptTime).toBeLessThan(1000);
    });
  });
});
