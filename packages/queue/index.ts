import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

// ── Redis connection ───────────────────────────────────────────────────────────
// In production use REDIS_URL (e.g. redis://user:pass@host:port or
// rediss:// for TLS). Falls back to localhost for local dev.
//
// IMPORTANT: BullMQ Workers use blocking Redis commands (BLPOP) and each
// Worker instance must have its own dedicated IORedis connection. Use
// makeConnection() to create a fresh connection for each Worker.
// The shared getConnection() export is safe for Queue instances only.
const redisUrl = process.env.REDIS_URL;

export function makeConnection() {
  return redisUrl
    ? new IORedis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false, tls: redisUrl.startsWith("rediss://") ? {} : undefined })
    : new IORedis({ host: "127.0.0.1", port: 6379, maxRetriesPerRequest: null, enableReadyCheck: false });
}

// ── Lazy shared connection ─────────────────────────────────────────────────────
// Connection is created on first access, not at import time.
// This prevents Redis connection attempts during Next.js build — if the queue
// package eagerly instantiates IORedis at module import, `next build` fails
// with ECONNREFUSED 127.0.0.1:6379 when the build environment has no Redis.
let _connection: InstanceType<typeof IORedis> | null = null;

export function getConnection() {
  if (!_connection) _connection = makeConnection();
  return _connection;
}

// ── Generic queue factory ──────────────────────────────────────────────────────
// Apps bootstrapped from this template should use QueueMQ() to declare their
// own named queues. The examples below (getNotifyQueue, getCreateAppQueue) are
// template defaults that new apps can keep, rename, or remove.
const QueueMQ = (queueName: string) =>
  new Queue(queueName, {
    connection: getConnection(),
    defaultJobOptions: { removeOnComplete: 100, removeOnFail: 5_000 },
  });

// ── Named queue instances (lazy) ───────────────────────────────────────────────
// Queues are created on first access so Next.js build never opens a Redis
// connection. The worker and API route handlers call these at runtime only.

let _createAppQueue: InstanceType<typeof Queue> | null = null;
let _notifyQueue: InstanceType<typeof Queue> | null = null;

export function getCreateAppQueue(): InstanceType<typeof Queue> {
  if (!_createAppQueue) _createAppQueue = QueueMQ("create-app-queue");
  return _createAppQueue;
}

export function getNotifyQueue(): InstanceType<typeof Queue> {
  if (!_notifyQueue) _notifyQueue = QueueMQ("notify-queue");
  return _notifyQueue;
}

// ── Re-exports ─────────────────────────────────────────────────────────────────
export { QueueMQ, Worker, Job };
