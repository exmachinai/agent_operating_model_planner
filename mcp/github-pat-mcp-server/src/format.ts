/**
 * Response formatters: JSON and Markdown variants for tool outputs.
 * Also handles character-limit truncation.
 */

import { CHARACTER_LIMIT } from "./constants.js";
import type { ToolTextResult } from "./types.js";

export type ResponseFormat = "markdown" | "json";

/**
 * Build a standard MCP tool result with both text content and structured data.
 * Applies CHARACTER_LIMIT truncation to the text payload when needed.
 */
export function buildResult(
  textContent: string,
  structured: Record<string, unknown>,
  characterLimit: number = CHARACTER_LIMIT,
): ToolTextResult {
  let text = textContent;
  if (text.length > characterLimit) {
    const cutoff = characterLimit - 200;
    text =
      text.slice(0, Math.max(0, cutoff)) +
      `\n\n... [response truncated at ${characterLimit} characters; ` +
      `${textContent.length - cutoff} characters omitted]\n` +
      `Suggestion: narrow the query, increase 'offset', or set response_format='json' and ` +
      `request only specific fields.`;
  }
  return {
    content: [{ type: "text", text }],
    structuredContent: structured,
  };
}

/** Format ISO 8601 timestamps for human consumption. */
export function fmtDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + " UTC";
  } catch {
    return iso;
  }
}

/** Stringify a JSON object pretty. */
export function stringifyJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

/** Compose Markdown sections from headed blocks. */
export function md(headerLevel: 1 | 2 | 3, title: string, body: string): string {
  return `${"#".repeat(headerLevel)} ${title}\n\n${body}`.trimEnd();
}

/** Render a key-value bullet list. */
export function mdKvList(pairs: Array<[string, string | number | boolean | undefined]>): string {
  return pairs
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `- **${k}**: ${v}`)
    .join("\n");
}

/** Render a simple Markdown table. */
export function mdTable(headers: string[], rows: Array<Array<string | number>>): string {
  const head = `| ${headers.join(" | ")} |`;
  const sep = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((r) => `| ${r.map((c) => String(c)).join(" | ")} |`).join("\n");
  return `${head}\n${sep}\n${body}`;
}
