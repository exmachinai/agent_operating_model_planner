/**
 * Zod schemas for branch tools.
 */

import { z } from "zod";
import { OwnerRepoSchema, PaginationSchema, ResponseFormatSchema } from "./common.js";

/** List branches in a repo. */
export const ListBranchesInputSchema = OwnerRepoSchema.extend({
  protected_only: z
    .boolean()
    .default(false)
    .describe("Only return protected branches."),
  response_format: ResponseFormatSchema,
})
  .merge(PaginationSchema)
  .strict();

export type ListBranchesInput = z.infer<typeof ListBranchesInputSchema>;

/** Create a new branch from a base ref. */
export const CreateBranchInputSchema = OwnerRepoSchema.extend({
  name: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[A-Za-z0-9._\-\/]+$/, "Branch name must use letters, digits, dashes, dots, underscores, and slashes")
    .describe("New branch name. Examples: 'feature/add-auth', 'fix/null-ref'."),
  from: z
    .string()
    .min(1)
    .max(255)
    .optional()
    .describe("Base ref (branch name or commit SHA). Omit to use the repo's default branch."),
  response_format: ResponseFormatSchema,
}).strict();

export type CreateBranchInput = z.infer<typeof CreateBranchInputSchema>;
