/**
 * Vercel provider
 *
 * Creates Vercel projects for apps/app and apps/dashboard,
 * then links environment variables.
 *
 * Requires env vars: VERCEL_TOKEN, VERCEL_TEAM_ID (optional)
 */

const VERCEL_API = "https://api.vercel.com";

/**
 * @param {object} opts
 * @param {string} opts.projectName    - Base project name
 * @param {string} opts.token          - Vercel personal access token
 * @param {string} [opts.teamId]       - Vercel team ID (optional)
 * @param {string} opts.repoUrl        - GitHub repo HTTPS URL
 * @param {string} opts.databaseUrl    - Neon connection string
 * @param {string} opts.nextAuthSecret - Shared NEXTAUTH_SECRET
 * @param {string} opts.privateKey     - Shared NEXT_PUBLIC_PRIVATE_KEY
 * @returns {Promise<{
 *   orgId: string,
 *   appProjectId: string,
 *   dashboardProjectId: string,
 *   appUrl: string,
 *   dashboardUrl: string
 * }>}
 */
export async function provisionVercel({ projectName, token, teamId, repoUrl, databaseUrl, directUrl, nextAuthSecret, privateKey }) {
  if (!token) {
    throw new Error("VERCEL_TOKEN is required for Vercel provisioning");
  }

  const teamQuery = teamId ? `?teamId=${teamId}` : "";

  // Parse GitHub repo details from the URL
  // e.g. https://github.com/Two-Trees-Digital/my-app
  const repoMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!repoMatch) throw new Error(`Could not parse GitHub repo from URL: ${repoUrl}`);
  const [, repoOrg, repoName] = repoMatch;

  // 1. Fetch org ID and team slug
  // The team slug is used to construct a guaranteed-working production domain:
  // {projectName}-app-{teamSlug}.vercel.app — always available to the team,
  // unlike {projectName}-app.vercel.app which may be claimed by another user.
  const me = await vercelFetch("/v2/user", token);
  const orgId = teamId || me.user?.id;
  let teamSlug = null;
  if (teamId) {
    try {
      const team = await vercelFetch(`/v2/teams/${teamId}`, token);
      teamSlug = team.slug;
    } catch {
      // non-fatal — fall back to simple domain
    }
  }

  // 2. Create project for apps/app
  // rootDirectory tells Vercel which sub-package to build.
  // installCommand/buildCommand run from the monorepo root (cd ../..) so
  // pnpm-lock.yaml is accessible and turbo runs the full pipeline (prisma generate → build).
  const appProject = await vercelFetch(`/v10/projects${teamQuery}`, token, "POST", {
    name: `${projectName}-app`,
    framework: "nextjs",
    rootDirectory: "apps/app",
    installCommand: "cd ../.. && NODE_ENV=development npx --yes pnpm@8 install --no-frozen-lockfile",
    buildCommand: "cd ../.. && npx --yes pnpm@8 turbo build --filter=app",
    outputDirectory: ".next",
    nodeVersion: "22.x",
  });

  // 3. Create project for apps/dashboard
  const dashProject = await vercelFetch(`/v10/projects${teamQuery}`, token, "POST", {
    name: `${projectName}-dashboard`,
    framework: "nextjs",
    rootDirectory: "apps/dashboard",
    installCommand: "cd ../.. && NODE_ENV=development npx --yes pnpm@8 install --no-frozen-lockfile",
    buildCommand: "cd ../.. && npx --yes pnpm@8 turbo build --filter=dashboard",
    outputDirectory: ".next",
    nodeVersion: "22.x",
  });

  // 4. Build stable production domains and add them to each project.
  // {projectName}-app.vercel.app may be claimed by another Vercel user, in
  // which case Vercel assigns the deployment a hash URL but no canonical one.
  // We proactively add {projectName}-app-{teamSlug}.vercel.app — this is in
  // the team's namespace and always available.
  const appDomain = teamSlug
    ? `${projectName}-app-${teamSlug}.vercel.app`
    : `${projectName}-app.vercel.app`;
  const dashDomain = teamSlug
    ? `${projectName}-dashboard-${teamSlug}.vercel.app`
    : `${projectName}-dashboard.vercel.app`;

  await Promise.all([
    addProjectDomain(appProject.id, appDomain, token, teamQuery),
    addProjectDomain(dashProject.id, dashDomain, token, teamQuery),
  ]);

  const appUrl = `https://${appDomain}`;
  const dashUrl = `https://${dashDomain}`;

  const sharedEnvVars = (nextauthUrl) => [
    // DATABASE_URL = pooled connection (pgbouncer) — used by the app at runtime
    { key: "DATABASE_URL",            value: databaseUrl,    target: ["production", "preview", "development"] },
    // DIRECT_URL = direct connection — used by prisma db push during builds
    { key: "DIRECT_URL",              value: directUrl,      target: ["production", "preview", "development"] },
    { key: "NEXTAUTH_SECRET",         value: nextAuthSecret, target: ["production", "preview", "development"] },
    { key: "NEXTAUTH_URL",            value: nextauthUrl,    target: ["production"] },
    // TT-118: marketing app URL — used by @repo/env's marketingAppUrl()
    // helper that builds password-reset links from the dashboard's
    // forgot-password route. Without it links go to https://example.com.
    { key: "NEXT_PUBLIC_APP_URL",     value: appUrl,         target: ["production", "preview", "development"] },
    { key: "NEXT_PUBLIC_PRIVATE_KEY", value: privateKey,     target: ["production", "preview", "development"] },
    // NEXT_PUBLIC_BACKEND_URL — update this once you have a dedicated API project
    { key: "NEXT_PUBLIC_BACKEND_URL", value: `${appUrl}/api`, target: ["production", "preview", "development"] },
  ];

  await Promise.all([
    setVercelEnvVars(appProject.id, sharedEnvVars(appUrl), token, teamQuery),
    setVercelEnvVars(dashProject.id, sharedEnvVars(dashUrl), token, teamQuery),
  ]);

  return {
    orgId,
    appProjectId: appProject.id,
    dashboardProjectId: dashProject.id,
    appUrl,
    dashboardUrl: dashUrl,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Explicitly add a domain to a Vercel project.
 * Non-fatal — logs a warning if it fails (e.g. domain already exists).
 */
async function addProjectDomain(projectId, domain, token, teamQuery = "") {
  try {
    await vercelFetch(`/v10/projects/${projectId}/domains${teamQuery}`, token, "POST", {
      name: domain,
    });
  } catch (e) {
    // Domain may already be attached or require verification — not fatal
    console.warn(`  ⚠ Could not add domain ${domain}: ${e.message}`);
  }
}

async function setVercelEnvVars(projectId, envVars, token, teamQuery = "") {
  await vercelFetch(
    `/v10/projects/${projectId}/env${teamQuery}`,
    token,
    "POST",
    envVars.map(({ key, value, target }) => ({
      key,
      value,
      target,
      type: "encrypted",
    }))
  );
}

async function vercelFetch(path, token, method = "GET", body) {
  const res = await fetch(`${VERCEL_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Vercel API ${method} ${path} failed (${res.status}): ${text}`);
  }

  return res.json();
}
