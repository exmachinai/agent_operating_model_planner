/**
 * Zod schemas for issue tools.
 */

import { z } from "zod";
import {
  OwnerRepoSchema,
  PaginationSchema,
  ProtectedPathAckSchema,
  ResponseFormatSchema,
} from "./common.js";

/** List issues with filters. */
export const ListIssuesInputSchema = OwnerRepoSchema.extend({
  state: z.enum(["open", "closed", "all"]).default("open"),
  labels: z
    .array(z.string().min(1).max(100))
    .max(20)
    .optional()
    .describe("Filter by labels. AND-combined."),
  assignee: z.string().min(1).max(100).optional(),
  creator: z.string().min(1).max(100).optional(),
  mentioned: z.string().min(1).max(100).optional(),
  milestone: z
    .union([z.string(), z.number().int()])
    .optional()
    .describe("Milestone number (int) or '*' for any or 'none' for none."),
  since: z
    .string()
    .optional()
    .describe("ISO 8601 timestamp — only issues updated after this."),
  sort: z.enum(["created", "updated", "comments"]).default("updated"),
  direction: z.enum(["asc", "desc"]).default("desc"),
  response_format: ResponseFormatSchema,
})
  .merge(PaginationSchema)
  .strict();

export type ListIssuesInput = z.infer<typeof ListIssuesInputSchema>;

/** Get a single issue. */
export const GetIssueInputSchema = OwnerRepoSchema.extend({
  number: z.number().int().positive().describe("Issue number."),
  response_format: ResponseFormatSchema,
}).strict();

export type GetIssueInput = z.infer<typeof GetIssueInputSchema>;

/** Create a new issue. */
export const CreateIssueInputSchema = OwnerRepoSchema.extend({
  title: z
    .string()
    .min(1)
    .max(256)
    .describe("Short imperative title. e.g. 'Add risk-agent skill'."),
  body: z
    .string()
    .max(60000)
    .optional()
    .describe("Markdown body. Include context, acceptance criteria, links."),
  labels: z.array(z.string()).max(20).optional(),
  assignees: z.array(z.string()).max(10).optional(),
  milestone: z.number().int().positive().optional(),
  response_format: ResponseFormatSchema,
}).strict();

export type CreateIssueInput = z.infer<typeof CreateIssueInputSchema>;

/** Update an issue — state, labels, assignees, title, body, milestone. */
export const UpdateIssueInputSchema = OwnerRepoSchema.merge(ProtectedPathAckSchema)
  .extend({
    number: z.number().int().positive().describe("Issue number."),
    title: z.string().min(1).max(256).optional(),
    body: z.string().max(60000).optional(),
    state: z.enum(["open", "closed"]).optional(),
    state_reason: z.enum(["completed", "not_planned", "reopened"]).optional(),
    labels: z
      .array(z.string())
      .max(20)
      .optional()
      .describe("REPLACES existing labels. To add a single label, list all current ones plus the new."),
    assignees: z.array(z.string()).max(10).optional(),
    milestone: z
      .union([z.number().int().positive(), z.null()])
      .optional()
      .describe("Milestone number, or null to clear."),
    add_comment: z
      .string()
      .max(60000)
      .optional()
      .describe("Optional comment to post alongside the update."),
    response_format: ResponseFormatSchema,
  })
  .strict();

export type UpdateIssueInput = z.infer<typeof UpdateIssueInputSchema>;
