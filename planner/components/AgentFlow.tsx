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
}: {
  graph: HarnessGraph;
  animated: boolean;
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

  return (
    <div style={wrapStyle}>
      <div style={headerRow}>
        <strong style={{ fontSize: 13 }}>Flow-Ansicht</strong>
        <span style={badge(animated ? "var(--c-green)" : "var(--c-steel)")}>
          {animated ? "● dynamische Flows" : "live · Entwurf"}
        </span>
      </div>
      <div style={scrollStyle}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Agenten-Flow-Diagramm"
          style={{ display: "block" }}
        >
          <defs>
            <marker id="af-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--c-border-strong)" />
            </marker>
          </defs>

          {/* Stage-Spaltenköpfe */}
          {stages.map((s, ci) => (
            <text key={`h-${s}`} x={MARGIN + ci * COL_W} y={14} style={stageHeadStyle}>
              STAGE {s + 1}
            </text>
          ))}

          {/* Kanten */}
          {edges.map((e) => (
            <path key={e.id} d={e.d} fill="none" stroke="var(--c-border-strong)" strokeWidth={1.5} markerEnd="url(#af-arrow)" />
          ))}

          {/* Dynamische Flows: Partikel entlang der Kanten (nur final) */}
          {animated
            ? edges.map((e, i) => (
                <circle key={`p-${e.id}`} r={3.5} fill="var(--c-gold)">
                  <animateMotion dur="2.4s" begin={`${(i % 5) * 0.4}s`} repeatCount="indefinite" path={e.d} />
                </circle>
              ))
            : null}

          {/* Knoten */}
          {placed.map(({ node, x, y }) => (
            <g key={node.id}>
              <rect
                x={x}
                y={y}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill="var(--c-surface)"
                stroke={KIND_COLOR[node.kind]}
                strokeWidth={1.5}
              />
              <rect x={x} y={y} width={5} height={NODE_H} rx={2} fill={KIND_COLOR[node.kind]} />
              <text x={x + 14} y={y + 19} style={nodeTitleStyle}>
                {truncate(node.label, 20)}
              </text>
              <text x={x + 14} y={y + 35} style={nodeKindStyle}>
                {KIND_LABEL[node.kind]}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div style={legendRow}>
        {(["orchestrator", "worker", "evaluator", "hitl"] as HarnessNodeKind[]).map((k) => (
          <span key={k} style={legendItem}>
            <span style={{ ...legendDot, backgroundColor: KIND_COLOR[k] }} /> {KIND_LABEL[k]}
          </span>
        ))}
      </div>
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
const badge = (c: string): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  color: c,
  border: `1px solid ${c}`,
  borderRadius: "var(--r-pill)",
  padding: "1px 8px",
});
