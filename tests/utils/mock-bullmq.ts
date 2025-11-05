/**
 * BullMQ Mock for Testing
 *
 * Provides mock implementations of BullMQ Queue, Worker, and Job classes
 * for testing job queue functionality without Redis dependency.
 */

import type { Job, Queue, Worker, QueueEvents } from 'bullmq'

export interface MockJob<T = any> {
  id: string
  name: string
  data: T
  opts: any
  progress: number
  attemptsMade: number
  finishedOn?: number
  processedOn?: number
  failedReason?: string
  returnvalue?: any
  updateProgress: jest.Mock
  log: jest.Mock
  remove: jest.Mock
  retry: jest.Mock
  discard: jest.Mock
  getState: jest.Mock
}

export interface MockQueue<T = any> {
  name: string
  add: jest.Mock
  addBulk: jest.Mock
  getJob: jest.Mock
  getJobs: jest.Mock
  getJobCounts: jest.Mock
  getWaiting: jest.Mock
  getActive: jest.Mock
  getCompleted: jest.Mock
  getFailed: jest.Mock
  getDelayed: jest.Mock
  pause: jest.Mock
  resume: jest.Mock
  isPaused: jest.Mock
  clean: jest.Mock
  obliterate: jest.Mock
  removeRepeatable: jest.Mock
  getRepeatableJobs: jest.Mock
  drain: jest.Mock
  close: jest.Mock
}

export interface MockWorker<T = any> {
  name: string
  process: jest.Mock
  on: jest.Mock
  off: jest.Mock
  close: jest.Mock
  pause: jest.Mock
  resume: jest.Mock
  isPaused: jest.Mock
}

export interface MockQueueEvents {
  on: jest.Mock
  off: jest.Mock
  close: jest.Mock
}

/**
 * In-memory job storage for mock BullMQ
 */
class MockJobStorage {
  private jobs: Map<string, MockJob> = new Map()
  private jobsByState: Map<string, Set<string>> = new Map([
    ['waiting', new Set()],
    ['active', new Set()],
    ['completed', new Set()],
    ['failed', new Set()],
    ['delayed', new Set()],
  ])
  private nextJobId = 1

  createJob<T = any>(name: string, data: T, opts?: any): MockJob<T> {
    const jobId = opts?.jobId || String(this.nextJobId++)
    const job: MockJob<T> = {
      id: jobId,
      name,
      data,
      opts: opts || {},
      progress: 0,
      attemptsMade: 0,
      updateProgress: jest.fn((progress: number) => {
        job.progress = progress
        return Promise.resolve()
      }),
      log: jest.fn((message: string) => Promise.resolve()),
      remove: jest.fn(() => {
        this.removeJob(jobId)
        return Promise.resolve()
      }),
      retry: jest.fn(() => {
        this.moveJob(jobId, 'waiting')
        return Promise.resolve()
      }),
      discard: jest.fn(() => {
        this.moveJob(jobId, 'failed')
        return Promise.resolve()
      }),
      getState: jest.fn(() => {
        return Promise.resolve(this.getJobState(jobId))
      }),
    }

    this.jobs.set(jobId, job)
    this.jobsByState.get('waiting')!.add(jobId)
    return job
  }

  getJob(jobId: string): MockJob | undefined {
    return this.jobs.get(jobId)
  }

  getJobsByState(state: string): MockJob[] {
    const jobIds = this.jobsByState.get(state) || new Set()
    return Array.from(jobIds)
      .map((id) => this.jobs.get(id))
      .filter((job): job is MockJob => job !== undefined)
  }

  moveJob(jobId: string, toState: string): void {
    // Remove from all states
    this.jobsByState.forEach((jobs) => jobs.delete(jobId))
    // Add to new state
    this.jobsByState.get(toState)?.add(jobId)

    const job = this.jobs.get(jobId)
    if (job) {
      if (toState === 'completed') {
        job.finishedOn = Date.now()
      } else if (toState === 'active') {
        job.processedOn = Date.now()
      }
    }
  }

  removeJob(jobId: string): void {
    this.jobs.delete(jobId)
    this.jobsByState.forEach((jobs) => jobs.delete(jobId))
  }

  getJobState(jobId: string): string {
    for (const [state, jobs] of this.jobsByState.entries()) {
      if (jobs.has(jobId)) return state
    }
    return 'unknown'
  }

  getJobCounts(): Record<string, number> {
    return {
      waiting: this.jobsByState.get('waiting')!.size,
      active: this.jobsByState.get('active')!.size,
      completed: this.jobsByState.get('completed')!.size,
      failed: this.jobsByState.get('failed')!.size,
      delayed: this.jobsByState.get('delayed')!.size,
    }
  }

  clear(): void {
    this.jobs.clear()
    this.jobsByState.forEach((jobs) => jobs.clear())
  }
}

/**
 * Creates a mock BullMQ Queue
 * @param name - Queue name
 * @param storage - Optional shared storage for coordinated tests
 * @returns Mock Queue with jest mock functions
 */
export function createMockQueue<T = any>(
  name: string,
  storage?: MockJobStorage
): MockQueue<T> {
  const jobStorage = storage || new MockJobStorage()
  let paused = false

  return {
    name,
    add: jest.fn((jobName: string, data: T, opts?: any) => {
      const job = jobStorage.createJob(jobName, data, opts)
      return Promise.resolve(job)
    }),
    addBulk: jest.fn((jobs: Array<{ name: string; data: T; opts?: any }>) => {
      const createdJobs = jobs.map((job) => jobStorage.createJob(job.name, job.data, job.opts))
      return Promise.resolve(createdJobs)
    }),
    getJob: jest.fn((jobId: string) => {
      return Promise.resolve(jobStorage.getJob(jobId))
    }),
    getJobs: jest.fn((states: string[]) => {
      const jobs = states.flatMap((state) => jobStorage.getJobsByState(state))
      return Promise.resolve(jobs)
    }),
    getJobCounts: jest.fn(() => {
      return Promise.resolve(jobStorage.getJobCounts())
    }),
    getWaiting: jest.fn(() => {
      return Promise.resolve(jobStorage.getJobsByState('waiting'))
    }),
    getActive: jest.fn(() => {
      return Promise.resolve(jobStorage.getJobsByState('active'))
    }),
    getCompleted: jest.fn(() => {
      return Promise.resolve(jobStorage.getJobsByState('completed'))
    }),
    getFailed: jest.fn(() => {
      return Promise.resolve(jobStorage.getJobsByState('failed'))
    }),
    getDelayed: jest.fn(() => {
      return Promise.resolve(jobStorage.getJobsByState('delayed'))
    }),
    pause: jest.fn(() => {
      paused = true
      return Promise.resolve()
    }),
    resume: jest.fn(() => {
      paused = false
      return Promise.resolve()
    }),
    isPaused: jest.fn(() => {
      return Promise.resolve(paused)
    }),
    clean: jest.fn((grace: number, limit: number, type?: string) => {
      return Promise.resolve([])
    }),
    obliterate: jest.fn(() => {
      jobStorage.clear()
      return Promise.resolve()
    }),
    removeRepeatable: jest.fn(() => {
      return Promise.resolve(true)
    }),
    getRepeatableJobs: jest.fn(() => {
      return Promise.resolve([])
    }),
    drain: jest.fn(() => {
      jobStorage.clear()
      return Promise.resolve()
    }),
    close: jest.fn(() => {
      return Promise.resolve()
    }),
  }
}

/**
 * Creates a mock BullMQ Worker
 * @param name - Worker name
 * @param processor - Job processing function
 * @returns Mock Worker with jest mock functions
 */
export function createMockWorker<T = any>(
  name: string,
  processor?: (job: MockJob<T>) => Promise<any>
): MockWorker<T> {
  const eventHandlers: Map<string, Set<Function>> = new Map()
  let paused = false

  return {
    name,
    process: jest.fn(processor || (async (job: MockJob<T>) => {})),
    on: jest.fn((event: string, handler: Function) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set())
      }
      eventHandlers.get(event)!.add(handler)
    }),
    off: jest.fn((event: string, handler: Function) => {
      eventHandlers.get(event)?.delete(handler)
    }),
    close: jest.fn(() => {
      eventHandlers.clear()
      return Promise.resolve()
    }),
    pause: jest.fn(() => {
      paused = true
      return Promise.resolve()
    }),
    resume: jest.fn(() => {
      paused = false
      return Promise.resolve()
    }),
    isPaused: jest.fn(() => {
      return paused
    }),
  }
}

/**
 * Creates a mock BullMQ QueueEvents
 * @param name - Queue name
 * @returns Mock QueueEvents with jest mock functions
 */
export function createMockQueueEvents(name: string): MockQueueEvents {
  const eventHandlers: Map<string, Set<Function>> = new Map()

  return {
    on: jest.fn((event: string, handler: Function) => {
      if (!eventHandlers.has(event)) {
        eventHandlers.set(event, new Set())
      }
      eventHandlers.get(event)!.add(handler)
    }),
    off: jest.fn((event: string, handler: Function) => {
      eventHandlers.get(event)?.delete(handler)
    }),
    close: jest.fn(() => {
      eventHandlers.clear()
      return Promise.resolve()
    }),
  }
}

/**
 * Create a shared job storage for coordinated testing
 * Useful when Queue and Worker need to share job state
 */
export function createSharedJobStorage(): MockJobStorage {
  return new MockJobStorage()
}

/**
 * Helper to simulate job processing
 * @param queue - Mock queue
 * @param worker - Mock worker
 * @param jobId - Job ID to process
 */
export async function simulateJobProcessing(
  queue: MockQueue,
  worker: MockWorker,
  jobId: string
): Promise<void> {
  const job = await queue.getJob(jobId)
  if (!job) {
    throw new Error(`Job ${jobId} not found`)
  }

  // Move to active
  const storage = new MockJobStorage()
  storage.moveJob(jobId, 'active')

  try {
    // Process the job
    if (worker.process.getMockImplementation()) {
      const result = await worker.process(job)
      job.returnvalue = result
    }

    // Move to completed
    storage.moveJob(jobId, 'completed')
  } catch (error) {
    // Move to failed
    job.failedReason = error instanceof Error ? error.message : String(error)
    storage.moveJob(jobId, 'failed')
    throw error
  }
}

/**
 * Example Usage:
 *
 * ```typescript
 * // Basic queue usage
 * const queue = createMockQueue('email-queue')
 * const job = await queue.add('send-email', { to: 'test@example.com', subject: 'Test' })
 * expect(queue.add).toHaveBeenCalledWith('send-email', expect.any(Object))
 *
 * // Worker with processor
 * const worker = createMockWorker('email-queue', async (job) => {
 *   console.log('Processing:', job.data)
 *   await job.updateProgress(50)
 *   return { sent: true }
 * })
 *
 * // Shared storage for Queue and Worker
 * const storage = createSharedJobStorage()
 * const queue = createMockQueue('test-queue', storage)
 * const worker = createMockWorker('test-queue')
 *
 * const job = await queue.add('test-job', { data: 'test' })
 * await simulateJobProcessing(queue, worker, job.id)
 *
 * // Queue events
 * const queueEvents = createMockQueueEvents('test-queue')
 * queueEvents.on('completed', (job) => {
 *   console.log('Job completed:', job.id)
 * })
 * ```
 */

export default {
  createMockQueue,
  createMockWorker,
  createMockQueueEvents,
  createSharedJobStorage,
  simulateJobProcessing,
}
