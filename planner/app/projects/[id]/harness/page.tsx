/**
 * Schritt 8 (BAUEN) + Schritt 9 (Export, Gate 3) — Agent-Harness.
 *
 * Spec: docs/03_harness-zip-spec.md, docs/09_process-flow.md (Schritt 8/9).
 * Aus dem bei Gate 2 freigegebenen Plan wird ein sichtbarer Agenten-Graph
 * kompiliert (PMO-Orchestrator → Worker → Reviewer → HITL ◆). Agenten lassen
 * sich live anlegen/ändern/löschen, der Graph per Kommando umordnen; mit Gate 3
 * wird der Harness eingefroren und als signiertes Zip heruntergeladen.
 */

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { PageShell } from "../../../../components/PageShell";
import { Button, cardStyle } from "../../../../components/ui";
import Link from "next/link";

import {
  api,
  ApiError,
  type AgentSpec,
  type CatalogSkill,
  type HarnessGraph,
  type HarnessNodeKind,
  type Project,
} from "../../../../lib/api";
import {
  saveUnzipped,
  saveZip,
  supportsFsAccess,
  type SaveResult,
} from "../../../../lib/saveHarness";
import { HarnessCanvas } from "../../../../components/HarnessCanvas";

const KIND_LABEL: Record<HarnessNodeKind, string> = {
  orchestrator: "Orchestrator",
  router: "Router",
  worker: "Worker",
  evaluator: "Reviewer",
  hitl: "HITL ◆",
};
const KIND_COLOR: Record<HarnessNodeKind, string> = {
  orchestrator: "var(--c-navy)",
  router: "var(--c-gold)",
  worker: "var(--c-steel)",
  evaluator: "var(--c-gold)",
  hitl: "var(--c-green)",
};
const KIND_ORDER: HarnessNodeKind[] = ["orchestrator", "router", "worker", "evaluator", "hitl"];

const SEVERITY_COLOR: Record<string, string> = {
  fail: "var(--c-red)",
  warn: "var(--c-amber)",
  info: "var(--c-green)",
};

export default function HarnessPage(): React.ReactElement {
  const router = useRouter();
  const id = useParams<{ id: string }>().id;

  const [project, setProject] = React.useState<Project | null>(null);
  const [graph, setGraph] = React.useState<HarnessGraph | null>(null);
  const [skills, setSkills] = React.useState<CatalogSkill[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // v0.8 — freigegebener Skill-Katalog (für Inline-Zuordnung an den Agenten).
  React.useEffect(() => {
    api.getSkills().then(setSkills).catch(() => setSkills([]));
  }, []);
  const skillBySlug = React.useMemo(() => {
    const m = new Map<string, CatalogSkill>();
    for (const s of skills) m.set(s.slug, s);
    return m;
  }, [skills]);

  const reload = React.useCallback(async () => {
    const proj = await api.getProject(id);
    setProject(proj);
    try {
      setGraph(await api.getHarness(id));
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) setGraph(null);
      else throw e;
    }
  }, [id]);

  React.useEffect(() => {
    reload()
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : "Harness nicht ladbar."),
      )
      .finally(() => setLoading(false));
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

  if (loading) {
    return (
      <PageShell subtitle="Harness · Schritt 8" helpTopic="harness">
        {error ? <p style={errorStyle}>{error}</p> : <p>Lade…</p>}
      </PageShell>
    );
  }

  const gate2 = project?.gate2_approved_at != null;
  const frozen = graph?.status === "compiled";
  const hasFail = (graph?.findings ?? []).some((f) => f.severity === "fail");

  // Noch kein Harness → Compile-Einstieg (oder Hinweis, dass Gate 2 fehlt).
  if (!graph) {
    return (
      <PageShell subtitle="Harness · Schritt 8" helpTopic="harness">
        <h1 style={{ marginBottom: "var(--sp-2)" }}>Agent-Harness bauen</h1>
        <p style={leadStyle}>
          Aus dem freigegebenen Plan (Gate 2) wird ein sichtbares Agententeam
          kompiliert: PMO-Orchestrator, Worker, Reviewer und HITL-Checkpoints.
          Du kannst Agenten anpassen, den Ablauf umordnen und am Ende ein
          signiertes Zip für Claude Code / Cowork exportieren.
        </p>
        {error ? <p style={errorStyle}>{error}</p> : null}
        {!gate2 ? (
          <div style={{ ...cardStyle, borderColor: "var(--c-amber)" }}>
            <strong>Plan noch nicht freigegeben.</strong> Der Harness wird aus der
            bei Gate 2 freigegebenen Planversion kompiliert. Gib zuerst den Plan
            frei (Schritt 7).
          </div>
        ) : null}
        <div style={{ ...actionsStyle, marginTop: "var(--sp-5)" }}>
          <Button variant="secondary" onClick={() => router.push(`/projects/${id}/review`)}>
            Zurück zum Review
          </Button>
          <Button
            variant="accent"
            disabled={!gate2 || busy}
            onClick={() => run(() => api.compileHarness(id))}
          >
            {busy ? "Kompiliere…" : "Harness kompilieren"}
          </Button>
        </div>
      </PageShell>
    );
  }

  const byKind = (k: HarnessNodeKind) => graph.nodes.filter((n) => n.kind === k);

  return (
    <PageShell subtitle="Harness · Schritt 8" helpTopic="harness">
      <div style={headerRowStyle}>
        <h1 style={{ margin: 0 }}>Agent-Harness · Iteration {graph.iteration}</h1>
        <span
          style={{
            ...pillStyle,
            color: frozen ? "var(--c-green)" : "var(--c-steel)",
            borderColor: frozen ? "var(--c-green)" : "var(--c-border-strong)",
          }}
        >
          {frozen ? "Gate 3 ✓ · kompiliert" : "Entwurf · editierbar"}
        </span>
        <span style={{ ...pillStyle, color: "var(--c-text-muted)" }}>
          Plan v{graph.plan_version}
        </span>
      </div>
      <p style={leadStyle}>
        {graph.agents.length} Agenten · {graph.nodes.length} Knoten ·{" "}
        {graph.hitl_points.length} HITL-Punkte. Der Plan ist die Single Source of
        Truth; der Harness setzt ihn um.
      </p>

      {error ? <p style={errorStyle}>{error}</p> : null}

      {/* v0.4 — Orchestrierungs-Canvas (Drag&Drop, dashboard-grade) */}
      <div style={sectionLabel}>Orchestrierungs-Canvas</div>
      <HarnessCanvas id={id} graph={graph} frozen={frozen} onChange={reload} />

      {/* v0.4.3 — Architektur-Check (read-only). Die Agenten werden NICHT erneut
          gelistet (das macht die Orchestrierungs-Canvas oben editierbar); hier nur
          Klassen-Legende + Worker-Anordnung + die Best-Practice-Befunde. */}
      <div style={sectionLabel}>Architektur-Check (Preflight, docs/04)</div>
      <div style={{ ...cardStyle, marginBottom: graph.findings.length > 0 ? "var(--sp-3)" : "var(--sp-6)" }}>
        <p style={{ ...metaStyle, marginTop: 0 }}>
          Read-only-Validierung der Agenten-Topologie gegen die Best-Practice-Anti-Muster.
          Agenten bearbeitest du oben in der <strong>Orchestrierungs-Canvas</strong> bzw. unten in den Agenten-Karten.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-3)", margin: "var(--sp-2) 0" }}>
          {KIND_ORDER.map((kind) => {
            const n = byKind(kind).length;
            if (n === 0) return null;
            return (
              <span key={kind} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                <span style={{ ...nodeDot, backgroundColor: KIND_COLOR[kind] }} />
                {KIND_LABEL[kind]} · {n}
              </span>
            );
          })}
        </div>
        {!frozen ? (
          <div style={cmdRowStyle}>
            <span style={metaStyle}>Worker anordnen:</span>
            <Button variant="secondary" disabled={busy} onClick={() => run(() => api.reviseHarness(id, { command: "parallel" }))}>
              Parallel
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => run(() => api.reviseHarness(id, { command: "sequence" }))}>
              Sequenziell
            </Button>
          </div>
        ) : null}
      </div>

      {/* Befunde / Anti-Muster */}
      {graph.findings.length > 0 ? (
        <>
          <div style={sectionLabel}>Preflight-Befunde (docs/04)</div>
          <div style={{ ...cardStyle, marginBottom: "var(--sp-6)" }}>
            <ul style={plainListStyle}>
              {graph.findings.map((f, i) => (
                <li key={i} style={{ fontSize: 14 }}>
                  <span
                    style={{
                      ...tagStyle,
                      color: SEVERITY_COLOR[f.severity],
                      borderColor: SEVERITY_COLOR[f.severity],
                    }}
                  >
                    {f.severity}
                  </span>
                  <code style={ruleStyle}>{f.rule}</code> — {f.message}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      {/* Agenten-Panels (Accordion, CRUD, Skill-Zuordnung inline) */}
      <div style={sectionLabel}>Agenten ({graph.agents.length})</div>
      <p style={{ ...metaStyle, marginTop: 0, marginBottom: "var(--sp-2)" }}>
        Jeder Agent ist mit passenden, **freigegebenen** Skills vorbelegt (Vorschlag).
        Du entscheidest (HITL): behalten, weitere zuordnen oder entfernen — Skills
        erscheinen als Tags und landen auditierbar im Harness-ZIP. Neue/gesperrte
        Skills verwaltet der <strong>Adminbereich</strong>.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
        {graph.agents.map((a) => (
          <AgentCard
            key={a.id}
            agent={a}
            catalog={skills}
            skillBySlug={skillBySlug}
            frozen={frozen}
            busy={busy}
            onSave={(patch) =>
              run(() =>
                api.reviseHarness(id, {
                  command: "agent",
                  op: "update",
                  agent_id: a.id,
                  agent: patch,
                }),
              )
            }
            onDelete={() =>
              run(() =>
                api.reviseHarness(id, { command: "agent", op: "delete", agent_id: a.id }),
              )
            }
            onAddSkill={(catalogId) =>
              run(() =>
                api.reviseHarness(id, { command: "skill", agent_id: a.id, catalog_id: catalogId }),
              )
            }
            onRemoveSkill={(slug) => {
              const cs = skillBySlug.get(slug);
              run(() =>
                api.reviseHarness(
                  id,
                  cs
                    ? { command: "skill", agent_id: a.id, catalog_id: cs.catalog_id, remove: true }
                    : { command: "skill", agent_id: a.id, skill: slug, remove: true },
                ),
              );
            }}
          />
        ))}
      </div>

      {!frozen ? (
        <AddAgent busy={busy} onAdd={(spec) => run(() => api.reviseHarness(id, { command: "agent", op: "add", agent: spec }))} />
      ) : null}

      {/* HITL-Punkte */}
      <div style={{ ...sectionLabel, marginTop: "var(--sp-6)" }}>
        Human-in-the-Loop ({graph.hitl_points.length})
      </div>
      <div style={{ ...cardStyle, marginBottom: "var(--sp-6)" }}>
        <ul style={plainListStyle}>
          {graph.hitl_points.map((p, i) => (
            <li key={i} style={{ fontSize: 14 }}>◆ {p}</li>
          ))}
        </ul>
      </div>

      {/* Artefakte (nach Gate 3) */}
      {frozen && graph.artifacts.length > 0 ? (
        <>
          <div style={sectionLabel}>Artefakte ({graph.artifacts.length})</div>
          <div style={{ ...cardStyle, marginBottom: "var(--sp-6)" }}>
            <p style={subMetaStyle}>
              Zip-Hash: <code style={ruleStyle}>{graph.zip_sha256}</code>. Integrität
              prüfen mit <code style={ruleStyle}>shasum -a 256 -c checksums.txt</code>.
            </p>
            <ul style={{ ...plainListStyle, maxHeight: 220, overflow: "auto" }}>
              {graph.artifacts.map((art) => (
                <li key={art.path} style={artItemStyle}>
                  <span style={tagStyle}>{art.kind}</span>
                  <code style={{ fontSize: 12 }}>{art.path}</code>
                  <span style={metaStyle}> · {art.size_bytes} B</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}

      {/* Export / Gate 3 */}
      {frozen ? <SaveExport id={id} graph={graph} /> : null}
      <div style={actionsStyle}>
        <Button variant="secondary" onClick={() => router.push(`/projects/${id}/review`)}>
          Zurück zum Review
        </Button>
        <Link href={`/projects/${id}/print`} style={{ textDecoration: "none" }}>
          <Button variant="secondary">🖨 Projekt drucken</Button>
        </Link>
        {!frozen ? (
          <Button
            variant="accent"
            disabled={busy || hasFail}
            title={hasFail ? "Blockierende Befunde (fail) zuerst beheben" : "Harness freigeben (Gate 3)"}
            onClick={() => run(() => api.approveHarness(id))}
          >
            Freigeben & kompilieren (Gate 3)
          </Button>
        ) : null}
      </div>
    </PageShell>
  );
}

// ---------------------------------------------------------------------------

/**
 * „Speichern unter" (Gate 3) — den eingefrorenen Harness lokal ablegen. Der
 * Nutzer wählt **vorher** gepackt (.zip) oder entpackt (ganze Struktur, neuer
 * benennbarer Ordner). Volles Speichern (Ort/Ordner) in Chrome/Edge via File
 * System Access API; in Firefox/Safari ehrlicher Download-Fallback.
 * Spec: docs/10_local-storage-and-save-as.md.
 */
function SaveExport({ id, graph }: { id: string; graph: HarnessGraph }): React.ReactElement {
  const [mode, setMode] = React.useState<"zip" | "unzip">("zip");
  const [newFolder, setNewFolder] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);
  // Capability erst clientseitig bestimmen (kein SSR-Hydration-Mismatch).
  const [fsCap, setFsCap] = React.useState<boolean | null>(null);
  React.useEffect(() => setFsCap(supportsFsAccess()), []);

  const root = graph.zip_name.replace(".harness.zip", "");

  async function onSave(): Promise<void> {
    setBusy(true);
    setNote(null);
    try {
      if (mode === "zip") {
        const blob = await api.harnessZipBlob(id);
        setNote(resultNote(await saveZip(blob, graph.zip_name), "zip"));
      } else {
        const map = await api.getHarnessFiles(id);
        const r = await saveUnzipped(map.root, map.files, newFolder);
        if (r === "unsupported") {
          // Fallback: gepackt herunterladen, manuell entpacken.
          const blob = await api.harnessZipBlob(id);
          await saveZip(blob, graph.zip_name);
          setNote(
            "Entpacktes Speichern braucht Chrome/Edge — die Zip wurde stattdessen " +
              "heruntergeladen, bitte manuell entpacken.",
          );
        } else {
          setNote(resultNote(r, "unzip"));
        }
      }
    } catch (e: unknown) {
      setNote(e instanceof ApiError ? e.message : "Speichern fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...cardStyle, marginBottom: "var(--sp-4)", borderColor: "var(--c-green)" }}>
      <div style={sectionLabel}>Speichern unter</div>
      <p style={subMetaStyle}>
        Den eingefrorenen Harness lokal ablegen — gepackt als{" "}
        <code style={ruleStyle}>.zip</code> oder entpackt als ganze Ordnerstruktur
        (mit neuem, benennbarem Ordner).
      </p>

      {/* Format-Wahl (vorher) */}
      <div style={{ ...cmdRowStyle, marginBottom: "var(--sp-1)" }}>
        <label style={radioLabelStyle}>
          <input
            type="radio"
            name="savemode"
            checked={mode === "zip"}
            onChange={() => setMode("zip")}
          />
          Gepackt (.zip)
        </label>
        <label style={radioLabelStyle}>
          <input
            type="radio"
            name="savemode"
            checked={mode === "unzip"}
            onChange={() => setMode("unzip")}
          />
          Entpackt (ganze Struktur)
        </label>
      </div>

      {mode === "unzip" ? (
        <label style={{ ...fieldStyle, maxWidth: 380 }}>
          <span style={fieldLabelStyle}>Neuer Ordnername (optional — Default: {root})</span>
          <input
            style={inputStyle}
            placeholder={root}
            value={newFolder}
            onChange={(e) => setNewFolder(e.target.value)}
          />
        </label>
      ) : null}

      {/* Browser-Hinweis (Chrome/Edge vs. Firefox/Safari) */}
      <p style={{ ...metaStyle, marginTop: "var(--sp-2)" }}>
        {fsCap === null
          ? null
          : fsCap
            ? "✓ Dieser Browser (Chrome/Edge) unterstützt „Speichern unter“ mit freier Ort- und Ordnerwahl. Blockiert eine Unternehmensrichtlinie den Dateidialog, wird automatisch der Standard-Download genutzt."
            : "ℹ Dieser Browser (Firefox/Safari) erlaubt nur den Standard-Download. Freie Ort-/Ordnerwahl und entpacktes Speichern gehen in Chrome/Edge."}
      </p>

      <div style={{ ...cmdRowStyle, marginTop: "var(--sp-3)" }}>
        <Button variant="accent" disabled={busy} onClick={() => void onSave()}>
          {busy ? "Speichere…" : "Speichern unter…"}
        </Button>
        <a href={api.harnessDownloadUrl(id)} style={{ textDecoration: "none" }}>
          <Button variant="secondary">Zip-Download ({graph.zip_name})</Button>
        </a>
      </div>
      {note ? (
        <p style={{ ...metaStyle, marginTop: "var(--sp-2)", color: "var(--c-text)" }}>{note}</p>
      ) : null}
    </div>
  );
}

function resultNote(r: SaveResult, mode: "zip" | "unzip"): string {
  switch (r) {
    case "saved":
      return mode === "zip" ? "Zip gespeichert ✓" : "Ordnerstruktur gespeichert ✓";
    case "downloaded":
      return "Über den Browser-Download gespeichert ✓";
    case "cancelled":
      return "Abgebrochen.";
    default:
      return "In diesem Browser nicht unterstützt.";
  }
}

// ---------------------------------------------------------------------------

const TRUST_BADGE: Record<string, string> = {
  "anthropic-vetted": "var(--c-green)",
  "aegira-certified": "var(--c-navy)",
  "world-top": "var(--c-gold)",
  community: "var(--c-steel)",
  experimental: "var(--c-red)",
};

/** Agenten-Karte als Accordion: Tags immer sichtbar, Verwaltung beim Aufklappen. */
function AgentCard({
  agent,
  catalog,
  skillBySlug,
  frozen,
  busy,
  onSave,
  onDelete,
  onAddSkill,
  onRemoveSkill,
}: {
  agent: AgentSpec;
  catalog: CatalogSkill[];
  skillBySlug: Map<string, CatalogSkill>;
  frozen: boolean;
  busy: boolean;
  onSave: (patch: Partial<AgentSpec>) => void;
  onDelete: () => void;
  onAddSkill: (catalogId: string) => void;
  onRemoveSkill: (slug: string) => void;
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [showAll, setShowAll] = React.useState(false);
  const [mission, setMission] = React.useState(agent.mission);
  const [tasks, setTasks] = React.useState(agent.tasks.join("\n"));
  const [confirmDel, setConfirmDel] = React.useState(false);

  React.useEffect(() => {
    setMission(agent.mission);
    setTasks(agent.tasks.join("\n"));
  }, [agent]);

  const assigned = new Set(agent.skills);
  const available = catalog
    .filter((s) => !assigned.has(s.slug))
    .filter((s) => showAll || s.agent_ids.includes(agent.name))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div style={{ ...cardStyle, borderColor: KIND_COLOR[agent.kind], padding: "var(--sp-3)" }}>
      {/* Accordion-Header */}
      <button
        type="button"
        style={accHeadStyle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span style={{ ...nodeDot, backgroundColor: KIND_COLOR[agent.kind] }} />
        <strong style={{ flex: 1, textAlign: "left" }}>
          {agent.role} <span style={metaStyle}>· {KIND_LABEL[agent.kind]} · {agent.skills.length} Skills</span>
        </strong>
        <code style={ruleStyle}>{agent.name}.md</code>
        <span aria-hidden="true" style={{ marginLeft: 8 }}>{open ? "▾" : "▸"}</span>
      </button>

      {/* Skill-Tags — immer sichtbar */}
      <div style={{ ...pvmRowStyle, marginTop: "var(--sp-2)" }}>
        {agent.skills.map((s) => {
          const cs = skillBySlug.get(s);
          return (
            <span
              key={s}
              style={{ ...skillChipStyle, borderColor: cs ? TRUST_BADGE[cs.trust_tier] : "var(--c-border-strong)" }}
              title={cs ? cs.description : s}
            >
              {cs?.title ?? s}
              {!frozen ? (
                <button type="button" style={chipRemoveStyle} title="Skill entfernen" onClick={() => onRemoveSkill(s)}>
                  ×
                </button>
              ) : null}
            </span>
          );
        })}
        {agent.skills.length === 0 ? <span style={metaStyle}>keine Skills</span> : null}
      </div>

      {/* Accordion-Body */}
      {open ? (
        <div style={{ marginTop: "var(--sp-2)", borderTop: "1px solid var(--c-border)", paddingTop: "var(--sp-2)" }}>
          {editing && !frozen ? (
            <>
              <label style={fieldStyle}>
                <span style={fieldLabelStyle}>Mission</span>
                <textarea style={{ ...inputStyle, minHeight: 64 }} value={mission} onChange={(e) => setMission(e.target.value)} />
              </label>
              <label style={fieldStyle}>
                <span style={fieldLabelStyle}>Aufgaben (eine pro Zeile)</span>
                <textarea style={{ ...inputStyle, minHeight: 80 }} value={tasks} onChange={(e) => setTasks(e.target.value)} />
              </label>
              <div style={{ ...cmdRowStyle, marginTop: "var(--sp-2)" }}>
                <Button variant="secondary" disabled={busy} onClick={() => {
                  onSave({ mission, tasks: tasks.split("\n").map((t) => t.trim()).filter(Boolean) });
                  setEditing(false);
                }}>
                  Speichern
                </Button>
                <Button variant="secondary" onClick={() => setEditing(false)}>Abbrechen</Button>
              </div>
            </>
          ) : (
            <p style={{ fontSize: 14, marginTop: 0, lineHeight: 1.5 }}>{agent.mission}</p>
          )}

          {!frozen ? (
            <>
              {/* Skill zuordnen */}
              <button type="button" style={addToggleStyle} aria-expanded={addOpen} onClick={() => setAddOpen((v) => !v)}>
                {addOpen ? "▾ " : "+ "}Skill zuordnen
              </button>
              {addOpen ? (
                <div style={addBoxStyle}>
                  <label style={{ ...metaStyle, display: "flex", alignItems: "center", gap: 6, marginBottom: "var(--sp-1)" }}>
                    <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
                    Alle freigegebenen Skills anzeigen (statt nur empfohlene)
                  </label>
                  {available.length === 0 ? (
                    <p style={metaStyle}>Keine weiteren freigegebenen Skills für diese Rolle.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 240, overflow: "auto" }}>
                      {available.map((s) => (
                        <div key={s.catalog_id} style={addRowStyle}>
                          <span style={{ ...trustDotStyle, backgroundColor: TRUST_BADGE[s.trust_tier] }} title={s.trust_tier} />
                          <span style={{ flex: 1, fontSize: 13 }}>
                            <strong>{s.title}</strong>{" "}
                            <code style={{ fontSize: 11, color: "var(--c-steel)" }}>{s.catalog_id}</code>
                            <span style={{ ...metaStyle, display: "block" }}>{s.description}</span>
                          </span>
                          <Button variant="secondary" disabled={busy} onClick={() => onAddSkill(s.catalog_id)}>
                            + hinzufügen
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              <div style={{ ...cmdRowStyle, marginTop: "var(--sp-3)" }}>
                {!editing ? <Button variant="secondary" onClick={() => setEditing(true)}>Bearbeiten</Button> : null}
                {!confirmDel ? (
                  <Button variant="secondary" style={dangerStyle} onClick={() => setConfirmDel(true)}>Löschen</Button>
                ) : (
                  <span style={cmdRowStyle}>
                    <Button variant="secondary" style={dangerSolidStyle} disabled={busy} onClick={onDelete}>Wirklich löschen</Button>
                    <Button variant="secondary" onClick={() => setConfirmDel(false)}>Abbrechen</Button>
                  </span>
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AddAgent({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (spec: Partial<AgentSpec>) => void;
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [role, setRole] = React.useState("");
  const [kind, setKind] = React.useState<HarnessNodeKind>("worker");
  const [mission, setMission] = React.useState("");

  if (!open) {
    return (
      <div style={{ marginTop: "var(--sp-3)" }}>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          + Agent hinzufügen
        </Button>
      </div>
    );
  }
  const valid = role.trim().length >= 3 && mission.trim().length >= 40;
  return (
    <div style={{ ...cardStyle, marginTop: "var(--sp-3)", borderStyle: "dashed" }}>
      <div style={sectionLabel}>Neuer Agent</div>
      <div style={cmdRowStyle}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Rolle (z. B. Daten-Agent)"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        />
        <select style={{ ...inputStyle, maxWidth: 160 }} value={kind} onChange={(e) => setKind(e.target.value as HarnessNodeKind)}>
          <option value="worker">Worker</option>
          <option value="evaluator">Reviewer</option>
          <option value="orchestrator">Orchestrator</option>
          <option value="hitl">HITL</option>
        </select>
      </div>
      <label style={{ ...fieldStyle, marginTop: "var(--sp-2)" }}>
        <span style={fieldLabelStyle}>Mission (mind. 40 Zeichen — keine vage Delegation)</span>
        <textarea
          style={{ ...inputStyle, minHeight: 64 }}
          value={mission}
          onChange={(e) => setMission(e.target.value)}
        />
      </label>
      <div style={{ ...cmdRowStyle, marginTop: "var(--sp-2)" }}>
        <Button
          variant="secondary"
          disabled={busy || !valid}
          onClick={() => {
            onAdd({ role: role.trim(), name: role.trim(), kind, mission: mission.trim(), hitl: kind === "hitl" });
            setOpen(false);
            setRole("");
            setMission("");
          }}
        >
          Anlegen
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}

// --- Styles ----------------------------------------------------------------

const leadStyle: React.CSSProperties = {
  color: "var(--c-text-muted)",
  marginBottom: "var(--sp-5)",
  marginTop: "var(--sp-2)",
  lineHeight: 1.6,
  maxWidth: "64ch",
};
const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  flexWrap: "wrap",
};
const pillStyle: React.CSSProperties = {
  padding: "2px var(--sp-2)",
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
  border: "1px solid",
  borderRadius: "var(--r-pill)",
  whiteSpace: "nowrap",
};
const sectionLabel: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--c-text-muted)",
  marginBottom: "var(--sp-2)",
};
const nodeDot: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  flexShrink: 0,
};
const cmdRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--sp-2)",
  alignItems: "center",
  flexWrap: "wrap",
};
const pvmRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--sp-1)",
};
const skillChipStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 12,
  padding: "1px var(--sp-2)",
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "var(--c-border-strong)",
  borderRadius: "var(--r-pill)",
};
const accHeadStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  width: "100%",
  background: "transparent",
  border: 0,
  cursor: "pointer",
  padding: 0,
  minHeight: 44,
  fontSize: 15,
  color: "var(--c-text)",
};
const addToggleStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  cursor: "pointer",
  color: "var(--c-steel)",
  fontSize: 13,
  padding: "var(--sp-2) 0",
  minHeight: 44,
};
const addBoxStyle: React.CSSProperties = {
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-md)",
  padding: "var(--sp-2)",
  backgroundColor: "var(--c-surface)",
  marginBottom: "var(--sp-2)",
};
const addRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--sp-2)",
  padding: "var(--sp-1) 0",
  borderBottom: "1px solid var(--c-border)",
};
const trustDotStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  flexShrink: 0,
  marginTop: 4,
};
const chipRemoveStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  cursor: "pointer",
  color: "var(--c-red)",
  fontWeight: 700,
  fontSize: 14,
  lineHeight: 1,
  padding: 0,
};
const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  marginTop: "var(--sp-2)",
};
const fieldLabelStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--c-text-muted)",
  fontWeight: 600,
};
const inputStyle: React.CSSProperties = {
  padding: "var(--sp-1) var(--sp-2)",
  fontSize: 14,
  fontFamily: "var(--font-body)",
  color: "var(--c-text)",
  backgroundColor: "var(--c-surface)",
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-md)",
  width: "100%",
};
const metaStyle: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  color: "var(--c-text-muted)",
};
const radioLabelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--sp-1)",
  fontSize: 14,
  cursor: "pointer",
};
const subMetaStyle: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  color: "var(--c-text-muted)",
  marginBottom: "var(--sp-2)",
};
const plainListStyle: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: "var(--sp-1)",
};
const tagStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0 var(--sp-1)",
  marginRight: "var(--sp-2)",
  fontSize: 11,
  fontWeight: 600,
  border: "1px solid",
  borderRadius: "var(--r-pill)",
};
const ruleStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--c-steel)",
};
const artItemStyle: React.CSSProperties = {
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-1)",
  flexWrap: "wrap",
};
const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "var(--sp-2)",
  flexWrap: "wrap",
};
const dangerStyle: React.CSSProperties = {
  color: "var(--c-red)",
  borderColor: "var(--c-red)",
};
const dangerSolidStyle: React.CSSProperties = {
  color: "var(--c-vellum)",
  backgroundColor: "var(--c-red)",
  borderColor: "var(--c-red)",
};
const errorStyle: React.CSSProperties = {
  padding: "var(--sp-3) var(--sp-4)",
  backgroundColor: "rgba(195, 66, 63, 0.08)",
  border: "1px solid var(--c-red)",
  borderRadius: "var(--r-md)",
  color: "var(--c-red)",
  marginBottom: "var(--sp-4)",
};
