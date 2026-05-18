// TT-118: shared NextAuth config for apps provisioned from turbo-temp.
// Both apps/dashboard and apps/app consume this package and pass app-specific
// config (prisma instance, OAuth client IDs) into buildAuthOptions().
//
// Importing anything from this module also installs the type augmentations
// from ./types — so both apps' `session.user` is properly typed without
// needing a per-app next-auth.d.ts file.

import "./types"; // side-effect: load module augmentation

export { buildAuthOptions } from "./buildAuthOptions";
export { generateAuthToken } from "./jwt";
export {
  requestPasswordReset,
  consumePasswordReset,
  RESET_TOKEN_TTL_MINUTES,
  RESET_RATE_LIMIT_PER_HOUR,
  MIN_PASSWORD_LENGTH,
} from "./passwordReset";
export type { RequestResult, ConsumeResult } from "./passwordReset";
export type {
  AuthRole,
  SessionUser,
  JwtToken,
  GoogleProviderConfig,
  GitHubProviderConfig,
  SessionMaxAge,
  BuildAuthOptionsArgs,
} from "./types";
