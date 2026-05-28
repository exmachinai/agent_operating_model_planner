/**
 * Centralized error handling. Translates Octokit / GitHub-API errors into
 * actionable messages the LLM caller can recover from.
 */

import { RequestError } from "@octokit/request-error";
import { ZodError } from "zod";
import type { ToolTextResult } from "./types.js";

/** Build a standard error result for a tool call. */
export function errorResult(message: string): ToolTextResult {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

/** Map any thrown error into an actionable string. */
export function handleError(error: unknown, opContext?: string): string {
  const prefix = opContext ? `[${opContext}] ` : "";

  // Zod validation errors — usually a caller mistake.
  if (error instanceof ZodError) {
    const issues = error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    return (
      `${prefix}Error: Invalid input.\n${issues}\n\n` +
      `Suggestion: Check the parameter types and constraints in the tool's inputSchema.`
    );
  }

  // GitHub-API errors via Octokit.
  if (error instanceof RequestError) {
    const status = error.status;
    const ghMessage = error.message || "(no message)";
    switch (status) {
      case 401:
        return (
          `${prefix}Error: GitHub authentication failed (HTTP 401). ` +
          `Check that GITHUB_TOKEN is set, not expired, and starts with 'ghp_' or 'github_pat_'. ` +
          `Original message: ${ghMessage}`
        );
      case 403: {
        const rateRemaining = error.response?.headers?.["x-ratelimit-remaining"];
        if (rateRemaining === "0") {
          const reset = error.response?.headers?.["x-ratelimit-reset"];
          const resetMsg = reset
            ? ` Rate limit resets at ${new Date(Number(reset) * 1000).toISOString()}.`
            : "";
          return (
            `${prefix}Error: GitHub rate limit exceeded (HTTP 403).${resetMsg} ` +
            `Suggestion: Wait and retry, or use a fine-grained PAT with higher quota.`
          );
        }
        return (
          `${prefix}Error: Permission denied (HTTP 403). ` +
          `Your token may lack required permissions, or the resource may be protected. ` +
          `Suggestion: Check token permissions at https://github.com/settings/personal-access-tokens. ` +
          `Original message: ${ghMessage}`
        );
      }
      case 404:
        return (
          `${prefix}Error: Resource not found (HTTP 404). ` +
          `Suggestion: Verify owner/repo/path spelling, and confirm the token can see the resource ` +
          `(private repos require explicit token permissions). Original message: ${ghMessage}`
        );
      case 409:
        return (
          `${prefix}Error: Conflict (HTTP 409). ` +
          `Suggestion: Likely a SHA mismatch (file changed since you read it) or branch state ` +
          `conflict. Re-read the target and retry. Original message: ${ghMessage}`
        );
      case 422:
        return (
          `${prefix}Error: Validation failed (HTTP 422). ` +
          `Suggestion: GitHub rejected the payload — check field formats (e.g., branch names, ` +
          `commit messages, label names). Original message: ${ghMessage}`
        );
      case 429:
        return (
          `${prefix}Error: Too many requests (HTTP 429). ` +
          `Suggestion: Back off and retry. Original message: ${ghMessage}`
        );
      default:
        return (
          `${prefix}Error: GitHub API request failed (HTTP ${status}). ` +
          `Original message: ${ghMessage}`
        );
    }
  }

  // Generic JS errors.
  if (error instanceof Error) {
    if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
      return (
        `${prefix}Error: Cannot reach GitHub API. ` +
        `Suggestion: Check your internet connection. Original: ${error.message}`
      );
    }
    if (error.message.includes("ETIMEDOUT") || error.message.includes("ECONNABORTED")) {
      return (
        `${prefix}Error: Request timed out. ` +
        `Suggestion: Retry, or increase GITHUB_TIMEOUT_MS env var. Original: ${error.message}`
      );
    }
    return `${prefix}Error: ${error.message}`;
  }

  return `${prefix}Error: Unexpected error: ${String(error)}`;
}
