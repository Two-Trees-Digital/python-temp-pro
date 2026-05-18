#!/usr/bin/env node
/**
 * turbo-temp bootstrap CLI
 *
 * Spins up a new full-stack project from the turbo-temp template:
 *   1. Creates a GitHub repo (from Two-Trees-Digital/turbo-temp)
 *   2. Creates a Neon PostgreSQL database
 *   3. Writes .env files
 *   4. Sets GitHub Actions secrets
 *   5a. (AWS)    Provisions an EC2 instance, deploys SSH key, bootstraps server
 *   5b. (Vercel) Creates Vercel projects for app + dashboard, links env vars
 *   6. Creates a Linear project
 *   7. Clones locally and runs pnpm install + db:push
 *
 * Required env vars (set in your shell or a local .env before running):
 *   GITHUB_TOKEN     — classic PAT with repo + admin:org scope
 *   GITHUB_ORG       — org or username to create the repo under
 *   NEON_API_KEY     — from console.neon.tech → Account → API Keys
 *   LINEAR_API_KEY   — from linear.app → Settings → API → Personal API Keys
 *
 * For AWS deploys also set:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 *
 * For Vercel deploys also set:
 *   VERCEL_TOKEN, VERCEL_TEAM_ID (optional, for team accounts)
 */

import "dotenv/config";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { execSync } from "child_process";
import { existsSync, writeFileSync, mkdirSync, rmSync } from "fs";
import path from "path";
import os from "os";

import { createGitHubRepo, setGitHubSecrets } from "./providers/github.js";
import { createNeonDatabase } from "./providers/neon.js";
import { provisionEC2 } from "./providers/aws.js";
import { provisionVercel } from "./providers/vercel.js";
import { createLinearProject } from "./providers/linear.js";
import { writeEnvFiles } from "./providers/env.js";

// ─── Banner ──────────────────────────────────────────────────────────────────

console.log(chalk.bold.green("\n🌲 Two Trees Digital — Project Bootstrap\n"));
console.log(chalk.gray("Spinning up a new project from turbo-temp...\n"));

// ─── Validate required env vars ──────────────────────────────────────────────

const missing = [];
if (!process.env.GITHUB_TOKEN) missing.push("GITHUB_TOKEN");
if (!process.env.GITHUB_ORG) missing.push("GITHUB_ORG");
if (!process.env.NEON_API_KEY) missing.push("NEON_API_KEY");
if (!process.env.LINEAR_API_KEY) missing.push("LINEAR_API_KEY");

if (missing.length > 0) {
  console.error(chalk.red(`\n✗ Missing required environment variables:\n`));
  missing.forEach((v) => console.error(chalk.red(`  • ${v}`)));
  console.error(
    chalk.gray(
      "\nSet them in your shell or create a .env file in scripts/bootstrap/\n"
    )
  );
  process.exit(1);
}

// ─── Prompts ─────────────────────────────────────────────────────────────────

const answers = await inquirer.prompt([
  {
    type: "input",
    name: "projectName",
    message: "Project name (e.g. my-app, recharts-v2):",
    validate: (v) =>
      /^[a-z0-9-]+$/.test(v)
        ? true
        : "Use lowercase letters, numbers, and hyphens only.",
  },
  {
    type: "input",
    name: "projectDescription",
    message: "Short description:",
    default: "A new Two Trees Digital project",
  },
  {
    type: "list",
    name: "hosting",
    message: "Hosting option:",
    choices: [
      { name: "Vercel  (easiest — recommended for Next.js)", value: "vercel" },
      { name: "AWS EC2 (full control, pm2)", value: "aws" },
    ],
  },
  {
    type: "confirm",
    name: "privateRepo",
    message: "Private GitHub repo?",
    default: true,
  },
  {
    type: "confirm",
    name: "createLinear",
    message: "Create a Linear project?",
    default: true,
  },
  {
    type: "confirm",
    name: "cloneLocally",
    message: "Clone repo and install dependencies locally when done?",
    default: true,
  },
  {
    type: "input",
    name: "localDir",
    message: "Local directory to clone into:",
    default: `~/Code`,
    when: (a) => a.cloneLocally,
  },
]);

const { projectName, projectDescription, hosting, privateRepo, createLinear, cloneLocally, localDir } = answers;

console.log(chalk.bold(`\n📋 Plan for "${projectName}":`));
console.log(`  Repo:     ${chalk.cyan(`${process.env.GITHUB_ORG}/${projectName}`)}`);
console.log(`  Hosting:  ${chalk.cyan(hosting === "aws" ? "AWS EC2 + pm2" : "Vercel")}`);
console.log(`  Database: ${chalk.cyan("Neon (PostgreSQL)")}`);
console.log(`  CI/CD:    ${chalk.cyan(hosting === "aws" ? ".github/workflows/deploy-aws.yml" : ".github/workflows/deploy-vercel.yml")}`);
if (createLinear) console.log(`  Linear:   ${chalk.cyan(`Project "${projectName}"`)}`);
console.log();

const { confirm } = await inquirer.prompt([
  {
    type: "confirm",
    name: "confirm",
    message: "Proceed?",
    default: true,
  },
]);

if (!confirm) {
  console.log(chalk.yellow("\nAborted.\n"));
  process.exit(0);
}

// ─── Step 1: GitHub repo ─────────────────────────────────────────────────────

let repoUrl, repoSshUrl;
{
  const spinner = ora("Creating GitHub repo from turbo-temp template…").start();
  try {
    const repo = await createGitHubRepo({
      org: process.env.GITHUB_ORG,
      name: projectName,
      description: projectDescription,
      isPrivate: privateRepo,
      templateOwner: process.env.GITHUB_ORG,
      templateRepo: "turbo-temp",
    });
    repoUrl = repo.html_url;
    repoSshUrl = repo.ssh_url;
    spinner.succeed(`GitHub repo created: ${chalk.cyan(repoUrl)}`);
  } catch (err) {
    spinner.fail(`GitHub repo failed: ${err.message}`);
    process.exit(1);
  }
}

// ─── Step 2: Neon database ───────────────────────────────────────────────────

let databaseUrl, directUrl;
{
  const spinner = ora("Creating Neon database…").start();
  try {
    const neon = await createNeonDatabase({
      projectName,
      apiKey: process.env.NEON_API_KEY,
    });
    databaseUrl = neon.pooledConnectionString; // pooled — for runtime (DATABASE_URL)
    directUrl   = neon.connectionString;       // direct  — for migrations (DIRECT_URL)
    spinner.succeed(`Neon database ready: ${chalk.cyan(neon.projectId)}`);
  } catch (err) {
    spinner.fail(`Neon database failed: ${err.message}`);
    process.exit(1);
  }
}

// ─── Generate shared secrets (once — reused across Vercel, GitHub, .env files) ─

const nextAuthSecret = generateSecret(32);
const privateKey = generateSecret(32);

// ─── Step 3: Hosting provisioning ────────────────────────────────────────────

let hostingSecrets = {};
let vercelAppUrl = null;
let vercelDashUrl = null;

if (hosting === "aws") {
  const spinner = ora("Provisioning EC2 instance…").start();
  try {
    const ec2 = await provisionEC2({ projectName });
    hostingSecrets = {
      EC2_HOST: ec2.publicIp,
      EC2_USER: "ubuntu",
      EC2_SSH_KEY: ec2.privateKey,
      APP_DIR: `~/app`,
    };
    spinner.succeed(`EC2 instance ready: ${chalk.cyan(ec2.publicIp)}`);
    console.log(chalk.gray("  Instance ID: " + ec2.instanceId));
    console.log(
      chalk.yellow(
        "  ⚠ Save the SSH key above — it won't be shown again.\n"
      )
    );
  } catch (err) {
    spinner.fail(`EC2 provisioning failed: ${err.message}`);
    console.log(
      chalk.yellow(
        "\n  You can provision EC2 manually and add EC2_HOST, EC2_USER, EC2_SSH_KEY, APP_DIR as GitHub secrets.\n"
      )
    );
  }
} else {
  const spinner = ora("Creating Vercel projects…").start();
  try {
    const vercel = await provisionVercel({
      projectName,
      token: process.env.VERCEL_TOKEN,
      teamId: process.env.VERCEL_TEAM_ID,
      repoUrl,
      databaseUrl,
      directUrl,
      nextAuthSecret,
      privateKey,
    });
    hostingSecrets = {
      VERCEL_TOKEN: process.env.VERCEL_TOKEN,
      VERCEL_ORG_ID: vercel.orgId,
      VERCEL_APP_PROJECT_ID: vercel.appProjectId,
      VERCEL_DASHBOARD_PROJECT_ID: vercel.dashboardProjectId,
    };
    vercelAppUrl = vercel.appUrl;
    vercelDashUrl = vercel.dashboardUrl;
    spinner.succeed(
      `Vercel projects created: ${chalk.cyan(vercel.appUrl)} / ${chalk.cyan(vercel.dashboardUrl)}`
    );
  } catch (err) {
    spinner.fail(`Vercel setup failed: ${err.message}`);
    console.log(
      chalk.yellow(
        "\n  You can create Vercel projects manually and add the secrets to GitHub.\n"
      )
    );
  }
}

// ─── Step 4: Write .env files ─────────────────────────────────────────────────

{
  const spinner = ora("Writing .env files…").start();
  try {
    await writeEnvFiles({
      projectName,
      databaseUrl,
      directUrl,
      hosting,
      nextAuthSecret,
      privateKey,
    });
    spinner.succeed(".env files written (check scripts/bootstrap/output/)");
  } catch (err) {
    spinner.fail(`Failed to write .env files: ${err.message}`);
  }
}

// ─── Step 5: GitHub Actions secrets ──────────────────────────────────────────

{
  const spinner = ora("Setting GitHub Actions secrets…").start();
  const secrets = {
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
    // Use the same secrets generated above — not new ones — so Vercel,
    // GitHub Actions, and local .env files are all in sync.
    NEXTAUTH_SECRET: nextAuthSecret,
    NEXTAUTH_URL: hosting === "vercel"
      ? (vercelAppUrl ?? `https://${projectName}-app.vercel.app`)
      : `http://${hostingSecrets.EC2_HOST || "YOUR_EC2_IP"}`,
    NEXT_PUBLIC_PRIVATE_KEY: privateKey,
    NEXT_PUBLIC_BACKEND_URL: hosting === "vercel"
      ? `https://${projectName}-app.vercel.app/api`
      : `http://${hostingSecrets.EC2_HOST || "YOUR_EC2_IP"}:4000/graphql`,
    GH_PAT: process.env.GITHUB_TOKEN,
    GH_USERNAME: process.env.GITHUB_ORG,
    ...hostingSecrets,
  };

  try {
    await setGitHubSecrets({
      org: process.env.GITHUB_ORG,
      repo: projectName,
      token: process.env.GITHUB_TOKEN,
      secrets,
    });
    spinner.succeed(`${Object.keys(secrets).length} GitHub secrets set`);
  } catch (err) {
    spinner.fail(`GitHub secrets failed: ${err.message}`);
    console.log(chalk.gray("  You can set secrets manually in repo Settings → Secrets → Actions"));
  }
}

// ─── Step 6: Linear project ───────────────────────────────────────────────────

if (createLinear) {
  const spinner = ora("Creating Linear project…").start();
  try {
    const linear = await createLinearProject({
      name: projectName,
      description: projectDescription,
      apiKey: process.env.LINEAR_API_KEY,
    });
    spinner.succeed(`Linear project created: ${chalk.cyan(linear.url)}`);
  } catch (err) {
    spinner.fail(`Linear failed: ${err.message}`);
  }
}

// ─── Step 7: Clone + install locally ─────────────────────────────────────────

if (cloneLocally) {
  const resolvedDir = localDir.replace("~", process.env.HOME);
  const targetPath = path.join(resolvedDir, projectName);

  if (existsSync(targetPath)) {
    console.log(chalk.yellow(`\n  ⚠ Directory ${targetPath} already exists — skipping clone.`));
  } else {
    // Clone
    console.log(chalk.gray(`\n  Cloning into ${targetPath}…`));
    try {
      execSync(`git clone ${repoSshUrl} ${targetPath}`, { stdio: "inherit" });
      console.log(chalk.green("  ✓ Repo cloned"));
    } catch (err) {
      console.log(chalk.red(`  ✗ Clone failed: ${err.message}`));
      printManualSteps(targetPath, databaseUrl);
      process.exit(1);
    }

    // Remove the unused CI/CD workflow so only the relevant one fires
    const unusedWorkflow = hosting === "vercel" ? "deploy-aws.yml" : "deploy-vercel.yml";
    const unusedWorkflowPath = path.join(targetPath, ".github", "workflows", unusedWorkflow);
    try {
      execSync(`rm ${unusedWorkflowPath}`, { stdio: "pipe" });
      execSync(`cd ${targetPath} && git add .github && git commit -m "chore: remove unused ${unusedWorkflow} workflow"`, { stdio: "pipe" });
      execSync(`cd ${targetPath} && git push origin main`, { stdio: "pipe" });
      console.log(chalk.green(`  ✓ Removed unused workflow (${unusedWorkflow})`));
    } catch (err) {
      console.log(chalk.yellow(`  ⚠ Could not remove unused workflow: ${err.message}`));
    }

    // Install deps
    console.log(chalk.gray("\n  Installing dependencies (this takes ~30s)…"));
    try {
      execSync(`cd ${targetPath} && pnpm install`, { stdio: "inherit" });
      console.log(chalk.green("  ✓ Dependencies installed"));
    } catch (err) {
      console.log(chalk.red(`  ✗ pnpm install failed: ${err.message}`));
      printManualSteps(targetPath, databaseUrl);
      process.exit(1);
    }

    // db:push — run with visible output and a 60s timeout
    console.log(chalk.gray("\n  Pushing database schema (pnpm db:push)…"));
    try {
      execSync(`cd ${targetPath} && pnpm db:push`, {
        stdio: "inherit",
        timeout: 60_000,
        env: { ...process.env, DATABASE_URL: databaseUrl, DIRECT_URL: directUrl },
      });
      console.log(chalk.green("  ✓ Database schema pushed"));
    } catch (err) {
      console.log(chalk.red(`  ✗ db:push failed: ${err.message}`));
      console.log(chalk.yellow(`\n  Run manually:\n    cd ${targetPath}\n    DATABASE_URL='${databaseUrl}' pnpm db:push`));
    }
  }
}

// ─── Step 8: Deploy to Vercel via CLI ────────────────────────────────────────
// Runs regardless of cloneLocally. If the user opted out of cloning we do a
// temporary clone here just for the deployment, then remove it afterwards.
// This avoids relying on GitHub Actions (which fires before secrets exist) or
// the Vercel REST API (which requires the GitHub app to have repo access).

if (hosting === "vercel" && hostingSecrets.VERCEL_APP_PROJECT_ID) {
  let deployDir;
  let isTempClone = false;

  if (cloneLocally) {
    // Reuse the already-cloned directory
    const resolvedDir = (localDir || "~/Code").replace("~", process.env.HOME);
    deployDir = path.join(resolvedDir, projectName);
  } else {
    // Clone to a temp dir just for deployment, clean up afterwards
    deployDir = path.join(os.tmpdir(), `turbo-deploy-${projectName}`);
    isTempClone = true;
  }

  if (!existsSync(deployDir)) {
    const spinner = ora("Cloning repo for Vercel deployment…").start();
    try {
      execSync(`git clone ${repoSshUrl} ${deployDir}`, { stdio: "pipe" });
      execSync(
        `cd ${deployDir} && NODE_ENV=development npx --yes pnpm@8 install --no-frozen-lockfile`,
        { stdio: "pipe" }
      );
      spinner.succeed("Repo cloned for deployment");
    } catch (err) {
      spinner.fail(`Clone for deployment failed: ${err.message}`);
      console.log(chalk.gray("  Deploy manually from the Vercel dashboard."));
      deployDir = null;
    }
  }

  if (deployDir && existsSync(deployDir)) {
    const vercelDir = path.join(deployDir, ".vercel");
    const vercelConfigPath = path.join(vercelDir, "project.json");
    mkdirSync(vercelDir, { recursive: true });

    const deployToVercel = (projectId, label) => {
      const config = { projectId, orgId: hostingSecrets.VERCEL_ORG_ID };
      writeFileSync(vercelConfigPath, JSON.stringify(config));

      console.log(chalk.bold(`\n  ── Vercel deploy: ${label} ──────────────────`));
      console.log(chalk.gray(`  project.json: ${JSON.stringify(config)}`));
      console.log(chalk.gray(`  cwd: ${deployDir}`));
      console.log(chalk.gray(`  This will take 2–4 minutes…\n`));

      // Use explicit "deploy" subcommand so there's no ambiguity about what
      // the CLI will do. --prod targets production, --yes answers all prompts.
      execSync(
        `npx --yes vercel@latest deploy --prod --yes --token=${process.env.VERCEL_TOKEN}`,
        { cwd: deployDir, stdio: "inherit" }
      );
      console.log(chalk.green(`\n  ✓ ${label} deployed to Vercel`));
    };

    try {
      deployToVercel(hostingSecrets.VERCEL_APP_PROJECT_ID, "app");
      deployToVercel(hostingSecrets.VERCEL_DASHBOARD_PROJECT_ID, "dashboard");
    } catch (err) {
      console.log(chalk.red(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
      console.log(chalk.red(`  ✗ Vercel deploy failed`));
      console.log(chalk.red(`  Error: ${err.message}`));
      console.log(chalk.red(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`));
      console.log(chalk.gray("  You can deploy manually: Vercel dashboard → Project → Deployments → Deploy"));
    }

    // Remove the temp clone if we created it solely for deployment
    if (isTempClone) {
      try {
        rmSync(deployDir, { recursive: true, force: true });
      } catch {}
    }
  }
}

// ─── Done ─────────────────────────────────────────────────────────────────────

console.log(chalk.bold.green(`\n✅ "${projectName}" is ready!\n`));
console.log(`  GitHub:    ${chalk.cyan(repoUrl)}`);
if (hosting === "vercel" && vercelAppUrl) {
  console.log(`  App:       ${chalk.cyan(vercelAppUrl)}`);
  console.log(`  Dashboard: ${chalk.cyan(vercelDashUrl)}`);
} else if (hostingSecrets.EC2_HOST) {
  console.log(`  Server:    ${chalk.cyan(`http://${hostingSecrets.EC2_HOST}`)}`);
}
console.log(
  chalk.gray(
    "\n  Next: copy the .env contents from scripts/bootstrap/output/ into your project root.\n"
  )
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateSecret(bytes = 32) {
  return Array.from({ length: bytes }, () =>
    Math.floor(Math.random() * 36).toString(36)
  ).join("");
}

function printManualSteps(targetPath, databaseUrl) {
  console.log(chalk.gray("\n  Complete setup manually:"));
  console.log(chalk.gray(`    cd ${targetPath}`));
  console.log(chalk.gray("    pnpm install"));
  console.log(chalk.gray(`    DATABASE_URL='${databaseUrl}' pnpm db:push`));
}
