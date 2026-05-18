"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation } from "@apollo/client";
import toast from "react-hot-toast";
import { MdDelete, MdOutlineDoneAll } from "react-icons/md";

import { GET_USER_TODOS } from "@/graphql/queries/todo";
import { DELETE_TODO, UPDATE_TODO } from "@/graphql/mutations/todo";

export default function TodoList() {
  const session = useSession();
  const {
    loading,
    data,
    refetch: refetchTodos,
  } = useQuery(GET_USER_TODOS, {
    variables: {
      userId: session.data?.user.id,
      pageNo: 1,
      pageSize: 20,
      sortField: "createdAt",
      sortOrder: "ASC",
    },
  });
  const [updateTodo, { loading: loadingUpdate }] = useMutation(UPDATE_TODO);
  const [deleteTodo, {}] = useMutation(DELETE_TODO);

  useEffect(() => {
    refetchTodos();
  }, []);

  const handleTodoCompleted = async (todo: any) => {
    try {
      const response = await updateTodo({
        variables: {
          content: {
            id: todo.id,
            title: todo.title,
            description: todo.description,
            isCompleted: true,
            userId: session?.data?.user?.id,
          },
        },
      });

      toast.success("Todo updated successfully");
    } catch (error: any) {
      console.log(error.message);
      toast.error(error.message);
    }
  };

  const handleDeleteTodo = async (id: string) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this todo?"
    );

    if (isConfirmed) {
      try {
        const response = await deleteTodo({
          variables: {
            deleteTodoId: id,
          },
        });

        refetchTodos();

        toast.success("Todo deleted successfully");
      } catch (error: any) {
        console.log(error.message);
        toast.error(error.message);
      }
    } else {
      console.log("Deletion canceled");
    }
  };

  if (loading) return <div className="text-center">Loading...</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
      {data?.getUserTodos?.todos.length ? (
        data?.getUserTodos?.todos.map((todo: any) => (
          <div className="relative flex flex-col space-y-4 justify-between bg-slate-100 p-4 rounded-lg">
            <div>
              <h2 className="text-lg font-medium">{todo.title}</h2>
              <p className="text-sm">{todo.description}</p>
            </div>
            <div className="flex items-center justify-between">
              {todo.isCompleted === "true" && (
                <span className="text-green-400 text-2xl">
                  <MdOutlineDoneAll />
                </span>
              )}
              {todo.isCompleted === "false" && (
                <button
                  type="button"
                  disabled={loadingUpdate}
                  className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none font-medium rounded-lg text-xs px-3 py-2"
                  onClick={() => handleTodoCompleted(todo)}
                >
                  Mark as Done
                </button>
              )}
            </div>
            <span
              className="absolute -top-2 right-2 text-lg text-red-500 cursor-pointer"
              onClick={() => handleDeleteTodo(todo.id)}
            >
              <MdDelete />
            </span>
          </div>
        ))
      ) : (
        <h4 className="text-xl font-semibold text-red-500">No Todo found</h4>
      )}
    </div>
  );
}
