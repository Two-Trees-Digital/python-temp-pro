# `@repo/permissions`

Single source of truth for "can this actor do X?" across every layer of the app. Pure functions and constants only — **no Prisma, no NextRequest, no Node-only I/O**. Importable from middleware (Edge runtime), route handlers, Apollo resolvers, server components, client components, and tests.

Server-only wrappers that hit Prisma or `NextRequest` live alongside their consumers (`apps/dashboard/src/lib/*`, `apps/api/src/lib/*`).

## Tier ladder

```
USER (0) < VIEWER (1) < EMPLOYEE (2) < MANAGER (3) < DEVELOPER (4) < ADMIN (5)
```

Keep the migration's role-row inserts and `packages/database/seed.ts` in sync with `ROLE_TIER`.

## API reference

### `tierFor(roleName)`

Returns the numeric tier for a role name. Unknown / null / undefined → `USER` (0). Use to compare tiers:

```ts
import { tierFor, ROLE_TIER } from "@repo/permissions";

if (tierFor(session?.user.role?.name) >= ROLE_TIER.EMPLOYEE) {
  // ...
}
```

### `canChangeRole(actor, target, newRole)`

Returns `{ ok: true }` or `{ ok: false, status, reason }`. The verdict shape is deliberate — callers usually need the denial reason for audit logging:

```ts
import { canChangeRole } from "@repo/permissions";

const verdict = canChangeRole(actor, target, newRole);
if (!verdict.ok) {
  throw new GraphQLError(verdict.reason, {
    extensions: { code: "FORBIDDEN", status: verdict.status },
  });
}
```

Rules:

- Actor can't change their own role.
- Super-admin can change anyone to anything.
- Regular admin can change non-admin / non-super-admin users to non-super-admin roles.
- Anyone else gets `FORBIDDEN`.

### `canDeleteUser(actor, target)`

Same verdict shape as `canChangeRole`. No self-delete; regular admins can't touch admins or super-admins; only super-admin can delete super-admins or other admins.

## Growing the surface

Apps that build out a per-resource capability matrix (`blog:write`, `user:invite`, etc.) add it in a sibling file (`capabilities.ts`) and re-export through `index.ts`. Keep the pure-functions-only constraint — anything that touches Prisma or request state goes in the consumer's `lib/`.

## Role-change validity

The matrix `canChangeRole` enforces:

| Actor → | Target ↓ | Allowed? |
|---|---|---|
| Super-admin | Any | ✓ |
| Admin (non-super) | Super-admin or admin | ✗ (only super-admin) |
| Admin (non-super) | Non-admin → super-admin | ✗ (only super-admin can grant super-admin) |
| Admin (non-super) | Non-admin → non-super | ✓ |
| Anyone | Self | ✗ |
| Anything else | — | ✗ |
