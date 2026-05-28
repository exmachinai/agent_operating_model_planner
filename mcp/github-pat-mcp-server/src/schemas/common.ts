/**
 * Shared Zod schemas reused across tool definitions.
 */

import { z } from "zod";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "../constants.js";

/** Output-format selector. */
export const ResponseFormatSchema = z
  .enum(["markdown", "json"])
  .default("markdown")
  .describe("Output format: 'markdown' for human-readable, 'json' for machine-readable");

/** Owner + repo pair, with owner optional when GITHUB_DEFAULT_OWNER is set. */
export const OwnerRepoSchema = z.object({
  owner: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/, "owner must be a valid GitHub login or org name")
    .optional()
    .describe(
      "GitHub user or org. If omitted, GITHUB_DEFAULT_OWNER env var is used (set to 'exmachinai' by default).",
    ),
  repo: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9._-]+$/, "repo must be a valid GitHub repository name")
    .describe("Repository name (without owner prefix)."),
});

/** Standard pagination input. */
export const PaginationSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .default(DEFAULT_PAGE_SIZE)
    .describe(`Maximum items to return per call (1–${MAX_PAGE_SIZE}, default ${DEFAULT_PAGE_SIZE}).`),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of items to skip before returning results."),
});

/** Optional Git ref (branch, tag, or commit SHA). Defaults to default branch when omitted. */
export const RefSchema = z
  .string()
  .min(1)
  .max(255)
  .optional()
  .describe("Git ref: branch name, tag, or commit SHA. Omit to use the repository's default branch.");

/** Protected-path acknowledgement (used by all write tools that touch contents). */
export const ProtectedPathAckSchema = z.object({
  acknowledge_protected_path: z
    .boolean()
    .optional()
    .describe(
      "Set true to acknowledge that the target matches a protected-path pattern (Constitution Zone 2).",
    ),
  protected_path_reason: z
    .string()
    .min(10)
    .optional()
    .describe(
      "Required when acknowledge_protected_path=true: justification including HITL-PM ticket reference.",
    ),
});

/** Helper: type-safe inference of a Zod schema. */
export type Infer<S extends z.ZodTypeAny> = z.infer<S>;
