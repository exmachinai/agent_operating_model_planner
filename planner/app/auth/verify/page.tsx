/**
 * E-Mail-Bestätigung — Ziel des Magic-Links aus der Registrierungs-Mail.
 * Liest `?token=…`, ruft POST /v1/auth/verify und zeigt das Ergebnis.
 * Liegt unter /auth/* → vom LockProvider NICHT gesperrt (Zugang vor dem Login).
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "../../../lib/api";

type State = "working" | "ok" | "error";

function VerifyInner(): React.ReactElement {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = React.useState<State>("working");
  const [msg, setMsg] = React.useState("");

  React.useEffect(() => {
    if (!token) {
      setState("error");
      setMsg("Kein Token im Link gefunden.");
      return;
    }
    let alive = true;
    api
      .authVerify(token)
      .then((res) => {
        if (!alive) return;
        setState("ok");
        setMsg(`E-Mail bestätigt: ${res.email}. Du kannst dich jetzt anmelden.`);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setState("error");
        setMsg(e instanceof ApiError ? e.message : "Bestätigung fehlgeschlagen.");
      });
    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <main style={wrap}>
      <div style={card}>
        <div style={brand}>AEGIRA</div>
        <h1 style={title}>E-Mail-Bestätigung</h1>
        <p style={{ ...text, color: state === "error" ? "var(--c-red)" : "var(--c-text)" }}>
          {state === "working" ? "Bestätige…" : msg}
        </p>
        {state === "ok" ? (
          <Link href="/" style={btn}>
            Zur Anmeldung
          </Link>
        ) : null}
        {state === "error" ? (
          <Link href="/" style={{ ...btn, backgroundColor: "var(--c-steel)" }}>
            Zur Startseite
          </Link>
        ) : null}
      </div>
    </main>
  );
}

export default function VerifyPage(): React.ReactElement {
  return (
    <React.Suspense fallback={<main style={wrap}><div style={card}>Lade…</div></main>}>
      <VerifyInner />
    </React.Suspense>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: "var(--sp-4)",
  backgroundColor: "var(--c-bg)",
};
const card: React.CSSProperties = {
  width: "min(440px, 92vw)",
  padding: "var(--sp-6)",
  backgroundColor: "var(--c-surface)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-lg)",
  boxShadow: "var(--sh-1)",
};
const brand: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  letterSpacing: "0.08em",
  color: "var(--c-navy)",
};
const title: React.CSSProperties = { fontSize: 22, margin: "var(--sp-2) 0" };
const text: React.CSSProperties = { fontSize: 15, lineHeight: 1.5 };
const btn: React.CSSProperties = {
  display: "inline-block",
  marginTop: "var(--sp-4)",
  padding: "var(--sp-2) var(--sp-4)",
  minHeight: 44,
  lineHeight: "28px",
  backgroundColor: "var(--c-gold)",
  color: "var(--c-navy-dark)",
  fontWeight: 600,
  borderRadius: "var(--r-md)",
  textDecoration: "none",
};
