import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";

/**
 * TT-118: password-reset core logic, mirrored from the platform.
 *
 * Two functions:
 *
 *  - `requestPasswordReset` — looks up the user, rate-limits, generates a
 *    one-time-use token, persists the HASH (not the plaintext), and returns
 *    the plaintext to the route handler so it can build the email link.
 *    Does NOT send the email itself — keeps this package free of an email
 *    dependency.
 *
 *  - `consumePasswordReset` — hashes the incoming token, looks up the
 *    matching unused unexpired row, validates the new password, bcrypt-
 *    hashes it, updates the User, marks this token used, and bulk-marks
 *    all other unused tokens for the same user as used (defense against
 *    replay with an older still-valid token).
 *
 * Tokens stored as sha-256 hash at rest, plaintext only in transit.
 * Rate limit is DB-based (count tokens per user per hour) — no Redis needed.
 */

export const RESET_TOKEN_TTL_MINUTES = 60;
export const RESET_RATE_LIMIT_PER_HOUR = 3;
export const MIN_PASSWORD_LENGTH = 12;

export type RequestResult =
  | { ok: true; token: string; user: { id: string; email: string; name: string } }
  | { ok: false; reason: "user_not_found" | "rate_limited" };

export async function requestPasswordReset(args: {
  prisma: any;
  email:  string;
  ttlMinutes?: number;
  maxPerHour?: number;
}): Promise<RequestResult> {
  const ttlMinutes = args.ttlMinutes ?? RESET_TOKEN_TTL_MINUTES;
  const maxPerHour = args.maxPerHour ?? RESET_RATE_LIMIT_PER_HOUR;

  const user = await args.prisma.user.findUnique({
    where:  { email: args.email },
    select: { id: true, email: true, name: true, deletedAt: true },
  });
  if (!user || user.deletedAt) return { ok: false, reason: "user_not_found" };

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await args.prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gt: oneHourAgo } },
  });
  if (recentCount >= maxPerHour) return { ok: false, reason: "rate_limited" };

  const plaintextToken = randomBytes(32).toString("hex");
  const tokenHash      = sha256(plaintextToken);

  await args.prisma.passwordResetToken.create({
    data: {
      userId:  user.id,
      token:   tokenHash,
      expires: new Date(Date.now() + ttlMinutes * 60 * 1000),
    },
  });

  return {
    ok:    true,
    token: plaintextToken,
    user:  { id: user.id, email: user.email, name: user.name },
  };
}

export type ConsumeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid_or_expired" | "password_too_short" };

export async function consumePasswordReset(args: {
  prisma:      any;
  token:       string;
  newPassword: string;
  bcryptCost?: number;
}): Promise<ConsumeResult> {
  if (args.newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: "password_too_short" };
  }

  const tokenHash = sha256(args.token);

  const row = await args.prisma.passwordResetToken.findUnique({
    where:  { token: tokenHash },
    select: { id: true, userId: true, expires: true, usedAt: true },
  });

  if (!row || row.usedAt || row.expires.getTime() < Date.now()) {
    return { ok: false, reason: "invalid_or_expired" };
  }

  const newHash = await bcrypt.hash(args.newPassword, args.bcryptCost ?? 10);
  const now     = new Date();

  await args.prisma.$transaction([
    args.prisma.user.update({
      where: { id: row.userId },
      data:  { password: newHash },
    }),
    args.prisma.passwordResetToken.update({
      where: { id: row.id },
      data:  { usedAt: now },
    }),
    args.prisma.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null, id: { not: row.id } },
      data:  { usedAt: now },
    }),
  ]);

  return { ok: true, userId: row.userId };
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}
