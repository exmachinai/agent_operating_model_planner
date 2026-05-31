/**
 * Touch- und laienfreundliche sortierbare Liste (v0.5).
 *
 * Zwei Wege, die Reihenfolge zu ändern — bewusst redundant, damit es überall geht:
 * 1. **Drag&Drop** (natives HTML5-DnD) am Ziehgriff — schnell auf Desktop.
 * 2. **Hoch/Runter-Buttons** — funktionieren mit Touch (iPhone) und sind für
 *    Laien selbsterklärend; auch dort nutzbar, wo DnD blockiert ist.
 *
 * Generisch über `items` (brauchen eine `id`). `onReorder` bekommt die neue
 * Reihenfolge als ID-Liste — passt direkt auf die Backend-`reorder`-Op.
 */

"use client";

import * as React from "react";

export interface SortableItem {
  id: string;
}

export function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  disabled = false,
}: {
  items: T[];
  onReorder: (orderedIds: string[]) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
  disabled?: boolean;
}): React.ReactElement {
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);

  function move(from: number, to: number): void {
    if (to < 0 || to >= items.length) return;
    const ids = items.map((i) => i.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    onReorder(ids);
  }

  function onDrop(targetId: string): void {
    if (!dragId || dragId === targetId) return;
    const ids = items.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    onReorder(ids);
    setDragId(null);
    setOverId(null);
  }

  return (
    <ul style={listStyle}>
      {items.map((item, idx) => (
        <li
          key={item.id}
          onDragOver={(e) => {
            if (disabled || !dragId) return;
            e.preventDefault();
            setOverId(item.id);
          }}
          onDragLeave={() => setOverId((cur) => (cur === item.id ? null : cur))}
          onDrop={() => onDrop(item.id)}
          style={{
            ...rowStyle,
            borderColor: overId === item.id ? "var(--c-gold)" : "var(--c-border)",
            background: overId === item.id ? "rgba(230,179,47,0.08)" : "var(--c-surface)",
            opacity: dragId === item.id ? 0.5 : 1,
          }}
        >
          {/* Ziehgriff + Hoch/Runter — die beiden Reorder-Wege. */}
          <div style={handleColStyle}>
            <span
              draggable={!disabled}
              onDragStart={() => setDragId(item.id)}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              style={{ ...gripStyle, cursor: disabled ? "default" : "grab" }}
              title="Zum Sortieren ziehen"
              aria-hidden
            >
              ⠿
            </span>
            <button
              type="button"
              disabled={disabled || idx === 0}
              onClick={() => move(idx, idx - 1)}
              style={arrowBtnStyle}
              aria-label="Nach oben"
              title="Nach oben"
            >
              ▲
            </button>
            <button
              type="button"
              disabled={disabled || idx === items.length - 1}
              onClick={() => move(idx, idx + 1)}
              style={arrowBtnStyle}
              aria-label="Nach unten"
              title="Nach unten"
            >
              ▼
            </button>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>{renderItem(item, idx)}</div>
        </li>
      ))}
    </ul>
  );
}

const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-2)",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "stretch",
  gap: "var(--sp-3)",
  padding: "var(--sp-3)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-md)",
  boxShadow: "var(--sh-1)",
  transition: "border-color var(--t-fast), background var(--t-fast)",
};

const handleColStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  flexShrink: 0,
};

const gripStyle: React.CSSProperties = {
  fontSize: 18,
  color: "var(--c-gray)",
  lineHeight: 1,
  userSelect: "none",
};

const arrowBtnStyle: React.CSSProperties = {
  border: "1px solid var(--c-border-strong)",
  background: "transparent",
  color: "var(--c-navy)",
  borderRadius: "var(--r-sm)",
  width: 28,
  minHeight: 24,
  fontSize: 10,
  cursor: "pointer",
  lineHeight: 1,
};
