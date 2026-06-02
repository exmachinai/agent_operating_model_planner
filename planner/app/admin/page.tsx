/**
 * Adminbereich — Nutzerverwaltung (nur konfigurierter Admin).
 *
 * Liegt hinter dem Lock: der Admin meldet sich normal an (E-Mail+Passwort+2FA),
 * das Session-Token (aus sessionStorage, vom LockProvider gesetzt) autorisiert
 * die Admin-Endpunkte. Aktionen: sperren/entsperren, 2FA zurücksetzen, löschen.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { api, ApiError, type AdminUser } from "../../lib/api";

const SESSION_KEY = "aegira.session";

function readToken(): string | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { token?: string };
    return s.token ?? null;
  } catch {
    return null;
  }
}

export default function AdminPage(): React.ReactElement {
  const [token, setToken] = React.useState<string | null>(null);
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async (tok: string) => {
    setUsers(await api.adminListUsers(tok));
  }, []);

  React.useEffect(() => {
    const tok = readToken();
    setToken(tok);
    if (!tok) {
      setError("Nicht angemeldet. Bitte zuerst über die Startseite anmelden.");
      setLoading(false);
      return;
    }
    load(tok)
      .catch((e: unknown) =>
        setError(
          e instanceof ApiError && e.status === 403
            ? "Kein Adminzugriff für dieses Konto."
            : "Nutzerliste nicht ladbar.",
        ),
      )
      .finally(() => setLoading(false));
  }, [load]);

  async function act(
    email: string,
    fn: () => Promise<unknown>,
  ): Promise<void> {
    if (!token) return;
    setBusy(email);
    setError(null);
    try {
      await fn();
      await load(token);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={wrap}>
      <div style={headerRow}>
        <h1 style={{ margin: 0 }}>Adminbereich · Nutzer</h1>
        <Link href="/" style={backLink}>← Zur App</Link>
      </div>
      <p style={lead}>
        Selbst-registrierte Nutzer. Sperren verhindert die Anmeldung; „2FA
        zurücksetzen“ erzwingt eine neue Authenticator-Einrichtung beim nächsten Login.
      </p>

      {error ? <p style={errorBox}>{error}</p> : null}
      {loading ? <p>Lade…</p> : null}

      {!loading && !error ? (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>E-Mail</th>
                <th style={th}>Status</th>
                <th style={th}>2FA</th>
                <th style={th}>Rolle</th>
                <th style={th}>Letzter Login</th>
                <th style={th}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} style={{ opacity: u.disabled ? 0.55 : 1 }}>
                  <td style={td}>{u.email}</td>
                  <td style={td}>
                    {u.disabled ? (
                      <span style={{ color: "var(--c-red)" }}>gesperrt</span>
                    ) : u.email_verified ? (
                      <span style={{ color: "var(--c-green)" }}>aktiv</span>
                    ) : (
                      <span style={{ color: "var(--c-amber)" }}>unbestätigt</span>
                    )}
                  </td>
                  <td style={td}>{u.totp_enrolled ? "✓" : "—"}</td>
                  <td style={td}>{u.is_admin ? "Admin" : "Nutzer"}</td>
                  <td style={td}>
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString("de-DE") : "—"}
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap" }}>
                    {u.disabled ? (
                      <button style={btn} disabled={busy === u.email}
                        onClick={() => act(u.email, () => api.adminUserAction(token!, u.email, "enable"))}>
                        Entsperren
                      </button>
                    ) : (
                      <button style={btn} disabled={busy === u.email || u.is_admin}
                        title={u.is_admin ? "Admin kann nicht gesperrt werden" : ""}
                        onClick={() => act(u.email, () => api.adminUserAction(token!, u.email, "disable"))}>
                        Sperren
                      </button>
                    )}
                    <button style={btn} disabled={busy === u.email}
                      onClick={() => act(u.email, () => api.adminUserAction(token!, u.email, "reset-2fa"))}>
                      2FA reset
                    </button>
                    <button style={{ ...btn, ...btnDanger }} disabled={busy === u.email || u.is_admin}
                      title={u.is_admin ? "Admin kann nicht gelöscht werden" : ""}
                      onClick={() => {
                        if (window.confirm(`Nutzer ${u.email} wirklich löschen?`)) {
                          void act(u.email, () => api.adminDeleteUser(token!, u.email));
                        }
                      }}>
                      Löschen
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 ? (
                <tr><td style={td} colSpan={6}>Noch keine Nutzer.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}

const wrap: React.CSSProperties = { maxWidth: 920, margin: "0 auto", padding: "var(--sp-5) var(--sp-4)" };
const headerRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--sp-2)" };
const backLink: React.CSSProperties = { fontSize: 14, color: "var(--c-steel)", textDecoration: "none" };
const lead: React.CSSProperties = { color: "var(--c-text-muted)", fontSize: 14, lineHeight: 1.5, margin: "var(--sp-2) 0 var(--sp-4)" };
const tableWrap: React.CSSProperties = { overflowX: "auto", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th: React.CSSProperties = { textAlign: "left", padding: "var(--sp-2) var(--sp-3)", borderBottom: "1px solid var(--c-border)", color: "var(--c-text-muted)", fontWeight: 600, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "var(--sp-2) var(--sp-3)", borderBottom: "1px solid var(--c-border)" };
const btn: React.CSSProperties = {
  fontSize: 12, padding: "6px 10px", marginRight: 6, minHeight: 36,
  border: "1px solid var(--c-border-strong)", borderRadius: "var(--r-md)",
  backgroundColor: "var(--c-surface)", color: "var(--c-text)", cursor: "pointer",
};
const btnDanger: React.CSSProperties = { color: "var(--c-red)", borderColor: "var(--c-red)" };
const errorBox: React.CSSProperties = {
  padding: "var(--sp-3) var(--sp-4)", backgroundColor: "rgba(195,66,63,0.08)",
  border: "1px solid var(--c-red)", borderRadius: "var(--r-md)", color: "var(--c-red)", marginBottom: "var(--sp-4)",
};
