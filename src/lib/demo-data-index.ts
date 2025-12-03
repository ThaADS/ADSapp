/**
 * Demo Data Index
 * Central export for all demo mock data
 *
 * Usage:
 * import { getDemoData, isDemoAccount } from '@/lib/demo-data-index'
 *
 * const data = getDemoData('workflows', organizationId)
 */

import { DEMO_WORKFLOWS, DEMO_WORKFLOW_STATS } from './demo-workflows'
import { DEMO_BROADCASTS, DEMO_BROADCAST_STATS } from './demo-broadcasts'
import { DEMO_DRIP_CAMPAIGNS, DEMO_DRIP_STATS } from './demo-drip-campaigns'
import { DEMO_ANALYTICS_DATA, DEMO_ANALYTICS_SUMMARY } from './demo-analytics-data'

// Demo account identifiers
// These organization IDs will receive mock data instead of real data
export const DEMO_ORGANIZATION_IDS = [
  'demo-org-001',
  'demo-org-002',
  'demo-org-003',
  // Add more demo org IDs as needed
]

// Demo user email patterns
export const DEMO_EMAIL_PATTERNS = [
  '@demo.adsapp.nl',
  '@test.adsapp.nl',
  '+demo@', // email+demo@domain.com pattern
]

/**
 * Check if an organization ID is a demo account
 */
export function isDemoOrganization(organizationId: string): boolean {
  return DEMO_ORGANIZATION_IDS.includes(organizationId)
}

/**
 * Check if a user email indicates a demo account
 */
export function isDemoEmail(email: string): boolean {
  return DEMO_EMAIL_PATTERNS.some(pattern => email.includes(pattern))
}

/**
 * Check if an account should receive demo data
 */
export function isDemoAccount(
  organizationId?: string | null,
  userEmail?: string | null
): boolean {
  if (organizationId && isDemoOrganization(organizationId)) {
    return true
  }
  if (userEmail && isDemoEmail(userEmail)) {
    return true
  }
  return false
}

/**
 * Get demo data for a specific feature
 */
export function getDemoData(feature: 'workflows', organizationId?: string): typeof DEMO_WORKFLOWS
export function getDemoData(feature: 'broadcasts', organizationId?: string): typeof DEMO_BROADCASTS
export function getDemoData(
  feature: 'drip-campaigns',
  organizationId?: string
): typeof DEMO_DRIP_CAMPAIGNS
export function getDemoData(feature: 'analytics', organizationId?: string): typeof DEMO_ANALYTICS_DATA
export function getDemoData(
  feature: 'workflows' | 'broadcasts' | 'drip-campaigns' | 'analytics',
  organizationId?: string
): any {
  // Optional: Filter or customize data based on organizationId
  // For now, return the same data for all demo accounts

  switch (feature) {
    case 'workflows':
      return DEMO_WORKFLOWS
    case 'broadcasts':
      return DEMO_BROADCASTS
    case 'drip-campaigns':
      return DEMO_DRIP_CAMPAIGNS
    case 'analytics':
      return DEMO_ANALYTICS_DATA
    default:
      return null
  }
}

/**
 * Get demo statistics for a specific feature
 */
export function getDemoStats(feature: 'workflows'): typeof DEMO_WORKFLOW_STATS
export function getDemoStats(feature: 'broadcasts'): typeof DEMO_BROADCAST_STATS
export function getDemoStats(feature: 'drip-campaigns'): typeof DEMO_DRIP_STATS
export function getDemoStats(feature: 'analytics'): typeof DEMO_ANALYTICS_SUMMARY
export function getDemoStats(
  feature: 'workflows' | 'broadcasts' | 'drip-campaigns' | 'analytics'
): any {
  switch (feature) {
    case 'workflows':
      return DEMO_WORKFLOW_STATS
    case 'broadcasts':
      return DEMO_BROADCAST_STATS
    case 'drip-campaigns':
      return DEMO_DRIP_STATS
    case 'analytics':
      return DEMO_ANALYTICS_SUMMARY
    default:
      return null
  }
}

/**
 * Get all demo data for comprehensive display
 */
export function getAllDemoData() {
  return {
    workflows: {
      data: DEMO_WORKFLOWS,
      stats: DEMO_WORKFLOW_STATS,
    },
    broadcasts: {
      data: DEMO_BROADCASTS,
      stats: DEMO_BROADCAST_STATS,
    },
    dripCampaigns: {
      data: DEMO_DRIP_CAMPAIGNS,
      stats: DEMO_DRIP_STATS,
    },
    analytics: {
      data: DEMO_ANALYTICS_DATA,
      summary: DEMO_ANALYTICS_SUMMARY,
    },
  }
}

/**
 * Example API route integration pattern
 *
 * Usage in API routes:
 *
 * ```typescript
 * import { createClient } from '@/lib/supabase/server'
 * import { isDemoAccount, getDemoData } from '@/lib/demo-data-index'
 *
 * export async function GET(request: Request) {
 *   const supabase = await createClient()
 *   const { data: { user } } = await supabase.auth.getUser()
 *
 *   const { data: profile } = await supabase
 *     .from('profiles')
 *     .select('organization_id')
 *     .eq('id', user.id)
 *     .single()
 *
 *   // Check if demo account
 *   if (isDemoAccount(profile?.organization_id, user.email)) {
 *     const demoData = getDemoData('workflows')
 *     return Response.json({ data: demoData })
 *   }
 *
 *   // Regular data fetch for real accounts
 *   const { data } = await supabase.from('workflows').select()
 *   return Response.json({ data })
 * }
 * ```
 */

export default {
  isDemoOrganization,
  isDemoEmail,
  isDemoAccount,
  getDemoData,
  getDemoStats,
  getAllDemoData,
  DEMO_ORGANIZATION_IDS,
  DEMO_EMAIL_PATTERNS,
}
