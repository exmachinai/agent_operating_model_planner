/**
 * Shared constants for github-pat-mcp-server.
 *
 * All env-var reads happen at boot in index.ts; this module exposes only
 * literal defaults. Do NOT import process.env here.
 */

/** Server identity */
export const SERVER_NAME = "github-pat-mcp-server";
export const SERVER_VERSION = "1.0.0";

/** Maximum characters per tool response before truncation. */
export const CHARACTER_LIMIT = 25_000;

/** Default page size for paginated tools. */
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Network timeout for GitHub API calls, in milliseconds. */
export const DEFAULT_TIMEOUT_MS = 30_000;

/** Default protected-path globs (AEGIRA Constitution Zone 2). */
export const DEFAULT_PROTECTED_PATHS: readonly string[] = [
  "00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**",
  "**/00_CLAUDE_KNOWLEDGE_ARCHITECTURE/**",
];

/** Tool-name prefix. */
export const TOOL_PREFIX = "github_";

/** Standard response-format choices. */
export const RESPONSE_FORMATS = ["markdown", "json"] as const;
