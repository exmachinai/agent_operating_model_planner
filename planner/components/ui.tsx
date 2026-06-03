/**
 * Minimale UI-Primitive auf Basis der Design-Tokens.
 * Bewusst klein gehalten — keine Komponentenbibliothek.
 */

"use client";

import * as React from "react";
import type { ProjectStatus } from "../lib/api";

export function Button({
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "accent";
}): React.ReactElement {
  const base: React.CSSProperties = {
    minHeight: 40,
    padding: "0 var(--sp-4)",
    fontSize: 14,
    fontWeight: 600,
    borderRadius: "var(--r-md)",
    cursor: props.disabled ? "not-allowed" : "pointer",
    opacity: props.disabled ? 0.5 : 1,
    transition: "background-color var(--t-fast) var(--ease-out)",
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: {
      backgroundColor: "var(--c-navy)",
      color: "var(--c-vellum)",
      border: 0,
    },
    secondary: {
      backgroundColor: "transparent",
      color: "var(--c-navy)",
      border: "1px solid var(--c-navy)",
    },
    accent: {
      backgroundColor: "var(--c-gold)",
      color: "var(--c-navy-dark)",
      border: 0,
    },
  };
  return <button {...props} style={{ ...base, ...variants[variant], ...props.style }} />;
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: "In Planung",
  reviewing: "In Review",
  approved: "Freigegeben",
  compiled: "Kompiliert",
  archived: "Archiviert",
};

export function StatusBadge({
  status,
  gateApproved,
}: {
  status: ProjectStatus;
  gateApproved: boolean;
}): React.ReactElement {
  const label = gateApproved ? "Gate 1 ✓ · " + STATUS_LABEL[status] : "Verständnis offen";
  // AA-konformer Grün-Textwert (der helle --c-green unterschreitet als kleine Schrift 4.5:1).
  const color = gateApproved ? "var(--c-green-text)" : "var(--c-steel)";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px var(--sp-2)",
        fontSize: "var(--fs-caption)",
        fontWeight: 600,
        color,
        border: `1px solid ${color}`,
        borderRadius: "var(--r-pill)",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export const cardStyle: React.CSSProperties = {
  padding: "var(--sp-4)",
  backgroundColor: "var(--c-surface)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-md)",
  boxShadow: "var(--sh-1)",
};

export const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--c-text-muted)",
  marginBottom: "var(--sp-1)",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  // v0.5 — Touch-Mindesthöhe; fontSize 16px verhindert iOS-Safari-Auto-Zoom beim Fokus.
  minHeight: 44,
  padding: "var(--sp-2) var(--sp-3)",
  fontSize: 16,
  fontFamily: "var(--font-body)",
  color: "var(--c-text)",
  backgroundColor: "var(--c-surface)",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-md)",
};
