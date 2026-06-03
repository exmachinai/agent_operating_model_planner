/**
 * Entscheidbare Plan-Visualisierungen (Schritt 6, WP-3).
 *
 * Spec: docs/01_zgpm-method.md + docs/09_process-flow.md (Schritt 6). Macht den
 * Plan auf einen Blick beurteilbar — statt flacher Tabellen:
 *  - Gantt: Zeitachse aus Meilenstein-Terminen (v0.6 — ohne Aktivitäts-Fenster),
 *    Ampel-Balken, KW-Raster.
 *  - RACI/PVM-Matrix: Rolle × Meilenstein mit Inline-Konsistenzprüfung (≥1 A, genau 1 F/L).
 *  - Risk-Heatmap: 5×5 P×A-Raster mit Ampel-Zonen und Scoring-Erklärung.
 *  - Token-Live-Zähler: laufende Summe je Agent gegen Richtwert mit Warnschwelle
 *    (v0.6 — Kosten = Token je Agent, keine Personentage).
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
// Gantt — v0.6: Meilenstein-Termine (kein Aktivitäts-Fenster mehr)
// ---------------------------------------------------------------------------

export function GanttChart({ plan }: { plan: Plan }): React.ReactElement {
  // v0.6 — Bearbeitungsfenster aus den Meilenstein-Terminen ableiten: Start =
  // Termin des Vorgängers (sonst Termin − 14 Tage), Ende = eigener Termin.
  const plannedById = new Map(
    plan.milestones.map((m) => [m.id, new Date(m.planned_date).getTime()]),
  );
  const rows = plan.milestones.map((m) => {
    const planned = new Date(m.planned_date).getTime();
    const predDates = m.predecessors
      .map((id) => plannedById.get(id))
      .filter((t): t is number => typeof t === "number");
    const start = predDates.length
      ? Math.max(...predDates)
      : planned - 14 * 86400000;
    return { m, start: Math.min(start, planned), end: planned };
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
    <div className="aegira-scroll-x">
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

// PVM = interne ZGPM-Wahrheit. Code → (Kurz-Bedeutung).
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

// v0.9 (D2) — RACI ist der angezeigte/exportierte Standard; PVM bleibt die interne
// Rules-Engine-Wahrheit. Mapping (Entscheidung D1): A→R · L/F→A · E/e/B→C · I/V→I.
type RaciCode = "R" | "A" | "C" | "I";
const PVM_TO_RACI: Record<PVMCode, RaciCode> = {
  A: "R", L: "A", F: "A", E: "C", e: "C", B: "C", I: "I", V: "I",
};
const RACI_TITLE: Record<RaciCode, string> = {
  R: "Responsible — ausführend",
  A: "Accountable — rechenschaftspflichtig (genau einer)",
  C: "Consulted — beteiligt/Mitsprache",
  I: "Informed — wird informiert",
};
/** Konsistenzprüfung — Logik identisch, nur die Beschriftung wechselt (P1.9). */
function checkMilestone(codes: PVMCode[]): { ok: boolean; raci: string; pvm: string } {
  const aOk = codes.filter((c) => c === "A").length >= 1; // ≥1 Responsible
  const flOk = codes.filter((c) => c === "F" || c === "L").length === 1; // genau 1 Accountable
  const eOk = !codes.includes("e") || codes.includes("E"); // 'e' nie ohne 'E'
  const ok = aOk && flOk && eOk;
  const raci = ok
    ? "genau ein Accountable · ≥1 Responsible"
    : `${aOk ? "" : "kein Responsible. "}${flOk ? "" : "nicht genau ein Accountable. "}${eOk ? "" : "Mitentscheid ohne Entscheider."}`;
  const pvm = ok
    ? "≥1 A · genau ein F/L · 'e' nie ohne 'E'"
    : `${aOk ? "" : "kein A. "}${flOk ? "" : "F/L nicht genau 1. "}${eOk ? "" : "'e' ohne 'E'."}`;
  return { ok, raci, pvm };
}

export function RaciMatrix({ plan }: { plan: Plan }): React.ReactElement {
  const roles = plan.pvm_roles;
  // v0.9.x — nur noch RACI (Standard). PVM bleibt intern die Rules-Engine-Wahrheit,
  // wird aber nicht mehr als Anzeige-Option angeboten (auf RACI gemappt).
  const isRaci = true;

  return (
    <div>
      <span className="aegira-only-sm" style={{ ...legendStyle, display: "block" }} aria-hidden="true">
        ← horizontal wischen · Meilenstein-Spalte bleibt fixiert →
      </span>
      <div className="aegira-scroll-x">
        <table style={matrixStyle}>
          <thead>
            <tr>
              <th style={{ ...matrixThStyle, ...stickyColStyle, textAlign: "left" }}>Meilenstein</th>
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
              const { ok, raci, pvm } = checkMilestone(codes);
              return (
                <tr key={m.id}>
                  <td style={{ ...matrixTdStyle, ...stickyColStyle, textAlign: "left", whiteSpace: "nowrap" }}>
                    {m.id}
                  </td>
                  {roles.map((role) => {
                    const code = byRole.get(role);
                    const shown = code ? (isRaci ? PVM_TO_RACI[code] : code) : null;
                    const title = code
                      ? isRaci
                        ? `${RACI_TITLE[PVM_TO_RACI[code]]} (PVM ${code})`
                        : PVM_TITLE[code]
                      : undefined;
                    return (
                      <td key={role} style={matrixTdStyle}>
                        {shown ? (
                          <span style={pvmCellStyle} title={title}>
                            {shown}
                          </span>
                        ) : (
                          <span style={{ color: "var(--c-ice)" }}>·</span>
                        )}
                      </td>
                    );
                  })}
                  <td style={matrixTdStyle} title={isRaci ? raci : pvm}>
                    {ok ? (
                      <span style={{ color: "var(--c-green)" }} aria-label="konsistent">✓ ok</span>
                    ) : (
                      <span style={{ color: "var(--c-amber)" }} aria-label="Abweichung">⚠ prüfen</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sichtbare Code-Legende (P0.1) — als umbrechende Chips (mobil-tauglich, P1.10). */}
      <div style={legendChipsStyle} aria-label="Legende">
        {isRaci
          ? (["R", "A", "C", "I"] as RaciCode[]).map((c) => (
              <span key={c} style={legendChipStyle}>
                <strong>{c}</strong> {RACI_TITLE[c]}
              </span>
            ))
          : (Object.keys(PVM_TITLE) as PVMCode[]).map((c) => (
              <span key={c} style={legendChipStyle}>
                <strong>{c}</strong> {PVM_TITLE[c]}
              </span>
            ))}
      </div>
      <p style={legendStyle}>
        {isRaci ? (
          <>
            Konsistenz (auf RACI gemappt): pro Meilenstein <strong>genau ein Accountable</strong>{" "}
            und <strong>≥1 Responsible</strong>. ⚠ markiert eine Abweichung. RACI ist die
            Anzeige-/Audit-Sprache; intern prüft weiterhin die ZGPM-PVM-Rules-Engine
            (A→R · L/F→A · E/e/B→C · I/V→I).
          </>
        ) : (
          <>
            Konsistenzregeln (docs/01): pro Meilenstein mindestens ein <strong>A</strong>,
            genau ein <strong>F/L</strong>, „e“ nie ohne „E“. ⚠ markiert eine Abweichung.
          </>
        )}
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
    <div className="aegira-scroll-x">
      <div style={{ display: "flex", gap: "var(--sp-2)", minWidth: 360 }}>
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
// v0.9 — erste Spalte mobil fixiert, damit die Meilenstein-Spalte beim H-Scroll sichtbar bleibt.
const stickyColStyle: React.CSSProperties = {
  position: "sticky",
  left: 0,
  zIndex: 1,
  backgroundColor: "var(--c-surface)",
};
const legendChipsStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--sp-1)",
  marginTop: "var(--sp-2)",
};
const legendChipStyle: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  padding: "1px var(--sp-2)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-pill)",
  color: "var(--c-text-muted)",
  whiteSpace: "nowrap",
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
