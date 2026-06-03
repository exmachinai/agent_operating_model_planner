"""Projekt-Endpunkte — VERSTEHEN-Phase (Schritte 1, 3) + Verwaltung (Schritt 4).

Spec: docs/09_process-flow.md, docs/02_architecture-option-b.md §4.1/§8.1.
Persistenz über `db.projects_repo` (Cosmos in Azure, In-Memory lokal).

Auth ist im Spike gestubbt: Tenant und Owner sind fix. Phase-2-Beta ersetzt
sie durch Entra-ID-Claims aus dem JWT.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Response

from ..context import store as context_store
from ..db.harness_repo import get_harness_repo
from ..db.projects_repo import get_projects_repo
from ..schemas.project import (
    CreateProjectRequest,
    Project,
    UpdateProjectRequest,
    UpdateUnderstandingRequest,
)

router = APIRouter()

# Stub-Identität bis JWT-Auth steht (Phase-2-Beta).
_STUB_TENANT = "tenant_exmachinai"
_STUB_USER = "stub_user"


@router.post("", response_model=Project, status_code=201)
async def create_project(req: CreateProjectRequest) -> Project:
    """Schritt 1 — Projekt formlos beschreiben."""
    now = datetime.now(timezone.utc)
    project = Project(
        id="prj_" + uuid.uuid4().hex[:12],
        tenantId=_STUB_TENANT,
        owner_user_id=_STUB_USER,
        title=req.title,
        description=req.description,
        created_at=now,
        updated_at=now,
    )
    return await get_projects_repo().create(project)


@router.get("", response_model=list[Project])
async def list_projects() -> list[Project]:
    """Schritt 4 — Projekte verwalten (Liste)."""
    return await get_projects_repo().list(_STUB_TENANT)


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str) -> Project:
    project = await get_projects_repo().get(project_id, _STUB_TENANT)
    if project is None:
        raise HTTPException(status_code=404, detail="project not found")
    return project


@router.delete("/{project_id}", status_code=204, response_class=Response)
async def delete_project(project_id: str) -> Response:
    """Schritt 4 — Projekt löschen (Verwaltung).

    Hard-Delete im `projects`-Container; der ephemere Context-Cache wird
    mitgeräumt. Zugehörige `plans`/`sessions` bleiben vorerst bestehen
    (append-only Audit-Spur) — Kaskaden-Löschung ist Phase-2-Beta.
    """
    deleted = await get_projects_repo().delete(project_id, _STUB_TENANT)
    if not deleted:
        raise HTTPException(status_code=404, detail="project not found")
    context_store.clear(project_id)
    await get_harness_repo().delete(project_id)
    return Response(status_code=204)


@router.patch("/{project_id}", response_model=Project)
async def update_project(project_id: str, req: UpdateProjectRequest) -> Project:
    """Schritt 4 — Titel/Beschreibung ändern (Rename), nur vor Gate 1.

    Nach Gate 1 ist das Vorhaben fixiert (analog `update_understanding`): der
    Titel ist Teil der eingefrorenen Identität und der Evidenzkette.
    """
    repo = get_projects_repo()
    project = await repo.get(project_id, _STUB_TENANT)
    if project is None:
        raise HTTPException(status_code=404, detail="project not found")
    if project.gate1_approved_at is not None:
        raise HTTPException(
            status_code=409,
            detail="Projekt nach Gate 1 fixiert — Titel/Beschreibung gesperrt.",
        )
    patch = req.model_dump(exclude_unset=True)
    if not patch:
        return project
    updated = project.model_copy(
        update={**patch, "updated_at": datetime.now(timezone.utc)}
    )
    return await repo.replace(updated)


@router.post("/{project_id}/duplicate", response_model=Project, status_code=201)
async def duplicate_project(project_id: str) -> Project:
    """Schritt 4 — Projekt als Vorlage duplizieren.

    Kopiert Titel/Beschreibung in ein frisches Projekt im Status `planning`; alle
    Gates sind zurückgesetzt. Quellen-Nachweise werden mitkopiert (Hash bleibt),
    aber als *nicht* eingefroren (`frozen_at=None`) — die Kopie startet neu.
    """
    repo = get_projects_repo()
    source = await repo.get(project_id, _STUB_TENANT)
    if source is None:
        raise HTTPException(status_code=404, detail="project not found")

    now = datetime.now(timezone.utc)
    copied_sources = [
        s.model_copy(update={"frozen_at": None, "added_at": now})
        for s in source.context_sources
    ]
    copy = Project(
        id="prj_" + uuid.uuid4().hex[:12],
        tenantId=_STUB_TENANT,
        owner_user_id=_STUB_USER,
        title=f"{source.title} (Kopie)",
        description=source.description,
        created_at=now,
        updated_at=now,
        context_sources=copied_sources,
    )
    return await repo.create(copy)


@router.patch("/{project_id}/understanding", response_model=Project)
async def update_understanding(
    project_id: str, req: UpdateUnderstandingRequest
) -> Project:
    """Schritt 3 — Projektverständnis schärfen (project_nature, Plattform, Summary).

    Nur vor Gate 1 erlaubt: nach Freigabe ist das Verständnis eingefroren.
    """
    repo = get_projects_repo()
    project = await repo.get(project_id, _STUB_TENANT)
    if project is None:
        raise HTTPException(status_code=404, detail="project not found")
    if project.gate1_approved_at is not None:
        raise HTTPException(
            status_code=409,
            detail="understanding already approved (Gate 1) — kein Edit mehr möglich",
        )

    patch = req.model_dump(exclude_unset=True)
    # v0.4 — Projekt-Taxonomie steuert die abgeleitete project_nature
    # (it→technical, non-it→concept), solange nicht explizit gesetzt.
    if "project_type" in patch and "project_nature" not in patch:
        patch["project_nature"] = "technical" if patch["project_type"] == "it" else "concept"
    # v0.9 — Preference-Drift-Guard: kein AEGIRA-internes Projekt ⇒ Preferences hart aus.
    if patch.get("aegira_internal") is False:
        patch["use_preferences"] = False
    if patch.get("use_preferences") is None:
        patch.pop("use_preferences", None)
    updated = project.model_copy(
        update={**patch, "updated_at": datetime.now(timezone.utc)}
    )
    return await repo.replace(updated)


@router.post("/{project_id}/approve-understanding", response_model=Project)
async def approve_understanding(project_id: str) -> Project:
    """Schritt 3 — Gate 1. Friert das Verständnis ein und gibt die Planung frei.

    Voraussetzung: `project_nature` ist gesetzt (sonst weiß die Planung nicht,
    welche Skills/Agenten gebraucht werden).
    """
    repo = get_projects_repo()
    project = await repo.get(project_id, _STUB_TENANT)
    if project is None:
        raise HTTPException(status_code=404, detail="project not found")
    if project.gate1_approved_at is not None:
        raise HTTPException(status_code=409, detail="Gate 1 already approved")
    # v0.4.1 — defensiv: `project_nature` aus der Taxonomie (it/non-it) ableiten,
    # falls sie vor der Freigabe nur als `project_type` gesetzt wurde. Sonst lief
    # die Freigabe in einen 422, wenn der User direkt freigab statt erst zu speichern.
    nature = project.project_nature
    if nature is None and project.project_type is not None:
        nature = "technical" if project.project_type == "it" else "concept"
    if nature is None:
        raise HTTPException(
            status_code=422,
            detail="Projektart (IT/Non-IT) muss vor Gate-1-Freigabe gesetzt sein",
        )

    now = datetime.now(timezone.utc)
    # Gate 1 friert die Quellen-Nachweise ein (Hash-Snapshot, append-only)…
    frozen = [
        s.model_copy(update={"frozen_at": now}) if s.frozen_at is None else s
        for s in project.context_sources
    ]
    approved = project.model_copy(
        update={
            "gate1_approved_at": now,
            "updated_at": now,
            "project_nature": nature,
            "context_sources": frozen,
        }
    )
    result = await repo.replace(approved)
    # …und verwirft den ephemeren Inhalts-Cache (nur Nachweis bleibt).
    context_store.clear(project_id)
    return result
