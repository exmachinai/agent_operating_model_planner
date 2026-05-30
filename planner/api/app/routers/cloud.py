"""Cloud-Quellen (Schritt 2a, Phase B) — Provider-Status + Connect-Versuch.

Spec: docs/09_process-flow.md (Schritt 2a, Variante b „Ordner mounten"). Diese
Endpunkte machen den Konfigurationsstatus der Cloud-Connectoren für die UI
sichtbar und versuchen einen Connect — der bis zur OAuth-App-Registrierung
ehrlich mit 501 blockiert (kein vorgetäuschter Halb-Connect).

Auth ist im Spike gestubbt (fixer Tenant), wie in den übrigen Routern.
"""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from ..context import connectors, parsers, store
from ..context.connectors import CloudProvider, NotConfiguredError, ProviderInfo
from ..db.projects_repo import get_projects_repo
from ..schemas.project import ContextSource, Project

router = APIRouter()

_STUB_TENANT = "tenant_exmachinai"
_STUB_USER = "stub_user"
_MAX_FILE_BYTES = 25 * 1024 * 1024
_MAX_DOCS = 20


async def _load_project(project_id: str) -> Project:
    project = await get_projects_repo().get(project_id, _STUB_TENANT)
    if project is None:
        raise HTTPException(status_code=404, detail="project not found")
    return project


async def _ensure_project(project_id: str) -> None:
    await _load_project(project_id)


@router.get(
    "/{project_id}/context/cloud/providers",
    response_model=list[ProviderInfo],
)
async def list_cloud_providers(project_id: str) -> list[ProviderInfo]:
    """Alle Cloud-Anbieter mit Konfigurationsstatus (configured/blocked)."""
    await _ensure_project(project_id)
    return connectors.list_providers()


@router.post("/{project_id}/context/cloud/connect")
async def connect_cloud(project_id: str, provider: CloudProvider) -> None:
    """Versucht, einen Cloud-Connector einzuhängen.

    Bis OAuth-App-Registrierung + Secrets vorliegen, hebt das einen klaren
    501-Fehler mit der fehlenden Konfiguration — statt einen Connect
    vorzutäuschen.
    """
    await _ensure_project(project_id)
    try:
        connectors.get_connector(provider)
    except NotConfiguredError as e:
        raise HTTPException(status_code=501, detail=str(e))


@router.post(
    "/{project_id}/context/cloud/dropbox/import",
    response_model=list[ContextSource],
    status_code=201,
)
async def import_dropbox_folder(project_id: str, path: str = "") -> list[ContextSource]:
    """Schritt 2a (Variante b) — verbindet einen Dropbox-Ordner und liest ihn ein.

    Listet die Dateien im Ordner `path`, parst die unterstützten Formate ephemer
    (gleicher Pfad wie der Upload) und legt je Datei einen Quellen-Nachweis
    (Name + Hash, origin=`cloud`) ans Projekt. Inhalt bleibt nicht gespeichert.
    Vor Gate 1; ohne Dropbox-Secrets ein ehrlicher 501-Blocker.
    """
    repo = get_projects_repo()
    project = await _load_project(project_id)
    if project.gate1_approved_at is not None:
        raise HTTPException(
            status_code=409, detail="Kontext ist nach Gate 1 eingefroren."
        )
    try:
        connector = connectors.get_connector("dropbox")
    except NotConfiguredError as e:
        raise HTTPException(status_code=501, detail=str(e))

    try:
        files = await connector.list_files(path)
    except Exception as e:  # noqa: BLE001 — API-/Netzwerkfehler → 502
        raise HTTPException(status_code=502, detail=f"Dropbox nicht lesbar: {e}")

    added: list[ContextSource] = []
    sources = list(project.context_sources)
    for entry in files:
        if len(sources) >= _MAX_DOCS:
            break
        filename = entry["name"]
        try:
            fmt = parsers.detect_format(filename)
        except ValueError:
            continue  # nicht unterstütztes Format überspringen
        if entry.get("size", 0) > _MAX_FILE_BYTES:
            continue
        try:
            data = await connector.fetch(entry["path"])
            text = parsers.parse(data, fmt)
        except Exception:  # noqa: BLE001 — defekte Datei überspringen
            continue
        source = ContextSource(
            id="ctx_" + uuid.uuid4().hex[:12],
            filename=filename,
            fmt=fmt,
            origin="cloud",
            source_uri=f"dropbox:{entry['path']}",
            size_bytes=len(data),
            content_sha256=hashlib.sha256(data).hexdigest(),
            token_estimate=store.estimate_tokens(text),
            added_at=datetime.now(timezone.utc),
            added_by=_STUB_USER,
        )
        store.add(project_id, source.id, text)
        sources.append(source)
        added.append(source)

    if added:
        updated = project.model_copy(
            update={"context_sources": sources, "updated_at": datetime.now(timezone.utc)}
        )
        await repo.replace(updated)
    return added
