/**
 * MFA Service Unit Tests
 *
 * Tests MFA functionality including:
 * - Secret generation and QR code creation
 * - TOTP token verification
 * - Backup code generation and validation
 * - MFA enablement and disablement
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import {
  generateMFAEnrollment,
  verifyAndEnableMFA,
  verifyMFAToken,
  disableMFA,
  getMFAStatus,
  regenerateBackupCodes,
  isMFARequired,
  isValidMFATokenFormat,
} from '@/lib/auth/mfa';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signInWithPassword: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      update: jest.fn(() => ({
        eq: jest.fn(),
      })),
      insert: jest.fn(),
    })),
  })),
}));

// Mock otplib
jest.mock('otplib', () => ({
  authenticator: {
    options: {},
    generateSecret: jest.fn(() => 'TESTSECRETKEY123456'),
    keyuri: jest.fn((email, app, secret) => `otpauth://totp/${app}:${email}?secret=${secret}`),
    verify: jest.fn(() => true),
  },
}));

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mockQRCode')),
}));

describe('MFA Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMFAEnrollment', () => {
    it('should generate MFA enrollment data with QR code and backup codes', async () => {
      const mockUserId = 'user-123';
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = await createClient();

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { email: 'test@example.com', full_name: 'Test User' },
              error: null,
            })),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({ error: null })),
        })),
      });

      const result = await generateMFAEnrollment(mockUserId);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('backupCodes');
      expect(result.secret).toBe('TESTSECRETKEY123456');
      expect(result.qrCode).toBe('data:image/png;base64,mockQRCode');
      expect(result.backupCodes).toHaveLength(10);
      expect(result.backupCodes[0]).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    });

    it('should throw error if user profile not found', async () => {
      const mockUserId = 'invalid-user';
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = await createClient();

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: null,
              error: new Error('User not found'),
            })),
          })),
        })),
      });

      await expect(generateMFAEnrollment(mockUserId)).rejects.toThrow('User profile not found');
    });
  });

  describe('verifyAndEnableMFA', () => {
    it('should verify valid TOTP token and enable MFA', async () => {
      const mockUserId = 'user-123';
      const mockToken = '123456';
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = await createClient();

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { mfa_secret: 'TESTSECRET', mfa_enabled: false },
              error: null,
            })),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({ error: null })),
        })),
      });

      const result = await verifyAndEnableMFA(mockUserId, mockToken);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid TOTP token', async () => {
      const mockUserId = 'user-123';
      const mockToken = '000000';
      const { authenticator } = await import('otplib');

      (authenticator.verify as jest.Mock).mockReturnValueOnce(false);

      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = await createClient();

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { mfa_secret: 'TESTSECRET', mfa_enabled: false },
              error: null,
            })),
          })),
        })),
      });

      const result = await verifyAndEnableMFA(mockUserId, mockToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid verification code');
    });

    it('should reject if MFA not enrolled', async () => {
      const mockUserId = 'user-123';
      const mockToken = '123456';
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = await createClient();

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { mfa_secret: null, mfa_enabled: false },
              error: null,
            })),
          })),
        })),
      });

      const result = await verifyAndEnableMFA(mockUserId, mockToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('MFA not enrolled. Start enrollment first.');
    });
  });

  describe('isValidMFATokenFormat', () => {
    it('should validate 6-digit TOTP codes', () => {
      expect(isValidMFATokenFormat('123456')).toBe(true);
      expect(isValidMFATokenFormat('000000')).toBe(true);
      expect(isValidMFATokenFormat('999999')).toBe(true);
    });

    it('should validate backup code format', () => {
      expect(isValidMFATokenFormat('ABCD-1234')).toBe(true);
      expect(isValidMFATokenFormat('XY89-PQRS')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidMFATokenFormat('12345')).toBe(false); // Too short
      expect(isValidMFATokenFormat('1234567')).toBe(false); // Too long
      expect(isValidMFATokenFormat('abcdef')).toBe(false); // Letters in TOTP
      expect(isValidMFATokenFormat('ABCD-123')).toBe(false); // Invalid backup code
      expect(isValidMFATokenFormat('')).toBe(false); // Empty
    });
  });

  describe('getMFAStatus', () => {
    it('should return MFA status for user', async () => {
      const mockUserId = 'user-123';
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = await createClient();

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                mfa_enabled: true,
                mfa_enrolled_at: '2025-01-15T10:00:00Z',
                mfa_backup_codes: ['hash1', 'hash2', 'hash3'],
              },
              error: null,
            })),
          })),
        })),
      });

      const status = await getMFAStatus(mockUserId);

      expect(status.enabled).toBe(true);
      expect(status.enrolledAt).toBe('2025-01-15T10:00:00Z');
      expect(status.backupCodesRemaining).toBe(3);
    });

    it('should return disabled status for user without MFA', async () => {
      const mockUserId = 'user-123';
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = await createClient();

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                mfa_enabled: false,
                mfa_enrolled_at: null,
                mfa_backup_codes: null,
              },
              error: null,
            })),
          })),
        })),
      });

      const status = await getMFAStatus(mockUserId);

      expect(status.enabled).toBe(false);
      expect(status.enrolledAt).toBeNull();
      expect(status.backupCodesRemaining).toBe(0);
    });
  });

  describe('isMFARequired', () => {
    it('should return true if MFA is enabled', async () => {
      const mockUserId = 'user-123';
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = await createClient();

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { mfa_enabled: true },
              error: null,
            })),
          })),
        })),
      });

      const required = await isMFARequired(mockUserId);

      expect(required).toBe(true);
    });

    it('should return false if MFA is not enabled', async () => {
      const mockUserId = 'user-123';
      const { createClient } = await import('@/lib/supabase/server');
      const mockSupabase = await createClient();

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: { mfa_enabled: false },
              error: null,
            })),
          })),
        })),
      });

      const required = await isMFARequired(mockUserId);

      expect(required).toBe(false);
    });
  });
});
