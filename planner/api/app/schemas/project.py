"""Pydantic models for projects + plans — Spec docs/02 §4.1, §4.2."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ProjectNature = Literal["concept", "technical", "hybrid-concept-tech"]
TargetPlatform = Literal[
    "azure", "aws", "gcp", "on-prem",
    "hybrid-cloud", "multi-cloud", "claude-code-only",
]
ProjectStatus = Literal["planning", "reviewing", "approved", "compiled", "archived"]

ContextFormat = Literal["docx", "md", "pdf", "txt", "pptx", "xlsx"]
ContextOrigin = Literal["upload", "cloud"]


class ContextSource(BaseModel):
    """Zitierbarer Quellen-Nachweis (Schritt 2a) — dauerhaft, nur Metadaten.

    Der Inhalt selbst ist ephemer (nur für die Schärfung verarbeitet, danach
    verworfen). Persistiert wird ausschließlich dieser Nachweis: Dateiname,
    Herkunft, SHA-256-Hash, Größe, geschätzte Tokens, wer/wann. So bleibt die
    Buyer-Promise „evidence-based" erfüllt, ohne PII/Vertrauliches zu speichern.
    Mit Gate 1 wird `frozen_at` gesetzt (Hash-Snapshot, append-only).
    """

    id: str
    filename: str
    fmt: ContextFormat
    origin: ContextOrigin = "upload"
    source_uri: str | None = None
    size_bytes: int = Field(ge=0)
    content_sha256: str
    token_estimate: int = Field(ge=0)
    added_at: datetime
    added_by: str
    frozen_at: datetime | None = None


class CreateProjectRequest(BaseModel):
    """Schritt 1 — Projekt formlos beschreiben (Freitext-Brief)."""

    title: str = Field(min_length=3, max_length=200)
    description: str = Field(default="", max_length=4000)


class UpdateUnderstandingRequest(BaseModel):
    """Schritt 3 — Projektverständnis schärfen (vor Gate 1).

    Alle Felder optional: erlaubt partielles Setzen während des Interviews.
    """

    project_nature: ProjectNature | None = None
    target_platform: TargetPlatform | None = None
    understanding_summary: str | None = Field(default=None, max_length=8000)


class Project(BaseModel):
    id: str
    tenant_id: str = Field(alias="tenantId")
    owner_user_id: str
    title: str
    description: str = ""
    project_nature: ProjectNature | None = None
    target_platform: TargetPlatform | None = None
    understanding_summary: str | None = None
    created_at: datetime
    updated_at: datetime | None = None
    status: ProjectStatus = "planning"
    current_iteration: int = 0
    plan_hash: str | None = None
    # Gate 1 — Verständnis-Freigabe. Ohne diese startet keine Planung.
    gate1_approved_at: datetime | None = None
    # Schritt 5 — Leitplanken vom Anwender quittiert (Front-loaded Discovery).
    guardrails_cleared_at: datetime | None = None
    # Gate 2 — Plan-Freigabe (Schritt 7). Friert die freigegebene Planversion ein.
    gate2_approved_at: datetime | None = None
    approved_plan_version: int | None = None
    # Schritt 2a — zitierbare Quellen-Nachweise (Inhalt ephemer, Nachweis dauerhaft).
    context_sources: list[ContextSource] = Field(default_factory=list)

    model_config = {"populate_by_name": True}
