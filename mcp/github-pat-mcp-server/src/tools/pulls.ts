/**
 * Pull request tools: list, create.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../types.js";
import { handleError } from "../errors.js";
import { buildResult, fmtDate, mdKvList, mdTable } from "../format.js";
import {
  CreatePullRequestInputSchema,
  ListPullRequestsInputSchema,
} from "../schemas/pulls.js";

function resolveOwner(input: { owner?: string }, ctx: ToolContext): string | undefined {
  return input.owner ?? ctx.config.defaultOwner;
}

export function registerPullTools(server: McpServer, ctx: ToolContext): void {
  // ---------------------------------------------------------------------------
  // github_list_pull_requests
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_list_pull_requests",
    {
      title: "List pull requests in a GitHub repo",
      description: `List PRs with filters.

Args: owner, repo, state ('open'|'closed'|'all'), head, base, sort, direction, limit, offset, response_format.
Returns: { count, offset, items: [{ number, title, state, draft, head_ref, base_ref, author, created_at, updated_at, html_url, mergeable_state }], has_more, next_offset? }`,
      inputSchema: ListPullRequestsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = ListPullRequestsInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        const perPage = v.limit;
        const page = Math.floor(v.offset / perPage) + 1;
        const resp = await ctx.octokit.rest.pulls.list({
          owner,
          repo: v.repo,
          state: v.state,
          head: v.head,
          base: v.base,
          sort: v.sort,
          direction: v.direction,
          per_page: perPage,
          page,
        });
        const items = resp.data.map((p) => ({
          number: p.number,
          title: p.title,
          state: p.state,
          draft: p.draft,
          head_ref: p.head.ref,
          base_ref: p.base.ref,
          author: p.user?.login,
          created_at: p.created_at,
          updated_at: p.updated_at,
          html_url: p.html_url,
        }));
        const hasMore = items.length === perPage;
        const structured = {
          count: items.length,
          offset: v.offset,
          items,
          has_more: hasMore,
          ...(hasMore ? { next_offset: v.offset + items.length } : {}),
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          const rows = items.map((p) => [
            `#${p.number}`,
            p.state + (p.draft ? "/draft" : ""),
            p.title.length > 50 ? p.title.slice(0, 47) + "..." : p.title,
            `\`${p.head_ref}\` → \`${p.base_ref}\``,
            fmtDate(p.updated_at),
          ]);
          text = [
            `# Pull Requests in \`${owner}/${v.repo}\` (${v.state})`,
            "",
            mdTable(["#", "State", "Title", "Branch", "Updated"], rows),
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_list_pull_requests") }] };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // github_create_pull_request
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_create_pull_request",
    {
      title: "Open a new pull request",
      description: `Create a PR from head into base.

Args: owner, repo, title (required), head (required, source branch), base (required, target branch), body, draft (default false), maintainer_can_modify (default true), response_format.
Returns: { number, title, state, draft, head_ref, base_ref, html_url, mergeable_state }.

Error Handling:
  - 422: head branch doesn't exist, no commits between head/base, or PR already exists for this head/base.`,
      inputSchema: CreatePullRequestInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = CreatePullRequestInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        const resp = await ctx.octokit.rest.pulls.create({
          owner,
          repo: v.repo,
          title: v.title,
          head: v.head,
          base: v.base,
          body: v.body,
          draft: v.draft,
          maintainer_can_modify: v.maintainer_can_modify,
        });
        const p = resp.data;
        const structured = {
          number: p.number,
          title: p.title,
          state: p.state,
          draft: p.draft,
          head_ref: p.head.ref,
          base_ref: p.base.ref,
          html_url: p.html_url,
          mergeable_state: p.mergeable_state,
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          text = [
            `# PR opened: #${p.number}`,
            "",
            mdKvList([
              ["Title", p.title],
              ["State", p.state + (p.draft ? " (draft)" : "")],
              ["Branch", `\`${p.head.ref}\` → \`${p.base.ref}\``],
              ["URL", p.html_url],
            ]),
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_create_pull_request") }] };
      }
    },
  );
}
