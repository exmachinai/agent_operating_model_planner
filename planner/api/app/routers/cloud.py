"""Cloud-Quellen (Schritt 2a, Phase B) — Provider-Status + Connect-Versuch.

Spec: docs/09_process-flow.md (Schritt 2a, Variante b „Ordner mounten"). Diese
Endpunkte machen den Konfigurationsstatus der Cloud-Connectoren für die UI
sichtbar und versuchen einen Connect — der bis zur OAuth-App-Registrierung
ehrlich mit 501 blockiert (kein vorgetäuschter Halb-Connect).

Auth ist im Spike gestubbt (fixer Tenant), wie in den übrigen Routern.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..context import connectors
from ..context.connectors import CloudProvider, NotConfiguredError, ProviderInfo
from ..db.projects_repo import get_projects_repo

router = APIRouter()

_STUB_TENANT = "tenant_exmachinai"


async def _ensure_project(project_id: str) -> None:
    project = await get_projects_repo().get(project_id, _STUB_TENANT)
    if project is None:
        raise HTTPException(status_code=404, detail="project not found")


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
