/**
 * Schritt 4 — Dashboard: Projekte verwalten.
 *
 * Spec: docs/09_process-flow.md (Schritt 4). Liest die Projektliste aus der
 * Planner-API und bietet je Karte ein Aktionsmenü: Öffnen · Umbenennen (vor
 * Gate 1) · Duplizieren · Löschen (mit Bestätigung).
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { PageShell } from "../components/PageShell";
import { Button, StatusBadge, cardStyle } from "../components/ui";
import { api, ApiError, type Project } from "../lib/api";

export default function Dashboard(): React.ReactElement {
  const router = useRouter();
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [menu, setMenu] = React.useState<string | null>(null);
  const [renaming, setRenaming] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [confirmDel, setConfirmDel] = React.useState<string | null>(null);
  // Filter/Sortierung der Projektliste.
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [sort, setSort] = React.useState<"new" | "old" | "title">("new");

  // Hinweis: das Onboarding-Routing (MFA → Explainer → Planner) liegt zentral im
  // LockProvider (am Unlock-Event), nicht hier — der Home-Mount läuft vor dem Login.

  const fmtDate = (iso: string): string =>
    new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = (projects ?? []).filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (needle && !`${p.title} ${p.description}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      const d = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return sort === "new" ? d : -d;
    });
  }, [projects, query, statusFilter, sort]);

  const reload = React.useCallback(async () => {
    setProjects(await api.listProjects());
  }, []);

  React.useEffect(() => {
    reload().catch((e: unknown) => {
      setError(e instanceof ApiError ? e.message : "API nicht erreichbar.");
      setProjects([]);
    });
  }, [reload]);

  async function run<T>(fn: () => Promise<T>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell subtitle="Projekte" helpTopic="overview">
      <div style={titleRowStyle}>
        <h1>Projekte</h1>
        <span style={{ display: "inline-flex", gap: "var(--sp-2)", alignItems: "center" }}>
          <button
            type="button"
            style={explainerLinkStyle}
            onClick={() => router.push("/explainer")}
            data-testid="open-explainer"
          >
            Explainer
          </button>
          <Button data-testid="new-project" onClick={() => router.push("/projects/new")}>Neues Projekt</Button>
        </span>
      </div>

      {error ? <p style={errorStyle}>{error}</p> : null}

      {projects === null ? (
        <p style={mutedStyle}>Lade…</p>
      ) : projects.length === 0 ? (
        <p style={emptyStyle}>
          Noch kein Projekt. Starte mit <strong>Neues Projekt</strong> und
          beschreibe dein Vorhaben formlos in eigenen Worten (Schritt 1).
        </p>
      ) : (
        <>
          <div style={filterBarStyle}>
            <input
              type="search"
              placeholder="Projekte durchsuchen…"
              aria-label="Projekte durchsuchen"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={filterSearchStyle}
            />
            <select
              aria-label="Status filtern"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={filterSelectStyle}
            >
              <option value="">Alle Status</option>
              <option value="planning">In Planung</option>
              <option value="reviewing">Review</option>
              <option value="approved">Freigegeben</option>
              <option value="compiled">Kompiliert</option>
              <option value="archived">Archiviert</option>
            </select>
            <select
              aria-label="Sortierung"
              value={sort}
              onChange={(e) => setSort(e.target.value as "new" | "old" | "title")}
              style={filterSelectStyle}
            >
              <option value="new">Neueste zuerst</option>
              <option value="old">Älteste zuerst</option>
              <option value="title">Titel (A–Z)</option>
            </select>
            <span style={countStyle}>{visible.length} / {projects.length}</span>
          </div>
          {visible.length === 0 ? (
            <p style={emptyStyle}>Keine Projekte passen zum Filter.</p>
          ) : (
        <ul style={listStyle}>
          {visible.map((p) => {
            const beforeGate1 = p.gate1_approved_at === null;
            return (
              <li key={p.id} style={{ ...cardStyle, ...itemStyle }}>
                {renaming === p.id ? (
                  <div style={{ display: "flex", gap: "var(--sp-2)", flex: 1, alignItems: "center" }}>
                    <input
                      autoFocus
                      style={renameInputStyle}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && renameValue.trim().length >= 3)
                          run(() => api.updateProject(p.id, { title: renameValue.trim() })).then(() =>
                            setRenaming(null),
                          );
                        if (e.key === "Escape") setRenaming(null);
                      }}
                    />
                    <Button
                      variant="secondary"
                      disabled={busy || renameValue.trim().length < 3}
                      onClick={() =>
                        run(() => api.updateProject(p.id, { title: renameValue.trim() })).then(() =>
                          setRenaming(null),
                        )
                      }
                    >
                      Speichern
                    </Button>
                    <Button variant="secondary" onClick={() => setRenaming(null)}>
                      Abbrechen
                    </Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    style={openAreaStyle}
                    onClick={() => router.push(`/projects/${p.id}/understanding`)}
                  >
                    <div style={itemTitleStyle}>{p.title}</div>
                    {p.description ? <div style={itemDescStyle}>{p.description}</div> : null}
                    <div style={itemMetaStyle}>
                      Erstellt {fmtDate(p.created_at)}
                      {p.updated_at ? ` · geändert ${fmtDate(p.updated_at)}` : ""}
                    </div>
                  </button>
                )}

                <div style={rightStyle}>
                  <StatusBadge status={p.status} gateApproved={p.gate1_approved_at !== null} />
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      aria-label="Aktionen"
                      style={kebabStyle}
                      onClick={() => setMenu(menu === p.id ? null : p.id)}
                    >
                      ⋯
                    </button>
                    {menu === p.id ? (
                      <div style={menuStyle} onMouseLeave={() => setMenu(null)}>
                        <MenuItem
                          label="Öffnen"
                          onClick={() => router.push(`/projects/${p.id}/understanding`)}
                        />
                        {beforeGate1 ? (
                          <MenuItem
                            label="Umbenennen"
                            onClick={() => {
                              setRenameValue(p.title);
                              setRenaming(p.id);
                              setMenu(null);
                            }}
                          />
                        ) : null}
                        <MenuItem
                          label="Duplizieren"
                          onClick={() => {
                            setMenu(null);
                            run(() => api.duplicateProject(p.id));
                          }}
                        />
                        <MenuItem
                          label="Löschen"
                          danger
                          onClick={() => {
                            setConfirmDel(p.id);
                            setMenu(null);
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </div>

                {confirmDel === p.id ? (
                  <div style={confirmStyle} role="alertdialog">
                    <span style={{ fontSize: 14 }}>
                      <strong>{p.title}</strong> wirklich löschen? Das ist endgültig.
                    </span>
                    <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                      <Button
                        variant="secondary"
                        style={dangerSolidStyle}
                        disabled={busy}
                        onClick={() =>
                          run(() => api.deleteProject(p.id)).then(() => setConfirmDel(null))
                        }
                      >
                        Löschen
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirmDel(null)}>
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
          )}
        </>
      )}
    </PageShell>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      style={{ ...menuItemStyle, color: danger ? "var(--c-red)" : "var(--c-text)" }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

const titleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "var(--sp-6)",
};
const explainerLinkStyle: React.CSSProperties = {
  minHeight: 40,
  padding: "0 12px",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--c-steel)",
  background: "transparent",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-md)",
  cursor: "pointer",
};
const listStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-3)",
};
const itemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--sp-4)",
  flexWrap: "wrap",
};
const openAreaStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  textAlign: "left",
  background: "transparent",
  border: 0,
  cursor: "pointer",
  padding: 0,
};
const rightStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
};
const itemTitleStyle: React.CSSProperties = {
  fontWeight: 600,
  fontSize: 16,
  color: "var(--c-navy)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const itemDescStyle: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  color: "var(--c-text-muted)",
  marginTop: 2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const itemMetaStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--c-text-muted)",
  marginTop: 4,
  fontFamily: "var(--font-mono)",
};
const filterBarStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--sp-2)",
  alignItems: "center",
  marginBottom: "var(--sp-3)",
};
const filterSearchStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 200,
  padding: "var(--sp-2) var(--sp-3)",
  fontSize: 14,
  minHeight: 40,
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-md)",
  backgroundColor: "var(--c-surface)",
  color: "var(--c-text)",
};
const filterSelectStyle: React.CSSProperties = {
  padding: "var(--sp-2) var(--sp-3)",
  fontSize: 14,
  minHeight: 40,
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-md)",
  backgroundColor: "var(--c-surface)",
  color: "var(--c-text)",
};
const countStyle: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  color: "var(--c-text-muted)",
  whiteSpace: "nowrap",
};
const renameInputStyle: React.CSSProperties = {
  flex: 1,
  padding: "var(--sp-2) var(--sp-3)",
  fontSize: 15,
  fontFamily: "var(--font-body)",
  color: "var(--c-text)",
  backgroundColor: "var(--c-surface)",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-md)",
};
const kebabStyle: React.CSSProperties = {
  border: "1px solid var(--c-border-strong)",
  background: "var(--c-surface)",
  borderRadius: "var(--r-md)",
  width: 36,
  height: 32,
  cursor: "pointer",
  fontSize: 18,
  lineHeight: 1,
  color: "var(--c-steel)",
};
const menuStyle: React.CSSProperties = {
  position: "absolute",
  right: 0,
  top: 36,
  zIndex: 10,
  minWidth: 160,
  backgroundColor: "var(--c-surface)",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-md)",
  boxShadow: "var(--sh-2, 0 6px 24px rgba(0,0,0,0.12))",
  display: "flex",
  flexDirection: "column",
  padding: "var(--sp-1)",
};
const menuItemStyle: React.CSSProperties = {
  textAlign: "left",
  background: "transparent",
  border: 0,
  cursor: "pointer",
  padding: "var(--sp-2) var(--sp-3)",
  fontSize: 14,
  borderRadius: "var(--r-sm)",
};
const confirmStyle: React.CSSProperties = {
  width: "100%",
  marginTop: "var(--sp-2)",
  padding: "var(--sp-3)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--sp-2)",
  border: "1px solid var(--c-red)",
  borderRadius: "var(--r-md)",
  backgroundColor: "rgba(195, 66, 63, 0.04)",
  flexWrap: "wrap",
};
const dangerSolidStyle: React.CSSProperties = {
  color: "var(--c-vellum)",
  backgroundColor: "var(--c-red)",
  borderColor: "var(--c-red)",
};
const mutedStyle: React.CSSProperties = { color: "var(--c-text-muted)" };
const errorStyle: React.CSSProperties = {
  padding: "var(--sp-3) var(--sp-4)",
  backgroundColor: "rgba(195, 66, 63, 0.08)",
  border: "1px solid var(--c-red)",
  borderRadius: "var(--r-md)",
  color: "var(--c-red)",
  marginBottom: "var(--sp-4)",
};
const emptyStyle: React.CSSProperties = {
  padding: "var(--sp-6)",
  border: "1px dashed var(--c-border-strong)",
  borderRadius: "var(--r-md)",
  color: "var(--c-steel)",
  fontSize: 14,
  lineHeight: 1.6,
};
