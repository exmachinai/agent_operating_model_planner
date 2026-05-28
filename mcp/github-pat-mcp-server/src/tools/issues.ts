/**
 * Issue tools: list, get, create, update.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../types.js";
import { handleError } from "../errors.js";
import { buildResult, fmtDate, mdKvList, mdTable } from "../format.js";
import {
  CreateIssueInputSchema,
  GetIssueInputSchema,
  ListIssuesInputSchema,
  UpdateIssueInputSchema,
} from "../schemas/issues.js";

function resolveOwner(input: { owner?: string }, ctx: ToolContext): string | undefined {
  return input.owner ?? ctx.config.defaultOwner;
}

export function registerIssueTools(server: McpServer, ctx: ToolContext): void {
  // ---------------------------------------------------------------------------
  // github_list_issues
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_list_issues",
    {
      title: "List issues in a GitHub repo",
      description: `List issues with filters. Excludes PRs (GitHub's API mixes them; this tool filters them out).

Args:
  - owner, repo, state ('open'|'closed'|'all'), labels (string[]), assignee, creator, mentioned,
    milestone (number|'*'|'none'), since (ISO 8601), sort, direction, limit, offset, response_format.

Returns (JSON):
  { count, offset, items: [{ number, title, state, labels, assignees, milestone, created_at, updated_at, html_url, comments }], has_more, next_offset? }`,
      inputSchema: ListIssuesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = ListIssuesInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        const perPage = v.limit;
        const page = Math.floor(v.offset / perPage) + 1;
        const resp = await ctx.octokit.rest.issues.listForRepo({
          owner,
          repo: v.repo,
          state: v.state,
          labels: v.labels?.join(","),
          assignee: v.assignee,
          creator: v.creator,
          mentioned: v.mentioned,
          milestone: v.milestone !== undefined ? String(v.milestone) : undefined,
          since: v.since,
          sort: v.sort,
          direction: v.direction,
          per_page: perPage,
          page,
        });
        const items = resp.data
          .filter((i) => !i.pull_request) // exclude PRs
          .map((i) => ({
            number: i.number,
            title: i.title,
            state: i.state,
            labels: i.labels.map((l) => (typeof l === "string" ? l : l.name)).filter(Boolean) as string[],
            assignees: (i.assignees ?? []).map((a) => a.login),
            milestone: i.milestone ? { number: i.milestone.number, title: i.milestone.title } : null,
            created_at: i.created_at,
            updated_at: i.updated_at,
            html_url: i.html_url,
            comments: i.comments,
          }));
        const hasMore = resp.data.length === perPage;
        const structured = {
          count: items.length,
          offset: v.offset,
          items,
          has_more: hasMore,
          ...(hasMore ? { next_offset: v.offset + resp.data.length } : {}),
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          const rows = items.map((i) => [
            `#${i.number}`,
            i.state,
            i.title.length > 60 ? i.title.slice(0, 57) + "..." : i.title,
            i.labels.join(", ") || "—",
            fmtDate(i.updated_at),
          ]);
          text = [
            `# Issues in \`${owner}/${v.repo}\` (${v.state})`,
            "",
            `${items.length} returned (offset ${v.offset})${hasMore ? " — more available" : ""}.`,
            "",
            mdTable(["#", "State", "Title", "Labels", "Updated"], rows),
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_list_issues") }] };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // github_get_issue
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_get_issue",
    {
      title: "Get a single GitHub issue",
      description: `Get full details of one issue including body.

Args: owner, repo, number, response_format.
Returns: full issue object (number, title, state, body, labels, assignees, milestone, comments, dates, urls).`,
      inputSchema: GetIssueInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = GetIssueInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        const resp = await ctx.octokit.rest.issues.get({ owner, repo: v.repo, issue_number: v.number });
        const i = resp.data;
        const structured = {
          number: i.number,
          title: i.title,
          state: i.state,
          state_reason: i.state_reason,
          body: i.body,
          labels: i.labels.map((l) => (typeof l === "string" ? l : l.name)).filter(Boolean) as string[],
          assignees: (i.assignees ?? []).map((a) => a.login),
          milestone: i.milestone ? { number: i.milestone.number, title: i.milestone.title } : null,
          author: i.user?.login,
          comments: i.comments,
          created_at: i.created_at,
          updated_at: i.updated_at,
          closed_at: i.closed_at,
          html_url: i.html_url,
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          text = [
            `# #${i.number} — ${i.title}`,
            "",
            mdKvList([
              ["State", i.state + (i.state_reason ? ` (${i.state_reason})` : "")],
              ["Author", structured.author ?? "—"],
              ["Labels", structured.labels.join(", ") || "—"],
              ["Assignees", structured.assignees.join(", ") || "—"],
              ["Milestone", structured.milestone?.title ?? "—"],
              ["Created", fmtDate(i.created_at)],
              ["Updated", fmtDate(i.updated_at)],
              ["Closed", i.closed_at ? fmtDate(i.closed_at) : "—"],
              ["Comments", i.comments],
              ["URL", i.html_url],
            ]),
            "",
            "---",
            i.body ?? "_(no body)_",
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_get_issue") }] };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // github_create_issue
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_create_issue",
    {
      title: "Create a GitHub issue",
      description: `Open a new issue.

Args: owner, repo, title (required), body, labels (string[]), assignees (string[]), milestone (number), response_format.
Returns: { number, title, state, html_url, created_at, labels, assignees, milestone }.`,
      inputSchema: CreateIssueInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = CreateIssueInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        const resp = await ctx.octokit.rest.issues.create({
          owner,
          repo: v.repo,
          title: v.title,
          body: v.body,
          labels: v.labels,
          assignees: v.assignees,
          milestone: v.milestone,
        });
        const i = resp.data;
        const structured = {
          number: i.number,
          title: i.title,
          state: i.state,
          html_url: i.html_url,
          created_at: i.created_at,
          labels: i.labels.map((l) => (typeof l === "string" ? l : l.name)).filter(Boolean) as string[],
          assignees: (i.assignees ?? []).map((a) => a.login),
          milestone: i.milestone ? { number: i.milestone.number, title: i.milestone.title } : null,
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          text = [
            `# Issue created: #${i.number}`,
            "",
            mdKvList([
              ["Title", i.title],
              ["State", i.state],
              ["Labels", structured.labels.join(", ") || "—"],
              ["Assignees", structured.assignees.join(", ") || "—"],
              ["Milestone", structured.milestone?.title ?? "—"],
              ["URL", i.html_url],
            ]),
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_create_issue") }] };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // github_update_issue
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_update_issue",
    {
      title: "Update an issue (state, labels, assignees, etc.)",
      description: `Update fields on an existing issue. State changes (close/reopen) are flagged as destructive.

If the repo matches a Constitution-protected pattern, acknowledge_protected_path + protected_path_reason are required.

NOTE: 'labels' REPLACES the existing labels. To add a single label, first read with github_get_issue, append, and pass the full list.

Args: owner, repo, number (required), title, body, state, state_reason, labels, assignees, milestone (number or null), add_comment, response_format.

Returns: updated issue summary.`,
      inputSchema: UpdateIssueInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = UpdateIssueInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        // Guard at repo level (path-level is not applicable here, but repo full-name is)
        const guard = checkProtectedRepoOnly(
          `${owner}/${v.repo}`,
          v.acknowledge_protected_path,
          v.protected_path_reason,
          ctx.config.protectedPaths,
        );
        if (!guard.allowed) {
          return { isError: true, content: [{ type: "text", text: guard.message ?? "Refused by Constitution-Safety-Guard." }] };
        }

        const resp = await ctx.octokit.rest.issues.update({
          owner,
          repo: v.repo,
          issue_number: v.number,
          title: v.title,
          body: v.body,
          state: v.state,
          state_reason: v.state_reason,
          labels: v.labels,
          assignees: v.assignees,
          milestone: v.milestone === null ? null : v.milestone,
        });

        let commentInfo: { id: number; html_url: string } | null = null;
        if (v.add_comment && v.add_comment.length > 0) {
          const commentResp = await ctx.octokit.rest.issues.createComment({
            owner,
            repo: v.repo,
            issue_number: v.number,
            body: v.add_comment,
          });
          commentInfo = { id: commentResp.data.id, html_url: commentResp.data.html_url };
        }

        const i = resp.data;
        const structured = {
          number: i.number,
          title: i.title,
          state: i.state,
          state_reason: i.state_reason,
          labels: i.labels.map((l) => (typeof l === "string" ? l : l.name)).filter(Boolean) as string[],
          assignees: (i.assignees ?? []).map((a) => a.login),
          milestone: i.milestone ? { number: i.milestone.number, title: i.milestone.title } : null,
          comment_added: commentInfo,
          html_url: i.html_url,
          guard_warning: guard.message ?? null,
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          text = [
            `# Issue #${i.number} updated`,
            "",
            mdKvList([
              ["Title", i.title],
              ["State", i.state + (i.state_reason ? ` (${i.state_reason})` : "")],
              ["Labels", structured.labels.join(", ") || "—"],
              ["Comment added", commentInfo ? commentInfo.html_url : "no"],
              ["URL", i.html_url],
            ]),
            guard.message ? `\n> ⚠ ${guard.message}` : "",
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_update_issue") }] };
      }
    },
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Guard for tools that operate at the repo level (no specific path).
 * Returns the same shape as checkProtectedPath in guard.ts.
 */
function checkProtectedRepoOnly(
  repoFullName: string,
  ack: boolean | undefined,
  reason: string | undefined,
  protectedPaths: readonly string[],
): { allowed: boolean; message?: string } {
  // Reuse the path-based guard: pass empty path, match against repo full name.
  // We import lazily here to avoid circular imports; the logic is duplicated minimally.
  if (protectedPaths.length === 0) return { allowed: true };
  // simple match: if any pattern starts with the repoFullName or matches it
  const matched = protectedPaths.find(
    (p) => p === repoFullName || p === `${repoFullName}/*` || p === `${repoFullName}/**`,
  );
  if (!matched) return { allowed: true };
  if (!ack) {
    return {
      allowed: false,
      message:
        `Refused: repo '${repoFullName}' is part of a protected zone (pattern '${matched}'). ` +
        `Pass acknowledge_protected_path=true plus a protected_path_reason to proceed.`,
    };
  }
  if (!reason || reason.trim().length < 10) {
    return {
      allowed: false,
      message: "Refused: protected_path_reason missing or too short (min 10 chars).",
    };
  }
  return {
    allowed: true,
    message: `WARNING: write to protected repo '${repoFullName}' permitted by ack. Reason: ${reason}`,
  };
}
