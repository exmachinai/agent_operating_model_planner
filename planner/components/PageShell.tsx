/**
 * Gemeinsamer Seitenrahmen: Brand-Header + zentrierter Content.
 * Nutzt ausschließlich Design-Tokens aus app/styles/tokens.css.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { HelpButton } from "./HelpDrawer";
import type { HelpTopic } from "../lib/help";
import { AOMP_LOGO_NAVY_DATA_URI } from "../lib/brand-logo";

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
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div style={brandRowStyle}>
          <Link href="/" aria-label="AEGIRA — Agent Operating Model Planner · Start">
            <img
              src={AOMP_LOGO_NAVY_DATA_URI}
              alt="AEGIRA — Agent Operating Model Planner"
              style={logoStyle}
            />
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

const pageStyle: React.CSSProperties = {
  maxWidth: "var(--content-max)",
  margin: "0 auto",
  padding: "var(--sp-8) var(--sp-4)",
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

const logoStyle: React.CSSProperties = {
  height: 46,
  width: "auto",
  display: "block",
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
