/**
 * Projekt-Druckansicht (v0.8) — druckoptimierter Gesamt-Report.
 *
 * Fasst Plan (Phasen/Meilensteine/Risiken/PVM) **und** Harness (Agenten/Skills/
 * HITL) + Skill-Manifest in einem Dokument zusammen und öffnet den Druckdialog
 * (Browser „Als PDF speichern"). `@media print` blendet App-Chrome aus.
 */

"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  api,
  ApiError,
  type HarnessGraph,
  type Plan,
  type Project,
} from "../../../../lib/api";
import { AgentFlow } from "../../../../components/AgentFlow";

export default function PrintPage(): React.ReactElement {
  const id = useParams<{ id: string }>().id;
  const [project, setProject] = React.useState<Project | null>(null);
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [graph, setGraph] = React.useState<HarnessGraph | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try {
        setProject(await api.getProject(id));
        try { setPlan(await api.getPlan(id)); } catch { /* evtl. noch kein Plan */ }
        try { setGraph(await api.getHarness(id)); } catch { /* evtl. noch kein Harness */ }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Projekt nicht ladbar.");
      } finally {
        setReady(true);
      }
    })();
  }, [id]);

  if (!ready) return <main style={wrap}><p>Lade Druckansicht…</p></main>;
  if (error || !project) return <main style={wrap}><p style={{ color: "var(--c-red)" }}>{error ?? "Projekt nicht gefunden."}</p></main>;

  return (
    <main style={wrap}>
      <style>{`
        @media print {
          .aegira-no-print { display: none !important; }
          body { background: #fff; }
          /* Flow-Ansicht auf eigener Querseite, groß. */
          @page flow { size: A4 landscape; margin: 12mm; }
          .aegira-flow-page { page: flow; break-before: page; }
        }
        /* Bildschirm: Flow-Block dezent abgesetzt. */
        .aegira-flow-page { margin-top: 24px; border-top: 1px dashed var(--c-border); padding-top: 16px; }
      `}</style>

      <div className="aegira-no-print" style={toolbar}>
        <Link href={`/projects/${id}/harness`} style={linkStyle}>← Zurück zum Harness</Link>
        <button type="button" style={printBtn} onClick={() => window.print()}>🖨 Drucken / Als PDF</button>
      </div>

      <header style={{ borderBottom: "2px solid var(--c-navy)", paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, letterSpacing: "0.08em", color: "var(--c-navy)" }}>
          AEGIRA · AI Trust Platform
        </div>
        <h1 style={{ margin: "6px 0 2px", fontSize: 24 }}>{project.title}</h1>
        <div style={meta}>
          {project.project_type ?? "—"}{project.project_subtype ? ` · ${project.project_subtype}` : ""} ·
          Status: {project.status} · gedruckt: {new Date().toLocaleString("de-DE")}
        </div>
        {project.description ? <p style={{ marginTop: 8 }}>{project.description}</p> : null}
      </header>

      {/* Plan */}
      <Section title="Plan — Meilensteine">
        {plan ? (
          <table style={table}>
            <thead><tr><th style={th}>ID</th><th style={th}>Meilenstein</th><th style={th}>Termin</th><th style={th}>Ampel</th></tr></thead>
            <tbody>
              {plan.milestones.map((m) => (
                <tr key={m.id}>
                  <td style={td}>{m.id}</td>
                  <td style={td}>{m.name}</td>
                  <td style={td}>{m.planned_date}</td>
                  <td style={td}>{m.ampel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p style={meta}>Kein freigegebener Plan.</p>}
      </Section>

      {plan && plan.prl.length > 0 ? (
        <Section title="Projektrisiken (PRL)">
          <table style={table}>
            <thead><tr><th style={th}>ID</th><th style={th}>Risiko</th><th style={th}>E×A</th><th style={th}>Ampel</th><th style={th}>Mitigation</th></tr></thead>
            <tbody>
              {plan.prl.map((r) => (
                <tr key={r.id}>
                  <td style={td}>{r.id}</td>
                  <td style={td}>{r.description}</td>
                  <td style={td}>{r.probability}×{r.impact}</td>
                  <td style={td}>{r.ampel}</td>
                  <td style={td}>{r.mitigation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}

      {/* Harness */}
      {graph ? (
        <>
          <Section title={`Agenten-Harness (${graph.agents.length} Agenten · Iteration ${graph.iteration})`}>
            {graph.agents.map((a) => (
              <div key={a.id} style={{ marginBottom: 10, breakInside: "avoid" }}>
                <div style={{ fontWeight: 700 }}>{a.role} <span style={meta}>· {a.kind} · {a.model}</span></div>
                <div style={{ fontSize: 13, margin: "2px 0" }}>{a.mission}</div>
                <div style={{ fontSize: 12 }}>
                  <strong>Skills:</strong> {a.skills.length ? a.skills.join(", ") : "—"}
                </div>
              </div>
            ))}
          </Section>

          <Section title={`Human-in-the-Loop (${graph.hitl_points.length})`}>
            <ul>{graph.hitl_points.map((p, i) => <li key={i} style={{ fontSize: 13 }}>◆ {p}</li>)}</ul>
          </Section>

          {graph.catalog_skills && graph.catalog_skills.length > 0 ? (
            <Section title={`Skill-Manifest (${graph.catalog_skills.length}) — audit-ready`}>
              <table style={table}>
                <thead><tr><th style={th}>Skill</th><th style={th}>Trust</th><th style={th}>Quelle</th><th style={th}>sha256</th></tr></thead>
                <tbody>
                  {graph.catalog_skills.map((s) => (
                    <tr key={s.catalog_id}>
                      <td style={td}>{s.catalog_id}</td>
                      <td style={td}>{s.trust_tier}</td>
                      <td style={td}>{s.source}</td>
                      <td style={{ ...td, fontFamily: "var(--font-mono)", fontSize: 10 }}>{s.content_sha256 ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          ) : null}

          {graph.zip_sha256 ? (
            <p style={meta}>Harness-ZIP: <code>{graph.zip_name}</code> · {graph.zip_sha256}</p>
          ) : null}
        </>
      ) : <Section title="Agenten-Harness"><p style={meta}>Noch kein Harness kompiliert.</p></Section>}

      {/* Flow-Ansicht auf eigener Querseite (groß) — Abläufe & Zusammenhänge der Agenten. */}
      {graph ? (
        <section className="aegira-flow-page">
          <h2 style={{ fontSize: 16, marginBottom: 8 }}>Agenten-Flow (Orchestrierung)</h2>
          <p style={{ ...meta, marginBottom: 12 }}>
            Knoten = Agenten (nach Stages), Kanten = Abhängigkeiten, Farbe = Rolle. Ablauf:
            Orchestrator → Worker → Reviewer → HITL.
          </p>
          <AgentFlow graph={graph} animated={false} print />
        </section>
      ) : null}

      <footer style={{ marginTop: 24, borderTop: "1px solid var(--c-border)", paddingTop: 8, ...meta }}>
        AEGIRA — evidence-based AI Trust. Trust-Tier ist eine Einstufung, keine Garantie.
      </footer>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section style={{ marginBottom: 18, breakInside: "avoid" }}>
      <h2 style={{ fontSize: 16, borderBottom: "1px solid var(--c-border)", paddingBottom: 4, marginBottom: 8 }}>{title}</h2>
      {children}
    </section>
  );
}

const wrap: React.CSSProperties = { maxWidth: 880, margin: "0 auto", padding: "24px 20px", color: "var(--c-text)", background: "var(--c-bg)" };
const toolbar: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 };
const linkStyle: React.CSSProperties = { color: "var(--c-steel)", textDecoration: "none", fontSize: 14 };
const printBtn: React.CSSProperties = {
  padding: "8px 16px", minHeight: 40, backgroundColor: "var(--c-gold)", color: "var(--c-navy-dark)",
  border: 0, borderRadius: "var(--r-md)", fontWeight: 600, cursor: "pointer",
};
const meta: React.CSSProperties = { fontSize: 12, color: "var(--c-text-muted)" };
const table: React.CSSProperties = { width: "100%", borderCollapse: "collapse", fontSize: 12 };
const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid var(--c-border-strong)", padding: "4px 6px", color: "var(--c-text-muted)" };
const td: React.CSSProperties = { borderBottom: "1px solid var(--c-border)", padding: "4px 6px", verticalAlign: "top" };
