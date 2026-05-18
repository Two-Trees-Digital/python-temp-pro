// TT-118: thin wrapper. Full config lives in packages/auth.
//
// Note: GitHub is intentionally not wired here — GitHub OAuth Apps support
// only one callback URL each. If you want GitHub on the marketing site,
// register a separate OAuth App with this app's callback URL and pass its
// credentials here. By default GitHub stays dashboard-only.

import { buildAuthOptions } from "auth";
import prisma from "@/lib/prisma";

export const authOptions = buildAuthOptions({
  appName: "marketing",
  prisma,
  google: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        clientId:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }
    : undefined,
  cookieDomain: process.env.NEXTAUTH_COOKIE_DOMAIN,
});
