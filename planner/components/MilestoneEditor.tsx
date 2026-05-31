/**
 * Schritt 6a — Meilenstein-Vorschläge bearbeiten (v0.5).
 *
 * Der Anwender (oft Laie) bekommt vorgeschlagene Meilensteine und kann sie
 * umbenennen, das Datum ändern, löschen, neue hinzufügen und per Drag&Drop oder
 * Hoch/Runter neu sortieren. PVM/Risiken laufen im Hintergrund (Backend-Recompute).
 * Bewusst schlank: nur Name + Datum sind editierbar — keine überladenen Felder.
 */

"use client";

import * as React from "react";

import { api, ApiError, type Milestone, type MilestoneOp, type Plan } from "../lib/api";
import { Button, cardStyle, inputStyle } from "./ui";
import { SortableList } from "./SortableList";

function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

export function MilestoneEditor({
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
  // Lokaler Entwurf für Inline-Felder, damit Tippen nicht bei jedem Zeichen speichert.
  const [draft, setDraft] = React.useState<Record<string, { name: string; date: string }>>({});

  async function apply(ops: MilestoneOp[]): Promise<void> {
    if (disabled) return;
    setBusy(true);
    setError(null);
    try {
      onPlan(await api.editMilestones(id, ops));
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  function fieldOf(m: Milestone): { name: string; date: string } {
    return draft[m.id] ?? { name: m.name, date: toDateInput(m.planned_date) };
  }

  function setField(m: Milestone, patch: Partial<{ name: string; date: string }>): void {
    setDraft((d) => ({ ...d, [m.id]: { ...fieldOf(m), ...patch } }));
  }

  function commit(m: Milestone): void {
    const f = fieldOf(m);
    const changed = f.name !== m.name || f.date !== toDateInput(m.planned_date);
    if (!changed) return;
    void apply([
      {
        op: "update",
        id: m.id,
        name: f.name,
        planned_date: new Date(f.date + "T00:00:00Z").toISOString(),
      },
    ]);
  }

  return (
    <div>
      {error ? <p style={errorStyle}>{error}</p> : null}
      <SortableList
        items={plan.milestones}
        disabled={disabled || busy}
        onReorder={(order) => void apply([{ op: "reorder", order }])}
        renderItem={(m: Milestone, idx) => {
          const f = fieldOf(m);
          return (
            <div>
              <div style={topRowStyle}>
                <span style={ordBadge}>{idx + 1}</span>
                <input
                  style={{ ...inputStyle, fontWeight: 600 }}
                  value={f.name}
                  disabled={disabled}
                  onChange={(e) => setField(m, { name: e.target.value })}
                  onBlur={() => commit(m)}
                  aria-label="Meilenstein-Name"
                />
                <button
                  type="button"
                  style={delBtnStyle}
                  disabled={disabled || busy}
                  onClick={() => void apply([{ op: "delete", id: m.id }])}
                  aria-label="Meilenstein löschen"
                  title="Löschen"
                >
                  ✕
                </button>
              </div>
              <div style={metaRowStyle}>
                <label style={dateLabelStyle}>
                  <span style={{ color: "var(--c-text-muted)" }}>Zieltermin</span>
                  <input
                    type="date"
                    style={{ ...inputStyle, maxWidth: 180 }}
                    value={f.date}
                    disabled={disabled}
                    onChange={(e) => setField(m, { date: e.target.value })}
                    onBlur={() => commit(m)}
                  />
                </label>
                <span style={tagStyle}>{m.mrl.length} Risiko(en)</span>
                <span style={tagStyle}>{m.stream_code}</span>
              </div>
            </div>
          );
        }}
      />

      <div style={{ marginTop: "var(--sp-3)" }}>
        <Button
          variant="secondary"
          disabled={disabled || busy}
          onClick={() =>
            void apply([{ op: "add", name: "Neuer Meilenstein" }])
          }
        >
          + Meilenstein hinzufügen
        </Button>
      </div>
    </div>
  );
}

const topRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
};

const ordBadge: React.CSSProperties = {
  flexShrink: 0,
  width: 24,
  height: 24,
  borderRadius: "var(--r-pill)",
  background: "var(--c-navy)",
  color: "var(--c-vellum)",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 600,
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-3)",
  flexWrap: "wrap",
  marginTop: "var(--sp-2)",
};

const dateLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  fontSize: 13,
};

const tagStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--c-text-muted)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-pill)",
  padding: "1px 8px",
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

export { cardStyle };
