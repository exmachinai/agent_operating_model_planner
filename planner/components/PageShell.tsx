/**
 * Gemeinsamer Seitenrahmen: Brand-Header + zentrierter Content.
 * Nutzt ausschließlich Design-Tokens aus app/styles/tokens.css.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { HelpButton } from "./HelpDrawer";
import type { HelpTopic } from "../lib/help";
import { SIGNET_NAVY_DATA_URI } from "../lib/brand-logo";

export function PageShell({
  subtitle,
  helpTopic,
  children,
}: {
  subtitle: string;
  /** Schaltet die kontextsensitive Hilfe für diese Seite frei. */
  helpTopic?: HelpTopic;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <main className="aegira-shell" style={pageStyle}>
      <header style={headerStyle}>
        <div style={brandRowStyle}>
          <Link href="/" aria-label="AEGIRA · Start" style={brandLinkStyle}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SIGNET_NAVY_DATA_URI}
              alt=""
              aria-hidden="true"
              width={34}
              height={34}
              style={signetStyle}
            />
            <span style={wordmarkStyle}>AEGIRA</span>
          </Link>
          <span style={sectionDividerStyle} aria-hidden>
            ·
          </span>
          <span style={brandTaglineStyle}>{subtitle}</span>
        </div>
        {helpTopic && <HelpButton topic={helpTopic} />}
      </header>
      {children}
    </main>
  );
}

// Breite/Padding kommen aus der .aegira-shell-Klasse (responsiv: mobil fluides
// clamp-Padding, ab md zentriert auf --content-max). Inline nur Schrift/Farbe.
const pageStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  color: "var(--c-text)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "var(--sp-8)",
};

const brandRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-3)",
  textDecoration: "none",
};

const brandLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  textDecoration: "none",
};

const signetStyle: React.CSSProperties = {
  height: 34,
  width: 34,
  display: "block",
  flexShrink: 0,
};

const wordmarkStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 22,
  letterSpacing: "0.08em",
  color: "var(--c-navy)",
};

const sectionDividerStyle: React.CSSProperties = {
  color: "var(--c-ice)",
  fontSize: 18,
  lineHeight: 1,
};

const brandTaglineStyle: React.CSSProperties = {
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--c-steel)",
};
