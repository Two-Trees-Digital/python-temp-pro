// TT-118: forgot-password endpoint (marketing site copy).
//
// Same logic as the dashboard's copy — one route per app so each app's
// own /forgot-password form can POST same-origin (avoids CORS / cookie
// fiddling). Both routes share the underlying packages/auth helpers.

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
    console.warn(`[forgot-password] ${result.reason} for ${email}`);
    return NextResponse.json({ ok: true });
  }

  const resetLink = `${marketingAppUrl()}/reset-password?token=${encodeURIComponent(result.token)}`;

  try {
    await sendPasswordResetEmail({
      toEmail:          result.user.email,
      toName:           result.user.name,
      resetLink,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
    });
  } catch (err) {
    console.error("[forgot-password] email send failed", { email, err });
  }

  return NextResponse.json({ ok: true });
}
