/**
 * Data Cleanup Queue Processor
 *
 * Automated background job processor for GDPR data retention enforcement.
 * Runs scheduled cleanup jobs to delete expired data based on retention policies.
 *
 * Features:
 * - Scheduled daily cleanup (2 AM)
 * - Per-organization retention enforcement
 * - Batch processing with error handling
 * - Comprehensive cleanup reports
 * - Dry-run mode for testing
 *
 * @module queue/processors/data-cleanup-processor
 */

import { Job } from 'bullmq';
import { RetentionPolicyEngine } from '@/lib/gdpr/retention-policy';
import type {
  DataCleanupJobData,
  DataCleanupResult,
  DataType
} from '@/lib/gdpr/types';
import { createClient } from '@/lib/supabase/server';

/**
 * Process data cleanup job
 *
 * Enforces retention policies and deletes expired data for an organization.
 */
export async function processDataCleanup(
  job: Job<DataCleanupJobData>
): Promise<DataCleanupResult> {
  const startTime = Date.now();
  const { organization_id, data_type, dry_run = false, batch_size = 1000 } = job.data;

  console.log(
    `[DataCleanup] Processing cleanup job ${job.id} for org ${organization_id}:${data_type}`
  );

  try {
    // Update job progress
    await job.updateProgress(10);

    // Enforce retention policy
    const result = await RetentionPolicyEngine.enforceRetentionPolicy(
      organization_id,
      data_type,
      dry_run
    );

    await job.updateProgress(80);

    // Log cleanup results
    console.log(
      `[DataCleanup] Job ${job.id} completed: ${result.records_deleted}/${result.records_found} records deleted`
    );

    await job.updateProgress(100);

    // Return cleanup result
    return {
      organization_id,
      data_type,
      records_processed: result.records_found,
      records_deleted: result.records_deleted,
      errors: result.errors.length,
      duration_ms: Date.now() - startTime,
      completed_at: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[DataCleanup] Job ${job.id} failed:`, error);

    // Return error result
    return {
      organization_id,
      data_type,
      records_processed: 0,
      records_deleted: 0,
      errors: 1,
      duration_ms: Date.now() - startTime,
      completed_at: new Date().toISOString()
    };
  }
}

/**
 * Schedule daily cleanup for all organizations
 *
 * This function should be called by a cron job or scheduler to run daily at 2 AM.
 */
export async function scheduleAllOrganizationCleanups(): Promise<void> {
  console.log('[DataCleanup] Scheduling cleanup jobs for all organizations...');

  const supabase = await createClient();

  try {
    // Get all active organizations
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('status', 'active')
      .is('deleted_at', null);

    if (error) {
      console.error('[DataCleanup] Error fetching organizations:', error);
      return;
    }

    if (!organizations || organizations.length === 0) {
      console.log('[DataCleanup] No active organizations found');
      return;
    }

    console.log(`[DataCleanup] Found ${organizations.length} organizations to process`);

    // Get queue manager
    const { getQueueManager } = await import('@/lib/queue/queue-manager');
    const queueManager = getQueueManager();

    // Data types to clean
    const dataTypes: DataType[] = ['messages', 'contacts', 'conversations', 'sessions'];

    // Schedule cleanup jobs for each organization
    let jobsScheduled = 0;

    for (const org of organizations) {
      for (const dataType of dataTypes) {
        try {
          // Check if organization has retention policy enabled
          const { data: policy } = await supabase
            .from('data_retention_policies')
            .select('is_active, enforcement_enabled, auto_delete_enabled')
            .eq('organization_id', org.id)
            .eq('data_type', dataType)
            .single();

          // Skip if no policy or not enabled
          if (policy && (!policy.is_active || !policy.enforcement_enabled || !policy.auto_delete_enabled)) {
            continue;
          }

          // Add cleanup job to queue
          await queueManager.addJob(
            'data-cleanup' as any, // Add this queue type to QueueName enum
            `cleanup-${org.id}-${dataType}`,
            {
              organization_id: org.id,
              data_type: dataType,
              dry_run: false,
              batch_size: 1000
            } as DataCleanupJobData,
            {
              priority: 5, // Low priority
              attempts: 3,
              backoff: {
                type: 'exponential',
                delay: 60000 // 1 minute
              }
            }
          );

          jobsScheduled++;
        } catch (err) {
          console.error(
            `[DataCleanup] Error scheduling cleanup for ${org.id}:${dataType}:`,
            err
          );
        }
      }
    }

    console.log(`[DataCleanup] Scheduled ${jobsScheduled} cleanup jobs`);
  } catch (error) {
    console.error('[DataCleanup] Error scheduling cleanups:', error);
  }
}

/**
 * Generate cleanup report for organization
 */
export async function generateCleanupReport(
  organizationId: string
): Promise<{
  organization_id: string;
  last_cleanup_date: string | null;
  next_cleanup_date: string;
  data_types: Array<{
    type: DataType;
    total_records: number;
    expired_records: number;
    retention_days: number;
    last_enforced: string | null;
  }>;
  estimated_cleanup_time_ms: number;
}> {
  const supabase = await createClient();

  // Get organization info
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single();

  if (!org) {
    throw new Error('Organization not found');
  }

  // Get retention policies
  const { data: policies } = await supabase
    .from('data_retention_policies')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  const dataTypes: DataType[] = ['messages', 'contacts', 'conversations', 'sessions'];
  const dataTypeStats: Array<{
    type: DataType;
    total_records: number;
    expired_records: number;
    retention_days: number;
    last_enforced: string | null;
  }> = [];

  let totalEstimatedTime = 0;
  let lastCleanupDate: string | null = null;

  for (const dataType of dataTypes) {
    try {
      const stats = await RetentionPolicyEngine.getPolicyStats(
        organizationId,
        dataType
      );

      dataTypeStats.push({
        type: dataType,
        total_records: stats.total_records,
        expired_records: stats.expired_records,
        retention_days: stats.retention_days,
        last_enforced: stats.last_enforced_at
      });

      totalEstimatedTime += stats.estimated_cleanup_time_ms;

      // Track most recent cleanup
      if (stats.last_enforced_at) {
        if (!lastCleanupDate || stats.last_enforced_at > lastCleanupDate) {
          lastCleanupDate = stats.last_enforced_at;
        }
      }
    } catch (err) {
      console.error(`[DataCleanup] Error getting stats for ${dataType}:`, err);
    }
  }

  // Calculate next cleanup date (daily at 2 AM)
  const nextCleanup = new Date();
  nextCleanup.setHours(2, 0, 0, 0);
  if (nextCleanup < new Date()) {
    nextCleanup.setDate(nextCleanup.getDate() + 1);
  }

  return {
    organization_id: organizationId,
    last_cleanup_date: lastCleanupDate,
    next_cleanup_date: nextCleanup.toISOString(),
    data_types: dataTypeStats,
    estimated_cleanup_time_ms: totalEstimatedTime
  };
}
