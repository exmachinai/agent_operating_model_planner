/**
 * Branch tools: list, create.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RequestError } from "@octokit/request-error";
import type { ToolContext } from "../types.js";
import { handleError } from "../errors.js";
import { buildResult, mdKvList, mdTable } from "../format.js";
import {
  CreateBranchInputSchema,
  ListBranchesInputSchema,
} from "../schemas/branches.js";

function resolveOwner(input: { owner?: string }, ctx: ToolContext): string | undefined {
  return input.owner ?? ctx.config.defaultOwner;
}

export function registerBranchTools(server: McpServer, ctx: ToolContext): void {
  // ---------------------------------------------------------------------------
  // github_list_branches
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_list_branches",
    {
      title: "List branches in a GitHub repository",
      description: `List branches in a repo, optionally filtered to protected branches only.

Args:
  - owner, repo, protected_only (default false), limit, offset, response_format.

Returns (JSON):
  { count, offset, items: [{ name, sha, protected }], has_more, next_offset? }`,
      inputSchema: ListBranchesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = ListBranchesInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        const perPage = v.limit;
        const page = Math.floor(v.offset / perPage) + 1;
        const resp = await ctx.octokit.rest.repos.listBranches({
          owner,
          repo: v.repo,
          protected: v.protected_only,
          per_page: perPage,
          page,
        });
        const items = resp.data.map((b) => ({
          name: b.name,
          sha: b.commit.sha,
          protected: b.protected,
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
          const rows = items.map((b) => [
            `\`${b.name}\``,
            b.protected ? "🔒 protected" : "open",
            `\`${b.sha.slice(0, 8)}\``,
          ]);
          text = [
            `# Branches in \`${owner}/${v.repo}\``,
            "",
            mdTable(["Branch", "Status", "SHA"], rows),
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_list_branches") }] };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // github_create_branch
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_create_branch",
    {
      title: "Create a new branch from a base ref",
      description: `Create a branch in a repo by pointing a new ref to an existing commit SHA.

If 'from' is omitted, the repo's default branch HEAD is used as base.

Args:
  - owner, repo, name (required), from (optional, defaults to default branch), response_format.

Returns (JSON):
  { name, ref, sha, html_url }

Error Handling:
  - 422: branch already exists, or base ref not found.`,
      inputSchema: CreateBranchInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = CreateBranchInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        // Resolve base SHA
        let baseSha: string;
        if (v.from && /^[0-9a-f]{40}$/i.test(v.from)) {
          baseSha = v.from.toLowerCase();
        } else {
          let baseBranch: string;
          if (v.from) {
            baseBranch = v.from;
          } else {
            const repoResp = await ctx.octokit.rest.repos.get({ owner, repo: v.repo });
            baseBranch = repoResp.data.default_branch;
          }
          const refResp = await ctx.octokit.rest.git.getRef({
            owner,
            repo: v.repo,
            ref: `heads/${baseBranch}`,
          });
          baseSha = refResp.data.object.sha;
        }

        const createResp = await ctx.octokit.rest.git.createRef({
          owner,
          repo: v.repo,
          ref: `refs/heads/${v.name}`,
          sha: baseSha,
        });

        const structured = {
          name: v.name,
          ref: createResp.data.ref,
          sha: createResp.data.object.sha,
          html_url: `https://github.com/${owner}/${v.repo}/tree/${v.name}`,
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          text = [
            `# Branch created: \`${v.name}\``,
            "",
            mdKvList([
              ["Ref", structured.ref],
              ["SHA", `\`${structured.sha.slice(0, 12)}\``],
              ["URL", structured.html_url],
            ]),
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        if (error instanceof RequestError && error.status === 422) {
          return {
            isError: true,
            content: [{
              type: "text",
              text:
                "Error: Branch creation rejected (HTTP 422). Likely causes:\n" +
                "  - Branch already exists.\n" +
                "  - Base ref not found.\n" +
                `Original: ${error.message}`,
            }],
          };
        }
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_create_branch") }] };
      }
    },
  );
}
