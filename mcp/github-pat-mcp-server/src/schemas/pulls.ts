/**
 * Zod schemas for pull request tools.
 */

import { z } from "zod";
import { OwnerRepoSchema, PaginationSchema, ResponseFormatSchema } from "./common.js";

/** List pull requests with filters. */
export const ListPullRequestsInputSchema = OwnerRepoSchema.extend({
  state: z.enum(["open", "closed", "all"]).default("open"),
  head: z
    .string()
    .optional()
    .describe("Filter by source branch, e.g. 'user:branch' or 'branch'."),
  base: z.string().optional().describe("Filter by target branch."),
  sort: z.enum(["created", "updated", "popularity", "long-running"]).default("updated"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  response_format: ResponseFormatSchema,
})
  .merge(PaginationSchema)
  .strict();

export type ListPullRequestsInput = z.infer<typeof ListPullRequestsInputSchema>;

/** Create a new pull request. */
export const CreatePullRequestInputSchema = OwnerRepoSchema.extend({
  title: z.string().min(1).max(256).describe("Imperative title."),
  head: z
    .string()
    .min(1)
    .describe("Source branch (in same repo) or 'user:branch' for cross-fork."),
  base: z
    .string()
    .min(1)
    .describe("Target branch. Usually 'main'."),
  body: z.string().max(60000).optional().describe("Markdown PR body."),
  draft: z.boolean().default(false).describe("Open as draft PR."),
  maintainer_can_modify: z.boolean().default(true),
  response_format: ResponseFormatSchema,
}).strict();

export type CreatePullRequestInput = z.infer<typeof CreatePullRequestInputSchema>;
