/**
 * Octokit factory + boot-time token validation.
 */

import { Octokit } from "@octokit/rest";
import { RequestError } from "@octokit/request-error";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";

/** Build an authenticated Octokit instance. */
export function makeOctokit(token: string, timeoutMs: number): Octokit {
  return new Octokit({
    auth: token,
    userAgent: `${SERVER_NAME}/${SERVER_VERSION}`,
    request: {
      timeout: timeoutMs,
    },
  });
}

/**
 * Validate the token at boot by calling `/user`. Throws with a clear message
 * if auth fails. Returns the authenticated user's login on success.
 */
export async function validateToken(octokit: Octokit): Promise<{
  login: string;
  scopes: string[];
}> {
  try {
    const { data, headers } = await octokit.rest.users.getAuthenticated();
    const scopes = (headers["x-oauth-scopes"] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return { login: data.login, scopes };
  } catch (error) {
    if (error instanceof RequestError && error.status === 401) {
      throw new Error(
        "GitHub token validation failed (401). Check that GITHUB_TOKEN is set, " +
          "is not expired, and starts with 'ghp_' or 'github_pat_'.",
      );
    }
    if (error instanceof Error) {
      throw new Error(`GitHub token validation failed: ${error.message}`);
    }
    throw new Error(`GitHub token validation failed: ${String(error)}`);
  }
}
