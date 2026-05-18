import { gql } from "@apollo/client";

export const GET_USER_TODOS = gql`
  query GetUserTodos(
    $userId: ID!
    $pageNo: Int
    $pageSize: Int
    $sortField: String
    $sortOrder: SortOrder
  ) {
    getUserTodos(
      userId: $userId
      pageNo: $pageNo
      pageSize: $pageSize
      sortField: $sortField
      sortOrder: $sortOrder
    ) {
      todos {
        id
        title
        description
        isCompleted
        createdAt
      }
      currentPage
      totalCount
      totalPages
    }
  }
`;
