/**
 * Schritt 8 — Skill-Picker (v0.7, docs/15 §4.4).
 *
 * Bietet die zum erkannten Agenten-Set passenden, kuratierten Skills aktiv an:
 * „Empfohlen für deine Agenten" (anthropic-vetted/world-top vorselektiert) plus
 * ein faceted durchsuchbarer Gesamtkatalog. Trust-First-Visualisierung
 * (farbcodierte Badges + Risk-Ampel), Progressive Disclosure (Aufklappen zeigt
 * Frontmatter + read-only SKILL.md-Vorschau), Multi-Select und ein Security-Gate
 * (community/experimental/Skripte → HITL-Quittung). Auswahl wird über den
 * bestehenden `reviseHarness`-Pfad persistiert und landet auditierbar im ZIP.
 *
 * Trust-Tier ist eine Einstufung, keine Garantie (Eckpfeiler).
 */

"use client";

import * as React from "react";

import { Button, cardStyle } from "./ui";
import {
  api,
  type AgentSpec,
  type CatalogSkill,
  type ReviseCommand,
  type SkillTrustTier,
} from "../lib/api";

const TRUST_LABEL: Record<SkillTrustTier, string> = {
  "anthropic-vetted": "Anthropic-gevettet",
  "aegira-certified": "AEGIRA-zertifiziert",
  "world-top": "World-Top",
  community: "Community",
  experimental: "Experimentell",
};
const TRUST_COLOR: Record<SkillTrustTier, string> = {
  "anthropic-vetted": "var(--c-green)",
  "aegira-certified": "var(--c-navy)",
  "world-top": "var(--c-gold)",
  community: "var(--c-steel)",
  experimental: "var(--c-red)",
};
const RISK_COLOR: Record<string, string> = {
  low: "var(--c-green)",
  medium: "var(--c-amber)",
  high: "var(--c-red)",
};
const PRESELECT: SkillTrustTier[] = ["anthropic-vetted", "aegira-certified", "world-top"];

/** Findet den Ziel-Agenten im Graph für einen Skill (erste passende Rolle). */
function targetAgent(skill: CatalogSkill, agents: AgentSpec[]): AgentSpec | null {
  const match = agents.find((a) => skill.agent_ids.includes(a.name));
  if (match) return match;
  return agents.find((a) => a.kind === "orchestrator") ?? agents[0] ?? null;
}

export function SkillPicker({
  agents,
  applied,
  frozen,
  busy,
  onRevise,
}: {
  agents: AgentSpec[];
  applied: CatalogSkill[];
  frozen: boolean;
  busy: boolean;
  onRevise: (cmd: ReviseCommand) => void;
}): React.ReactElement {
  const [catalog, setCatalog] = React.useState<CatalogSkill[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [browseOpen, setBrowseOpen] = React.useState(false);

  // Filter-Facetten + Volltextsuche.
  const [q, setQ] = React.useState("");
  const [fTrust, setFTrust] = React.useState<SkillTrustTier | "">("");
  const [fDomain, setFDomain] = React.useState("");
  const [fRisk, setFRisk] = React.useState("");

  const agentNames = React.useMemo(() => agents.map((a) => a.name), [agents]);

  React.useEffect(() => {
    let alive = true;
    api
      .getSkills()
      .then((all) => {
        if (alive) setCatalog(all);
      })
      .catch(() => {
        if (alive) setLoadError("Skill-Katalog nicht ladbar.");
      })
      .finally(() => {
        if (alive) setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const appliedIds = React.useMemo(
    () => new Set(applied.map((c) => c.catalog_id)),
    [applied],
  );

  // Empfohlen = Skills, deren agent_ids ein Agent im Graph trägt.
  const recommended = React.useMemo(
    () => catalog.filter((s) => s.agent_ids.some((id) => agentNames.includes(id))),
    [catalog, agentNames],
  );
  const preselected = recommended.filter((s) => PRESELECT.includes(s.trust_tier));
  const offered = recommended.filter((s) => !PRESELECT.includes(s.trust_tier));

  const domains = React.useMemo(
    () => Array.from(new Set(catalog.map((s) => s.domain))).sort(),
    [catalog],
  );

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return catalog.filter((s) => {
      if (fTrust && s.trust_tier !== fTrust) return false;
      if (fDomain && s.domain !== fDomain) return false;
      if (fRisk && s.risk !== fRisk) return false;
      if (needle) {
        const hay = `${s.title} ${s.description} ${s.catalog_id} ${s.author} ${s.required_tools.join(" ")} ${s.required_mcps.join(" ")}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [catalog, q, fTrust, fDomain, fRisk]);

  function apply(skill: CatalogSkill, confirmGate: boolean): void {
    const t = targetAgent(skill, agents);
    if (!t) return;
    onRevise({
      command: "skill",
      agent_id: t.id,
      catalog_id: skill.catalog_id,
      confirm_gate: confirmGate,
    });
  }
  function remove(skill: CatalogSkill): void {
    const t = targetAgent(skill, agents);
    if (!t) return;
    onRevise({ command: "skill", agent_id: t.id, catalog_id: skill.catalog_id, remove: true });
  }

  if (!loaded) {
    return <p style={mutedStyle}>Lade Skill-Katalog…</p>;
  }
  if (loadError) {
    return <p style={{ ...mutedStyle, color: "var(--c-red)" }}>{loadError}</p>;
  }

  const renderCard = (skill: CatalogSkill) => (
    <SkillCard
      key={skill.catalog_id}
      skill={skill}
      agents={agents}
      applied={appliedIds.has(skill.catalog_id)}
      frozen={frozen}
      busy={busy}
      onApply={(confirm) => apply(skill, confirm)}
      onRemove={() => remove(skill)}
    />
  );

  return (
    <div>
      <p style={auditNoteStyle}>
        ◆ Diese Auswahl wird im Harness-ZIP dokumentiert (Skill, Version, Quelle,
        sha256 in <code style={codeStyle}>.claude/skills/_manifest.json</code>).
        Trust-Tier ist eine <strong>Einstufung</strong>, keine Garantie.
      </p>

      {/* Empfohlen für deine Agenten — vorselektierbar */}
      <div style={subHeadStyle}>
        Empfohlen für deine Agenten ({preselected.length})
        <span style={mutedStyle}> · gevettet / world-top</span>
      </div>
      {preselected.length > 0 ? (
        <div style={gridStyle}>{preselected.map(renderCard)}</div>
      ) : (
        <p style={mutedStyle}>Keine vorselektierten Empfehlungen für dieses Agenten-Set.</p>
      )}

      {/* Weitere passende Skills — community/experimental, Gate */}
      {offered.length > 0 ? (
        <>
          <div style={{ ...subHeadStyle, marginTop: "var(--sp-4)" }}>
            Weitere passende Skills ({offered.length})
            <span style={mutedStyle}> · ungeprüft, HITL-Gate</span>
          </div>
          <div style={gridStyle}>{offered.map(renderCard)}</div>
        </>
      ) : null}

      {/* Alle durchsuchen — faceted */}
      <div style={{ marginTop: "var(--sp-4)" }}>
        <button
          type="button"
          style={disclosureBtnStyle}
          aria-expanded={browseOpen}
          onClick={() => setBrowseOpen((v) => !v)}
        >
          {browseOpen ? "▾" : "▸"} Alle {catalog.length} Skills durchsuchen
        </button>
      </div>

      {browseOpen ? (
        <div style={{ marginTop: "var(--sp-2)" }}>
          <div style={facetRowStyle}>
            <input
              style={{ ...searchStyle, flex: 1, minWidth: 180 }}
              type="search"
              placeholder="Suche (Titel, Beschreibung, Autor, Tools)…"
              aria-label="Skills durchsuchen"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              style={selectStyle}
              aria-label="Trust-Tier filtern"
              value={fTrust}
              onChange={(e) => setFTrust(e.target.value as SkillTrustTier | "")}
            >
              <option value="">Alle Trust-Tier</option>
              {(Object.keys(TRUST_LABEL) as SkillTrustTier[]).map((t) => (
                <option key={t} value={t}>{TRUST_LABEL[t]}</option>
              ))}
            </select>
            <select
              style={selectStyle}
              aria-label="Domäne filtern"
              value={fDomain}
              onChange={(e) => setFDomain(e.target.value)}
            >
              <option value="">Alle Domänen</option>
              {domains.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              style={selectStyle}
              aria-label="Risk filtern"
              value={fRisk}
              onChange={(e) => setFRisk(e.target.value)}
            >
              <option value="">Alle Risk-Stufen</option>
              <option value="low">Risk: low</option>
              <option value="medium">Risk: medium</option>
              <option value="high">Risk: high</option>
            </select>
          </div>
          <p style={{ ...mutedStyle, marginTop: "var(--sp-1)" }}>{filtered.length} Treffer</p>
          <div style={gridStyle}>{filtered.map(renderCard)}</div>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SkillCard({
  skill,
  agents,
  applied,
  frozen,
  busy,
  onApply,
  onRemove,
}: {
  skill: CatalogSkill;
  agents: AgentSpec[];
  applied: boolean;
  frozen: boolean;
  busy: boolean;
  onApply: (confirmGate: boolean) => void;
  onRemove: () => void;
}): React.ReactElement {
  const [open, setOpen] = React.useState(false);
  const [gateOk, setGateOk] = React.useState(false);

  const gated = skill.has_scripts || skill.trust_tier === "community" || skill.trust_tier === "experimental";
  const target = targetAgent(skill, agents);
  const missingMcps = skill.required_mcps; // Registry-Abgleich (vereinfachte Heuristik)

  return (
    <div style={{ ...cardStyle, borderColor: TRUST_COLOR[skill.trust_tier], padding: "var(--sp-3)" }}>
      <div style={cardHeadStyle}>
        <strong style={{ fontSize: 14, flex: 1, minWidth: 0 }}>{skill.title}</strong>
        <span style={{ ...badgeStyle, color: TRUST_COLOR[skill.trust_tier], borderColor: TRUST_COLOR[skill.trust_tier] }}>
          {TRUST_LABEL[skill.trust_tier]}
        </span>
        <span
          style={{ ...riskDotStyle, backgroundColor: RISK_COLOR[skill.risk] }}
          title={`Risk: ${skill.risk}`}
          aria-label={`Risk ${skill.risk}`}
        />
      </div>

      <p style={descStyle}>{skill.description}</p>
      <div style={metaLineStyle}>
        <code style={codeStyle}>{skill.catalog_id}</code> · {skill.domain}
        {skill.has_scripts ? <span style={scriptFlagStyle}> · trägt Skripte</span> : null}
      </div>

      {missingMcps.length > 0 ? (
        <p style={warnBannerStyle}>
          ⚠ Benötigt MCP: {missingMcps.join(", ")} — vor Nutzung in der Registry verbinden.
        </p>
      ) : null}

      {/* Progressive Disclosure */}
      <button
        type="button"
        style={disclosureBtnStyle}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "▾ Details verbergen" : "▸ Details & Vorschau"}
      </button>
      {open ? (
        <div style={detailStyle}>
          <dl style={dlStyle}>
            <Row k="Slug" v={skill.slug} />
            <Row k="Autor" v={skill.author} />
            <Row k="Quelle" v={skill.source} />
            <Row k="Version" v={skill.version} />
            <Row k="Lizenz" v={skill.license ?? "see-source"} />
            <Row k="Tools" v={skill.required_tools.join(", ") || "—"} />
            <Row k="MCPs" v={skill.required_mcps.join(", ") || "—"} />
            <Row k="Agentenrollen" v={skill.agent_ids.join(", ") || "—"} />
            {skill.content_sha256 ? <Row k="sha256" v={skill.content_sha256} /> : null}
          </dl>
          {skill.content ? (
            <pre style={previewStyle}>{skill.content}</pre>
          ) : (
            <p style={mutedStyle}>
              Vorschau wird zur Build-Zeit hydriert (Katalog-Referenz, kein Fremd-Originalinhalt).
            </p>
          )}
        </div>
      ) : null}

      {/* Aktion */}
      {!frozen ? (
        <div style={{ marginTop: "var(--sp-2)" }}>
          {applied ? (
            <div style={actionRowStyle}>
              <span style={appliedPillStyle}>✓ ausgewählt → {target?.role ?? "—"}</span>
              <Button variant="secondary" disabled={busy} onClick={onRemove}>
                Entfernen
              </Button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
              {gated ? (
                <label style={gateLabelStyle}>
                  <input
                    type="checkbox"
                    checked={gateOk}
                    onChange={(e) => setGateOk(e.target.checked)}
                  />
                  HITL-Freigabe: ungeprüft/experimentell bzw. skript-tragend — ich übernehme die Prüfung.
                </label>
              ) : null}
              <div style={actionRowStyle}>
                <Button
                  variant="accent"
                  disabled={busy || (gated && !gateOk) || !target}
                  title={target ? `Zu ${target.role} hinzufügen` : "Kein passender Agent im Graph"}
                  onClick={() => onApply(gateOk)}
                >
                  Auswählen
                </Button>
                {target ? <span style={mutedStyle}>→ {target.role}</span> : null}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }): React.ReactElement {
  return (
    <div style={rowStyle}>
      <dt style={dtStyle}>{k}</dt>
      <dd style={ddStyle}>{v}</dd>
    </div>
  );
}

// --- Styles ----------------------------------------------------------------

const mutedStyle: React.CSSProperties = { fontSize: "var(--fs-caption)", color: "var(--c-text-muted)" };
const auditNoteStyle: React.CSSProperties = {
  fontSize: 13,
  color: "var(--c-text-muted)",
  lineHeight: 1.5,
  margin: "0 0 var(--sp-3)",
};
const subHeadStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  marginBottom: "var(--sp-2)",
  color: "var(--c-text)",
};
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "var(--sp-2)",
};
const cardHeadStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-1)",
  flexWrap: "wrap",
};
const badgeStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  padding: "1px 6px",
  border: "1px solid",
  borderRadius: "var(--r-pill)",
  whiteSpace: "nowrap",
};
const riskDotStyle: React.CSSProperties = { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 };
const descStyle: React.CSSProperties = { fontSize: 13, lineHeight: 1.45, margin: "var(--sp-1) 0" };
const metaLineStyle: React.CSSProperties = { fontSize: 11, color: "var(--c-text-muted)" };
const scriptFlagStyle: React.CSSProperties = { color: "var(--c-amber)", fontWeight: 600 };
const codeStyle: React.CSSProperties = { fontSize: 11, color: "var(--c-steel)" };
const warnBannerStyle: React.CSSProperties = {
  fontSize: 11,
  color: "var(--c-amber)",
  margin: "var(--sp-1) 0 0",
};
const disclosureBtnStyle: React.CSSProperties = {
  border: 0,
  background: "transparent",
  cursor: "pointer",
  color: "var(--c-steel)",
  fontSize: 12,
  padding: "var(--sp-1) 0",
  textAlign: "left",
  minHeight: 44,
};
const detailStyle: React.CSSProperties = {
  borderTop: "1px solid var(--c-border)",
  marginTop: "var(--sp-1)",
  paddingTop: "var(--sp-1)",
};
const dlStyle: React.CSSProperties = { margin: 0, fontSize: 12 };
const rowStyle: React.CSSProperties = { display: "flex", gap: "var(--sp-1)", padding: "1px 0" };
const dtStyle: React.CSSProperties = { fontWeight: 600, color: "var(--c-text-muted)", minWidth: 96 };
const ddStyle: React.CSSProperties = { margin: 0, wordBreak: "break-word", flex: 1 };
const previewStyle: React.CSSProperties = {
  marginTop: "var(--sp-1)",
  maxHeight: 220,
  overflow: "auto",
  fontSize: 11,
  lineHeight: 1.4,
  background: "var(--c-surface)",
  border: "1px solid var(--c-border)",
  borderRadius: "var(--r-md)",
  padding: "var(--sp-2)",
  whiteSpace: "pre-wrap",
};
const actionRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--sp-2)",
  flexWrap: "wrap",
};
const appliedPillStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--c-green)",
};
const gateLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "var(--sp-1)",
  fontSize: 11,
  color: "var(--c-red)",
  lineHeight: 1.4,
  cursor: "pointer",
};
const facetRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "var(--sp-2)",
  flexWrap: "wrap",
  alignItems: "center",
};
const searchStyle: React.CSSProperties = {
  padding: "var(--sp-1) var(--sp-2)",
  fontSize: 14,
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-md)",
  minHeight: 44,
  backgroundColor: "var(--c-surface)",
  color: "var(--c-text)",
};
const selectStyle: React.CSSProperties = {
  padding: "var(--sp-1) var(--sp-2)",
  fontSize: 13,
  border: "1px solid var(--c-border-strong)",
  borderRadius: "var(--r-md)",
  minHeight: 44,
  backgroundColor: "var(--c-surface)",
  color: "var(--c-text)",
};
