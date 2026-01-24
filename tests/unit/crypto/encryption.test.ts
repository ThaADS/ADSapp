/**
 * Encryption Library Unit Tests
 *
 * Tests for AES-256-GCM encryption and decryption functions.
 * Covers: encryption, decryption, IV randomness, key management, and error handling.
 *
 * @group unit
 * @group crypto
 * @group security
 */

import {
  encrypt,
  decrypt,
  generateIV,
  validateEncryptedData,
  encryptBatch,
  decryptBatch,
  testEncryption,
  getEncryptionStatus,
  __testing__,
} from '@/lib/crypto/encryption';
import * as crypto from 'crypto';

describe('Encryption Library', () => {
  // Set up encryption key for tests
  beforeAll(() => {
    // Generate a test encryption key (32 bytes for AES-256)
    const testKey = crypto.randomBytes(32).toString('base64');
    process.env.ENCRYPTION_KEY = testKey;
  });

  afterAll(() => {
    delete process.env.ENCRYPTION_KEY;
  });

  // =========================================================================
  // TEST 1: Encrypt produces different output each time (IV randomness)
  // =========================================================================
  describe('encrypt', () => {
    it('should produce different encrypted output each time due to random IV', () => {
      // Arrange
      const plaintext = '+1234567890'; // Sample phone number

      // Act
      const encrypted1 = encrypt(plaintext);
      const encrypted2 = encrypt(plaintext);
      const encrypted3 = encrypt(plaintext);

      // Assert
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted2.encrypted).not.toBe(encrypted3.encrypted);
      expect(encrypted1.encrypted).not.toBe(encrypted3.encrypted);

      // Verify all have different IVs
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted2.iv).not.toBe(encrypted3.iv);

      // Verify all have same version and algorithm
      expect(encrypted1.version).toBe(encrypted2.version);
      expect(encrypted1.algorithm).toBe(encrypted2.algorithm);
    });

    it('should produce valid base64 encoded output', () => {
      // Arrange
      const plaintext = 'test-data-123';

      // Act
      const result = encrypt(plaintext);

      // Assert
      expect(() => Buffer.from(result.encrypted, 'base64')).not.toThrow();
      expect(() => Buffer.from(result.iv, 'base64')).not.toThrow();
      expect(() => Buffer.from(result.authTag, 'base64')).not.toThrow();
    });

    it('should include metadata in encryption result', () => {
      // Arrange
      const plaintext = 'sensitive data';

      // Act
      const result = encrypt(plaintext);

      // Assert
      expect(result).toHaveProperty('encrypted');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('algorithm');
      expect(result).toHaveProperty('iv');
      expect(result).toHaveProperty('authTag');
      expect(typeof result.encrypted).toBe('string');
      expect(result.version).toBe('v1');
      expect(result.algorithm).toBe('aes-256-gcm');
    });
  });

  // =========================================================================
  // TEST 2: Decrypt returns original plaintext
  // =========================================================================
  describe('decrypt', () => {
    it('should decrypt data back to original plaintext', () => {
      // Arrange
      const originalText = 'Hello, World! This is a test message.';

      // Act
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted.encrypted, encrypted.version);

      // Assert
      expect(decrypted.plaintext).toBe(originalText);
      expect(decrypted.version).toBe(encrypted.version);
      expect(decrypted.algorithm).toBe(encrypted.algorithm);
    });

    it('should successfully decrypt various data types as strings', () => {
      // Arrange
      const testCases = [
        'Simple string',
        'String with special chars: !@#$%^&*()',
        '1234567890',
        'email@example.com',
        '+1-555-0123',
        'Multi\nLine\nString',
        'Unicode: 你好世界 🌍',
      ];

      // Act & Assert
      testCases.forEach((testCase) => {
        const encrypted = encrypt(testCase);
        const decrypted = decrypt(encrypted.encrypted, encrypted.version);
        expect(decrypted.plaintext).toBe(testCase);
      });
    });
  });

  // =========================================================================
  // TEST 3: Encryption with empty string
  // =========================================================================
  describe('Empty string encryption', () => {
    it('should handle empty string encryption and decryption', () => {
      // Arrange
      const emptyString = '';

      // Act
      const encrypted = encrypt(emptyString);
      const decrypted = decrypt(encrypted.encrypted, encrypted.version);

      // Assert
      expect(decrypted.plaintext).toBe(emptyString);
      expect(encrypted.encrypted).toBeTruthy(); // Should still produce encrypted output
    });

    it('should produce different encrypted outputs for empty strings', () => {
      // Arrange
      const emptyString = '';

      // Act
      const encrypted1 = encrypt(emptyString);
      const encrypted2 = encrypt(emptyString);

      // Assert
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
  });

  // =========================================================================
  // TEST 4: Encryption with long strings (>1MB)
  // =========================================================================
  describe('Long string encryption', () => {
    it('should handle large data encryption (1MB)', () => {
      // Arrange
      const largeString = 'A'.repeat(1024 * 1024); // 1 MB string

      // Act
      const startTime = Date.now();
      const encrypted = encrypt(largeString);
      const encryptionTime = Date.now() - startTime;

      const decrypted = decrypt(encrypted.encrypted, encrypted.version);
      const totalTime = Date.now() - startTime;

      // Assert
      expect(decrypted.plaintext).toBe(largeString);
      expect(decrypted.plaintext.length).toBe(1024 * 1024);

      // Performance check - should complete within reasonable time
      expect(encryptionTime).toBeLessThan(5000); // 5 seconds
      expect(totalTime).toBeLessThan(10000); // 10 seconds total
    }, 15000); // 15 second timeout

    it('should handle moderately large data (100KB)', () => {
      // Arrange
      const mediumString = 'Test data with some variety! '.repeat(3500); // ~100KB

      // Act
      const encrypted = encrypt(mediumString);
      const decrypted = decrypt(encrypted.encrypted, encrypted.version);

      // Assert
      expect(decrypted.plaintext).toBe(mediumString);
      expect(decrypted.plaintext.length).toBeGreaterThan(100000);
    });
  });

  // =========================================================================
  // TEST 5: Decrypt with wrong key fails gracefully
  // =========================================================================
  describe('Error handling', () => {
    it('should fail gracefully when decrypting with wrong key', () => {
      // Arrange
      const originalKey = process.env.ENCRYPTION_KEY;
      const plaintext = 'secret message';

      // Encrypt with original key
      const encrypted = encrypt(plaintext);

      // Change the key
      const wrongKey = crypto.randomBytes(32).toString('base64');
      process.env.ENCRYPTION_KEY = wrongKey;

      // Act & Assert
      expect(() => {
        decrypt(encrypted.encrypted, encrypted.version);
      }).toThrow();

      // Restore original key
      process.env.ENCRYPTION_KEY = originalKey;
    });

    it('should throw error for invalid encrypted data', () => {
      // Arrange
      const invalidData = 'not-valid-encrypted-data';

      // Act & Assert
      expect(() => {
        decrypt(invalidData, 'v1');
      }).toThrow();
    });

    it('should throw error for tampered encrypted data', () => {
      // Arrange
      const plaintext = 'important data';
      const encrypted = encrypt(plaintext);

      // Tamper with the encrypted data (flip a bit)
      const tamperedData = Buffer.from(encrypted.encrypted, 'base64');
      tamperedData[10] = tamperedData[10] ^ 0xFF; // Flip bits
      const tamperedBase64 = tamperedData.toString('base64');

      // Act & Assert
      expect(() => {
        decrypt(tamperedBase64, encrypted.version);
      }).toThrow(); // Authentication tag verification should fail
    });

    it('should throw error when encryption key is missing', () => {
      // Arrange
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      // Act & Assert
      expect(() => {
        encrypt('test');
      }).toThrow(/ENCRYPTION_KEY/);

      // Restore
      process.env.ENCRYPTION_KEY = originalKey;
    });
  });

  // =========================================================================
  // BONUS TESTS
  // =========================================================================
  describe('Batch operations', () => {
    it('should encrypt multiple values in batch', () => {
      // Arrange
      const values = ['value1', 'value2', 'value3', 'value4'];

      // Act
      const encrypted = encryptBatch(values);

      // Assert
      expect(encrypted).toHaveLength(4);
      encrypted.forEach((result, index) => {
        expect(result.encrypted).toBeTruthy();
        expect(result.version).toBe('v1');

        // Verify decryption
        const decrypted = decrypt(result.encrypted, result.version);
        expect(decrypted.plaintext).toBe(values[index]);
      });
    });

    it('should decrypt multiple values in batch', () => {
      // Arrange
      const values = ['data1', 'data2', 'data3'];
      const encrypted = encryptBatch(values);
      const encryptedData = encrypted.map((e) => ({ data: e.encrypted, version: e.version }));

      // Act
      const decrypted = decryptBatch(encryptedData);

      // Assert
      expect(decrypted).toHaveLength(3);
      decrypted.forEach((result, index) => {
        expect(result.plaintext).toBe(values[index]);
      });
    });
  });

  describe('IV generation', () => {
    it('should generate random IVs of correct length', () => {
      // Act
      const iv1 = generateIV();
      const iv2 = generateIV();
      const iv3 = generateIV();

      // Assert
      expect(iv1.length).toBe(12); // Default GCM IV length
      expect(iv2.length).toBe(12);
      expect(iv3.length).toBe(12);

      // Verify randomness
      expect(iv1).not.toEqual(iv2);
      expect(iv2).not.toEqual(iv3);
      expect(iv1).not.toEqual(iv3);
    });

    it('should generate IVs of custom length', () => {
      // Act
      const iv16 = generateIV(16);
      const iv32 = generateIV(32);

      // Assert
      expect(iv16.length).toBe(16);
      expect(iv32.length).toBe(32);
    });
  });

  describe('Validation', () => {
    it('should validate encrypted data structure', () => {
      // Arrange
      const plaintext = 'test validation';
      const encrypted = encrypt(plaintext);

      // Act
      const validation = validateEncryptedData(encrypted.encrypted, encrypted.version);

      // Assert
      expect(validation.valid).toBe(true);
      expect(validation.details?.hasVersion).toBe(true);
      expect(validation.details?.hasEncrypted).toBe(true);
      expect(validation.details?.isBase64).toBe(true);
      expect(validation.details?.hasValidStructure).toBe(true);
    });

    it('should detect invalid encrypted data', () => {
      // Act
      const validation = validateEncryptedData('invalid', 'v1');

      // Assert
      expect(validation.valid).toBe(false);
      expect(validation.error).toBeTruthy();
    });
  });

  describe('System status', () => {
    it('should report encryption system status', () => {
      // Act
      const status = getEncryptionStatus();

      // Assert
      expect(status.keyLoaded).toBe(true);
      expect(status.version).toBe('v1');
      expect(status.algorithm).toBe('aes-256-gcm');
      expect(status.testPassed).toBe(true);
    });

    it('should successfully run encryption test', () => {
      // Act
      const result = testEncryption();

      // Assert
      expect(result).toBe(true);
    });

    it('should test encryption with custom data', () => {
      // Arrange
      const customData = 'custom-test-data-12345';

      // Act
      const result = testEncryption(customData);

      // Assert
      expect(result).toBe(true);
    });
  });
});
