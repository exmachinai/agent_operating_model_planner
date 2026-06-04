/**
 * Explainer — Onboarding-Landing im Flow MFA → Explainer → Planner.
 *
 * Liegt hinter dem LockProvider (also hinter 2FA). Bettet den statischen
 * Explainer (`/explainer/index.html`, intern, noindex) ein und bietet den
 * Übergang zum Planner. „Weiter"/„nicht mehr anzeigen" merkt sich der Browser
 * (sessionStorage `aegira.explainer.seen` — pro MFA-Session, danach erscheint der
 * Explainer beim nächsten Login erneut), damit man innerhalb der Session direkt in
 * den Planner gelangt.
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

const SEEN_KEY = "aegira.explainer.seen";

export default function ExplainerPage(): React.ReactElement {
  const router = useRouter();

  const proceed = React.useCallback(
    (remember: boolean) => {
      try {
        if (remember) window.sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        /* localStorage nicht verfügbar */
      }
      router.push("/");
    },
    [router],
  );

  // Der eingebettete Explainer (iframe) signalisiert „weiter zur App" per postMessage,
  // statt per <a target="_top"> hart neu zu laden. So bleibt der LockProvider gemountet
  // und der Übergang ist clientseitig — kein kurzes Aufblitzen des MFA-/Lock-Screens.
  React.useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return; // nur eigene Origin akzeptieren
      if (e.data === "aegira:explainer-proceed") proceed(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [proceed]);

  return (
    <main style={pageStyle} data-testid="explainer">
      <header style={barStyle}>
        <span style={titleStyle}>Explainer · Zielgeführtes Generatives Projekt Management</span>
        <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <button type="button" style={ghostBtn} onClick={() => proceed(true)} data-testid="explainer-skip">
            Nicht mehr anzeigen
          </button>
          <button type="button" style={primaryBtn} onClick={() => proceed(true)} data-testid="explainer-continue">
            Weiter zum Planner →
          </button>
        </span>
      </header>
      <iframe
        src="/explainer/index.html"
        title="AEGIRA Explainer"
        style={frameStyle}
        data-testid="explainer-frame"
      />
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  height: "100dvh",
  background: "var(--c-bg)",
};
const barStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--sp-3)",
  padding: "var(--sp-2) var(--sp-4)",
  borderBottom: "1px solid var(--c-border)",
  background: "var(--c-surface)",
  // über der Safe-Area (iOS) ausrichten.
  paddingTop: "max(var(--sp-2), env(safe-area-inset-top))",
};
const titleStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--c-steel)",
};
const primaryBtn: React.CSSProperties = {
  minHeight: 40,
  padding: "0 16px",
  fontSize: 14,
  fontWeight: 600,
  color: "var(--c-vellum)",
  background: "var(--c-navy)",
  border: "1px solid var(--c-navy)",
  borderRadius: "var(--r-md)",
  cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  minHeight: 40,
  padding: "0 12px",
  fontSize: 13,
  color: "var(--c-steel)",
  background: "transparent",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-md)",
  cursor: "pointer",
};
const frameStyle: React.CSSProperties = {
  flex: 1,
  width: "100%",
  border: 0,
  display: "block",
};
