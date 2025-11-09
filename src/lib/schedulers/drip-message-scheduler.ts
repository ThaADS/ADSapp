/**
 * Drip Message Scheduler
 * Processes due drip campaign messages on a scheduled basis
 *
 * Usage:
 * 1. Via cron job: node -r tsx/register src/lib/schedulers/drip-message-scheduler.ts
 * 2. Via API endpoint: POST /api/cron/process-drip-messages
 * 3. Via worker process: import and run processAllOrganizations()
 */

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { DripCampaignEngine } from '@/lib/whatsapp/drip-campaigns'

// Admin client for cron jobs (bypasses RLS)
const getAdminClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables')
  }

  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

/**
 * Process drip messages for a single organization
 */
export async function processDripMessagesForOrganization(
  organizationId: string
): Promise<{
  organizationId: string
  processed: number
  failed: number
  errors: string[]
}> {
  try {
    const supabase = getAdminClient()
    const engine = new DripCampaignEngine(supabase)

    console.log(`[Drip Scheduler] Processing messages for organization: ${organizationId}`)

    const result = await engine.processDueMessages(organizationId)

    console.log(
      `[Drip Scheduler] Organization ${organizationId}: ${result.processed} processed, ${result.failed} failed`
    )

    return {
      organizationId,
      ...result,
    }
  } catch (error) {
    console.error(
      `[Drip Scheduler] Failed to process org ${organizationId}:`,
      error instanceof Error ? error.message : error
    )

    return {
      organizationId,
      processed: 0,
      failed: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    }
  }
}

/**
 * Process drip messages for all organizations
 * This is the main function that should be called by the scheduler
 */
export async function processAllOrganizations(): Promise<{
  totalOrganizations: number
  totalProcessed: number
  totalFailed: number
  organizationResults: Array<{
    organizationId: string
    processed: number
    failed: number
    errors: string[]
  }>
}> {
  const startTime = Date.now()
  console.log('[Drip Scheduler] Starting scheduled drip message processing...')

  try {
    const supabase = getAdminClient()

    // Get all active organizations with active drip campaigns
    const { data: organizations, error } = await supabase
      .from('drip_campaigns')
      .select('organization_id')
      .eq('is_active', true)
      .eq('status', 'active')

    if (error) {
      throw new Error(`Failed to get organizations: ${error.message}`)
    }

    if (!organizations || organizations.length === 0) {
      console.log('[Drip Scheduler] No active drip campaigns found')
      return {
        totalOrganizations: 0,
        totalProcessed: 0,
        totalFailed: 0,
        organizationResults: [],
      }
    }

    // Get unique organization IDs
    const uniqueOrgIds = [...new Set(organizations.map(o => o.organization_id))]

    console.log(`[Drip Scheduler] Processing ${uniqueOrgIds.length} organizations...`)

    // Process each organization
    const results = []
    for (const orgId of uniqueOrgIds) {
      const result = await processDripMessagesForOrganization(orgId)
      results.push(result)
    }

    // Calculate totals
    const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0)
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log(
      `[Drip Scheduler] Completed in ${duration}s: ${totalProcessed} messages processed, ${totalFailed} failed`
    )

    return {
      totalOrganizations: uniqueOrgIds.length,
      totalProcessed,
      totalFailed,
      organizationResults: results,
    }
  } catch (error) {
    console.error('[Drip Scheduler] Critical error:', error)
    throw error
  }
}

/**
 * Main function for standalone execution
 */
export async function main() {
  try {
    const result = await processAllOrganizations()

    // Log summary
    console.log('\n=== Drip Message Processing Summary ===')
    console.log(`Organizations processed: ${result.totalOrganizations}`)
    console.log(`Messages sent: ${result.totalProcessed}`)
    console.log(`Messages failed: ${result.totalFailed}`)

    if (result.totalFailed > 0) {
      console.log('\nFailed organizations:')
      result.organizationResults
        .filter(r => r.failed > 0 || r.errors.length > 0)
        .forEach(r => {
          console.log(`  - ${r.organizationId}: ${r.failed} failures`)
          r.errors.forEach(e => console.log(`    Error: ${e}`))
        })
    }

    console.log('=====================================\n')

    process.exit(0)
  } catch (error) {
    console.error('Fatal error in drip message scheduler:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}
