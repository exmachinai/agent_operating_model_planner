/**
 * Schritt 6 — Der ZGPM-Plan entsteht (PLANEN).
 *
 * Spec: docs/09_process-flow.md (Schritt 6). Der Orchestrator-Worker-Lauf
 * erzeugt einen ZGPM-konformen Plan (Meilensteine als Zustände, PVM, Risk-Matrix,
 * Token-Budget); der Reviewer prüft gegen die Methodenregeln. Voraussetzung:
 * Gate 1 + quittierte Leitplanken (Schritt 5). Output ist AI-generiert (Art. 50).
 */

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { PageShell } from "../../../../components/PageShell";
import { Button, cardStyle } from "../../../../components/ui";
import {
  GanttChart,
  RaciMatrix,
  RiskHeatmap,
  TokenLiveCounter,
  UtilizationBars,
} from "../../../../components/PlanViews";
import {
  api,
  ApiError,
  type Plan,
  type PVMCode,
  type RiskAmpel,
  type ReviewerStatus,
} from "../../../../lib/api";

const AMPEL_COLOR: Record<RiskAmpel, string> = {
  rot: "var(--c-red)",
  gelb: "var(--c-amber)",
  gruen: "var(--c-green)",
};
const AMPEL_LABEL: Record<RiskAmpel, string> = {
  rot: "Rot",
  gelb: "Gelb",
  gruen: "Grün",
};

const REVIEWER_COLOR: Record<ReviewerStatus, string> = {
  PASS: "var(--c-green)",
  NEEDS_REVISION: "var(--c-amber)",
  HARD_FAIL: "var(--c-red)",
};

const PVM_LABEL: Record<PVMCode, string> = {
  A: "führt aus",
  B: "wird beteiligt",
  E: "entscheidet",
  e: "entscheidet mit",
  F: "steuert Fortschritt",
  L: "leitet & steuert",
  I: "wird informiert",
  V: "ist verfügbar",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function PlanPage(): React.ReactElement {
  const router = useRouter();
  const id = useParams<{ id: string }>().id;

  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api
      .getPlan(id)
      .then(setPlan)
      .catch((e: unknown) => {
        // 404 = noch kein Plan erzeugt; kein Fehler, sondern Startzustand.
        if (e instanceof ApiError && e.status === 404) return;
        setError(e instanceof ApiError ? e.message : "Plan nicht ladbar.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function generate(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      setPlan(await api.generatePlan(id));
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Plan-Erzeugung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <PageShell subtitle="ZGPM-Plan · Schritt 6" helpTopic="plan">
        {error ? <p style={errorStyle}>{error}</p> : <p>Lade…</p>}
      </PageShell>
    );
  }

  if (plan === null) {
    return (
      <PageShell subtitle="ZGPM-Plan · Schritt 6" helpTopic="plan">
        <h1 style={{ marginBottom: "var(--sp-2)" }}>ZGPM-Plan</h1>
        <p style={leadStyle}>
          Aus dem freigegebenen Verständnis bauen die Agenten einen vollständigen,
          methodischen Plan: Meilensteine, Risk-Matrix, Verantwortlichkeiten (PVM)
          und Token-Budget. Der Reviewer prüft gegen die ZGPM-Regeln.
        </p>
        {error ? <p style={errorStyle}>{error}</p> : null}
        <div style={actionsStyle}>
          <Button variant="secondary" onClick={() => router.push("/")}>
            Zur Übersicht
          </Button>
          <Button variant="accent" onClick={generate} disabled={busy}>
            {busy ? "Plan wird erzeugt…" : "Plan generieren"}
          </Button>
        </div>
      </PageShell>
    );
  }

  const totalTokens = plan.token_budget.reduce(
    (sum, t) => sum + t.tokens_estimated,
    0,
  );
  const totalEffort = plan.milestones
    .flatMap((m) => m.activities)
    .reduce((sum, a) => sum + a.effort_pt, 0);

  return (
    <PageShell subtitle="ZGPM-Plan · Schritt 6" helpTopic="plan">
      <div style={headerRowStyle}>
        <h1 style={{ margin: 0 }}>ZGPM-Plan · v{plan.version}</h1>
        <span
          style={{
            ...pillStyle,
            color: REVIEWER_COLOR[plan.reviewer_status],
            borderColor: REVIEWER_COLOR[plan.reviewer_status],
          }}
        >
          Reviewer: {plan.reviewer_status} · {plan.reviewer_rounds} Runde(n)
        </span>
        <span
          style={{
            ...pillStyle,
            color: AMPEL_COLOR[plan.overall_ampel],
            borderColor: AMPEL_COLOR[plan.overall_ampel],
          }}
        >
          Gesamtrisiko: {AMPEL_LABEL[plan.overall_ampel]}
        </span>
      </div>
      <p style={leadStyle}>
        Generiert am {fmtDate(plan.planausgabedatum)} · kontrolliert durch{" "}
        {plan.kontrolliert_durch}. AI-generierter Vorschlag (EU AI Act Art. 50) —
        die Freigabe trifft der Anwender (Gate 2, Schritt 7).
      </p>

      {plan.reviewer_findings.length > 0 ? (
        <div style={{ ...cardStyle, marginBottom: "var(--sp-4)" }}>
          <div style={sectionLabel}>Reviewer-Befunde</div>
          <ul style={plainListStyle}>
            {plan.reviewer_findings.map((f, i) => (
              <li key={i} style={{ fontSize: 14 }}>
                <span
                  style={{
                    ...tagStyle,
                    color:
                      f.severity === "fail"
                        ? "var(--c-red)"
                        : f.severity === "warn"
                          ? "var(--c-amber)"
                          : "var(--c-green)",
                    borderColor:
                      f.severity === "fail"
                        ? "var(--c-red)"
                        : f.severity === "warn"
                          ? "var(--c-amber)"
                          : "var(--c-green)",
                  }}
                >
                  {f.severity}
                </span>
                <code style={ruleStyle}>{f.rule}</code> — {f.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Meilensteinplan */}
      <div style={sectionLabel}>Meilensteinplan ({plan.milestones.length})</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", marginBottom: "var(--sp-6)" }}>
        {plan.milestones.map((m) => (
          <div key={m.id} style={cardStyle}>
            <div style={msHeaderStyle}>
              <span
                style={{ ...dotStyle, backgroundColor: AMPEL_COLOR[m.ampel] }}
                title={`Risiko: ${AMPEL_LABEL[m.ampel]}`}
              />
              <strong style={{ flex: 1 }}>
                {m.id} · {m.name}
              </strong>
              <span style={metaStyle}>
                {m.stream_code} · fällig {fmtDate(m.planned_date)}
              </span>
            </div>
            {m.predecessors.length > 0 ? (
              <div style={subMetaStyle}>Vorgänger: {m.predecessors.join(", ")}</div>
            ) : null}

            <div style={pvmRowStyle}>
              {m.responsibilities.map((r) => (
                <span key={r.role} style={pvmChipStyle} title={PVM_LABEL[r.code]}>
                  <strong>{r.code}</strong> {r.role}
                </span>
              ))}
            </div>

            <ul style={activityListStyle}>
              {m.activities.map((a) => (
                <li key={a.id} style={{ fontSize: 14 }}>
                  {a.description}{" "}
                  <span style={metaStyle}>({a.effort_pt} PT)</span>
                </li>
              ))}
            </ul>

            {m.mrl.map((r) => (
              <div key={r.id} style={mrlStyle}>
                <span
                  style={{ ...dotSmStyle, backgroundColor: AMPEL_COLOR[r.ampel] }}
                />
                MRL {r.id}: {r.description}{" "}
                <span style={metaStyle}>
                  (E{r.probability}×A{r.impact}) — {r.mitigation}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Gantt — Zeitachse */}
      <div style={sectionLabel}>Zeitplan (Gantt)</div>
      <div style={{ ...cardStyle, marginBottom: "var(--sp-6)" }}>
        <GanttChart plan={plan} />
      </div>

      {/* RACI / PVM-Matrix */}
      <div style={sectionLabel}>Verantwortlichkeiten (PVM-Matrix)</div>
      <div style={{ ...cardStyle, marginBottom: "var(--sp-6)" }}>
        <RaciMatrix plan={plan} />
      </div>

      <div style={twoColStyle}>
        {/* Risk-Heatmap (PRL + MRL) */}
        <div style={cardStyle}>
          <div style={sectionLabel}>Risiko-Heatmap (P×A)</div>
          <RiskHeatmap plan={plan} />
        </div>

        {/* Token-Live-Zähler */}
        <div style={cardStyle}>
          <div style={sectionLabel}>Token-Budget je Agent (laufende Summe)</div>
          <TokenLiveCounter plan={plan} />
          <div style={subMetaStyle}>
            Geschätzter Gesamtaufwand: {totalEffort} Personentage ·{" "}
            {totalTokens.toLocaleString("de-DE")} Token gesamt.
          </div>
        </div>
      </div>

      {/* Auslastung je Agent */}
      <div style={sectionLabel}>Auslastung je Agent (Aufwand PT)</div>
      <div style={{ ...cardStyle, marginBottom: "var(--sp-4)" }}>
        <UtilizationBars plan={plan} />
      </div>

      {plan.evidence_sources.length > 0 ? (
        <div style={{ ...cardStyle, marginBottom: "var(--sp-4)" }}>
          <div style={sectionLabel}>
            Quellen-Nachweis ({plan.evidence_sources.length})
          </div>
          <p style={subMetaStyle}>
            In die Schärfung eingeflossen, bei Gate 1 eingefroren. Nur Nachweis
            (Name + Hash) — der Inhalt wurde ephemer verarbeitet und verworfen.
          </p>
          <ul style={plainListStyle}>
            {plan.evidence_sources.map((s) => (
              <li key={s.id} style={evItemStyle}>
                <span style={tagStyle}>{s.fmt}</span>
                <strong>{s.filename}</strong>
                <span style={metaStyle}> · {s.origin}</span>
                <code style={ruleStyle}>
                  {" "}
                  {s.content_sha256.slice(0, 12)}…
                </code>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p style={errorStyle}>{error}</p> : null}

      <div style={actionsStyle}>
        <Button variant="secondary" onClick={() => router.push("/")}>
          Zur Übersicht
        </Button>
        <Button variant="secondary" onClick={generate} disabled={busy}>
          {busy ? "…" : "Neu generieren (v" + (plan.version + 1) + ")"}
        </Button>
        <Button
          variant="accent"
          onClick={() => router.push(`/projects/${id}/review`)}
        >
          Review & Freigabe (Gate 2)
        </Button>
      </div>
    </PageShell>
  );
}

const leadStyle: React.CSSProperties = {
  color: "var(--c-text-muted)",
  marginBottom: "var(--sp-6)",
  marginTop: "var(--sp-2)",
  lineHeight: 1.6,
};

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  flexWrap: "wrap",
};

const pillStyle: React.CSSProperties = {
  padding: "2px var(--sp-2)",
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
  border: "1px solid",
  borderRadius: "var(--r-pill)",
  whiteSpace: "nowrap",
};

const sectionLabel: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--c-text-muted)",
  marginBottom: "var(--sp-2)",
};

const msHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
};

const dotStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  flexShrink: 0,
};

const dotSmStyle: React.CSSProperties = {
  display: "inline-block",
  width: 9,
  height: 9,
  borderRadius: "50%",
};

const metaStyle: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  color: "var(--c-text-muted)",
};

const subMetaStyle: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  color: "var(--c-text-muted)",
  marginTop: "var(--sp-2)",
};

const pvmRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--sp-1)",
  marginTop: "var(--sp-2)",
};

const pvmChipStyle: React.CSSProperties = {
  fontSize: 12,
  padding: "1px var(--sp-2)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-pill)",
  color: "var(--c-text)",
  cursor: "help",
};

const activityListStyle: React.CSSProperties = {
  margin: "var(--sp-2) 0 0",
  paddingLeft: "var(--sp-4)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-1)",
};

const mrlStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  fontSize: 13,
  marginTop: "var(--sp-2)",
  color: "var(--c-text)",
};

const twoColStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "var(--sp-3)",
  marginBottom: "var(--sp-4)",
};

const plainListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-1)",
};

const tagStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0 var(--sp-1)",
  marginRight: "var(--sp-2)",
  fontSize: 11,
  fontWeight: 600,
  border: "1px solid",
  borderRadius: "var(--r-pill)",
};

const ruleStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--c-steel)",
};

const evItemStyle: React.CSSProperties = {
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-1)",
  flexWrap: "wrap",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--sp-2)",
};

const errorStyle: React.CSSProperties = {
  padding: "var(--sp-3) var(--sp-4)",
  backgroundColor: "rgba(195, 66, 63, 0.08)",
  border: "1px solid var(--c-red)",
  borderRadius: "var(--r-md)",
  color: "var(--c-red)",
  marginBottom: "var(--sp-4)",
};
