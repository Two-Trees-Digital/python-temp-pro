import { Todo } from "database/client";
import client from "../../lib/prisma";

const TodoMutations = {
  createTodo: async (_, { content: payload }: { content: Todo }) => {
    try {
      const userExists = await client.user.findUnique({
        where: {
          id: payload.userId,
        },
      });

      if (!userExists) throw new Error("User does not exist");

      const todo = await client.todo.create({
        data: {
          title: payload.title,
          description: payload.description,
          isCompleted: payload.isCompleted,
          user: { connect: { id: payload.userId } },
        },
        include: {
          user: true,
        },
      });

      return todo;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    }
  },

  updateTodo: async (_, { content: payload }: { content: Todo }) => {
    try {
      const todo = await client.todo.update({
        where: { id: payload.id },
        data: {
          title: payload.title,
          description: payload.description,
          isCompleted: payload.isCompleted,
        },
        include: {
          user: true,
        },
      });

      return todo;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      } else {
        throw new Error(`Unexpected error: ${error}`);
      }
    }
  },

  deleteTodo: async (_, { id }) => {
    try {
      const todo = await client.todo.update({
        where: { id },
        data: {
          deletedAt: new Date(),
        },
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
};

export default TodoMutations;
