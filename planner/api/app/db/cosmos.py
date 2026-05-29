"""Cosmos DB connection layer — lazy async client over Managed Identity.

Spec: docs/02_architecture-option-b.md §4 (Datenmodell, PartitionKeys).

Kein Secret im Code: Authentifizierung läuft über `DefaultAzureCredential`,
die in Container Apps die System-Managed-Identity nutzt und lokal `az login`.
Der Client wird erst beim ersten Zugriff aufgebaut (lazy), damit Start und
Health-Probe nicht an Cosmos hängen.

Ist `COSMOS_ENDPOINT` leer (lokale Entwicklung ohne Azure), liefert
`is_configured()` False — der Aufrufer fällt dann auf In-Memory zurück.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from ..config import get_settings

if TYPE_CHECKING:
    from azure.cosmos.aio import ContainerProxy

logger = logging.getLogger("aegira.planner.api.db")

# Lazy Singletons — pro Prozess genau einmal aufgebaut.
_client = None
_credential = None
_containers: dict[str, "ContainerProxy"] = {}


def is_configured() -> bool:
    """True, wenn ein Cosmos-Endpoint hinterlegt ist."""
    return bool(get_settings().cosmos_endpoint)


async def _get_client():
    """Baut den async CosmosClient beim ersten Aufruf auf."""
    global _client, _credential
    if _client is not None:
        return _client

    from azure.cosmos.aio import CosmosClient
    from azure.identity.aio import DefaultAzureCredential

    settings = get_settings()
    _credential = DefaultAzureCredential()
    _client = CosmosClient(url=settings.cosmos_endpoint, credential=_credential)
    logger.info("CosmosClient initialised (endpoint=%s)", settings.cosmos_endpoint)
    return _client


async def get_container(name: str) -> "ContainerProxy":
    """Liefert einen ContainerProxy für `name`, gecached pro Prozess.

    Container und Datenbank werden von Bicep provisioniert; hier wird nur
    referenziert, nie erstellt (kein Runtime-Management der Shared-Infra).
    """
    if name in _containers:
        return _containers[name]

    client = await _get_client()
    settings = get_settings()
    db = client.get_database_client(settings.cosmos_database)
    container = db.get_container_client(name)
    _containers[name] = container
    return container


async def close() -> None:
    """Schließt Client und Credential — im Lifespan-Shutdown aufzurufen."""
    global _client, _credential, _containers
    if _client is not None:
        await _client.close()
    if _credential is not None:
        await _credential.close()
    _client = None
    _credential = None
    _containers = {}
