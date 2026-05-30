/**
 * Gesamter Leitfaden: alle Prozessschritte und Gates auf einer Seite.
 * Teilt die Inhalts-Quelle (lib/help.ts) mit dem kontextsensitiven Drawer,
 * damit In-App-Hilfe und Leitfaden nie auseinanderlaufen.
 */

"use client";

import * as React from "react";
import { PageShell } from "../../components/PageShell";
import { cardStyle } from "../../components/ui";
import { HELP, HELP_ORDER, GATES } from "../../lib/help";

export default function GuidePage(): React.ReactElement {
  return (
    <PageShell subtitle="Leitfaden">
      <h1 style={{ marginBottom: "var(--sp-2)" }}>AEGIRA Planner — Leitfaden</h1>
      <p style={leadStyle}>
        Der Planner führt dein Vorhaben in drei Phasen — VERSTEHEN, PLANEN,
        BAUEN — mit drei menschlichen Freigaben (Gates). Jeder Schritt erzeugt
        nachvollziehbare Evidenz. Diese Seite fasst alle Schritte zusammen; die
        kontextsensitive Hilfe (Button „Hilfe“ oben rechts) zeigt sie pro Schritt.
      </p>

      <nav style={tocStyle} aria-label="Inhalt">
        {HELP_ORDER.map((topic) => (
          <a key={topic} href={`#${topic}`} style={tocLinkStyle}>
            {HELP[topic].marker}: {HELP[topic].title}
          </a>
        ))}
      </nav>

      {HELP_ORDER.map((topic) => {
        const entry = HELP[topic];
        return (
          <section key={topic} id={topic} style={{ ...cardStyle, marginBottom: "var(--sp-4)" }}>
            <div style={markerStyle}>{entry.marker}</div>
            <h2 style={entryTitleStyle}>{entry.title}</h2>
            <p style={summaryStyle}>{entry.summary}</p>

            {entry.sections.map((sec, i) => (
              <div key={i} style={{ marginBottom: "var(--sp-3)" }}>
                <h3 style={sectionHeadStyle}>{sec.heading}</h3>
                {sec.body.map((p, j) => (
                  <p key={j} style={paraStyle}>
                    {p}
                  </p>
                ))}
              </div>
            ))}

            {entry.tips.length > 0 && (
              <ul style={tipsListStyle}>
                {entry.tips.map((t, i) => (
                  <li key={i} style={tipItemStyle}>
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <h2 style={{ marginTop: "var(--sp-6)", marginBottom: "var(--sp-3)" }}>
        Die drei Gates
      </h2>
      <p style={leadStyle}>
        Gates sind bewusste menschliche Entscheidungen (Human-in-the-Loop). Sie
        markieren den Übergang zwischen den Phasen und frieren jeweils einen
        belastbaren Stand ein.
      </p>
      {(["gate1", "gate2", "gate3"] as const).map((g) => {
        const entry = GATES[g];
        return (
          <section key={g} style={{ ...cardStyle, marginBottom: "var(--sp-4)" }}>
            <div style={{ ...markerStyle, color: "var(--c-green)" }}>{entry.marker}</div>
            <h2 style={entryTitleStyle}>{entry.title}</h2>
            <p style={summaryStyle}>{entry.summary}</p>
            {entry.sections.map((sec, i) => (
              <div key={i} style={{ marginBottom: "var(--sp-3)" }}>
                <h3 style={sectionHeadStyle}>{sec.heading}</h3>
                {sec.body.map((p, j) => (
                  <p key={j} style={paraStyle}>
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </section>
        );
      })}
    </PageShell>
  );
}

const leadStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.6,
  color: "var(--c-text-muted)",
  maxWidth: "60ch",
  marginBottom: "var(--sp-5)",
};

const tocStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--sp-2)",
  marginBottom: "var(--sp-6)",
};

const tocLinkStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--c-navy)",
  textDecoration: "none",
  padding: "var(--sp-1) var(--sp-3)",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-pill)",
};

const markerStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--c-gold)",
  fontWeight: 700,
};

const entryTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: 22,
  fontWeight: 700,
  color: "var(--c-navy)",
  margin: "var(--sp-1) 0 var(--sp-2)",
};

const summaryStyle: React.CSSProperties = {
  fontSize: 15,
  lineHeight: 1.5,
  color: "var(--c-text)",
  marginBottom: "var(--sp-3)",
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

const tipsListStyle: React.CSSProperties = {
  margin: "var(--sp-2) 0 0",
  paddingLeft: "var(--sp-4)",
};

const tipItemStyle: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.6,
  color: "var(--c-text)",
  marginBottom: "var(--sp-1)",
};
