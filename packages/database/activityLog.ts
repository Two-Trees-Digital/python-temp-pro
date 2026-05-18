import type { Prisma } from "../../apps/app/generated/client";

export type DbClient = Prisma.TransactionClient;

/**
 * Append a row to `userActivity`. `db` can be the full PrismaClient or a
 * `$transaction` tx client (use the tx client when the audit row must
 * commit/rollback with another write).
 *
 * Best-effort by default — write failures are logged, not thrown. Inside a
 * `$transaction`, pass `propagateErrors: true` so the parent rolls back.
 */
export async function logActivity(
  db: DbClient,
  args: {
    userId: string;
    event: string;
    metadata?: Record<string, unknown>;
    propagateErrors?: boolean;
  },
): Promise<void> {
  try {
    await db.userActivity.create({
      data: {
        userId: args.userId,
        event: args.event,
        metadata: (args.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    if (args.propagateErrors) throw err;
    console.error("[logActivity] failed", {
      event: args.event,
      userId: args.userId,
      err,
    });
  }
}
