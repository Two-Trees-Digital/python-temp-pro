// TT-118: reset-password endpoint (dashboard).
//
// Validates the reset token + new password, updates the user's password,
// invalidates this and all other outstanding tokens for the user.

import { NextRequest, NextResponse } from "next/server";
import { consumePasswordReset, MIN_PASSWORD_LENGTH } from "auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let token: string | undefined;
  let newPassword: string | undefined;
  try {
    const body = await req.json();
    token       = typeof body?.token       === "string" ? body.token       : undefined;
    newPassword = typeof body?.newPassword === "string" ? body.newPassword : undefined;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!token || !newPassword) {
    return NextResponse.json({ error: "Missing token or newPassword" }, { status: 400 });
  }

  const result = await consumePasswordReset({ prisma, token, newPassword });

  if (!result.ok) {
    if (result.reason === "password_too_short") {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 },
      );
    }
    // invalid_or_expired — same surface for both (don't tell client which
    // failure mode; either way the answer is "request a new link").
    return NextResponse.json(
      { error: "This link is invalid or has expired. Request a new one from the forgot-password page." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
