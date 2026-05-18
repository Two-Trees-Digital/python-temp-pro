import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each app/package can override this with its own vitest.config.ts
    globals: true,
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        ".next/",
        "**/*.config.*",
        "**/generated/**",
      ],
    },
  },
});
