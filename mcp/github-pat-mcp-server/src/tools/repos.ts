/**
 * Repository tools: list, get, create.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RequestError } from "@octokit/request-error";
import type { ToolContext } from "../types.js";
import { handleError } from "../errors.js";
import { buildResult, fmtDate, mdKvList, mdTable } from "../format.js";
import {
  CreateRepoInputSchema,
  GetRepoInputSchema,
  ListReposInputSchema,
} from "../schemas/repos.js";

function resolveOwner(input: { owner?: string }, ctx: ToolContext): string | undefined {
  return input.owner ?? ctx.config.defaultOwner;
}

async function detectOwnerType(
  ctx: ToolContext,
  owner: string,
): Promise<"User" | "Organization"> {
  const resp = await ctx.octokit.rest.users.getByUsername({ username: owner });
  return resp.data.type as "User" | "Organization";
}

export function registerRepoTools(server: McpServer, ctx: ToolContext): void {
  // ---------------------------------------------------------------------------
  // github_list_repos
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_list_repos",
    {
      title: "List GitHub repositories",
      description: `List repositories owned by a user or organization.

If owner_type='auto' (default), the tool first calls /users/{owner} to determine whether the owner is a User or an Organization, then routes to the appropriate listing endpoint. Pass owner_type explicitly to skip that detection.

Args:
  - owner (string, optional): GitHub login. Omit to use GITHUB_DEFAULT_OWNER.
  - owner_type ('user' | 'org' | 'auto'): default 'auto'.
  - type ('all' | 'owner' | 'public' | 'private' | 'member' | 'forks' | 'sources'): repo type filter.
  - sort ('created' | 'updated' | 'pushed' | 'full_name'): default 'updated'.
  - direction ('asc' | 'desc'): default 'desc'.
  - limit (number, 1-100): default 20.
  - offset (number, >=0): default 0.
  - response_format ('markdown' | 'json'): default 'markdown'.

Returns (JSON):
  { total, count, offset, items: [{ name, full_name, private, description, default_branch, language, size, updated_at, html_url }], has_more, next_offset? }

Examples:
  - 'List my recently updated repos' -> owner omitted, sort='updated'.
  - 'List public repos in org exmachinai' -> owner='exmachinai', type='public'.

Error Handling:
  - 404: owner not found; check spelling.
  - 403: insufficient token permissions; check Repository: Metadata scope.`,
      inputSchema: ListReposInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = ListReposInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) {
          return {
            isError: true,
            content: [{
              type: "text",
              text: "Error: owner not provided and GITHUB_DEFAULT_OWNER env var is unset.",
            }],
          };
        }

        let ownerType: "user" | "org" = v.owner_type === "auto"
          ? ((await detectOwnerType(ctx, owner)) === "Organization" ? "org" : "user")
          : v.owner_type;

        const perPage = v.limit;
        const page = Math.floor(v.offset / perPage) + 1;

        const resp = ownerType === "org"
          ? await ctx.octokit.rest.repos.listForOrg({
              org: owner,
              type: v.type === "owner" ? "all" : (v.type as "all" | "public" | "private" | "forks" | "sources" | "member"),
              sort: v.sort as "created" | "updated" | "pushed" | "full_name",
              direction: v.direction,
              per_page: perPage,
              page,
            })
          : await ctx.octokit.rest.repos.listForUser({
              username: owner,
              type: (v.type === "private" || v.type === "public" || v.type === "member") ? "owner" : (v.type as "all" | "owner" | "member"),
              sort: v.sort as "created" | "updated" | "pushed" | "full_name",
              direction: v.direction,
              per_page: perPage,
              page,
            });

        const items = resp.data.map((r) => ({
          name: r.name,
          full_name: r.full_name,
          private: r.private,
          description: r.description,
          default_branch: r.default_branch,
          language: r.language,
          size_kb: r.size,
          updated_at: r.updated_at,
          html_url: r.html_url,
        }));

        const hasMore = items.length === perPage;
        const structured = {
          owner,
          owner_type: ownerType,
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
          const rows = items.map((r) => [
            r.full_name,
            r.private ? "private" : "public",
            r.language ?? "—",
            `${r.size_kb} KB`,
            fmtDate(r.updated_at),
          ]);
          text = [
            `# Repositories of \`${owner}\` (${ownerType})`,
            "",
            `Showing ${items.length} (offset ${v.offset})${hasMore ? " — more available" : ""}.`,
            "",
            mdTable(["Repo", "Visibility", "Lang", "Size", "Updated"], rows),
          ].join("\n");
        }

        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleError(error, "github_list_repos") }],
        };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // github_get_repo
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_get_repo",
    {
      title: "Get GitHub repository metadata",
      description: `Get full metadata for a single repository.

Args:
  - owner (string, optional): GitHub user or org. Omit to use GITHUB_DEFAULT_OWNER.
  - repo (string, required): Repository name.
  - response_format ('markdown' | 'json'): default 'markdown'.

Returns (JSON):
  { name, full_name, owner, private, description, default_branch, language,
    size_kb, stargazers_count, open_issues_count, has_issues, has_projects,
    license, created_at, updated_at, pushed_at, html_url, ssh_url, clone_url }`,
      inputSchema: GetRepoInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = GetRepoInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) {
          return {
            isError: true,
            content: [{ type: "text", text: "Error: owner not provided and GITHUB_DEFAULT_OWNER unset." }],
          };
        }
        const resp = await ctx.octokit.rest.repos.get({ owner, repo: v.repo });
        const r = resp.data;
        const structured = {
          name: r.name,
          full_name: r.full_name,
          owner: r.owner.login,
          private: r.private,
          description: r.description,
          default_branch: r.default_branch,
          language: r.language,
          size_kb: r.size,
          stargazers_count: r.stargazers_count,
          open_issues_count: r.open_issues_count,
          has_issues: r.has_issues,
          has_projects: r.has_projects,
          license: r.license?.spdx_id ?? null,
          created_at: r.created_at,
          updated_at: r.updated_at,
          pushed_at: r.pushed_at,
          html_url: r.html_url,
          ssh_url: r.ssh_url,
          clone_url: r.clone_url,
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          text = [
            `# ${r.full_name}`,
            "",
            r.description ? `> ${r.description}` : "",
            "",
            mdKvList([
              ["Visibility", r.private ? "private" : "public"],
              ["Default branch", `\`${r.default_branch}\``],
              ["Language", r.language ?? "—"],
              ["Size", `${r.size} KB`],
              ["Stars", r.stargazers_count],
              ["Open issues", r.open_issues_count],
              ["License", r.license?.spdx_id ?? "—"],
              ["Created", fmtDate(r.created_at)],
              ["Updated", fmtDate(r.updated_at)],
              ["Pushed", fmtDate(r.pushed_at)],
              ["URL", r.html_url],
            ]),
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: handleError(error, "github_get_repo") }],
        };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // github_create_repo
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_create_repo",
    {
      title: "Create a new GitHub repository",
      description: `Create a new repository — either under a user or an organization.

If owner_type='auto' (default), the owner type is detected via /users/{owner}. If owner is omitted, the repo is created under the authenticated user.

Defaults:
  - private: true (Constitution-safe default for new AEGIRA repos)
  - auto_init: false (so you can push your own initial commit)
  - has_wiki: false

Args:
  - name (string, required): Repository name.
  - owner (string, optional): User login or org name. Omit to use authenticated user.
  - owner_type ('user' | 'org' | 'auto'): default 'auto'.
  - description (string, optional, max 350 chars).
  - private (boolean, default true).
  - auto_init (boolean, default false).
  - gitignore_template (string, optional): e.g. 'Node', 'Python'.
  - license_template (string, optional): e.g. 'apache-2.0', 'mit'.
  - homepage (string, optional, valid URL).
  - has_issues / has_projects / has_wiki (boolean).
  - response_format ('markdown' | 'json').

Returns (JSON):
  { name, full_name, html_url, ssh_url, clone_url, default_branch, private }

Error Handling:
  - 422: validation failed (name already taken, invalid characters, etc.).
  - 403: token lacks 'Administration: Write' permission for the target owner.`,
      inputSchema: CreateRepoInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = CreateRepoInputSchema.parse(params);
        const owner = v.owner ?? ctx.config.defaultOwner;

        let ownerType: "user" | "org" | "self";
        if (!owner) {
          ownerType = "self";
        } else if (v.owner_type === "auto") {
          ownerType = (await detectOwnerType(ctx, owner)) === "Organization" ? "org" : "user";
        } else {
          ownerType = v.owner_type;
        }

        const opts = {
          name: v.name,
          description: v.description,
          private: v.private,
          auto_init: v.auto_init,
          gitignore_template: v.gitignore_template,
          license_template: v.license_template,
          homepage: v.homepage,
          has_issues: v.has_issues,
          has_projects: v.has_projects,
          has_wiki: v.has_wiki,
        };

        let resp;
        if (ownerType === "org" && owner) {
          resp = await ctx.octokit.rest.repos.createInOrg({ org: owner, ...opts });
        } else {
          // For "user" or "self": always uses /user/repos.
          // GitHub doesn't allow creating repos in arbitrary user accounts via API —
          // only in the authenticated user's account. If owner is set, we still call
          // the authenticated-user endpoint and trust the caller to be authenticated as that owner.
          resp = await ctx.octokit.rest.repos.createForAuthenticatedUser(opts);
        }

        const r = resp.data;
        const structured = {
          name: r.name,
          full_name: r.full_name,
          html_url: r.html_url,
          ssh_url: r.ssh_url,
          clone_url: r.clone_url,
          default_branch: r.default_branch,
          private: r.private,
          owner_type_used: ownerType,
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          text = [
            `# Repository created: \`${r.full_name}\``,
            "",
            mdKvList([
              ["Visibility", r.private ? "private" : "public"],
              ["Default branch", r.default_branch],
              ["HTML URL", r.html_url],
              ["SSH URL", r.ssh_url],
              ["Clone URL", r.clone_url],
            ]),
            "",
            "Next steps: push your local skeleton or run `git remote add origin <ssh_url>`.",
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        // Special hint for the most common create-error: name already taken
        if (error instanceof RequestError && error.status === 422) {
          return {
            isError: true,
            content: [{
              type: "text",
              text:
                "Error: Repository creation rejected (HTTP 422). Most common causes:\n" +
                "  - Name already exists for this owner.\n" +
                "  - Name contains invalid characters (allowed: A-Z a-z 0-9 . _ -).\n" +
                "  - Org policy forbids private repos.\n" +
                `Original: ${error.message}`,
            }],
          };
        }
        return {
          isError: true,
          content: [{ type: "text", text: handleError(error, "github_create_repo") }],
        };
      }
    },
  );
}
