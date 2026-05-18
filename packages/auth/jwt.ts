import { SignJWT } from "jose";

declare const process: { env: Record<string, string | undefined> };

// TT-118: signed JWT used by mobile / external clients. The web flow
// uses NextAuth's session cookie; this is for clients that need a
// bearer token (mobile app, server-to-server scripts).
//
// jose replaces jsonwebtoken because jsonwebtoken@9 depends on jwa →
// buffer-equal-constant-time which uses SlowBuffer (removed in Node 22).
export const generateAuthToken = async (
  values: object,
  expireValue?: string | number,
): Promise<string> => {
  const secret = new TextEncoder().encode(process.env.NEXT_PUBLIC_PRIVATE_KEY!);
  const expiry = typeof expireValue === "number" ? `${expireValue}s` : (expireValue ?? "1d");
  return new SignJWT(values as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiry)
    .sign(secret);
};
