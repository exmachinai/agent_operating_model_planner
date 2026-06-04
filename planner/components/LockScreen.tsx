/**
 * LockScreen — Multi-User-Sicherheits-Gate.
 *
 * Spec: docs/06_azure-configuration-guide.md §14. Flows:
 *   - Registrieren: E-Mail + Passwort → Magic-Link-Bestätigung (POST /v1/auth/register).
 *   - Anmelden: E-Mail + Passwort (Faktor 1) → TOTP-Code (Faktor 2, Authenticator).
 *     Beim ersten Login QR-Self-Enrollment. Erfolg → Session-Token via onUnlocked.
 *
 * Passwörter werden NIE im Client geprüft — nur ans Backend gesendet. Diese
 * Komponente entscheidet NICHT, WANN gesperrt wird (LockProvider).
 *
 * Accessibility: role=dialog, aria-modal, Initial-Fokus, Esc entsperrt nicht.
 */

"use client";

import * as React from "react";
import { SIGNET_WHITE_DATA_URI } from "../lib/brand-logo";
import { api, ApiError, type LoginResponse } from "../lib/api";

export interface LockScreenProps {
  isLocked: boolean;
  lockedAt: Date;
  /** token, exp (Unix-Sek.), is_admin — bei erfolgreicher Anmeldung. */
  onUnlocked: (token: string, expiresAt: number, isAdmin: boolean) => void;
}

type Mode = "login" | "register" | "totp";

export function LockScreen({ isLocked, lockedAt, onUnlocked }: LockScreenProps): React.ReactElement | null {
  const [mode, setMode] = React.useState<Mode>("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [password2, setPassword2] = React.useState("");
  const [code, setCode] = React.useState("");
  const [challenge, setChallenge] = React.useState<LoginResponse | null>(null);
  const [showQr, setShowQr] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [info, setInfo] = React.useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = React.useState<string | null>(null);
  const [escHint, setEscHint] = React.useState(false);

  const emailRef = React.useRef<HTMLInputElement>(null);
  const codeRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!isLocked) return;
    const id = window.setTimeout(() => emailRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        setEscHint(true);
        window.setTimeout(() => setEscHint(false), 3000);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [isLocked]);

  React.useEffect(() => {
    if (mode === "totp") codeRef.current?.focus();
  }, [mode]);

  if (!isLocked) return null;

  function resetMsgs(): void {
    setError(null);
    setInfo(null);
    setVerifyUrl(null);
  }

  async function doLogin(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    resetMsgs();
    try {
      const ch = await api.authLogin(email.trim(), password);
      setChallenge(ch);
      setShowQr(ch.status === "totp_enroll");
      setMode("totp");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(err.message || "Bitte zuerst die E-Mail-Adresse bestätigen.");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("E-Mail oder Passwort ist falsch.");
      } else {
        setError("Anmeldung fehlgeschlagen — bitte erneut versuchen.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function doRegister(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (password !== password2) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    resetMsgs();
    try {
      const res = await api.authRegister(email.trim(), password);
      if (res.verify_url) {
        // Dev-Stub: kein echter Mailversand → Link direkt anbieten.
        setVerifyUrl(res.verify_url);
        setInfo("Konto angelegt. Bestätige die E-Mail über den Link unten, dann anmelden.");
      } else {
        setInfo("Konto angelegt. Wir haben dir einen Bestätigungslink per E-Mail geschickt.");
      }
      setMode("login");
      setPassword2("");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Diese E-Mail ist bereits registriert. Bitte anmelden.");
      } else if (err instanceof ApiError && err.status === 422) {
        setError("Bitte eine gültige E-Mail und ein Passwort mit mind. 8 Zeichen verwenden.");
      } else {
        setError("Registrierung fehlgeschlagen — bitte erneut versuchen.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function doUnlock(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    resetMsgs();
    try {
      const res = await api.authUnlock(email.trim(), password, code.trim());
      onUnlocked(res.token, res.expires_at, res.is_admin);
    } catch {
      setError("Der 2FA-Code stimmt nicht (oder ist abgelaufen).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aegira-lock-title"
      style={styles.root}
    >
      <span role="status" aria-live="assertive" style={styles.srOnly}>
        Anmeldung erforderlich.
      </span>

      <div style={styles.card} className="aegira-hairline-strong">
        <div style={styles.brandRow}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SIGNET_WHITE_DATA_URI} alt="" width={36} height={36} aria-hidden="true" style={styles.signet} />
          <div>
            <div style={styles.brandName}>AEGIRA</div>
          </div>
        </div>

        <h1 id="aegira-lock-title" style={styles.title}>
          {mode === "register" ? "Registrieren" : mode === "totp" ? "Zwei-Faktor" : "Anmelden"}
        </h1>
        <p style={styles.identity}>
          {mode === "register"
            ? "Eigenes Konto erstellen — E-Mail-Bestätigung erforderlich."
            : mode === "totp"
              ? "Gib den 6-stelligen Code aus deiner Authenticator-App ein."
              : "Mit E-Mail, Passwort und Authenticator-Code anmelden."}
        </p>

        {info ? (
          <p role="status" style={styles.info}>
            {info}
            {verifyUrl ? (
              <>
                {" "}
                <a href={verifyUrl} style={styles.infoLink}>
                  Jetzt bestätigen →
                </a>
              </>
            ) : null}
          </p>
        ) : null}

        {mode === "login" ? (
          <form onSubmit={doLogin}>
            <Field id="lk-email" label="E-Mail" inputRef={emailRef}>
              <input id="lk-email" ref={emailRef} type="email" autoComplete="username" inputMode="email"
                value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} required />
            </Field>
            <Field id="lk-pw" label="Passwort">
              <input id="lk-pw" type="password" autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} required />
            </Field>
            {error ? <p role="alert" style={styles.error}>{error}</p> : null}
            <button type="submit" disabled={busy || !email || !password} style={styles.primaryBtn}>
              {busy ? "Prüfe…" : "Anmelden"}
            </button>
            <button type="button" style={styles.linkBtn} onClick={() => { setMode("register"); resetMsgs(); }}>
              Noch kein Konto? Registrieren
            </button>
          </form>
        ) : mode === "register" ? (
          <form onSubmit={doRegister}>
            <Field id="rg-email" label="E-Mail">
              <input id="rg-email" ref={emailRef} type="email" autoComplete="username" inputMode="email"
                value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} required />
            </Field>
            <Field id="rg-pw" label="Passwort (mind. 8 Zeichen)">
              <input id="rg-pw" type="password" autoComplete="new-password" minLength={8}
                value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} required />
            </Field>
            <Field id="rg-pw2" label="Passwort wiederholen">
              <input id="rg-pw2" type="password" autoComplete="new-password"
                value={password2} onChange={(e) => setPassword2(e.target.value)} style={styles.input} required />
            </Field>
            {error ? <p role="alert" style={styles.error}>{error}</p> : null}
            <button type="submit" disabled={busy || !email || password.length < 8} style={styles.primaryBtn}>
              {busy ? "Lege an…" : "Konto erstellen"}
            </button>
            <button type="button" style={styles.linkBtn} onClick={() => { setMode("login"); resetMsgs(); }}>
              ← Zurück zur Anmeldung
            </button>
          </form>
        ) : (
          <form onSubmit={doUnlock}>
            <Field id="lk-code" label="2FA-Code (6-stellig)">
              <input id="lk-code" ref={codeRef} type="text" inputMode="numeric" autoComplete="one-time-code"
                pattern="[0-9]*" maxLength={6} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                style={{ ...styles.input, letterSpacing: "0.4em", fontFamily: "var(--font-mono)" }} required />
            </Field>
            {error ? <p role="alert" style={styles.error}>{error}</p> : null}
            <button type="submit" disabled={busy || code.length < 6} style={styles.primaryBtn}>
              {busy ? "Prüfe…" : "Anmelden"}
            </button>

            {challenge?.qr_svg ? (
              <>
                <button type="button" style={styles.linkBtn} aria-expanded={showQr} onClick={() => setShowQr((v) => !v)}>
                  {showQr ? "▾ " : "▸ "}Authenticator einrichten (QR anzeigen)
                </button>
                {showQr ? (
                  <div style={styles.qrBox}>
                    <p style={styles.qrHint}>
                      Scanne den QR-Code in Microsoft Authenticator (oder einer TOTP-App), dann gib den Code ein.
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={challenge.qr_svg} alt="QR-Code" width={180} height={180} style={styles.qr} />
                    <p style={styles.manual}>Konto: <code>{challenge.account}</code></p>
                  </div>
                ) : null}
              </>
            ) : null}

            <button type="button" style={styles.linkBtn} onClick={() => { setMode("login"); setCode(""); resetMsgs(); }}>
              ← Zurück
            </button>
          </form>
        )}

        <hr style={styles.divider} />
        <p style={styles.meta}>
          Gesperrt seit:{" "}
          {new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(lockedAt)}
        </p>
        {escHint ? <p role="status" style={styles.escHint}>Esc entsperrt die Sitzung nicht.</p> : null}
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <label htmlFor={id} style={styles.fieldLabel}>
        {label}
      </label>
      {children}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "grid",
    placeItems: "center",
    backgroundColor: "rgba(11, 20, 62, 0.92)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    fontFamily: "var(--font-body)",
    color: "var(--c-vellum)",
    padding: "var(--sp-4)",
    overflowY: "auto",
  },
  card: {
    width: "min(440px, 92vw)",
    padding: "var(--sp-6)",
    backgroundColor: "var(--c-navy)",
    color: "var(--c-vellum)",
    borderRadius: "var(--r-lg)",
    boxShadow: "var(--sh-2)",
    margin: "auto",
  },
  brandRow: { display: "flex", alignItems: "center", gap: "var(--sp-3)", marginBottom: "var(--sp-5)" },
  signet: { width: 36, height: 36, display: "block", flexShrink: 0 },
  brandName: {
    fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18,
    letterSpacing: "0.08em", color: "var(--c-vellum)",
  },
  brandTagline: {
    fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase",
    color: "var(--c-ice)", marginTop: 2,
  },
  title: {
    fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26,
    lineHeight: 1.15, color: "var(--c-vellum)", margin: 0,
  },
  identity: { marginTop: "var(--sp-2)", marginBottom: "var(--sp-4)", fontSize: 14, lineHeight: 1.5, color: "var(--c-ice)" },
  fieldLabel: { display: "block", fontSize: 12, fontWeight: 600, color: "var(--c-ice)", margin: "var(--sp-2) 0 4px" },
  input: {
    width: "100%", minHeight: 44, boxSizing: "border-box",
    padding: "var(--sp-2) var(--sp-3)", fontSize: 16,
    color: "var(--c-ink)", backgroundColor: "var(--c-vellum)",
    border: "1px solid rgba(202,220,252,0.3)", borderRadius: "var(--r-md)",
  },
  primaryBtn: {
    width: "100%", minHeight: 44, marginTop: "var(--sp-4)",
    backgroundColor: "var(--c-gold)", color: "var(--c-navy-dark)",
    fontFamily: "var(--font-body)", fontWeight: 600, fontSize: 14, letterSpacing: "0.02em",
    border: 0, borderRadius: "var(--r-md)", padding: "var(--sp-3) var(--sp-4)", cursor: "pointer",
  },
  linkBtn: {
    display: "block", width: "100%", background: "transparent", border: 0,
    color: "var(--c-vellum)", textDecoration: "underline", cursor: "pointer",
    fontSize: 13, padding: "var(--sp-2) 0", marginTop: "var(--sp-1)", textAlign: "left", minHeight: 44,
  },
  qrBox: {
    marginTop: "var(--sp-2)", padding: "var(--sp-3)",
    backgroundColor: "rgba(202,220,252,0.06)", borderRadius: "var(--r-md)", textAlign: "center",
  },
  qrHint: { fontSize: 12, color: "var(--c-ice)", margin: "0 0 var(--sp-2)", lineHeight: 1.4, textAlign: "left" },
  qr: { width: 180, height: 180, background: "#fff", borderRadius: "var(--r-sm)", padding: 6 },
  manual: { fontSize: 11, color: "var(--c-ice)", marginTop: "var(--sp-2)", wordBreak: "break-all" },
  error: { marginTop: "var(--sp-2)", marginBottom: 0, fontSize: 13, color: "var(--c-gold)", fontWeight: 600 },
  info: {
    marginTop: 0, marginBottom: "var(--sp-3)", fontSize: 13, lineHeight: 1.5,
    color: "var(--c-vellum)", backgroundColor: "rgba(202,220,252,0.08)",
    padding: "var(--sp-2) var(--sp-3)", borderRadius: "var(--r-md)",
  },
  infoLink: { color: "var(--c-gold)", fontWeight: 600 },
  divider: { margin: "var(--sp-5) 0 var(--sp-3)", border: 0, borderTop: "1px solid rgba(202, 220, 252, 0.16)" },
  meta: { fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.6, color: "var(--c-ice)", margin: 0 },
  escHint: { marginTop: "var(--sp-2)", fontSize: 12, color: "var(--c-gold)" },
  srOnly: {
    position: "absolute", width: 1, height: 1, padding: 0, margin: -1,
    overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0,
  },
};
