"""Projects-Repository — kapselt Persistenz hinter einer Schnittstelle.

Spec: docs/02 §4.1 (`projects`, PartitionKey `/tenantId`).

Zwei Implementierungen, zur Laufzeit gewählt:
- `CosmosProjectsRepo`  — wenn `COSMOS_ENDPOINT` gesetzt ist (Azure).
- `InMemoryProjectsRepo` — sonst (lokale Entwicklung, Tests).

Kein Frontend spricht je direkt mit Cosmos; jeder Query ist tenant-gefiltert.
"""

from __future__ import annotations

import logging
from typing import Protocol

from ..schemas.project import Project
from . import cosmos

logger = logging.getLogger("aegira.planner.api.db")

_CONTAINER = "projects"


class ProjectsRepo(Protocol):
    async def create(self, project: Project) -> Project: ...
    async def get(self, project_id: str, tenant_id: str) -> Project | None: ...
    async def list(self, tenant_id: str) -> list[Project]: ...
    async def replace(self, project: Project) -> Project: ...


class InMemoryProjectsRepo:
    """Prozess-lokaler Speicher — kein Persistieren über Neustarts hinweg."""

    def __init__(self) -> None:
        self._store: dict[str, Project] = {}

    async def create(self, project: Project) -> Project:
        self._store[project.id] = project
        return project

    async def get(self, project_id: str, tenant_id: str) -> Project | None:
        p = self._store.get(project_id)
        if p is None or p.tenant_id != tenant_id:
            return None
        return p

    async def list(self, tenant_id: str) -> list[Project]:
        return [p for p in self._store.values() if p.tenant_id == tenant_id]

    async def replace(self, project: Project) -> Project:
        self._store[project.id] = project
        return project


class CosmosProjectsRepo:
    """Cosmos-NoSQL-Implementierung; PartitionKey ist `tenantId`."""

    async def create(self, project: Project) -> Project:
        container = await cosmos.get_container(_CONTAINER)
        await container.create_item(body=project.model_dump(mode="json", by_alias=True))
        return project

    async def get(self, project_id: str, tenant_id: str) -> Project | None:
        from azure.cosmos.exceptions import CosmosResourceNotFoundError

        container = await cosmos.get_container(_CONTAINER)
        try:
            item = await container.read_item(item=project_id, partition_key=tenant_id)
        except CosmosResourceNotFoundError:
            return None
        return Project.model_validate(item)

    async def list(self, tenant_id: str) -> list[Project]:
        container = await cosmos.get_container(_CONTAINER)
        query = "SELECT * FROM c WHERE c.tenantId = @tenant ORDER BY c.created_at DESC"
        params = [{"name": "@tenant", "value": tenant_id}]
        items = [
            Project.model_validate(item)
            async for item in container.query_items(query=query, parameters=params)
        ]
        return items

    async def replace(self, project: Project) -> Project:
        container = await cosmos.get_container(_CONTAINER)
        await container.replace_item(
            item=project.id,
            body=project.model_dump(mode="json", by_alias=True),
        )
        return project


_repo: ProjectsRepo | None = None


def get_projects_repo() -> ProjectsRepo:
    """Singleton — wählt einmalig Cosmos oder In-Memory."""
    global _repo
    if _repo is None:
        if cosmos.is_configured():
            logger.info("projects repo: Cosmos")
            _repo = CosmosProjectsRepo()
        else:
            logger.warning("projects repo: In-Memory (COSMOS_ENDPOINT unset)")
            _repo = InMemoryProjectsRepo()
    return _repo
