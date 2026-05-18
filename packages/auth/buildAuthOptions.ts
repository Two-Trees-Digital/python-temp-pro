import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { isLocal, isPreview, marketingAppUrl } from "@repo/env";

import { generateAuthToken } from "./jwt";
import { buildPrismaAdapter } from "./adapter";
import type { BuildAuthOptionsArgs, SessionUser } from "./types";

declare const process: { env: Record<string, string | undefined> };

/**
 * TT-118: shared NextAuth config factory, mirrored from the platform.
 *
 * Both apps/dashboard and apps/app produce their `authOptions` by calling
 * this factory and passing app-specific config:
 *
 *     export const authOptions = buildAuthOptions({
 *       appName: "dashboard",
 *       prisma,
 *       google: { clientId, clientSecret },
 *       github: { clientId, clientSecret },
 *       cookieDomain: ".myapp.com",  // optional — for cookie pinning across subdomains
 *     });
 *
 * What's inside, and why:
 *
 *  - **Cookies**: skip domain pinning on local + Vercel previews. Apps can
 *    opt in to pinning by passing `cookieDomain` (e.g. ".myapp.com") so
 *    sessions span dashboard.myapp.com + myapp.com. Without `cookieDomain`,
 *    no pinning anywhere — host-only cookies, simpler default.
 *
 *  - **Adapter**: `buildPrismaAdapter` (./adapter.ts) wraps NextAuth's
 *    PrismaAdapter to bridge schema differences (profileImage vs image,
 *    isEmailVerified Boolean vs emailVerified DateTime, required roleId).
 *
 *  - **Credentials provider**: bcrypt + prisma user lookup. Bypasses the
 *    adapter — uses authorize() and returns the user object directly.
 *
 *  - **OAuth providers**: Google + GitHub, both gated on env vars passed
 *    in via args. Account creation goes through the adapter; existing-user
 *    linking happens in the signIn callback.
 *
 *  - **signIn callback**: handles same-email collisions when an OAuth user
 *    signs in for the first time and a User row already exists for that
 *    email. Policy: auto-link if the OAuth provider returned a verified
 *    email; block + redirect to /login?error=verify_email_first otherwise.
 *
 *  - **JWT/session callbacks**: typed via the module augmentation in
 *    ./types — no `as any` casts.
 *
 *  - **Events**: emit auth.login / auth.logout activity rows tagged with
 *    the calling app. Best-effort — failures swallowed inside
 *    safeLogActivity so a broken audit write never breaks sign-in/sign-out.
 */
export function buildAuthOptions(args: BuildAuthOptionsArgs): NextAuthOptions {
  const { appName, prisma, google, github, sessionMaxAgeSeconds, cookieDomain } = args;

  const local     = isLocal();
  const pinDomain = !!cookieDomain && !local && !isPreview();

  const maxAgeDev  = sessionMaxAgeSeconds?.dev  ?? 30 * 24 * 60 * 60; // 30 days
  const maxAgeProd = sessionMaxAgeSeconds?.prod ?? 24 * 60 * 60;       // 1 day

  return {
    secret:  process.env.NEXTAUTH_SECRET,
    adapter: buildPrismaAdapter(prisma),
    session: {
      strategy: "jwt",
      maxAge:   local ? maxAgeDev : maxAgeProd,
    },
    cookies: {
      sessionToken: {
        name: local ? "next-auth.session-token" : "__Secure-next-auth.session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          path:     "/",
          secure:   !local,
          ...(pinDomain ? { domain: cookieDomain } : {}),
        },
      },
    },
    providers: [
      CredentialsProvider({
        credentials: {
          email:    { label: "Email",    type: "email"    },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          const { email, password } = credentials ?? {};
          if (!email || !password) throw new Error("Missing email or password");

          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id:              true,
              name:            true,
              email:           true,
              password:        true,
              profileImage:    true,
              authProvider:    true,
              isEmailVerified: true,
              role: { select: { id: true, name: true, superAdmin: true } },
            },
          });
          if (!user || !user.password) throw new Error("No account found with that email");

          const passwordMatch = await bcrypt.compare(password, user.password);
          if (!passwordMatch) throw new Error("Incorrect password");

          const token = await generateAuthToken({ id: user.id }, "30d");
          const { password: _pw, ...safeUser } = user;
          return { ...safeUser, token } as SessionUser;
        },
      }),
      ...(google
        ? [
            GoogleProvider({
              clientId:     google.clientId,
              clientSecret: google.clientSecret,
            }),
          ]
        : []),
      ...(github
        ? [
            GitHubProvider({
              clientId:     github.clientId,
              clientSecret: github.clientSecret,
            }),
          ]
        : []),
    ],
    callbacks: {
      /**
       * Account-linking gate for OAuth sign-ins.
       *
       *   - Credentials and email-link sign-ins skip this whole block.
       *   - For OAuth: if a User exists with the same email AND the OAuth
       *     provider returned a verified email, link the OAuth Account to
       *     the existing User (idempotent).
       *   - If a User exists but the email isn't verified, block + redirect.
       *   - If no User exists, return true and let the adapter create
       *     User + Account.
       */
      async signIn({ user, account, profile }) {
        if (!account || account.type !== "oauth") return true;

        const email = user.email ?? (profile as { email?: string } | undefined)?.email;
        if (!email) return false;

        const existingUser = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true },
        });

        if (!existingUser) return true; // adapter handles create + link

        const verified = isOAuthEmailVerified(account.provider, profile);
        if (!verified) return "/login?error=verify_email_first";

        const existingAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider:          account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        });

        if (!existingAccount) {
          await prisma.account.create({
            data: {
              userId:            existingUser.id,
              type:              account.type,
              provider:          account.provider,
              providerAccountId: account.providerAccountId,
              access_token:      account.access_token,
              refresh_token:     account.refresh_token,
              expires_at:        account.expires_at,
              token_type:        account.token_type,
              scope:             account.scope,
              id_token:          account.id_token,
              session_state:     account.session_state as string | null,
            },
          });
        }

        await prisma.user.update({
          where: { id: existingUser.id },
          data:  { authProvider: account.provider as any },
        });

        return true;
      },

      async jwt({ token, user, account }) {
        if (user) {
          const newToken = { ...token, ...user } as typeof token;
          if (account?.type === "oauth") {
            (newToken as any).authProvider = account.provider;
          }
          return newToken;
        }
        return token;
      },

      async session({ session, token }) {
        session.user = token as unknown as SessionUser;
        return session;
      },

      /**
       * Post-auth landing: send users to the marketing site root after
       * sign-in/sign-out. Apps can override this in their authOptions
       * wrapper if they want different behavior (e.g. land on dashboard
       * for admin sign-ins).
       */
      async redirect() {
        return marketingAppUrl();
      },
    },
    events: {
      async signIn({ user }) {
        if (!user?.id) return;
        await safeLogActivity(prisma, {
          userId:   user.id as string,
          event:    "auth.login",
          metadata: { app: appName },
        });
      },
      async signOut({ token }) {
        const userId = (token as any)?.id;
        if (typeof userId !== "string" || !userId) return;
        await safeLogActivity(prisma, {
          userId,
          event:    "auth.logout",
          metadata: { app: appName },
        });
      },
    },
  };
}

/**
 * Per-provider rules for whether an OAuth-supplied email counts as verified.
 *
 *   Google — `profile.email_verified` (boolean) is in the OIDC ID token.
 *   GitHub — the OAuth flow returns the user's PRIMARY email, which they had
 *            to verify to set as primary. Implicitly verified.
 *
 * Unknown providers fail closed.
 */
function isOAuthEmailVerified(
  provider: string,
  profile: unknown,
): boolean {
  if (provider === "google") {
    return (profile as { email_verified?: boolean } | undefined)?.email_verified === true;
  }
  if (provider === "github") {
    return true;
  }
  return false;
}

/**
 * Audit-log writer. Same swallow-errors semantics as the platform: an audit
 * write failure must never break sign-in or sign-out.
 */
async function safeLogActivity(
  prisma: any,
  args: { userId: string; event: string; metadata: Record<string, unknown> },
): Promise<void> {
  try {
    await prisma.userActivity.create({
      data: {
        userId:   args.userId,
        event:    args.event,
        metadata: args.metadata,
      },
    });
  } catch (err) {
    console.error("[auth/safeLogActivity] failed", {
      event:  args.event,
      userId: args.userId,
      err,
    });
  }
}
