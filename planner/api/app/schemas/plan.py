"""ZGPM-Plan-Modelle (Schritt 6, PLANEN).

Spec: docs/01_zgpm-method.md (Kerneinheiten) + docs/02_architecture-option-b.md
§4.2 (`plans`, append-only, PartitionKey `/projectId`).

Methodentreue (nicht verwässern, siehe docs/01):
- Meilenstein ist ein *Zustand* (Verb im Perfekt), keine Aufgabe.
- Genau ein `F`/`L` pro Meilenstein und Aktivität; mindestens ein `A`.
- Ampel propagiert nach oben (Aktivität/MRL -> Meilenstein -> Projekt).
- ZGPM ist Methodik nach Glasner et al. (PwC) — keine Marken-Suggestion.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

# PVM-Originalcodes (docs/01): A führt aus · B beteiligt · E entscheidet ·
# e entscheidet mit · F steuert Fortschritt · L leitet+steuert · I informiert ·
# V verfügbar.
PVMCode = Literal["A", "B", "E", "e", "F", "L", "I", "V"]

# Risiko-Ampel. "gruen" statt "grün" — Code-Identifier bleiben ASCII.
RiskAmpel = Literal["rot", "gelb", "gruen"]

ReviewerStatus = Literal["PASS", "NEEDS_REVISION", "HARD_FAIL"]


class Responsibility(BaseModel):
    """Eine PVM-Zelle: welche Rolle hat welchen Code an diesem Knoten."""

    role: str
    code: PVMCode


class Risk(BaseModel):
    """Risikolisten-Eintrag (PRL auf Projekt-, MRL auf Meilensteinebene)."""

    id: str
    description: str
    # Eintrittswahrscheinlichkeit × Auswirkung, je 1–5 (Risk-Matrix).
    probability: int = Field(ge=1, le=5)
    impact: int = Field(ge=1, le=5)
    ampel: RiskAmpel
    mitigation: str


class ToolSuggestion(BaseModel):
    """Werkzeug-/MCP-Vorschlag für eine Aktivität (Schritt 6b).

    Bewusst laienverständlich: Klartext, was das Werkzeug tut, warum es hier
    vorgeschlagen wird und welcher Trust-Hinweis (Least-Privilege) gilt. Wird in
    Schritt 6b angeboten und beim Agenten-Bau (Schritt 8) je Agent gebunden.
    """

    id: str
    name: str  # technischer Name/Slug, z. B. "github-mcp"
    kind: Literal["tool", "mcp"] = "tool"
    label: str  # Anzeigename, z. B. "GitHub (Code & Repos)"
    what_it_does: str  # eine Klartext-Zeile für Laien
    why_suggested: str  # Bezug zur Aktivität
    trust_note: str  # Daten-/Rechte-Hinweis (Least-Privilege)
    accepted: bool = False


class Activity(BaseModel):
    """Konkrete Arbeit, die vor Erreichen des Meilensteins erledigt sein muss."""

    id: str
    description: str
    effort_pt: float = Field(ge=0, description="Geplanter Aufwand in Personentagen")
    start: datetime
    end: datetime
    responsibilities: list[Responsibility]
    # v0.5 — abgeleitete Werkzeug-/MCP-Bedarfe (Schritt 6b), editierbar (annehmen/verwerfen).
    tool_suggestions: list[ToolSuggestion] = Field(default_factory=list)


class Milestone(BaseModel):
    """Zustand, der bis zu einem Datum erreicht sein muss (Verb im Perfekt)."""

    id: str
    name: str
    phase_id: str
    stream_code: str
    planned_date: datetime
    predecessors: list[str] = Field(default_factory=list)
    ampel: RiskAmpel
    responsibilities: list[Responsibility]
    activities: list[Activity]
    # Meilensteinrisikoliste (MRL) — eine pro Meilenstein.
    mrl: list[Risk] = Field(default_factory=list)


class Phase(BaseModel):
    """Zeitabschnitt, dem Meilensteine zugeordnet werden."""

    id: str
    name: str
    order: int


class Stream(BaseModel):
    """Ergebnispfad — vertikaler Strang gleichartiger Ergebnisse (max 2 Bst + Ziffer)."""

    code: str = Field(max_length=3)
    label: str


class TokenBudgetEntry(BaseModel):
    """Kosten als Token-Budget je Agent & Knoten (docs/09 Schritt 6)."""

    agent: str
    node: str
    tokens_estimated: int = Field(ge=0)


class ReviewerFinding(BaseModel):
    """Befund des Reviewers (Evaluator-Optimizer-Schleife)."""

    severity: Literal["info", "warn", "fail"]
    rule: str
    message: str


class EvidenceSource(BaseModel):
    """Eingefrorene Quellen-Referenz im Plan (Buyer-Promise „evidence-based").

    Schnappschuss des Nachweises aus `Project.context_sources` zum Planzeitpunkt
    — nur Metadaten (Dateiname, Herkunft, Hash), nie Inhalt.
    """

    id: str
    filename: str
    fmt: str
    origin: str
    content_sha256: str
    frozen_at: datetime | None = None


# --- Schritt 7: Review-Patches (inline editierbarer Plan) --------------------
# Editierbar ist die fachliche Substanz (Namen, Termine, Aufwände, Risikowerte),
# nicht die PVM-Struktur — letztere bleibt den ZGPM-Regeln vorbehalten und wird
# vom Reviewer geprüft. Ampeln werden nach jeder Revision neu aus den Werten
# abgeleitet, nicht vom Anwender gesetzt.


class RiskPatch(BaseModel):
    """Teil-Update eines Risikos (PRL oder MRL), adressiert über die Risk-ID."""

    id: str
    description: str | None = None
    probability: int | None = Field(default=None, ge=1, le=5)
    impact: int | None = Field(default=None, ge=1, le=5)
    mitigation: str | None = None


class ActivityPatch(BaseModel):
    """Teil-Update einer Aktivität, adressiert über die Activity-ID."""

    id: str
    description: str | None = None
    effort_pt: float | None = Field(default=None, ge=0)


class MilestonePatch(BaseModel):
    """Teil-Update eines Meilensteins, adressiert über die Milestone-ID."""

    id: str
    name: str | None = None
    planned_date: datetime | None = None


class PlanRevisionRequest(BaseModel):
    """Schritt 7 — eine Sammlung von Inline-Edits, die eine neue Version erzeugt."""

    milestones: list[MilestonePatch] = Field(default_factory=list)
    activities: list[ActivityPatch] = Field(default_factory=list)
    risks: list[RiskPatch] = Field(default_factory=list)
    note: str | None = Field(default=None, max_length=2000)


# --- Schritt 6a/6b: geführte Edit-Operationen (Wizard) -----------------------
# Der Anwender (oft Laie) bearbeitet *vorgeschlagene* Meilensteine/Aktivitäten:
# umbenennen, löschen, hinzufügen, neu sortieren. PVM/Risiken bleiben den ZGPM-
# Regeln vorbehalten und werden nach jeder Operation neu abgeleitet (recompute).

EditOp = Literal["add", "update", "delete", "reorder"]


class MilestoneOp(BaseModel):
    """Eine Operation auf der Meilenstein-Liste (Schritt 6a)."""

    op: EditOp
    id: str | None = None  # bei update/delete erforderlich
    name: str | None = None  # add/update
    planned_date: datetime | None = None  # add/update
    # reorder: vollständige Liste der Milestone-IDs in neuer Reihenfolge.
    order: list[str] | None = None


class ActivityOp(BaseModel):
    """Eine Operation auf den Aktivitäten eines Meilensteins (Schritt 6b)."""

    op: EditOp
    milestone_id: str  # zu welchem Meilenstein die Aktivität gehört
    id: str | None = None  # bei update/delete erforderlich
    description: str | None = None  # add/update
    effort_pt: float | None = Field(default=None, ge=0)  # add/update
    # reorder: Activity-IDs des Meilensteins in neuer Reihenfolge.
    order: list[str] | None = None
    # Werkzeug-Vorschlag annehmen/verwerfen (op="update", tool_id gesetzt).
    tool_id: str | None = None
    tool_accepted: bool | None = None


class Plan(BaseModel):
    """Eine versionierte, ZGPM-konforme Planausgabe (append-only)."""

    id: str
    project_id: str = Field(alias="projectId")
    version: int = Field(ge=1)
    phases: list[Phase]
    streams: list[Stream]
    milestones: list[Milestone]
    # Projektrisikoliste (PRL) — Gesamtprojekt.
    prl: list[Risk]
    pvm_roles: list[str]
    token_budget: list[TokenBudgetEntry]
    # Aggregierte Projekt-Ampel (worst-of über alle Meilensteine).
    overall_ampel: RiskAmpel
    reviewer_status: ReviewerStatus
    reviewer_findings: list[ReviewerFinding]
    reviewer_rounds: int = Field(ge=0)
    # v0.5 — qualitative Gesamtrisiko-Begründung (Klartext, nicht nur „worst-of").
    risk_narrative: str = ""
    # Eingefrorene Quellen-Nachweise, die in die Schärfung eingeflossen sind.
    evidence_sources: list[EvidenceSource] = Field(default_factory=list)
    plan_hash: str
    # Methodik-Pflichtfelder (docs/01): wann ausgegeben, durch wen kontrolliert.
    planausgabedatum: datetime
    kontrolliert_durch: str
    created_at: datetime

    model_config = {"populate_by_name": True}
