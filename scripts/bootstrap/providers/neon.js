/**
 * Neon provider
 *
 * Creates a Neon project + database and returns a connection string.
 * Neon API docs: https://api-docs.neon.tech/reference/getting-started-with-neon-api
 */

const NEON_API = "https://console.neon.tech/api/v2";

/**
 * @param {object} opts
 * @param {string} opts.projectName - Used as the Neon project name
 * @param {string} opts.apiKey      - Neon API key
 * @returns {Promise<{ projectId: string, connectionString: string }>}
 */
export async function createNeonDatabase({ projectName, apiKey }) {
  // 1. Create a Neon project (auto-creates a default branch + database)
  const createRes = await neonFetch("/projects", apiKey, "POST", {
    project: {
      name: projectName,
      // Default: one primary branch called "main" with a database called "neondb"
      pg_version: 16,
      region_id: "aws-us-east-2", // cheapest / most common; override if needed
    },
  });

  const { project, connection_uris } = createRes;

  // Neon returns a ready-to-use connection URI for the default database
  // It looks like: postgresql://user:pass@host/neondb?sslmode=require
  const connectionString = connection_uris?.[0]?.connection_uri;

  if (!connectionString) {
    throw new Error("Neon did not return a connection URI. Check your API key or quota.");
  }

  // Derive the pooled connection string from the direct one.
  // Direct:  postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/db?sslmode=require
  // Pooled:  postgresql://user:pass@ep-xxx-pooler.us-east-2.aws.neon.tech/db?pgbouncer=true&connect_timeout=15
  const url = new URL(connectionString);
  url.hostname = url.hostname.replace(/^(ep-[^.]+)\./, "$1-pooler.");
  url.searchParams.delete("sslmode");
  url.searchParams.set("pgbouncer", "true");
  url.searchParams.set("connect_timeout", "15");
  const pooledConnectionString = url.toString();

  return {
    projectId: project.id,
    connectionString,        // direct — use for DIRECT_URL / migrations
    pooledConnectionString,  // pooled — use for DATABASE_URL / runtime
    projectName: project.name,
    branchId: project.branch_id,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function neonFetch(path, apiKey, method = "GET", body) {
  const res = await fetch(`${NEON_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Neon API ${method} ${path} failed (${res.status}): ${text}`);
  }

  return res.json();
}
