import client from "../../lib/prisma";
import type { GraphQLContext } from "../context";

const UserQueries = {
  // Canonical authenticated-viewer query. Resolves from context.actor — see
  // README "Auth contract". Returns null on no actor or stale userId (rather
  // than throwing UNAUTHENTICATED) so the field can sit alongside public
  // ones on the same query without breaking unauth callers.
  me: async (_parent: unknown, _args: unknown, ctx: GraphQLContext) => {
    if (!ctx.actor) return null;
    // findFirst (not findUnique) so we can filter soft-deleted rows alongside
    // the id lookup — findUnique only accepts unique-key shapes.
    return client.user.findFirst({
      where: { id: ctx.actor.userId, deletedAt: null },
    });
  },

  // Legacy stubs — kept until dashboard/app migrate off them.
  getUser: async (_: unknown, { id }: { id: string }) => {
    const user = await client.user.findUnique({
      where:   { id },
      include: { role: true, todos: true },
    });
    if (!user) throw new Error("User not found");
    return user;
  },

  getUsers: async (
    _: unknown,
    { pageNo, pageSize, sortField, sortOrder }: any,
  ) => {
    const pageLength = Number(pageSize || 10);
    const skip       = Number(((pageNo || 1) - 1) * pageLength);

    const users = await client.user.findMany({
      include: { role: true, todos: true },
      take: pageLength,
      skip,
      ...(sortField && sortOrder
        ? { orderBy: { [sortField]: sortOrder.toLowerCase() as "asc" | "desc" } }
        : {}),
    });
    if (!users.length) throw new Error("No users found");

    const totalCount = await client.user.count();
    const totalPages = Math.ceil(totalCount / pageLength);

    return {
      users,
      totalCount,
      totalPages,
      currentPage: pageNo || 1,
    };
  },
};

export default UserQueries;
