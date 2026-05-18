// TT-118: thin wrapper. Full config lives in packages/auth.
// This file just hands in app-specific config (prisma instance, appName,
// optional OAuth + cookie domain).

import { buildAuthOptions } from "auth";
import prisma from "@/lib/prisma";

export const authOptions = buildAuthOptions({
  appName: "dashboard",
  prisma,
  google: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        clientId:     process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      }
    : undefined,
  github: process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
    ? {
        clientId:     process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      }
    : undefined,
  // NEXTAUTH_COOKIE_DOMAIN (e.g. ".myapp.com") opts the session cookie into
  // cross-subdomain sharing — dashboard.myapp.com + myapp.com see the same
  // cookie. Leave unset for local dev (host-only cookies).
  cookieDomain: process.env.NEXTAUTH_COOKIE_DOMAIN,
});
