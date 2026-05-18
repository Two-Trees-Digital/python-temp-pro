// Worker entrypoint — boots all BullMQ Workers in this process.
//
// Each Worker is defined in its own file under ./queues/ so adding a
// new queue is a single-file change. To add a new Worker:
//   1. Create apps/worker/src/queues/<name>.ts with a startXWorker() export
//   2. Import + call it here
//   3. (Optional) Add the queue's getter to packages/queue/index.ts

import { startEmailVerificationWorker } from "./queues/email-verification";
import { startPythonServiceWorker } from "./queues/python-service";

startEmailVerificationWorker();
startPythonServiceWorker();

console.log("[worker] Started — listening for jobs on email-verification-queue + python-service-queue");
