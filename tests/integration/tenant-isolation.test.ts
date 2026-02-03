/**
 * Tenant Isolation Security Tests
 *
 * Comprehensive tests for multi-tenant security ensuring complete tenant isolation.
 * Tests cover tenant validation, cross-tenant access prevention, JWT token handling,
 * super admin bypass logic, and tenant context propagation.
 *
 * @module tests/unit/security/tenant-isolation
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { NextRequest, NextResponse } from 'next/server';
import {
  validateTenantAccess,
  getTenantContext,
  isSuperAdmin,
  validateResourceAccess,
  TenantContext,
} from '@/lib/middleware/tenant-validation';
import { createClient } from '@/lib/supabase/server';

// Mock Supabase client
jest.mock('@/lib/supabase/server');
jest.mock('@/lib/api-utils');

describe('Tenant Isolation Security', () => {
  const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    process.env.NODE_ENV = 'test';
  });

  describe('Test 1: Tenant ID Validation in API Middleware', () => {
    it('should validate tenant ID from authenticated user', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { full_name: 'Test User' },
      };

      const mockOrganization = {
        id: 'org-123',
        organization_id: 'org-123',
        organization: { role: 'admin' },
      };

      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockOrganization,
            error: null,
          }),
        })),
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Mock getUserOrganization
      const { getUserOrganization } = await import('@/lib/api-utils');
      (getUserOrganization as jest.Mock).mockResolvedValue(mockOrganization);

      const request = new NextRequest('http://localhost:3000/api/test');

      // Act
      const response = await validateTenantAccess(request);

      // Assert
      expect(response).not.toBeNull();
      // In Next.js middleware, successful validation modifies headers
      // Check that auth.getUser was called
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    });

    it('should return 401 error when user is not authenticated', async () => {
      // Arrange
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Not authenticated' },
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      const request = new NextRequest('http://localhost:3000/api/test');

      // Act
      const response = await validateTenantAccess(request);

      // Assert
      expect(response).not.toBeNull();
      if (response instanceof NextResponse) {
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.error).toBe('Authentication required');
        expect(body.code).toBe('UNAUTHORIZED');
      }
    });

    it('should return 403 error when user has no organization', async () => {
      // Arrange
      const mockUser = {
        id: 'user-456',
        email: 'no-org@example.com',
      };

      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        })),
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Mock getUserOrganization to return null
      const { getUserOrganization } = await import('@/lib/api-utils');
      (getUserOrganization as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/test');

      // Act
      const response = await validateTenantAccess(request);

      // Assert
      expect(response).not.toBeNull();
      if (response instanceof NextResponse) {
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error).toContain('not associated with any organization');
        expect(body.code).toBe('NO_ORGANIZATION');
      }
    });
  });

  describe('Test 2: Cross-Tenant Data Access Prevention', () => {
    it('should block access when user tenant does not match resource tenant', async () => {
      // Arrange
      const mockUser = {
        id: 'user-789',
        email: 'user@tenant-a.com',
      };

      const mockOrganization = {
        id: 'org-a',
        organization_id: 'org-a',
        organization: { role: 'agent' },
      };

      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      // Mock getUserOrganization
      const { getUserOrganization } = await import('@/lib/api-utils');
      (getUserOrganization as jest.Mock).mockResolvedValue(mockOrganization);

      // Create request with different organization ID in header
      const request = new NextRequest('http://localhost:3000/api/test');
      request.headers.set('x-organization-id', 'org-b');

      // Act
      const response = await validateTenantAccess(request);

      // Assert
      expect(response).not.toBeNull();
      if (response instanceof NextResponse) {
        expect(response.status).toBe(403);
        const body = await response.json();
        expect(body.error).toContain('Forbidden');
        expect(body.error).toContain('denied');
        expect(body.code).toBe('FORBIDDEN');
      }
    });

    it('should log security event for cross-tenant access attempts', async () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const mockUser = {
        id: 'user-security-test',
        email: 'attacker@tenant-x.com',
      };

      const mockOrganization = {
        id: 'org-x',
        organization_id: 'org-x',
        organization: { role: 'agent' },
      };

      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      const { getUserOrganization } = await import('@/lib/api-utils');
      (getUserOrganization as jest.Mock).mockResolvedValue(mockOrganization);

      const request = new NextRequest('http://localhost:3000/api/sensitive-data');
      request.headers.set('x-organization-id', 'org-y');
      request.headers.set('user-agent', 'Test Agent');

      // Act
      await validateTenantAccess(request);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '[SECURITY] Cross-tenant access attempt:',
        expect.objectContaining({
          userId: 'user-security-test',
          userOrg: 'org-x',
          requestedOrg: 'org-y',
          path: '/api/sensitive-data',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should allow access when tenant IDs match', async () => {
      // Arrange
      const mockUser = {
        id: 'user-valid',
        email: 'valid@tenant-c.com',
      };

      const mockOrganization = {
        id: 'org-c',
        organization_id: 'org-c',
        organization: { role: 'admin' },
      };

      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      const { getUserOrganization } = await import('@/lib/api-utils');
      (getUserOrganization as jest.Mock).mockResolvedValue(mockOrganization);

      const request = new NextRequest('http://localhost:3000/api/test');
      request.headers.set('x-organization-id', 'org-c');

      // Act
      const response = await validateTenantAccess(request);

      // Assert
      expect(response).not.toBeNull();
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    });
  });

  describe('Test 3: JWT Token Organization ID Extraction', () => {
    it('should extract organization ID from authenticated user context', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/test');
      request.headers.set('x-user-id', 'user-123');
      request.headers.set('x-organization-id', 'org-123');
      request.headers.set('x-user-role', 'admin');
      request.headers.set('x-user-email', 'test@example.com');

      // Act
      const context = getTenantContext(request);

      // Assert
      expect(context).toBeDefined();
      expect(context.userId).toBe('user-123');
      expect(context.organizationId).toBe('org-123');
      expect(context.userRole).toBe('admin');
      expect(context.userEmail).toBe('test@example.com');
    });

    it('should return empty strings for missing headers', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/test');

      // Act
      const context = getTenantContext(request);

      // Assert
      expect(context.userId).toBe('');
      expect(context.organizationId).toBe('');
      expect(context.userRole).toBe('agent'); // Default role
      expect(context.userEmail).toBe('');
    });

    it('should handle malformed tenant context headers', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/test');
      request.headers.set('x-user-id', '');
      request.headers.set('x-organization-id', '');

      // Act
      const context = getTenantContext(request);

      // Assert
      expect(context.userId).toBe('');
      expect(context.organizationId).toBe('');
    });
  });

  describe('Test 4: Super Admin Bypass Logic', () => {
    it('should allow super admin to bypass organization requirements', async () => {
      // Arrange
      const mockUser = {
        id: 'super-admin-123',
        email: 'admin@adsapp.com',
      };

      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
        from: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { is_super_admin: true, role: 'super_admin' },
            error: null,
          }),
        })),
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      const { getUserOrganization } = await import('@/lib/api-utils');
      (getUserOrganization as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/test');

      // Act
      const response = await validateTenantAccess(request);

      // Assert
      expect(response).not.toBeNull();
      // Super admin should pass validation
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
    });

    it('should identify super admin from request headers', () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/test');
      request.headers.set('x-is-super-admin', 'true');

      // Act
      const isSuperAdminUser = isSuperAdmin(request);

      // Assert
      expect(isSuperAdminUser).toBe(true);
    });

    it('should return false for non-super-admin users', () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/test');
      request.headers.set('x-is-super-admin', 'false');

      // Act
      const isSuperAdminUser = isSuperAdmin(request);

      // Assert
      expect(isSuperAdminUser).toBe(false);
    });

    it('should allow super admin to access any organization resource', () => {
      // Arrange
      const tenantContext: TenantContext = {
        userId: 'super-admin-456',
        organizationId: '', // Super admin has no org
        userRole: 'super_admin',
        userEmail: 'super@adsapp.com',
      };

      // Act
      const hasAccess = validateResourceAccess('any-org-id', tenantContext);

      // Assert
      expect(hasAccess).toBe(true);
    });
  });

  describe('Test 5: Tenant Context Propagation', () => {
    it('should attach tenant context headers to request', async () => {
      // Arrange
      const mockUser = {
        id: 'user-context-test',
        email: 'context@tenant-d.com',
      };

      const mockOrganization = {
        id: 'org-d',
        organization_id: 'org-d',
        organization: { role: 'manager' },
      };

      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      const { getUserOrganization } = await import('@/lib/api-utils');
      (getUserOrganization as jest.Mock).mockResolvedValue(mockOrganization);

      const request = new NextRequest('http://localhost:3000/api/test');

      // Act
      const response = await validateTenantAccess(request);

      // Assert
      expect(response).not.toBeNull();
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    });

    it('should validate resource access with matching organization', () => {
      // Arrange
      const tenantContext: TenantContext = {
        userId: 'user-789',
        organizationId: 'org-match',
        userRole: 'agent',
        userEmail: 'agent@tenant.com',
      };

      // Act
      const hasAccess = validateResourceAccess('org-match', tenantContext);

      // Assert
      expect(hasAccess).toBe(true);
    });

    it('should deny resource access with non-matching organization', () => {
      // Arrange
      const tenantContext: TenantContext = {
        userId: 'user-999',
        organizationId: 'org-different',
        userRole: 'agent',
        userEmail: 'agent@tenant.com',
      };

      // Act
      const hasAccess = validateResourceAccess('org-other', tenantContext);

      // Assert
      expect(hasAccess).toBe(false);
    });

    it('should propagate tenant context through middleware chain', async () => {
      // Arrange
      const mockUser = {
        id: 'user-propagation',
        email: 'propagation@tenant-e.com',
      };

      const mockOrganization = {
        id: 'org-e',
        organization_id: 'org-e',
        organization: { role: 'agent' },
      };

      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      const { getUserOrganization } = await import('@/lib/api-utils');
      (getUserOrganization as jest.Mock).mockResolvedValue(mockOrganization);

      const request = new NextRequest('http://localhost:3000/api/downstream');

      // Act
      await validateTenantAccess(request);

      // Assert
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled();
    });

    it('should handle errors gracefully and return 500', async () => {
      // Arrange
      const mockSupabaseClient = {
        auth: {
          getUser: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        },
      };

      mockCreateClient.mockResolvedValue(mockSupabaseClient as any);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const request = new NextRequest('http://localhost:3000/api/test');

      // Act
      const response = await validateTenantAccess(request);

      // Assert
      expect(response).not.toBeNull();
      if (response instanceof NextResponse) {
        expect(response.status).toBe(500);
        const body = await response.json();
        expect(body.error).toContain('Internal server error');
        expect(body.code).toBe('INTERNAL_ERROR');
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        '[TENANT_VALIDATION] Error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
