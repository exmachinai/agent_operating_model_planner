/**
 * Shared TypeScript types for github-pat-mcp-server.
 */

import type { Octokit } from "@octokit/rest";

/** Resolved server configuration after boot validation. */
export interface ServerConfig {
  readonly token: string;
  readonly defaultOwner: string | undefined;
  readonly protectedPaths: readonly string[];
  readonly characterLimit: number;
  readonly timeoutMs: number;
}

/** Tool-call context passed to every tool handler. */
export interface ToolContext {
  readonly octokit: Octokit;
  readonly config: ServerConfig;
}

/** Standard pagination response wrapper. */
export interface PaginatedResponse<T> {
  total: number;
  count: number;
  offset: number;
  items: T[];
  has_more: boolean;
  next_offset?: number;
  truncated?: boolean;
  truncation_message?: string;
}

/** Constitution-Safety-Guard outcome. */
export interface GuardCheck {
  allowed: boolean;
  matchedPattern?: string;
  message?: string;
}

/** MCP tool-result content shape (text-only for now). */
export interface ToolTextResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
  [k: string]: unknown;
}
