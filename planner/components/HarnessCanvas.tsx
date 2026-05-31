/**
 * Orchestrierungs-Canvas (v0.4, docs/11) — Weltklasse Drag&Drop.
 *
 * Stage-Lanes (Spalten): gleiche Stage = parallel (Sectioning), Spalten links→
 * rechts = sequenziell (Chaining). Agenten aus der Katalog-Palette in Stages
 * ziehen; bestehende Karten zwischen Stages ziehen → Layout-Revise. Detail-on-
 * Demand rechts. Dashboard-grade: KPI-Leiste, Karten-Farbsystem (Gestalt/visuelle
 * Variablen, Burch/Schmid), AEGIRA-Branding, viel Weißraum.
 */

"use client";

import * as React from "react";

import {
  api,
  ApiError,
  type CatalogAgent,
  type HarnessGraph,
  type HarnessNode,
  type HarnessNodeKind,
  type StagePattern,
} from "../lib/api";
import { Button, cardStyle } from "./ui";

const KIND_COLOR: Record<HarnessNodeKind, string> = {
  orchestrator: "var(--c-navy)",
  router: "var(--c-gold)",
  worker: "var(--c-steel)",
  evaluator: "var(--c-gold)",
  hitl: "var(--c-green)",
};
const KIND_LABEL: Record<HarnessNodeKind, string> = {
  orchestrator: "Orchestrator",
  router: "Router",
  worker: "Worker",
  evaluator: "Reviewer",
  hitl: "HITL ◆",
};
const PATTERN_LABEL: Record<StagePattern, string> = {
  chain: "Sequenziell",
  section: "Parallel",
  route: "Routing",
  vote: "Voting",
  "evaluator-optimizer": "Evaluator-Optimizer",
};
const RISK_COLOR: Record<string, string> = {
  low: "var(--c-green)",
  medium: "var(--c-amber)",
  high: "var(--c-red)",
};
const MODEL_LABEL = (m: string): string =>
  m.includes("opus") ? "Opus" : m.includes("sonnet") ? "Sonnet" : m.includes("haiku") ? "Haiku" : m === "human" ? "Mensch" : m;

// v0.4.2 — editierbare Modell-Tier-Zuordnung. „human" bleibt fix für HITL-Knoten.
const MODEL_OPTIONS: { id: string; label: string }[] = [
  { id: "claude-opus-4-8", label: "Opus" },
  { id: "claude-sonnet-4-6", label: "Sonnet" },
  { id: "claude-haiku-4-5", label: "Haiku" },
];

export function HarnessCanvas({
  id,
  graph,
  frozen,
  onChange,
}: {
  id: string;
  graph: HarnessGraph;
  frozen: boolean;
  onChange: () => Promise<void> | void;
}): React.ReactElement {
  const [catalog, setCatalog] = React.useState<CatalogAgent[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = React.useState<number | null>(null);

  React.useEffect(() => {
    api.getCatalog().then(setCatalog).catch(() => {});
  }, []);

  async function run(fn: () => Promise<unknown>, ok: string): Promise<void> {
    if (frozen) return;
    setBusy(true);
    setNote(null);
    try {
      await fn();
      await onChange();
      setNote(ok);
    } catch (e: unknown) {
      setNote(e instanceof ApiError ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  // Stages aus den Knoten ableiten (mind. Stage 0..3 anzeigen, plus eine leere).
  const nodesByStage = new Map<number, HarnessNode[]>();
  for (const n of graph.nodes) {
    const arr = nodesByStage.get(n.stage) ?? [];
    arr.push(n);
    nodesByStage.set(n.stage, arr);
  }
  const maxStage = Math.max(3, ...graph.nodes.map((n) => n.stage));
  const stages = Array.from({ length: maxStage + 2 }, (_, i) => i); // +1 leere Ziel-Stage

  // Aktuelle Stage-Map (agent_id → stage) für Layout-Revise.
  const currentStages = (): Record<string, number> => {
    const m: Record<string, number> = {};
    for (const n of graph.nodes) if (n.agent_id) m[n.agent_id] = n.stage;
    return m;
  };

  function patternOfStage(s: number): StagePattern | null {
    const ns = nodesByStage.get(s);
    return ns && ns.length ? ns[0].pattern : null;
  }

  // --- Agent aus Katalog in eine Stage einfügen (DnD am Desktop, Tippen auf Touch). ---
  function addCatalogToStage(catId: string, stage: number): void {
    const cat = catalog.find((c) => c.id === catId);
    if (!cat) return;
    void run(async () => {
      await api.reviseHarness(id, {
        command: "agent",
        op: "add",
        agent: {
          role: cat.label, name: cat.id, kind: cat.kind, mission: cat.mission,
          description: cat.description, responsibility: cat.responsibility,
          skills: cat.skills, tools: cat.tools.map((t) => t.name), model: cat.model,
          hitl: cat.kind === "hitl",
        },
      });
      const fresh = await api.getHarness(id);
      const added = fresh.agents.find((a) => a.name === cat.id);
      if (added) {
        const stagesMap = { ...currentStages() };
        for (const n of fresh.nodes) if (n.agent_id) stagesMap[n.agent_id] = n.stage;
        stagesMap[added.id] = stage;
        await api.reviseHarness(id, { command: "layout", stages: stagesMap });
      }
    }, `${cat.label} hinzugefügt ✓`);
  }

  // --- Drag&Drop (Desktop) ---
  function onDropToStage(e: React.DragEvent, stage: number): void {
    e.preventDefault();
    setDragOverStage(null);
    const agentId = e.dataTransfer.getData("agent_id");
    const catId = e.dataTransfer.getData("catalog_id");
    if (agentId) {
      const stagesMap = { ...currentStages(), [agentId]: stage };
      void run(() => api.reviseHarness(id, { command: "layout", stages: stagesMap }), "Verschoben ✓");
    } else if (catId) {
      addCatalogToStage(catId, stage);
    }
  }

  const findFail = graph.findings.filter((f) => f.severity === "fail").length;
  const sel = graph.agents.find((a) => a.id === selected) ?? null;
  const selCat = sel ? catalog.find((c) => c.id === sel.name) : null;

  // v0.4.2 — Modell-Tier eines Agenten ändern. Voller Spec wird zurückgesendet,
  // damit der Update-Op keine Tools/Skills/HITL-Flags verliert (Partial-Patch-Falle).
  function setModel(newModel: string): void {
    if (!sel) return;
    void run(
      () =>
        api.reviseHarness(id, {
          command: "agent",
          op: "update",
          agent_id: sel.id,
          agent: {
            role: sel.role, name: sel.name, kind: sel.kind, mission: sel.mission,
            description: sel.description ?? "", responsibility: sel.responsibility ?? "",
            tasks: sel.tasks, skills: sel.skills, tools: sel.tools,
            hitl: sel.hitl, model: newModel,
          },
        }),
      "Modell geändert ✓",
    );
  }

  // v0.4.3 — globale Modell-Strategie auf alle Agenten anwenden (ein Backend-Schritt).
  function setStrategy(strategy: "balanced" | "economy" | "premium"): void {
    void run(() => api.reviseHarness(id, { command: "model-strategy", strategy }), "Modell-Strategie angewandt ✓");
  }
  // Aktive Strategie aus den Modellen ableiten (für die Hervorhebung).
  const nonHitl = graph.agents.filter((a) => a.kind !== "hitl" && a.model !== "human");
  const allSonnet = nonHitl.length > 0 && nonHitl.every((a) => a.model.includes("sonnet"));
  const allOpus = nonHitl.length > 0 && nonHitl.every((a) => a.model.includes("opus"));
  const balanced = nonHitl.length > 0 && nonHitl.every((a) =>
    a.kind === "orchestrator" ? a.model.includes("opus") : a.model.includes("sonnet"));
  const activeStrategy = allSonnet ? "economy" : allOpus ? "premium" : balanced ? "balanced" : "custom";
  const STRATEGIES: { id: "balanced" | "economy" | "premium"; label: string; hint: string }[] = [
    { id: "balanced", label: "Ausgewogen", hint: "Opus-Orchestrator + Sonnet-Worker (Standard)" },
    { id: "economy", label: "Sparsam", hint: "alles Sonnet — günstigster Lauf" },
    { id: "premium", label: "Premium", hint: "alles Opus — höchste Qualität, teuerster Lauf" },
  ];

  // Palette nach Klasse gruppiert (vorhandene ausgrauen).
  const present = new Set(graph.agents.map((a) => a.name));

  return (
    <div style={{ marginBottom: "var(--sp-6)" }}>
      {/* KPI-Leiste */}
      <div style={kpiRow}>
        <Kpi label="Agenten" value={graph.agents.length} />
        <Kpi label="Stages" value={nodesByStage.size} />
        <Kpi label="HITL-Punkte" value={graph.hitl_points.length} color="var(--c-green)" />
        <Kpi label="Findings" value={graph.findings.length} color={findFail ? "var(--c-red)" : "var(--c-steel)"} />
        <Kpi label="Modus" valueText={graph.nodes.some((n) => n.kind === "router") ? "Handoff" : "Manager"} />
      </div>

      {/* v0.4.3 — Modus-Erklärung (war nicht selbsterklärend). */}
      <p style={hintStyle}>
        <strong>Modus:</strong>{" "}
        {graph.nodes.some((n) => n.kind === "router")
          ? "Handoff — ein Router/Triage-Agent klassifiziert und reicht an den passenden Spezialisten weiter."
          : "Manager — ein Orchestrator zerlegt das Vorhaben, delegiert an Worker und synthetisiert (Standard)."}{" "}
        Wechseln: den <em>Router/Triage-Agent</em> aus der Palette in eine Stage ziehen (= Handoff) bzw. entfernen (= Manager).
      </p>

      {/* v0.4.3 — globale Modell-Strategie statt fixer Pro-Agent-Badges. */}
      {!frozen ? (
        <div style={strategyRow}>
          <span style={{ ...miniLabel, marginBottom: 0 }}>Modell-Strategie:</span>
          {STRATEGIES.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={busy}
              onClick={() => setStrategy(s.id)}
              title={s.hint}
              style={{
                ...strategyBtn,
                ...(activeStrategy === s.id ? strategyBtnActive : {}),
              }}
            >
              {s.label}
            </button>
          ))}
          <span style={hintStyle}>
            {activeStrategy === "custom"
              ? "aktuell: gemischt (pro Agent im Detail überschrieben)"
              : `aktiv: ${STRATEGIES.find((s) => s.id === activeStrategy)?.hint}`}
          </span>
        </div>
      ) : null}

      <div className={frozen ? undefined : "aegira-canvas-grid"} style={frozen ? layoutGrid(true) : undefined}>
        {/* Palette — mobil über den Lanes (volle Breite), ab md als Seitenspalte. */}
        {!frozen ? (
          <aside style={paletteStyle}>
            <div style={sectionLabel}>Agenten-Palette</div>
            <p style={hintStyle}>
              Auf Touch/Mobil: Karte antippen fügt sie der ersten Stage hinzu; am
              Desktop in eine Stage ziehen. Farbe = Klasse (Orchestrator/Worker/Reviewer/HITL).
            </p>
            {catalog.map((c) => (
              <div
                key={c.id}
                draggable
                onDragStart={(e) => { e.dataTransfer.setData("catalog_id", c.id); }}
                onClick={() => { if (!busy) addCatalogToStage(c.id, 0); }}
                style={{
                  ...paletteCard,
                  borderLeft: `3px solid ${KIND_COLOR[c.kind]}`,
                  opacity: present.has(c.id) ? 0.45 : 1,
                }}
                title={`${c.description} — Tippen: zu Stage 1 hinzufügen`}
              >
                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.label}</span>
                <span style={{ fontSize: 16, color: "var(--c-gold)", fontWeight: 700 }} aria-hidden>+</span>
              </div>
            ))}
          </aside>
        ) : null}

        {/* Stage-Lanes */}
        <div style={lanesScroll}>
          <div style={lanesRow}>
            {stages.map((s) => {
              const ns = nodesByStage.get(s) ?? [];
              const pat = patternOfStage(s);
              const isEmpty = ns.length === 0;
              return (
                <div
                  key={s}
                  onDragOver={(e) => { if (!frozen) { e.preventDefault(); setDragOverStage(s); } }}
                  onDragLeave={() => setDragOverStage((cur) => (cur === s ? null : cur))}
                  onDrop={(e) => onDropToStage(e, s)}
                  style={{
                    ...laneStyle,
                    borderColor: dragOverStage === s ? "var(--c-gold)" : "var(--c-border)",
                    background: dragOverStage === s ? "rgba(197,160,89,0.06)" : "var(--c-surface)",
                    borderStyle: isEmpty ? "dashed" : "solid",
                  }}
                >
                  <div style={laneHead}>
                    <span>Stage {s + 1}</span>
                    {pat ? <span style={patternPill}>{PATTERN_LABEL[pat]}</span> : <span style={{ ...patternPill, opacity: 0.5 }}>leer</span>}
                  </div>
                  {ns.map((n) => {
                    const a = graph.agents.find((x) => x.id === n.agent_id);
                    const hiRisk = (catalog.find((c) => c.id === a?.name)?.tools ?? []).some((t) => t.risk === "high");
                    return (
                      <div
                        key={n.id}
                        draggable={!frozen}
                        onDragStart={(e) => { if (n.agent_id) e.dataTransfer.setData("agent_id", n.agent_id); }}
                        onClick={() => setSelected(n.agent_id)}
                        style={{
                          ...nodeCard,
                          borderColor: KIND_COLOR[n.kind],
                          outline: selected === n.agent_id ? "2px solid var(--c-navy)" : "none",
                        }}
                      >
                        <span style={{ ...dot, background: KIND_COLOR[n.kind] }} />
                        <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{n.label}</span>
                        {hiRisk ? <span style={riskBadge} title="High-Risk-Tool → HITL">⚠</span> : null}
                        <span style={{ fontSize: 10, color: "var(--c-text-muted)" }}>{KIND_LABEL[n.kind]}</span>
                      </div>
                    );
                  })}
                  {isEmpty ? <div style={dropHint}>hierher ziehen</div> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detail-Panel — v0.4.3: volle Breite UNTER der Canvas (kein Overlap mehr). */}
      <aside style={detailStyle}>
          {sel ? (
            <>
              <div style={sectionLabel}>{sel.role}</div>
              <p style={{ fontSize: 13, color: "var(--c-text-muted)", margin: "4px 0 10px" }}>
                <span style={modelBadge}>{MODEL_LABEL(sel.model)}</span> · {KIND_LABEL[sel.kind]}
              </p>
              {!frozen && sel.kind !== "hitl" ? (
                <div style={{ marginBottom: 10 }}>
                  <div style={miniLabel}>Modell-Tier (editierbar)</div>
                  <select
                    value={sel.model}
                    onChange={(e) => setModel(e.target.value)}
                    disabled={busy}
                    style={modelSelect}
                  >
                    {MODEL_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                    {!MODEL_OPTIONS.some((o) => o.id === sel.model) ? (
                      <option value={sel.model}>{MODEL_LABEL(sel.model)}</option>
                    ) : null}
                  </select>
                </div>
              ) : null}
              <Field label="Verantwortung" value={sel.responsibility || "—"} />
              <Field label="Mission" value={sel.mission} />
              {/* v0.5 — Werkzeug/MCP-Bindung je Agent (Schritt 6b → Schritt 8).
                  Gebundene Tools (sel.tools) sind entfernbar; Katalog-Vorschläge des
                  Agenten lassen sich per Klick hinzufügen. High-Risk = roter Rahmen. */}
              <div style={miniLabel}>Tools / MCP (je Agent)</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
                {sel.tools.map((tname) => {
                  const meta = selCat?.tools.find((t) => t.name === tname);
                  return (
                    <span
                      key={tname}
                      style={{ ...toolChip, borderColor: meta ? RISK_COLOR[meta.risk] : "var(--c-border-strong)" }}
                      title={meta ? `${meta.type} · ${meta.risk}` : "gebundenes Werkzeug"}
                    >
                      {tname}
                      {!frozen ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () => api.reviseHarness(id, { command: "tool", agent_id: sel.id, tool: tname, remove: true }),
                              "Werkzeug entfernt ✓",
                            )
                          }
                          style={{ marginLeft: 4, border: 0, background: "transparent", color: "var(--c-red)", cursor: "pointer", fontSize: 12, padding: 0 }}
                          aria-label={`${tname} entfernen`}
                        >
                          ×
                        </button>
                      ) : null}
                    </span>
                  );
                })}
                {sel.tools.length === 0 ? <span style={hintStyle}>—</span> : null}
              </div>
              {!frozen && selCat
                ? (() => {
                    const addable = selCat.tools.filter((t) => !sel.tools.includes(t.name));
                    return addable.length > 0 ? (
                      <div style={{ marginBottom: 10 }}>
                        <div style={miniLabel}>Vorgeschlagene Werkzeuge hinzufügen</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {addable.map((t) => (
                            <button
                              key={t.name}
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                void run(
                                  () => api.reviseHarness(id, { command: "tool", agent_id: sel.id, tool: t.name }),
                                  "Werkzeug gebunden ✓",
                                )
                              }
                              style={{ ...toolChip, borderColor: RISK_COLOR[t.risk], cursor: "pointer", background: "transparent" }}
                              title={`${t.type} · ${t.risk} — hinzufügen`}
                            >
                              + {t.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null;
                  })()
                : null}
              <div style={miniLabel}>Skills</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                {sel.skills.map((s) => <span key={s} style={skillChip}>{s}</span>)}
                {sel.skills.length === 0 ? <span style={hintStyle}>—</span> : null}
              </div>
              {!frozen ? (
                <Button
                  variant="secondary"
                  style={{ color: "var(--c-red)", borderColor: "var(--c-red)" }}
                  disabled={busy}
                  onClick={() => run(() => api.reviseHarness(id, { command: "agent", op: "delete", agent_id: sel.id }), "Gelöscht ✓").then(() => setSelected(null))}
                >
                  Agent löschen
                </Button>
              ) : null}
            </>
          ) : (
            <>
              <div style={sectionLabel}>Detail</div>
              <p style={hintStyle}>Eine Agenten-Karte anklicken, um Mission, Verantwortung, Tools (mit Risk) und Modell-Tier zu sehen.</p>
            </>
          )}
          {note ? <p style={{ ...hintStyle, marginTop: 10, color: "var(--c-text)" }}>{note}</p> : null}
        </aside>
    </div>
  );
}

function Kpi({ label, value, valueText, color }: { label: string; value?: number; valueText?: string; color?: string }): React.ReactElement {
  return (
    <div style={{ ...cardStyle, padding: "12px 16px", minWidth: 110 }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--c-text-muted)" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: color ?? "var(--c-text)" }}>{valueText ?? value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={miniLabel}>{label}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

// --- Styles ---
const kpiRow: React.CSSProperties = { display: "flex", gap: "var(--sp-2)", flexWrap: "wrap", marginBottom: "var(--sp-3)" };
// v0.4.3 — Detail-Panel ist UNTER die Canvas gewandert; Grid hat nur noch Palette + Lanes.
const layoutGrid = (frozen: boolean): React.CSSProperties => ({
  display: "grid",
  gridTemplateColumns: frozen ? "1fr" : "200px 1fr",
  gap: "var(--sp-3)",
  alignItems: "start",
});
const strategyRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: "var(--sp-2)", flexWrap: "wrap", marginBottom: "var(--sp-3)" };
const strategyBtn: React.CSSProperties = { fontSize: 13, fontWeight: 600, padding: "4px 12px", border: "1px solid var(--c-border-strong)", borderRadius: "var(--r-pill)", background: "var(--c-surface)", color: "var(--c-text)", cursor: "pointer" };
const strategyBtnActive: React.CSSProperties = { background: "var(--c-navy)", color: "var(--c-vellum)", borderColor: "var(--c-navy)" };
const paletteStyle: React.CSSProperties = { ...cardStyle, padding: "var(--sp-3)", maxHeight: 360, overflowY: "auto" };
// 44px Touch-Höhe; Cursor „grab" am Desktop, Tippen fügt auf Touch hinzu.
const paletteCard: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "8px 10px", marginBottom: 6, minHeight: 44, background: "var(--c-vellum)", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", cursor: "grab" };
// minWidth:0 ist zwingend: ohne das wächst die 1fr-Grid-Spalte auf die Inhaltsbreite
// (Summe aller Lanes) und überlappt die Detail-Spalte. So scrollt sie stattdessen intern.
const lanesScroll: React.CSSProperties = { overflowX: "auto", padding: "2px", minWidth: 0 };
const lanesRow: React.CSSProperties = { display: "flex", gap: "var(--sp-3)", alignItems: "stretch", minHeight: 320 };
const laneStyle: React.CSSProperties = { minWidth: 190, flex: "0 0 190px", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)", padding: "var(--sp-2)", display: "flex", flexDirection: "column", gap: 6 };
const laneHead: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--c-steel)", marginBottom: 2 };
const patternPill: React.CSSProperties = { fontSize: 10, fontWeight: 600, padding: "1px 6px", border: "1px solid var(--c-border-strong)", borderRadius: "var(--r-pill)", color: "var(--c-text-muted)" };
const nodeCard: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6, padding: "8px 10px", background: "var(--c-vellum)", border: "1px solid", borderRadius: "var(--r-md)", cursor: "grab", fontWeight: 600 };
const dot: React.CSSProperties = { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 };
const modelBadge: React.CSSProperties = { fontSize: 10, fontWeight: 700, padding: "1px 5px", borderRadius: "var(--r-pill)", background: "var(--c-navy)", color: "var(--c-vellum)" };
const modelSelect: React.CSSProperties = { width: "100%", padding: "6px 8px", fontSize: 13, border: "1px solid var(--c-border-strong)", borderRadius: "var(--r-md)", background: "var(--c-surface)", color: "var(--c-text)", cursor: "pointer" };
const riskBadge: React.CSSProperties = { fontSize: 12, color: "var(--c-red)" };
const dropHint: React.CSSProperties = { fontSize: 11, color: "var(--c-text-muted)", textAlign: "center", padding: "16px 4px", fontStyle: "italic" };
const detailStyle: React.CSSProperties = { ...cardStyle, padding: "var(--sp-3)", marginTop: "var(--sp-3)" };
const sectionLabel: React.CSSProperties = { fontSize: "var(--fs-caption)", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--c-text-muted)" };
const miniLabel: React.CSSProperties = { fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--c-text-muted)", marginBottom: 2 };
const hintStyle: React.CSSProperties = { fontSize: 12, color: "var(--c-text-muted)", lineHeight: 1.5 };
const toolChip: React.CSSProperties = { fontSize: 11, padding: "1px 6px", border: "1px solid", borderRadius: "var(--r-pill)" };
const skillChip: React.CSSProperties = { fontSize: 11, padding: "1px 6px", border: "1px solid var(--c-border-strong)", borderRadius: "var(--r-pill)" };
