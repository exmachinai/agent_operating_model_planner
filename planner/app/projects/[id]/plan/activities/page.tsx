/**
 * Schritt 6b — Aktivitäten + Werkzeuge bestätigen (geführter Plan-Wizard, v0.5).
 *
 * Je Meilenstein schlägt das System konkrete Aktivitäten vor und leitet passende
 * Werkzeuge/MCP ab (Klartext, annehmen/verwerfen). Der Anwender bearbeitet alles
 * und bestätigt mit DONE — erst dann werden Gantt + Risiken abgeleitet (Schritt 6c).
 * Gating: ohne bestätigte Meilensteine zurück zu Schritt 6a.
 */

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { PageShell } from "../../../../../components/PageShell";
import { Button } from "../../../../../components/ui";
import { ActivityEditor } from "../../../../../components/ActivityEditor";
import { api, ApiError, type Plan, type Project } from "../../../../../lib/api";

export default function ActivitiesPage(): React.ReactElement {
  const router = useRouter();
  const id = useParams<{ id: string }>().id;

  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [project, setProject] = React.useState<Project | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      try {
        const proj = await api.getProject(id);
        if (!active) return;
        setProject(proj);
        // Gating: Meilensteine müssen bestätigt sein (Schritt 6a).
        if (proj.milestones_done_at == null) {
          router.replace(`/projects/${id}/plan/milestones`);
          return;
        }
        const p = await api.getPlan(id);
        if (active) setPlan(p);
      } catch (e: unknown) {
        if (active) setError(e instanceof ApiError ? e.message : "Plan nicht ladbar.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id, router]);

  const done = project?.activities_done_at != null;

  async function confirm(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await api.activitiesDone(id);
      router.push(`/projects/${id}/plan`);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Bestätigen fehlgeschlagen.");
      setBusy(false);
    }
  }

  return (
    <PageShell subtitle="Aktivitäten · Schritt 6b" helpTopic="plan">
      <h1 style={{ marginBottom: "var(--sp-2)" }}>Aktivitäten & Werkzeuge</h1>
      <p style={leadStyle}>
        Zu jedem Meilenstein schlagen wir konkrete <strong>Aktivitäten</strong> vor
        und welche <strong>Werkzeuge</strong> dabei helfen. Passe die Aktivitäten an
        (Text, Aufwand, Reihenfolge) und wähle die Werkzeuge, die du nutzen möchtest
        — tippe auf „?“, um zu sehen, was ein Werkzeug macht. Mit{" "}
        <strong>DONE</strong> erstellen wir daraus Zeitplan (Gantt) und Risiken.
      </p>

      {error ? <p style={errorStyle}>{error}</p> : null}

      {loading ? (
        <p>Lade…</p>
      ) : plan ? (
        <>
          {done ? (
            <p style={infoStyle}>
              Diese Aktivitäten sind bereits bestätigt. Du kannst direkt weiter zum
              Plan-Ergebnis.
            </p>
          ) : null}
          <ActivityEditor id={id} plan={plan} onPlan={setPlan} disabled={done} />

          <div style={actionsStyle}>
            <Button
              variant="secondary"
              onClick={() => router.push(`/projects/${id}/plan/milestones`)}
            >
              Zurück zu Meilensteinen
            </Button>
            {done ? (
              <Button variant="accent" onClick={() => router.push(`/projects/${id}/plan`)}>
                Weiter zum Plan-Ergebnis
              </Button>
            ) : (
              <Button variant="accent" disabled={busy} onClick={() => void confirm()}>
                {busy ? "…" : "DONE — Aktivitäten bestätigen"}
              </Button>
            )}
          </div>
        </>
      ) : null}
    </PageShell>
  );
}

const leadStyle: React.CSSProperties = {
  color: "var(--c-text-muted)",
  marginBottom: "var(--sp-6)",
  lineHeight: 1.6,
};
const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "var(--sp-3)",
  marginTop: "var(--sp-6)",
  flexWrap: "wrap",
};
const infoStyle: React.CSSProperties = {
  padding: "var(--sp-3)",
  background: "rgba(90,147,103,0.08)",
  border: "1px solid var(--c-green)",
  borderRadius: "var(--r-md)",
  color: "var(--c-text)",
  marginBottom: "var(--sp-4)",
  fontSize: 14,
};
const errorStyle: React.CSSProperties = {
  padding: "var(--sp-3) var(--sp-4)",
  background: "rgba(195,66,63,0.08)",
  border: "1px solid var(--c-red)",
  borderRadius: "var(--r-md)",
  color: "var(--c-red)",
  marginBottom: "var(--sp-4)",
};
