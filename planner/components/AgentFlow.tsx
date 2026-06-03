/**
 * AgentFlow — Weltklasse-Flow-Visualisierung des Agenten-Graphen (v0.9.2).
 *
 * Stellt Abläufe und Zusammenhänge der Agenten als gerichteten Graph dar:
 * Knoten nach Orchestrierungs-Stages in Spalten, Kanten = `depends_on`,
 * Farbe = Rolle (Orchestrator/Router/Worker/Reviewer/HITL). Liest denselben
 * `HarnessGraph` wie die Drag&Drop-Canvas → bildet jede Änderung **live** ab.
 *
 * Bei finalem (kompiliertem) Status laufen **dynamische Flows**: animierte
 * Partikel entlang der Kanten (Orchestrator → Worker → Reviewer → HITL),
 * damit die Laufzeit-Dynamik sichtbar wird. Reines SVG (keine Fremd-Lib).
 */

"use client";

import * as React from "react";
import type { HarnessGraph, HarnessNode, HarnessNodeKind } from "../lib/api";

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

const COL_W = 210;
const ROW_H = 70;
const NODE_W = 168;
const NODE_H = 48;
const MARGIN = 20;
const HEAD_H = 26;

interface Placed {
  node: HarnessNode;
  x: number;
  y: number;
}

export function AgentFlow({
  graph,
  animated,
  print = false,
}: {
  graph: HarnessGraph;
  animated: boolean;
  /** Druck-Variante: volles, an die Seite angepasstes SVG, ohne Scroll/Expand. */
  print?: boolean;
}): React.ReactElement {
  const { placed, stages, width, height, edges } = React.useMemo(() => {
    const byStage = new Map<number, HarnessNode[]>();
    for (const n of graph.nodes) {
      const arr = byStage.get(n.stage) ?? [];
      arr.push(n);
      byStage.set(n.stage, arr);
    }
    const stageKeys = [...byStage.keys()].sort((a, b) => a - b);
    const pos = new Map<string, Placed>();
    let maxRows = 0;
    stageKeys.forEach((s, ci) => {
      const nodes = byStage.get(s)!;
      maxRows = Math.max(maxRows, nodes.length);
      nodes.forEach((n, ri) => {
        pos.set(n.id, {
          node: n,
          x: MARGIN + ci * COL_W,
          y: MARGIN + HEAD_H + ri * ROW_H,
        });
      });
    });
    const edgeList: { id: string; d: string }[] = [];
    for (const n of graph.nodes) {
      const to = pos.get(n.id);
      if (!to) continue;
      for (const dep of n.depends_on) {
        const from = pos.get(dep);
        if (!from) continue;
        const x1 = from.x + NODE_W;
        const y1 = from.y + NODE_H / 2;
        const x2 = to.x;
        const y2 = to.y + NODE_H / 2;
        const mx = (x1 + x2) / 2;
        edgeList.push({
          id: `e-${dep}-${n.id}`,
          d: `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`,
        });
      }
    }
    return {
      placed: [...pos.values()],
      stages: stageKeys,
      width: MARGIN * 2 + Math.max(1, stageKeys.length) * COL_W - (COL_W - NODE_W),
      height: MARGIN * 2 + HEAD_H + Math.max(1, maxRows) * ROW_H,
      edges: edgeList,
    };
  }, [graph]);

  const [expanded, setExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded]);

  // Wiederverwendbares SVG — `tag` macht Marker-IDs eindeutig (Panel vs. Modal),
  // `animate` schaltet die dynamischen Partikel-Flows, `scale` vergrößert (crisp, SVG).
  const FlowSvg = ({ animate, scale = 1, tag, fit }: { animate: boolean; scale?: number; tag: string; fit?: boolean }) => (
    <svg
      width={fit ? "100%" : width * scale}
      height={fit ? undefined : height * scale}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Agenten-Flow-Diagramm"
      style={fit ? { display: "block", width: "100%", height: "auto" } : { display: "block" }}
    >
      <defs>
        <marker id={`af-arrow-${tag}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="var(--c-border-strong)" />
        </marker>
      </defs>
      {stages.map((s, ci) => (
        <text key={`h-${s}`} x={MARGIN + ci * COL_W} y={14} style={stageHeadStyle}>
          STAGE {s + 1}
        </text>
      ))}
      {edges.map((e) => (
        <path key={e.id} d={e.d} fill="none" stroke="var(--c-border-strong)" strokeWidth={1.5} markerEnd={`url(#af-arrow-${tag})`} />
      ))}
      {animate
        ? edges.map((e, i) => (
            <circle key={`p-${e.id}`} r={4} fill="var(--c-gold)">
              <animateMotion dur="2.4s" begin={`${(i % 5) * 0.4}s`} repeatCount="indefinite" path={e.d} />
            </circle>
          ))
        : null}
      {placed.map(({ node, x, y }) => (
        <g key={node.id}>
          <rect x={x} y={y} width={NODE_W} height={NODE_H} rx={8} fill="var(--c-surface)" stroke={KIND_COLOR[node.kind]} strokeWidth={1.5} />
          <rect x={x} y={y} width={5} height={NODE_H} rx={2} fill={KIND_COLOR[node.kind]} />
          <text x={x + 14} y={y + 19} style={nodeTitleStyle}>{truncate(node.label, 24)}</text>
          <text x={x + 14} y={y + 35} style={nodeKindStyle}>{KIND_LABEL[node.kind]}</text>
        </g>
      ))}
    </svg>
  );

  const Legend = () => (
    <div style={legendRow}>
      {(["orchestrator", "worker", "evaluator", "hitl"] as HarnessNodeKind[]).map((k) => (
        <span key={k} style={legendItem}>
          <span style={{ ...legendDot, backgroundColor: KIND_COLOR[k] }} /> {KIND_LABEL[k]}
        </span>
      ))}
    </div>
  );

  if (print) {
    return (
      <div>
        <div style={{ width: "100%" }}>
          <FlowSvg animate={false} scale={1} tag="print" fit />
        </div>
        <Legend />
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div style={headerRow}>
        <strong style={{ fontSize: 13 }}>Flow-Ansicht</strong>
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={badge(animated ? "var(--c-green-text)" : "var(--c-steel)")}>
            {animated ? "● dynamische Flows" : "live · Entwurf"}
          </span>
          <button type="button" style={expandBtnStyle} aria-label="Flow vergrößern" title="Vergrößern (animiert)" onClick={() => setExpanded(true)}>
            ⤢
          </button>
        </span>
      </div>
      <div
        style={{ ...scrollStyle, cursor: "zoom-in" }}
        onClick={() => setExpanded(true)}
        title="Klicken zum Vergrößern (animiert)"
        // A11y (WCAG scrollable-region-focusable): scrollbarer Bereich per Tastatur erreichbar.
        tabIndex={0}
        role="group"
        aria-label="Agenten-Flow-Diagramm — scrollbar; klicken oder Enter zum Vergrößern"
      >
        <FlowSvg animate={animated} scale={1} tag="panel" />
      </div>
      <Legend />

      {expanded ? (
        <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Flow-Ansicht (groß)" onClick={() => setExpanded(false)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <div style={modalHeadStyle}>
              <strong style={{ fontSize: 15 }}>Agenten-Flow — dynamische Flows</strong>
              <button type="button" style={closeBtnStyle} aria-label="Schließen" onClick={() => setExpanded(false)}>✕</button>
            </div>
            <div style={modalScrollStyle} tabIndex={0} role="group" aria-label="Agenten-Flow-Diagramm (vergrößert)">
              {/* U5 (Diagramm-Lesbarkeit): fit-to-width statt fester Skalierung —
                  der GANZE Graph (alle Stages) bleibt sichtbar, keine abgeschnittene
                  Stage/Spalte; viewBox skaliert proportional in die Modalbreite. */}
              <FlowSvg animate fit tag="modal" />
            </div>
            <Legend />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

const wrapStyle: React.CSSProperties = {
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-md)",
  backgroundColor: "var(--c-bg)",
  padding: "var(--sp-2)",
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-1)",
  minWidth: 0,
};
const headerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--sp-2)",
};
const scrollStyle: React.CSSProperties = {
  overflow: "auto",
  flex: 1,
  maxHeight: "min(68vh, 560px)",
  // Touch-Scrollen flüssig (iOS) + dezenter Rahmen.
  WebkitOverflowScrolling: "touch",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-sm)",
  backgroundColor: "var(--c-surface)",
};
const stageHeadStyle: React.CSSProperties = {
  fontSize: "9px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  fill: "var(--c-steel)",
};
const nodeTitleStyle: React.CSSProperties = { fontSize: "11px", fontWeight: 600, fill: "var(--c-text)" };
const nodeKindStyle: React.CSSProperties = { fontSize: "9px", fill: "var(--c-text-muted)" };
const legendRow: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: "var(--sp-2)" };
const legendItem: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 10,
  color: "var(--c-text-muted)",
};
const legendDot: React.CSSProperties = { width: 8, height: 8, borderRadius: "50%" };
const expandBtnStyle: React.CSSProperties = {
  width: 26,
  height: 22,
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-sm)",
  background: "var(--c-surface)",
  color: "var(--c-steel)",
  cursor: "pointer",
  fontSize: 13,
  lineHeight: 1,
};
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  backgroundColor: "rgba(11, 19, 43, 0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "var(--sp-3)",
};
const modalCardStyle: React.CSSProperties = {
  width: "min(1200px, 96vw)",
  maxHeight: "92vh",
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-2)",
  backgroundColor: "var(--c-bg)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-lg)",
  boxShadow: "var(--sh-2)",
  padding: "var(--sp-3)",
};
const modalHeadStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--sp-2)",
};
const modalScrollStyle: React.CSSProperties = {
  overflow: "auto",
  flex: 1,
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-sm)",
  backgroundColor: "var(--c-surface)",
  WebkitOverflowScrolling: "touch",
};
const closeBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  fontSize: 16,
  color: "var(--c-text-muted)",
  backgroundColor: "transparent",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-md)",
  cursor: "pointer",
};
const badge = (c: string): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  color: c,
  border: `1px solid ${c}`,
  borderRadius: "var(--r-pill)",
  padding: "1px 8px",
});
