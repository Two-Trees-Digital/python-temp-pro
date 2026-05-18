/**
 * GitHub provider
 *
 * - createGitHubRepo: creates a new repo from the turbo-temp template
 * - setGitHubSecrets: sets GitHub Actions secrets on the repo
 */

import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";

// GitHub uses libsodium to encrypt secrets before sending them.
// We use a pure-JS implementation so no native build is required.
async function encryptSecret(publicKey, secretValue) {
  // Dynamically import tweetsodium (CJS-compatible)
  const { default: sodium } = await import("tweetsodium");
  const key = Buffer.from(publicKey, "base64");
  const value = Buffer.from(secretValue);
  const encrypted = sodium.seal(value, key);
  return Buffer.from(encrypted).toString("base64");
}

/**
 * Creates a GitHub repository from the turbo-temp template.
 *
 * @param {object} opts
 * @param {string} opts.org         - GitHub org or username
 * @param {string} opts.name        - New repo name
 * @param {string} opts.description
 * @param {boolean} opts.isPrivate
 * @param {string} opts.templateOwner - Owner of the template repo
 * @param {string} opts.templateRepo  - Name of the template repo
 * @returns {Promise<object>} GitHub repo object
 */
export async function createGitHubRepo({
  org,
  name,
  description,
  isPrivate,
  templateOwner,
  templateRepo,
}) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  // Check if target is an org or a user account
  let isOrg = false;
  try {
    await octokit.orgs.get({ org });
    isOrg = true;
  } catch {
    isOrg = false;
  }

  // Create from template — this copies all files and branches
  const { data: repo } = await octokit.repos.createUsingTemplate({
    template_owner: templateOwner,
    template_repo: templateRepo,
    owner: org,
    name,
    description,
    private: isPrivate,
    include_all_branches: false,
  });

  // Wait for GitHub to finish creating the repo (template creation is async)
  await waitForRepo(octokit, org, name);

  return repo;
}

/**
 * Sets multiple GitHub Actions secrets on a repository.
 *
 * @param {object} opts
 * @param {string} opts.org
 * @param {string} opts.repo
 * @param {string} opts.token
 * @param {Record<string, string>} opts.secrets
 */
export async function setGitHubSecrets({ org, repo, token, secrets }) {
  const octokit = new Octokit({ auth: token });

  // Fetch the repo's public key for secret encryption
  const { data: keyData } = await octokit.actions.getRepoPublicKey({
    owner: org,
    repo,
  });

  const { key_id: keyId, key: publicKey } = keyData;

  // Set each secret
  await Promise.all(
    Object.entries(secrets).map(async ([secretName, secretValue]) => {
      if (!secretValue) return; // skip empty values
      const encryptedValue = await encryptSecret(publicKey, String(secretValue));
      await octokit.actions.createOrUpdateRepoSecret({
        owner: org,
        repo,
        secret_name: secretName,
        encrypted_value: encryptedValue,
        key_id: keyId,
      });
    })
  );
}

/**
 * Triggers a GitHub Actions workflow via workflow_dispatch.
 * Used by the bootstrap to kick off the first deployment after all secrets
 * are set — avoids the race condition where the template-creation push fires
 * Actions before VERCEL_TOKEN and other secrets exist.
 *
 * @param {object} opts
 * @param {string} opts.org      - GitHub org or username
 * @param {string} opts.repo     - Repo name
 * @param {string} opts.token    - GitHub PAT
 * @param {string} opts.workflow - Workflow filename (e.g. "deploy-vercel.yml")
 * @param {string} [opts.ref]    - Branch to run on (default: "main")
 */
export async function triggerWorkflow({ org, repo, token, workflow, ref = "main" }) {
  const octokit = new Octokit({ auth: token });

  // workflow_dispatch requires the workflow to already be on the branch.
  // Wait a couple of seconds to let GitHub index any recent pushes.
  await sleep(3000);

  await octokit.actions.createWorkflowDispatch({
    owner: org,
    repo,
    workflow_id: workflow,
    ref,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Polls until the GitHub repo is accessible (template creation can take ~5s).
 */
async function waitForRepo(octokit, owner, repo, maxWaitMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      await octokit.repos.get({ owner, repo });
      return; // repo is ready
    } catch {
      await sleep(2000);
    }
  }
  throw new Error(`Timed out waiting for repo ${owner}/${repo} to be created`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
