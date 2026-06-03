/**
 * HitlApprovalPrompt — Pflicht-Komponente.
 *
 * Spec: docs/05_ux-ui-best-practices.md §7.3 (HITL-Approval-Inline).
 *
 * Renders an inline approval prompt within an agent trace. NOT a modal.
 *
 * Three actions:
 *   - Approve (⌘⏎): closes the milestone, continues the run.
 *   - Request Changes: opens an inline textarea, sends back to Reviewer-Agent.
 *   - Stop Run: destructive — requires double confirmation.
 *
 * Accessibility:
 *   - role=region with aria-label.
 *   - First focus on the Approve button.
 *   - Keyboard: ⌘⏎ approves, Esc cancels the request-changes editor.
 *
 * Brand:
 *   - Gold for the primary Approve button (Sovereign-Accent).
 *   - Navy outline for Request Changes (secondary action).
 *   - Red text-only for Stop (destructive, low affordance until confirmed).
 */

"use client";

import * as React from "react";

export interface ReviewerFinding {
  severity: "ERROR" | "WARNING" | "INFO";
  rule: string;
  message: string;
  /** Optional anchor to the offending plan-line (e.g. "plan/pvm.yaml::M03"). */
  location?: string;
}

export interface HitlApprovalPromptProps {
  /** Milestone ID (e.g. "M02"). */
  milestoneId: string;
  /** Milestone title in Verb-im-Perfekt form. */
  milestoneTitle: string;
  /** Phase name (e.g. "Design"). */
  phaseName: string;
  /** Risk traffic-light status. */
  risk: "gruen" | "gelb" | "rot";
  /** Optional list of risk IDs to display. */
  riskIds?: string[];
  /** Reviewer-Agent outcome. */
  reviewer: {
    status: "PASS" | "PASS_WITH_NOTES" | "NEEDS_REVISION";
    findings?: ReviewerFinding[];
  };
  /** Locale for labels. Default 'de'. */
  locale?: "de" | "en";

  onApprove: () => void | Promise<void>;
  onRequestChanges: (message: string) => void | Promise<void>;
  onStop: () => void | Promise<void>;
}

// ============================================================================
// Copy
// ============================================================================

const COPY: Record<
  "de" | "en",
  {
    heading: string;
    riskLabel: string;
    riskFor: Record<"gruen" | "gelb" | "rot", string>;
    phase: string;
    reviewer: string;
    reviewerPass: string;
    reviewerPassWithNotes: string;
    reviewerNeeds: string;
    approve: string;
    approveShortcut: string;
    requestChanges: string;
    stop: string;
    stopConfirm: string;
    requestPlaceholder: string;
    requestSend: string;
    requestCancel: string;
    severityErr: string;
    severityWarn: string;
    severityInfo: string;
  }
> = {
  de: {
    heading: "Approval erforderlich",
    riskLabel: "Risiko",
    riskFor: { gruen: "grün", gelb: "gelb", rot: "rot" },
    phase: "Phase",
    reviewer: "Reviewer",
    reviewerPass: "PASS",
    reviewerPassWithNotes: "PASS mit Hinweisen",
    reviewerNeeds: "NEEDS REVISION",
    approve: "Approve",
    approveShortcut: "⌘⏎",
    requestChanges: "Änderungen anfordern",
    stop: "Run stoppen",
    stopConfirm: "Wirklich stoppen?",
    requestPlaceholder:
      "Was soll der Reviewer-Agent neu prüfen? Konkret, mit Referenz.",
    requestSend: "An Reviewer senden",
    requestCancel: "Abbrechen",
    severityErr: "Fehler",
    severityWarn: "Warnung",
    severityInfo: "Info",
  },
  en: {
    heading: "Approval required",
    riskLabel: "Risk",
    riskFor: { gruen: "green", gelb: "amber", rot: "red" },
    phase: "Phase",
    reviewer: "Reviewer",
    reviewerPass: "PASS",
    reviewerPassWithNotes: "PASS with notes",
    reviewerNeeds: "NEEDS REVISION",
    approve: "Approve",
    approveShortcut: "⌘⏎",
    requestChanges: "Request changes",
    stop: "Stop run",
    stopConfirm: "Stop for real?",
    requestPlaceholder:
      "What should the Reviewer-Agent re-check? Be concrete, with reference.",
    requestSend: "Send to reviewer",
    requestCancel: "Cancel",
    severityErr: "Error",
    severityWarn: "Warning",
    severityInfo: "Info",
  },
};

// ============================================================================
// Component
// ============================================================================

export function HitlApprovalPrompt(
  props: HitlApprovalPromptProps,
): React.ReactElement {
  const {
    milestoneId,
    milestoneTitle,
    phaseName,
    risk,
    riskIds,
    reviewer,
    locale = "de",
    onApprove,
    onRequestChanges,
    onStop,
  } = props;

  const t = COPY[locale];
  const approveRef = React.useRef<HTMLButtonElement>(null);
  const [mode, setMode] = React.useState<"idle" | "requesting" | "confirmStop">("idle");
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    if (mode === "idle") approveRef.current?.focus();
  }, [mode]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && mode === "idle") {
        e.preventDefault();
        void onApprove();
      }
      if (e.key === "Escape" && mode !== "idle") {
        e.preventDefault();
        setMode("idle");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, onApprove]);

  const riskDot = (
    <span
      aria-hidden="true"
      style={{
        ...dotStyle,
        backgroundColor:
          risk === "rot" ? "var(--c-red)" : risk === "gelb" ? "var(--c-amber)" : "var(--c-green)",
      }}
    />
  );

  const reviewerBadge = (
    <span
      style={{
        ...reviewerBadgeStyle,
        backgroundColor:
          reviewer.status === "PASS"
            ? "var(--c-green)"
            : reviewer.status === "PASS_WITH_NOTES"
            ? "var(--c-amber)"
            : "var(--c-red)",
        color: reviewer.status === "PASS_WITH_NOTES" ? "var(--c-navy-dark)" : "var(--c-white)",
      }}
    >
      {reviewer.status === "PASS"
        ? t.reviewerPass
        : reviewer.status === "PASS_WITH_NOTES"
        ? t.reviewerPassWithNotes
        : t.reviewerNeeds}
    </span>
  );

  return (
    <section
      role="region"
      aria-label={`${t.heading} — ${milestoneId}`}
      style={rootStyle}
    >
      <header style={headerStyle}>
        <span style={kickerStyle}>{t.heading.toUpperCase()}</span>
        <h3 style={titleStyle}>
          <code style={mIdStyle}>{milestoneId}</code> — {milestoneTitle}
        </h3>
      </header>

      <dl style={metaGridStyle}>
        <div>
          <dt style={dtStyle}>{t.phase}</dt>
          <dd style={ddStyle}>{phaseName}</dd>
        </div>
        <div>
          <dt style={dtStyle}>{t.riskLabel}</dt>
          <dd style={ddStyle}>
            {riskDot} {t.riskFor[risk]}
            {riskIds && riskIds.length > 0 && (
              <span style={riskIdsStyle}>
                {" "}({riskIds.join(", ")})
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt style={dtStyle}>{t.reviewer}</dt>
          <dd style={ddStyle}>{reviewerBadge}</dd>
        </div>
      </dl>

      {reviewer.findings && reviewer.findings.length > 0 && (
        <ul style={findingsListStyle}>
          {reviewer.findings.map((f, i) => (
            <li key={i} style={findingItemStyle}>
              <span
                style={{
                  ...severityStyle,
                  backgroundColor:
                    f.severity === "ERROR"
                      ? "var(--c-red)"
                      : f.severity === "WARNING"
                      ? "var(--c-amber)"
                      : "var(--c-ice)",
                  color:
                    f.severity === "ERROR"
                      ? "var(--c-white)"
                      : f.severity === "WARNING"
                      ? "var(--c-navy-dark)"
                      : "var(--c-navy)",
                }}
              >
                {f.severity === "ERROR"
                  ? t.severityErr
                  : f.severity === "WARNING"
                  ? t.severityWarn
                  : t.severityInfo}
              </span>
              <span style={findingRuleStyle}>{f.rule}</span>
              <span style={findingMsgStyle}>{f.message}</span>
              {f.location && <code style={findingLocStyle}>{f.location}</code>}
            </li>
          ))}
        </ul>
      )}

      {mode === "idle" && (
        <div style={actionsRowStyle}>
          <button
            ref={approveRef}
            type="button"
            onClick={() => onApprove()}
            style={approveButtonStyle}
          >
            <span>{t.approve}</span>
            <kbd style={shortcutStyle}>{t.approveShortcut}</kbd>
          </button>
          <button
            type="button"
            onClick={() => setMode("requesting")}
            style={secondaryButtonStyle}
          >
            {t.requestChanges}
          </button>
          <button
            type="button"
            onClick={() => setMode("confirmStop")}
            style={stopButtonStyle}
          >
            {t.stop}
          </button>
        </div>
      )}

      {mode === "requesting" && (
        <div style={requestEditorStyle}>
          <label htmlFor="aegira-hitl-request" style={requestLabelStyle}>
            {t.requestPlaceholder}
          </label>
          <textarea
            id="aegira-hitl-request"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            style={textareaStyle}
            autoFocus
          />
          <div style={requestActionsStyle}>
            <button
              type="button"
              onClick={() => {
                void onRequestChanges(message);
                setMessage("");
                setMode("idle");
              }}
              disabled={message.trim().length < 10}
              style={{
                ...approveButtonStyle,
                opacity: message.trim().length < 10 ? 0.5 : 1,
                cursor: message.trim().length < 10 ? "not-allowed" : "pointer",
              }}
            >
              {t.requestSend}
            </button>
            <button
              type="button"
              onClick={() => {
                setMessage("");
                setMode("idle");
              }}
              style={secondaryButtonStyle}
            >
              {t.requestCancel}
            </button>
          </div>
        </div>
      )}

      {mode === "confirmStop" && (
        <div style={stopConfirmStyle} role="alertdialog">
          <strong style={{ color: "var(--c-red)" }}>{t.stopConfirm}</strong>
          <div style={requestActionsStyle}>
            <button
              type="button"
              onClick={() => onStop()}
              style={{
                ...stopButtonStyle,
                backgroundColor: "var(--c-red)",
                color: "var(--c-white)",
                border: 0,
              }}
            >
              {t.stop}
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              style={secondaryButtonStyle}
            >
              {t.requestCancel}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ============================================================================
// Styles
// ============================================================================

const rootStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 14,
  color: "var(--c-ink)",
  backgroundColor: "var(--c-surface)",
  border: "1px solid var(--c-gold)",
  borderRadius: "var(--r-md)",
  padding: "var(--sp-4) var(--sp-6)",
  marginTop: "var(--sp-3)",
  marginBottom: "var(--sp-3)",
};

const headerStyle: React.CSSProperties = {
  marginBottom: "var(--sp-3)",
};

const kickerStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  color: "var(--c-gold)",
};

const titleStyle: React.CSSProperties = {
  marginTop: "var(--sp-1)",
  fontFamily: "var(--font-display)",
  fontSize: 18,
  lineHeight: 1.3,
  fontWeight: 600,
};

const mIdStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 14,
  backgroundColor: "var(--c-vellum)",
  padding: "2px 8px",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-sm)",
};

const metaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "var(--sp-3) var(--sp-6)",
  margin: 0,
  paddingTop: "var(--sp-3)",
  borderTop: "1px solid var(--c-border)",
};

const dtStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--c-gray)",
};

const ddStyle: React.CSSProperties = {
  marginTop: 2,
  marginLeft: 0,
  fontSize: 14,
  color: "var(--c-ink)",
};

const dotStyle: React.CSSProperties = {
  display: "inline-block",
  width: 10,
  height: 10,
  borderRadius: "50%",
  marginRight: 6,
  verticalAlign: "middle",
};

const riskIdsStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--c-steel)",
};

const reviewerBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  padding: "2px 8px",
  borderRadius: "var(--r-pill)",
};

const findingsListStyle: React.CSSProperties = {
  margin: "var(--sp-3) 0 0",
  padding: 0,
  listStyle: "none",
  borderTop: "1px solid var(--c-border)",
};

const findingItemStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto auto 1fr auto",
  gap: "var(--sp-2)",
  alignItems: "center",
  padding: "var(--sp-2) 0",
  borderBottom: "1px solid var(--c-border)",
  fontSize: 13,
};

const severityStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  padding: "2px 6px",
  borderRadius: "var(--r-sm)",
};

const findingRuleStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--c-navy)",
};

const findingMsgStyle: React.CSSProperties = {
  color: "var(--c-steel)",
};

const findingLocStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--c-gray)",
};

const actionsRowStyle: React.CSSProperties = {
  marginTop: "var(--sp-4)",
  display: "flex",
  gap: "var(--sp-2)",
  flexWrap: "wrap",
  alignItems: "center",
};

const approveButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  minHeight: 44,
  padding: "0 var(--sp-4)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: 14,
  letterSpacing: "0.02em",
  backgroundColor: "var(--c-gold)",
  color: "var(--c-navy-dark)",
  border: 0,
  borderRadius: "var(--r-md)",
  cursor: "pointer",
};

const shortcutStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 600,
  padding: "2px 6px",
  backgroundColor: "rgba(11, 20, 62, 0.12)",
  borderRadius: "var(--r-sm)",
};

const secondaryButtonStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "0 var(--sp-4)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: 14,
  backgroundColor: "transparent",
  color: "var(--c-navy)",
  border: "1px solid var(--c-navy)",
  borderRadius: "var(--r-md)",
  cursor: "pointer",
};

const stopButtonStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "0 var(--sp-4)",
  fontFamily: "var(--font-body)",
  fontWeight: 600,
  fontSize: 14,
  backgroundColor: "transparent",
  color: "var(--c-red)",
  border: "1px solid transparent",
  borderRadius: "var(--r-md)",
  cursor: "pointer",
};

const requestEditorStyle: React.CSSProperties = {
  marginTop: "var(--sp-4)",
  display: "grid",
  gap: "var(--sp-2)",
};

const requestLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--c-steel)",
};

const textareaStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 14,
  lineHeight: 1.5,
  padding: "var(--sp-2)",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-md)",
  resize: "vertical",
  color: "var(--c-ink)",
  backgroundColor: "var(--c-vellum)",
};

const requestActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--sp-2)",
  alignItems: "center",
};

const stopConfirmStyle: React.CSSProperties = {
  marginTop: "var(--sp-4)",
  display: "grid",
  gap: "var(--sp-2)",
  padding: "var(--sp-3)",
  border: "1px solid var(--c-red)",
  borderRadius: "var(--r-md)",
  backgroundColor: "rgba(195, 66, 63, 0.04)",
};
