import { decodeSessionJwt } from "../lib/jwt";

// Actor resolved from the request's Bearer token. See README "Auth contract".
// `source` distinguishes a regular user session (next-auth JWE) from future
// agent/service tokens — single-tier today, expandable without schema churn.
export type Actor = {
  userId:   string;
  source:   "session";
  roleName: string;
};

export type GraphQLContext = {
  actor: Actor | null;
};

export const context = async ({ req }: { req: any }): Promise<GraphQLContext> => {
  const authHeader: string | undefined =
    req?.headers?.authorization ?? req?.headers?.Authorization;

  if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return { actor: null };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return { actor: null };

  // Bad/expired JWT → actor:null; public schema fields must keep working.
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return { actor: null };

  try {
    const decoded = await decodeSessionJwt(token, secret);
    if (!decoded?.id) return { actor: null };
    const role = (decoded as any).role;
    return {
      actor: {
        userId:   decoded.id as string,
        source:   "session",
        roleName: role?.name ?? "USER",
      },
    };
  } catch {
    // Bad/expired/forged JWT — public schema fields keep working.
    return { actor: null };
  }
};
