/**
 * Schritt 4 — Dashboard: Projekte verwalten.
 *
 * Spec: docs/09_process-flow.md (Schritt 4). Liest die Projektliste aus der
 * Planner-API und führt zur Brief-Erfassung (Schritt 1).
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { PageShell } from "../components/PageShell";
import { Button, StatusBadge, cardStyle } from "../components/ui";
import { api, ApiError, type Project } from "../lib/api";

export default function Dashboard(): React.ReactElement {
  const router = useRouter();
  const [projects, setProjects] = React.useState<Project[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api
      .listProjects()
      .then(setProjects)
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? e.message : "API nicht erreichbar.");
        setProjects([]);
      });
  }, []);

  return (
    <PageShell subtitle="Projekte" helpTopic="overview">
      <div style={titleRowStyle}>
        <h1>Projekte</h1>
        <Button onClick={() => router.push("/projects/new")}>
          Neues Projekt
        </Button>
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
        <ul style={listStyle}>
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}/understanding`}
                style={{ ...cardStyle, ...itemStyle }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={itemTitleStyle}>{p.title}</div>
                  {p.description ? (
                    <div style={itemDescStyle}>{p.description}</div>
                  ) : null}
                </div>
                <StatusBadge
                  status={p.status}
                  gateApproved={p.gate1_approved_at !== null}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

const titleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: "var(--sp-6)",
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
  textDecoration: "none",
  color: "inherit",
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
