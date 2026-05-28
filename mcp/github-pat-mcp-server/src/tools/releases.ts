/**
 * Release tools: create_release (with optional asset upload — the harness-zip bridge).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import type { ToolContext } from "../types.js";
import { handleError } from "../errors.js";
import { buildResult, fmtDate, mdKvList } from "../format.js";
import { CreateReleaseInputSchema } from "../schemas/releases.js";

function resolveOwner(input: { owner?: string }, ctx: ToolContext): string | undefined {
  return input.owner ?? ctx.config.defaultOwner;
}

export function registerReleaseTools(server: McpServer, ctx: ToolContext): void {
  server.registerTool(
    "github_create_release",
    {
      title: "Create a GitHub release (optionally upload an asset)",
      description: `Create a release attached to a tag. Optionally upload a binary asset (e.g. the compiled harness zip).

This is the primary publishing path for portable Agent-Harness artifacts.

Args:
  - owner, repo, tag_name (required)
  - target_commitish (optional, defaults to default branch)
  - name, body (optional)
  - draft (default false), prerelease (default false)
  - generate_release_notes (default false) — auto-generates notes from PRs since last release
  - asset_path (optional) — ABSOLUTE local path to a file to upload as a release asset
  - asset_name (optional) — display name; defaults to basename(asset_path)
  - asset_content_type (default 'application/zip')
  - response_format

Returns (JSON):
  { id, tag_name, html_url, draft, prerelease, asset?: { id, name, size_bytes, download_url } }

Use the returned download_url to share the harness with end users (alongside the README).

Error Handling:
  - 422: tag already exists or is invalid; choose a unique tag.
  - 404: asset_path file not found.`,
      inputSchema: CreateReleaseInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (params) => {
      try {
        const v = CreateReleaseInputSchema.parse(params);
        const owner = resolveOwner(v, ctx);
        if (!owner) return { isError: true, content: [{ type: "text", text: "Error: owner missing." }] };

        const releaseResp = await ctx.octokit.rest.repos.createRelease({
          owner,
          repo: v.repo,
          tag_name: v.tag_name,
          target_commitish: v.target_commitish,
          name: v.name,
          body: v.body,
          draft: v.draft,
          prerelease: v.prerelease,
          generate_release_notes: v.generate_release_notes,
        });
        const r = releaseResp.data;

        let asset: { id: number; name: string; size_bytes: number; download_url: string } | null = null;

        if (v.asset_path) {
          try {
            const data = await fs.readFile(v.asset_path);
            const assetName = v.asset_name ?? path.basename(v.asset_path);
            const uploadResp = await ctx.octokit.rest.repos.uploadReleaseAsset({
              owner,
              repo: v.repo,
              release_id: r.id,
              name: assetName,
              data: data as unknown as string, // octokit-rest typing accepts Buffer at runtime
              headers: {
                "content-type": v.asset_content_type,
                "content-length": data.length,
              },
            });
            asset = {
              id: uploadResp.data.id,
              name: uploadResp.data.name,
              size_bytes: uploadResp.data.size,
              download_url: uploadResp.data.browser_download_url,
            };
          } catch (assetErr) {
            const msg = assetErr instanceof Error ? assetErr.message : String(assetErr);
            return {
              isError: true,
              content: [{
                type: "text",
                text:
                  `Release #${r.id} (\`${r.tag_name}\`) created, but ASSET UPLOAD FAILED.\n` +
                  `asset_path: ${v.asset_path}\n` +
                  `Error: ${msg}\n` +
                  `Suggestion: verify the file exists and is readable; retry with github_upload_release_asset (not yet implemented — re-run github_create_release without asset_path is currently the workaround).`,
              }],
            };
          }
        }

        const structured = {
          id: r.id,
          tag_name: r.tag_name,
          name: r.name,
          html_url: r.html_url,
          draft: r.draft,
          prerelease: r.prerelease,
          created_at: r.created_at,
          asset,
        };

        let text: string;
        if (v.response_format === "json") {
          text = JSON.stringify(structured, null, 2);
        } else {
          text = [
            `# Release created: \`${r.tag_name}\``,
            "",
            mdKvList([
              ["ID", r.id],
              ["Title", r.name ?? "—"],
              ["Draft", r.draft],
              ["Prerelease", r.prerelease],
              ["Created", fmtDate(r.created_at)],
              ["URL", r.html_url],
            ]),
            asset
              ? [
                  "",
                  "## Asset uploaded",
                  "",
                  mdKvList([
                    ["Name", asset.name],
                    ["Size", `${asset.size_bytes} bytes`],
                    ["Download URL", asset.download_url],
                  ]),
                ].join("\n")
              : "",
          ].join("\n");
        }
        return buildResult(text, structured, ctx.config.characterLimit);
      } catch (error) {
        return { isError: true, content: [{ type: "text", text: handleError(error, "github_create_release") }] };
      }
    },
  );
}
