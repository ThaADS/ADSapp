/**
 * User Test Fixtures
 *
 * Sample user data for testing including different roles and permissions.
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import type { Profile } from '@/types/database'

// =============================================================================
// Owner Users
// =============================================================================

export const ownerUser: Profile = {
  id: 'user-owner-001',
  organization_id: 'org-test-001',
  email: 'owner@test.com',
  full_name: 'Test Owner',
  role: 'owner',
  permissions: {
    can_manage_contacts: true,
    can_send_messages: true,
    can_view_analytics: true,
    can_manage_team: true,
    can_manage_billing: true,
    can_manage_organization: true,
  },
  avatar_url: 'https://test.com/avatars/owner.jpg',
  phone_number: '+15551234567',
  timezone: 'America/New_York',
  language: 'en',
  notification_preferences: {
    email: true,
    push: true,
    sms: true,
  },
  last_seen: '2024-10-13T12:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-10-13T12:00:00Z',
}

// =============================================================================
// Admin Users
// =============================================================================

export const adminUser: Profile = {
  id: 'user-admin-001',
  organization_id: 'org-test-001',
  email: 'admin@test.com',
  full_name: 'Test Admin',
  role: 'admin',
  permissions: {
    can_manage_contacts: true,
    can_send_messages: true,
    can_view_analytics: true,
    can_manage_team: true,
    can_manage_billing: false,
    can_manage_organization: false,
  },
  avatar_url: 'https://test.com/avatars/admin.jpg',
  phone_number: '+15551234568',
  timezone: 'America/Los_Angeles',
  language: 'en',
  notification_preferences: {
    email: true,
    push: true,
    sms: false,
  },
  last_seen: '2024-10-13T11:30:00Z',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-10-13T11:30:00Z',
}

// =============================================================================
// Agent Users
// =============================================================================

export const agentUser: Profile = {
  id: 'user-agent-001',
  organization_id: 'org-test-001',
  email: 'agent@test.com',
  full_name: 'Test Agent',
  role: 'agent',
  permissions: {
    can_manage_contacts: true,
    can_send_messages: true,
    can_view_analytics: false,
    can_manage_team: false,
    can_manage_billing: false,
    can_manage_organization: false,
  },
  avatar_url: null,
  phone_number: null,
  timezone: 'UTC',
  language: 'en',
  notification_preferences: {
    email: true,
    push: true,
    sms: false,
  },
  last_seen: '2024-10-13T10:00:00Z',
  created_at: '2024-02-01T00:00:00Z',
  updated_at: '2024-10-13T10:00:00Z',
}

export const agentUser2: Profile = {
  id: 'user-agent-002',
  organization_id: 'org-test-001',
  email: 'agent2@test.com',
  full_name: 'Test Agent 2',
  role: 'agent',
  permissions: {
    can_manage_contacts: false,
    can_send_messages: true,
    can_view_analytics: false,
    can_manage_team: false,
    can_manage_billing: false,
    can_manage_organization: false,
  },
  avatar_url: null,
  phone_number: '+15551234569',
  timezone: 'Europe/London',
  language: 'en',
  notification_preferences: {
    email: true,
    push: false,
    sms: false,
  },
  last_seen: '2024-10-13T09:00:00Z',
  created_at: '2024-03-01T00:00:00Z',
  updated_at: '2024-10-13T09:00:00Z',
}

// =============================================================================
// Super Admin User
// =============================================================================

export const superAdminUser: Profile = {
  id: 'user-superadmin-001',
  organization_id: 'org-adsapp-platform',
  email: 'superadmin@adsapp.com',
  full_name: 'Super Admin',
  role: 'super_admin',
  permissions: {
    can_manage_contacts: true,
    can_send_messages: true,
    can_view_analytics: true,
    can_manage_team: true,
    can_manage_billing: true,
    can_manage_organization: true,
    can_manage_all_organizations: true,
    can_access_system_settings: true,
  },
  avatar_url: null,
  phone_number: null,
  timezone: 'UTC',
  language: 'en',
  notification_preferences: {
    email: true,
    push: true,
    sms: true,
  },
  last_seen: '2024-10-13T12:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-10-13T12:00:00Z',
}

// =============================================================================
// Users from Different Organizations
// =============================================================================

export const userFromOtherOrg: Profile = {
  id: 'user-other-001',
  organization_id: 'org-test-002',
  email: 'user@other-org.com',
  full_name: 'Other Organization User',
  role: 'admin',
  permissions: {
    can_manage_contacts: true,
    can_send_messages: true,
    can_view_analytics: true,
    can_manage_team: true,
    can_manage_billing: false,
    can_manage_organization: false,
  },
  avatar_url: null,
  phone_number: null,
  timezone: 'UTC',
  language: 'en',
  notification_preferences: {
    email: true,
    push: true,
    sms: false,
  },
  last_seen: '2024-10-13T11:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-10-13T11:00:00Z',
}

// =============================================================================
// Inactive/Suspended Users
// =============================================================================

export const suspendedUser: Profile = {
  id: 'user-suspended-001',
  organization_id: 'org-test-001',
  email: 'suspended@test.com',
  full_name: 'Suspended User',
  role: 'agent',
  permissions: {
    can_manage_contacts: false,
    can_send_messages: false,
    can_view_analytics: false,
    can_manage_team: false,
    can_manage_billing: false,
    can_manage_organization: false,
  },
  avatar_url: null,
  phone_number: null,
  timezone: 'UTC',
  language: 'en',
  notification_preferences: {
    email: false,
    push: false,
    sms: false,
  },
  last_seen: '2024-09-01T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-09-01T00:00:00Z',
}

// =============================================================================
// Users with Different Languages
// =============================================================================

export const spanishUser: Profile = {
  id: 'user-spanish-001',
  organization_id: 'org-test-001',
  email: 'spanish@test.com',
  full_name: 'Usuario Español',
  role: 'agent',
  permissions: {
    can_manage_contacts: true,
    can_send_messages: true,
    can_view_analytics: false,
    can_manage_team: false,
    can_manage_billing: false,
    can_manage_organization: false,
  },
  avatar_url: null,
  phone_number: null,
  timezone: 'Europe/Madrid',
  language: 'es',
  notification_preferences: {
    email: true,
    push: true,
    sms: false,
  },
  last_seen: '2024-10-13T10:00:00Z',
  created_at: '2024-02-01T00:00:00Z',
  updated_at: '2024-10-13T10:00:00Z',
}

// =============================================================================
// Collections for Testing
// =============================================================================

export const allUsers: Profile[] = [
  ownerUser,
  adminUser,
  agentUser,
  agentUser2,
  superAdminUser,
  userFromOtherOrg,
  suspendedUser,
  spanishUser,
]

export const activeUsers: Profile[] = [
  ownerUser,
  adminUser,
  agentUser,
  agentUser2,
  spanishUser,
]

export const orgTestUsers: Profile[] = [
  ownerUser,
  adminUser,
  agentUser,
  agentUser2,
  suspendedUser,
  spanishUser,
]

export const adminUsers: Profile[] = [ownerUser, adminUser]

export const agentUsers: Profile[] = [agentUser, agentUser2, spanishUser]

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets user by ID
 */
export function getUserById(id: string): Profile | undefined {
  return allUsers.find((user) => user.id === id)
}

/**
 * Gets users by role
 */
export function getUsersByRole(role: string): Profile[] {
  return allUsers.filter((user) => user.role === role)
}

/**
 * Gets users by organization
 */
export function getUsersByOrganization(organizationId: string): Profile[] {
  return allUsers.filter((user) => user.organization_id === organizationId)
}

/**
 * Checks if user has permission
 */
export function hasPermission(user: Profile, permission: string): boolean {
  return user.permissions[permission as keyof typeof user.permissions] === true
}
