import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // TT-118: allowlist OAuth profile-image hosts. Wildcard SHOULD cover
    // all lh* subdomains but Next 14.1.0 has been flaky — listing
    // explicitly as a backup so this can't silently break.
    remotePatterns: [
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "lh4.googleusercontent.com" },
      { protocol: "https", hostname: "lh5.googleusercontent.com" },
      { protocol: "https", hostname: "lh6.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
  experimental: {
    // outputFileTracingRoot MUST be inside experimental on Next.js 14.1
    // (see CLAUDE.md §5.1 in two-trees-digital-new). Do not hoist it out.
    // Tells Next.js file tracing to start from the monorepo root so it can
    // find the Prisma engine binary in the root node_modules/.pnpm/ store.
    outputFileTracingRoot: path.join(__dirname, "../../"),
    // Keep native Node.js modules out of the browser bundle.
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
    // Works with scripts/hoist-styled-jsx.js (root postinstall) to bundle
    // styled-jsx as real files in the Vercel Lambda. pnpm's symlink chain
    // for the Next.js @babel/core peer-dep resolution path doesn't include
    // a working styled-jsx symlink, so without this the Lambda crashes
    // at runtime with `Cannot find module 'styled-jsx/package.json'`.
    outputFileTracingIncludes: {
      "/**": ["node_modules/styled-jsx/**"],
    },
  },
  async rewrites() {
    return [
      { source: "/healthz",     destination: "/api/health" },
      { source: "/api/healthz", destination: "/api/health" },
      { source: "/health",      destination: "/api/health" },
      { source: "/ping",        destination: "/api/health" },
    ];
  },
};

export default nextConfig;
