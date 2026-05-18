# turbo-temp bootstrap CLI

Spins up a complete new project from the `turbo-temp` template in one command.

## What it does

1. **GitHub repo** — Creates a new private repo from `Two-Trees-Digital/turbo-temp`
2. **Neon database** — Provisions a new PostgreSQL project on [Neon](https://neon.tech)
3. **Hosting** — Either:
   - **Vercel**: Creates Vercel projects for `apps/app` and `apps/dashboard`, links env vars
   - **AWS EC2**: Provisions a `t3.small` Ubuntu 22.04 instance with Node 22, pnpm, and pm2 pre-installed
4. **GitHub Actions secrets** — Sets all required secrets on the new repo automatically
5. **Linear project** — Creates a new Linear project under your team
6. **Local setup** — Clones the repo, runs `pnpm install`, and pushes the Prisma schema

## Setup

### 1. Install bootstrap dependencies

```sh
pnpm bootstrap:install
# or manually:
cd scripts/bootstrap && pnpm install
```

### 2. Set environment variables

Create `scripts/bootstrap/.env` (or export in your shell):

```env
# Required for all projects
GITHUB_TOKEN=ghp_...        # classic PAT — repo + admin:org scopes
GITHUB_ORG=Two-Trees-Digital # org or username to create repos under
NEON_API_KEY=...             # from console.neon.tech → Account → API Keys
LINEAR_API_KEY=...           # from linear.app → Settings → API → Personal API Keys

# Required for Vercel deploys
VERCEL_TOKEN=...             # from vercel.com/account/tokens
VERCEL_TEAM_ID=...           # optional — only for team accounts

# Required for AWS deploys
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-2         # default region
```

### 3. Run

```sh
pnpm bootstrap
```

You'll be prompted for the project name, hosting option, and preferences. The whole process takes about 2 minutes.

## Output

After running, check `scripts/bootstrap/output/<project-name>/` for generated `.env` files:

```
output/
└── my-project/
    ├── .env               # root (DATABASE_URL for db:push)
    ├── app.env.local      # copy to apps/app/.env.local
    ├── dashboard.env.local  # copy to apps/dashboard/.env.local
    └── README.md          # copy instructions
```

## File structure

```
scripts/bootstrap/
├── index.js               # Main CLI entry point — prompts + orchestration
├── package.json           # Bootstrap-only dependencies (not in monorepo)
├── README.md              # This file
└── providers/
    ├── github.js          # GitHub repo creation + secrets
    ├── neon.js            # Neon database provisioning
    ├── aws.js             # EC2 instance + security group setup
    ├── vercel.js          # Vercel project creation + env vars
    ├── linear.js          # Linear project creation
    └── env.js             # .env file writer
```

## Notes

- The bootstrap script's `package.json` is intentionally separate from the monorepo so its dependencies (AWS SDK, Octokit, etc.) don't bloat the production bundle.
- The `output/` directory is gitignored — generated env files stay local.
- For AWS: the EC2 private key is printed once and stored in GitHub Secrets as `EC2_SSH_KEY`. It is not stored anywhere else.
