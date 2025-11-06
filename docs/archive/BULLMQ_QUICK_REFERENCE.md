# BullMQ Quick Reference Card

## Quick Start

### 1. Initialize Queue Manager (Server Startup)

```typescript
import { initializeQueueManager } from '@/lib/queue/queue-manager'

// In app/layout.tsx or server startup
await initializeQueueManager()
```

### 2. Queue a Bulk Message Job

```typescript
import { getQueueManager } from '@/lib/queue/queue-manager'
import { QueueName, JobPriority } from '@/lib/queue/bull-config'

const queueManager = getQueueManager()

const jobId = await queueManager.addJob(
  QueueName.BULK_MESSAGE,
  'send-bulk-message',
  {
    organizationId: 'org-uuid',
    userId: 'user-uuid',
    contacts: [{ id: 'contact-1', phone: '+1234567890', name: 'John' }],
    messageContent: 'Hello {{name}}!',
    messageType: 'text',
  },
  { priority: JobPriority.CRITICAL }
)
```

### 3. Check Job Status

```typescript
const job = await queueManager.getJob(QueueName.BULK_MESSAGE, jobId)

console.log(`Status: ${job.state}`)
console.log(`Progress: ${job.progress}%`)
```

### 4. Via API Endpoints

```bash
# Queue bulk message
curl -X POST https://your-domain.com/api/jobs/bulk-message \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contactIds": ["uuid1", "uuid2"],
    "messageContent": "Hello!",
    "priority": 1
  }'

# Check status
curl https://your-domain.com/api/jobs/{jobId} \
  -H "Authorization: Bearer TOKEN"

# Get statistics
curl https://your-domain.com/api/jobs/stats \
  -H "Authorization: Bearer TOKEN"

# Cancel job
curl -X DELETE https://your-domain.com/api/jobs/{jobId} \
  -H "Authorization: Bearer TOKEN"
```

## Queue Names

```typescript
QueueName.BULK_MESSAGE // Bulk WhatsApp messages
QueueName.CONTACT_IMPORT // Contact CSV imports
QueueName.TEMPLATE_PROCESSING // Message templates
QueueName.EMAIL_NOTIFICATION // Email notifications
```

## Job Priorities

```typescript
JobPriority.CRITICAL = 1 // User actions (immediate)
JobPriority.HIGH = 2 // Scheduled campaigns
JobPriority.NORMAL = 3 // Background imports
JobPriority.LOW = 4 // Analytics
```

## Common Operations

### Cancel Job

```typescript
await queueManager.cancelJob(QueueName.BULK_MESSAGE, jobId)
```

### Retry Failed Job

```typescript
await queueManager.retryJob(QueueName.BULK_MESSAGE, jobId)
```

### Get Queue Stats

```typescript
const stats = await queueManager.getQueueStatistics(QueueName.BULK_MESSAGE)
// { waiting: 5, active: 2, completed: 100, failed: 3 }
```

### Pause/Resume Queue

```typescript
await queueManager.pauseQueue(QueueName.BULK_MESSAGE)
await queueManager.resumeQueue(QueueName.BULK_MESSAGE)
```

### Get Failed Jobs

```typescript
const failed = await queueManager.getFailedJobs(QueueName.BULK_MESSAGE, 0, 10)
```

### Clean Old Jobs

```typescript
// Clean completed (1 hour old)
await queueManager.cleanCompletedJobs(QueueName.BULK_MESSAGE, 3600000)

// Clean failed (24 hours old)
await queueManager.cleanFailedJobs(QueueName.BULK_MESSAGE, 86400000)
```

## Dashboard Component

```tsx
import { JobDashboard } from '@/components/admin/job-dashboard'

export default function AdminJobsPage() {
  return <JobDashboard />
}
```

## Database Queries

```sql
-- Recent failed jobs
SELECT * FROM job_logs WHERE status = 'failed' ORDER BY created_at DESC LIMIT 10;

-- Job stats for organization (last 7 days)
SELECT * FROM get_organization_job_stats('org-uuid', 7);

-- Cleanup old logs (keep 90 days)
SELECT cleanup_old_job_logs(90);
```

## Environment Variables

```env
UPSTASH_REDIS_REST_URL=https://your-redis-host:6379
UPSTASH_REDIS_REST_TOKEN=your-redis-token
RESEND_API_KEY=re_your_resend_key
RESEND_FROM_EMAIL=notifications@adsapp.com
```

## Error Handling

Jobs automatically retry 3 times with exponential backoff (1s, 2s, 4s).

```typescript
// In processor
try {
  await processItem(item)
  successCount++
} catch (error) {
  failedItems.push({ item, error: error.message })
  failureCount++
}
```

## Performance Limits

| Queue          | Rate Limit | Workers | Timeout |
| -------------- | ---------- | ------- | ------- |
| Bulk Messages  | 12-13/sec  | 5       | 10 min  |
| Contact Import | No limit   | 2       | 30 min  |
| Templates      | No limit   | 10      | 3 min   |
| Emails         | 10/sec     | 10      | 1 min   |

## Troubleshooting

**Jobs not processing?**

1. Check Redis connection
2. Verify queue manager initialized
3. Check queue not paused

**High failure rate?**

1. Review job_logs for patterns
2. Check API credentials
3. Verify rate limits

**Slow processing?**

1. Increase worker concurrency
2. Check network latency
3. Optimize batch sizes

## Health Check

```typescript
const health = await queueManager.healthCheck()
// {
//   healthy: true,
//   queues: {
//     'bulk-messages': { healthy: true, stats: {...} }
//   }
// }
```

## Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  await queueManager.shutdown()
  process.exit(0)
})
```

## Full Documentation

See `BULLMQ_IMPLEMENTATION.md` for complete guide.
