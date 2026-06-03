"""Harness-Modelle (Schritt 8 BAUEN + Schritt 9 Export, Gate 3).

Spec: docs/03_harness-zip-spec.md. Der Harness ist das *kompilierte Ergebnis*
eines bei Gate 2 freigegebenen ZGPM-Plans: ein Graph aus Orchestrator/Worker/
Evaluator-Agenten mit HITL-Punkten, der als portables, signiertes Zip für
Claude Code / Cowork exportiert wird.

Methodentreue (docs/04_agent-best-practices.md):
- Orchestrator-Worker mit Output-Schema, Evaluator-Optimizer (Reviewer),
  Checkpoint nach jedem Knoten, HITL an festen Punkten, absolute Pfade.
- Anti-Muster (vage Delegation, Über-Spawning, fehlender Checkpoint, relative
  Pfade) werden vom Compiler als Befunde sichtbar gemacht — nicht verschwiegen.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field

# Graph-Knotenarten. ◆ HITL ist ein eigener Knoten (Transparenz, keine Blackbox).
# v0.4: `router` (Handoff/Triage-Pattern) ergänzt den Orchestrator (Manager-Pattern).
HarnessNodeKind = Literal["orchestrator", "worker", "evaluator", "hitl", "router"]

# v0.4 — Orchestrierungsmuster je Stage (Anthropic „Building Effective Agents").
StagePattern = Literal["chain", "section", "route", "vote", "evaluator-optimizer"]

# Status eines Harness: solange editierbar `draft`, nach Gate 3 `compiled`.
HarnessStatus = Literal["draft", "compiled"]

# Revisions-Kommandos (Schritt 8, Kommandofeld). `agent` deckt Agent-CRUD ab.
# v0.4: `layout` (Drag&Drop-Stages) + `stage-pattern` (Muster einer Stage setzen).
# v0.4.3: `model-strategy` setzt die Modell-Tiers aller Agenten in einem Schritt.
# v0.9: `autonomy` koppelt Reifegrad ↔ Permission-Modus/HITL-Dichte (BP-MD §7).
ReviseKind = Literal[
    "sequence", "parallel", "skill", "tool", "agent", "layout", "stage-pattern",
    "model-strategy", "autonomy",
]


# v0.9 — Autonomie-/Reifegrad-Achse (BP-MD §7: Autonomie an Reversibilität festmachen,
# nicht an Pipeline-Mechanik). Die Stufe steuert gebündelt Permission-Modus, HITL-Dichte,
# Hook-Strenge und Sandbox-Empfehlung; an AIMS-Maturity gekoppelt. Bewusst KEINE
# 100%-Autonomie — Stufe 4 bleibt audit-pflichtig (Telemetrie + Hooks aktiv).
class AutonomyLevel(int, Enum):
    """Reifegrad 1–4. Höhere Stufe = mehr Maschinen-Autonomie an reversiblen Punkten."""

    supervised = 1   # read-only/Plan-Modus, jede Aktion über Approval (defaultMode "plan")
    assisted = 2     # Standard: Edits/Tools fragen nach (defaultMode "default")
    delegated = 3    # Edits automatisch, riskante/irreversible Tools fragen ("acceptEdits")
    autonomous = 4   # weitgehend autonom + Telemetrie ("dontAsk"); Hooks bleiben Gate

    @property
    def default_mode(self) -> str:
        """Claude-Code `permissions.defaultMode` je Stufe (gegen offizielles Schema verifiziert).

        `auto` wird in Projekt-/Local-Settings ignoriert (Doku v2.1.142) → Stufe 4
        nutzt `dontAsk` als effektiv-autonomen, aber hook-/telemetrie-gesicherten Modus.
        """
        return {1: "plan", 2: "default", 3: "acceptEdits", 4: "dontAsk"}[int(self)]

    @property
    def label(self) -> str:
        return {
            1: "Beaufsichtigt (Plan/Approvals)",
            2: "Assistiert (Standard)",
            3: "Delegiert (Auto-Edits)",
            4: "Autonom (+Telemetrie)",
        }[int(self)]

# v0.4.3 — globale Modell-Strategie: balanced = Opus-Orchestrator + Sonnet-Rest,
# economy = alles Sonnet, premium = alles Opus. HITL-Knoten bleiben „human".
ModelStrategy = Literal["balanced", "economy", "premium"]

# Schweregrad eines Compiler-/Reviewer-Befunds (gleiche Skala wie der Plan-Reviewer).
FindingSeverity = Literal["info", "warn", "fail"]


class AgentSpec(BaseModel):
    """Ein Agent im Harness — abgeleitet aus einer PVM-Rolle.

    `role` ist die PVM-Rolle aus dem Plan, `name` der Datei-Slug
    (`.claude/agents/<name>.md`). `hitl=True` markiert einen menschlichen
    Checkpoint statt eines autonomen Agenten.
    """

    # Leer bei Patches (add/update) — der Compiler vergibt eine stabile ID.
    id: str = ""
    role: str
    name: str
    kind: HarnessNodeKind
    mission: str
    # v0.4 — Delegations-Trigger (wofür delegieren) + EINE klare Verantwortung
    # (Anthropic Subagent-Best-Practice: fokussiert, single-responsibility).
    description: str = ""
    responsibility: str = ""
    tasks: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    tools: list[str] = Field(default_factory=list)
    hitl: bool = False
    model: str = "claude-sonnet-4-6"


# v0.4 — Tool-Taxonomie + Risk-Rating (OpenAI „Practical Guide to Building Agents").
# High-Risk-Tools (Schreiben/irreversibel/Finanz/PII) triggern automatisch HITL.
ToolType = Literal["data", "action", "orchestration"]
ToolRisk = Literal["low", "medium", "high"]


class ToolSpec(BaseModel):
    name: str
    type: ToolType = "data"
    risk: ToolRisk = "low"
    # v0.9 (C2) — Reversibilitäts-Klassifikation. Irreversible Tools (Deploy, Delete,
    # Zahlung, Versand) erzwingen ein HITL-Gate ZUSÄTZLICH zu risk=high (BP-MD §7:
    # ~0,8 % der Aktionen sind irreversibel — genau dort gehören harte Gates hin).
    irreversible: bool = False


# v0.4 — Agentenklassen für den Subagent-Katalog (docs/11).
AgentClass = Literal["control", "worker-it", "worker-concept", "quality", "human"]


class CatalogAgent(BaseModel):
    """Eine Subagent-Vorlage im Katalog (Anthropic: Skills+Tools+Subagenten je Rolle).

    Beim Add/Define wählt der Nutzer eine Vorlage; sie befüllt Mission, Skills,
    Tools (mit Risk), Modell-Tier und Delegations-Trigger vor. `applies`/`subtypes`
    steuern die Vorbelegung je Projekttyp.
    """

    id: str
    label: str
    klass: AgentClass
    kind: HarnessNodeKind
    model: str
    description: str
    mission: str
    responsibility: str
    skills: list[str] = Field(default_factory=list)
    tools: list[ToolSpec] = Field(default_factory=list)
    applies: list[str] = Field(default_factory=list)
    subtypes: list[str] = Field(default_factory=list)


class SkillImport(BaseModel):
    """Ein vom Anwender importierter Claude-Code-Skill (v0.6, Schritt 8).

    `content` ist der **unveränderte** Inhalt einer hochgeladenen `SKILL.md`
    (inkl. Frontmatter `name:`/`description:`). Beim Kompilieren wird er 1:1 unter
    `.claude/skills/<name>/SKILL.md` ins Zip geschrieben — statt der generierten
    Hülle. So funktioniert der referenzierte Skill real, nicht nur als Platzhalter.
    """

    name: str  # Slug = Ordnername unter .claude/skills/<name>/
    content: str


# v0.7 — Skill-Repository: Trust-Tier als Einstufung (KEINE Garantie, Eckpfeiler).
class SkillTrustTier(str, Enum):
    """Vertrauensstufe eines Katalog-Skills (Achse 1b, docs/15 §4.1)."""

    anthropic_vetted = "anthropic-vetted"  # offiziell von Anthropic, höchstes Vertrauen
    aegira_certified = "aegira-certified"  # AEGIRA-eigen, intern geprüft
    world_top = "world-top"                # öffentlich, kuratiert + manuell gevettet
    community = "community"                # öffentlich, ungeprüft (nie Default, Gate)
    experimental = "experimental"          # in Erprobung, hohes Risiko (HITL-Pflicht)


# v0.7 — vorselektierbare Tiers: nur vetted/zertifiziert/world-top (ToxicSkills-Lehre).
PRESELECT_TIERS: frozenset[SkillTrustTier] = frozenset(
    {SkillTrustTier.anthropic_vetted, SkillTrustTier.aegira_certified, SkillTrustTier.world_top}
)


class CatalogSkill(BaseModel):
    """Ein kuratierter, klassifizierter Skill im Repository (v0.7, docs/15 §4.1).

    Analog zu `CatalogAgent`. Vier Klassifizierungs-Achsen (Autor+Trust, Domäne+
    Subtyp, Version+Datum, technische Properties) plus Integritäts-/Audit-Felder.
    Bildet 1:1 auf den offenen SKILL.md-Standard ab (`slug`/`title`/`description`)
    und ergänzt ihn um AEGIRA-Trust-Felder. `catalog_id` ist die eindeutige
    Anzeige-/Audit-Bezeichnung; `slug` der Upstream-Ordnername (Standard, kein „_").
    """

    # Identität
    catalog_id: str = Field(pattern=r"^[a-z0-9-]+_skill$")
    slug: str = Field(pattern=r"^[a-z0-9-]{1,64}$")
    title: str
    description: str = Field(max_length=1024)
    # Achse 1 — Autor + Trust
    author: str
    source: str
    trust_tier: SkillTrustTier
    license: str | None = None
    # Achse 2 — Domäne + Subtyp-Mapping
    domain: str
    project_types: list[str] = Field(default_factory=list)
    subtypes: list[str] = Field(default_factory=list)
    agent_ids: list[str] = Field(default_factory=list)
    # Achse 3 — Version + Datum
    version: str = "n/v"
    released_at: date | None = None
    updated_at: date | None = None
    deprecated: bool = False
    # Achse 4 — technische Properties
    required_tools: list[str] = Field(default_factory=list)
    required_mcps: list[str] = Field(default_factory=list)
    model_tier: str | None = None
    risk: Literal["low", "medium", "high"] = "low"
    has_scripts: bool = False
    # Integrität / Audit
    content_sha256: str | None = None
    content: str | None = None  # bei Upload/Hydration: unveränderte SKILL.md

    # `model_tier` kollidiert sonst mit Pydantics geschütztem Namespace `model_`.
    model_config = {"protected_namespaces": ()}

    @property
    def needs_gate(self) -> bool:
        """Security-Gate (docs/15 §4.6): Skripte oder ungeprüfte/experimentelle Tiers."""
        return self.has_scripts or self.trust_tier in (
            SkillTrustTier.community,
            SkillTrustTier.experimental,
        )

    @property
    def preselected(self) -> bool:
        return self.trust_tier in PRESELECT_TIERS


class SkillRegistry(BaseModel):
    """Admin-verwaltete Skill-Freigabeliste (v0.8) — persistiert (ein Dokument).

    `released`/`blocked` übersteuern die Standard-Freigabe (vetted/zertifiziert/
    world-top frei; community/experimental gesperrt). `custom` sind vom Admin
    hinzugefügte/erstellte Skills (mit Inhalt). Single-Doc, id == "registry"."""

    id: str = "registry"
    released: list[str] = Field(default_factory=list)  # catalog_ids zwangsfrei
    blocked: list[str] = Field(default_factory=list)   # catalog_ids zwangsgesperrt
    custom: list[CatalogSkill] = Field(default_factory=list)


class HarnessNode(BaseModel):
    """Ein Knoten im Preflight-Graph (PMO-Orchestrator → Worker → Reviewer → HITL)."""

    id: str
    label: str
    kind: HarnessNodeKind
    agent_id: str | None = None
    hitl: bool = False
    # Vorgänger-Knoten (Kanten im Graph) — macht Sequenz/Parallelität sichtbar.
    depends_on: list[str] = Field(default_factory=list)
    # v0.4 — Canvas: Stage-Index (gleiche Stage = parallel; Reihenfolge = sequenziell)
    # + Muster der Stage. Default hält Bestehendes (Stage 0, section) gültig.
    stage: int = Field(default=0, ge=0)
    pattern: StagePattern = "section"


class ArtifactRef(BaseModel):
    """Eine Datei im kompilierten Harness — mit SHA-256 für den Integritäts-Check."""

    path: str
    kind: str
    sha256: str
    size_bytes: int = Field(ge=0)


class HarnessFile(BaseModel):
    """Eine entpackte Harness-Datei (Pfad relativ zum Root) mit Textinhalt."""

    path: str
    content: str


class HarnessFileMap(BaseModel):
    """Entpackte Repräsentation des Harness — für den „Speichern unter"-Export.

    Spiegelt exakt die Zip (`build_file_map`): gleiche Dateien (inkl.
    `checksums.txt`), gleiche Hashes. `root` ist der Ordnername (`<slug>`), unter
    den die Dateien beim entpackten Speichern gelegt werden.
    """

    root: str
    zip_name: str
    zip_sha256: str | None = None
    files: list[HarnessFile]


class HarnessFinding(BaseModel):
    """Sichtbarer Compiler-/Anti-Muster-Befund (docs/04)."""

    severity: FindingSeverity
    rule: str
    message: str


class HarnessGraph(BaseModel):
    """Der kompilierte (oder als Entwurf vorgeschlagene) Harness eines Projekts."""

    id: str
    project_id: str = Field(alias="projectId")
    plan_version: int = Field(ge=1)
    plan_hash: str
    status: HarnessStatus = "draft"
    # Revisions-Zähler (Schritt 8). Jede Revision erhöht ihn (kein Endlos-Loop).
    iteration: int = Field(default=1, ge=1)
    # v0.9 (C1) — Autonomie-/Reifegrad-Stufe. Steuert den Permission-Modus und die
    # HITL-Dichte des exportierten Harness; Default = assistiert (Stufe 2).
    autonomy_level: AutonomyLevel = AutonomyLevel.assisted
    agents: list[AgentSpec]
    nodes: list[HarnessNode]
    # v0.6 — vom Anwender importierte echte SKILL.md-Inhalte (je Skill-Slug einmal).
    # Überschreiben beim Kompilieren die generierte Hülle in templates.skill_files.
    imported_skills: list[SkillImport] = Field(default_factory=list)
    # v0.7 — aus dem kuratierten Repository ausgewählte Skills (mit Trust-Tier,
    # Herkunft, sha256). Speisen das Audit-Manifest `.claude/skills/_manifest.json`;
    # ihr `content` wird (wie imported_skills) unverändert ins ZIP geschrieben.
    catalog_skills: list[CatalogSkill] = Field(default_factory=list)
    # HITL-Punkte als lesbare Liste (Meilenstein, rotes Risiko, neuer Skill, Budget).
    hitl_points: list[str] = Field(default_factory=list)
    artifacts: list[ArtifactRef] = Field(default_factory=list)
    findings: list[HarnessFinding] = Field(default_factory=list)
    # Vorgeschlagener Zip-Name (docs/03 Build-Pfad).
    zip_name: str
    # Gesamt-Zip-Hash — erst bei Gate 3 (Freeze) gesetzt.
    zip_sha256: str | None = None
    created_at: datetime
    compiled_at: datetime | None = None

    model_config = {"populate_by_name": True}


class ReviseCommand(BaseModel):
    """Schritt 8 — ein Kommando, das einen neuen Harness-Vorschlag erzeugt.

    - `sequence`/`parallel`: ordnet die genannten Worker-Knoten seriell bzw.
      parallel an (`nodes`).
    - `skill`: fügt einem Agenten einen Skill hinzu/entfernt ihn (`agent_id`,
      `skill`, `remove`). v0.6 — mit `skill_content` (Inhalt einer hochgeladenen
      `SKILL.md`) wird ein **echter** Skill importiert statt einer generierten Hülle.
    - `agent`: Agent-CRUD über `op` (`add`/`update`/`delete`) und `agent`.
    """

    command: ReviseKind
    nodes: list[str] = Field(default_factory=list)
    agent_id: str | None = None
    skill: str | None = None
    # v0.6 — unveränderter SKILL.md-Inhalt beim Import (Frontmatter wird validiert).
    skill_content: str | None = None
    # v0.7 — Auswahl aus dem kuratierten Repository: statt Freitext-Import wird der
    # Katalog-Skill referenziert. Der Router prüft die Admin-Freigabe und legt den
    # aufgelösten, hydrierten Skill in `resolved_skill` ab (Compiler nutzt diesen).
    catalog_id: str | None = None
    # v0.8 — vom Router aufgelöster + hydrierter Katalog-Skill (nicht vom Client gesetzt).
    resolved_skill: CatalogSkill | None = None
    # v0.7 — Alt-Feld; mit Admin-Freigabeliste (v0.8) nicht mehr genutzt (bleibt kompatibel).
    confirm_gate: bool = False
    tool: str | None = None
    remove: bool = False
    op: Literal["add", "update", "delete"] | None = None
    agent: AgentSpec | None = None
    note: str | None = Field(default=None, max_length=2000)
    # v0.4 — Canvas: `layout` setzt Stage je Agent ({agent_id: stage}); `stage-pattern`
    # setzt das Muster einer Stage (`stage` + `pattern`).
    stages: dict[str, int] | None = None
    stage: int | None = None
    pattern: StagePattern | None = None
    # v0.4.3 — `model-strategy`: setzt die Modell-Tiers aller Agenten auf einmal.
    strategy: ModelStrategy | None = None
    # v0.9 — `autonomy`: setzt die Reifegrad-/Autonomie-Stufe (1–4) des Harness.
    autonomy_level: AutonomyLevel | None = None


# Max. Revisionen je Harness — verhindert Endlos-Loops (docs/04 Evaluator-Optimizer).
MAX_HARNESS_ITERATIONS = 25
