import type { CodegenConfig } from "@graphql-codegen/cli";

// GraphQL codegen — typed Resolvers interface for apps/api.
//
// Output: apps/api/src/graphql/__generated__/types.ts
//   - Resolvers<GraphQLContext> bound to the apps/api context.
//   - New resolvers opt in by typing themselves as
//     `Resolvers["Mutation"]` etc. — drift between schema and resolver
//     becomes a typecheck failure.
//   - Existing stub resolvers stay untyped — useIndexSignature: true keeps
//     the interface permissive.
//
// Run `pnpm codegen` from the repo root. CI runs the same script and fails
// the build if `git diff --exit-code` shows any generated files would
// change — this enforces "regenerate before commit."
//
// Consumer-side codegen (apps/app, apps/dashboard) is a future expansion;
// add new `generates` entries when the consumers start typing operations.

const config: CodegenConfig = {
  overwrite: true,
  schema: "apps/api/src/graphql/type-defs/*.graphql",

  generates: {
    "apps/api/src/graphql/__generated__/types.ts": {
      plugins: ["typescript", "typescript-resolvers"],
      config: {
        // Bind generated `Resolvers<ContextType>` to apps/api's GraphQLContext.
        // Relative path is from the generated file's location.
        contextType: "../context#GraphQLContext",

        // Permissive — resolvers can add helper fields not in the schema
        // during dev. Strict-typed resolvers opt in by annotating themselves.
        useIndexSignature: true,

        // Preserve null vs undefined distinction at the boundary.
        avoidOptionals: { field: true },
      },
    },
  },

  // Don't ignore changes — keeps generated files always in sync with the
  // schema. CI's `git diff --exit-code` check is the enforcement.
  ignoreNoDocuments: true,
};

export default config;
