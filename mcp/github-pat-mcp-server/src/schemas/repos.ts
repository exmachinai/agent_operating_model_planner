/**
 * Zod schemas for repository tools.
 */

import { z } from "zod";
import { OwnerRepoSchema, PaginationSchema, ResponseFormatSchema } from "./common.js";

/** List repositories — supports user or org owners. */
export const ListReposInputSchema = z
  .object({
    owner: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z0-9_-]+$/)
      .optional()
      .describe("GitHub user or org login. Omit to use GITHUB_DEFAULT_OWNER."),
    owner_type: z
      .enum(["user", "org", "auto"])
      .default("auto")
      .describe(
        "Owner type. 'auto' (default) detects via /users/{owner} call. Use 'user' or 'org' explicitly to skip detection.",
      ),
    type: z
      .enum(["all", "owner", "public", "private", "member", "forks", "sources"])
      .default("all")
      .describe("Repo type filter (depends on owner_type)."),
    sort: z
      .enum(["created", "updated", "pushed", "full_name"])
      .default("updated")
      .describe("Sort field."),
    direction: z.enum(["asc", "desc"]).default("desc").describe("Sort direction."),
    response_format: ResponseFormatSchema,
  })
  .merge(PaginationSchema)
  .strict();

export type ListReposInput = z.infer<typeof ListReposInputSchema>;

/** Get a single repo's metadata. */
export const GetRepoInputSchema = OwnerRepoSchema.extend({
  response_format: ResponseFormatSchema,
}).strict();

export type GetRepoInput = z.infer<typeof GetRepoInputSchema>;

/** Create a new repository. */
export const CreateRepoInputSchema = z
  .object({
    name: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[A-Za-z0-9._-]+$/, "name must be a valid GitHub repo name")
      .describe("Repository name."),
    owner: z
      .string()
      .min(1)
      .max(100)
      .optional()
      .describe("Owner — user login for user repos, org login for org repos. Omit to create under authenticated user."),
    owner_type: z
      .enum(["user", "org", "auto"])
      .default("auto")
      .describe("Whether to create under a user or an org."),
    description: z.string().max(350).optional().describe("Short repo description."),
    private: z.boolean().default(true).describe("Whether the repo is private. Default true (Constitution-safe)."),
    auto_init: z.boolean().default(false).describe("Create an initial commit with empty README."),
    gitignore_template: z.string().optional().describe("e.g. 'Node', 'Python'."),
    license_template: z.string().optional().describe("e.g. 'apache-2.0', 'mit'."),
    homepage: z.string().url().optional(),
    has_issues: z.boolean().default(true),
    has_projects: z.boolean().default(true),
    has_wiki: z.boolean().default(false),
    response_format: ResponseFormatSchema,
  })
  .strict();

export type CreateRepoInput = z.infer<typeof CreateRepoInputSchema>;
