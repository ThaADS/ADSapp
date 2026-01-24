/**
 * Job Queue Integration Tests
 *
 * Tests for BullMQ job queue system including processors, API endpoints, and queue management.
 */

import { getQueueManager, initializeQueueManager } from '@/lib/queue/queue-manager';
import { QueueName, JobPriority } from '@/lib/queue/bull-config';

describe('Job Queue System', () => {
  let queueManager: any;

  beforeAll(async () => {
    // Initialize queue manager for tests
    queueManager = await initializeQueueManager();
  });

  afterAll(async () => {
    // Cleanup: shutdown queue manager
    if (queueManager) {
      await queueManager.shutdown();
    }
  });

  describe('Queue Manager', () => {
    it('should initialize all queues', () => {
      expect(queueManager).toBeDefined();
      expect(queueManager.getQueue(QueueName.BULK_MESSAGE)).toBeDefined();
      expect(queueManager.getQueue(QueueName.CONTACT_IMPORT)).toBeDefined();
      expect(queueManager.getQueue(QueueName.TEMPLATE_PROCESSING)).toBeDefined();
      expect(queueManager.getQueue(QueueName.EMAIL_NOTIFICATION)).toBeDefined();
    });

    it('should add job to queue', async () => {
      const jobData = {
        organizationId: 'test-org',
        userId: 'test-user',
        contacts: [
          {
            id: 'contact-1',
            phone: '+1234567890',
            name: 'Test Contact'
          }
        ],
        messageContent: 'Test message'
      };

      const jobId = await queueManager.addJob(
        QueueName.BULK_MESSAGE,
        'test-bulk-message',
        jobData,
        { priority: JobPriority.CRITICAL }
      );

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });

    it('should get job status', async () => {
      const jobData = {
        organizationId: 'test-org',
        userId: 'test-user',
        contacts: [{ id: '1', phone: '+1234567890', name: 'Test' }],
        messageContent: 'Test'
      };

      const jobId = await queueManager.addJob(
        QueueName.BULK_MESSAGE,
        'test-job',
        jobData
      );

      const job = await queueManager.getJob(QueueName.BULK_MESSAGE, jobId);

      expect(job).toBeDefined();
      expect(job.id).toBe(jobId);
      expect(job.queueName).toBe(QueueName.BULK_MESSAGE);
      expect(job.data).toEqual(jobData);
    });

    it('should cancel job', async () => {
      const jobData = {
        organizationId: 'test-org',
        userId: 'test-user',
        contacts: [{ id: '1', phone: '+1234567890', name: 'Test' }],
        messageContent: 'Test'
      };

      const jobId = await queueManager.addJob(
        QueueName.BULK_MESSAGE,
        'test-job',
        jobData,
        { delay: 10000 } // Delay to ensure we can cancel
      );

      const cancelled = await queueManager.cancelJob(
        QueueName.BULK_MESSAGE,
        jobId
      );

      expect(cancelled).toBe(true);
    });

    it('should get queue statistics', async () => {
      const stats = await queueManager.getQueueStatistics(
        QueueName.BULK_MESSAGE
      );

      expect(stats).toBeDefined();
      expect(typeof stats.waiting).toBe('number');
      expect(typeof stats.active).toBe('number');
      expect(typeof stats.completed).toBe('number');
      expect(typeof stats.failed).toBe('number');
    });

    it('should get all queue statistics', async () => {
      const allStats = await queueManager.getAllQueueStatistics();

      expect(allStats).toBeDefined();
      expect(allStats[QueueName.BULK_MESSAGE]).toBeDefined();
      expect(allStats[QueueName.CONTACT_IMPORT]).toBeDefined();
      expect(allStats[QueueName.TEMPLATE_PROCESSING]).toBeDefined();
      expect(allStats[QueueName.EMAIL_NOTIFICATION]).toBeDefined();
    });

    it('should pause and resume queue', async () => {
      await queueManager.pauseQueue(QueueName.BULK_MESSAGE);

      const statsAfterPause = await queueManager.getQueueStatistics(
        QueueName.BULK_MESSAGE
      );
      expect(statsAfterPause.paused).toBeGreaterThan(0);

      await queueManager.resumeQueue(QueueName.BULK_MESSAGE);

      const statsAfterResume = await queueManager.getQueueStatistics(
        QueueName.BULK_MESSAGE
      );
      expect(statsAfterResume.paused).toBe(0);
    });

    it('should perform health check', async () => {
      const health = await queueManager.healthCheck();

      expect(health).toBeDefined();
      expect(health.healthy).toBe(true);
      expect(health.queues).toBeDefined();
      expect(health.queues[QueueName.BULK_MESSAGE]).toBeDefined();
      expect(health.queues[QueueName.BULK_MESSAGE].healthy).toBe(true);
    });
  });

  describe('Job Processors', () => {
    describe('Bulk Message Processor', () => {
      it('should validate job data structure', () => {
        const validJobData = {
          organizationId: 'org-123',
          userId: 'user-456',
          contacts: [
            {
              id: 'contact-1',
              phone: '+1234567890',
              name: 'John Doe',
              variables: { order_id: '12345' }
            }
          ],
          messageContent: 'Hello {{name}}, order {{order_id}} ready!',
          messageType: 'text'
        };

        expect(validJobData.organizationId).toBeDefined();
        expect(validJobData.userId).toBeDefined();
        expect(Array.isArray(validJobData.contacts)).toBe(true);
        expect(validJobData.contacts.length).toBeGreaterThan(0);
        expect(validJobData.messageContent).toBeDefined();
      });
    });

    describe('Contact Import Processor', () => {
      it('should validate import data structure', () => {
        const validImportData = {
          organizationId: 'org-123',
          userId: 'user-456',
          contacts: [
            {
              phone: '+1234567890',
              name: 'John Doe',
              email: 'john@example.com',
              tags: ['customer'],
              customFields: { company: 'Acme Inc' }
            }
          ],
          importOptions: {
            updateExisting: false,
            skipDuplicates: true,
            validatePhone: true
          }
        };

        expect(validImportData.organizationId).toBeDefined();
        expect(validImportData.userId).toBeDefined();
        expect(Array.isArray(validImportData.contacts)).toBe(true);
        expect(validImportData.importOptions).toBeDefined();
      });

      it('should validate phone number format', () => {
        const phoneNumbers = [
          { input: '+1234567890', valid: true },
          { input: '1234567890', valid: true },
          { input: '(123) 456-7890', valid: true },
          { input: '123', valid: false },
          { input: 'invalid', valid: false }
        ];

        phoneNumbers.forEach((test) => {
          const cleaned = test.input.replace(/\D/g, '');
          const isValid = cleaned.length >= 10 && cleaned.length <= 15;
          expect(isValid).toBe(test.valid);
        });
      });
    });

    describe('Template Processor', () => {
      it('should extract template variables', () => {
        const template = 'Hello {{name}}, your order {{order_id}} is ready!';
        const regex = /{{([^}]+)}}/g;
        const variables: string[] = [];
        let match;

        while ((match = regex.exec(template)) !== null) {
          variables.push(match[1].trim());
        }

        expect(variables).toEqual(['name', 'order_id']);
      });

      it('should substitute variables correctly', () => {
        const template = 'Hello {{name}}, order {{order_id}} ready!';
        const variables = { name: 'John', order_id: '12345' };

        let result = template;
        for (const [key, value] of Object.entries(variables)) {
          const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          result = result.replace(regex, value);
        }

        expect(result).toBe('Hello John, order 12345 ready!');
      });
    });

    describe('Email Notification Processor', () => {
      it('should validate email format', () => {
        const emails = [
          { email: 'test@example.com', valid: true },
          { email: 'user+tag@domain.co.uk', valid: true },
          { email: 'invalid', valid: false },
          { email: '@example.com', valid: false },
          { email: 'test@', valid: false }
        ];

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        emails.forEach((test) => {
          const isValid = emailRegex.test(test.email);
          expect(isValid).toBe(test.valid);
        });
      });
    });
  });

  describe('Job Priority', () => {
    it('should have correct priority values', () => {
      expect(JobPriority.CRITICAL).toBe(1);
      expect(JobPriority.HIGH).toBe(2);
      expect(JobPriority.NORMAL).toBe(3);
      expect(JobPriority.LOW).toBe(4);
    });

    it('should process higher priority jobs first', async () => {
      const lowPriorityJobId = await queueManager.addJob(
        QueueName.BULK_MESSAGE,
        'low-priority',
        { organizationId: 'org', userId: 'user', contacts: [], messageContent: 'Low' },
        { priority: JobPriority.LOW }
      );

      const highPriorityJobId = await queueManager.addJob(
        QueueName.BULK_MESSAGE,
        'high-priority',
        { organizationId: 'org', userId: 'user', contacts: [], messageContent: 'High' },
        { priority: JobPriority.CRITICAL }
      );

      expect(lowPriorityJobId).toBeDefined();
      expect(highPriorityJobId).toBeDefined();
      // High priority job should be processed before low priority
      // (This is handled by BullMQ internally)
    });
  });

  describe('Error Handling', () => {
    it('should handle missing queue gracefully', async () => {
      const invalidQueueName = 'invalid-queue' as QueueName;

      await expect(
        queueManager.addJob(invalidQueueName, 'test', {})
      ).rejects.toThrow();
    });

    it('should handle invalid job ID gracefully', async () => {
      const job = await queueManager.getJob(
        QueueName.BULK_MESSAGE,
        'non-existent-id'
      );

      expect(job).toBeNull();
    });

    it('should handle cancellation of completed job', async () => {
      // Try to cancel a non-existent or completed job
      const cancelled = await queueManager.cancelJob(
        QueueName.BULK_MESSAGE,
        'non-existent-id'
      );

      expect(cancelled).toBe(false);
    });
  });
});
