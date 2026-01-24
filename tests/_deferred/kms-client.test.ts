/**
 * KMS Client Unit Tests
 *
 * Tests for AWS KMS integration and encryption key management
 */

import { KMSClient, getKMSClient, resetKMSClient } from '@/lib/security/kms-client';
import { KeyManagementError } from '@/lib/crypto/types';

// Mock AWS SDK
jest.mock('@aws-sdk/client-kms', () => ({
  KMSClient: jest.fn().mockImplementation(() => ({
    send: jest.fn(),
    destroy: jest.fn(),
  })),
  GenerateDataKeyCommand: jest.fn(),
  DecryptCommand: jest.fn(),
  EncryptCommand: jest.fn(),
  DescribeKeyCommand: jest.fn(),
  KMSServiceException: class KMSServiceException extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'KMSServiceException';
    }
  },
}));

jest.mock('@aws-sdk/credential-providers', () => ({
  fromEnv: jest.fn(() => ({
    accessKeyId: 'test-access-key',
    secretAccessKey: 'test-secret-key',
  })),
}));

describe('KMSClient', () => {
  let kmsClient: KMSClient;

  beforeEach(() => {
    // Set environment variables
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_KMS_KEY_ID = '12345678-1234-1234-1234-123456789012';
    process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

    resetKMSClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetKMSClient();
  });

  describe('Configuration', () => {
    it('should load configuration from environment variables', () => {
      expect(() => new KMSClient()).not.toThrow();
    });

    it('should accept custom configuration', () => {
      const config = {
        region: 'us-west-2',
        keyId: 'custom-key-id',
        maxRetries: 5,
      };

      expect(() => new KMSClient(config)).not.toThrow();
    });

    it('should throw error if AWS_KMS_KEY_ID is missing', () => {
      delete process.env.AWS_KMS_KEY_ID;

      expect(() => new KMSClient()).toThrow(KeyManagementError);
      expect(() => new KMSClient()).toThrow('AWS_KMS_KEY_ID is required');
    });

    it('should validate key ID format', () => {
      process.env.AWS_KMS_KEY_ID = 'invalid-key-format';

      expect(() => new KMSClient()).toThrow(KeyManagementError);
      expect(() => new KMSClient()).toThrow('Invalid KMS Key ID format');
    });

    it('should accept ARN format key ID', () => {
      process.env.AWS_KMS_KEY_ID =
        'arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012';

      expect(() => new KMSClient()).not.toThrow();
    });

    it('should accept alias format key ID', () => {
      process.env.AWS_KMS_KEY_ID = 'alias/my-key';

      expect(() => new KMSClient()).not.toThrow();
    });
  });

  describe('generateDataKey', () => {
    it('should generate a data key for a tenant', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        CiphertextBlob: Buffer.from('encrypted-key'),
        Plaintext: Buffer.from('a'.repeat(32)), // 32 bytes for AES-256
        KeyId: process.env.AWS_KMS_KEY_ID,
      });

      const { KMSClient: MockKMSClient } = require('@aws-sdk/client-kms');
      MockKMSClient.mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      }));

      kmsClient = new KMSClient();
      const result = await kmsClient.generateDataKey('tenant-123');

      expect(result).toHaveProperty('ciphertext');
      expect(result).toHaveProperty('plaintext');
      expect(result).toHaveProperty('keyId');
      expect(result.plaintext).toBeInstanceOf(Buffer);
      expect(result.plaintext.length).toBe(32);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should include encryption context with tenant ID', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        CiphertextBlob: Buffer.from('encrypted-key'),
        Plaintext: Buffer.from('a'.repeat(32)),
        KeyId: process.env.AWS_KMS_KEY_ID,
      });

      const { KMSClient: MockKMSClient } = require('@aws-sdk/client-kms');
      MockKMSClient.mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      }));

      kmsClient = new KMSClient();
      await kmsClient.generateDataKey('tenant-123');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.input.EncryptionContext).toHaveProperty('TenantId', 'tenant-123');
    });

    it('should cache the generated key', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        CiphertextBlob: Buffer.from('encrypted-key'),
        Plaintext: Buffer.from('a'.repeat(32)),
        KeyId: process.env.AWS_KMS_KEY_ID,
      });

      const { KMSClient: MockKMSClient } = require('@aws-sdk/client-kms');
      MockKMSClient.mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      }));

      kmsClient = new KMSClient();
      await kmsClient.generateDataKey('tenant-123');

      // Call decryptDataKey to verify cache
      await kmsClient.decryptDataKey('encrypted-key', 'tenant-123');

      // Should only call generateDataKey once, decrypt should use cache
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should handle KMS errors gracefully', async () => {
      const mockSend = jest.fn().mockRejectedValue(
        new Error('KMS service unavailable')
      );

      const { KMSClient: MockKMSClient } = require('@aws-sdk/client-kms');
      MockKMSClient.mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      }));

      kmsClient = new KMSClient();

      await expect(kmsClient.generateDataKey('tenant-123')).rejects.toThrow(
        KeyManagementError
      );
    });
  });

  describe('decryptDataKey', () => {
    it('should decrypt a data key', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Plaintext: Buffer.from('b'.repeat(32)),
        KeyId: process.env.AWS_KMS_KEY_ID,
      });

      const { KMSClient: MockKMSClient } = require('@aws-sdk/client-kms');
      MockKMSClient.mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      }));

      kmsClient = new KMSClient();
      const result = await kmsClient.decryptDataKey(
        Buffer.from('encrypted-key').toString('base64'),
        'tenant-123'
      );

      expect(result).toHaveProperty('plaintext');
      expect(result).toHaveProperty('keyId');
      expect(result.plaintext).toBeInstanceOf(Buffer);
      expect(result.plaintext.length).toBe(32);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return cached key if available', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Plaintext: Buffer.from('c'.repeat(32)),
        KeyId: process.env.AWS_KMS_KEY_ID,
      });

      const { KMSClient: MockKMSClient } = require('@aws-sdk/client-kms');
      MockKMSClient.mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      }));

      kmsClient = new KMSClient();

      // First call - should hit KMS
      await kmsClient.decryptDataKey('encrypted-key', 'tenant-123');

      // Second call - should use cache
      await kmsClient.decryptDataKey('encrypted-key', 'tenant-123');

      expect(mockSend).toHaveBeenCalledTimes(1); // Only one KMS call
    });

    it('should include encryption context for tenant validation', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Plaintext: Buffer.from('d'.repeat(32)),
        KeyId: process.env.AWS_KMS_KEY_ID,
      });

      const { KMSClient: MockKMSClient } = require('@aws-sdk/client-kms');
      MockKMSClient.mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      }));

      kmsClient = new KMSClient();
      await kmsClient.decryptDataKey('encrypted-key', 'tenant-456');

      const callArgs = mockSend.mock.calls[0][0];
      expect(callArgs.input.EncryptionContext).toHaveProperty('TenantId', 'tenant-456');
    });
  });

  describe('Cache Management', () => {
    it('should clear cache for specific tenant', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Plaintext: Buffer.from('e'.repeat(32)),
        KeyId: process.env.AWS_KMS_KEY_ID,
      });

      const { KMSClient: MockKMSClient } = require('@aws-sdk/client-kms');
      MockKMSClient.mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      }));

      kmsClient = new KMSClient();

      // Cache a key
      await kmsClient.decryptDataKey('encrypted-key', 'tenant-123');

      // Clear cache
      kmsClient.clearCache('tenant-123');

      // Should call KMS again
      await kmsClient.decryptDataKey('encrypted-key', 'tenant-123');

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should clear all caches when no tenant specified', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Plaintext: Buffer.from('f'.repeat(32)),
        KeyId: process.env.AWS_KMS_KEY_ID,
      });

      const { KMSClient: MockKMSClient } = require('@aws-sdk/client-kms');
      MockKMSClient.mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      }));

      kmsClient = new KMSClient();

      // Cache keys for multiple tenants
      await kmsClient.decryptDataKey('encrypted-key-1', 'tenant-1');
      await kmsClient.decryptDataKey('encrypted-key-2', 'tenant-2');

      // Clear all caches
      kmsClient.clearCache();

      // Should call KMS again for both
      await kmsClient.decryptDataKey('encrypted-key-1', 'tenant-1');
      await kmsClient.decryptDataKey('encrypted-key-2', 'tenant-2');

      expect(mockSend).toHaveBeenCalledTimes(4); // 2 initial + 2 after clear
    });
  });

  describe('Statistics', () => {
    it('should track operation statistics', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Plaintext: Buffer.from('g'.repeat(32)),
        KeyId: process.env.AWS_KMS_KEY_ID,
      });

      const { KMSClient: MockKMSClient } = require('@aws-sdk/client-kms');
      MockKMSClient.mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      }));

      kmsClient = new KMSClient();

      await kmsClient.decryptDataKey('encrypted-key', 'tenant-123');

      const stats = kmsClient.getStats();

      expect(stats.totalOperations).toBe(1);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(0);
    });

    it('should reset statistics', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        Plaintext: Buffer.from('h'.repeat(32)),
        KeyId: process.env.AWS_KMS_KEY_ID,
      });

      const { KMSClient: MockKMSClient } = require('@aws-sdk/client-kms');
      MockKMSClient.mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      }));

      kmsClient = new KMSClient();

      await kmsClient.decryptDataKey('encrypted-key', 'tenant-123');

      kmsClient.resetStats();

      const stats = kmsClient.getStats();

      expect(stats.totalOperations).toBe(0);
      expect(stats.successful).toBe(0);
    });
  });

  describe('Connection Test', () => {
    it('should test KMS connectivity successfully', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        KeyMetadata: {
          KeyId: process.env.AWS_KMS_KEY_ID,
          Arn: `arn:aws:kms:us-east-1:123456789012:key/${process.env.AWS_KMS_KEY_ID}`,
          KeyState: 'Enabled',
          CreationDate: new Date(),
        },
      });

      const { KMSClient: MockKMSClient } = require('@aws-sdk/client-kms');
      MockKMSClient.mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      }));

      kmsClient = new KMSClient();
      const result = await kmsClient.testConnection();

      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      const mockSend = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const { KMSClient: MockKMSClient } = require('@aws-sdk/client-kms');
      MockKMSClient.mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      }));

      kmsClient = new KMSClient();
      const result = await kmsClient.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('Singleton', () => {
    it('should return same instance for getKMSClient', () => {
      const instance1 = getKMSClient();
      const instance2 = getKMSClient();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getKMSClient();

      resetKMSClient();

      const instance2 = getKMSClient();

      expect(instance1).not.toBe(instance2);
    });
  });
});
