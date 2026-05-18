import { Role } from "database/client";
import client from "../../lib/prisma";

const RoleMutations = {
  createRole: async (_, { content: payload }: { content: Role }) => {
    try {
      const roleExists = await client.role.findUnique({
        where: {
          name: payload.name,
        },
      });

      if (roleExists)
        throw new Error(`Role with name ${payload.name} already exists`);

      const role = await client.role.create({
        data: {
          name: payload.name,
        },
      });

      return role;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    }
  },

  updateRole: async (_, { content: payload }: { content: Role }) => {
    try {
      const role = await client.role.update({
        where: { id: payload.id },
        data: {
          name: payload.name,
        },
      });

      return role;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    }
  },
};

export default RoleMutations;
