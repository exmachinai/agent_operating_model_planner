/**
 * Entscheidbare Plan-Visualisierungen (Schritt 6, WP-3).
 *
 * Spec: docs/01_zgpm-method.md + docs/09_process-flow.md (Schritt 6). Macht den
 * Plan auf einen Blick beurteilbar — statt flacher Tabellen:
 *  - Gantt: Zeitachse aus planned_date + Aktivitäts-Fenstern, Ampel-Balken, KW-Raster.
 *  - RACI/PVM-Matrix: Rolle × Meilenstein mit Inline-Konsistenzprüfung (≥1 A, genau 1 F/L).
 *  - Risk-Heatmap: 5×5 P×A-Raster mit Ampel-Zonen und Scoring-Erklärung.
 *  - Token-Live-Zähler: laufende Summe je Agent gegen Richtwert mit Warnschwelle.
 *
 * Bewusst SVG/Box-Layout, keine Drittanbieter-Bibliothek. Formulierungen
 * „nachweisbar / audit-ready", keine 100%-Claims (Constitution).
 */

"use client";

import * as React from "react";
import type { Plan, PVMCode, Risk, RiskAmpel } from "../lib/api";

const AMPEL_COLOR: Record<RiskAmpel, string> = {
  rot: "var(--c-red)",
  gelb: "var(--c-amber)",
  gruen: "var(--c-green)",
};

/** Risk-Matrix-Score (Eintritt × Auswirkung) → Ampel. Spiegelt das Backend. */
function ampelForScore(score: number): RiskAmpel {
  if (score >= 15) return "rot";
  if (score >= 8) return "gelb";
  return "gruen";
}

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ---------------------------------------------------------------------------
// Gantt
// ---------------------------------------------------------------------------

export function GanttChart({ plan }: { plan: Plan }): React.ReactElement {
  const rows = plan.milestones.map((m) => {
    const starts = m.activities.map((a) => new Date(a.start).getTime());
    const ends = m.activities.map((a) => new Date(a.end).getTime());
    const planned = new Date(m.planned_date).getTime();
    const start = starts.length ? Math.min(...starts) : planned - 14 * 86400000;
    const end = Math.max(planned, ...(ends.length ? ends : [planned]));
    return { m, start, end };
  });
  if (rows.length === 0) return <p style={mutedStyle}>Keine Meilensteine.</p>;

  const min = Math.min(...rows.map((r) => r.start));
  const max = Math.max(...rows.map((r) => r.end));
  const span = Math.max(max - min, 86400000);
  const pct = (t: number) => ((t - min) / span) * 100;

  // KW-Marker alle ~14 Tage.
  const ticks: { left: number; label: string }[] = [];
  for (let t = min; t <= max; t += 14 * 86400000) {
    ticks.push({ left: pct(t), label: "KW " + isoWeek(new Date(t)) });
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ position: "relative", minWidth: 520 }}>
        {/* KW-Raster */}
        <div style={{ position: "relative", height: 18, marginLeft: GANTT_LABEL_W }}>
          {ticks.map((tk, i) => (
            <div key={i} style={{ ...tickStyle, left: `${tk.left}%` }}>
              {tk.label}
            </div>
          ))}
        </div>
        {rows.map(({ m, start, end }) => (
          <div key={m.id} style={ganttRowStyle}>
            <div style={ganttLabelStyle} title={m.name}>
              {m.id} · {m.name}
            </div>
            <div style={ganttTrackStyle}>
              {ticks.map((tk, i) => (
                <div key={i} style={{ ...gridLineStyle, left: `${tk.left}%` }} />
              ))}
              <div
                style={{
                  ...ganttBarStyle,
                  left: `${pct(start)}%`,
                  width: `${Math.max(pct(end) - pct(start), 1.5)}%`,
                  backgroundColor: AMPEL_COLOR[m.ampel],
                }}
                title={`${m.name} · fällig ${new Date(m.planned_date).toLocaleDateString("de-DE")}`}
              />
            </div>
          </div>
        ))}
      </div>
      <p style={legendStyle}>
        Balken = Bearbeitungsfenster bis Meilenstein-Termin · Farbe = Risiko-Ampel.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RACI / PVM-Matrix
// ---------------------------------------------------------------------------

const PVM_TITLE: Record<PVMCode, string> = {
  A: "führt aus",
  B: "wird beteiligt",
  E: "entscheidet",
  e: "entscheidet mit",
  F: "steuert Fortschritt",
  L: "leitet & steuert",
  I: "wird informiert",
  V: "ist verfügbar",
};

export function RaciMatrix({ plan }: { plan: Plan }): React.ReactElement {
  const roles = plan.pvm_roles;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={matrixStyle}>
        <thead>
          <tr>
            <th style={{ ...matrixThStyle, textAlign: "left" }}>Meilenstein</th>
            {roles.map((r) => (
              <th key={r} style={matrixThStyle} title={r}>
                {r}
              </th>
            ))}
            <th style={matrixThStyle}>Regel</th>
          </tr>
        </thead>
        <tbody>
          {plan.milestones.map((m) => {
            const byRole = new Map(m.responsibilities.map((x) => [x.role, x.code]));
            const codes = m.responsibilities.map((x) => x.code);
            const aOk = codes.filter((c) => c === "A").length >= 1;
            const flOk = codes.filter((c) => c === "F" || c === "L").length === 1;
            // ZGPM-Regel (docs/01): "e" (entscheidet mit) nie ohne "E" (entscheidet).
            const eOk = !codes.includes("e") || codes.includes("E");
            const ok = aOk && flOk && eOk;
            return (
              <tr key={m.id}>
                <td style={{ ...matrixTdStyle, textAlign: "left", whiteSpace: "nowrap" }}>
                  {m.id}
                </td>
                {roles.map((role) => {
                  const code = byRole.get(role);
                  return (
                    <td key={role} style={matrixTdStyle}>
                      {code ? (
                        <span style={pvmCellStyle} title={PVM_TITLE[code]}>
                          {code}
                        </span>
                      ) : (
                        <span style={{ color: "var(--c-ice)" }}>·</span>
                      )}
                    </td>
                  );
                })}
                <td
                  style={matrixTdStyle}
                  title={
                    ok
                      ? "≥1 A · genau ein F/L · 'e' nie ohne 'E'"
                      : `${aOk ? "" : "kein A. "}${flOk ? "" : "F/L nicht genau 1. "}${eOk ? "" : "'e' ohne 'E'."}`
                  }
                >
                  {ok ? (
                    <span style={{ color: "var(--c-green)" }}>✓</span>
                  ) : (
                    <span style={{ color: "var(--c-amber)" }}>⚠</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p style={legendStyle}>
        Konsistenzregeln (docs/01): pro Meilenstein mindestens ein <strong>A</strong>,
        genau ein <strong>F/L</strong>, „e“ nie ohne „E“. ⚠ markiert eine Abweichung.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk-Heatmap
// ---------------------------------------------------------------------------

export function RiskHeatmap({ plan }: { plan: Plan }): React.ReactElement {
  const risks: Risk[] = [...plan.prl, ...plan.milestones.flatMap((m) => m.mrl)];
  // Gruppiere Risiken je Zelle (impact=x 1..5, probability=y 5..1).
  const cell = (p: number, a: number) =>
    risks.filter((r) => r.probability === p && r.impact === a);

  return (
    <div>
      <div style={{ display: "flex", gap: "var(--sp-2)" }}>
        <div style={yAxisLabelStyle}>Eintritt →</div>
        <table style={heatStyle}>
          <tbody>
            {[5, 4, 3, 2, 1].map((p) => (
              <tr key={p}>
                <td style={heatAxisStyle}>{p}</td>
                {[1, 2, 3, 4, 5].map((a) => {
                  const here = cell(p, a);
                  const amp = ampelForScore(p * a);
                  return (
                    <td
                      key={a}
                      style={{
                        ...heatCellStyle,
                        backgroundColor: heatBg(amp),
                      }}
                      title={`Eintritt ${p} × Auswirkung ${a} = ${p * a} → ${amp === "gruen" ? "grün" : amp}`}
                    >
                      {here.map((r) => (
                        <span
                          key={r.id}
                          style={{ ...riskDotStyle, backgroundColor: AMPEL_COLOR[amp] }}
                          title={`${r.id}: ${r.description} (${p}×${a}=${p * a})`}
                        >
                          {r.id}
                        </span>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td style={heatAxisStyle} />
              {[1, 2, 3, 4, 5].map((a) => (
                <td key={a} style={heatAxisStyle}>
                  {a}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ ...legendStyle, marginLeft: 28 }}>
        Auswirkung → · Score = Eintritt × Auswirkung. Zonen: grün &lt; 8 ≤ gelb &lt; 15 ≤ rot.
        Hover erklärt jede Zelle und jedes Risiko (transparentes Scoring).
      </div>
    </div>
  );
}

function heatBg(amp: RiskAmpel): string {
  if (amp === "rot") return "rgba(195, 66, 63, 0.16)";
  if (amp === "gelb") return "rgba(214, 158, 46, 0.16)";
  return "rgba(56, 142, 60, 0.12)";
}

// ---------------------------------------------------------------------------
// Auslastung je Agent (Summe Aufwand PT)
// ---------------------------------------------------------------------------

export function UtilizationBars({ plan }: { plan: Plan }): React.ReactElement {
  // Aufwand wird der ausführenden Rolle (PVM-Code "A") je Aktivität zugerechnet;
  // hat eine Aktivität kein "A", fällt der Aufwand auf die erste Verantwortliche.
  const byRole = new Map<string, number>();
  for (const r of plan.pvm_roles) byRole.set(r, 0);
  for (const m of plan.milestones) {
    for (const a of m.activities) {
      const doer =
        a.responsibilities.find((x) => x.code === "A")?.role ??
        a.responsibilities[0]?.role;
      if (!doer) continue;
      byRole.set(doer, (byRole.get(doer) ?? 0) + a.effort_pt);
    }
  }
  const rows = [...byRole.entries()]
    .filter(([, pt]) => pt > 0)
    .sort((x, y) => y[1] - x[1]);
  const max = Math.max(1, ...rows.map(([, pt]) => pt));
  const total = rows.reduce((s, [, pt]) => s + pt, 0);

  if (rows.length === 0) return <p style={mutedStyle}>Keine Aufwände zugeordnet.</p>;

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
        {rows.map(([role, pt]) => (
          <div key={role} style={tokenRowStyle}>
            <span style={tokenLabelStyle}>{role}</span>
            <span style={tokenBarOuter}>
              <span
                style={{
                  ...tokenBarInner,
                  width: `${(pt / max) * 100}%`,
                  backgroundColor: "var(--c-navy)",
                }}
              />
            </span>
            <span style={tokenNumStyle}>{pt} PT</span>
            <span style={{ ...tokenNumStyle, color: "var(--c-text-muted)" }}>
              {Math.round((pt / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
      <p style={legendStyle}>
        Aufwand je ausführender Rolle (PVM-Code „A“). Summe {total} PT über{" "}
        {rows.length} Agenten — zeigt Engpässe auf einen Blick.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Token-Live-Zähler
// ---------------------------------------------------------------------------

export function TokenLiveCounter({
  plan,
  budget = 60000,
  warnPct = 0.8,
}: {
  plan: Plan;
  budget?: number;
  warnPct?: number;
}): React.ReactElement {
  const total = plan.token_budget.reduce((s, t) => s + t.tokens_estimated, 0);
  const max = Math.max(total, budget);
  const warnAt = budget * warnPct;

  let running = 0;
  const over = total > budget;
  const nearWarn = total > warnAt;

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
        {plan.token_budget.map((t) => {
          running += t.tokens_estimated;
          const crossed = running > warnAt;
          return (
            <div key={t.agent} style={tokenRowStyle}>
              <span style={tokenLabelStyle}>
                {t.agent} <span style={mutedStyle}>· {t.node}</span>
              </span>
              <span style={tokenBarOuter}>
                <span
                  style={{
                    ...tokenBarInner,
                    width: `${(t.tokens_estimated / max) * 100}%`,
                    backgroundColor: crossed ? "var(--c-amber)" : "var(--c-navy)",
                  }}
                />
              </span>
              <span style={tokenNumStyle}>{t.tokens_estimated.toLocaleString("de-DE")}</span>
              <span style={{ ...tokenNumStyle, color: "var(--c-text-muted)" }}>
                Σ {running.toLocaleString("de-DE")}
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          ...tokenSummaryStyle,
          color: over ? "var(--c-red)" : nearWarn ? "var(--c-amber)" : "var(--c-green)",
          borderColor: over ? "var(--c-red)" : nearWarn ? "var(--c-amber)" : "var(--c-green)",
        }}
      >
        Summe {total.toLocaleString("de-DE")} / Richtwert {budget.toLocaleString("de-DE")}{" "}
        Token ({Math.round((total / budget) * 100)}%).{" "}
        {over
          ? "Über Richtwert — HITL-PM-Freigabe vor dem Lauf empfohlen (audit-ready dokumentieren)."
          : nearWarn
            ? "Nahe der Warnschwelle (80%) — im Blick behalten."
            : "Im Rahmen des Richtwerts."}
      </div>
    </div>
  );
}

// --- Styles ----------------------------------------------------------------

const GANTT_LABEL_W = 200;
const mutedStyle: React.CSSProperties = { color: "var(--c-text-muted)" };
const legendStyle: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  color: "var(--c-text-muted)",
  marginTop: "var(--sp-2)",
  lineHeight: 1.5,
};
const tickStyle: React.CSSProperties = {
  position: "absolute",
  fontSize: 10,
  color: "var(--c-steel)",
  transform: "translateX(-50%)",
  whiteSpace: "nowrap",
};
const ganttRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  height: 30,
};
const ganttLabelStyle: React.CSSProperties = {
  width: GANTT_LABEL_W,
  flexShrink: 0,
  fontSize: 13,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const ganttTrackStyle: React.CSSProperties = {
  position: "relative",
  flex: 1,
  height: 18,
  backgroundColor: "var(--c-vellum)",
  borderRadius: "var(--r-sm)",
};
const gridLineStyle: React.CSSProperties = {
  position: "absolute",
  top: 0,
  bottom: 0,
  width: 1,
  backgroundColor: "var(--c-border)",
};
const ganttBarStyle: React.CSSProperties = {
  position: "absolute",
  top: 3,
  height: 12,
  borderRadius: "var(--r-pill)",
  minWidth: 4,
};
const matrixStyle: React.CSSProperties = {
  borderCollapse: "collapse",
  fontSize: 13,
  width: "100%",
};
const matrixThStyle: React.CSSProperties = {
  padding: "var(--sp-1) var(--sp-2)",
  borderBottom: "1px solid var(--c-border)",
  color: "var(--c-text-muted)",
  fontWeight: 600,
  fontSize: 11,
  textAlign: "center",
  verticalAlign: "bottom",
};
const matrixTdStyle: React.CSSProperties = {
  padding: "var(--sp-1) var(--sp-2)",
  borderBottom: "1px solid var(--c-border)",
  textAlign: "center",
};
const pvmCellStyle: React.CSSProperties = {
  display: "inline-block",
  minWidth: 20,
  fontWeight: 700,
  color: "var(--c-navy)",
  cursor: "help",
};
const heatStyle: React.CSSProperties = {
  borderCollapse: "collapse",
};
const heatAxisStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--c-steel)",
  textAlign: "center",
  padding: 2,
  width: 28,
  height: 20,
};
const heatCellStyle: React.CSSProperties = {
  width: 64,
  height: 56,
  border: "1px solid var(--c-border)",
  verticalAlign: "top",
  padding: 2,
};
const yAxisLabelStyle: React.CSSProperties = {
  writingMode: "vertical-rl",
  transform: "rotate(180deg)",
  fontSize: 11,
  color: "var(--c-steel)",
  textAlign: "center",
};
const riskDotStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: 9,
  fontWeight: 700,
  color: "var(--c-vellum)",
  borderRadius: "var(--r-sm)",
  padding: "0 3px",
  margin: 1,
};
const tokenRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1.4fr 2fr auto auto",
  gap: "var(--sp-2)",
  alignItems: "center",
  fontSize: 13,
};
const tokenLabelStyle: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const tokenBarOuter: React.CSSProperties = {
  display: "inline-block",
  width: "100%",
  height: 8,
  backgroundColor: "var(--c-ice)",
  borderRadius: "var(--r-pill)",
  overflow: "hidden",
};
const tokenBarInner: React.CSSProperties = {
  display: "block",
  height: "100%",
};
const tokenNumStyle: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  textAlign: "right",
  whiteSpace: "nowrap",
};
const tokenSummaryStyle: React.CSSProperties = {
  marginTop: "var(--sp-3)",
  padding: "var(--sp-2) var(--sp-3)",
  border: "1px solid",
  borderRadius: "var(--r-md)",
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.5,
};
