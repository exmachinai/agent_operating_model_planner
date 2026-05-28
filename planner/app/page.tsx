/**
 * Demo-Page für die drei Pflicht-Komponenten.
 *
 * Lokal starten:
 *   cd planner && npm install && npm run dev
 *   → http://localhost:3000
 *
 * Drei Buttons oben:
 *   - "Live-Trace zeigen"           → blendet einen AgentTrace ein
 *   - "Approval-Prompt zeigen"      → blendet HitlApprovalPrompt ein
 *   - "Sitzung sperren (Demo)"      → setzt isLocked=true → LockScreen erscheint
 */

"use client";

import * as React from "react";

import { AgentTrace } from "../components/AgentTrace";
import { HitlApprovalPrompt } from "../components/HitlApprovalPrompt";
import { LockScreen } from "../components/LockScreen";

const DEMO_TRACE = {
  agentName: "pmo-agent",
  agentRole: "Lead / Orchestrator",
  pvmCode: "L" as const,
  iteration: 1,
  thinkingSummary:
    "Strukturiere den Auftrag in 4 Phasen nach MECE: Discovery, Design, Build, Hardening. Pro Phase 2–4 Meilensteine im Verb-Perfekt. Ergebnispfade P/S/O.",
  toolCalls: [
    {
      id: "tc_1",
      toolName: "skill:zgpm-compose",
      inputPreview: JSON.stringify(
        { auftrag: "AGP Launch DE", phasen_count: 4 },
        null,
        2,
      ),
      outputPreview:
        "{\n  \"phases\": 4,\n  \"meilensteine\": [\"M01\", \"M02\", \"M03\"],\n  \"ergebnispfade\": [\"P\", \"S\", \"O\"]\n}",
      durationMs: 1840,
    },
    {
      id: "tc_2",
      toolName: "github_create_milestone",
      inputPreview: '{ "title": "Persona-Validierung abgeschlossen" }',
      outputPreview: '{ "number": 1, "html_url": "https://…" }',
      durationMs: 420,
    },
  ],
  status: "completed" as const,
  tokensUsed: 12345,
  streaming: false,
  startedAt: new Date(),
};

const DEMO_APPROVAL = {
  milestoneId: "M02",
  milestoneTitle: "API-Architektur freigegeben",
  phaseName: "Design",
  risk: "gelb" as const,
  riskIds: ["R03", "R07"],
  activities: { done: 5, total: 5 },
  reviewer: {
    status: "PASS_WITH_NOTES" as const,
    findings: [
      {
        severity: "WARNING" as const,
        rule: "ZGPM-Pyramid",
        message: "Aufwand für A02 wirkt unterschätzt.",
        location: "plan/activities/M02.yaml::A02",
      },
    ],
  },
  effort: { planned: 5, actual: 4.5 },
};

export default function Demo(): React.ReactElement {
  const [showTrace, setShowTrace] = React.useState(false);
  const [showApproval, setShowApproval] = React.useState(false);
  const [isLocked, setIsLocked] = React.useState(false);

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div style={brandRowStyle}>
          <img src="/logos/aegira-signet-navy.svg" alt="" width={36} height={36} aria-hidden />
          <div>
            <div style={brandTextStyle}>AEGIRA</div>
            <div style={brandTaglineStyle}>Planner · Demo</div>
          </div>
        </div>
        <span style={{ color: "var(--c-steel)", fontSize: 13 }}>
          Phase-2 Spike — `app/page.tsx`
        </span>
      </header>

      <section style={controlsStyle}>
        <button onClick={() => setShowTrace((v) => !v)} style={btn(showTrace)}>
          {showTrace ? "AgentTrace verstecken" : "AgentTrace zeigen"}
        </button>
        <button onClick={() => setShowApproval((v) => !v)} style={btn(showApproval)}>
          {showApproval ? "Approval verstecken" : "Approval zeigen"}
        </button>
        <button onClick={() => setIsLocked(true)} style={btn(false, true)}>
          Sitzung sperren
        </button>
      </section>

      <section style={contentStyle}>
        {showTrace ? <AgentTrace {...DEMO_TRACE} /> : null}
        {showApproval ? (
          <HitlApprovalPrompt
            {...DEMO_APPROVAL}
            onApprove={() => {
              console.log("approved M02");
              setShowApproval(false);
            }}
            onRequestChanges={(m) => {
              console.log("requested changes:", m);
              setShowApproval(false);
            }}
            onStop={() => {
              console.log("stopped");
              setShowApproval(false);
            }}
          />
        ) : null}
        {!showTrace && !showApproval ? (
          <p style={emptyStyle}>
            Wähle eine Demo oben. Du bewegst dich in einer Spike-Umgebung — keine echte
            Multi-Agent-Session, kein realer Plan, kein Auth-Backend. Brand-Tokens, A11y-
            und Streaming-Verhalten lassen sich aber visuell prüfen.
          </p>
        ) : null}
      </section>

      <LockScreen
        isLocked={isLocked}
        userName="Michael Veil"
        userEmail="exmachinai.ai@gmail.com"
        lockedAt={new Date()}
        unlockStrategy="quick"
        onUnlockClick={() => setIsLocked(false)}
        onSignOutClick={() => {
          alert("Demo: würde abmelden.");
          setIsLocked(false);
        }}
        locale="de"
      />
    </main>
  );
}

// ============================================================================
// Styles
// ============================================================================

const pageStyle: React.CSSProperties = {
  maxWidth: 880,
  margin: "0 auto",
  padding: "var(--sp-8) var(--sp-4)",
  fontFamily: "var(--font-body)",
  color: "var(--c-text)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "var(--sp-8)",
};

const brandRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-3)",
};

const brandTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 20,
  letterSpacing: "0.08em",
  color: "var(--c-navy)",
};

const brandTaglineStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--c-gray)",
  marginTop: 2,
};

const controlsStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--sp-2)",
  flexWrap: "wrap",
  marginBottom: "var(--sp-6)",
  paddingBottom: "var(--sp-4)",
  borderBottom: "1px solid var(--c-border)",
};

function btn(active: boolean, accent = false): React.CSSProperties {
  return {
    minHeight: 36,
    padding: "0 var(--sp-3)",
    fontSize: 13,
    fontWeight: 600,
    backgroundColor: accent ? "var(--c-gold)" : active ? "var(--c-navy)" : "transparent",
    color: accent ? "var(--c-navy-dark)" : active ? "var(--c-vellum)" : "var(--c-navy)",
    border: accent ? 0 : "1px solid var(--c-navy)",
    borderRadius: "var(--r-md)",
    cursor: "pointer",
  };
}

const contentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-3)",
};

const emptyStyle: React.CSSProperties = {
  padding: "var(--sp-6)",
  border: "1px dashed var(--c-border-strong)",
  borderRadius: "var(--r-md)",
  color: "var(--c-steel)",
  fontSize: 14,
  lineHeight: 1.6,
};
