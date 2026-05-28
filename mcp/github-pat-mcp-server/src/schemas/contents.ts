/**
 * Zod schemas for repository content tools.
 */

import { z } from "zod";
import {
  OwnerRepoSchema,
  PaginationSchema,
  ProtectedPathAckSchema,
  RefSchema,
  ResponseFormatSchema,
} from "./common.js";

/** Read file content at a ref. */
export const ReadFileInputSchema = OwnerRepoSchema.extend({
  path: z
    .string()
    .min(1)
    .max(1024)
    .describe("Path to the file inside the repo (e.g. 'docs/README.md')."),
  ref: RefSchema,
  response_format: ResponseFormatSchema,
}).strict();

export type ReadFileInput = z.infer<typeof ReadFileInputSchema>;

/** Write (create or update) a file in a single commit. */
export const WriteFileInputSchema = OwnerRepoSchema.merge(ProtectedPathAckSchema)
  .extend({
    path: z.string().min(1).max(1024).describe("Path inside the repo."),
    content: z
      .string()
      .describe("UTF-8 content. Will be base64-encoded automatically."),
    message: z
      .string()
      .min(1)
      .max(720)
      .describe("Commit message. Imperative form, short. e.g. 'add agent setup doc'"),
    branch: z
      .string()
      .min(1)
      .max(255)
      .optional()
      .describe("Branch to write to. Omit to use the default branch."),
    sha: z
      .string()
      .min(40)
      .max(40)
      .optional()
      .describe("Existing file SHA (required when updating an existing file)."),
    author_name: z.string().optional(),
    author_email: z.string().email().optional(),
    response_format: ResponseFormatSchema,
  })
  .strict();

export type WriteFileInput = z.infer<typeof WriteFileInputSchema>;

/** List directory contents at a ref. */
export const ListDirectoryInputSchema = OwnerRepoSchema.extend({
  path: z
    .string()
    .max(1024)
    .default("")
    .describe("Directory path inside the repo. Empty string = repo root."),
  ref: RefSchema,
  response_format: ResponseFormatSchema,
}).strict();

export type ListDirectoryInput = z.infer<typeof ListDirectoryInputSchema>;

/** Code search across repos. */
export const SearchCodeInputSchema = z
  .object({
    q: z
      .string()
      .min(1)
      .max(256)
      .describe(
        "GitHub code-search query. Use qualifiers like 'repo:owner/name', 'language:ts', 'path:src/'. Example: 'function login repo:exmachinai/agp_tutorial'.",
      ),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export type SearchCodeInput = z.infer<typeof SearchCodeInputSchema>;
