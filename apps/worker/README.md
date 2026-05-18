# Worker — BullMQ Job Processor

> **Node.js** | BullMQ | Redis | Prisma | Docker

A standalone background job processor using BullMQ and Redis. Processes long-running tasks like email verification. Runs in Docker and can be deployed to Railway, AWS ECS, or any container platform.

---

## Overview

The worker is a dedicated Node.js process that consumes jobs from Redis queues managed by BullMQ. It integrates with the shared database (Prisma) and email service (Resend, via `packages/email`) to handle asynchronous tasks.

The template includes one built-in queue: **email-verification-queue** for sending verification emails. You can easily add additional queues and job processors as your application grows.

---

## What It Does

The worker processes jobs from BullMQ queues. The template includes one queue by default:

### Email Verification Queue (`email-verification-queue`)

Sends email verification links to users via Resend. Triggered during user registration, password resets, or other email verification flows.

**Job data:**
```typescript
{
  name: string;      // Recipient name
  email: string;     // Recipient email address
  token: string;     // Verification token
}
```

**Process:**
1. Receive job from queue
2. Construct verification link with token
3. Send email via Resend (raw HTML — see `packages/email`)
4. Log completion or failure

---

## Entry Point: `src/index.ts`

The main worker process:

```typescript
import { Worker, makeConnection } from "queue";
import { sendEmailVerificationMail } from "email";

// Create a dedicated Redis connection for this worker
const workerConnection = makeConnection();

// Create the worker
const worker = new Worker(
  "email-verification-queue",
  async (job) => {
    const { name, email, token } = job.data;
    const link = `${process.env.FRONTEND_URL}/verify?token=${token}`;
    
    await sendEmailVerificationMail(
      process.env.FROM_EMAIL,
      email,
      { name, link }
    );
    
    return true; // Success
  },
  { connection: workerConnection }
);

// Log when jobs complete or fail
worker.on("completed", (job) => {
  console.log(`[worker] Job ${job?.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});
```

**Key points:**
- Each Worker instance gets its own Redis connection via `makeConnection()`
- Job handler is an async function that receives the job
- Return a value or throw an error to signal success/failure
- Event listeners track job completion and failures

### Environment Variables

The worker reads configuration from environment:

| Variable | Description | Example |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` or `rediss://...` for TLS |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host/db` |
| `FRONTEND_URL` | Base URL for email links | `https://example.com` |
| `FROM_EMAIL` | Sender email address | `noreply@example.com` |
| `RESEND_API_KEY` | Resend API key (prod only — dev logs to console) | `re_...` |
| `RESEND_FROM_EMAIL` | Verified sender (no quotes) | `noreply@example.com` |

---

## Dockerfile

The worker runs in Docker. The Dockerfile uses a multi-stage approach for efficient caching:

```dockerfile
FROM node:20-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@8 turbo typescript@5

WORKDIR /app

# Copy workspace files first (for caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/queue/package.json ./packages/queue/
COPY packages/email/package.json ./packages/email/
COPY packages/database/package.json ./packages/database/
COPY packages/typescript-config/ ./packages/typescript-config/
COPY apps/worker/package.json ./apps/worker/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/queue/ ./packages/queue/
COPY packages/email/ ./packages/email/
COPY packages/database/ ./packages/database/
COPY apps/worker/ ./apps/worker/

# Generate Prisma client and compile packages
RUN pnpm --filter=queue exec prisma generate --schema=../../packages/database/prisma/schema.prisma
RUN cd packages/queue && tsc
RUN cd packages/email && tsc
RUN pnpm --filter=worker build

# Run the worker
CMD ["node", "apps/worker/dist/index.js"]
```

### Build Process

1. Installs global tools: pnpm 8, turbo, TypeScript 5
2. Copies workspace files and package.json (for layer caching)
3. Installs dependencies from pnpm-lock.yaml
4. Copies source code
5. Generates Prisma client
6. Compiles TypeScript in queue and email packages
7. Builds the worker app
8. Runs the worker with Node.js

---

## Critical Dockerfile Bugs and Workarounds

These are real issues that have caused production failures. Follow the solutions exactly.

### 1. TypeScript Version Must Be Pinned to v5

**Problem**: Installing TypeScript without a version pin grabs the latest version (v6+), which changed CLI behavior. In v6+, running `tsc` without arguments prints help instead of compiling.

**Solution**: Always pin TypeScript to v5 in the Dockerfile:
```dockerfile
RUN npm install -g typescript@5
```

**Why**: The shared packages use bare `tsc` commands. If v6+ is installed, they fail silently.

### 2. Never Use `npx tsc`

**Problem**: `npx tsc` does not install TypeScript's compiler. Instead, it installs a completely different npm package called `tsc` (version 2.0.4) that has nothing to do with TypeScript. This causes cryptic build failures.

**Solution**: Always use the globally installed `tsc`:
```dockerfile
RUN npm install -g typescript@5
# Later:
RUN cd packages/queue && tsc
```

Not:
```dockerfile
RUN cd packages/queue && npx tsc  # WRONG - installs wrong package
```

### 3. tsconfig.json Must Be Committed to Git

**Problem**: The queue and email packages need `tsconfig.json` files in their root directories. Without them, `tsc` exits with code 1 and prints help, causing the build to fail.

**Solution**: Ensure both files are committed:
```bash
git ls-files packages/queue/tsconfig.json
git ls-files packages/email/tsconfig.json
```

If either is missing, add and commit it:
```bash
echo '{"extends":"../../packages/typescript-config/tsconfig.json"}' > packages/queue/tsconfig.json
git add packages/queue/tsconfig.json
git commit -m "Add tsconfig.json to queue package"
```

### 4. @types/node Required in Queue and Email Packages

**Problem**: Both packages reference `process.env` in TypeScript. Without `@types/node` in devDependencies, the Docker build fails with "Cannot find name 'process'".

**Solution**: Verify `@types/node` is in devDependencies:
```json
{
  "devDependencies": {
    "@types/node": "^20"
  }
}
```

Run `pnpm install` locally to update pnpm-lock.yaml if needed.

### 5. Resend Client Crashes on Startup Without Key

**Problem**: Initializing Resend with an empty string throws. If `RESEND_API_KEY` is not set in production, the worker should fail loud at send-time, not on startup.

**Solution**: `packages/email` lazy-initializes the client and falls back to console-logging in dev (`NODE_ENV !== "production"`). In any non-dev env, missing `RESEND_API_KEY` throws on first send. The pattern (kept here for reference):
```typescript
let _client: Resend | null = null;

function getClient(): Resend | null {
  if (_client) return _client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "development") return null;
    throw new Error("RESEND_API_KEY not set");
  }
  _client = new Resend(apiKey);
  return _client;
}
```

This way, the worker starts successfully even without the token, and only fails when an email job is processed.

### 6. pnpm-lock.yaml Must Stay In Sync

**Problem**: The Dockerfile runs `pnpm install --frozen-lockfile`, which fails if pnpm-lock.yaml doesn't match current package.json files.

**Solution**: After modifying any package.json file, run `pnpm install` locally before committing:
```bash
pnpm install
git add pnpm-lock.yaml
git commit -m "Update dependencies"
```

If you forget, the Docker build will fail with a cryptic pnpm error.

---

## Adding a New Queue

To add a new job queue to the worker:

### 1. Create a Queue Producer (in your app)

```typescript
// apps/dashboard/src/app/api/my-task.ts
import { QueueMQ } from "queue";

export async function POST(request: Request) {
  const body = await request.json();
  
  const myQueue = QueueMQ("my-task-queue");
  const job = await myQueue.add("my-job", {
    userId: body.userId,
    data: body.data,
  });
  
  return Response.json({ jobId: job.id });
}
```

### 2. Create a Queue Processor (in the worker)

Add to `apps/worker/src/index.ts`:

```typescript
import { Worker, makeConnection } from "queue";

const worker = new Worker(
  "my-task-queue",
  async (job) => {
    console.log(`Processing job: ${job.id}`);
    const { userId, data } = job.data;
    
    // Do your work here
    // Access database: import { PrismaClient } from "database"
    // etc.
    
    return { success: true };
  },
  { connection: makeConnection() }
);

worker.on("completed", (job) => {
  console.log(`Job ${job?.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});
```

### 3. Run and Test

```bash
# Start development worker
pnpm run dev

# Enqueue a job from another terminal
curl -X POST http://localhost:3001/api/my-task \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123","data":"test"}'

# Watch worker logs for processing
```

---

## Environment Variables (Production)

Set these in your deployment platform (Railway, AWS ECS, etc.):

| Variable | Description | Example |
|----------|-------------|---------|
| `REDIS_URL` | Redis connection string | `rediss://user:pass@host:port` |
| `DATABASE_URL` | PostgreSQL pooled connection | `postgresql://user:pass@host/db` |
| `FRONTEND_URL` | Base URL for email links | `https://app.example.com` |
| `FROM_EMAIL` | Sender email address | `noreply@example.com` |
| `RESEND_API_KEY` | Resend API key (prod only — dev logs to console) | `re_...` |
| `RESEND_FROM_EMAIL` | Verified sender (no quotes) | `noreply@example.com` |

---

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node ./src/index.ts",
    "build": "prisma generate --schema=../../packages/database/prisma/schema.prisma && tsc",
    "start": "NODE_ENV=production node ./dist/index.js"
  }
}
```

### Running the Worker

**Development** (with hot reload):
```bash
pnpm run dev
```

**Production** (in Docker):
```bash
pnpm run build
pnpm run start
```

---

## Deployment

### Docker Container

Build and run locally:
```bash
docker build -t my-worker apps/worker
docker run -e REDIS_URL=rediss://... -e DATABASE_URL=postgresql://... my-worker
```

### Railway

1. Connect your GitHub repo to Railway
2. Railway auto-detects `apps/worker/Dockerfile` and builds automatically
3. Set environment variables in Railway project settings
4. Every push to `main` triggers a rebuild and redeploy

### AWS ECS

1. Push Docker image to ECR: `docker build -t my-worker apps/worker`
2. Create ECS task with image URI
3. Set environment variables in task definition
4. Create ECS service with the task

---

## Monitoring and Debugging

### Check Worker Status

During development:
```bash
# Terminal 1: Start the worker
pnpm run dev

# Terminal 2: Check Redis for queued jobs
redis-cli
> KEYS *
> LLEN email-verification-queue
```

### View Job Logs

Jobs log their progress to stdout. Check:
- Docker logs: `docker logs <container-id>`
- Railway logs: Railway dashboard > Logs tab
- Application logs: `console.log()` statements

### Common Issues

| Issue | Solution |
|-------|----------|
| Worker won't start | Check REDIS_URL and DATABASE_URL are set |
| Jobs not processing | Verify Redis is accessible and REDIS_URL is correct |
| Email not sending | Check `RESEND_API_KEY` is set in prod (dev logs to console). Verify `RESEND_FROM_EMAIL` is a verified Resend sender and has no surrounding quotes. |
| Build fails in Docker | Ensure pnpm-lock.yaml is up to date; run `pnpm install` locally |

---

## Architecture Notes

### Why Dedicated Redis Connections for Workers?

BullMQ workers use blocking Redis commands (BLPOP) to listen for jobs. These commands keep a connection open indefinitely. If a single connection were shared across multiple workers, one worker would monopolize it and others would starve. Each worker gets its own dedicated connection.

### Redis Connection Isolation

**Correct**: Fresh connection per worker
```typescript
const worker1 = new Worker('queue-1', processor1, {
  connection: makeConnection(),
});
const worker2 = new Worker('queue-2', processor2, {
  connection: makeConnection(),
});
```

**Wrong**: Sharing connection between workers
```typescript
const shared = makeConnection();
const worker1 = new Worker('queue-1', processor1, {
  connection: shared,  // Don't share
});
```

### Job Retry Logic

BullMQ provides automatic retry:
```typescript
await myQueue.add(
  'my-job',
  jobData,
  {
    attempts: 3,        // Retry up to 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,      // Start with 2 second delay
    },
  }
);
```

---

## Related Documentation

- **BullMQ docs:** https://docs.bullmq.io
- **IORedis docs:** https://github.com/luin/ioredis
- **Redis docs:** https://redis.io/docs
- **Docker docs:** https://docs.docker.com
- **Queue package:** See `packages/queue/README.md`
- **Email package:** See `packages/email/README.md`
