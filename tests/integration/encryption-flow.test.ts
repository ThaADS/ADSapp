/**
 * Integration Tests for Encryption Flow
 *
 * End-to-end tests for field-level encryption integrated with
 * the database, API routes, and business logic.
 *
 * @module tests/integration/encryption-flow
 */

import * as crypto from 'crypto';
import {
  FieldEncryptor,
  encryptContact,
  decryptContact,
  encryptProfile,
  decryptProfile,
} from '../../src/lib/crypto/field-encryptor';
import {
  encryptBeforeWrite,
  decryptAfterRead,
  encryptRecords,
  decryptRecords,
  verifyDatabaseEncryption,
} from '../../src/lib/crypto/db-helpers';
import { ENCRYPTED_FIELDS } from '../../src/lib/crypto/types';

describe('Encryption Integration Flow', () => {
  let encryptor: FieldEncryptor;

  beforeAll(() => {
    // Set up test encryption key
    const testKey = crypto.randomBytes(32).toString('base64');
    process.env.ENCRYPTION_KEY = testKey;

    encryptor = new FieldEncryptor({ enableAuditLogging: true });
  });

  afterAll(() => {
    // Clean up
    delete process.env.ENCRYPTION_KEY;
  });

  describe('Field Encryptor', () => {
    test('should encrypt a single field value', () => {
      const plaintext = '+1234567890';
      const encrypted = encryptor.encryptField(plaintext, 'phone_number');

      expect(encrypted).not.toBeNull();
      expect(encrypted).not.toBe(plaintext);
      expect(typeof encrypted).toBe('string');
    });

    test('should decrypt a field value', () => {
      const plaintext = 'user@example.com';
      const encrypted = encryptor.encryptField(plaintext, 'email');
      const decrypted = encryptor.decryptField(encrypted!, 'email');

      expect(decrypted).toBe(plaintext);
    });

    test('should handle null values gracefully', () => {
      const encrypted = encryptor.encryptField(null, 'phone_number');
      expect(encrypted).toBeNull();

      const decrypted = encryptor.decryptField(null, 'phone_number');
      expect(decrypted).toBeNull();
    });

    test('should handle undefined values gracefully', () => {
      const encrypted = encryptor.encryptField(undefined, 'email');
      expect(encrypted).toBeNull();

      const decrypted = encryptor.decryptField(undefined, 'email');
      expect(decrypted).toBeNull();
    });

    test('should handle empty strings', () => {
      const encrypted = encryptor.encryptField('', 'field');
      expect(encrypted).toBeNull();

      const decrypted = encryptor.decryptField('', 'field');
      expect(decrypted).toBeNull();
    });

    test('should maintain audit logs', () => {
      encryptor.clearAuditLogs();

      encryptor.encryptField('test1', 'field1');
      encryptor.decryptField('encrypted', 'field2');
      encryptor.encryptField('test2', 'field3');

      const logs = encryptor.getAuditLogs();
      expect(logs.length).toBeGreaterThanOrEqual(2); // At least 2 successful operations
    });
  });

  describe('Record Encryption', () => {
    test('should encrypt contact record', () => {
      const contact = {
        id: '123',
        phone_number: '+1234567890',
        whatsapp_id: 'whatsapp:+1234567890',
        name: 'John Doe',
      };

      const encrypted = encryptor.encryptContact(contact);

      expect(encrypted.phone_number).not.toBe(contact.phone_number);
      expect(encrypted.whatsapp_id).not.toBe(contact.whatsapp_id);
      expect(encrypted.name).toBe(contact.name); // Not encrypted
      expect(encrypted.id).toBe(contact.id); // Not encrypted
    });

    test('should decrypt contact record', () => {
      const original = {
        id: '456',
        phone_number: '+9876543210',
        whatsapp_id: 'whatsapp:+9876543210',
        name: 'Jane Smith',
      };

      const encrypted = encryptor.encryptContact(original);
      const decrypted = encryptor.decryptContact(encrypted);

      expect(decrypted.phone_number).toBe(original.phone_number);
      expect(decrypted.whatsapp_id).toBe(original.whatsapp_id);
      expect(decrypted.name).toBe(original.name);
      expect(decrypted.id).toBe(original.id);
    });

    test('should encrypt profile record', () => {
      const profile = {
        id: '789',
        email: 'user@example.com',
        full_name: 'Test User',
        role: 'admin' as const,
      };

      const encrypted = encryptor.encryptProfile(profile);

      expect(encrypted.email).not.toBe(profile.email);
      expect(encrypted.full_name).toBe(profile.full_name); // Not encrypted
      expect(encrypted.role).toBe(profile.role); // Not encrypted
    });

    test('should decrypt profile record', () => {
      const original = {
        id: '101',
        email: 'admin@example.com',
        full_name: 'Admin User',
      };

      const encrypted = encryptor.encryptProfile(original);
      const decrypted = encryptor.decryptProfile(encrypted);

      expect(decrypted.email).toBe(original.email);
      expect(decrypted.full_name).toBe(original.full_name);
    });

    test('should handle records with null PII fields', () => {
      const contact = {
        id: '111',
        phone_number: null,
        whatsapp_id: null,
        name: 'No Phone',
      };

      const encrypted = encryptor.encryptContact(contact);
      expect(encrypted.phone_number).toBeNull();
      expect(encrypted.whatsapp_id).toBeNull();

      const decrypted = encryptor.decryptContact(encrypted);
      expect(decrypted.phone_number).toBeNull();
      expect(decrypted.whatsapp_id).toBeNull();
    });
  });

  describe('Batch Operations', () => {
    test('should batch encrypt multiple records', () => {
      const requests = [
        { id: '1', field: 'phone', value: '+1111111111' },
        { id: '2', field: 'phone', value: '+2222222222' },
        { id: '3', field: 'phone', value: '+3333333333' },
      ];

      const results = encryptor.batchEncrypt(requests);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.encrypted).not.toBeNull();
        expect(result.encrypted).not.toBe(requests[index].value);
      });
    });

    test('should batch decrypt multiple records', () => {
      const originalValues = ['+1111111111', '+2222222222', '+3333333333'];
      const encrypted = originalValues.map((value, index) => ({
        id: String(index + 1),
        field: 'phone',
        value,
      }));

      const encryptedResults = encryptor.batchEncrypt(encrypted);

      const decryptRequests = encryptedResults.map(result => ({
        id: result.id,
        field: result.field,
        encrypted: result.encrypted!,
      }));

      const decryptedResults = encryptor.batchDecrypt(decryptRequests);

      expect(decryptedResults).toHaveLength(3);
      decryptedResults.forEach((result, index) => {
        expect(result.success).toBe(true);
        expect(result.decrypted).toBe(originalValues[index]);
      });
    });

    test('should handle batch operations with failures gracefully', () => {
      const requests = [
        { id: '1', field: 'phone', value: '+1111111111' },
        { id: '2', field: 'phone', value: null }, // Will succeed with null
        { id: '3', field: 'phone', value: '+3333333333' },
      ];

      const results = encryptor.batchEncrypt(requests);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[1].encrypted).toBeNull();
      expect(results[2].success).toBe(true);
    });
  });

  describe('Database Helpers', () => {
    test('should encrypt before write for contacts', () => {
      const contact = {
        phone_number: '+1234567890',
        whatsapp_id: 'whatsapp:+1234567890',
        name: 'Test Contact',
      };

      const encrypted = encryptBeforeWrite('contacts', contact);

      expect(encrypted.phone_number).not.toBe(contact.phone_number);
      expect(encrypted.whatsapp_id).not.toBe(contact.whatsapp_id);
      expect(encrypted.name).toBe(contact.name);
    });

    test('should decrypt after read for contacts', () => {
      const original = {
        phone_number: '+9876543210',
        whatsapp_id: 'whatsapp:+9876543210',
        name: 'Test Contact',
      };

      const encrypted = encryptBeforeWrite('contacts', original);
      const decrypted = decryptAfterRead('contacts', encrypted);

      expect(decrypted.phone_number).toBe(original.phone_number);
      expect(decrypted.whatsapp_id).toBe(original.whatsapp_id);
    });

    test('should encrypt multiple records', () => {
      const contacts = [
        { phone_number: '+1111111111', whatsapp_id: 'wa:1' },
        { phone_number: '+2222222222', whatsapp_id: 'wa:2' },
      ];

      const encrypted = encryptRecords('contacts', contacts);

      expect(encrypted).toHaveLength(2);
      encrypted.forEach((record, index) => {
        expect(record.phone_number).not.toBe(contacts[index].phone_number);
        expect(record.whatsapp_id).not.toBe(contacts[index].whatsapp_id);
      });
    });

    test('should decrypt multiple records', () => {
      const contacts = [
        { phone_number: '+1111111111', whatsapp_id: 'wa:1' },
        { phone_number: '+2222222222', whatsapp_id: 'wa:2' },
      ];

      const encrypted = encryptRecords('contacts', contacts);
      const decrypted = decryptRecords('contacts', encrypted);

      expect(decrypted).toHaveLength(2);
      decrypted.forEach((record, index) => {
        expect(record.phone_number).toBe(contacts[index].phone_number);
        expect(record.whatsapp_id).toBe(contacts[index].whatsapp_id);
      });
    });
  });

  describe('Convenience Functions', () => {
    test('should use encryptContact convenience function', () => {
      const contact = {
        phone_number: '+1234567890',
        whatsapp_id: 'wa:123',
      };

      const encrypted = encryptContact(contact);

      expect(encrypted.phone_number).not.toBe(contact.phone_number);
      expect(encrypted.whatsapp_id).not.toBe(contact.whatsapp_id);
    });

    test('should use decryptContact convenience function', () => {
      const original = {
        phone_number: '+9876543210',
        whatsapp_id: 'wa:987',
      };

      const encrypted = encryptContact(original);
      const decrypted = decryptContact(encrypted);

      expect(decrypted.phone_number).toBe(original.phone_number);
      expect(decrypted.whatsapp_id).toBe(original.whatsapp_id);
    });

    test('should use encryptProfile convenience function', () => {
      const profile = {
        email: 'user@example.com',
      };

      const encrypted = encryptProfile(profile);

      expect(encrypted.email).not.toBe(profile.email);
    });

    test('should use decryptProfile convenience function', () => {
      const original = {
        email: 'admin@example.com',
      };

      const encrypted = encryptProfile(original);
      const decrypted = decryptProfile(encrypted);

      expect(decrypted.email).toBe(original.email);
    });
  });

  describe('Audit and Statistics', () => {
    test('should track encryption statistics', () => {
      const testEncryptor = new FieldEncryptor({ enableAuditLogging: true });
      testEncryptor.clearAuditLogs();

      // Perform various operations
      testEncryptor.encryptField('value1', 'field1');
      testEncryptor.encryptField('value2', 'field2');
      testEncryptor.decryptField('encrypted', 'field3');

      const stats = testEncryptor.getStatistics();

      expect(stats.totalOperations).toBeGreaterThan(0);
      expect(stats.successfulOperations).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThan(0);
      expect(stats.operationsByType).toBeDefined();
    });

    test('should filter audit logs', () => {
      const testEncryptor = new FieldEncryptor({ enableAuditLogging: true });
      testEncryptor.clearAuditLogs();

      testEncryptor.encryptField('value1', 'phone');
      testEncryptor.encryptField('value2', 'email');
      testEncryptor.decryptField('encrypted', 'phone');

      const phoneLogs = testEncryptor.getFilteredAuditLogs({
        field: 'phone',
      });

      const emailLogs = testEncryptor.getFilteredAuditLogs({
        field: 'email',
      });

      expect(phoneLogs.length).toBeGreaterThan(0);
      expect(emailLogs.length).toBeGreaterThan(0);
      phoneLogs.forEach(log => expect(log.field).toBe('phone'));
      emailLogs.forEach(log => expect(log.field).toBe('email'));
    });

    test('should export audit logs as JSON', () => {
      const testEncryptor = new FieldEncryptor({ enableAuditLogging: true });
      testEncryptor.clearAuditLogs();

      testEncryptor.encryptField('value', 'field');

      const exported = testEncryptor.exportAuditLogs();

      expect(typeof exported).toBe('string');
      expect(() => JSON.parse(exported)).not.toThrow();

      const parsed = JSON.parse(exported);
      expect(Array.isArray(parsed)).toBe(true);
    });
  });

  describe('System Verification', () => {
    test('should verify encryption system is healthy', () => {
      const verification = FieldEncryptor.verifyEncryption();

      expect(verification.healthy).toBe(true);
      expect(verification.status.keyLoaded).toBe(true);
      expect(verification.status.testPassed).toBe(true);
      expect(verification.message).toContain('operational');
    });

    test('should verify database encryption configuration', () => {
      const verification = verifyDatabaseEncryption();

      expect(verification.configured).toBe(true);
      expect(verification.tablesConfigured).toContain('contacts');
      expect(verification.tablesConfigured).toContain('profiles');
      expect(verification.fieldsConfigured.contacts).toContain('phone_number');
      expect(verification.fieldsConfigured.contacts).toContain('whatsapp_id');
      expect(verification.fieldsConfigured.profiles).toContain('email');
    });

    test('should get encrypted fields for table', () => {
      const contactFields = encryptor.getEncryptedFieldsForTable('contacts');
      const profileFields = encryptor.getEncryptedFieldsForTable('profiles');

      expect(contactFields).toContain('phone_number');
      expect(contactFields).toContain('whatsapp_id');
      expect(profileFields).toContain('email');
    });

    test('should check if field should be encrypted', () => {
      expect(encryptor.shouldEncryptField('contacts', 'phone_number')).toBe(true);
      expect(encryptor.shouldEncryptField('contacts', 'whatsapp_id')).toBe(true);
      expect(encryptor.shouldEncryptField('contacts', 'name')).toBe(false);
      expect(encryptor.shouldEncryptField('profiles', 'email')).toBe(true);
      expect(encryptor.shouldEncryptField('profiles', 'full_name')).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    test('should handle encryption errors gracefully', () => {
      const testEncryptor = new FieldEncryptor({ enableAuditLogging: true });
      testEncryptor.clearAuditLogs();

      // Try to encrypt with invalid configuration (simulate error)
      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      expect(() => {
        testEncryptor.encryptField('value', 'field');
      }).toThrow();

      process.env.ENCRYPTION_KEY = originalKey;
    });

    test('should handle decryption errors gracefully', () => {
      const testEncryptor = new FieldEncryptor({ enableAuditLogging: true });

      expect(() => {
        testEncryptor.decryptField('invalid-encrypted-data', 'field');
      }).toThrow();
    });

    test('should log failed operations', () => {
      const testEncryptor = new FieldEncryptor({ enableAuditLogging: true });
      testEncryptor.clearAuditLogs();

      const originalKey = process.env.ENCRYPTION_KEY;
      delete process.env.ENCRYPTION_KEY;

      try {
        testEncryptor.encryptField('value', 'field');
      } catch (error) {
        // Expected to throw
      }

      process.env.ENCRYPTION_KEY = originalKey;

      const logs = testEncryptor.getAuditLogs();
      const failedLogs = logs.filter(log => !log.success);

      expect(failedLogs.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Workflow', () => {
    test('should complete full contact encryption workflow', () => {
      // Step 1: Create plaintext contact
      const contact = {
        id: 'e2e-001',
        organization_id: 'org-123',
        phone_number: '+1234567890',
        whatsapp_id: 'whatsapp:+1234567890',
        name: 'End to End Test',
        created_at: new Date().toISOString(),
      };

      // Step 2: Encrypt before database insert
      const encrypted = encryptBeforeWrite('contacts', contact);
      expect(encrypted.phone_number).not.toBe(contact.phone_number);
      expect(encrypted.whatsapp_id).not.toBe(contact.whatsapp_id);

      // Step 3: Simulate database storage (encrypted data)
      // In real scenario, this would be stored in Supabase

      // Step 4: Decrypt after database read
      const decrypted = decryptAfterRead('contacts', encrypted);
      expect(decrypted.phone_number).toBe(contact.phone_number);
      expect(decrypted.whatsapp_id).toBe(contact.whatsapp_id);
      expect(decrypted.name).toBe(contact.name);
    });

    test('should complete full profile encryption workflow', () => {
      // Step 1: Create plaintext profile
      const profile = {
        id: 'e2e-002',
        organization_id: 'org-123',
        email: 'e2e@example.com',
        full_name: 'E2E Test User',
        role: 'agent' as const,
      };

      // Step 2: Encrypt before database insert
      const encrypted = encryptBeforeWrite('profiles', profile);
      expect(encrypted.email).not.toBe(profile.email);
      expect(encrypted.full_name).toBe(profile.full_name);

      // Step 3: Decrypt after database read
      const decrypted = decryptAfterRead('profiles', encrypted);
      expect(decrypted.email).toBe(profile.email);
      expect(decrypted.full_name).toBe(profile.full_name);
    });
  });
});
