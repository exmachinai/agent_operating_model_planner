"""ZGPM-Plan-Modelle (Schritt 6, PLANEN).

Spec: docs/01_zgpm-method.md (Kerneinheiten) + docs/02_architecture-option-b.md
§4.2 (`plans`, append-only, PartitionKey `/projectId`).

Methodentreue (nicht verwässern, siehe docs/01):
- Meilenstein ist ein *Zustand* (Verb im Perfekt), keine Aufgabe.
- Genau ein `F`/`L` pro Meilenstein; mindestens ein `A`.
- Ampel propagiert nach oben (MRL -> Meilenstein -> Projekt).
- ZGPM ist Methodik nach Glasner et al. (PwC) — keine Marken-Suggestion.

v0.6 — Aktivitäten & Personentage (effort_pt) entfernt: Agenten übernehmen die
Aktivitäten autonom; der Plan endet auf Meilenstein-Ebene (Name + Datum + RACI +
Risiken). Kosten werden als Token-Budget je Agent geführt, nicht in Personentagen.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import AliasChoices, BaseModel, Field

# Verantwortungs-Codes (docs/01): A führt aus · B beteiligt · E entscheidet ·
# e entscheidet mit · F steuert Fortschritt · L leitet+steuert · I informiert ·
# V verfügbar. Für Anzeige/Export werden sie auf RACI (R/A/C/I) gemappt.
ResponsibilityCode = Literal["A", "B", "E", "e", "F", "L", "I", "V"]

# Risiko-Ampel. "gruen" statt "grün" — Code-Identifier bleiben ASCII.
RiskAmpel = Literal["rot", "gelb", "gruen"]

ReviewerStatus = Literal["PASS", "NEEDS_REVISION", "HARD_FAIL"]


class Responsibility(BaseModel):
    """Eine RACI-Zelle: welche Rolle hat welchen Verantwortungs-Code an diesem Knoten."""

    role: str
    code: ResponsibilityCode


class Risk(BaseModel):
    """Risikolisten-Eintrag (PRL auf Projekt-, MRL auf Meilensteinebene)."""

    id: str
    description: str
    # Eintrittswahrscheinlichkeit × Auswirkung, je 1–5 (Risk-Matrix).
    probability: int = Field(ge=1, le=5)
    impact: int = Field(ge=1, le=5)
    ampel: RiskAmpel
    mitigation: str


class Milestone(BaseModel):
    """Zustand, der bis zu einem Datum erreicht sein muss (Verb im Perfekt).

    v0.6 — kein `activities`-Feld mehr: die konkrete Arbeit übernehmen die Agenten
    autonom im Betrieb. Der Plan beschreibt nur noch den Ziel-Zustand, das Datum,
    die Verantwortlichkeiten (RACI) und die Meilensteinrisiken (MRL).
    """

    id: str
    name: str
    phase_id: str
    stream_code: str
    planned_date: datetime
    predecessors: list[str] = Field(default_factory=list)
    ampel: RiskAmpel
    responsibilities: list[Responsibility]
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
# nicht die RACI-Struktur — letztere bleibt den ZGPM-Regeln vorbehalten und wird
# vom Reviewer geprüft. Ampeln werden nach jeder Revision neu aus den Werten
# abgeleitet, nicht vom Anwender gesetzt.


class RiskPatch(BaseModel):
    """Teil-Update eines Risikos (PRL oder MRL), adressiert über die Risk-ID."""

    id: str
    description: str | None = None
    probability: int | None = Field(default=None, ge=1, le=5)
    impact: int | None = Field(default=None, ge=1, le=5)
    mitigation: str | None = None


class MilestonePatch(BaseModel):
    """Teil-Update eines Meilensteins, adressiert über die Milestone-ID."""

    id: str
    name: str | None = None
    planned_date: datetime | None = None


class PlanRevisionRequest(BaseModel):
    """Schritt 7 — eine Sammlung von Inline-Edits, die eine neue Version erzeugt."""

    milestones: list[MilestonePatch] = Field(default_factory=list)
    risks: list[RiskPatch] = Field(default_factory=list)
    note: str | None = Field(default=None, max_length=2000)


# --- Schritt 6a: geführte Edit-Operationen (Wizard) --------------------------
# Der Anwender (oft Laie) bearbeitet *vorgeschlagene* Meilensteine: umbenennen,
# löschen, hinzufügen, neu sortieren. RACI/Risiken bleiben den ZGPM-Regeln
# vorbehalten und werden nach jeder Operation neu abgeleitet (recompute).

EditOp = Literal["add", "update", "delete", "reorder"]


class MilestoneOp(BaseModel):
    """Eine Operation auf der Meilenstein-Liste (Schritt 6a)."""

    op: EditOp
    id: str | None = None  # bei update/delete erforderlich
    name: str | None = None  # add/update
    planned_date: datetime | None = None  # add/update
    # reorder: vollständige Liste der Milestone-IDs in neuer Reihenfolge.
    order: list[str] | None = None


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
    # RACI-Rollen-Roster (Anzeige/Matrix). Alias `pvm_roles` lädt Alt-Dokumente (v0.10).
    raci_roles: list[str] = Field(validation_alias=AliasChoices("raci_roles", "pvm_roles"))
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
