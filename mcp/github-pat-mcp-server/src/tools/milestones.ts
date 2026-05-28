/**
 * Milestone tools: list, create.
 *
 * Milestones map 1:1 to ZGPM-Meilensteine.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../types.js";
import { handleError } from "../errors.js";
import { buildResult, fmtDate, mdKvList, mdTable } from "../format.js";
import {
  CreateMilestoneInputSchema,
  ListMilestonesInputSchema,
} from "../schemas/milestones.js";

function resolveOwner(input: { owner?: string }, ctx: ToolContext): string | undefined {
  return input.owner ?? ctx.config.defaultOwner;
}

export function registerMilestoneTools(server: McpServer, ctx: ToolContext): void {
  // ---------------------------------------------------------------------------
  // github_list_milestones
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_list_milestones",
    {
      title: "List milestones in a GitHub repo",
      description: `List milestones — useful for syncing GitHub milestones with ZGPM-Meilensteine.

Args: owner, repo, state ('open'|'closed'|'all'), sort ('due_on'|'completeness'), direction, limit, offset, response_format.
Returns: { count, offset, items: [{ number, title, state, description, due_on, open_issues, closed_issues, html_url }], has_more, next_offset? }`,
      inputSchema: ListMilestonesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = ListMilestonesInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        const perPage = v.limit;
        const page = Math.floor(v.offset / perPage) + 1;
        const resp = await ctx.octokit.rest.issues.listMilestones({
          owner,
          repo: v.repo,
          state: v.state,
          sort: v.sort,
          direction: v.direction,
          per_page: perPage,
          page,
        });
        const items = resp.data.map((m) => ({
          number: m.number,
          title: m.title,
          state: m.state,
          description: m.description,
          due_on: m.due_on,
          open_issues: m.open_issues,
          closed_issues: m.closed_issues,
          html_url: m.html_url,
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
          const rows = items.map((m) => [
            `#${m.number}`,
            m.title,
            m.state,
            m.due_on ? fmtDate(m.due_on) : "—",
            `${m.closed_issues}/${m.open_issues + m.closed_issues}`,
          ]);
          text = [
            `# Milestones in \`${owner}/${v.repo}\``,
            "",
            mdTable(["#", "Title", "State", "Due", "Closed/Total"], rows),
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_list_milestones") }] };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // github_create_milestone
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_create_milestone",
    {
      title: "Create a milestone",
      description: `Create a milestone in a repo. For ZGPM-compatible plans, use a Verb-im-Perfekt title (e.g. 'API-Architektur freigegeben') and set due_on to the ZGPM 'geplant' date.

Args: owner, repo, title (required), state, description, due_on (ISO 8601), response_format.
Returns: { number, title, state, due_on, html_url }.`,
      inputSchema: CreateMilestoneInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = CreateMilestoneInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        const resp = await ctx.octokit.rest.issues.createMilestone({
          owner,
          repo: v.repo,
          title: v.title,
          state: v.state,
          description: v.description,
          due_on: v.due_on,
        });
        const m = resp.data;
        const structured = {
          number: m.number,
          title: m.title,
          state: m.state,
          due_on: m.due_on,
          html_url: m.html_url,
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          text = [
            `# Milestone created: #${m.number}`,
            "",
            mdKvList([
              ["Title", m.title],
              ["State", m.state],
              ["Due", m.due_on ? fmtDate(m.due_on) : "—"],
              ["URL", m.html_url],
            ]),
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_create_milestone") }] };
      }
    },
  );
}
