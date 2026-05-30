/**
 * Gemeinsamer Seitenrahmen: Brand-Header + zentrierter Content.
 * Nutzt ausschließlich Design-Tokens aus app/styles/tokens.css.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { HelpButton } from "./HelpDrawer";
import type { HelpTopic } from "../lib/help";

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
        <Link href="/" style={brandRowStyle}>
          <img
            src="/logos/aegira-signet-navy.svg"
            alt=""
            width={36}
            height={36}
            aria-hidden
          />
          <div>
            <div style={brandTextStyle}>AEGIRA</div>
            <div style={brandTaglineStyle}>Planner · {subtitle}</div>
          </div>
        </Link>
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

const brandTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: 20,
  letterSpacing: "0.08em",
  color: "var(--c-navy)",
};

const brandTaglineStyle: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--c-gray)",
  marginTop: 2,
};
