/**
 * Schritt 1 — Projekt in eigenen Worten beschreiben (Freitext-Brief).
 *
 * Spec: docs/09_process-flow.md (Schritt 1). Speichert nichts ohne „Weiter“.
 * Nach dem Anlegen geht es zur Verständnis-Schärfung (Schritt 3, Gate 1).
 */

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { PageShell } from "../../../components/PageShell";
import { Button, cardStyle, inputStyle, labelStyle } from "../../../components/ui";
import { api, ApiError } from "../../../lib/api";

export default function NewProject(): React.ReactElement {
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const canSubmit = title.trim().length >= 3 && !busy;

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const p = await api.createProject({
        title: title.trim(),
        description: description.trim(),
      });
      router.push(`/projects/${p.id}/interview`);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : "Anlegen fehlgeschlagen.");
      setBusy(false);
    }
  }

  return (
    <PageShell subtitle="Neues Projekt · Schritt 1">
      <h1 style={{ marginBottom: "var(--sp-2)" }}>Projekt beschreiben</h1>
      <p style={leadStyle}>
        Beschreibe dein Vorhaben formlos, in eigenen Worten — keine Struktur und
        keine Fachbegriffe nötig. Im nächsten Schritt schärfen wir das gemeinsam.
      </p>

      <form onSubmit={onSubmit} style={{ ...cardStyle, ...formStyle }}>
        <div>
          <label htmlFor="title" style={labelStyle}>
            Titel
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. AEGIRA Launch DE"
            style={inputStyle}
            maxLength={200}
            required
          />
        </div>

        <div>
          <label htmlFor="description" style={labelStyle}>
            Kurz-Brief (optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Worum geht es? Was soll am Ende herauskommen?"
            style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
            maxLength={4000}
          />
        </div>

        {error ? <p style={errorStyle}>{error}</p> : null}

        <div style={actionsStyle}>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/")}
          >
            Abbrechen
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {busy ? "Speichere…" : "Weiter"}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}

const leadStyle: React.CSSProperties = {
  color: "var(--c-text-muted)",
  marginBottom: "var(--sp-6)",
  lineHeight: 1.6,
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-4)",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--sp-2)",
};

const errorStyle: React.CSSProperties = {
  padding: "var(--sp-3) var(--sp-4)",
  backgroundColor: "rgba(195, 66, 63, 0.08)",
  border: "1px solid var(--c-red)",
  borderRadius: "var(--r-md)",
  color: "var(--c-red)",
  margin: 0,
};
