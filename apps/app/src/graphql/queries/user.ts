import { gql } from "@apollo/client";

export const GET_USERS = gql`
  query GetUsers(
    $pageNo: Int
    $pageSize: Int
    $sortField: String
    $sortOrder: SortOrder
  ) {
    getUsers(
      pageNo: $pageNo
      pageSize: $pageSize
      sortField: $sortField
      sortOrder: $sortOrder
    ) {
      users {
        id
        email
      }
      currentPage
      totalPages
      totalCount
    }
  }
`;

export const GET_USER = gql`
  query GetUser($getUserId: String!) {
    getUser(id: $getUserId) {
      id
      dob
      created_at
      email
      favorites {
        id
        post {
          id
        }
      }
      likes {
        id
        post {
          id
        }
      }
      name
      phone_number
      posts {
        id
      }
      profile_image_url
      role {
        id
        name
      }
    }
}
`;

export const GET_USER_ROLE = gql`
  query GetUserRole($id: Int!) {
    getUser(id: $id) {
      id
      email
      name
      role {
        id
        name
      }
    }
  }
`;
