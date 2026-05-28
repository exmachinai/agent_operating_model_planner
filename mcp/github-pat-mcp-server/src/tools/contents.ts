/**
 * Repository content tools: read, write, list directory, search code.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Buffer } from "node:buffer";
import type { ToolContext } from "../types.js";
import { handleError } from "../errors.js";
import { buildResult, mdKvList, mdTable } from "../format.js";
import { checkProtectedPath } from "../guard.js";
import {
  ListDirectoryInputSchema,
  ReadFileInputSchema,
  SearchCodeInputSchema,
  WriteFileInputSchema,
} from "../schemas/contents.js";

function resolveOwner(input: { owner?: string }, ctx: ToolContext): string | undefined {
  return input.owner ?? ctx.config.defaultOwner;
}

export function registerContentTools(server: McpServer, ctx: ToolContext): void {
  // ---------------------------------------------------------------------------
  // github_read_file
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_read_file",
    {
      title: "Read a file from a GitHub repository",
      description: `Read the content of a single file at a specific ref. Decodes base64 to UTF-8 automatically.

Args:
  - owner (optional), repo (required), path (required), ref (optional), response_format.

Returns (JSON):
  { path, sha, size_bytes, encoding: 'utf-8', content: string, html_url, ref }

Limits:
  - GitHub API caps file size at 1 MB for this endpoint. Larger files require the Git Data API (not implemented here).

Error Handling:
  - 404: path or ref not found.
  - 413 / 422: file too large.`,
      inputSchema: ReadFileInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = ReadFileInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        const resp = await ctx.octokit.rest.repos.getContent({
          owner,
          repo: v.repo,
          path: v.path,
          ref: v.ref,
        });

        if (Array.isArray(resp.data)) {
          return {
            isError: true,
            content: [{
              type: "text",
              text:
                `Error: '${v.path}' is a directory, not a file. ` +
                `Use github_list_directory instead.`,
            }],
          };
        }
        if (resp.data.type !== "file") {
          return {
            isError: true,
            content: [{
              type: "text",
              text: `Error: entry at '${v.path}' is of type '${resp.data.type}', not a file.`,
            }],
          };
        }

        const decoded = Buffer.from(resp.data.content ?? "", "base64").toString("utf-8");
        const structured = {
          path: resp.data.path,
          sha: resp.data.sha,
          size_bytes: resp.data.size,
          encoding: "utf-8" as const,
          content: decoded,
          html_url: resp.data.html_url,
          ref: v.ref ?? null,
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          text = [
            `# ${resp.data.path}`,
            "",
            mdKvList([
              ["SHA", `\`${resp.data.sha}\``],
              ["Size", `${resp.data.size} bytes`],
              ["Ref", v.ref ?? "(default branch)"],
              ["URL", resp.data.html_url ?? "—"],
            ]),
            "",
            "```",
            decoded,
            "```",
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_read_file") }] };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // github_write_file
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_write_file",
    {
      title: "Create or update a file in a single commit",
      description: `Create a new file or update an existing one. Single commit. UTF-8 content encoded to base64 automatically.

WARNING: This is a destructive write. The Constitution-Safety-Guard will refuse writes that match GITHUB_PROTECTED_PATHS unless you pass acknowledge_protected_path=true plus protected_path_reason.

If the file already exists, pass its current 'sha'. The GitHub API uses the SHA as an optimistic-concurrency check.

Args:
  - owner, repo, path, content, message (required)
  - branch (optional, defaults to default branch)
  - sha (required when updating an existing file)
  - author_name, author_email (optional)
  - acknowledge_protected_path, protected_path_reason (required when path matches a protected pattern)
  - response_format

Returns (JSON):
  { path, sha, commit_sha, branch, html_url, created: boolean }

Error Handling:
  - 409: SHA mismatch (file changed concurrently). Re-read and retry.
  - 422: empty content, missing sha for update, or path contains invalid characters.`,
      inputSchema: WriteFileInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = WriteFileInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        // Constitution-Safety-Guard
        const guard = checkProtectedPath({
          repoFullName: `${owner}/${v.repo}`,
          targetPath: v.path,
          acknowledgeProtectedPath: v.acknowledge_protected_path,
          protectedPathReason: v.protected_path_reason,
          protectedPaths: ctx.config.protectedPaths,
        });
        if (!guard.allowed) {
          return { isError: true, content: [{ type: "text", text: guard.message ?? "Refused by Constitution-Safety-Guard." }] };
        }

        const contentB64 = Buffer.from(v.content, "utf-8").toString("base64");

        const resp = await ctx.octokit.rest.repos.createOrUpdateFileContents({
          owner,
          repo: v.repo,
          path: v.path,
          message: v.message,
          content: contentB64,
          branch: v.branch,
          sha: v.sha,
          committer:
            v.author_name && v.author_email
              ? { name: v.author_name, email: v.author_email }
              : undefined,
          author:
            v.author_name && v.author_email
              ? { name: v.author_name, email: v.author_email }
              : undefined,
        });

        const fileContent = resp.data.content;
        const commit = resp.data.commit;
        const structured = {
          path: fileContent?.path ?? v.path,
          sha: fileContent?.sha,
          commit_sha: commit.sha,
          branch: v.branch ?? "(default)",
          html_url: fileContent?.html_url,
          created: v.sha === undefined,
          guard_warning: guard.message ?? null,
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          text = [
            `# File ${structured.created ? "created" : "updated"}: \`${structured.path}\``,
            "",
            mdKvList([
              ["Commit SHA", `\`${commit.sha}\``],
              ["File SHA", `\`${fileContent?.sha ?? "—"}\``],
              ["Branch", structured.branch],
              ["URL", fileContent?.html_url ?? "—"],
            ]),
            guard.message ? `\n> ⚠ ${guard.message}` : "",
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_write_file") }] };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // github_list_directory
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_list_directory",
    {
      title: "List the contents of a directory in a GitHub repo",
      description: `List entries (files and subdirectories) at a given path inside a repo, at a specific ref.

Args:
  - owner, repo, path (default ''), ref (optional), response_format.

Returns (JSON):
  { path, ref, count, items: [{ name, type: 'file'|'dir'|'submodule'|'symlink', size_bytes, sha, html_url }] }`,
      inputSchema: ListDirectoryInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = ListDirectoryInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        const resp = await ctx.octokit.rest.repos.getContent({
          owner,
          repo: v.repo,
          path: v.path,
          ref: v.ref,
        });

        if (!Array.isArray(resp.data)) {
          return {
            isError: true,
            content: [{
              type: "text",
              text:
                `Error: '${v.path}' is not a directory (type='${(resp.data as { type?: string }).type ?? "unknown"}'). ` +
                `Use github_read_file instead.`,
            }],
          };
        }

        const items = resp.data.map((e) => ({
          name: e.name,
          type: e.type,
          size_bytes: e.size,
          sha: e.sha,
          html_url: e.html_url,
        }));
        const structured = {
          path: v.path || "/",
          ref: v.ref ?? null,
          count: items.length,
          items,
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          const rows = items.map((i) => [
            i.type === "dir" ? `📁 \`${i.name}/\`` : `📄 \`${i.name}\``,
            i.type,
            i.type === "file" ? `${i.size_bytes} B` : "—",
          ]);
          text = [
            `# Directory \`${structured.path}\``,
            "",
            `${items.length} entries · ref: ${v.ref ?? "(default)"}`,
            "",
            mdTable(["Name", "Type", "Size"], rows),
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_list_directory") }] };
      }
    },
  );

  // ---------------------------------------------------------------------------
  // github_search_code
  // ---------------------------------------------------------------------------
  server.registerTool(
    "github_search_code",
    {
      title: "Search code across GitHub",
      description: `GitHub code search using the standard query syntax.

Args:
  - q (required, string): query. Useful qualifiers: 'repo:owner/name', 'org:name', 'user:name', 'language:ts', 'path:src/', 'filename:Dockerfile', 'extension:md', 'in:file'.
  - limit, offset (pagination)
  - response_format

Returns (JSON):
  { total_count, incomplete_results, count, offset, items: [{ name, path, repository, html_url, score }], has_more, next_offset? }

Examples:
  - 'function login repo:exmachinai/agp_tutorial'
  - 'language:typescript path:src/ McpServer'

Rate limits:
  - Code-search endpoints have a lower rate limit than core API (30 requests/min). Heavy use will hit 403 with x-ratelimit-remaining: 0.`,
      inputSchema: SearchCodeInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = SearchCodeInputSchema.parse(params);
        const perPage = v.limit;
        const page = Math.floor(v.offset / perPage) + 1;
        const resp = await ctx.octokit.rest.search.code({ q: v.q, per_page: perPage, page });

        const items = resp.data.items.map((it) => ({
          name: it.name,
          path: it.path,
          repository: it.repository.full_name,
          html_url: it.html_url,
          score: it.score,
        }));
        const total = resp.data.total_count;
        const hasMore = v.offset + items.length < total;
        const structured = {
          total_count: total,
          incomplete_results: resp.data.incomplete_results,
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
          const rows = items.map((i) => [`\`${i.repository}\``, `\`${i.path}\``]);
          text = [
            `# Code Search`,
            "",
            `Query: \`${v.q}\``,
            "",
            `Total: ${total} · returned: ${items.length} (offset ${v.offset})`,
            "",
            mdTable(["Repo", "Path"], rows),
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_search_code") }] };
      }
    },
  );
}
