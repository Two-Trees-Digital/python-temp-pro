import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { marketingAppUrl } from "@repo/env";

/**
 * TT-118: dashboard middleware. Centralized auth + role enforcement that
 * runs before any page renders.
 *
 * Scope: page routes only. API routes are deliberately excluded via the
 * `config.matcher` below so existing per-route helpers
 * (e.g. requireAdminAccess if you add one) keep handling their bearer-token
 * + session auth cases.
 *
 * Decision tree (page routes only):
 *
 *   /login                      → public, always pass through
 *   any other route + no JWT    → redirect to /login?callbackUrl=<original>
 *   any other route + JWT, but
 *     role.name !== "ADMIN"     → redirect to the marketing-site root
 *   admin                       → pass through
 *
 * The role check covers both regular ADMIN users and super-admins (who
 * have role.name === "ADMIN" with role.superAdmin === true).
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // /login is public — let it through unconditionally so users can sign in.
  if (path === "/login") return NextResponse.next();

  // All other matched routes require an authenticated admin.
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", path + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const roleName = (token as { role?: { name?: string } }).role?.name;
  if (roleName !== "ADMIN") {
    return NextResponse.redirect(marketingAppUrl());
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$).*)",
  ],
};
