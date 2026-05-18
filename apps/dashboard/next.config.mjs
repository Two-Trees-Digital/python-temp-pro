import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // No basePath — dashboard is deployed as a standalone Vercel project
  // on its own subdomain, so it should be served from root (/).
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
    // Tells Next.js file tracing to start from the monorepo root so Prisma
    // can find the query engine binary in the root node_modules store.
    outputFileTracingRoot: path.join(__dirname, "../../"),
    // Keep native Node.js modules out of the browser bundle.
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
    // Tell @vercel/nft to bundle the Prisma engine binaries with the Lambda.
    // The client is generated into apps/app/generated/client by the
    // database package (shared between app + dashboard).
    outputFileTracingIncludes: {
      "**": ["./apps/app/generated/client/**"],
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
