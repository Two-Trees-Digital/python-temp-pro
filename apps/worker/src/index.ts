import { Worker, makeConnection } from "queue";
import { sendEmailVerificationMail } from "email";

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
const fromEmail   = process.env.FROM_EMAIL   ?? "noreply@example.com";

// Each Worker needs its own dedicated Redis connection (BullMQ uses BLPOP)
const workerConnection = makeConnection();

const worker = new Worker(
  "email-verification-queue",
  async (job) => {
    try {
      const { name, email, token } = job.data;
      const link = `${frontendUrl}/verify?token=${token}`;

      await sendEmailVerificationMail(fromEmail, email, { name, link });
      return true;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`[worker] Job ${job.id} failed:`, error.message);
        throw error;
      }
      console.error(`[worker] Job ${job.id} failed:`, error);
      throw new Error(`Unexpected error: ${error}`);
    }
  },
  { connection: workerConnection }
);

worker.on("completed", (job) => {
  console.log(`[worker] Job ${job?.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

console.log("[worker] Started — listening for jobs on email-verification-queue");
