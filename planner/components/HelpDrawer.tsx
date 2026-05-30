/**
 * Kontextsensitive In-App-Hilfe: ein „?"-Button im Header öffnet einen seitlichen
 * Drawer mit der Hilfe zum aktuellen Schritt (HelpTopic). Inhalt kommt aus
 * lib/help.ts, damit Drawer und /guide-Seite dieselbe Quelle teilen.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { HELP, type HelpTopic } from "../lib/help";

export function HelpButton({ topic }: { topic: HelpTopic }): React.ReactElement {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Hilfe zu diesem Schritt"
        title="Hilfe zu diesem Schritt"
        style={triggerStyle}
      >
        <span aria-hidden style={triggerGlyph}>
          ?
        </span>
        Hilfe
      </button>
      {open && <HelpDrawer topic={topic} onClose={() => setOpen(false)} />}
    </>
  );
}

function HelpDrawer({
  topic,
  onClose,
}: {
  topic: HelpTopic;
  onClose: () => void;
}): React.ReactElement {
  const entry = HELP[topic];
  return (
    <div style={overlayStyle} onClick={onClose} role="presentation">
      <aside
        style={drawerStyle}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Hilfe — ${entry.title}`}
      >
        <div style={drawerHeadStyle}>
          <div>
            <div style={markerStyle}>{entry.marker}</div>
            <h2 style={titleStyle}>{entry.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Hilfe schließen"
            style={closeBtnStyle}
          >
            ✕
          </button>
        </div>

        <p style={summaryStyle}>{entry.summary}</p>

        <div style={bodyScrollStyle}>
          {entry.sections.map((sec, i) => (
            <section key={i} style={{ marginBottom: "var(--sp-4)" }}>
              <h3 style={sectionHeadStyle}>{sec.heading}</h3>
              {sec.body.map((p, j) => (
                <p key={j} style={paraStyle}>
                  {p}
                </p>
              ))}
            </section>
          ))}

          {entry.tips.length > 0 && (
            <section style={tipsBoxStyle}>
              <h3 style={sectionHeadStyle}>Hinweise</h3>
              <ul style={tipsListStyle}>
                {entry.tips.map((t, i) => (
                  <li key={i} style={tipItemStyle}>
                    {t}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div style={drawerFootStyle}>
          <Link href="/guide" style={guideLinkStyle} onClick={onClose}>
            Gesamten Leitfaden öffnen →
          </Link>
        </div>
      </aside>
    </div>
  );
}

const triggerStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  minHeight: 36,
  padding: "0 var(--sp-3)",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--c-navy)",
  backgroundColor: "transparent",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-pill)",
  cursor: "pointer",
};

const triggerGlyph: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  fontSize: 12,
  fontWeight: 700,
  color: "var(--c-vellum)",
  backgroundColor: "var(--c-navy)",
  borderRadius: "var(--r-pill)",
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(11, 19, 43, 0.4)",
  display: "flex",
  justifyContent: "flex-end",
  zIndex: 50,
};

const drawerStyle: React.CSSProperties = {
  width: "min(440px, 92vw)",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "var(--c-surface)",
  borderLeft: "1px solid var(--c-border)",
  boxShadow: "var(--sh-2)",
  padding: "var(--sp-5)",
  fontFamily: "var(--font-body)",
  color: "var(--c-text)",
};

const drawerHeadStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "var(--sp-3)",
};

const markerStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--c-gold)",
  fontWeight: 700,
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  fontWeight: 700,
  color: "var(--c-navy)",
  margin: "var(--sp-1) 0 0",
};

const closeBtnStyle: React.CSSProperties = {
  flexShrink: 0,
  width: 32,
  height: 32,
  fontSize: 16,
  color: "var(--c-text-muted)",
  backgroundColor: "transparent",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-md)",
  cursor: "pointer",
};

const summaryStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.5,
  color: "var(--c-text)",
  margin: "var(--sp-3) 0 var(--sp-4)",
  paddingBottom: "var(--sp-4)",
  borderBottom: "1px solid var(--c-border)",
};

const bodyScrollStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
};

const sectionHeadStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--c-text-muted)",
  margin: "0 0 var(--sp-2)",
};

const paraStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--c-text)",
  margin: "0 0 var(--sp-2)",
};

const tipsBoxStyle: React.CSSProperties = {
  padding: "var(--sp-3)",
  backgroundColor: "var(--c-vellum)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-md)",
  marginTop: "var(--sp-2)",
};

const tipsListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: "var(--sp-4)",
};

const tipItemStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--c-text)",
  marginBottom: "var(--sp-1)",
};

const drawerFootStyle: React.CSSProperties = {
  paddingTop: "var(--sp-4)",
  marginTop: "var(--sp-3)",
  borderTop: "1px solid var(--c-border)",
};

const guideLinkStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--c-navy)",
  textDecoration: "none",
};
