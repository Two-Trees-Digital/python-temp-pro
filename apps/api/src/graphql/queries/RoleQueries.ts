import client from "../../lib/prisma";

const RoleQueries = {
  getRolebyId: async (_, { id }) => {
    try {
      const role = await client.role.findUnique({
        where: { id },
      });

      if (!role) throw new Error("Role not found");

      return role;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    }
  },

  getRolebyName: async (_, { name }) => {
    try {
      const role = await client.role.findUnique({
        where: { name: name },
      });

      if (!role) throw new Error("Role not found");

      return role;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    }
  },

  getAllRoles: async (_, {}) => {
    try {
      const roles = await client.role.findMany();

      if (!roles.length) throw new Error("No roles found");

      return roles;
    } catch (error: any) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    }
  },
};

export default RoleQueries;
