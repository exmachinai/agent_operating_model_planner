/**
 * Constitution-Safety-Guard.
 *
 * Checks whether a write operation targets a path covered by
 * `GITHUB_PROTECTED_PATHS` globs. If so, the operation is refused unless the
 * caller explicitly passes acknowledgement flags.
 *
 * AEGIRA-Constitution rationale: Zone 2 (Knowledge Architecture) is canonical
 * and may only be written by the Knowledge-Manager role. This guard makes
 * accidental writes from autonomous agents fail loudly.
 */

import { minimatch } from "minimatch";
import type { GuardCheck } from "./types.js";

export interface GuardInput {
  /** Repo full name (owner/repo) — used to match patterns like `org/*`. */
  repoFullName: string;
  /** Optional path inside the repo (file path or directory). */
  targetPath?: string;
  /** Explicit acknowledgement that the caller knows this is protected. */
  acknowledgeProtectedPath?: boolean;
  /** Required justification when acknowledging. */
  protectedPathReason?: string;
  /** Configured glob patterns. */
  protectedPaths: readonly string[];
}

/**
 * Returns `{ allowed: true }` if the operation may proceed, or
 * `{ allowed: false, message }` with a guidance message otherwise.
 */
export function checkProtectedPath(input: GuardInput): GuardCheck {
  const { repoFullName, targetPath, protectedPaths } = input;

  // Empty config = no protection.
  if (protectedPaths.length === 0) {
    return { allowed: true };
  }

  // Build candidate strings to test.
  const candidates: string[] = [];
  if (targetPath) {
    candidates.push(targetPath);
    candidates.push(`${repoFullName}/${targetPath}`);
  }
  candidates.push(repoFullName);

  const matchedPattern = protectedPaths.find((pattern) =>
    candidates.some((c) => minimatch(c, pattern, { dot: true, matchBase: false })),
  );

  if (!matchedPattern) {
    return { allowed: true };
  }

  // A protected path matched — require explicit acknowledgement.
  const ack = input.acknowledgeProtectedPath === true;
  const reason = input.protectedPathReason?.trim();

  if (!ack) {
    return {
      allowed: false,
      matchedPattern,
      message:
        `Refused: target matches protected-path pattern '${matchedPattern}'. ` +
        `This path is part of the AEGIRA Constitution Zone (Zone 2 — canonical, ` +
        `Knowledge-Manager-only writes). To proceed, pass:\n` +
        `  acknowledge_protected_path: true\n` +
        `  protected_path_reason: "<justification, including HITL-PM ticket reference>"\n\n` +
        `If this was unintentional, choose a different target.`,
    };
  }

  if (!reason || reason.length < 10) {
    return {
      allowed: false,
      matchedPattern,
      message:
        `Refused: protected-path acknowledgement present, but ` +
        `'protected_path_reason' is missing or too short. ` +
        `Provide a justification of at least 10 characters, ideally referencing a ` +
        `HITL-PM approval ticket.`,
    };
  }

  // Acknowledged with justification — allow, but flag.
  return {
    allowed: true,
    matchedPattern,
    message: `WARNING: write to protected path '${matchedPattern}' permitted by explicit acknowledgement. Reason: ${reason}`,
  };
}
