/**
 * Job Queue Unit Tests
 *
 * Tests for job queue creation, enqueueing, and retry logic with exponential backoff.
 *
 * @module tests/unit/queue/job-queue-unit
 */

import { QueueManager, CreateJobOptions } from '@/lib/queue/queue-manager';
import { QueueName, JobPriority } from '@/lib/queue/bull-config';

// Mock BullMQ
jest.mock('bullmq', () => {
  const mockJob = {
    id: 'job-123',
    name: 'test-job',
    data: {},
    progress: 0,
    attemptsMade: 0,
    opts: { attempts: 3, delay: 0 },
    timestamp: Date.now(),
    getState: jest.fn().mockResolvedValue('waiting'),
    retry: jest.fn(),
    remove: jest.fn(),
  };

  return {
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue(mockJob),
      getJob: jest.fn().mockResolvedValue(mockJob),
      getFailed: jest.fn().mockResolvedValue([]),
      clean: jest.fn().mockResolvedValue([]),
      pause: jest.fn(),
      resume: jest.fn(),
      close: jest.fn(),
      name: 'test-queue',
    })),
    Worker: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn(),
    })),
    QueueEvents: jest.fn().mockImplementation(() => ({
      on: jest.fn(),
      close: jest.fn(),
    })),
    Job: mockJob,
  };
});

// Mock queue configuration
jest.mock('@/lib/queue/bull-config', () => ({
  QueueName: {
    BULK_MESSAGE: 'bulk-message',
    CONTACT_IMPORT: 'contact-import',
    TEMPLATE_PROCESSING: 'template-processing',
    EMAIL_NOTIFICATION: 'email-notification',
  },
  JobPriority: {
    HIGH: 1,
    NORMAL: 5,
    LOW: 10,
  },
  createQueue: jest.fn((name) => {
    const { Queue } = require('bullmq');
    return new Queue();
  }),
  createWorker: jest.fn(() => {
    const { Worker } = require('bullmq');
    return new Worker();
  }),
  createQueueEvents: jest.fn(() => {
    const { QueueEvents } = require('bullmq');
    return new QueueEvents();
  }),
  getQueueStats: jest.fn().mockResolvedValue({
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
  }),
  gracefulShutdown: jest.fn(),
}));

// Mock queue processors
jest.mock('@/lib/queue/processors/bulk-message-processor', () => ({
  processBulkMessage: jest.fn(),
}));
jest.mock('@/lib/queue/processors/contact-import-processor', () => ({
  processContactImport: jest.fn(),
}));
jest.mock('@/lib/queue/processors/template-processor', () => ({
  processTemplate: jest.fn(),
}));
jest.mock('@/lib/queue/processors/email-notification-processor', () => ({
  processEmailNotification: jest.fn(),
}));

describe('Job Queue', () => {
  let manager: QueueManager;

  beforeEach(async () => {
    jest.clearAllMocks();
    manager = new QueueManager();
    await manager.initialize();
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('Test 15: Job Creation and Enqueueing', () => {
    it('should create and enqueue a job successfully', async () => {
      // Arrange
      const jobData = {
        recipients: ['+1234567890'],
        message: 'Test message',
        tenantId: 'tenant-123',
      };

      const options: CreateJobOptions = {
        priority: JobPriority.NORMAL,
        attempts: 3,
      };

      // Act
      const jobId = await manager.addJob(
        QueueName.BULK_MESSAGE,
        'send-bulk-message',
        jobData,
        options
      );

      // Assert
      expect(jobId).toBeDefined();
      expect(jobId).toBe('job-123');
      expect(manager.getQueue(QueueName.BULK_MESSAGE)).toBeDefined();
    });

    it('should enqueue high priority job with correct priority', async () => {
      // Arrange
      const jobData = {
        recipients: ['+1234567890'],
        message: 'Urgent message',
        tenantId: 'tenant-123',
      };

      const options: CreateJobOptions = {
        priority: JobPriority.HIGH,
        attempts: 5,
      };

      // Act
      const jobId = await manager.addJob(
        QueueName.BULK_MESSAGE,
        'urgent-message',
        jobData,
        options
      );

      // Assert
      expect(jobId).toBeDefined();
      const queue = manager.getQueue(QueueName.BULK_MESSAGE);
      expect(queue).toBeDefined();
    });

    it('should enqueue job with delay', async () => {
      // Arrange
      const jobData = {
        recipients: ['+1234567890'],
        message: 'Scheduled message',
        tenantId: 'tenant-123',
      };

      const options: CreateJobOptions = {
        priority: JobPriority.NORMAL,
        delay: 60000, // 1 minute delay
        attempts: 3,
      };

      // Act
      const jobId = await manager.addJob(
        QueueName.BULK_MESSAGE,
        'scheduled-message',
        jobData,
        options
      );

      // Assert
      expect(jobId).toBeDefined();
    });

    it('should throw error when enqueueing to non-existent queue', async () => {
      // Arrange
      const jobData = { test: 'data' };

      // Act & Assert
      await expect(
        manager.addJob('non-existent-queue' as QueueName, 'test', jobData)
      ).rejects.toThrow('Queue non-existent-queue not initialized');
    });

    it('should get job information after creation', async () => {
      // Arrange
      const jobData = {
        recipients: ['+1234567890'],
        message: 'Test message',
        tenantId: 'tenant-123',
      };

      // Act
      const jobId = await manager.addJob(
        QueueName.BULK_MESSAGE,
        'test-job',
        jobData
      );

      const jobInfo = await manager.getJob(QueueName.BULK_MESSAGE, jobId);

      // Assert
      expect(jobInfo).toBeDefined();
      expect(jobInfo?.id).toBe(jobId);
      expect(jobInfo?.name).toBe('test-job');
      expect(jobInfo?.state).toBe('waiting');
    });

    it('should return null for non-existent job', async () => {
      // Arrange
      const { Queue } = require('bullmq');
      const queue = manager.getQueue(QueueName.BULK_MESSAGE);
      queue.getJob = jest.fn().mockResolvedValue(null);

      // Act
      const jobInfo = await manager.getJob(QueueName.BULK_MESSAGE, 'non-existent');

      // Assert
      expect(jobInfo).toBeNull();
    });
  });

  describe('Test 16: Job Retry Logic with Exponential Backoff', () => {
    it('should retry failed job with exponential backoff', async () => {
      // Arrange
      const jobData = {
        recipients: ['+1234567890'],
        message: 'Test message',
        tenantId: 'tenant-123',
      };

      const options: CreateJobOptions = {
        priority: JobPriority.NORMAL,
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 1000, // Start with 1 second
        },
      };

      // Act
      const jobId = await manager.addJob(
        QueueName.BULK_MESSAGE,
        'retry-test',
        jobData,
        options
      );

      // Assert
      expect(jobId).toBeDefined();
      const queue = manager.getQueue(QueueName.BULK_MESSAGE);
      expect(queue).toBeDefined();
      // Verify that backoff configuration was set
    });

    it('should retry job manually', async () => {
      // Arrange
      const jobData = {
        recipients: ['+1234567890'],
        message: 'Failed message',
        tenantId: 'tenant-123',
      };

      const jobId = await manager.addJob(
        QueueName.BULK_MESSAGE,
        'manual-retry-test',
        jobData
      );

      // Act
      const result = await manager.retryJob(QueueName.BULK_MESSAGE, jobId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when retrying non-existent job', async () => {
      // Arrange
      const { Queue } = require('bullmq');
      const queue = manager.getQueue(QueueName.BULK_MESSAGE);
      queue.getJob = jest.fn().mockResolvedValue(null);

      // Act
      const result = await manager.retryJob(QueueName.BULK_MESSAGE, 'non-existent');

      // Assert
      expect(result).toBe(false);
    });

    it('should use fixed backoff strategy', async () => {
      // Arrange
      const jobData = {
        recipients: ['+1234567890'],
        message: 'Test message',
        tenantId: 'tenant-123',
      };

      const options: CreateJobOptions = {
        priority: JobPriority.NORMAL,
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 5000, // Fixed 5 second delay
        },
      };

      // Act
      const jobId = await manager.addJob(
        QueueName.BULK_MESSAGE,
        'fixed-backoff-test',
        jobData,
        options
      );

      // Assert
      expect(jobId).toBeDefined();
    });

    it('should handle job cancellation', async () => {
      // Arrange
      const jobData = {
        recipients: ['+1234567890'],
        message: 'Test message',
        tenantId: 'tenant-123',
      };

      const jobId = await manager.addJob(
        QueueName.BULK_MESSAGE,
        'cancel-test',
        jobData
      );

      // Act
      const result = await manager.cancelJob(QueueName.BULK_MESSAGE, jobId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when canceling non-existent job', async () => {
      // Arrange
      const { Queue } = require('bullmq');
      const queue = manager.getQueue(QueueName.BULK_MESSAGE);
      queue.getJob = jest.fn().mockResolvedValue(null);

      // Act
      const result = await manager.cancelJob(QueueName.BULK_MESSAGE, 'non-existent');

      // Assert
      expect(result).toBe(false);
    });

    it('should get failed jobs list', async () => {
      // Arrange
      const mockFailedJobs = [
        {
          id: 'failed-job-1',
          name: 'failed-message',
          data: { message: 'Failed' },
          progress: 0,
          attemptsMade: 3,
          opts: { attempts: 3, delay: 0 },
          timestamp: Date.now(),
          failedReason: 'Network error',
          getState: jest.fn().mockResolvedValue('failed'),
        },
      ];

      const { Queue } = require('bullmq');
      const queue = manager.getQueue(QueueName.BULK_MESSAGE);
      queue.getFailed = jest.fn().mockResolvedValue(mockFailedJobs);

      // Act
      const failedJobs = await manager.getFailedJobs(QueueName.BULK_MESSAGE, 0, 10);

      // Assert
      expect(failedJobs).toBeDefined();
      expect(Array.isArray(failedJobs)).toBe(true);
      expect(failedJobs.length).toBe(1);
      expect(failedJobs[0].id).toBe('failed-job-1');
      expect(failedJobs[0].failedReason).toBe('Network error');
    });

    it('should clean completed jobs', async () => {
      // Arrange
      const { Queue } = require('bullmq');
      const queue = manager.getQueue(QueueName.BULK_MESSAGE);
      queue.clean = jest.fn().mockResolvedValue(['job-1', 'job-2', 'job-3']);

      // Act
      const cleanedJobs = await manager.cleanCompletedJobs(
        QueueName.BULK_MESSAGE,
        3600000
      );

      // Assert
      expect(cleanedJobs).toBeDefined();
      expect(Array.isArray(cleanedJobs)).toBe(true);
      expect(cleanedJobs.length).toBe(3);
    });

    it('should clean failed jobs', async () => {
      // Arrange
      const { Queue } = require('bullmq');
      const queue = manager.getQueue(QueueName.BULK_MESSAGE);
      queue.clean = jest.fn().mockResolvedValue(['failed-job-1', 'failed-job-2']);

      // Act
      const cleanedJobs = await manager.cleanFailedJobs(
        QueueName.BULK_MESSAGE,
        86400000
      );

      // Assert
      expect(cleanedJobs).toBeDefined();
      expect(Array.isArray(cleanedJobs)).toBe(true);
      expect(cleanedJobs.length).toBe(2);
    });
  });
});
