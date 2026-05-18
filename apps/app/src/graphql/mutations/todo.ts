import { gql } from "@apollo/client";

export const CREATE_TODO = gql`
  mutation CreateTodo($content: CreateTodoInput) {
    createTodo(content: $content) {
      id
      title
      description
      isCompleted
    }
  }
`;

export const UPDATE_TODO = gql`
  mutation UpdateTodo($content: UpdatePostInput) {
    updateTodo(content: $content) {
      id
      title
      description
      isCompleted
    }
  }
`;

export const DELETE_TODO = gql`
  mutation DeleteTodo($deleteTodoId: ID!) {
    deleteTodo(id: $deleteTodoId) {
      id
      title
    }
  }
`;
