/**
 * Zod schemas for milestone tools.
 *
 * Milestones map naturally to ZGPM-Meilensteine — that's the planner-side bridge.
 */

import { z } from "zod";
import { OwnerRepoSchema, PaginationSchema, ResponseFormatSchema } from "./common.js";

/** List milestones in a repo. */
export const ListMilestonesInputSchema = OwnerRepoSchema.extend({
  state: z.enum(["open", "closed", "all"]).default("open"),
  sort: z.enum(["due_on", "completeness"]).default("due_on"),
  direction: z.enum(["asc", "desc"]).default("asc"),
  response_format: ResponseFormatSchema,
})
  .merge(PaginationSchema)
  .strict();

export type ListMilestonesInput = z.infer<typeof ListMilestonesInputSchema>;

/** Create a milestone. */
export const CreateMilestoneInputSchema = OwnerRepoSchema.extend({
  title: z
    .string()
    .min(1)
    .max(256)
    .describe("Milestone title. For ZGPM-compatible plans use Perfekt-form, e.g. 'API-Architektur freigegeben'."),
  state: z.enum(["open", "closed"]).default("open"),
  description: z.string().max(60000).optional(),
  due_on: z
    .string()
    .optional()
    .describe("ISO 8601 timestamp. Use the ZGPM 'geplant' date."),
  response_format: ResponseFormatSchema,
}).strict();

export type CreateMilestoneInput = z.infer<typeof CreateMilestoneInputSchema>;
