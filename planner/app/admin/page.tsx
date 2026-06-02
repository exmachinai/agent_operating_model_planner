/**
 * Adminbereich (v0.8) — Tabs: Nutzerverwaltung + Skill-Freigabeliste.
 *
 * Hinter dem Lock: der Admin meldet sich normal an; das Session-Token (aus
 * sessionStorage, vom LockProvider gesetzt) autorisiert die Admin-Endpunkte.
 *  - Nutzer: sperren/entsperren, 2FA zurücksetzen, löschen.
 *  - Skills: freigeben/sperren, eigene Skills hinzufügen/löschen (globale Liste).
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { api, ApiError, type AdminUser, type SkillAdminView } from "../../lib/api";

const SESSION_KEY = "aegira.session";

function readToken(): string | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { token?: string }).token ?? null;
  } catch {
    return null;
  }
}

export default function AdminPage(): React.ReactElement {
  const [token, setToken] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"users" | "skills">("users");
  const [authError, setAuthError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const tok = readToken();
    setToken(tok);
    if (!tok) setAuthError("Nicht angemeldet. Bitte zuerst über die Startseite anmelden.");
  }, []);

  return (
    <main style={wrap}>
      <div style={headerRow}>
        <h1 style={{ margin: 0 }}>Adminbereich</h1>
        <Link href="/" style={backLink}>← Zur App</Link>
      </div>

      <div style={tabsRow} role="tablist">
        <button type="button" role="tab" aria-selected={tab === "users"}
          style={tab === "users" ? tabActive : tabIdle} onClick={() => setTab("users")}>
          Nutzer
        </button>
        <button type="button" role="tab" aria-selected={tab === "skills"}
          style={tab === "skills" ? tabActive : tabIdle} onClick={() => setTab("skills")}>
          Skills
        </button>
      </div>

      {authError ? <p style={errorBox}>{authError}</p> : null}
      {token && tab === "users" ? <UsersPanel token={token} /> : null}
      {token && tab === "skills" ? <SkillsPanel token={token} /> : null}
    </main>
  );
}

// --- Nutzer ------------------------------------------------------------------

function UsersPanel({ token }: { token: string }): React.ReactElement {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => setUsers(await api.adminListUsers(token)), [token]);

  React.useEffect(() => {
    load()
      .catch((e: unknown) =>
        setError(e instanceof ApiError && e.status === 403 ? "Kein Adminzugriff für dieses Konto." : "Nutzerliste nicht ladbar."))
      .finally(() => setLoading(false));
  }, [load]);

  async function act(email: string, fn: () => Promise<unknown>): Promise<void> {
    setBusy(email); setError(null);
    try { await fn(); await load(); }
    catch (e: unknown) { setError(e instanceof ApiError ? e.message : "Aktion fehlgeschlagen."); }
    finally { setBusy(null); }
  }

  if (loading) return <p>Lade…</p>;
  if (error) return <p style={errorBox}>{error}</p>;

  return (
    <>
      <p style={lead}>Selbst-registrierte Nutzer. Sperren verhindert die Anmeldung; „2FA zurücksetzen“ erzwingt eine neue Authenticator-Einrichtung.</p>
      <div style={tableWrap}>
        <table style={table}>
          <thead><tr>
            <th style={th}>E-Mail</th><th style={th}>Status</th><th style={th}>2FA</th><th style={th}>Rolle</th><th style={th}>Letzter Login</th><th style={th}>Aktionen</th>
          </tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email} style={{ opacity: u.disabled ? 0.55 : 1 }}>
                <td style={td}>{u.email}</td>
                <td style={td}>{u.disabled ? <span style={{ color: "var(--c-red)" }}>gesperrt</span> : u.email_verified ? <span style={{ color: "var(--c-green)" }}>aktiv</span> : <span style={{ color: "var(--c-amber)" }}>unbestätigt</span>}</td>
                <td style={td}>{u.totp_enrolled ? "✓" : "—"}</td>
                <td style={td}>{u.is_admin ? "Admin" : "Nutzer"}</td>
                <td style={td}>{u.last_login_at ? new Date(u.last_login_at).toLocaleString("de-DE") : "—"}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  {u.disabled
                    ? <button style={btn} disabled={busy === u.email} onClick={() => act(u.email, () => api.adminUserAction(token, u.email, "enable"))}>Entsperren</button>
                    : <button style={btn} disabled={busy === u.email || u.is_admin} title={u.is_admin ? "Admin" : ""} onClick={() => act(u.email, () => api.adminUserAction(token, u.email, "disable"))}>Sperren</button>}
                  <button style={btn} disabled={busy === u.email} onClick={() => act(u.email, () => api.adminUserAction(token, u.email, "reset-2fa"))}>2FA reset</button>
                  <button style={{ ...btn, ...btnDanger }} disabled={busy === u.email || u.is_admin} onClick={() => { if (window.confirm(`Nutzer ${u.email} löschen?`)) void act(u.email, () => api.adminDeleteUser(token, u.email)); }}>Löschen</button>
                </td>
              </tr>
            ))}
            {users.length === 0 ? <tr><td style={td} colSpan={6}>Noch keine Nutzer.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

// --- Skills ------------------------------------------------------------------

const TRUST_COLOR: Record<string, string> = {
  "anthropic-vetted": "var(--c-green)", "aegira-certified": "var(--c-navy)",
  "world-top": "var(--c-gold)", community: "var(--c-steel)", experimental: "var(--c-red)",
};

function SkillsPanel({ token }: { token: string }): React.ReactElement {
  const [rows, setRows] = React.useState<SkillAdminView[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");
  const [addOpen, setAddOpen] = React.useState(false);

  const load = React.useCallback(async () => setRows(await api.adminListSkills(token)), [token]);

  React.useEffect(() => {
    load()
      .catch((e: unknown) => setError(e instanceof ApiError && e.status === 403 ? "Kein Adminzugriff." : "Skill-Liste nicht ladbar."))
      .finally(() => setLoading(false));
  }, [load]);

  async function act(cid: string, fn: () => Promise<unknown>): Promise<void> {
    setBusy(cid); setError(null);
    try { await fn(); await load(); }
    catch (e: unknown) { setError(e instanceof ApiError ? e.message : "Aktion fehlgeschlagen."); }
    finally { setBusy(null); }
  }

  if (loading) return <p>Lade…</p>;
  if (error) return <p style={errorBox}>{error}</p>;

  const needle = q.trim().toLowerCase();
  const filtered = rows.filter((r) =>
    !needle || `${r.skill.title} ${r.skill.catalog_id} ${r.skill.description}`.toLowerCase().includes(needle));

  return (
    <>
      <p style={lead}>Globale Freigabeliste. Freigegebene Skills sind für alle Nutzer im Harness zuordenbar. Du kannst eigene Skills hinzufügen.</p>
      <div style={{ display: "flex", gap: "var(--sp-2)", flexWrap: "wrap", marginBottom: "var(--sp-2)" }}>
        <input style={searchStyle} type="search" placeholder="Skills suchen…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button style={{ ...btn, minHeight: 40 }} onClick={() => setAddOpen((v) => !v)}>{addOpen ? "Abbrechen" : "+ Eigenen Skill hinzufügen"}</button>
      </div>

      {addOpen ? <AddSkillForm token={token} onAdded={() => { setAddOpen(false); void load(); }} /> : null}

      <div style={tableWrap}>
        <table style={table}>
          <thead><tr>
            <th style={th}>Skill</th><th style={th}>Trust</th><th style={th}>Domäne</th><th style={th}>Status</th><th style={th}>Aktionen</th>
          </tr></thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.skill.catalog_id}>
                <td style={td}>
                  <strong>{r.skill.title}</strong>{r.custom ? <span style={{ ...meta, color: "var(--c-navy)" }}> · eigen</span> : null}
                  <div><code style={{ fontSize: 11, color: "var(--c-steel)" }}>{r.skill.catalog_id}</code></div>
                  <div style={meta}>{r.skill.description}</div>
                </td>
                <td style={td}><span style={{ ...trustPill, color: TRUST_COLOR[r.skill.trust_tier], borderColor: TRUST_COLOR[r.skill.trust_tier] }}>{r.skill.trust_tier}</span>{r.skill.has_scripts ? <div style={{ ...meta, color: "var(--c-amber)" }}>trägt Skripte</div> : null}</td>
                <td style={td}>{r.skill.domain}</td>
                <td style={td}>{r.released ? <span style={{ color: "var(--c-green)" }}>freigegeben</span> : <span style={{ color: "var(--c-red)" }}>gesperrt</span>}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  {r.released
                    ? <button style={btn} disabled={busy === r.skill.catalog_id} onClick={() => act(r.skill.catalog_id, () => api.adminSkillSetReleased(token, r.skill.catalog_id, false))}>Sperren</button>
                    : <button style={{ ...btn, color: "var(--c-green)", borderColor: "var(--c-green)" }} disabled={busy === r.skill.catalog_id} onClick={() => act(r.skill.catalog_id, () => api.adminSkillSetReleased(token, r.skill.catalog_id, true))}>Freigeben</button>}
                  {r.custom ? <button style={{ ...btn, ...btnDanger }} disabled={busy === r.skill.catalog_id} onClick={() => { if (window.confirm(`Skill ${r.skill.catalog_id} löschen?`)) void act(r.skill.catalog_id, () => api.adminDeleteSkill(token, r.skill.catalog_id)); }}>Löschen</button> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AddSkillForm({ token, onAdded }: { token: string; onAdded: () => void }): React.ReactElement {
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [content, setContent] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const catalogId = slug ? `${slug.replace(/[^a-z0-9-]/g, "")}_skill` : "";

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await api.adminAddSkill(token, {
        catalog_id: catalogId, slug, title, description,
        content: content.trim() || undefined, trust_tier: "aegira-certified",
      });
      onAdded();
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : "Hinzufügen fehlgeschlagen.");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} style={addForm}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-2)" }}>
        <label style={lbl}>Titel<input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} required /></label>
        <label style={lbl}>Slug (Kleinbuchstaben/Bindestrich)<input style={inp} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="z. B. my-skill" required /></label>
      </div>
      <label style={lbl}>Beschreibung (Trigger)<input style={inp} value={description} onChange={(e) => setDescription(e.target.value)} required /></label>
      <label style={lbl}>SKILL.md-Inhalt (optional — sonst wird eine Referenz-Karte erzeugt)
        <textarea style={{ ...inp, minHeight: 90, fontFamily: "var(--font-mono)", fontSize: 12 }} value={content} onChange={(e) => setContent(e.target.value)} placeholder={"---\nname: my-skill\ndescription: …\n---\n# …"} />
      </label>
      <div style={meta}>catalog_id: <code>{catalogId || "—"}</code> · Trust: aegira-certified · wird direkt freigegeben</div>
      {err ? <p style={{ ...meta, color: "var(--c-red)" }}>{err}</p> : null}
      <button type="submit" style={{ ...printAddBtn }} disabled={busy || !title || !slug || !description}>{busy ? "Speichere…" : "Skill hinzufügen"}</button>
    </form>
  );
}

// --- Styles ------------------------------------------------------------------

const wrap: React.CSSProperties = { maxWidth: 960, margin: "0 auto", padding: "var(--sp-5) var(--sp-4)" };
const headerRow: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--sp-2)" };
const backLink: React.CSSProperties = { fontSize: 14, color: "var(--c-steel)", textDecoration: "none" };
const tabsRow: React.CSSProperties = { display: "flex", gap: "var(--sp-1)", margin: "var(--sp-3) 0" };
const tabBase: React.CSSProperties = { padding: "8px 16px", minHeight: 40, border: "1px solid var(--c-border-strong)", borderRadius: "var(--r-md)", cursor: "pointer", fontSize: 14, fontWeight: 600 };
const tabActive: React.CSSProperties = { ...tabBase, backgroundColor: "var(--c-navy)", color: "var(--c-vellum)", borderColor: "var(--c-navy)" };
const tabIdle: React.CSSProperties = { ...tabBase, backgroundColor: "var(--c-surface)", color: "var(--c-text)" };
const lead: React.CSSProperties = { color: "var(--c-text-muted)", fontSize: 14, lineHeight: 1.5, margin: "0 0 var(--sp-3)" };
const tableWrap: React.CSSProperties = { overflowX: "auto", border: "1px solid var(--c-border)", borderRadius: "var(--r-md)" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const th: React.CSSProperties = { textAlign: "left", padding: "var(--sp-2) var(--sp-3)", borderBottom: "1px solid var(--c-border)", color: "var(--c-text-muted)", fontWeight: 600, whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "var(--sp-2) var(--sp-3)", borderBottom: "1px solid var(--c-border)", verticalAlign: "top" };
const btn: React.CSSProperties = { fontSize: 12, padding: "6px 10px", marginRight: 6, minHeight: 36, border: "1px solid var(--c-border-strong)", borderRadius: "var(--r-md)", backgroundColor: "var(--c-surface)", color: "var(--c-text)", cursor: "pointer" };
const btnDanger: React.CSSProperties = { color: "var(--c-red)", borderColor: "var(--c-red)" };
const meta: React.CSSProperties = { fontSize: 12, color: "var(--c-text-muted)" };
const trustPill: React.CSSProperties = { fontSize: 10, fontWeight: 700, padding: "1px 6px", borderWidth: 1, borderStyle: "solid", borderRadius: "var(--r-pill)", whiteSpace: "nowrap" };
const searchStyle: React.CSSProperties = { flex: 1, minWidth: 200, padding: "var(--sp-1) var(--sp-2)", fontSize: 14, minHeight: 40, border: "1px solid var(--c-border-strong)", borderRadius: "var(--r-md)", backgroundColor: "var(--c-surface)", color: "var(--c-text)" };
const errorBox: React.CSSProperties = { padding: "var(--sp-3) var(--sp-4)", backgroundColor: "rgba(195,66,63,0.08)", border: "1px solid var(--c-red)", borderRadius: "var(--r-md)", color: "var(--c-red)", marginBottom: "var(--sp-4)" };
const addForm: React.CSSProperties = { border: "1px dashed var(--c-border-strong)", borderRadius: "var(--r-md)", padding: "var(--sp-3)", marginBottom: "var(--sp-3)", display: "flex", flexDirection: "column", gap: "var(--sp-2)" };
const lbl: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--c-text-muted)" };
const inp: React.CSSProperties = { padding: "var(--sp-1) var(--sp-2)", fontSize: 14, border: "1px solid var(--c-border-strong)", borderRadius: "var(--r-md)", backgroundColor: "var(--c-surface)", color: "var(--c-text)" };
const printAddBtn: React.CSSProperties = { alignSelf: "flex-start", padding: "8px 16px", minHeight: 40, backgroundColor: "var(--c-gold)", color: "var(--c-navy-dark)", border: 0, borderRadius: "var(--r-md)", fontWeight: 600, cursor: "pointer" };
