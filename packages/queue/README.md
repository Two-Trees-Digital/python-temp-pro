# queue — BullMQ Queue Factory

> **BullMQ 5.x** | IORedis | TypeScript | Redis

Shared Redis-backed job queue factory and connection management for the monorepo. Provides a generic queue factory, connection pooling utilities, and re-exports BullMQ classes for use across apps and workers.

---

## Purpose

The queue package centralizes all asynchronous job processing infrastructure:
- Generic queue factory for creating new queues
- Redis connection management with TLS support
- Optimized for BullMQ's blocking operations
- Type-safe exports for TypeScript projects

By extracting this to a workspace package, all apps (dashboard, worker, etc.) use the same queue management, ensuring consistency across the monorepo.

---

## Quick Start

```typescript
// Create a queue (in your app)
import { QueueMQ } from 'queue';

const myQueue = QueueMQ('my-queue');
await myQueue.add('my-job', { data: 'value' });

// Process jobs (in your worker)
import { Worker, makeConnection } from 'queue';

const worker = new Worker('my-queue', processor, {
  connection: makeConnection(),
});

worker.on('completed', (job) => {
  console.log('Job completed:', job.id);
});
```

---

## Architecture

### Redis Connection Management

Redis is the backing store for BullMQ. The package manages two types of connections:

**Shared Connection** (`connection`)
- Single IORedis instance shared across all Queue producers
- Used for enqueuing jobs from apps
- Lightweight, read-write optimized
- Safe to share across multiple producer instances

**Worker Connections** (`makeConnection()`)
- Fresh IORedis instance created per Worker
- **Required** because Workers use blocking commands (BLPOP, BRPOP)
- Each Worker must have its own dedicated connection
- Prevents connection exhaustion and command queuing issues

```typescript
import { connection, makeConnection } from 'queue';

// Producer: use shared connection (automatically used by QueueMQ)
const queue = QueueMQ('my-queue'); // Internally uses shared connection

// Worker: create fresh connection
const worker = new Worker('my-queue', processor, {
  connection: makeConnection(),
});
```

### Redis Configuration

**URL Parsing:**
- Reads from environment variable: `REDIS_URL`
- Falls back to localhost: `redis://localhost:6379`
- Auto-detects TLS: If URL starts with `rediss://`, TLS is enabled

**IORedis Options:**
```typescript
{
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
}
```

These options are critical for BullMQ:
- `maxRetriesPerRequest: null` — Allows blocking commands (BLPOP, BRPOP)
- `enableReadyCheck: false` — Prevents "not ready" errors with pipelining

### Queue Factory

`QueueMQ(name)` creates a BullMQ Queue with sensible defaults:

```typescript
function QueueMQ(queueName: string): Queue {
  return new Queue(queueName, {
    connection,
    defaultJobOptions: {
      removeOnComplete: 100,  // Keep last 100 completed jobs
      removeOnFail: 5_000,    // Keep failed jobs for 5 seconds
    },
  });
}
```

---

## API Reference

### Connection Functions

#### `makeConnection(): IORedis`

Creates a fresh IORedis connection for use with Workers.

```typescript
import { makeConnection } from 'queue';

const connection = makeConnection();
// Use with Worker
const worker = new Worker('my-queue', processor, { connection });
```

**Returns:** Fresh IORedis instance with BullMQ-compatible options

**When to use:** Every Worker instance should call this function

**Important:** Do NOT share the connection between multiple workers. Each worker needs its own.

### Queue Factory

#### `QueueMQ(name): Queue`

Creates a BullMQ Queue with default settings.

```typescript
import { QueueMQ } from 'queue';

const queue = QueueMQ('my-queue');

// Enqueue a job
await queue.add('my-job', {
  userId: 'user-123',
  data: 'some-data',
});

// Enqueue with options
await queue.add('my-job', jobData, {
  attempts: 3,        // Retry up to 3 times
  backoff: {
    type: 'exponential',
    delay: 2000,      // Start with 2 second delay
  },
});
```

**Returns:** BullMQ Queue instance using the shared connection

### Re-exports

```typescript
import {
  Worker,          // BullMQ Worker class
  Job,             // BullMQ Job class
  Queue,           // BullMQ Queue class
  connection,      // Shared IORedis connection
  QueueMQ,         // Queue factory
  makeConnection,  // Connection factory for workers
} from 'queue';
```

All major BullMQ classes and custom factories are re-exported for convenience.

---

## Usage Patterns

### Enqueuing Jobs from Next.js API Route

```typescript
// apps/dashboard/src/app/api/send-email/route.ts
import { QueueMQ } from 'queue';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  
  const emailQueue = QueueMQ('email-verification-queue');
  const job = await emailQueue.add('verify-email', {
    name: body.name,
    email: body.email,
    token: body.token,
  });
  
  return NextResponse.json({
    jobId: job.id,
    status: 'queued',
  });
}
```

### Processing Jobs with a Worker

```typescript
// apps/worker/src/index.ts
import { Worker, makeConnection } from 'queue';

async function processor(job) {
  console.log(`Processing job: ${job.id}`);
  
  const { name, email, token } = job.data;
  
  // Do your work here
  // Send email, update database, etc.
  
  return { success: true };
}

const worker = new Worker('email-verification-queue', processor, {
  connection: makeConnection(),
  concurrency: 2, // Process 2 jobs in parallel
});

worker.on('completed', (job) => {
  console.log(`Job ${job?.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});
```

### Adding Multiple Queues

```typescript
// apps/worker/src/index.ts
import { Worker, makeConnection } from 'queue';

// Email queue
const emailWorker = new Worker('email-queue', emailProcessor, {
  connection: makeConnection(),
});

// Notification queue
const notifyWorker = new Worker('notification-queue', notifyProcessor, {
  connection: makeConnection(),
});

// Data export queue
const exportWorker = new Worker('data-export-queue', exportProcessor, {
  connection: makeConnection(),
});
```

### Error Handling & Retries

BullMQ provides automatic retry logic:

```typescript
const queue = QueueMQ('my-queue');

await queue.add(
  'my-job',
  jobData,
  {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 second delay
    },
    removeOnFail: 5000, // Keep failed jobs for 5 seconds
  }
);

// Handle failures in worker
const worker = new Worker('my-queue', processor, {
  connection: makeConnection(),
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed: ${err.message}`);
  // Implement custom error handling, alerting, etc.
});
```

### Monitoring Job Status

```typescript
import { QueueMQ } from 'queue';

const queue = QueueMQ('my-queue');

// Get job by ID
const job = await queue.getJob('job-123');
if (job) {
  console.log('Status:', await job.getState()); // 'active', 'completed', 'failed', etc.
  console.log('Progress:', job.progress());
  console.log('Attempt:', job.attemptsMade);
}

// Get all jobs by state
const activeJobs = await queue.getJobs(['active']);
const waitingJobs = await queue.getJobs(['waiting']);
const failedJobs = await queue.getJobs(['failed']);

// Get job counts
const counts = await queue.getJobCounts();
console.log(`Active: ${counts.active}, Waiting: ${counts.waiting}, Failed: ${counts.failed}`);
```

---

## Package Structure

```
packages/queue/
├── index.ts           # Main entry point with factory and exports
├── package.json       # Package definition
├── tsconfig.json      # TypeScript config (target: ES2020, module: commonjs)
└── dist/              # Compiled output (CommonJS)
    └── index.js
```

---

## Build & Compilation

This package exports TypeScript types and CommonJS bundles:

```bash
# From monorepo root
pnpm build -F queue
```

**Compilation:**
- Target: ES2020
- Module: CommonJS (for Node.js and Docker)
- Declaration: true (generates .d.ts files)
- Output: `dist/index.js`

---

## Environment Variables

Only one required environment variable:

```env
# Redis connection URL
# Default: redis://localhost:6379
# For TLS: rediss://user:password@host:port
REDIS_URL=redis://localhost:6379
```

### Auto-Detection

- If `REDIS_URL` starts with `rediss://`, TLS is automatically enabled
- Falls back to `localhost:6379` if not set (for local development convenience)

---

## Dependencies

- **bullmq@5.x** — Job queue library
- **ioredis@5.x** — Redis client with TLS support

---

## Critical Implementation Notes

### Worker Connection Isolation

Each Worker instance MUST have its own connection created via `makeConnection()`:

```typescript
// CORRECT: Fresh connection per worker
const worker1 = new Worker('queue-1', processor1, {
  connection: makeConnection(),
});
const worker2 = new Worker('queue-2', processor2, {
  connection: makeConnection(),
});

// WRONG: Sharing connection between workers
const sharedConn = makeConnection();
const worker1 = new Worker('queue-1', processor1, {
  connection: sharedConn,  // Don't share — causes timeouts
});
```

**Why:** Workers use BLPOP and BRPOP (blocking commands). Multiple workers on the same connection cause command queueing and timeouts.

### Producer Connection Sharing

All Queue producers can safely share the `connection` export:

```typescript
// OK to share — producers don't use blocking commands
import { connection, QueueMQ } from 'queue';

const appQueue = QueueMQ('app-queue');      // Uses shared connection
const notifyQueue = QueueMQ('notify-queue'); // Uses shared connection

await appQueue.add(...);
await notifyQueue.add(...);
```

### TLS Configuration

For secure Redis (e.g., Upstash, Redis Cloud):

```env
# URL with TLS (rediss://)
REDIS_URL=rediss://user:password@redis.cloud.redhat.com:12345
```

The package automatically detects and enables TLS when URL starts with `rediss://`.

---

## Troubleshooting

### "READONLY You can't write against a read only replica" Error

Common with Redis Cluster or failover scenarios.

**Solution:** Ensure `REDIS_URL` points to the primary/master node, not read-only replicas.

### "getaddrinfo ENOTFOUND redis" Error

Redis is not reachable.

**Check:**
1. Redis service is running: `redis-cli ping`
2. `REDIS_URL` is correct: `echo $REDIS_URL`
3. Network connectivity to Redis host

### Worker hangs / Job never processes

Workers are likely waiting on blocking commands with shared connections.

**Solution:** Ensure each Worker uses `makeConnection()` with its own dedicated connection instance.

### "Cannot find module 'queue'" in Docker

Queue package wasn't built before image creation.

**Solution:** Run `pnpm build` before `docker build`, or ensure Docker build runs the build step.

---

## Performance Considerations

### Connection Pooling

- Shared connection for producers: 1 per app instance
- Worker connections: 1 per worker (not pooled, dedicated)
- Default ioredis pool size: 10 connections (if using Redis Cluster)

### Job Throughput

Default job options in `QueueMQ`:
- Keep last 100 completed jobs (to not bloat Redis)
- Remove failed jobs after 5 seconds (for quick cleanup)
- Adjust `removeOnComplete` and `removeOnFail` if you need longer job history

### Scaling

For high-volume job processing:
1. Increase Worker concurrency: `{ concurrency: 10 }`
2. Add multiple worker processes/instances
3. Use Redis Cluster for distributed queue
4. Monitor Redis memory usage (jobs are stored in memory)

---

## Related Documentation

- **BullMQ Documentation** — https://docs.bullmq.io
- **IORedis Documentation** — https://github.com/luin/ioredis
- **Redis Documentation** — https://redis.io/docs
- **Worker README** — See `apps/worker/README.md`
