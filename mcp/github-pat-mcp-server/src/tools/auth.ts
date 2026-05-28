/**
 * Auth & identity tools.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolContext } from "../types.js";
import { handleError } from "../errors.js";
import { buildResult, fmtDate, mdKvList } from "../format.js";
import { ResponseFormatSchema } from "../schemas/common.js";

const WhoamiSchema = z
  .object({ response_format: ResponseFormatSchema })
  .strict();

export function registerAuthTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "github_whoami",
    {
      title: "Who am I (authenticated GitHub user)",
      description: `Verify the configured GITHUB_TOKEN and return the authenticated user's login, account type, scopes, and rate-limit headroom.

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown').

Returns (JSON):
  {
    "login": string,
    "id": number,
    "type": "User" | "Organization",
    "name": string | null,
    "company": string | null,
    "scopes": string[],         // empty array for fine-grained PATs
    "token_type": "fine-grained" | "classic" | "github-app" | "oauth" | "unknown",
    "rate_limit": { "limit": number, "remaining": number, "reset": string }
  }

Use this first at session start to confirm auth and to check whether the configured token has the permissions you'll need.

Error Handling:
  - 401: Token missing/expired/malformed.
  - Network errors: surfaced with actionable hints.`,
      inputSchema: WhoamiSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const validated = WhoamiSchema.parse(params);
        const userResp = await ctx.octokit.rest.users.getAuthenticated();
        const rateResp = await ctx.octokit.rest.rateLimit.get();

        const scopes = (
          (userResp.headers["x-oauth-scopes"] as string | undefined) ?? ""
        )
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const tokenType: string =
          ctx.config.token.startsWith("github_pat_") ? "fine-grained"
          : ctx.config.token.startsWith("ghp_")      ? "classic"
          : ctx.config.token.startsWith("ghs_")      ? "github-app"
          : ctx.config.token.startsWith("gho_")      ? "oauth"
          : "unknown";

        const core = rateResp.data.resources.core;
        const structured = {
          login: userResp.data.login,
          id: userResp.data.id,
          type: userResp.data.type,
          name: userResp.data.name,
          company: userResp.data.company,
          scopes,
          token_type: tokenType,
          rate_limit: {
            limit: core.limit,
            remaining: core.remaining,
            reset: new Date(core.reset * 1000).toISOString(),
          },
        };

        let text: string;
        if (validated.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          text = [
            `# GitHub Identity`,
            "",
            mdKvList([
              ["Login", `\`${structured.login}\``],
              ["Account type", structured.type],
              ["ID", structured.id],
              ["Name", structured.name ?? "—"],
              ["Company", structured.company ?? "—"],
              ["Token type", structured.token_type],
              [
                "Scopes",
                scopes.length === 0
                  ? "(none — fine-grained PAT permissions managed per-repo)"
                  : scopes.join(", "),
              ],
              ["Rate limit (core)", `${core.remaining} / ${core.limit}`],
              ["Rate limit resets", fmtDate(structured.rate_limit.reset)],
            ]),
          ].join("\n");
        }

        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleError(error, "github_whoami") }],
        };
      }
    },
  );
}
