/**
 * Zod schemas for release tools.
 */

import { z } from "zod";
import { OwnerRepoSchema, ResponseFormatSchema } from "./common.js";

/** Create a release, optionally uploading a binary asset (e.g. the harness zip). */
export const CreateReleaseInputSchema = OwnerRepoSchema.extend({
  tag_name: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9._\-\/]+$/, "Tag must be a valid git tag.")
    .describe("Git tag for this release. e.g. 'v1.0.0' or 'harness/2026-05-28'."),
  target_commitish: z
    .string()
    .optional()
    .describe("Branch or commit SHA. Omit to use the default branch."),
  name: z.string().max(256).optional().describe("Release title."),
  body: z.string().max(125000).optional().describe("Markdown release notes."),
  draft: z.boolean().default(false),
  prerelease: z.boolean().default(false),
  generate_release_notes: z
    .boolean()
    .default(false)
    .describe("Auto-generate release notes from PRs since the previous tag."),
  asset_path: z
    .string()
    .optional()
    .describe(
      "Absolute path to a binary asset to upload (e.g. the harness zip). The MCP host must have local FS access.",
    ),
  asset_name: z
    .string()
    .optional()
    .describe("Display name of the uploaded asset. Defaults to basename of asset_path."),
  asset_content_type: z
    .string()
    .default("application/zip")
    .describe("MIME type of the asset."),
  response_format: ResponseFormatSchema,
}).strict();

export type CreateReleaseInput = z.infer<typeof CreateReleaseInputSchema>;
