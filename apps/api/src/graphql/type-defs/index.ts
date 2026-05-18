import { gql } from "apollo-server-express";
import { readFileSync } from "fs";
import { join } from "path";

// New .graphql files use `extend type Query`/`Mutation`; graphql-tag merges them.
const read = (file: string) => readFileSync(join(__dirname, file), "utf-8");

const scalarsTypeDefs = read("./scalars.graphql");
const userTypeDefs    = read("./user.graphql");
const roleTypeDefs    = read("./role.graphql");
const todoTypeDefs    = read("./todo.graphql");

const TypeDefs = gql`
  ${scalarsTypeDefs}
  ${userTypeDefs}
  ${roleTypeDefs}
  ${todoTypeDefs}
`;

export default TypeDefs;
