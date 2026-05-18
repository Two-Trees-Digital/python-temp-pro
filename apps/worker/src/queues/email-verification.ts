// Email-verification Worker — sends signup-verification email via Resend.
//
// Producer: apps/dashboard or apps/app's signup route handler enqueues a
// job after creating the User row. This Worker dequeues, builds the
// verification link, sends via Resend.

import { sendEmailVerificationMail } from "email";
import { Worker, makeConnection } from "queue";

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
const fromEmail   = process.env.FROM_EMAIL   ?? "noreply@example.com";

export function startEmailVerificationWorker(): Worker {
  const connection = makeConnection();

  const worker = new Worker(
    "email-verification-queue",
    async (job) => {
      const { name, email, token } = job.data;
      const link = `${frontendUrl}/verify?token=${token}`;
      await sendEmailVerificationMail(fromEmail, email, { name, link });
      return true;
    },
    { connection },
  );

  worker.on("completed", (job) => {
    console.log(`[email-verification] Job ${job?.id} completed`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[email-verification] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
