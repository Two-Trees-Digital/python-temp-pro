import { gql } from "@apollo/client";

export const LOGIN_USER_QUERY = `
mutation LoginUser($content: LoginUserInput!) {
  loginUser(content: $content) {
    id
    name
    email
    profileImage
    role {
      id
      name
    }
    token
  }
}
`;

export const REGISTER_USER = gql`
  mutation Mutation($content: RegisterUserInput!) {
    registerUser(content: $content) {
      id
    }
  }
`;
