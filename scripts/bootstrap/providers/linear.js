/**
 * Linear provider
 *
 * Creates a new Linear project under the first available team.
 * Uses the official @linear/sdk.
 */

import { LinearClient } from "@linear/sdk";

/**
 * @param {object} opts
 * @param {string} opts.name        - Project name
 * @param {string} opts.description
 * @param {string} opts.apiKey      - Linear personal API key
 * @returns {Promise<{ id: string, url: string }>}
 */
export async function createLinearProject({ name, description, apiKey }) {
  const linear = new LinearClient({ apiKey });

  // Fetch teams — use the first one (most setups have a single team)
  const teams = await linear.teams();
  const team = teams.nodes[0];

  if (!team) {
    throw new Error("No Linear teams found. Make sure your API key has access to at least one team.");
  }

  const project = await linear.createProject({
    name,
    description,
    teamIds: [team.id],
    state: "started",
  });

  // The SDK returns a ProjectPayload; resolve the actual project object
  const createdProject = await project.project;

  return {
    id: createdProject.id,
    url: createdProject.url,
    name: createdProject.name,
  };
}
