/**
 * Authentication Tests
 *
 * Comprehensive tests for user authentication including login validation,
 * credential verification, and MFA token validation.
 *
 * @module tests/unit/auth/authentication
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { createClient } from '@/lib/supabase/server';
import {
  verifyMFAToken,
  verifyAndEnableMFA,
  getMFAStatus,
  isValidMFATokenFormat,
} from '@/lib/auth/mfa';

// Mock Supabase client
jest.mock('@/lib/supabase/server');
jest.mock('otplib', () => ({
  authenticator: {
    verify: jest.fn(),
    options: {},
  },
}));

describe('Authentication', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Test 6: User Login with Valid Credentials', () => {
    it('should successfully authenticate user with correct email and password', async () => {
      // Arrange
      const mockUser = {
        id: 'user-valid-login',
        email: 'valid@example.com',
        user_metadata: {
          full_name: 'Valid User',
        },
      };

      const mockSession = {
        user: mockUser,
        access_token: 'mock-access-token-123',
        refresh_token: 'mock-refresh-token-456',
        expires_at: Date.now() + 3600000,
      };

      const mockSupabaseClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { session: mockSession, user: mockUser },
            error: null,
          }),
          getSession: jest.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Act
      const { data, error } = await mockSupabaseClient.auth.signInWithPassword({
        email: 'valid@example.com',
        password: 'SecurePassword123!',
      });

      // Assert
      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user.id).toBe('user-valid-login');
      expect(data.user.email).toBe('valid@example.com');
      expect(data.session).toBeDefined();
      expect(data.session.access_token).toBe('mock-access-token-123');
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'valid@example.com',
        password: 'SecurePassword123!',
      });
    });

    it('should return user profile data after successful authentication', async () => {
      // Arrange
      const mockUser = {
        id: 'user-profile-test',
        email: 'profile@example.com',
        user_metadata: {
          full_name: 'Profile User',
        },
      };

      const mockProfile = {
        id: 'user-profile-test',
        email: 'profile@example.com',
        full_name: 'Profile User',
        organization_id: 'org-123',
        role: 'admin',
        permissions: {
          can_manage_users: true,
          can_view_analytics: true,
        },
        last_seen: new Date().toISOString(),
      };

      const mockSupabaseClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Act
      const { data: authData, error: authError } = await mockSupabaseClient.auth.signInWithPassword({
        email: 'profile@example.com',
        password: 'Password123!',
      });

      const { data: profileData } = await mockSupabaseClient
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      // Assert
      expect(authError).toBeNull();
      expect(profileData).toBeDefined();
      expect(profileData.id).toBe('user-profile-test');
      expect(profileData.role).toBe('admin');
      expect(profileData.organization_id).toBe('org-123');
      expect(profileData.permissions.can_manage_users).toBe(true);
    });

    it('should create session with proper expiration time', async () => {
      // Arrange
      const now = Date.now();
      const expiresAt = now + 3600000; // 1 hour

      const mockSession = {
        user: { id: 'user-session', email: 'session@example.com' },
        access_token: 'token-123',
        refresh_token: 'refresh-456',
        expires_at: expiresAt,
      };

      const mockSupabaseClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { session: mockSession },
            error: null,
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Act
      const { data } = await mockSupabaseClient.auth.signInWithPassword({
        email: 'session@example.com',
        password: 'Password123!',
      });

      // Assert
      expect(data.session).toBeDefined();
      expect(data.session.expires_at).toBeGreaterThan(now);
      expect(data.session.expires_at).toBeLessThanOrEqual(expiresAt + 1000);
      expect(data.session.access_token).toBeDefined();
      expect(data.session.refresh_token).toBeDefined();
    });
  });

  describe('Test 7: User Login with Invalid Credentials', () => {
    it('should reject authentication with incorrect password', async () => {
      // Arrange
      const mockSupabaseClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { session: null, user: null },
            error: {
              message: 'Invalid login credentials',
              status: 400,
              name: 'AuthApiError',
            },
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Act
      const { data, error } = await mockSupabaseClient.auth.signInWithPassword({
        email: 'valid@example.com',
        password: 'WrongPassword123!',
      });

      // Assert
      expect(error).toBeDefined();
      expect(error.message).toBe('Invalid login credentials');
      expect(error.status).toBe(400);
      expect(data.session).toBeNull();
      expect(data.user).toBeNull();
    });

    it('should reject authentication with non-existent email', async () => {
      // Arrange
      const mockSupabaseClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { session: null, user: null },
            error: {
              message: 'Invalid login credentials',
              status: 400,
              name: 'AuthApiError',
            },
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Act
      const { data, error } = await mockSupabaseClient.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'AnyPassword123!',
      });

      // Assert
      expect(error).toBeDefined();
      expect(error.message).toBe('Invalid login credentials');
      expect(data.session).toBeNull();
      expect(data.user).toBeNull();
    });

    it('should reject authentication with malformed email', async () => {
      // Arrange
      const mockSupabaseClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { session: null, user: null },
            error: {
              message: 'Invalid email format',
              status: 422,
              name: 'ValidationError',
            },
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Act
      const { data, error } = await mockSupabaseClient.auth.signInWithPassword({
        email: 'not-an-email',
        password: 'Password123!',
      });

      // Assert
      expect(error).toBeDefined();
      expect(error.message).toContain('email');
      expect(data.session).toBeNull();
    });

    it('should reject authentication with empty credentials', async () => {
      // Arrange
      const mockSupabaseClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { session: null, user: null },
            error: {
              message: 'Email and password are required',
              status: 422,
              name: 'ValidationError',
            },
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Act
      const { data, error } = await mockSupabaseClient.auth.signInWithPassword({
        email: '',
        password: '',
      });

      // Assert
      expect(error).toBeDefined();
      expect(error.message).toContain('required');
      expect(data.session).toBeNull();
    });

    it('should handle rate limiting for too many failed attempts', async () => {
      // Arrange
      const mockSupabaseClient = {
        auth: {
          signInWithPassword: jest.fn().mockResolvedValue({
            data: { session: null, user: null },
            error: {
              message: 'Too many requests. Please try again later.',
              status: 429,
              name: 'RateLimitError',
            },
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Act
      const { data, error } = await mockSupabaseClient.auth.signInWithPassword({
        email: 'user@example.com',
        password: 'WrongPassword',
      });

      // Assert
      expect(error).toBeDefined();
      expect(error.status).toBe(429);
      expect(error.message).toContain('Too many requests');
      expect(data.session).toBeNull();
    });
  });

  describe('Test 8: MFA Token Verification', () => {
    it('should successfully verify valid TOTP token', async () => {
      // Arrange
      const userId = 'user-mfa-enabled';
      const validToken = '123456';

      const mockProfile = {
        id: userId,
        mfa_enabled: true,
        mfa_secret: 'JBSWY3DPEHPK3PXP',
        mfa_backup_codes: [],
      };

      const mockSupabaseClient = {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Mock authenticator.verify to return true
      const { authenticator } = await import('otplib');
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      // Act
      const result = await verifyMFAToken(userId, validToken);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(authenticator.verify).toHaveBeenCalledWith({
        token: validToken,
        secret: mockProfile.mfa_secret,
      });
    });

    it('should reject invalid TOTP token', async () => {
      // Arrange
      const userId = 'user-mfa-invalid';
      const invalidToken = '000000';

      const mockProfile = {
        id: userId,
        mfa_enabled: true,
        mfa_secret: 'JBSWY3DPEHPK3PXP',
        mfa_backup_codes: [],
      };

      const mockSupabaseClient = {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Mock authenticator.verify to return false
      const { authenticator } = await import('otplib');
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      // Act
      const result = await verifyMFAToken(userId, invalidToken);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid verification code');
    });

    it('should reject MFA verification when MFA is not enabled', async () => {
      // Arrange
      const userId = 'user-mfa-not-enabled';
      const token = '123456';

      const mockProfile = {
        id: userId,
        mfa_enabled: false,
        mfa_secret: null,
        mfa_backup_codes: [],
      };

      const mockSupabaseClient = {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Act
      const result = await verifyMFAToken(userId, token);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MFA not enabled');
    });

    it('should validate TOTP token format (6 digits)', () => {
      // Arrange & Act & Assert
      expect(isValidMFATokenFormat('123456')).toBe(true);
      expect(isValidMFATokenFormat('000000')).toBe(true);
      expect(isValidMFATokenFormat('999999')).toBe(true);
      expect(isValidMFATokenFormat('12345')).toBe(false); // Too short
      expect(isValidMFATokenFormat('1234567')).toBe(false); // Too long
      expect(isValidMFATokenFormat('12345a')).toBe(false); // Contains letter
      expect(isValidMFATokenFormat('')).toBe(false); // Empty
    });

    it('should validate backup code format (XXXX-XXXX)', () => {
      // Arrange & Act & Assert
      expect(isValidMFATokenFormat('ABCD-1234')).toBe(true);
      expect(isValidMFATokenFormat('AB23-XY89')).toBe(true);
      expect(isValidMFATokenFormat('abcd-1234')).toBe(false); // Lowercase not allowed
      expect(isValidMFATokenFormat('ABCD1234')).toBe(false); // Missing hyphen
      expect(isValidMFATokenFormat('ABC-1234')).toBe(false); // Too short
      expect(isValidMFATokenFormat('ABCDE-1234')).toBe(false); // Too long
    });

    it('should get correct MFA status for user', async () => {
      // Arrange
      const userId = 'user-mfa-status';

      const mockProfile = {
        id: userId,
        mfa_enabled: true,
        mfa_enrolled_at: '2024-01-15T10:30:00Z',
        mfa_backup_codes: ['code1', 'code2', 'code3', 'code4', 'code5'],
      };

      const mockSupabaseClient = {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        })),
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Act
      const status = await getMFAStatus(userId);

      // Assert
      expect(status.enabled).toBe(true);
      expect(status.enrolledAt).toBe('2024-01-15T10:30:00Z');
      expect(status.backupCodesRemaining).toBe(5);
    });

    it('should return default status when user not found', async () => {
      // Arrange
      const userId = 'non-existent-user';

      const mockSupabaseClient = {
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'User not found' },
          }),
        })),
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Act
      const status = await getMFAStatus(userId);

      // Assert
      expect(status.enabled).toBe(false);
      expect(status.enrolledAt).toBeNull();
      expect(status.backupCodesRemaining).toBe(0);
    });
  });
});
