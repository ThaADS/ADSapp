/**
 * Organization Test Fixtures
 *
 * Sample organization data for testing including different plans and statuses.
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import type { Organization } from '@/types/database'

// =============================================================================
// Active Organizations
// =============================================================================

export const testOrganization: Organization = {
  id: 'org-test-001',
  name: 'Test Organization',
  subdomain: 'test-org',
  settings: {
    business_hours: {
      enabled: true,
      timezone: 'America/New_York',
      schedule: {
        monday: { open: '09:00', close: '17:00', enabled: true },
        tuesday: { open: '09:00', close: '17:00', enabled: true },
        wednesday: { open: '09:00', close: '17:00', enabled: true },
        thursday: { open: '09:00', close: '17:00', enabled: true },
        friday: { open: '09:00', close: '17:00', enabled: true },
        saturday: { open: '10:00', close: '14:00', enabled: false },
        sunday: { open: '10:00', close: '14:00', enabled: false },
      },
    },
    whatsapp: {
      phone_number_id: 'test-phone-number-001',
      business_account_id: 'test-business-account-001',
      webhook_verify_token: 'test-verify-token',
    },
    branding: {
      logo_url: 'https://test.com/logos/org1.png',
      primary_color: '#3B82F6',
      secondary_color: '#10B981',
    },
    features: {
      automation: true,
      analytics: true,
      templates: true,
      bulk_messaging: true,
    },
  },
  subscription_plan: 'pro',
  subscription_status: 'active',
  stripe_customer_id: 'cus_test_001',
  stripe_subscription_id: 'sub_test_001',
  trial_ends_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-10-13T12:00:00Z',
}

export const enterpriseOrganization: Organization = {
  id: 'org-enterprise-001',
  name: 'Enterprise Organization',
  subdomain: 'enterprise-org',
  settings: {
    business_hours: {
      enabled: true,
      timezone: 'UTC',
      schedule: {
        monday: { open: '00:00', close: '23:59', enabled: true },
        tuesday: { open: '00:00', close: '23:59', enabled: true },
        wednesday: { open: '00:00', close: '23:59', enabled: true },
        thursday: { open: '00:00', close: '23:59', enabled: true },
        friday: { open: '00:00', close: '23:59', enabled: true },
        saturday: { open: '00:00', close: '23:59', enabled: true },
        sunday: { open: '00:00', close: '23:59', enabled: true },
      },
    },
    whatsapp: {
      phone_number_id: 'enterprise-phone-001',
      business_account_id: 'enterprise-business-001',
      webhook_verify_token: 'enterprise-verify-token',
    },
    branding: {
      logo_url: 'https://test.com/logos/enterprise.png',
      primary_color: '#6366F1',
      secondary_color: '#8B5CF6',
    },
    features: {
      automation: true,
      analytics: true,
      templates: true,
      bulk_messaging: true,
      api_access: true,
      custom_domain: true,
      sso: true,
      advanced_reporting: true,
    },
  },
  subscription_plan: 'enterprise',
  subscription_status: 'active',
  stripe_customer_id: 'cus_enterprise_001',
  stripe_subscription_id: 'sub_enterprise_001',
  trial_ends_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-10-13T12:00:00Z',
}

// =============================================================================
// Trial Organizations
// =============================================================================

export const trialOrganization: Organization = {
  id: 'org-trial-001',
  name: 'Trial Organization',
  subdomain: 'trial-org',
  settings: {
    business_hours: {
      enabled: true,
      timezone: 'America/Los_Angeles',
      schedule: {
        monday: { open: '09:00', close: '17:00', enabled: true },
        tuesday: { open: '09:00', close: '17:00', enabled: true },
        wednesday: { open: '09:00', close: '17:00', enabled: true },
        thursday: { open: '09:00', close: '17:00', enabled: true },
        friday: { open: '09:00', close: '17:00', enabled: true },
        saturday: { open: '10:00', close: '14:00', enabled: false },
        sunday: { open: '10:00', close: '14:00', enabled: false },
      },
    },
    whatsapp: {
      phone_number_id: 'trial-phone-001',
      business_account_id: 'trial-business-001',
      webhook_verify_token: 'trial-verify-token',
    },
    features: {
      automation: false,
      analytics: true,
      templates: true,
      bulk_messaging: false,
    },
  },
  subscription_plan: 'pro',
  subscription_status: 'trialing',
  stripe_customer_id: 'cus_trial_001',
  stripe_subscription_id: 'sub_trial_001',
  trial_ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  updated_at: new Date().toISOString(),
}

export const expiredTrialOrganization: Organization = {
  id: 'org-expired-trial-001',
  name: 'Expired Trial Organization',
  subdomain: 'expired-trial-org',
  settings: {
    business_hours: {
      enabled: true,
      timezone: 'UTC',
      schedule: {
        monday: { open: '09:00', close: '17:00', enabled: true },
        tuesday: { open: '09:00', close: '17:00', enabled: true },
        wednesday: { open: '09:00', close: '17:00', enabled: true },
        thursday: { open: '09:00', close: '17:00', enabled: true },
        friday: { open: '09:00', close: '17:00', enabled: true },
        saturday: { open: '10:00', close: '14:00', enabled: false },
        sunday: { open: '10:00', close: '14:00', enabled: false },
      },
    },
    whatsapp: {
      phone_number_id: 'expired-trial-phone-001',
      business_account_id: 'expired-trial-business-001',
      webhook_verify_token: 'expired-trial-verify-token',
    },
    features: {
      automation: false,
      analytics: false,
      templates: false,
      bulk_messaging: false,
    },
  },
  subscription_plan: 'pro',
  subscription_status: 'trial_ended',
  stripe_customer_id: 'cus_expired_trial_001',
  stripe_subscription_id: null,
  trial_ends_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
  created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days ago
  updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
}

// =============================================================================
// Suspended/Cancelled Organizations
// =============================================================================

export const suspendedOrganization: Organization = {
  id: 'org-suspended-001',
  name: 'Suspended Organization',
  subdomain: 'suspended-org',
  settings: {
    business_hours: {
      enabled: false,
      timezone: 'UTC',
      schedule: {},
    },
    whatsapp: {
      phone_number_id: 'suspended-phone-001',
      business_account_id: 'suspended-business-001',
      webhook_verify_token: 'suspended-verify-token',
    },
    features: {
      automation: false,
      analytics: false,
      templates: false,
      bulk_messaging: false,
    },
  },
  subscription_plan: 'starter',
  subscription_status: 'suspended',
  stripe_customer_id: 'cus_suspended_001',
  stripe_subscription_id: null,
  trial_ends_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-09-01T00:00:00Z',
}

export const cancelledOrganization: Organization = {
  id: 'org-cancelled-001',
  name: 'Cancelled Organization',
  subdomain: 'cancelled-org',
  settings: {
    business_hours: {
      enabled: false,
      timezone: 'UTC',
      schedule: {},
    },
    whatsapp: {
      phone_number_id: 'cancelled-phone-001',
      business_account_id: 'cancelled-business-001',
      webhook_verify_token: 'cancelled-verify-token',
    },
    features: {
      automation: false,
      analytics: false,
      templates: false,
      bulk_messaging: false,
    },
  },
  subscription_plan: 'pro',
  subscription_status: 'cancelled',
  stripe_customer_id: 'cus_cancelled_001',
  stripe_subscription_id: null,
  trial_ends_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-08-01T00:00:00Z',
}

// =============================================================================
// Different Plan Tiers
// =============================================================================

export const starterOrganization: Organization = {
  id: 'org-starter-001',
  name: 'Starter Organization',
  subdomain: 'starter-org',
  settings: {
    business_hours: {
      enabled: true,
      timezone: 'UTC',
      schedule: {
        monday: { open: '09:00', close: '17:00', enabled: true },
        tuesday: { open: '09:00', close: '17:00', enabled: true },
        wednesday: { open: '09:00', close: '17:00', enabled: true },
        thursday: { open: '09:00', close: '17:00', enabled: true },
        friday: { open: '09:00', close: '17:00', enabled: true },
        saturday: { open: '10:00', close: '14:00', enabled: false },
        sunday: { open: '10:00', close: '14:00', enabled: false },
      },
    },
    whatsapp: {
      phone_number_id: 'starter-phone-001',
      business_account_id: 'starter-business-001',
      webhook_verify_token: 'starter-verify-token',
    },
    features: {
      automation: false,
      analytics: true,
      templates: true,
      bulk_messaging: false,
    },
  },
  subscription_plan: 'starter',
  subscription_status: 'active',
  stripe_customer_id: 'cus_starter_001',
  stripe_subscription_id: 'sub_starter_001',
  trial_ends_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-10-13T12:00:00Z',
}

// =============================================================================
// Organizations for Testing Tenant Isolation
// =============================================================================

export const otherOrganization: Organization = {
  id: 'org-test-002',
  name: 'Other Test Organization',
  subdomain: 'other-test-org',
  settings: {
    business_hours: {
      enabled: true,
      timezone: 'UTC',
      schedule: {
        monday: { open: '09:00', close: '17:00', enabled: true },
        tuesday: { open: '09:00', close: '17:00', enabled: true },
        wednesday: { open: '09:00', close: '17:00', enabled: true },
        thursday: { open: '09:00', close: '17:00', enabled: true },
        friday: { open: '09:00', close: '17:00', enabled: true },
        saturday: { open: '10:00', close: '14:00', enabled: false },
        sunday: { open: '10:00', close: '14:00', enabled: false },
      },
    },
    whatsapp: {
      phone_number_id: 'other-phone-001',
      business_account_id: 'other-business-001',
      webhook_verify_token: 'other-verify-token',
    },
    features: {
      automation: true,
      analytics: true,
      templates: true,
      bulk_messaging: true,
    },
  },
  subscription_plan: 'pro',
  subscription_status: 'active',
  stripe_customer_id: 'cus_other_001',
  stripe_subscription_id: 'sub_other_001',
  trial_ends_at: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-10-13T12:00:00Z',
}

// =============================================================================
// Collections for Testing
// =============================================================================

export const allOrganizations: Organization[] = [
  testOrganization,
  enterpriseOrganization,
  trialOrganization,
  expiredTrialOrganization,
  suspendedOrganization,
  cancelledOrganization,
  starterOrganization,
  otherOrganization,
]

export const activeOrganizations: Organization[] = [
  testOrganization,
  enterpriseOrganization,
  starterOrganization,
  otherOrganization,
]

export const trialingOrganizations: Organization[] = [trialOrganization, expiredTrialOrganization]

export const inactiveOrganizations: Organization[] = [suspendedOrganization, cancelledOrganization]

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets organization by ID
 */
export function getOrganizationById(id: string): Organization | undefined {
  return allOrganizations.find(org => org.id === id)
}

/**
 * Gets organizations by plan
 */
export function getOrganizationsByPlan(plan: string): Organization[] {
  return allOrganizations.filter(org => org.subscription_plan === plan)
}

/**
 * Gets organizations by status
 */
export function getOrganizationsByStatus(status: string): Organization[] {
  return allOrganizations.filter(org => org.subscription_status === status)
}

/**
 * Checks if organization has feature
 */
export function hasFeature(organization: Organization, feature: string): boolean {
  return (
    organization.settings.features?.[feature as keyof typeof organization.settings.features] ===
    true
  )
}

/**
 * Checks if organization is active
 */
export function isOrganizationActive(organization: Organization): boolean {
  return ['active', 'trialing'].includes(organization.subscription_status)
}
