/**
 * Kontextsensitive In-App-Hilfe: ein „?"-Button im Header öffnet einen seitlichen
 * Drawer mit der Hilfe zum aktuellen Schritt (HelpTopic). Inhalt kommt aus
 * lib/help.ts, damit Drawer und /guide-Seite dieselbe Quelle teilen.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { HELP, sectionId, type HelpTopic } from "../lib/help";

/** Event-Name für kontextuelles Öffnen der Hilfe aus dem Arbeitsbereich. */
const HELP_EVENT = "aegira:help";

interface HelpEventDetail {
  section?: string;
}

/**
 * Inline-Hilfe-Verweis: ein kleines „?“ neben einem Abschnitt im Arbeitsbereich.
 * Öffnet den Hilfe-Drawer der aktuellen Seite und springt zur passenden Sektion.
 */
export function HelpLink({
  section,
  label = "Hilfe",
}: {
  section: string;
  label?: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      style={inlineHelpStyle}
      aria-label={`Hilfe: ${label}`}
      title={`Hilfe: ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        window.dispatchEvent(new CustomEvent<HelpEventDetail>(HELP_EVENT, { detail: { section } }));
      }}
    >
      ?
    </button>
  );
}

export function HelpButton({ topic }: { topic: HelpTopic }): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [target, setTarget] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<HelpEventDetail>).detail;
      setTarget(detail?.section);
      setOpen(true);
    };
    window.addEventListener(HELP_EVENT, onOpen as EventListener);
    return () => window.removeEventListener(HELP_EVENT, onOpen as EventListener);
  }, []);

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
        data-testid="help-button"
        onClick={() => { setTarget(undefined); setOpen(true); }}
        aria-label="Hilfe zu diesem Schritt"
        title="Hilfe zu diesem Schritt"
        style={triggerStyle}
      >
        <span aria-hidden style={triggerGlyph}>
          ?
        </span>
        Hilfe
      </button>
      {open && <HelpDrawer topic={topic} scrollTo={target} onClose={() => setOpen(false)} />}
    </>
  );
}

function HelpDrawer({
  topic,
  scrollTo,
  onClose,
}: {
  topic: HelpTopic;
  scrollTo?: string;
  onClose: () => void;
}): React.ReactElement {
  const entry = HELP[topic];
  const [flash, setFlash] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (!scrollTo) return;
    const el = document.getElementById(`help-sec-${scrollTo}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setFlash(scrollTo);
      const t = window.setTimeout(() => setFlash(undefined), 1600);
      return () => window.clearTimeout(t);
    }
  }, [scrollTo]);

  return (
    <div style={overlayStyle} onClick={onClose} role="presentation">
      <aside
        style={drawerStyle}
        data-testid="help-drawer"
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

        <p data-testid="help-summary" style={summaryStyle}>{entry.summary}</p>

        <div data-testid="help-body" style={bodyScrollStyle}>
          {entry.sections.map((sec, i) => {
            const sid = sectionId(sec);
            return (
            <section
              key={i}
              id={`help-sec-${sid}`}
              style={{
                marginBottom: "var(--sp-4)",
                scrollMarginTop: "var(--sp-2)",
                backgroundColor: flash === sid ? "rgba(193,154,79,0.14)" : "transparent",
                borderRadius: "var(--r-sm)",
                transition: "background-color 0.6s ease",
                padding: flash === sid ? "var(--sp-2)" : 0,
              }}
            >
              <h3 style={sectionHeadStyle}>{sec.heading}</h3>
              {sec.body.map((p, j) => (
                <p key={j} style={paraStyle}>
                  {p}
                </p>
              ))}
            </section>
            );
          })}

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
          <Link
            href="/explainer"
            data-testid="help-explainer-link"
            style={footBtnSecondaryStyle}
            onClick={onClose}
          >
            ← Zum Explainer
          </Link>
          <Link
            href="/guide"
            data-testid="help-guide-link"
            style={footBtnPrimaryStyle}
            onClick={onClose}
          >
            Gesamten Leitfaden öffnen →
          </Link>
        </div>
      </aside>
    </div>
  );
}

const inlineHelpStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 18,
  height: 18,
  marginLeft: 6,
  fontSize: 11,
  fontWeight: 700,
  lineHeight: 1,
  color: "var(--c-navy)",
  backgroundColor: "transparent",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-pill)",
  cursor: "pointer",
  verticalAlign: "middle",
};
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
  width: "min(640px, 96vw)",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: "var(--c-surface)",
  borderLeft: "1px solid var(--c-border)",
  boxShadow: "var(--sh-2)",
  // Großzügiges, asymmetrisches Padding: Text sitzt nicht am linken Rand.
  padding: "32px 40px",
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
  fontSize: 16,
  lineHeight: 1.6,
  color: "var(--c-text)",
  margin: "var(--sp-3) 0 var(--sp-5)",
  paddingBottom: "var(--sp-4)",
  borderBottom: "1px solid var(--c-border)",
};

const bodyScrollStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  paddingRight: "6px",
};

const sectionHeadStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--c-navy)",
  borderLeft: "3px solid var(--c-gold)",
  paddingLeft: "10px",
  margin: "0 0 var(--sp-2)",
};

const paraStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.7,
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
  display: "flex",
  gap: "12px",
  alignItems: "stretch",
  paddingTop: "18px",
  marginTop: "16px",
  borderTop: "1px solid var(--c-border)",
};

const footBtnPrimaryStyle: React.CSSProperties = {
  flex: "1 1 auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 20px",
  fontSize: 15,
  fontWeight: 700,
  color: "var(--c-vellum)",
  backgroundColor: "var(--c-navy)",
  border: "1px solid var(--c-navy)",
  borderRadius: "var(--r-md)",
  textDecoration: "none",
  boxShadow: "var(--sh-1)",
};

const footBtnSecondaryStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 16px",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--c-navy)",
  backgroundColor: "transparent",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-md)",
  textDecoration: "none",
  whiteSpace: "nowrap",
};
