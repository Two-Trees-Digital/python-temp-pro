// Python-service Worker — signs + POSTs job payloads to the paired Python
// service (python-temp-pro-service or its spawned equivalent).
//
// Producer: any Node-side code (Apollo resolvers, route handlers, other
// workers) enqueues a `PythonServiceJobData` payload onto python-service-queue.
// This Worker dequeues, signs the body with HMAC_SHARED_SECRET, POSTs to
// `${PYTHON_SERVICE_URL}${endpoint}`, and returns the response.
//
// On 4xx/5xx or network error the Worker throws — BullMQ's retry policy
// (configured in the queue's defaultJobOptions) handles re-attempts.

import { Worker, makeConnection, signedPost, type PythonServiceJobData } from "queue";

const pythonServiceUrl  = process.env.PYTHON_SERVICE_URL ?? "";
const hmacSharedSecret  = process.env.HMAC_SHARED_SECRET ?? "";

export function startPythonServiceWorker(): Worker {
  if (!pythonServiceUrl) {
    console.warn("[python-service] PYTHON_SERVICE_URL is not set — worker will fail all jobs");
  }
  if (!hmacSharedSecret) {
    console.warn("[python-service] HMAC_SHARED_SECRET is not set — worker will fail all jobs");
  }

  const connection = makeConnection();

  const worker = new Worker<PythonServiceJobData>(
    "python-service-queue",
    async (job) => {
      const { endpoint, payload, meta } = job.data;
      const url = `${pythonServiceUrl.replace(/\/$/, "")}${endpoint}`;

      const result = await signedPost({
        url,
        body:   payload,
        secret: hmacSharedSecret,
      });

      if (!result.ok) {
        // Throwing triggers BullMQ's retry policy.
        throw new Error(
          `Python service call failed (${result.status}): ${result.error ?? "unknown"} ` +
          `[endpoint=${endpoint}${meta?.requestId ? ` requestId=${meta.requestId}` : ""}]`,
        );
      }

      return result.data;
    },
    { connection },
  );

  worker.on("completed", (job) => {
    console.log(`[python-service] Job ${job?.id} → ${job?.data.endpoint} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(
      `[python-service] Job ${job?.id} → ${job?.data?.endpoint} failed:`,
      err.message,
    );
  });

  return worker;
}
