import { jwtDecrypt, type JWTPayload } from "jose";
import hkdf from "@panva/hkdf";

// Local clone of next-auth/jwt v4.24.14 decode(). Importing next-auth here
// duplicates next@14.1.0 via peer deps and breaks the dashboard build.

async function getDerivedEncryptionKey(secret: string, salt = ""): Promise<Uint8Array> {
  return hkdf(
    "sha256",
    secret,
    salt,
    `NextAuth.js Generated Encryption Key${salt ? ` (${salt})` : ""}`,
    32,
  );
}

/** Decode a next-auth session JWT. Null on empty; throws on malformed/expired/bad-secret. */
export async function decodeSessionJwt(
  token: string,
  secret: string,
): Promise<JWTPayload | null> {
  if (!token) return null;
  const key = await getDerivedEncryptionKey(secret);
  const { payload } = await jwtDecrypt(token, key, { clockTolerance: 15 });
  return payload;
}
