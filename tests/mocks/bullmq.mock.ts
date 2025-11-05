/**
 * BullMQ Mock Factory
 *
 * Mocking utilities for BullMQ queue operations.
 */

import { Queue, Worker, Job } from 'bullmq'

// =============================================================================
// Mock Queue
// =============================================================================

export function createMockQueue(name: string): jest.Mocked<Partial<Queue>> {
  return {
    name,
    add: jest.fn().mockResolvedValue({
      id: 'job-test-123',
      name: 'test-job',
      data: {},
    } as any),
    addBulk: jest.fn().mockResolvedValue([
      {
        id: 'job-test-1',
        name: 'test-job',
        data: {},
      },
    ] as any),
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    getJob: jest.fn().mockResolvedValue(null),
    getJobs: jest.fn().mockResolvedValue([]),
    getJobCounts: jest.fn().mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    }),
    clean: jest.fn().mockResolvedValue([]),
    obliterate: jest.fn().mockResolvedValue(undefined),
  } as any
}

// =============================================================================
// Mock Worker
// =============================================================================

export function createMockWorker(name: string): jest.Mocked<Partial<Worker>> {
  return {
    name,
    pause: jest.fn().mockResolvedValue(undefined),
    resume: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    on: jest.fn().mockReturnThis(),
  } as any
}

// =============================================================================
// Mock Job
// =============================================================================

export function createMockJob(data: any = {}): jest.Mocked<Partial<Job>> {
  return {
    id: 'job-test-123',
    name: 'test-job',
    data,
    opts: {},
    progress: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    retry: jest.fn().mockResolvedValue(undefined),
  } as any
}

// =============================================================================
// Export
// =============================================================================

export default {
  createMockQueue,
  createMockWorker,
  createMockJob,
}
