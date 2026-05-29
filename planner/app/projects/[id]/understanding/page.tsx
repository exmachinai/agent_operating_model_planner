/**
 * Schritt 3 — Projektverständnis & Gate 1.
 *
 * Spec: docs/09_process-flow.md (Schritt 3). Setzt project_nature, Zielplattform
 * und eine pre-finale Zusammenfassung. Gate 1 friert das Verständnis ein —
 * danach ist kein Edit mehr möglich (append-only, Reversibilität by design).
 *
 * Hinweis: Das McKinsey-Schärfungs-Interview (Schritt 2) wird hier später
 * vorgelagert; bis zum Foundry-Hookup wird das Verständnis manuell gesetzt.
 */

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { PageShell } from "../../../../components/PageShell";
import {
  Button,
  cardStyle,
  inputStyle,
  labelStyle,
} from "../../../../components/ui";
import {
  api,
  ApiError,
  type Project,
  type ProjectNature,
  type TargetPlatform,
} from "../../../../lib/api";

const NATURES: { value: ProjectNature; label: string }[] = [
  { value: "concept", label: "Konzept (Methodik & Dokumente)" },
  { value: "technical", label: "Technisch (Architektur & Code)" },
  { value: "hybrid-concept-tech", label: "Hybrid (beides)" },
];

const PLATFORMS: { value: TargetPlatform; label: string }[] = [
  { value: "azure", label: "Azure" },
  { value: "aws", label: "AWS" },
  { value: "gcp", label: "GCP" },
  { value: "on-prem", label: "On-Prem" },
  { value: "hybrid-cloud", label: "Hybrid-Cloud" },
  { value: "multi-cloud", label: "Multi-Cloud" },
  { value: "claude-code-only", label: "Nur Claude Code" },
];

export default function Understanding(): React.ReactElement {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [project, setProject] = React.useState<Project | null>(null);
  const [nature, setNature] = React.useState<ProjectNature | "">("");
  const [platform, setPlatform] = React.useState<TargetPlatform | "">("");
  const [summary, setSummary] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    api
      .getProject(id)
      .then((p) => {
        setProject(p);
        setNature(p.project_nature ?? "");
        setPlatform(p.target_platform ?? "");
        setSummary(p.understanding_summary ?? "");
      })
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : "Projekt nicht gefunden."),
      );
  }, [id]);

  const locked = project?.gate1_approved_at != null;

  async function save(): Promise<void> {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const p = await api.updateUnderstanding(id, {
        project_nature: nature || undefined,
        target_platform: platform || undefined,
        understanding_summary: summary.trim() || undefined,
      });
      setProject(p);
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function approve(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const p = await api.approveUnderstanding(id);
      setProject(p);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Freigabe fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  if (project === null) {
    return (
      <PageShell subtitle="Verständnis · Schritt 3">
        {error ? <p style={errorStyle}>{error}</p> : <p>Lade…</p>}
      </PageShell>
    );
  }

  return (
    <PageShell subtitle="Verständnis · Schritt 3">
      <h1 style={{ marginBottom: "var(--sp-2)" }}>{project.title}</h1>
      <p style={leadStyle}>
        Schärfe Projektart, Zielplattform und die Kernaussage. Mit der
        Gate-1-Freigabe wird das Verständnis verbindlich — danach kein Edit mehr.
      </p>

      {locked ? (
        <div style={gateBannerStyle}>
          <strong>Gate 1 freigegeben.</strong> Das Verständnis ist eingefroren
          (am {new Date(project.gate1_approved_at as string).toLocaleString("de-DE")}
          ). Die Planung kann starten.
        </div>
      ) : null}

      <div style={{ ...cardStyle, ...formStyle }}>
        <div>
          <label htmlFor="nature" style={labelStyle}>
            Projektart
          </label>
          <select
            id="nature"
            value={nature}
            onChange={(e) => setNature(e.target.value as ProjectNature)}
            style={inputStyle}
            disabled={locked || busy}
          >
            <option value="">— wählen —</option>
            {NATURES.map((n) => (
              <option key={n.value} value={n.value}>
                {n.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="platform" style={labelStyle}>
            Zielplattform
          </label>
          <select
            id="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as TargetPlatform)}
            style={inputStyle}
            disabled={locked || busy}
          >
            <option value="">— wählen —</option>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="summary" style={labelStyle}>
            Zusammenfassung (Kernaussage zuerst)
          </label>
          <textarea
            id="summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
            maxLength={8000}
            disabled={locked || busy}
          />
        </div>

        {error ? <p style={errorStyle}>{error}</p> : null}
        {saved && !locked ? <p style={savedStyle}>Gespeichert.</p> : null}

        {!locked ? (
          <div style={actionsStyle}>
            <Button variant="secondary" onClick={save} disabled={busy}>
              {busy ? "Speichere…" : "Speichern"}
            </Button>
            <Button
              variant="accent"
              onClick={approve}
              disabled={busy || !nature}
              title={!nature ? "Projektart muss gesetzt sein" : undefined}
            >
              Verständnis freigeben (Gate 1)
            </Button>
          </div>
        ) : (
          <div style={actionsStyle}>
            <Button onClick={() => router.push("/")}>Zur Übersicht</Button>
          </div>
        )}
      </div>
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

const gateBannerStyle: React.CSSProperties = {
  padding: "var(--sp-3) var(--sp-4)",
  backgroundColor: "rgba(90, 147, 103, 0.10)",
  border: "1px solid var(--c-green)",
  borderRadius: "var(--r-md)",
  color: "var(--c-green)",
  marginBottom: "var(--sp-4)",
  lineHeight: 1.5,
};

const errorStyle: React.CSSProperties = {
  padding: "var(--sp-3) var(--sp-4)",
  backgroundColor: "rgba(195, 66, 63, 0.08)",
  border: "1px solid var(--c-red)",
  borderRadius: "var(--r-md)",
  color: "var(--c-red)",
  margin: 0,
};

const savedStyle: React.CSSProperties = {
  color: "var(--c-green)",
  fontSize: "var(--fs-caption)",
  margin: 0,
};
