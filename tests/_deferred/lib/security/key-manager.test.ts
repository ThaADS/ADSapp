/**
 * Key Manager Unit Tests
 *
 * Tests key rotation (90-day expiration), key versioning,
 * backward compatibility, and multi-tenant key isolation.
 */

import {
  KeyManager,
  getKeyManager,
  resetKeyManager,
  __testing__,
} from '@/lib/security/key-manager';
import { KMSClient } from '@/lib/security/kms-client';
import * as crypto from 'crypto';

// Mock dependencies
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/security/kms-client');

import { createClient } from '@/lib/supabase/server';

describe('KeyManager - Key Rotation & Versioning', () => {
  let keyManager: KeyManager;
  let mockKMSClient: jest.Mocked<KMSClient>;
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset key manager singleton
    resetKeyManager();

    // Create mock KMS client
    mockKMSClient = {
      generateDataKey: jest.fn(),
      decryptDataKey: jest.fn(),
      encryptDataKey: jest.fn(),
      rotateKey: jest.fn(),
      listKeys: jest.fn(),
      describeKey: jest.fn(),
      scheduleKeyDeletion: jest.fn(),
      cancelKeyDeletion: jest.fn(),
      getKeyRotationStatus: jest.fn(),
      enableKeyRotation: jest.fn(),
      disableKeyRotation: jest.fn(),
      createAlias: jest.fn(),
      updateAlias: jest.fn(),
      deleteAlias: jest.fn(),
      listAliases: jest.fn(),
    } as any;

    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
    };

    // Mock createClient to return our mock
    (createClient as jest.MockedFunction<typeof createClient>) = jest
      .fn()
      .mockResolvedValue(mockSupabaseClient);

    // Create key manager with mocked KMS client
    keyManager = new KeyManager(mockKMSClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetKeyManager();
  });

  describe('Key Rotation (90-day Expiration)', () => {
    it('should rotate key after 90-day expiration', async () => {
      // Arrange
      const tenantId = 'tenant-abc123';
      const currentVersion = 1;
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 91 * 24 * 60 * 60 * 1000); // 91 days ago

      const expiredKey = {
        id: 'key-old-123',
        tenant_id: tenantId,
        kms_key_id: 'arn:aws:kms:old',
        encrypted_data_key: 'encrypted-old-key-base64',
        version: currentVersion,
        is_active: true,
        created_at: expiredDate.toISOString(),
        expires_at: expiredDate.toISOString(),
        rotated_at: null,
      };

      const newKeyPlaintext = crypto.randomBytes(32);
      const newKeyEncrypted = 'encrypted-new-key-base64';

      // Mock database responses
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: expiredKey, error: null }) // Get active key
        .mockResolvedValueOnce({ data: null, error: null }); // Get next version

      mockSupabaseClient.update.mockResolvedValue({ data: null, error: null });
      mockSupabaseClient.insert.mockResolvedValue({ data: null, error: null });

      // Mock KMS responses
      mockKMSClient.generateDataKey.mockResolvedValue({
        keyId: 'arn:aws:kms:new',
        plaintext: newKeyPlaintext,
        ciphertext: newKeyEncrypted,
      });

      // Act
      const newKey = await keyManager.rotateKey(tenantId);

      // Assert
      expect(newKey).toBeDefined();
      expect(newKey).toBeInstanceOf(Buffer);
      expect(mockSupabaseClient.update).toHaveBeenCalled();
      expect(mockKMSClient.generateDataKey).toHaveBeenCalledWith(tenantId);
    });

    it('should detect keys approaching expiration', async () => {
      // Arrange
      const tenantId = 'tenant-warning';
      const now = new Date();
      const nearExpirationDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000); // 5 days from now

      const key = {
        id: 'key-warning-123',
        tenant_id: tenantId,
        kms_key_id: 'arn:aws:kms:key',
        encrypted_data_key: 'encrypted-key-base64',
        version: 1,
        is_active: true,
        created_at: now.toISOString(),
        expires_at: nearExpirationDate.toISOString(),
        rotated_at: null,
      };

      const keyPlaintext = crypto.randomBytes(32);

      mockSupabaseClient.single.mockResolvedValue({ data: key, error: null });
      mockKMSClient.decryptDataKey.mockResolvedValue({
        keyId: key.kms_key_id,
        plaintext: keyPlaintext,
      });

      // Spy on console to verify warning
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      // Act
      await keyManager.getEncryptionKey(tenantId);

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('approaching expiration')
      );

      consoleInfoSpy.mockRestore();
    });

    it('should schedule automatic rotation for expired keys', async () => {
      // Arrange
      const now = new Date();
      const expiredDate = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      const warningDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const keysNeedingRotation = [
        { tenant_id: 'tenant-1' },
        { tenant_id: 'tenant-2' },
        { tenant_id: 'tenant-3' },
      ];

      // Mock database to return keys needing rotation
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });
      mockSupabaseClient.select.mockImplementation(() => {
        return Promise.resolve({ data: keysNeedingRotation, error: null });
      });

      // Mock KMS for key generation
      const newKeyPlaintext = crypto.randomBytes(32);
      mockKMSClient.generateDataKey.mockResolvedValue({
        keyId: 'arn:aws:kms:new',
        plaintext: newKeyPlaintext,
        ciphertext: 'encrypted-new-key',
      });

      mockSupabaseClient.insert.mockResolvedValue({ data: null, error: null });
      mockSupabaseClient.update.mockResolvedValue({ data: null, error: null });

      // Spy on console
      const consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();

      // Act
      await keyManager.scheduleRotation();

      // Assert
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('Scheduling rotation for')
      );
      expect(mockKMSClient.generateDataKey).toHaveBeenCalledTimes(3);

      consoleInfoSpy.mockRestore();
    });
  });

  describe('Key Versioning & Backward Compatibility', () => {
    it('should maintain key version history', async () => {
      // Arrange
      const tenantId = 'tenant-versioning';
      const keyHistory = [
        {
          id: 'key-v3',
          tenant_id: tenantId,
          kms_key_id: 'arn:aws:kms:v3',
          encrypted_data_key: 'encrypted-v3',
          version: 3,
          is_active: true,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          rotated_at: null,
        },
        {
          id: 'key-v2',
          tenant_id: tenantId,
          kms_key_id: 'arn:aws:kms:v2',
          encrypted_data_key: 'encrypted-v2',
          version: 2,
          is_active: false,
          created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
          expires_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          rotated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'key-v1',
          tenant_id: tenantId,
          kms_key_id: 'arn:aws:kms:v1',
          encrypted_data_key: 'encrypted-v1',
          version: 1,
          is_active: false,
          created_at: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
          expires_at: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000).toISOString(),
          rotated_at: new Date(Date.now() - 105 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      mockSupabaseClient.select.mockImplementation(() => {
        return Promise.resolve({ data: keyHistory, error: null });
      });

      // Act
      const history = await keyManager.getKeyHistory(tenantId);

      // Assert
      expect(history).toHaveLength(3);
      expect(history[0].version).toBe(3);
      expect(history[0].isActive).toBe(true);
      expect(history[1].version).toBe(2);
      expect(history[1].isActive).toBe(false);
      expect(history[1].rotatedAt).toBeDefined();
      expect(history[2].version).toBe(1);
      expect(history[2].isActive).toBe(false);
    });

    it('should increment version number correctly', async () => {
      // Arrange
      const tenantId = 'tenant-increment';
      const currentVersion = 5;

      // Mock existing key with version 5
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            version: currentVersion,
            tenant_id: tenantId,
          },
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: null }); // For next version query

      mockSupabaseClient.limit.mockReturnThis();

      const newKeyPlaintext = crypto.randomBytes(32);
      mockKMSClient.generateDataKey.mockResolvedValue({
        keyId: 'arn:aws:kms:new',
        plaintext: newKeyPlaintext,
        ciphertext: 'encrypted-new-key',
      });

      mockSupabaseClient.insert.mockImplementation((data) => {
        // Verify version is incremented
        expect(data.version).toBe(currentVersion + 1);
        return Promise.resolve({ data: null, error: null });
      });

      // Act
      await keyManager.createKey(tenantId);

      // Assert
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });
  });

  describe('Multi-Tenant Key Isolation', () => {
    it('should maintain separate keys for different tenants', async () => {
      // Arrange
      const tenant1 = 'tenant-alice';
      const tenant2 = 'tenant-bob';

      const key1Plaintext = crypto.randomBytes(32);
      const key2Plaintext = crypto.randomBytes(32);

      // Mock database responses for different tenants
      mockSupabaseClient.single
        .mockResolvedValueOnce({
          data: {
            id: 'key-alice',
            tenant_id: tenant1,
            kms_key_id: 'arn:aws:kms:alice',
            encrypted_data_key: 'encrypted-alice-key',
            version: 1,
            is_active: true,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'key-bob',
            tenant_id: tenant2,
            kms_key_id: 'arn:aws:kms:bob',
            encrypted_data_key: 'encrypted-bob-key',
            version: 1,
            is_active: true,
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          },
          error: null,
        });

      // Mock KMS decryption for different tenants
      mockKMSClient.decryptDataKey
        .mockResolvedValueOnce({
          keyId: 'arn:aws:kms:alice',
          plaintext: key1Plaintext,
        })
        .mockResolvedValueOnce({
          keyId: 'arn:aws:kms:bob',
          plaintext: key2Plaintext,
        });

      // Act
      const aliceKey = await keyManager.getEncryptionKey(tenant1);
      const bobKey = await keyManager.getEncryptionKey(tenant2);

      // Assert
      expect(aliceKey).not.toEqual(bobKey);
      expect(aliceKey).toEqual(key1Plaintext);
      expect(bobKey).toEqual(key2Plaintext);
      expect(mockKMSClient.decryptDataKey).toHaveBeenCalledWith('encrypted-alice-key', tenant1);
      expect(mockKMSClient.decryptDataKey).toHaveBeenCalledWith('encrypted-bob-key', tenant2);
    });

    it('should get key statistics per tenant', async () => {
      // Arrange
      const tenantId = 'tenant-stats';
      const now = new Date();

      const tenantKeys = [
        {
          is_active: true,
          created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          expires_at: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          is_active: false,
          created_at: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
          expires_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];

      mockSupabaseClient.select.mockImplementation(() => {
        return Promise.resolve({ data: tenantKeys, error: null });
      });

      // Act
      const stats = await keyManager.getKeyStats(tenantId);

      // Assert
      expect(stats).toBeDefined();
      expect(stats.totalKeys).toBe(2);
      expect(stats.activeKeys).toBe(1);
      expect(stats.expiredKeys).toBe(1);
      expect(stats.averageKeyAge).toBeGreaterThan(0);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('tenant_id', tenantId);
    });
  });
});
