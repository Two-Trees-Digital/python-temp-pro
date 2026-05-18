import client from "../../lib/prisma";
import type { GraphQLContext } from "../context";

// Canonical type-resolver pattern. Field resolvers run when the client
// requests that field on a User — keeps the parent query lean and lets
// callers compose what they actually need. See README "Resolver conventions".
const User = {
  role: async (
    parent: { id: string; roleId?: string | null },
    _args: unknown,
    _ctx: GraphQLContext,
  ) => {
    if (!parent.roleId) return null;
    return client.role.findUnique({ where: { id: parent.roleId } });
  },

  todos: async (
    parent: { id: string },
    _args: unknown,
    _ctx: GraphQLContext,
  ) => {
    return client.todo.findMany({
      where:   { userId: parent.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  },
};

export default User;
