/**
 * Schritt 6b — Aktivitäten je Meilenstein bearbeiten + Werkzeuge wählen (v0.5).
 *
 * Pro Meilenstein zeigt der Editor die (vorgeschlagenen) 3 Aktivitäten. Editierbar
 * sind nur Beschreibung + Aufwand; löschen, hinzufügen, neu sortieren möglich.
 * Darunter je Aktivität die abgeleiteten Werkzeug-/MCP-Vorschläge als Chips —
 * mit Klartext-Erklärung („?") und annehmen/verwerfen. Methodik (PVM/Risiken)
 * bleibt im Hintergrund (Backend-Recompute).
 */

"use client";

import * as React from "react";

import {
  api,
  ApiError,
  type Activity,
  type ActivityOp,
  type Milestone,
  type Plan,
  type ToolSuggestion,
} from "../lib/api";
import { Button, cardStyle, inputStyle } from "./ui";
import { SortableList } from "./SortableList";

export function ActivityEditor({
  id,
  plan,
  onPlan,
  disabled = false,
}: {
  id: string;
  plan: Plan;
  onPlan: (p: Plan) => void;
  disabled?: boolean;
}): React.ReactElement {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Record<string, { desc: string; pt: string }>>({});
  const [openTool, setOpenTool] = React.useState<string | null>(null);

  async function apply(ops: ActivityOp[]): Promise<void> {
    if (disabled) return;
    setBusy(true);
    setError(null);
    try {
      onPlan(await api.editActivities(id, ops));
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  function fieldOf(a: Activity): { desc: string; pt: string } {
    return draft[a.id] ?? { desc: a.description, pt: String(a.effort_pt) };
  }
  function setField(a: Activity, patch: Partial<{ desc: string; pt: string }>): void {
    setDraft((d) => ({ ...d, [a.id]: { ...fieldOf(a), ...patch } }));
  }
  function commit(mid: string, a: Activity): void {
    const f = fieldOf(a);
    const pt = parseFloat(f.pt.replace(",", "."));
    const changed = f.desc !== a.description || (!Number.isNaN(pt) && pt !== a.effort_pt);
    if (!changed) return;
    void apply([
      {
        op: "update",
        milestone_id: mid,
        id: a.id,
        description: f.desc,
        effort_pt: Number.isNaN(pt) ? undefined : pt,
      },
    ]);
  }

  return (
    <div>
      {error ? <p style={errorStyle}>{error}</p> : null}
      {plan.milestones.map((m: Milestone) => (
        <div key={m.id} style={{ ...cardStyle, marginBottom: "var(--sp-4)" }}>
          <div style={msHeadStyle}>
            <span style={msNameStyle}>{m.name}</span>
            <span style={msMetaStyle}>{m.activities.length} Aktivität(en)</span>
          </div>

          <SortableList
            items={m.activities}
            disabled={disabled || busy}
            onReorder={(order) =>
              void apply([{ op: "reorder", milestone_id: m.id, order }])
            }
            renderItem={(a: Activity) => {
              const f = fieldOf(a);
              return (
                <div>
                  <div style={topRowStyle}>
                    <input
                      style={inputStyle}
                      value={f.desc}
                      disabled={disabled}
                      onChange={(e) => setField(a, { desc: e.target.value })}
                      onBlur={() => commit(m.id, a)}
                      aria-label="Aktivität"
                    />
                    <button
                      type="button"
                      style={delBtnStyle}
                      disabled={disabled || busy}
                      onClick={() =>
                        void apply([{ op: "delete", milestone_id: m.id, id: a.id }])
                      }
                      aria-label="Aktivität löschen"
                      title="Löschen"
                    >
                      ✕
                    </button>
                  </div>
                  <div style={ptRowStyle}>
                    <label style={ptLabelStyle}>
                      <span style={{ color: "var(--c-text-muted)" }}>Aufwand (PT)</span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        style={{ ...inputStyle, maxWidth: 110 }}
                        value={f.pt}
                        disabled={disabled}
                        onChange={(e) => setField(a, { pt: e.target.value })}
                        onBlur={() => commit(m.id, a)}
                      />
                    </label>
                  </div>

                  {/* Werkzeug-/MCP-Vorschläge */}
                  {a.tool_suggestions.length > 0 ? (
                    <div style={toolWrapStyle}>
                      <span style={toolHeadStyle}>Vorgeschlagene Werkzeuge:</span>
                      <div style={chipRowStyle}>
                        {a.tool_suggestions.map((t: ToolSuggestion) => (
                          <ToolChip
                            key={t.id}
                            tool={t}
                            open={openTool === t.id}
                            disabled={disabled || busy}
                            onToggleInfo={() =>
                              setOpenTool((cur) => (cur === t.id ? null : t.id))
                            }
                            onSet={(accepted) =>
                              void apply([
                                {
                                  op: "update",
                                  milestone_id: m.id,
                                  id: a.id,
                                  tool_id: t.id,
                                  tool_accepted: accepted,
                                },
                              ])
                            }
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            }}
          />

          <div style={{ marginTop: "var(--sp-3)" }}>
            <Button
              variant="secondary"
              disabled={disabled || busy}
              onClick={() =>
                void apply([{ op: "add", milestone_id: m.id, description: "Neue Aktivität" }])
              }
            >
              + Aktivität hinzufügen
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ToolChip({
  tool,
  open,
  disabled,
  onToggleInfo,
  onSet,
}: {
  tool: ToolSuggestion;
  open: boolean;
  disabled: boolean;
  onToggleInfo: () => void;
  onSet: (accepted: boolean) => void;
}): React.ReactElement {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          ...chipStyle,
          borderColor: tool.accepted ? "var(--c-green)" : "var(--c-border-strong)",
          background: tool.accepted ? "rgba(90,147,103,0.10)" : "transparent",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--c-text-muted)" }}>
          {tool.kind === "mcp" ? "MCP" : "Tool"}
        </span>
        <span style={{ fontWeight: 600 }}>{tool.label}</span>
        <button
          type="button"
          style={infoBtnStyle}
          onClick={onToggleInfo}
          aria-label="Was ist das?"
          title="Was ist das?"
        >
          ?
        </button>
        {tool.accepted ? (
          <button
            type="button"
            style={{ ...chipActionStyle, color: "var(--c-red)" }}
            disabled={disabled}
            onClick={() => onSet(false)}
          >
            Entfernen
          </button>
        ) : (
          <button
            type="button"
            style={{ ...chipActionStyle, color: "var(--c-green)" }}
            disabled={disabled}
            onClick={() => onSet(true)}
          >
            Übernehmen
          </button>
        )}
      </span>
      {open ? (
        <span style={infoBoxStyle}>
          <strong>{tool.label}</strong> — {tool.what_it_does}
          <br />
          <span style={{ color: "var(--c-text-muted)" }}>Warum: {tool.why_suggested}</span>
          <br />
          <span style={{ color: "var(--c-text-muted)" }}>Vertrauen: {tool.trust_note}</span>
        </span>
      ) : null}
    </span>
  );
}

const msHeadStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--sp-2)",
  marginBottom: "var(--sp-3)",
  paddingBottom: "var(--sp-2)",
  borderBottom: "1px solid var(--c-border)",
};
const msNameStyle: React.CSSProperties = { fontWeight: 600, fontSize: 15 };
const msMetaStyle: React.CSSProperties = { fontSize: 12, color: "var(--c-text-muted)" };

const topRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
};

const ptRowStyle: React.CSSProperties = { marginTop: "var(--sp-2)" };
const ptLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  fontSize: 13,
};

const toolWrapStyle: React.CSSProperties = {
  marginTop: "var(--sp-3)",
  paddingTop: "var(--sp-2)",
  borderTop: "1px dashed var(--c-border)",
};
const toolHeadStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--c-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};
const chipRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--sp-2)",
  marginTop: "var(--sp-2)",
};
const chipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 8px",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-pill)",
  fontSize: 13,
};
const infoBtnStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: "var(--r-pill)",
  border: "1px solid var(--c-border-strong)",
  background: "transparent",
  color: "var(--c-text-muted)",
  fontSize: 11,
  cursor: "pointer",
  lineHeight: 1,
  padding: 0,
};
const chipActionStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  padding: "0 2px",
};
const infoBoxStyle: React.CSSProperties = {
  fontSize: 12,
  lineHeight: 1.5,
  color: "var(--c-text)",
  background: "var(--c-vellum)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-md)",
  padding: "var(--sp-2)",
  maxWidth: 360,
};

const delBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  border: "1px solid var(--c-border)",
  background: "transparent",
  color: "var(--c-red)",
  borderRadius: "var(--r-sm)",
  width: 32,
  minHeight: 32,
  cursor: "pointer",
};
const errorStyle: React.CSSProperties = {
  padding: "var(--sp-2) var(--sp-3)",
  background: "rgba(195,66,63,0.08)",
  border: "1px solid var(--c-red)",
  borderRadius: "var(--r-md)",
  color: "var(--c-red)",
  marginBottom: "var(--sp-3)",
  fontSize: 13,
};
