import client from "../../lib/prisma";

const TodoQueries = {
  getTodo: async (_, { id }) => {
    try {
      const todo = await client.todo.findUnique({
        where: { id, deletedAt: null },
        include: {
          user: true,
        },
      });

      if (!todo) throw new Error("Todo not found");

      return todo;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    }
  },

  getAllTodos: async (_, { pageNo, pageSize, sortField, sortOrder }) => {
    try {
      const pageLength = Number(pageSize || 10);
      const skip = Number(((pageNo || 1) - 1) * pageLength);

      const orderBy =
        sortField && sortOrder
          ? { orderBy: { [sortField]: sortOrder.toLowerCase() } }
          : {};
      // @ts-ignore
      const todos = await client.todo.findMany({
        where: { deletedAt: null },
        include: {
          user: true,
        },
        take: pageLength,
        skip,
        ...orderBy,
      });

      if (!todos.length) throw new Error("No todos found");

      const totalCount = await client.todo.count({
        where: { deletedAt: null },
      });
      const totalPages = Math.ceil(totalCount / pageLength);

      return {
        todos,
        totalCount,
        totalPages,
        currentPage: pageNo || 1,
      };
    } catch (error: any) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    }
  },

  getUserTodos: async (
    _,
    { userId, pageNo, pageSize, sortField, sortOrder }
  ) => {
    try {
      const pageLength = Number(pageSize || 10);
      const skip = Number(((pageNo || 1) - 1) * pageLength);

      const orderBy =
        sortField && sortOrder
          ? { orderBy: { [sortField]: sortOrder.toLowerCase() } }
          : {};

      const authorExist = await client.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!authorExist) throw new Error("Author not found");

      // @ts-ignore
      const todos = await client.todo.findMany({
        where: { userId, deletedAt: null },
        include: {
          user: true,
        },
        take: pageLength,
        skip,
        ...orderBy,
      });

      if (!todos.length) throw new Error("No todos found");

      const totalCount = await client.todo.count({
        where: { userId, deletedAt: null },
      });
      const totalPages = Math.ceil(totalCount / pageLength);

      return {
        todos,
        totalCount,
        totalPages,
        currentPage: pageNo || 1,
      };
    } catch (error: any) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    }
  },
};

export default TodoQueries;
