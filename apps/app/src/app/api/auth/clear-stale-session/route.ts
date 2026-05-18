import { NextResponse } from "next/server";

/**
 * Clears legacy session cookies that may persist after the cookie config was
 * updated to include a domain attribute for cross-subdomain sharing.
 *
 * Before NEXTAUTH_COOKIE_DOMAIN is configured, NextAuth sets
 * `__Secure-next-auth.session-token` without a Domain attribute (scoped only to
 * the main hostname). After enabling the domain, we set it with domain=.example.com.
 *
 * A browser can hold both cookies simultaneously (same name, different scope).
 * NextAuth's built-in sign-out only clears the domain-scoped version, so the old
 * host-scoped cookie persists and the user appears still logged in.
 *
 * This route clears both variants so the standard signOut() completes cleanly.
 * NavbarTwo calls this before signOut(), not after.
 */
export async function GET() {
  const response = NextResponse.json({ cleared: true });

  // Clear the old host-scoped cookie (no Domain attribute)
  response.cookies.set("__Secure-next-auth.session-token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // Also clear any non-secure transitional cookie name
  response.cookies.set("next-auth.session-token", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return response;
}
