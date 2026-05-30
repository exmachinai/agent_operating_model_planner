"""Kontext-Quellen (Schritt 2a) — Upload, Liste, Entfernen.

Spec: docs/09_process-flow.md (Schritt 2a). Inhalt wird ephemer geparst
(`context.store`), an die Schärfung gegeben und verworfen; persistiert wird nur
der Nachweis (`ContextSource`) am Projekt. Vor Gate 1 frei hinzufügbar/
entfernbar; mit Gate 1 ist der Kontext eingefroren.

Auth ist im Spike gestubbt (fixer Tenant/Owner), wie in den übrigen Routern.
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, Response, UploadFile

from ..context import parsers, store
from ..db.projects_repo import get_projects_repo
from ..schemas.project import ContextSource, Project

router = APIRouter()

_STUB_TENANT = "tenant_exmachinai"
_STUB_USER = "stub_user"
_MAX_FILE_BYTES = 25 * 1024 * 1024
_MAX_DOCS = 20


async def _load(project_id: str) -> Project:
    project = await get_projects_repo().get(project_id, _STUB_TENANT)
    if project is None:
        raise HTTPException(status_code=404, detail="project not found")
    return project


@router.get("/{project_id}/context", response_model=list[ContextSource])
async def list_context(project_id: str) -> list[ContextSource]:
    """Liefert die zitierbaren Quellen-Nachweise (Metadaten, kein Inhalt)."""
    project = await _load(project_id)
    return project.context_sources


@router.post("/{project_id}/context", response_model=ContextSource, status_code=201)
async def upload_context(
    project_id: str, file: UploadFile = File(...)
) -> ContextSource:
    """Nimmt eine Datei an, parst sie ephemer und legt den Nachweis ans Projekt."""
    repo = get_projects_repo()
    project = await _load(project_id)
    if project.gate1_approved_at is not None:
        raise HTTPException(
            status_code=409,
            detail="Kontext ist nach Gate 1 eingefroren — kein Upload mehr.",
        )
    if len(project.context_sources) >= _MAX_DOCS:
        raise HTTPException(
            status_code=409, detail=f"Maximal {_MAX_DOCS} Dokumente pro Projekt."
        )

    filename = file.filename or "unbenannt"
    try:
        fmt = parsers.detect_format(filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Leere Datei.")
    if len(data) > _MAX_FILE_BYTES:
        raise HTTPException(status_code=413, detail="Datei größer als 25 MB.")

    try:
        text = parsers.parse(data, fmt)
    except Exception as e:  # noqa: BLE001 — defektes Dokument → 400 statt 500
        raise HTTPException(status_code=400, detail=f"Datei nicht lesbar: {e}")

    source = ContextSource(
        id="ctx_" + uuid.uuid4().hex[:12],
        filename=filename,
        fmt=fmt,
        origin="upload",
        source_uri=None,
        size_bytes=len(data),
        content_sha256=hashlib.sha256(data).hexdigest(),
        token_estimate=store.estimate_tokens(text),
        added_at=datetime.now(timezone.utc),
        added_by=_STUB_USER,
    )
    # Inhalt ephemer (nur Schärfung), Nachweis dauerhaft.
    store.add(project_id, source.id, text)
    updated = project.model_copy(
        update={
            "context_sources": [*project.context_sources, source],
            "updated_at": source.added_at,
        }
    )
    await repo.replace(updated)
    return source


@router.delete("/{project_id}/context/{source_id}", status_code=204)
async def delete_context(project_id: str, source_id: str) -> Response:
    """Entfernt eine Quelle (nur vor Gate 1)."""
    repo = get_projects_repo()
    project = await _load(project_id)
    if project.gate1_approved_at is not None:
        raise HTTPException(
            status_code=409,
            detail="Kontext ist nach Gate 1 eingefroren — kein Entfernen mehr.",
        )
    remaining = [s for s in project.context_sources if s.id != source_id]
    if len(remaining) == len(project.context_sources):
        raise HTTPException(status_code=404, detail="Quelle nicht gefunden.")
    store.remove(project_id, source_id)
    updated = project.model_copy(
        update={
            "context_sources": remaining,
            "updated_at": datetime.now(timezone.utc),
        }
    )
    await repo.replace(updated)
    return Response(status_code=204)
