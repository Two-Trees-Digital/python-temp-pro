# ── Worker Dockerfile ────────────────────────────────────────────────────────
# Builds only the worker service from the monorepo.
# Used by Railway (or any Docker host) to run the BullMQ worker process.

FROM node:20-slim

# Install OpenSSL for Prisma + pnpm + TypeScript 5 (pinned — v6 changed CLI behavior)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@8 turbo typescript@5

WORKDIR /app

# ── Copy workspace manifests first (for better layer caching) ─────────────────
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./

COPY packages/queue/package.json           ./packages/queue/package.json
COPY packages/email/package.json           ./packages/email/package.json
COPY packages/database/package.json        ./packages/database/package.json
# Prisma schema must be present before install because packages/database's
# postinstall runs `prisma generate` (added in this same commit). Without
# this COPY, the frozen-lockfile install below fails with "Could not find
# Prisma Schema". See TWO-19 on two-trees-digital-new for the origin story.
COPY packages/database/prisma/             ./packages/database/prisma/
COPY packages/typescript-config/           ./packages/typescript-config/
COPY apps/worker/package.json              ./apps/worker/package.json

# Root postinstall runs `node scripts/hoist-styled-jsx.js` — must be present
# before install or pnpm fails with MODULE_NOT_FOUND. No-op on the worker
# image (styled-jsx isn't a worker dep; script find-s nothing and exits 0)
# but the file itself must exist.
COPY scripts/                              ./scripts/

# ── Install all workspace dependencies ───────────────────────────────────────
RUN pnpm install --frozen-lockfile

# ── Copy source ───────────────────────────────────────────────────────────────
COPY packages/queue/            ./packages/queue/
COPY packages/email/            ./packages/email/
COPY packages/database/         ./packages/database/
COPY apps/worker/               ./apps/worker/

# ── Generate Prisma client (outputs to apps/app/generated/client) ────────────
RUN mkdir -p apps/app/generated
RUN pnpm --filter=worker exec prisma generate --schema=../../packages/database/prisma/schema.prisma

# ── Compile shared packages to JS (worker requires them at runtime) ───────────
RUN cd packages/queue && tsc
RUN cd packages/email && tsc

# ── Build the worker ──────────────────────────────────────────────────────────
RUN cd apps/worker && tsc

# ── Runtime ───────────────────────────────────────────────────────────────────
ENV NODE_ENV=production

CMD ["node", "apps/worker/dist/index.js"]
