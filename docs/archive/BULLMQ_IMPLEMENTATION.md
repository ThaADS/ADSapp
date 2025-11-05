# BullMQ Job Queue System - Implementation Guide

## Overview

The ADSapp platform now includes a production-ready job queue system built on BullMQ with Redis backend. This system handles asynchronous processing for bulk operations, contact imports, template processing, and email notifications with comprehensive monitoring and error handling.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        BullMQ Job Queue System                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │   Queues    │───▶│   Workers    │───▶│   Processors    │   │
│  └─────────────┘    └──────────────┘    └─────────────────┘   │
│         │                   │                      │            │
│         │                   │                      │            │
│         ▼                   ▼                      ▼            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Redis (Upstash)                            │   │
│  │  • Job Storage                                          │   │
│  │  • Queue Management                                     │   │
│  │  • Progress Tracking                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │          PostgreSQL (Supabase)                          │   │
│  │  • Job Logs                                             │   │
│  │  • Job History                                          │   │
│  │  • Analytics                                            │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Queue Types

1. **Bulk Message Queue** (`bulk-messages`)
   - Sends WhatsApp messages to multiple contacts
   - Rate limiting: 12-13 messages/second
   - Concurrency: 5 workers
   - Priority support

2. **Contact Import Queue** (`contact-import`)
   - Processes CSV/Excel contact imports
   - Data validation and deduplication
   - Concurrency: 2 workers
   - Batch processing (100 contacts per batch)

3. **Template Processing Queue** (`template-processing`)
   - Compiles message templates
   - Variable substitution
   - Concurrency: 10 workers

4. **Email Notification Queue** (`email-notification`)
   - Sends emails via Resend
   - Rate limiting: 10 emails/second
   - Concurrency: 10 workers
   - Batch sending support

## Installation

Dependencies are already installed:
- `bullmq@^5.61.0` - Job queue library
- `ioredis@^5.8.1` - Redis client for BullMQ
- `@types/ioredis@^4.28.10` - TypeScript types

## Configuration

### Environment Variables

Required environment variables:
```env
# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://your-redis-host:6379
UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Email (Resend)
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=notifications@adsapp.com
```

### Queue Configuration

Default configurations are defined in `src/lib/queue/bull-config.ts`:

```typescript
// Job priorities
JobPriority.CRITICAL = 1  // User-initiated actions
JobPriority.HIGH = 2      // Scheduled campaigns
JobPriority.NORMAL = 3    // Background imports
JobPriority.LOW = 4       // Analytics processing

// Retry configuration
attempts: 3
backoff: {
  type: 'exponential',
  delay: 1000  // Starting delay in milliseconds
}

// Job retention
removeOnComplete: 100   // Keep last 100 completed jobs
removeOnFail: 1000     // Keep last 1000 failed jobs
```

## Usage

### 1. Initializing Queue Manager

Initialize the queue manager at application startup (e.g., in `src/app/layout.tsx` or server startup):

```typescript
import { initializeQueueManager } from '@/lib/queue/queue-manager';

// At server startup
await initializeQueueManager();
```

### 2. Creating Jobs via API

#### Bulk Message Sending

```bash
POST /api/jobs/bulk-message
Content-Type: application/json
Authorization: Bearer <token>

{
  "contactIds": ["uuid1", "uuid2", "uuid3"],
  "messageContent": "Hello {{name}}, your order {{order_id}} is ready!",
  "messageType": "text",
  "priority": 1
}
```

Response:
```json
{
  "success": true,
  "jobId": "12345",
  "message": "Bulk message job queued for 3 contacts"
}
```

#### Contact Import

```bash
POST /api/jobs/import-contacts
Content-Type: application/json
Authorization: Bearer <token>

{
  "contacts": [
    {
      "phone": "+1234567890",
      "name": "John Doe",
      "email": "john@example.com",
      "tags": ["customer", "vip"],
      "customFields": {
        "company": "Acme Inc"
      }
    }
  ],
  "importOptions": {
    "updateExisting": false,
    "skipDuplicates": true,
    "validatePhone": true
  }
}
```

#### Check Job Status

```bash
GET /api/jobs/{jobId}
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "job": {
    "id": "12345",
    "name": "send-bulk-message",
    "queueName": "bulk-messages",
    "progress": 75,
    "state": "active",
    "attemptsMade": 0,
    "attemptsTotal": 3,
    "data": { ... }
  }
}
```

#### Cancel Job

```bash
DELETE /api/jobs/{jobId}
Authorization: Bearer <token>
```

#### Get Queue Statistics

```bash
GET /api/jobs/stats
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "queueStats": {
    "bulk-messages": {
      "waiting": 5,
      "active": 2,
      "completed": 150,
      "failed": 3,
      "delayed": 0,
      "paused": 0
    }
  },
  "historicalStats": {
    "total": 200,
    "completed": 180,
    "failed": 10,
    "running": 10
  },
  "recentJobs": [ ... ]
}
```

### 3. Using Queue Manager Programmatically

```typescript
import { getQueueManager } from '@/lib/queue/queue-manager';
import { QueueName, JobPriority } from '@/lib/queue/bull-config';

const queueManager = getQueueManager();

// Add a job
const jobId = await queueManager.addJob(
  QueueName.BULK_MESSAGE,
  'send-bulk-message',
  {
    organizationId: 'org-uuid',
    userId: 'user-uuid',
    contacts: [...],
    messageContent: 'Hello!'
  },
  {
    priority: JobPriority.CRITICAL,
    delay: 5000  // Delay 5 seconds
  }
);

// Get job status
const job = await queueManager.getJob(QueueName.BULK_MESSAGE, jobId);

// Cancel job
await queueManager.cancelJob(QueueName.BULK_MESSAGE, jobId);

// Retry failed job
await queueManager.retryJob(QueueName.BULK_MESSAGE, jobId);

// Get queue statistics
const stats = await queueManager.getQueueStatistics(QueueName.BULK_MESSAGE);

// Pause queue
await queueManager.pauseQueue(QueueName.BULK_MESSAGE);

// Resume queue
await queueManager.resumeQueue(QueueName.BULK_MESSAGE);
```

### 4. Job Dashboard Component

Use the admin dashboard component to monitor jobs:

```tsx
import { JobDashboard } from '@/components/admin/job-dashboard';

export default function AdminJobsPage() {
  return (
    <div className="container mx-auto p-6">
      <JobDashboard />
    </div>
  );
}
```

Features:
- Real-time queue statistics
- Job status indicators
- Recent job history
- Auto-refresh (every 5 seconds)
- Queue health monitoring

## Database Schema

### Job Logs Table

```sql
CREATE TABLE job_logs (
  id UUID PRIMARY KEY,
  job_id TEXT NOT NULL,
  job_type TEXT NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES profiles(id),
  status TEXT NOT NULL,
  result JSONB,
  error_details JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Job Schedules Table (Optional)

```sql
CREATE TABLE job_schedules (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES profiles(id),
  job_type TEXT NOT NULL,
  job_name TEXT NOT NULL,
  job_data JSONB NOT NULL,
  schedule_type TEXT NOT NULL,
  schedule_config JSONB NOT NULL,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Job Processors

### Bulk Message Processor

Features:
- WhatsApp Business API integration
- Variable substitution
- Rate limiting (12-13 msg/sec)
- Per-message error tracking
- Progress updates

Error Handling:
- Individual message failures don't stop the batch
- Failed messages are logged with error details
- Retry logic with exponential backoff

### Contact Import Processor

Features:
- CSV/Excel parsing support
- Phone number validation and formatting
- Email validation
- Duplicate detection
- Batch database inserts (100 per batch)
- Update existing or skip duplicates

Validation:
- Phone: 10-15 digits with optional country code
- Email: Standard RFC 5322 format
- Required fields check

### Template Processor

Features:
- Variable extraction and validation
- Template compilation
- Personalized message generation
- Batch processing

Variable Substitution:
```typescript
// Template: "Hello {{name}}, your order {{order_id}} is ready!"
// Variables: { name: "John", order_id: "12345" }
// Result: "Hello John, your order 12345 is ready!"
```

### Email Notification Processor

Features:
- Resend API integration
- Batch sending (10 emails/sec)
- HTML and text email support
- Attachment support
- Delivery tracking

Email Types:
- `welcome` - Welcome emails
- `password_reset` - Password reset emails
- `notification` - General notifications
- `campaign` - Marketing campaigns
- `system` - System notifications

## Performance Characteristics

### Throughput

- **Bulk Messages**: 12-13 messages/second (WhatsApp API limit)
- **Contact Import**: ~1000 contacts/minute
- **Template Processing**: ~600 templates/minute
- **Email Notifications**: 10 emails/second (Resend limit)

### Latency

- **Job Creation**: < 100ms
- **Job Status Query**: < 50ms
- **Queue Stats**: < 200ms
- **Small Batch (10 items)**: 1-2 seconds
- **Medium Batch (100 items)**: 10-20 seconds
- **Large Batch (1000 items)**: 2-5 minutes

### Resource Usage

- **Redis Memory**: ~1-2 MB per 1000 jobs
- **Database Storage**: ~1 KB per job log
- **Worker Memory**: ~50-100 MB per worker

## Monitoring and Debugging

### Health Checks

```typescript
import { getQueueManager } from '@/lib/queue/queue-manager';

const queueManager = getQueueManager();
const health = await queueManager.healthCheck();

console.log(health);
// {
//   healthy: true,
//   queues: {
//     'bulk-messages': { healthy: true, stats: {...} },
//     'contact-import': { healthy: true, stats: {...} }
//   }
// }
```

### Logging

All job processors log to console:
- Job start: `[QueueName] Starting job {id} for {count} items`
- Progress: `[QueueName] Job {id}: {current}/{total} processed`
- Completion: `[QueueName] Job {id} completed: {success} success, {failed} failed, {duration}ms`
- Errors: `[QueueName] Error processing {item}:`, error

### Database Analytics

Query job statistics:
```sql
-- Get stats for last 30 days
SELECT * FROM get_organization_job_stats('org-uuid', 30);

-- Clean up old logs (keep 90 days)
SELECT cleanup_old_job_logs(90);

-- Recent failed jobs
SELECT *
FROM job_logs
WHERE organization_id = 'org-uuid'
  AND status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

### Failed Job Recovery

```typescript
// Get failed jobs
const failedJobs = await queueManager.getFailedJobs(
  QueueName.BULK_MESSAGE,
  0,  // start
  10  // end
);

// Retry specific job
await queueManager.retryJob(QueueName.BULK_MESSAGE, failedJobs[0].id);

// Clean up old failed jobs
await queueManager.cleanFailedJobs(
  QueueName.BULK_MESSAGE,
  86400000  // 24 hours
);
```

## Error Handling

### Automatic Retry

All jobs automatically retry on failure:
- Attempts: 3 (configurable per queue)
- Backoff: Exponential (1s, 2s, 4s)
- Max timeout: 5 minutes (configurable)

### Error Types

1. **Transient Errors** (retryable)
   - Network timeouts
   - Rate limit exceeded
   - Temporary API errors

2. **Permanent Errors** (not retryable)
   - Invalid phone numbers
   - Missing required data
   - Authentication failures

3. **Partial Failures**
   - Some items succeed, some fail
   - Status: `partial_success` or `partial_failure`
   - Failed items logged in `error_details`

## Best Practices

### 1. Job Size

- Keep jobs focused on single operations
- For large datasets (>1000 items), consider splitting into multiple jobs
- Use batch processing for database operations

### 2. Priority Management

```typescript
// Critical: User-initiated, real-time actions
JobPriority.CRITICAL  // Reply to customer message

// High: Scheduled, time-sensitive
JobPriority.HIGH      // Scheduled campaign at 9 AM

// Normal: Background tasks
JobPriority.NORMAL    // Nightly contact sync

// Low: Analytics, non-urgent
JobPriority.LOW       // Generate monthly reports
```

### 3. Error Handling

```typescript
// In job processor
try {
  // Process item
  await processItem(item);
  successCount++;
} catch (error) {
  // Log error but continue processing
  failedItems.push({ item, error: error.message });
  failureCount++;
}
```

### 4. Progress Tracking

```typescript
// Update progress regularly
for (let i = 0; i < items.length; i++) {
  await processItem(items[i]);

  // Update every 10 items or at completion
  if (i % 10 === 0 || i === items.length - 1) {
    const progress = Math.round(((i + 1) / items.length) * 100);
    await job.updateProgress(progress);
  }
}
```

### 5. Resource Management

- Use connection pooling for database operations
- Close resources in finally blocks
- Implement graceful shutdown

```typescript
// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await queueManager.shutdown();
  process.exit(0);
});
```

## Testing

### Unit Tests

```typescript
import { processBulkMessage } from '@/lib/queue/processors/bulk-message-processor';

describe('Bulk Message Processor', () => {
  it('should send messages to all contacts', async () => {
    const job = {
      id: 'test-job',
      data: {
        organizationId: 'org-uuid',
        userId: 'user-uuid',
        contacts: [
          { id: '1', phone: '+1234567890', name: 'Test' }
        ],
        messageContent: 'Test message'
      },
      updateProgress: jest.fn()
    };

    const result = await processBulkMessage(job as any);

    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(0);
  });
});
```

### Integration Tests

```typescript
describe('Job API', () => {
  it('should queue bulk message job', async () => {
    const response = await fetch('/api/jobs/bulk-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        contactIds: ['uuid1', 'uuid2'],
        messageContent: 'Test',
        priority: 1
      })
    });

    expect(response.status).toBe(202);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.jobId).toBeDefined();
  });
});
```

## Troubleshooting

### Common Issues

1. **Jobs not processing**
   - Check Redis connection: `UPSTASH_REDIS_REST_URL` configured?
   - Check workers are running: Queue manager initialized?
   - Check queue is not paused: Use resume API

2. **High failure rate**
   - Check API credentials (WhatsApp, Resend)
   - Review error logs in database
   - Check rate limits not exceeded

3. **Slow processing**
   - Increase worker concurrency
   - Optimize batch sizes
   - Check network latency to APIs

4. **Memory issues**
   - Reduce job retention (`removeOnComplete`, `removeOnFail`)
   - Clean up old job logs regularly
   - Monitor Redis memory usage

### Debug Mode

Enable debug logging:
```typescript
// In bull-config.ts
const worker = new Worker(queueName, processor, {
  connection,
  concurrency,
  autorun: true,
  // Enable debug events
  removeOnComplete: false,
  removeOnFail: false
});

worker.on('progress', (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});

worker.on('stalled', (jobId) => {
  console.warn(`Job ${jobId} stalled`);
});
```

## Future Enhancements

1. **Job Scheduling**
   - Cron-based recurring jobs
   - Calendar scheduling
   - Time zone support

2. **Advanced Features**
   - Job dependencies (wait for job A before job B)
   - Job batching (combine small jobs)
   - Priority queues with weights

3. **Monitoring**
   - Prometheus metrics
   - Grafana dashboards
   - Alert notifications

4. **Performance**
   - Job result caching
   - Optimistic locking
   - Connection pooling

## Support

For issues or questions:
1. Check logs in `job_logs` table
2. Review error details in job result
3. Consult BullMQ documentation: https://docs.bullmq.io
4. Check Redis health: `GET /api/health`

## References

- BullMQ Documentation: https://docs.bullmq.io
- Redis Best Practices: https://redis.io/docs/getting-started/
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp
- Resend API: https://resend.com/docs
