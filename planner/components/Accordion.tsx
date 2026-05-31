/**
 * Accordion — wiederverwendbare, einklappbare Sektion (v0.5.1, Usability).
 *
 * Spec: docs/05_ux-ui-best-practices.md (Progressive Disclosure). Lange Seiten
 * (Plan-Ergebnis 6c, Harness) werden überschaubar: jede Sektion ist ein
 * aufklappbarer Block. Touch-tauglich (Header ≥ 44px), A11y über
 * aria-expanded/aria-controls. Bewusst controlled (React-State, kein natives
 * <details>), damit der Stil konsistent zum Rest (Inline-Tokens) bleibt.
 *
 * Marker: `data-accordion="<title>"` + `data-open="0|1"` — erlaubt der
 * Mobile/UX-Verifikation, jeden Block gezielt zu öffnen und zu prüfen.
 */

"use client";

import * as React from "react";

export function Accordion({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}): React.ReactElement {
  const [open, setOpen] = React.useState(defaultOpen);
  const bodyId = React.useId();
  return (
    <section style={rootStyle} data-accordion={title} data-open={open ? "1" : "0"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
        style={headerStyle}
      >
        <span
          aria-hidden="true"
          style={{ ...chevronStyle, transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▸
        </span>
        <span style={titleStyle}>{title}</span>
        {subtitle ? <span style={subtitleStyle}>{subtitle}</span> : null}
      </button>
      {open ? (
        <div id={bodyId} style={bodyStyle}>
          {children}
        </div>
      ) : null}
    </section>
  );
}

const rootStyle: React.CSSProperties = {
  backgroundColor: "var(--c-surface)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-md)",
  boxShadow: "var(--sh-1)",
  marginBottom: "var(--sp-3)",
  overflow: "hidden",
};

const headerStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 44,
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  padding: "var(--sp-3) var(--sp-4)",
  background: "transparent",
  border: 0,
  cursor: "pointer",
  textAlign: "left",
};

const chevronStyle: React.CSSProperties = {
  flexShrink: 0,
  fontSize: 12,
  color: "var(--c-steel)",
  transition: "transform var(--t-fast) var(--ease-out)",
};

const titleStyle: React.CSSProperties = {
  flex: "1 1 auto",
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--c-text-muted)",
  minWidth: 0,
};

const subtitleStyle: React.CSSProperties = {
  flexShrink: 0,
  fontSize: "var(--fs-caption)",
  fontWeight: 400,
  textTransform: "none",
  letterSpacing: 0,
  color: "var(--c-text-muted)",
};

const bodyStyle: React.CSSProperties = {
  padding: "0 var(--sp-4) var(--sp-4)",
  // breite Kinder (Gantt/Matrix) sollen nicht die Card sprengen; min-width:0
  // erlaubt internen Scroll der .aegira-scroll-x-Regionen.
  minWidth: 0,
};
