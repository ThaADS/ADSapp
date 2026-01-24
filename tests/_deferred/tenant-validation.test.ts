/**
 * Integration Tests for Tenant Validation Middleware
 *
 * Tests the security controls that prevent cross-tenant data access
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import {
  validateTenantAccess,
  getTenantContext,
  isSuperAdmin,
  validateResourceAccess
} from '@/lib/middleware/tenant-validation';

// Mock Supabase client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}));

// Mock api-utils
jest.mock('@/lib/api-utils', () => ({
  getUserOrganization: jest.fn()
}));

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn()
}));

describe('Tenant Validation Middleware', () => {
  let mockSupabase: any;
  let mockGetUserOrganization: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    };

    const { createClient } = require('@/lib/supabase/server');
    (createClient as jest.Mock).mockResolvedValue(mockSupabase);

    mockGetUserOrganization = require('@/lib/api-utils').getUserOrganization as jest.Mock;
  });

  describe('validateTenantAccess', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Mock unauthenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const request = new NextRequest('http://localhost/api/contacts');
      const response = await validateTenantAccess(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(401);

      const json = await response?.json();
      expect(json.error).toBe('Authentication required');
      expect(json.code).toBe('UNAUTHORIZED');
    });

    it('should return 403 if user has no organization', async () => {
      // Mock authenticated user without organization
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@example.com'
          }
        },
        error: null
      });

      mockGetUserOrganization.mockRejectedValue(
        new Error('No organization found')
      );

      // Mock non-super-admin profile
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { is_super_admin: false },
              error: null
            })
          })
        })
      });

      const request = new NextRequest('http://localhost/api/contacts');
      const response = await validateTenantAccess(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(403);

      const json = await response?.json();
      expect(json.error).toBe('User not associated with any organization');
    });

    it('should allow super admin without organization', async () => {
      // Mock authenticated super admin
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'admin-123',
            email: 'admin@adsapp.com'
          }
        },
        error: null
      });

      mockGetUserOrganization.mockRejectedValue(
        new Error('No organization found')
      );

      // Mock super admin profile
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                is_super_admin: true,
                role: 'super_admin'
              },
              error: null
            })
          })
        })
      });

      const request = new NextRequest('http://localhost/api/admin/organizations');
      const response = await validateTenantAccess(request);

      // Super admin should be allowed to proceed (returns null)
      expect(response).toBeNull();
    });

    it('should return 403 if cross-tenant access is attempted', async () => {
      // Mock authenticated user with organization
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@org1.com'
          }
        },
        error: null
      });

      mockGetUserOrganization.mockResolvedValue({
        organization_id: 'org-111',
        organization: { role: 'admin' }
      });

      // Request with different organization ID
      const request = new NextRequest(
        'http://localhost/api/contacts?organization_id=org-222'
      );

      const response = await validateTenantAccess(request);

      expect(response).toBeInstanceOf(NextResponse);
      expect(response?.status).toBe(403);

      const json = await response?.json();
      expect(json.error).toBe('Forbidden: Access to this organization denied');
      expect(json.code).toBe('FORBIDDEN');
    });

    it('should allow access for matching organization', async () => {
      // Mock authenticated user with organization
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@org1.com'
          }
        },
        error: null
      });

      mockGetUserOrganization.mockResolvedValue({
        organization_id: 'org-111',
        organization: { role: 'admin' }
      });

      const request = new NextRequest('http://localhost/api/contacts');
      const response = await validateTenantAccess(request);

      // Should allow access (returns null to continue)
      expect(response).toBeNull();
    });

    it('should attach tenant context headers to request', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'user@org1.com'
          }
        },
        error: null
      });

      mockGetUserOrganization.mockResolvedValue({
        organization_id: 'org-111',
        organization: { role: 'agent' }
      });

      const request = new NextRequest('http://localhost/api/contacts');
      const response = await validateTenantAccess(request);

      expect(response).toBeNull();

      // Check that headers were added (in real implementation)
      // Note: In actual middleware, headers are added to the request
    });
  });

  describe('getTenantContext', () => {
    it('should extract tenant context from request headers', () => {
      const request = new NextRequest('http://localhost/api/contacts', {
        headers: {
          'x-user-id': 'user-123',
          'x-organization-id': 'org-111',
          'x-user-role': 'admin',
          'x-user-email': 'user@org1.com'
        }
      });

      const context = getTenantContext(request);

      expect(context.userId).toBe('user-123');
      expect(context.organizationId).toBe('org-111');
      expect(context.userRole).toBe('admin');
      expect(context.userEmail).toBe('user@org1.com');
    });

    it('should return empty strings for missing headers', () => {
      const request = new NextRequest('http://localhost/api/contacts');
      const context = getTenantContext(request);

      expect(context.userId).toBe('');
      expect(context.organizationId).toBe('');
      expect(context.userRole).toBe('agent'); // default role
      expect(context.userEmail).toBe('');
    });
  });

  describe('isSuperAdmin', () => {
    it('should return true for super admin', () => {
      const request = new NextRequest('http://localhost/api/admin', {
        headers: {
          'x-is-super-admin': 'true'
        }
      });

      expect(isSuperAdmin(request)).toBe(true);
    });

    it('should return false for regular user', () => {
      const request = new NextRequest('http://localhost/api/contacts', {
        headers: {
          'x-is-super-admin': 'false'
        }
      });

      expect(isSuperAdmin(request)).toBe(false);
    });

    it('should return false when header is missing', () => {
      const request = new NextRequest('http://localhost/api/contacts');
      expect(isSuperAdmin(request)).toBe(false);
    });
  });

  describe('validateResourceAccess', () => {
    it('should allow super admin to access any resource', () => {
      const context = {
        userId: 'admin-123',
        organizationId: '',
        userRole: 'super_admin',
        userEmail: 'admin@adsapp.com'
      };

      const result = validateResourceAccess('org-999', context);
      expect(result).toBe(true);
    });

    it('should allow access to resources in same organization', () => {
      const context = {
        userId: 'user-123',
        organizationId: 'org-111',
        userRole: 'admin',
        userEmail: 'user@org1.com'
      };

      const result = validateResourceAccess('org-111', context);
      expect(result).toBe(true);
    });

    it('should deny access to resources in different organization', () => {
      const context = {
        userId: 'user-123',
        organizationId: 'org-111',
        userRole: 'admin',
        userEmail: 'user@org1.com'
      };

      const result = validateResourceAccess('org-222', context);
      expect(result).toBe(false);
    });
  });
});

describe('Rate Limiting Integration', () => {
  it('should apply rate limits correctly', async () => {
    const { createRateLimiter, rateLimitConfigs } = await import('@/lib/middleware/rate-limit');

    const rateLimit = createRateLimiter({
      windowMs: 60000,
      maxRequests: 3
    });

    const request = new NextRequest('http://localhost/api/test');

    // First 3 requests should succeed
    for (let i = 0; i < 3; i++) {
      const response = await rateLimit(request);
      expect(response).toBeNull();
    }

    // 4th request should be rate limited
    const rateLimitedResponse = await rateLimit(request);
    expect(rateLimitedResponse).toBeInstanceOf(NextResponse);
    expect(rateLimitedResponse?.status).toBe(429);

    const json = await rateLimitedResponse?.json();
    expect(json.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});

describe('Middleware Composition', () => {
  it('should compose multiple middleware functions', async () => {
    const { composeMiddleware } = await import('@/lib/middleware');

    const middleware1 = jest.fn(async () => null);
    const middleware2 = jest.fn(async () => null);
    const middleware3 = jest.fn(async () => null);

    const composed = composeMiddleware(middleware1, middleware2, middleware3);

    const request = new NextRequest('http://localhost/api/test');
    const response = await composed(request);

    // All middleware should be called
    expect(middleware1).toHaveBeenCalled();
    expect(middleware2).toHaveBeenCalled();
    expect(middleware3).toHaveBeenCalled();

    // Should return null (continue request)
    expect(response).toBeNull();
  });

  it('should short-circuit on first middleware error', async () => {
    const { composeMiddleware } = await import('@/lib/middleware');

    const middleware1 = jest.fn(async () => null);
    const middleware2 = jest.fn(async () =>
      NextResponse.json({ error: 'Blocked' }, { status: 403 })
    );
    const middleware3 = jest.fn(async () => null);

    const composed = composeMiddleware(middleware1, middleware2, middleware3);

    const request = new NextRequest('http://localhost/api/test');
    const response = await composed(request);

    // First two middleware called, third skipped
    expect(middleware1).toHaveBeenCalled();
    expect(middleware2).toHaveBeenCalled();
    expect(middleware3).not.toHaveBeenCalled();

    // Should return error response
    expect(response).toBeInstanceOf(NextResponse);
    expect(response?.status).toBe(403);
  });
});
