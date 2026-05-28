#!/usr/bin/env node
/**
 * github-pat-mcp-server — main entry point.
 *
 * Boots the MCP server over stdio, validates the GITHUB_TOKEN against the
 * GitHub API, and registers all 19 tools.
 *
 * NEVER log to stdout — that channel is reserved for the MCP protocol.
 * Use stderr (console.error) for any human-facing log line.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  CHARACTER_LIMIT,
  DEFAULT_PROTECTED_PATHS,
  DEFAULT_TIMEOUT_MS,
  SERVER_NAME,
  SERVER_VERSION,
} from "./constants.js";
import type { ServerConfig, ToolContext } from "./types.js";
import { makeOctokit, validateToken } from "./client.js";

import { registerAuthTools } from "./tools/auth.js";
import { registerRepoTools } from "./tools/repos.js";
import { registerContentTools } from "./tools/contents.js";
import { registerBranchTools } from "./tools/branches.js";
import { registerIssueTools } from "./tools/issues.js";
import { registerPullTools } from "./tools/pulls.js";
import { registerMilestoneTools } from "./tools/milestones.js";
import { registerReleaseTools } from "./tools/releases.js";

function loadConfig(): ServerConfig {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    console.error(
      "FATAL: GITHUB_TOKEN environment variable is required.\n" +
        "Set it in your .env or via your MCP-client configuration (e.g. claude_desktop_config.json).\n" +
        "Create a Fine-Grained PAT at https://github.com/settings/personal-access-tokens.",
    );
    process.exit(1);
  }

  const defaultOwner = process.env.GITHUB_DEFAULT_OWNER?.trim() || undefined;

  const protectedPathsRaw = process.env.GITHUB_PROTECTED_PATHS?.trim();
  const protectedPaths = protectedPathsRaw
    ? protectedPathsRaw.split(",").map((p) => p.trim()).filter(Boolean)
    : Array.from(DEFAULT_PROTECTED_PATHS);

  const characterLimitRaw = process.env.CHARACTER_LIMIT?.trim();
  const characterLimit = characterLimitRaw ? Math.max(1000, parseInt(characterLimitRaw, 10)) : CHARACTER_LIMIT;

  const timeoutRaw = process.env.GITHUB_TIMEOUT_MS?.trim();
  const timeoutMs = timeoutRaw ? Math.max(1000, parseInt(timeoutRaw, 10)) : DEFAULT_TIMEOUT_MS;

  return { token, defaultOwner, protectedPaths, characterLimit, timeoutMs };
}

async function main(): Promise<void> {
  const config = loadConfig();

  console.error(`[${SERVER_NAME}] starting v${SERVER_VERSION}`);
  console.error(`[${SERVER_NAME}] default_owner: ${config.defaultOwner ?? "(none)"}`);
  console.error(`[${SERVER_NAME}] protected_paths: ${config.protectedPaths.length} pattern(s)`);

  const octokit = makeOctokit(config.token, config.timeoutMs);

  try {
    const who = await validateToken(octokit);
    console.error(`[${SERVER_NAME}] authenticated as ${who.login}${who.scopes.length ? ` (scopes: ${who.scopes.join(",")})` : " (fine-grained PAT)"}`);
  } catch (err) {
    console.error(`[${SERVER_NAME}] FATAL: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  const ctx: ToolContext = { octokit, config };

  registerAuthTools(server, ctx);
  registerRepoTools(server, ctx);
  registerContentTools(server, ctx);
  registerBranchTools(server, ctx);
  registerIssueTools(server, ctx);
  registerPullTools(server, ctx);
  registerMilestoneTools(server, ctx);
  registerReleaseTools(server, ctx);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[${SERVER_NAME}] ready — 19 tools registered, listening on stdio.`);
}

main().catch((err) => {
  console.error(`[${SERVER_NAME}] unhandled error:`, err);
  process.exit(1);
});
