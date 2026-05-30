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

from datetime import datetime
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
ReviseKind = Literal["sequence", "parallel", "skill", "agent"]

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
    agents: list[AgentSpec]
    nodes: list[HarnessNode]
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
      `skill`, `remove`).
    - `agent`: Agent-CRUD über `op` (`add`/`update`/`delete`) und `agent`.
    """

    command: ReviseKind
    nodes: list[str] = Field(default_factory=list)
    agent_id: str | None = None
    skill: str | None = None
    remove: bool = False
    op: Literal["add", "update", "delete"] | None = None
    agent: AgentSpec | None = None
    note: str | None = Field(default=None, max_length=2000)


# Max. Revisionen je Harness — verhindert Endlos-Loops (docs/04 Evaluator-Optimizer).
MAX_HARNESS_ITERATIONS = 25
