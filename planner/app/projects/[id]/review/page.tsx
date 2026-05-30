/**
 * Schritt 7 — Review & Freigabe (Gate 2), PLANEN-Phase.
 *
 * Spec: docs/09_process-flow.md (Schritt 7). Der bei Schritt 6 erzeugte ZGPM-Plan
 * wird hier inline geprüft und editiert. Jede gespeicherte Änderung erzeugt eine
 * neue, unveränderliche Version (append-only); ein Diff zeigt, was sich gegenüber
 * der Vorversion geändert hat. Mit Gate 2 wird die Version als Bauvorlage
 * eingefroren. Editierbar ist die fachliche Substanz, nicht die PVM-Struktur —
 * Ampeln leitet der Server nach jeder Revision neu ab.
 */

"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";

import { PageShell } from "../../../../components/PageShell";
import { Button, cardStyle } from "../../../../components/ui";
import {
  api,
  ApiError,
  type Plan,
  type Project,
  type RiskAmpel,
  type ReviewerStatus,
  type MilestonePatch,
  type ActivityPatch,
  type RiskPatch,
} from "../../../../lib/api";

const AMPEL_COLOR: Record<RiskAmpel, string> = {
  rot: "var(--c-red)",
  gelb: "var(--c-amber)",
  gruen: "var(--c-green)",
};
const REVIEWER_COLOR: Record<ReviewerStatus, string> = {
  PASS: "var(--c-green)",
  NEEDS_REVISION: "var(--c-amber)",
  HARD_FAIL: "var(--c-red)",
};

function isoToDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

/** Lokaler, editierbarer Entwurf — nur die fachlich änderbaren Felder. */
interface Draft {
  milestones: Record<string, { name: string; planned_date: string }>;
  activities: Record<string, { description: string; effort_pt: number }>;
  risks: Record<
    string,
    { description: string; probability: number; impact: number; mitigation: string }
  >;
}

function buildDraft(plan: Plan): Draft {
  const d: Draft = { milestones: {}, activities: {}, risks: {} };
  for (const m of plan.milestones) {
    d.milestones[m.id] = {
      name: m.name,
      planned_date: isoToDateInput(m.planned_date),
    };
    for (const a of m.activities) {
      d.activities[a.id] = { description: a.description, effort_pt: a.effort_pt };
    }
    for (const r of m.mrl) {
      d.risks[r.id] = {
        description: r.description,
        probability: r.probability,
        impact: r.impact,
        mitigation: r.mitigation,
      };
    }
  }
  for (const r of plan.prl) {
    d.risks[r.id] = {
      description: r.description,
      probability: r.probability,
      impact: r.impact,
      mitigation: r.mitigation,
    };
  }
  return d;
}

/** Erzeugt aus Plan + Draft die minimalen Patches (nur geänderte Felder). */
function diffToPatches(plan: Plan, draft: Draft) {
  const milestones: MilestonePatch[] = [];
  const activities: ActivityPatch[] = [];
  const risks: RiskPatch[] = [];

  for (const m of plan.milestones) {
    const d = draft.milestones[m.id];
    const patch: MilestonePatch = { id: m.id };
    if (d.name !== m.name) patch.name = d.name;
    if (d.planned_date !== isoToDateInput(m.planned_date))
      patch.planned_date = d.planned_date;
    if (patch.name !== undefined || patch.planned_date !== undefined)
      milestones.push(patch);
    for (const a of m.activities) {
      const da = draft.activities[a.id];
      const ap: ActivityPatch = { id: a.id };
      if (da.description !== a.description) ap.description = da.description;
      if (da.effort_pt !== a.effort_pt) ap.effort_pt = da.effort_pt;
      if (ap.description !== undefined || ap.effort_pt !== undefined)
        activities.push(ap);
    }
  }
  const allRisks = [...plan.prl, ...plan.milestones.flatMap((m) => m.mrl)];
  for (const r of allRisks) {
    const dr = draft.risks[r.id];
    const rp: RiskPatch = { id: r.id };
    if (dr.description !== r.description) rp.description = dr.description;
    if (dr.probability !== r.probability) rp.probability = dr.probability;
    if (dr.impact !== r.impact) rp.impact = dr.impact;
    if (dr.mitigation !== r.mitigation) rp.mitigation = dr.mitigation;
    if (Object.keys(rp).length > 1) risks.push(rp);
  }
  return { milestones, activities, risks };
}

interface DiffLine {
  label: string;
  from: string;
  to: string;
}

/** Vergleicht zwei Versionen und listet die geänderten Substanzfelder. */
function diffVersions(prev: Plan, curr: Plan): DiffLine[] {
  const lines: DiffLine[] = [];
  if (prev.overall_ampel !== curr.overall_ampel)
    lines.push({
      label: "Gesamtrisiko",
      from: prev.overall_ampel,
      to: curr.overall_ampel,
    });
  if (prev.reviewer_status !== curr.reviewer_status)
    lines.push({
      label: "Reviewer-Status",
      from: prev.reviewer_status,
      to: curr.reviewer_status,
    });
  const pm = new Map(prev.milestones.map((m) => [m.id, m]));
  for (const m of curr.milestones) {
    const p = pm.get(m.id);
    if (!p) continue;
    if (p.name !== m.name)
      lines.push({ label: `${m.id} Name`, from: p.name, to: m.name });
    if (p.planned_date !== m.planned_date)
      lines.push({
        label: `${m.id} Termin`,
        from: isoToDateInput(p.planned_date),
        to: isoToDateInput(m.planned_date),
      });
    if (p.ampel !== m.ampel)
      lines.push({ label: `${m.id} Ampel`, from: p.ampel, to: m.ampel });
    const pa = new Map(p.activities.map((a) => [a.id, a]));
    for (const a of m.activities) {
      const q = pa.get(a.id);
      if (q && q.effort_pt !== a.effort_pt)
        lines.push({
          label: `${a.id} Aufwand`,
          from: `${q.effort_pt} PT`,
          to: `${a.effort_pt} PT`,
        });
    }
    const pr = new Map(p.mrl.map((r) => [r.id, r]));
    for (const r of m.mrl) {
      const q = pr.get(r.id);
      if (q && (q.probability !== r.probability || q.impact !== r.impact))
        lines.push({
          label: `${r.id} E×A`,
          from: `${q.probability}×${q.impact}`,
          to: `${r.probability}×${r.impact}`,
        });
    }
  }
  const pp = new Map(prev.prl.map((r) => [r.id, r]));
  for (const r of curr.prl) {
    const q = pp.get(r.id);
    if (q && (q.probability !== r.probability || q.impact !== r.impact))
      lines.push({
        label: `${r.id} E×A`,
        from: `${q.probability}×${q.impact}`,
        to: `${r.probability}×${r.impact}`,
      });
  }
  return lines;
}

export default function ReviewPage(): React.ReactElement {
  const router = useRouter();
  const id = useParams<{ id: string }>().id;

  const [project, setProject] = React.useState<Project | null>(null);
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [versions, setVersions] = React.useState<Plan[]>([]);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [note, setNote] = React.useState("");
  // WP-6 — aktiver Suffizienz-Entscheidungspunkt vor Gate 2 (kein stiller Übergang).
  const [sufficient, setSufficient] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reload = React.useCallback(async () => {
    const [proj, pl, vs] = await Promise.all([
      api.getProject(id),
      api.getPlan(id),
      api.listPlanVersions(id),
    ]);
    setProject(proj);
    setPlan(pl);
    setVersions(vs);
    setDraft(buildDraft(pl));
  }, [id]);

  React.useEffect(() => {
    reload()
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) {
          setError("Noch kein Plan erzeugt — bitte zuerst Schritt 6.");
          return;
        }
        setError(e instanceof ApiError ? e.message : "Review nicht ladbar.");
      })
      .finally(() => setLoading(false));
  }, [reload]);

  const frozen = project?.gate2_approved_at != null;
  const patches =
    plan && draft ? diffToPatches(plan, draft) : { milestones: [], activities: [], risks: [] };
  const dirty =
    patches.milestones.length + patches.activities.length + patches.risks.length > 0;

  async function save(): Promise<void> {
    if (!dirty) return;
    setBusy(true);
    setError(null);
    try {
      await api.revisePlan(id, { ...patches, note: note || undefined });
      setNote("");
      await reload();
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Revision fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function approve(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      setProject(await api.approvePlan(id));
    } catch (e: unknown) {
      setError(e instanceof ApiError ? e.message : "Freigabe fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !plan || !draft) {
    return (
      <PageShell subtitle="Review · Schritt 7" helpTopic="review">
        {error ? <p style={errorStyle}>{error}</p> : <p>Lade…</p>}
      </PageShell>
    );
  }

  const prevVersion =
    versions.length >= 2 ? versions[versions.length - 2] : null;
  const diff = prevVersion ? diffVersions(prevVersion, plan) : [];
  const hardFail = plan.reviewer_status === "HARD_FAIL";

  return (
    <PageShell subtitle="Review · Schritt 7" helpTopic="review">
      <div style={headerRowStyle}>
        <h1 style={{ margin: 0 }}>Review & Freigabe · v{plan.version}</h1>
        <span
          style={{
            ...pillStyle,
            color: REVIEWER_COLOR[plan.reviewer_status],
            borderColor: REVIEWER_COLOR[plan.reviewer_status],
          }}
        >
          Reviewer: {plan.reviewer_status}
        </span>
        <span
          style={{
            ...pillStyle,
            color: AMPEL_COLOR[plan.overall_ampel],
            borderColor: AMPEL_COLOR[plan.overall_ampel],
          }}
        >
          Gesamtrisiko: {plan.overall_ampel}
        </span>
        {frozen ? (
          <span style={{ ...pillStyle, color: "var(--c-green)", borderColor: "var(--c-green)" }}>
            Gate 2 ✓ · v{project?.approved_plan_version} freigegeben
          </span>
        ) : null}
      </div>
      <p style={leadStyle}>
        Prüfe und schärfe den Plan. Jede gespeicherte Änderung erzeugt eine neue
        Version (nichts wird überschrieben). Ampeln werden nach dem Speichern neu
        abgeleitet. Mit Gate 2 frierst du die Version als Bauvorlage ein.
      </p>

      {error ? <p style={errorStyle}>{error}</p> : null}

      {frozen ? (
        <div style={{ ...cardStyle, marginBottom: "var(--sp-4)", borderColor: "var(--c-green)" }}>
          <strong>Plan eingefroren.</strong> Version{" "}
          {project?.approved_plan_version} wurde bei Gate 2 freigegeben und ist die
          Bauvorlage für den Harness (Schritt 8). Revisionen sind nicht mehr möglich.
        </div>
      ) : null}

      {diff.length > 0 ? (
        <div style={{ ...cardStyle, marginBottom: "var(--sp-4)" }}>
          <div style={sectionLabel}>
            Änderungen v{prevVersion?.version} → v{plan.version}
          </div>
          <ul style={plainListStyle}>
            {diff.map((d, i) => (
              <li key={i} style={{ fontSize: 14 }}>
                <strong>{d.label}:</strong>{" "}
                <span style={diffFromStyle}>{d.from}</span> →{" "}
                <span style={diffToStyle}>{d.to}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {plan.reviewer_findings.length > 0 ? (
        <div style={{ ...cardStyle, marginBottom: "var(--sp-4)" }}>
          <div style={sectionLabel}>Reviewer-Befunde</div>
          <ul style={plainListStyle}>
            {plan.reviewer_findings.map((f, i) => (
              <li key={i} style={{ fontSize: 14 }}>
                <span
                  style={{
                    ...tagStyle,
                    color:
                      f.severity === "fail"
                        ? "var(--c-red)"
                        : f.severity === "warn"
                          ? "var(--c-amber)"
                          : "var(--c-green)",
                    borderColor:
                      f.severity === "fail"
                        ? "var(--c-red)"
                        : f.severity === "warn"
                          ? "var(--c-amber)"
                          : "var(--c-green)",
                  }}
                >
                  {f.severity}
                </span>
                <code style={ruleStyle}>{f.rule}</code> — {f.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Editierbare Meilensteine */}
      <div style={sectionLabel}>Meilensteine bearbeiten</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", marginBottom: "var(--sp-5)" }}>
        {plan.milestones.map((m) => (
          <div key={m.id} style={cardStyle}>
            <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center" }}>
              <span style={{ ...dotStyle, backgroundColor: AMPEL_COLOR[m.ampel] }} />
              <span style={metaStyle}>{m.id} · {m.stream_code}</span>
            </div>
            <div style={fieldRowStyle}>
              <label style={fieldStyle}>
                <span style={fieldLabelStyle}>Zustand (Meilenstein-Name)</span>
                <input
                  style={inputStyle}
                  value={draft.milestones[m.id].name}
                  disabled={frozen}
                  onChange={(e) =>
                    setDraft((d) =>
                      d && {
                        ...d,
                        milestones: {
                          ...d.milestones,
                          [m.id]: { ...d.milestones[m.id], name: e.target.value },
                        },
                      },
                    )
                  }
                />
              </label>
              <label style={{ ...fieldStyle, maxWidth: 180 }}>
                <span style={fieldLabelStyle}>Fällig</span>
                <input
                  type="date"
                  style={inputStyle}
                  value={draft.milestones[m.id].planned_date}
                  disabled={frozen}
                  onChange={(e) =>
                    setDraft((d) =>
                      d && {
                        ...d,
                        milestones: {
                          ...d.milestones,
                          [m.id]: {
                            ...d.milestones[m.id],
                            planned_date: e.target.value,
                          },
                        },
                      },
                    )
                  }
                />
              </label>
            </div>

            {m.activities.map((a) => (
              <div key={a.id} style={fieldRowStyle}>
                <label style={fieldStyle}>
                  <span style={fieldLabelStyle}>Aktivität {a.id}</span>
                  <input
                    style={inputStyle}
                    value={draft.activities[a.id].description}
                    disabled={frozen}
                    onChange={(e) =>
                      setDraft((d) =>
                        d && {
                          ...d,
                          activities: {
                            ...d.activities,
                            [a.id]: {
                              ...d.activities[a.id],
                              description: e.target.value,
                            },
                          },
                        },
                      )
                    }
                  />
                </label>
                <label style={{ ...fieldStyle, maxWidth: 120 }}>
                  <span style={fieldLabelStyle}>Aufwand (PT)</span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    style={inputStyle}
                    value={draft.activities[a.id].effort_pt}
                    disabled={frozen}
                    onChange={(e) =>
                      setDraft((d) =>
                        d && {
                          ...d,
                          activities: {
                            ...d.activities,
                            [a.id]: {
                              ...d.activities[a.id],
                              effort_pt: Number(e.target.value),
                            },
                          },
                        },
                      )
                    }
                  />
                </label>
              </div>
            ))}

            {m.mrl.map((r) => (
              <RiskEditor
                key={r.id}
                rid={r.id}
                ampel={r.ampel}
                draft={draft}
                setDraft={setDraft}
                frozen={frozen}
                label={`Risiko ${r.id}`}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Editierbare Projektrisiken */}
      <div style={sectionLabel}>Projektrisiken (PRL) bearbeiten</div>
      <div style={{ ...cardStyle, marginBottom: "var(--sp-5)" }}>
        {plan.prl.map((r) => (
          <RiskEditor
            key={r.id}
            rid={r.id}
            ampel={r.ampel}
            draft={draft}
            setDraft={setDraft}
            frozen={frozen}
            label={r.id}
          />
        ))}
      </div>

      {!frozen ? (
        <div style={{ ...cardStyle, marginBottom: "var(--sp-4)" }}>
          <label style={fieldStyle}>
            <span style={fieldLabelStyle}>Notiz zur Revision (optional)</span>
            <input
              style={inputStyle}
              value={note}
              placeholder="z. B. Termine nach Kick-off geschärft"
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div style={{ ...subMetaStyle, marginTop: "var(--sp-2)" }}>
            {dirty
              ? `${patches.milestones.length + patches.activities.length + patches.risks.length} Änderung(en) bereit zum Speichern.`
              : "Keine ungespeicherten Änderungen."}
          </div>
        </div>
      ) : null}

      {/* WP-6 — Suffizienz-Entscheidung vor Gate 2 */}
      {!frozen ? (
        <div
          style={{
            ...cardStyle,
            marginBottom: "var(--sp-4)",
            borderColor: sufficient ? "var(--c-green)" : "var(--c-gold)",
          }}
        >
          <div style={sectionLabel}>Reicht der Planungsstand?</div>
          <p style={{ ...subMetaStyle, marginTop: 0 }}>
            Bevor du freigibst, entscheide bewusst: Ist der Plan reif für die
            Bauvorlage — oder willst du ihn noch verfeinern? Kein stiller Übergang
            in die Freigabe.
          </p>
          <label style={{ display: "flex", gap: "var(--sp-2)", alignItems: "flex-start", fontSize: 14 }}>
            <input
              type="checkbox"
              checked={sufficient}
              disabled={dirty}
              onChange={(e) => setSufficient(e.target.checked)}
            />
            <span>
              Der Planungsstand reicht für die Freigabe (Gate 2).
              {dirty ? " — erst offene Änderungen speichern." : ""}
            </span>
          </label>
        </div>
      ) : null}

      <div style={actionsStyle}>
        <Button variant="secondary" onClick={() => router.push(`/projects/${id}/plan`)}>
          Zurück zum Plan
        </Button>
        {!frozen ? (
          <Button variant="secondary" onClick={save} disabled={busy || !dirty}>
            {busy ? "…" : `Änderungen speichern (v${plan.version + 1})`}
          </Button>
        ) : null}
        {!frozen ? (
          <Button
            variant="accent"
            onClick={approve}
            disabled={busy || dirty || hardFail || !sufficient}
            title={
              hardFail
                ? "HARD_FAIL — Plan zuerst überarbeiten"
                : dirty
                  ? "Erst Änderungen speichern"
                  : !sufficient
                    ? "Suffizienz oben bestätigen"
                    : "Plan freigeben (Gate 2)"
            }
          >
            Freigeben (Gate 2)
          </Button>
        ) : (
          <Button variant="accent" onClick={() => router.push(`/projects/${id}/harness`)}>
            Weiter zum Harness (Schritt 8)
          </Button>
        )}
      </div>
    </PageShell>
  );
}

function RiskEditor({
  rid,
  ampel,
  draft,
  setDraft,
  frozen,
  label,
}: {
  rid: string;
  ampel: RiskAmpel;
  draft: Draft;
  setDraft: React.Dispatch<React.SetStateAction<Draft | null>>;
  frozen: boolean;
  label: string;
}): React.ReactElement {
  const r = draft.risks[rid];
  const upd = (patch: Partial<Draft["risks"][string]>) =>
    setDraft((d) =>
      d && { ...d, risks: { ...d.risks, [rid]: { ...d.risks[rid], ...patch } } },
    );
  return (
    <div style={riskRowStyle}>
      <div style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center" }}>
        <span style={{ ...dotSmStyle, backgroundColor: AMPEL_COLOR[ampel] }} />
        <span style={metaStyle}>{label} · Ampel folgt E×A (Server)</span>
      </div>
      <div style={fieldRowStyle}>
        <label style={fieldStyle}>
          <span style={fieldLabelStyle}>Beschreibung</span>
          <input
            style={inputStyle}
            value={r.description}
            disabled={frozen}
            onChange={(e) => upd({ description: e.target.value })}
          />
        </label>
        <label style={{ ...fieldStyle, maxWidth: 90 }}>
          <span style={fieldLabelStyle}>Eintritt</span>
          <input
            type="number"
            min={1}
            max={5}
            style={inputStyle}
            value={r.probability}
            disabled={frozen}
            onChange={(e) => upd({ probability: Number(e.target.value) })}
          />
        </label>
        <label style={{ ...fieldStyle, maxWidth: 90 }}>
          <span style={fieldLabelStyle}>Auswirkung</span>
          <input
            type="number"
            min={1}
            max={5}
            style={inputStyle}
            value={r.impact}
            disabled={frozen}
            onChange={(e) => upd({ impact: Number(e.target.value) })}
          />
        </label>
      </div>
      <label style={fieldStyle}>
        <span style={fieldLabelStyle}>Maßnahme</span>
        <input
          style={inputStyle}
          value={r.mitigation}
          disabled={frozen}
          onChange={(e) => upd({ mitigation: e.target.value })}
        />
      </label>
    </div>
  );
}

const leadStyle: React.CSSProperties = {
  color: "var(--c-text-muted)",
  marginBottom: "var(--sp-5)",
  marginTop: "var(--sp-2)",
  lineHeight: 1.6,
  maxWidth: "62ch",
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

const dotStyle: React.CSSProperties = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  flexShrink: 0,
};

const dotSmStyle: React.CSSProperties = {
  display: "inline-block",
  width: 9,
  height: 9,
  borderRadius: "50%",
};

const metaStyle: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  color: "var(--c-text-muted)",
};

const subMetaStyle: React.CSSProperties = {
  fontSize: "var(--fs-caption)",
  color: "var(--c-text-muted)",
};

const fieldRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--sp-2)",
  marginTop: "var(--sp-2)",
  flexWrap: "wrap",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  flex: 1,
  minWidth: 120,
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
};

const riskRowStyle: React.CSSProperties = {
  paddingTop: "var(--sp-3)",
  marginTop: "var(--sp-3)",
  borderTop: "1px solid var(--c-border)",
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

const diffFromStyle: React.CSSProperties = {
  color: "var(--c-text-muted)",
  textDecoration: "line-through",
};

const diffToStyle: React.CSSProperties = {
  color: "var(--c-navy)",
  fontWeight: 600,
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
  marginBottom: "var(--sp-4)",
};
