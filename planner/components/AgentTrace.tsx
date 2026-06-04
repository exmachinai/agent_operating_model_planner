/**
 * AgentTrace — Pflicht-Komponente.
 *
 * Spec: docs/05_ux-ui-best-practices.md §7 (Multi-Agent-Live-View) und §6.1 (Komponenten-Bibliothek).
 *
 * Renders a single agent's contribution to a multi-agent session:
 *   - Agent identity (avatar/initial + name + role).
 *   - Optional "thinking" summary (collapsible).
 *   - List of tool-calls (collapsible accordion with input/output preview).
 *   - Status badge (running / waiting / completed / failed).
 *   - Provenance: optional source references (Plan-YAML line, doc anchor, etc.).
 *
 * Pattern: Streaming-friendly. The `streaming` flag enables a soft pulse on
 * the status badge while content is appended.
 *
 * Provenance Tooltip:
 *   - Hover/focus on the agent name → opens a popover with role description.
 *   - Click on a tool-call header → expands input/output.
 *   - Each tool-call has its own Provenance-Link to .claude/skills/<name>/SKILL.md.
 */

"use client";

import * as React from "react";

// ============================================================================
// Types
// ============================================================================

export type AgentStatus = "running" | "waiting" | "completed" | "failed" | "halted";

export interface ToolCall {
  id: string;
  toolName: string;
  /** What was sent — keep small. The full payload lives in the audit log. */
  inputPreview: string;
  /** First N chars of result. Full result via "expand". */
  outputPreview: string;
  /** Optional: link to the audit-log entry for the full payload. */
  auditLogUrl?: string;
  /** Tool execution duration in ms. */
  durationMs?: number;
  /** True if Hook intercepted/halted this call. */
  hookHalted?: boolean;
}

export interface AgentTraceProps {
  /** Subagent identifier — must match .claude/agents/<name>.md. */
  agentName: string;
  /** Human-readable role. */
  agentRole: string;
  /** PVM-Code of this agent for the current milestone. */
  pvmCode?: "A" | "B" | "E" | "e" | "F" | "L" | "I" | "V";
  /** Iteration index within the multi-agent run (1-based). */
  iteration: number;
  /** Brief from extended-thinking. Collapsed by default. */
  thinkingSummary?: string;
  /** Tool calls in execution order. */
  toolCalls: ToolCall[];
  /** Current status of this agent step. */
  status: AgentStatus;
  /** Token usage for this step. */
  tokensUsed?: number;
  /** True if this step is currently appending output (used for pulse). */
  streaming?: boolean;
  /** Wall-clock at start of this step. */
  startedAt: Date;
  /** Optional: callback when the agent name is clicked to show full agent doc. */
  onClickAgent?: () => void;
  /** Optional: callback when a tool-call header is clicked to open audit log. */
  onClickToolAudit?: (toolCallId: string) => void;
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusBadge({ status, streaming }: { status: AgentStatus; streaming?: boolean }): React.ReactElement {
  const meta: Record<AgentStatus, { label: string; bg: string; fg: string }> = {
    running: { label: "läuft", bg: "var(--c-gold)", fg: "var(--c-navy-dark)" },
    waiting: { label: "wartet auf HITL", bg: "var(--c-amber)", fg: "var(--c-navy-dark)" },
    completed: { label: "fertig", bg: "var(--c-green)", fg: "var(--c-white)" },
    failed: { label: "fehlgeschlagen", bg: "var(--c-red)", fg: "var(--c-white)" },
    halted: { label: "Guard gestoppt", bg: "var(--c-red)", fg: "var(--c-white)" },
  };
  const m = meta[status];
  return (
    <span
      style={{
        ...badgeStyle,
        backgroundColor: m.bg,
        color: m.fg,
      }}
      aria-label={`Status: ${m.label}`}
    >
      {streaming && (
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: "currentColor",
            marginRight: 6,
            animation: "aegiraPulse 1.4s ease-in-out infinite",
          }}
        />
      )}
      {m.label}
    </span>
  );
}

function ToolCallRow({
  call,
  onOpenAudit,
}: {
  call: ToolCall;
  onOpenAudit?: (id: string) => void;
}): React.ReactElement {
  const [expanded, setExpanded] = React.useState(false);
  const id = React.useId();
  return (
    <li style={toolListStyle}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={id}
        style={toolHeaderStyle}
      >
        <span style={toolNameStyle}>
          <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>{" "}
          <code style={toolCodeStyle}>{call.toolName}</code>
        </span>
        <span style={toolMetaStyle}>
          {call.hookHalted && (
            <span aria-label="Hook hat den Aufruf gestoppt" style={hookBadgeStyle}>
              🛡 gestoppt
            </span>
          )}
          {typeof call.durationMs === "number" && (
            <span>{call.durationMs}ms</span>
          )}
        </span>
      </button>
      {expanded && (
        <div id={id} style={toolDetailStyle}>
          <div>
            <strong style={detailLabelStyle}>Input (preview)</strong>
            <pre style={preStyle}>{call.inputPreview}</pre>
          </div>
          <div>
            <strong style={detailLabelStyle}>Output (preview)</strong>
            <pre style={preStyle}>{call.outputPreview}</pre>
          </div>
          {(call.auditLogUrl || onOpenAudit) && (
            <button
              type="button"
              onClick={() => onOpenAudit?.(call.id)}
              style={auditLinkStyle}
            >
              Vollständigen Audit-Eintrag öffnen ↗
            </button>
          )}
        </div>
      )}
    </li>
  );
}

// ============================================================================
// Main
// ============================================================================

export function AgentTrace(props: AgentTraceProps): React.ReactElement {
  const {
    agentName,
    agentRole,
    pvmCode,
    iteration,
    thinkingSummary,
    toolCalls,
    status,
    tokensUsed,
    streaming,
    startedAt,
    onClickAgent,
    onClickToolAudit,
  } = props;

  const [thinkingOpen, setThinkingOpen] = React.useState(false);

  const initial = agentName.charAt(0).toUpperCase();
  const startedClock = new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(startedAt);

  return (
    <article style={rootStyle} aria-labelledby={`agt-${agentName}-name`}>
      <header style={headerStyle}>
        <div style={avatarStyle} aria-hidden="true">
          {initial}
        </div>
        <div style={titleRowStyle}>
          <button
            type="button"
            onClick={onClickAgent}
            id={`agt-${agentName}-name`}
            style={agentNameButtonStyle}
            aria-label={`${agentName} (${agentRole}) — Details öffnen`}
          >
            {agentName}
          </button>
          <span style={agentRoleStyle}>{agentRole}</span>
          {pvmCode && (
            <span style={pvmBadgeStyle} aria-label={`Verantwortungs-Code ${pvmCode}`}>
              {pvmCode}
            </span>
          )}
        </div>
        <StatusBadge status={status} streaming={streaming} />
      </header>

      <div style={metaRowStyle}>
        <span>Iteration {iteration}</span>
        <span aria-hidden="true">·</span>
        <span>Start {startedClock}</span>
        {typeof tokensUsed === "number" && (
          <>
            <span aria-hidden="true">·</span>
            <span>{tokensUsed.toLocaleString("de-DE")} Tokens</span>
          </>
        )}
      </div>

      {thinkingSummary && (
        <div style={thinkingContainerStyle}>
          <button
            type="button"
            onClick={() => setThinkingOpen(!thinkingOpen)}
            aria-expanded={thinkingOpen}
            style={thinkingToggleStyle}
          >
            <span aria-hidden="true">{thinkingOpen ? "▾" : "▸"}</span>{" "}
            Extended Thinking{thinkingOpen ? "" : " (Zusammenfassung)"}
          </button>
          {thinkingOpen && (
            <p style={thinkingTextStyle}>{thinkingSummary}</p>
          )}
        </div>
      )}

      {toolCalls.length > 0 && (
        <ul style={toolsListStyle}>
          {toolCalls.map((c) => (
            <ToolCallRow key={c.id} call={c} onOpenAudit={onClickToolAudit} />
          ))}
        </ul>
      )}

      <style>{keyframes}</style>
    </article>
  );
}

// ============================================================================
// Styles — hairline editorial look, no shadows on individual rows
// ============================================================================

const rootStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--c-ink)",
  backgroundColor: "var(--c-surface)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-md)",
  padding: "var(--sp-4)",
  marginBottom: "var(--sp-3)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-3)",
  flexWrap: "wrap",
};

const avatarStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  backgroundColor: "var(--c-navy)",
  color: "var(--c-vellum)",
  display: "grid",
  placeItems: "center",
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 14,
  flexShrink: 0,
};

const titleRowStyle: React.CSSProperties = {
  flex: "1 1 auto",
  display: "flex",
  alignItems: "baseline",
  gap: "var(--sp-2)",
  flexWrap: "wrap",
};

const agentNameButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "0",
  padding: 0,
  fontFamily: "var(--font-display)",
  fontWeight: 600,
  fontSize: 16,
  color: "var(--c-ink)",
  cursor: "pointer",
  textAlign: "left",
};

const agentRoleStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--c-steel)",
  fontStyle: "italic",
};

const pvmBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  padding: "2px 6px",
  backgroundColor: "var(--c-ice)",
  color: "var(--c-navy)",
  borderRadius: "var(--r-sm)",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  padding: "4px 10px",
  borderRadius: "var(--r-pill)",
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--sp-2)",
  fontSize: 12,
  color: "var(--c-steel)",
  marginTop: "var(--sp-2)",
};

const thinkingContainerStyle: React.CSSProperties = {
  marginTop: "var(--sp-3)",
  padding: "var(--sp-2) var(--sp-3)",
  backgroundColor: "var(--c-vellum)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-sm)",
};

const thinkingToggleStyle: React.CSSProperties = {
  background: "transparent",
  border: "0",
  padding: 0,
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 600,
  color: "var(--c-navy)",
  letterSpacing: "0.02em",
};

const thinkingTextStyle: React.CSSProperties = {
  marginTop: "var(--sp-2)",
  marginBottom: 0,
  fontSize: 13,
  lineHeight: 1.55,
  color: "var(--c-steel)",
};

const toolsListStyle: React.CSSProperties = {
  marginTop: "var(--sp-3)",
  paddingLeft: 0,
  listStyle: "none",
  borderTop: "1px solid var(--c-border)",
};

const toolListStyle: React.CSSProperties = {
  borderBottom: "1px solid var(--c-border)",
};

const toolHeaderStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "0",
  padding: "var(--sp-2) 0",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--sp-3)",
  textAlign: "left",
};

const toolNameStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--sp-1)",
  fontSize: 13,
};

const toolCodeStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  backgroundColor: "var(--c-vellum)",
  padding: "2px 6px",
  borderRadius: "var(--r-sm)",
  border: "1px solid var(--c-border)",
};

const toolMetaStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  fontSize: 11,
  color: "var(--c-steel)",
};

const hookBadgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.04em",
  color: "var(--c-red)",
  border: "1px solid var(--c-red)",
  padding: "1px 6px",
  borderRadius: "var(--r-sm)",
};

const toolDetailStyle: React.CSSProperties = {
  paddingBottom: "var(--sp-2)",
  display: "grid",
  gap: "var(--sp-2)",
};

const detailLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--c-gray)",
  marginBottom: 4,
};

const preStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  lineHeight: 1.5,
  backgroundColor: "var(--c-vellum)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-sm)",
  padding: "var(--sp-2)",
  maxHeight: 180,
  overflow: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
};

const auditLinkStyle: React.CSSProperties = {
  background: "transparent",
  border: "0",
  color: "var(--c-navy)",
  textDecoration: "underline",
  cursor: "pointer",
  fontSize: 12,
  padding: 0,
};

const keyframes = `
@keyframes aegiraPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%      { opacity: 0.35; transform: scale(1.4); }
}
`;
