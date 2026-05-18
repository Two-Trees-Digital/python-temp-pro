// TT-118: forgot-password endpoint (dashboard).
//
// Always returns 200 to the client (no email enumeration). Server-side logs
// distinguish "user not found" from "rate limited" from "successfully sent"
// for ops visibility. Token logic in packages/auth; email rendering +
// sending in packages/email.

import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset, RESET_TOKEN_TTL_MINUTES } from "auth";
import { sendPasswordResetEmail } from "email";
import { marketingAppUrl } from "@repo/env";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let email: string | undefined;
  try {
    const body = await req.json();
    email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const result = await requestPasswordReset({ prisma, email });

  if (!result.ok) {
    // Log but return 200 to avoid revealing which emails are registered or rate-limited.
    console.warn(`[forgot-password] ${result.reason} for ${email}`);
    return NextResponse.json({ ok: true });
  }

  // Reset link points at the marketing site's reset page (consumer-facing UI
  // lives there; dashboard's UI is admin-only).
  const resetLink = `${marketingAppUrl()}/reset-password?token=${encodeURIComponent(result.token)}`;

  try {
    await sendPasswordResetEmail({
      toEmail:          result.user.email,
      toName:           result.user.name,
      resetLink,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    });
  } catch (err) {
    // Token row already exists; log loudly and let the user request again.
    // Still return 200 to avoid signal-leak.
    console.error("[forgot-password] email send failed", { email, err });
  }

  return NextResponse.json({ ok: true });
}
