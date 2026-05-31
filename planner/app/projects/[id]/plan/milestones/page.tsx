/**
 * Schritt 6a — Meilensteine bestätigen (geführter Plan-Wizard, v0.5).
 *
 * Das System schlägt Meilensteine vor (LLM, sonst regelbasiert). Der Anwender
 * ändert/löscht/ergänzt/sortiert sie und bestätigt mit DONE — danach geht es
 * direkt zum Plan-Ergebnis (Schritt 6c). v0.6 — keine Aktivitäts-Stufe (6b) mehr;
 * die konkrete Arbeit übernehmen die Agenten autonom.
 */

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { PageShell } from "../../../../../components/PageShell";
import { Button } from "../../../../../components/ui";
import { MilestoneEditor } from "../../../../../components/MilestoneEditor";
import { api, ApiError, type Plan, type Project } from "../../../../../lib/api";

export default function MilestonesPage(): React.ReactElement {
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
        if (active) setProject(proj);
        // Plan holen; existiert noch keiner, einen erzeugen (LLM-first, Fallback).
        let p: Plan;
        try {
          p = await api.getPlan(id);
        } catch (e: unknown) {
          if (e instanceof ApiError && e.status === 404) {
            p = await api.generatePlan(id);
          } else {
            throw e;
          }
        }
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
  }, [id]);

  const done = project?.milestones_done_at != null;

  async function confirm(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await api.milestonesDone(id);
      router.push(`/projects/${id}/plan`);
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Bestätigen fehlgeschlagen.");
      setBusy(false);
    }
  }

  return (
    <PageShell subtitle="Meilensteine · Schritt 6a" helpTopic="plan">
      <h1 style={{ marginBottom: "var(--sp-2)" }}>Meilensteine festlegen</h1>
      <p style={leadStyle}>
        Wir haben die wichtigsten <strong>Meilensteine</strong> (Zwischenziele)
        vorgeschlagen. Prüfe sie in Ruhe: Du kannst sie umbenennen, das Datum
        ändern, welche löschen, neue hinzufügen und die Reihenfolge per Ziehen oder
        mit den Pfeilen anpassen. Wenn es passt, bestätige mit <strong>DONE</strong>{" "}
        — dann siehst du das fertige Plan-Ergebnis. Die konkrete Arbeit zu jedem
        Meilenstein übernehmen später die Agenten autonom.
      </p>

      {error ? <p style={errorStyle}>{error}</p> : null}

      {loading ? (
        <p>Lade…</p>
      ) : plan ? (
        <>
          {done ? (
            <p style={infoStyle}>
              Diese Meilensteine sind bereits bestätigt. Du kannst direkt weiter zum
              Plan-Ergebnis.
            </p>
          ) : null}
          <MilestoneEditor id={id} plan={plan} onPlan={setPlan} disabled={done} />

          <div style={actionsStyle}>
            <Button variant="secondary" onClick={() => router.push(`/projects/${id}/guardrails`)}>
              Zurück
            </Button>
            {done ? (
              <Button
                variant="accent"
                onClick={() => router.push(`/projects/${id}/plan`)}
              >
                Weiter zum Plan-Ergebnis
              </Button>
            ) : (
              <Button
                variant="accent"
                disabled={busy || plan.milestones.length === 0}
                onClick={() => void confirm()}
              >
                {busy ? "…" : "DONE — Meilensteine bestätigen"}
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
