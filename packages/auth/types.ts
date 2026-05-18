// TT-118: shared NextAuth types + module augmentation. The `declare module`
// blocks below provide a single source of truth for `session.user` and JWT
// shape across both apps.
//
// Mirrors the platform's packages/auth/types.ts. Apps consume types by
// importing from "auth" (the import side-effects load the augmentation).

import type { DefaultSession } from "next-auth";

// Super-admin tier within ADMIN role. Permissions code reads
// `role.superAdmin` directly off the session.
export type AuthRole = {
  id: string;
  name: string;
  superAdmin: boolean;
};

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  profileImage?: string | null;
  // String today; could tighten to AuthProvider enum later.
  authProvider?: string | null;
  isEmailVerified?: boolean | null;
  role?: AuthRole | null;
  // Signed JWT used by mobile / external clients (set on initial sign-in
  // by `generateAuthToken`). Web flow doesn't read this.
  token?: string;
};

export type JwtToken = SessionUser;

export type GoogleProviderConfig = {
  clientId: string;
  clientSecret: string;
};

export type GitHubProviderConfig = {
  clientId: string;
  clientSecret: string;
};

export type SessionMaxAge = {
  /** Seconds. Default 30 days. */
  dev: number;
  /** Seconds. Default 1 day. */
  prod: number;
};

export type BuildAuthOptionsArgs = {
  /** Activity-log metadata tag: "dashboard" | "marketing" | etc. */
  appName: string;

  /** Prisma client from the consuming app. Typed loosely (any) to avoid
   *  coupling this package to the generated Prisma client. */
  prisma: any;

  /** Optional Google provider config. Omit to disable Google entirely. */
  google?: GoogleProviderConfig;

  /** Optional GitHub provider config. Omit to disable GitHub entirely. */
  github?: GitHubProviderConfig;

  /** Override session.maxAge defaults. */
  sessionMaxAgeSeconds?: SessionMaxAge;

  /**
   * Cookie domain to pin in prod (e.g. ".example.com"). Omit to skip
   * domain pinning entirely. Apps provisioned from turbo-temp should set
   * this to their parent domain if they want sessions to span subdomains
   * (e.g. dashboard.example.com + example.com).
   */
  cookieDomain?: string;
};

// ---- Module augmentation: makes session.user properly typed instead of
// the previous `as any` casts. Both apps pick this up by importing
// anything from "auth" — they no longer need their own next-auth.d.ts.

declare module "next-auth" {
  interface Session {
    user: SessionUser;
    expires: DefaultSession["expires"];
  }
}

declare module "next-auth/jwt" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface JWT extends SessionUser {}
}
