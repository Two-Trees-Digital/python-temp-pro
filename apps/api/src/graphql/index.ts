import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageProductionDefault } from "@apollo/server/plugin/landingPage/default";

import TypeDefs  from "./type-defs";
import queries   from "./queries";
import mutations from "./mutations";
import types     from "./types";

// In dev: Apollo Sandbox renders at /graphql with introspection on — exploring
// the schema and replaying queries works in a browser. In prod: introspection
// is off and the simpler landing page replaces Sandbox. Schema exploration
// against prod goes via the Apollo Studio cloud-hosted explorer or against a
// local dev server pointed at prod.
export default async function createGraphqlServer() {
  const isProd = process.env.NODE_ENV === "production";

  const server = new ApolloServer({
    typeDefs:      TypeDefs,
    resolvers:     { ...queries, ...mutations, ...types },
    introspection: !isProd,
    plugins:       isProd
      ? [ApolloServerPluginLandingPageProductionDefault({ embed: false })]
      : undefined,
  });

  await server.start();

  return server;
}
