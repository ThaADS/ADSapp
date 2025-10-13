import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import {
  createQueue,
  createWorker,
  createQueueEvents,
  QueueName,
  JobPriority,
  getQueueStats,
  gracefulShutdown
} from './bull-config';
import { processBulkMessage } from './processors/bulk-message-processor';
import { processContactImport } from './processors/contact-import-processor';
import { processTemplate } from './processors/template-processor';
import { processEmailNotification } from './processors/email-notification-processor';

/**
 * Queue Manager
 *
 * Centralized management for all BullMQ queues and workers.
 * Handles job creation, cancellation, monitoring, and lifecycle management.
 *
 * Features:
 * - Centralized queue management
 * - Worker lifecycle management
 * - Job creation with priority
 * - Job cancellation and retry
 * - Queue monitoring and statistics
 * - Graceful shutdown handling
 *
 * @module queue-manager
 */

/**
 * Job creation options
 */
export interface CreateJobOptions {
  priority?: JobPriority;
  delay?: number; // Delay in milliseconds
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete?: boolean | number;
  removeOnFail?: boolean | number;
}

/**
 * Job information
 */
export interface JobInfo {
  id: string;
  name: string;
  queueName: string;
  data: any;
  progress: number | object;
  attemptsMade: number;
  attemptsTotal: number;
  delay: number;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  failedReason?: string;
  stacktrace?: string[];
  returnValue?: any;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';
}

/**
 * Queue Manager Class
 */
export class QueueManager {
  private queues: Map<QueueName, Queue>;
  private workers: Map<QueueName, Worker>;
  private queueEvents: Map<QueueName, QueueEvents>;
  private isShuttingDown: boolean = false;

  constructor() {
    this.queues = new Map();
    this.workers = new Map();
    this.queueEvents = new Map();
  }

  /**
   * Initialize all queues and workers
   */
  async initialize(): Promise<void> {
    console.log('[QueueManager] Initializing queues and workers...');

    try {
      // Initialize bulk message queue
      await this.initializeQueue(QueueName.BULK_MESSAGE, processBulkMessage);

      // Initialize contact import queue
      await this.initializeQueue(
        QueueName.CONTACT_IMPORT,
        processContactImport
      );

      // Initialize template processing queue
      await this.initializeQueue(
        QueueName.TEMPLATE_PROCESSING,
        processTemplate
      );

      // Initialize email notification queue
      await this.initializeQueue(
        QueueName.EMAIL_NOTIFICATION,
        processEmailNotification
      );

      console.log('[QueueManager] All queues and workers initialized');
    } catch (error) {
      console.error('[QueueManager] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Initialize a single queue with its worker
   */
  private async initializeQueue(
    queueName: QueueName,
    processor: (job: Job) => Promise<any>
  ): Promise<void> {
    try {
      // Create queue
      const queue = createQueue(queueName);
      this.queues.set(queueName, queue);

      // Create worker
      const worker = createWorker(queueName, processor);
      this.workers.set(queueName, worker);

      // Create queue events
      const queueEvents = createQueueEvents(queueName);
      this.queueEvents.set(queueName, queueEvents);

      console.log(`[QueueManager] Initialized ${queueName}`);
    } catch (error) {
      console.error(`[QueueManager] Error initializing ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Get queue by name
   */
  getQueue(queueName: QueueName): Queue | undefined {
    return this.queues.get(queueName);
  }

  /**
   * Add a job to a queue
   */
  async addJob(
    queueName: QueueName,
    jobName: string,
    data: any,
    options?: CreateJobOptions
  ): Promise<string> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not initialized`);
    }

    const job = await queue.add(jobName, data, {
      priority: options?.priority || JobPriority.NORMAL,
      delay: options?.delay,
      attempts: options?.attempts,
      backoff: options?.backoff,
      removeOnComplete: options?.removeOnComplete,
      removeOnFail: options?.removeOnFail
    });

    console.log(`[QueueManager] Job ${job.id} added to ${queueName}`);

    return job.id?.toString() || '';
  }

  /**
   * Get job by ID
   */
  async getJob(queueName: QueueName, jobId: string): Promise<JobInfo | null> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not initialized`);
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      id: job.id?.toString() || '',
      name: job.name,
      queueName: queue.name,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      attemptsTotal: job.opts.attempts || 0,
      delay: job.opts.delay || 0,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason,
      stacktrace: job.stacktrace,
      returnValue: job.returnvalue,
      state: state as any
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(queueName: QueueName, jobId: string): Promise<boolean> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not initialized`);
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      return false;
    }

    await job.remove();

    console.log(`[QueueManager] Job ${jobId} cancelled from ${queueName}`);

    return true;
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName: QueueName, jobId: string): Promise<boolean> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not initialized`);
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      return false;
    }

    await job.retry();

    console.log(`[QueueManager] Job ${jobId} retried in ${queueName}`);

    return true;
  }

  /**
   * Get queue statistics
   */
  async getQueueStatistics(queueName: QueueName) {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not initialized`);
    }

    return await getQueueStats(queue);
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStatistics() {
    const stats: Record<string, any> = {};

    for (const [queueName, queue] of this.queues) {
      stats[queueName] = await getQueueStats(queue);
    }

    return stats;
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not initialized`);
    }

    await queue.pause();

    console.log(`[QueueManager] Queue ${queueName} paused`);
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not initialized`);
    }

    await queue.resume();

    console.log(`[QueueManager] Queue ${queueName} resumed`);
  }

  /**
   * Get failed jobs
   */
  async getFailedJobs(
    queueName: QueueName,
    start: number = 0,
    end: number = 10
  ): Promise<JobInfo[]> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not initialized`);
    }

    const failedJobs = await queue.getFailed(start, end);

    return Promise.all(
      failedJobs.map(async (job) => {
        const state = await job.getState();

        return {
          id: job.id?.toString() || '',
          name: job.name,
          queueName: queue.name,
          data: job.data,
          progress: job.progress,
          attemptsMade: job.attemptsMade,
          attemptsTotal: job.opts.attempts || 0,
          delay: job.opts.delay || 0,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
          stacktrace: job.stacktrace,
          returnValue: job.returnvalue,
          state: state as any
        };
      })
    );
  }

  /**
   * Clean completed jobs
   */
  async cleanCompletedJobs(
    queueName: QueueName,
    grace: number = 3600000
  ): Promise<string[]> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not initialized`);
    }

    const cleaned = await queue.clean(grace, 1000, 'completed');

    console.log(
      `[QueueManager] Cleaned ${cleaned.length} completed jobs from ${queueName}`
    );

    return cleaned;
  }

  /**
   * Clean failed jobs
   */
  async cleanFailedJobs(
    queueName: QueueName,
    grace: number = 86400000
  ): Promise<string[]> {
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue ${queueName} not initialized`);
    }

    const cleaned = await queue.clean(grace, 1000, 'failed');

    console.log(
      `[QueueManager] Cleaned ${cleaned.length} failed jobs from ${queueName}`
    );

    return cleaned;
  }

  /**
   * Graceful shutdown of all queues and workers
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      console.log('[QueueManager] Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;

    console.log('[QueueManager] Starting graceful shutdown...');

    const shutdownPromises: Promise<void>[] = [];

    for (const [queueName, queue] of this.queues) {
      const worker = this.workers.get(queueName);
      const queueEvents = this.queueEvents.get(queueName);

      if (worker && queueEvents) {
        shutdownPromises.push(gracefulShutdown(queue, worker, queueEvents));
      }
    }

    await Promise.all(shutdownPromises);

    this.queues.clear();
    this.workers.clear();
    this.queueEvents.clear();

    console.log('[QueueManager] Graceful shutdown complete');
  }

  /**
   * Health check for all queues
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    queues: Record<string, any>;
  }> {
    const queueHealth: Record<string, any> = {};
    let allHealthy = true;

    for (const [queueName, queue] of this.queues) {
      try {
        const stats = await getQueueStats(queue);
        queueHealth[queueName] = {
          healthy: true,
          stats
        };
      } catch (error) {
        allHealthy = false;
        queueHealth[queueName] = {
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }

    return {
      healthy: allHealthy,
      queues: queueHealth
    };
  }
}

/**
 * Singleton instance
 */
let queueManagerInstance: QueueManager | null = null;

/**
 * Get queue manager instance
 */
export function getQueueManager(): QueueManager {
  if (!queueManagerInstance) {
    queueManagerInstance = new QueueManager();
  }

  return queueManagerInstance;
}

/**
 * Initialize queue manager (call once at application startup)
 */
export async function initializeQueueManager(): Promise<QueueManager> {
  const manager = getQueueManager();
  await manager.initialize();
  return manager;
}
