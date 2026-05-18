# ── apps/api Dockerfile ──────────────────────────────────────────────────────
# Builds the GraphQL API service from the monorepo. Used by Railway to run
# the Apollo Server + Express process. Mirrors apps/worker/Dockerfile's
# structure — manifests first for caching, then install, then source, then
# per-package compile, then app build, then CMD.

FROM node:20-slim

# OpenSSL is required by Prisma's runtime. Curl + ca-certificates are
# useful for any outbound HTTPS the resolvers do (Linear API, S3 uploads).
RUN apt-get update -y \
 && apt-get install -y openssl ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@8 turbo typescript

WORKDIR /app

# ── Copy workspace manifests first (for better layer caching) ─────────────────
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

COPY packages/queue/package.json    ./packages/queue/package.json
COPY packages/database/package.json ./packages/database/package.json
# Prisma schema must be present before install because packages/database's
# postinstall runs `prisma generate`. Without this COPY, the
# frozen-lockfile install below fails with "Could not find Prisma Schema".
COPY packages/database/prisma/      ./packages/database/prisma/
COPY packages/typescript-config/    ./packages/typescript-config/
COPY apps/api/package.json          ./apps/api/package.json

# Root postinstall runs `node scripts/hoist-styled-jsx.js` — must be present
# before install or pnpm fails with MODULE_NOT_FOUND. No-op on the api image
# (styled-jsx isn't an api dep; script finds nothing and exits 0) but the
# file itself must exist.
COPY scripts/                       ./scripts/

# ── Install all workspace dependencies ───────────────────────────────────────
RUN pnpm install --frozen-lockfile

# ── Copy source ───────────────────────────────────────────────────────────────
COPY packages/queue/    ./packages/queue/
COPY packages/database/ ./packages/database/
COPY apps/api/          ./apps/api/

# ── Generate Prisma client (outputs per the schema's output config) ──────────
RUN mkdir -p apps/app/generated
RUN pnpm --filter=database exec prisma generate

# ── Compile shared workspace packages that apps/api requires at runtime ──────
# Every workspace package whose main/types points at ./dist must have `tsc`
# run here so the dist/ output exists before apps/api's build resolves the
# workspace import. Skipping any of these makes the api build fail with
# TS2307 "Cannot find module".
RUN cd packages/queue    && tsc
RUN cd packages/database && tsc

# ── Build apps/api ────────────────────────────────────────────────────────────
RUN pnpm --filter=api build

# ── Runtime ───────────────────────────────────────────────────────────────────
ENV NODE_ENV=production

# Tell node-config where to find config files. Container WORKDIR is /app, so
# by default node-config looks at /app/config and throws on the first
# config.get() call from apps/api/src/utils/index.ts.
ENV NODE_CONFIG_DIR=/app/apps/api/config

# Railway injects $PORT at runtime; apps/api/src/index.ts reads it.
EXPOSE 4000

CMD ["node", "apps/api/dist/index.js"]
