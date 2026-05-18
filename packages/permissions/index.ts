// Single source of truth for "can this actor do X?" across the app.
// Pure functions and constants only — no Prisma, no NextRequest, no Node-only
// I/O. Importable from middleware (Edge runtime), route handlers, Apollo
// resolvers, server components, client components, and tests.
//
// Server-only wrappers that hit Prisma or NextRequest live alongside their
// consumers (apps/dashboard/src/lib/*, apps/api/src/lib/*).
//
// This template ships the tier ladder + role-change/delete verdicts. Apps
// that grow per-resource capability matrices add them in a sibling file
// (e.g. capabilities.ts) and re-export through this barrel.

/**
 * Unified tier scale across global Role assignments. Keep in sync with the
 * migration role-row inserts and packages/database/seed.ts.
 */
export const ROLE_TIER = {
  USER:      0,
  VIEWER:    1,
  EMPLOYEE:  2,
  MANAGER:   3,
  DEVELOPER: 4,
  ADMIN:     5,
} as const;

export type RoleName = keyof typeof ROLE_TIER;

export function tierFor(roleName: string | undefined | null): number {
  if (!roleName) return ROLE_TIER.USER;
  return ROLE_TIER[roleName as RoleName] ?? ROLE_TIER.USER;
}

export type RoleLite = { id: string; name: string; superAdmin: boolean };
export type UserLite = { id: string; role: RoleLite };

export type CanChangeRoleResult =
  | { ok: true }
  | { ok: false; status: 401 | 403; reason: string };

/**
 * Single source of truth for role changes. Returns a tagged result instead of
 * throwing. See README "Role-change validity" for the matrix.
 */
export function canChangeRole(
  actor:   UserLite,
  target:  UserLite,
  newRole: RoleLite,
): CanChangeRoleResult {
  if (actor.id === target.id) {
    return { ok: false, status: 403, reason: "Cannot change your own role" };
  }

  const actorIsSuper   = actor.role.superAdmin;
  const actorIsAdmin   = actor.role.name === "ADMIN" && !actor.role.superAdmin;
  const targetIsSuper  = target.role.superAdmin;
  const targetIsAdmin  = target.role.name === "ADMIN" && !target.role.superAdmin;
  const newRoleIsSuper = newRole.superAdmin;

  if (actorIsSuper) return { ok: true };

  if (actorIsAdmin) {
    if (targetIsSuper || targetIsAdmin) {
      return { ok: false, status: 403, reason: "Only super-admin can modify admin roles" };
    }
    if (newRoleIsSuper) {
      return { ok: false, status: 403, reason: "Only super-admin can grant super-admin" };
    }
    return { ok: true };
  }

  return { ok: false, status: 403, reason: "Insufficient permissions" };
}

/**
 * Single source of truth for user deletion. Mirrors canChangeRole's structure
 * since the matrix is nearly identical (no newRole dimension). No self-delete;
 * regular admins can't touch admins or super-admins; only super-admin can
 * delete super-admins or other admins.
 */
export function canDeleteUser(
  actor:  UserLite,
  target: UserLite,
): CanChangeRoleResult {
  if (actor.id === target.id) {
    return { ok: false, status: 403, reason: "Cannot delete your own account" };
  }

  const actorIsSuper  = actor.role.superAdmin;
  const actorIsAdmin  = actor.role.name === "ADMIN" && !actor.role.superAdmin;
  const targetIsSuper = target.role.superAdmin;
  const targetIsAdmin = target.role.name === "ADMIN" && !target.role.superAdmin;

  if (actorIsSuper) return { ok: true };

  if (actorIsAdmin) {
    if (targetIsSuper || targetIsAdmin) {
      return { ok: false, status: 403, reason: "Only super-admin can delete admin accounts" };
    }
    return { ok: true };
  }

  return { ok: false, status: 403, reason: "Insufficient permissions" };
}
