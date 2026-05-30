"""Plans-Repository — append-only Planversionen.

Spec: docs/02 §4.2 (`plans`, PartitionKey `/projectId`). Jede Version ist ein
eigenes Dokument; nichts wird überschrieben (Reversibilität — alte Versionen
bleiben für Step 7-Diff/Versionierung erhalten).

Wie projects_repo zwei Implementierungen, zur Laufzeit gewählt.
"""

from __future__ import annotations

import logging
from typing import Protocol

from ..schemas.plan import Plan
from . import cosmos

logger = logging.getLogger("aegira.planner.api.db")

_CONTAINER = "plans"


class PlansRepo(Protocol):
    async def add(self, plan: Plan) -> Plan: ...
    async def latest(self, project_id: str) -> Plan | None: ...
    async def list(self, project_id: str) -> list[Plan]: ...
    async def next_version(self, project_id: str) -> int: ...


class InMemoryPlansRepo:
    """Prozess-lokaler Speicher — kein Persistieren über Neustarts hinweg."""

    def __init__(self) -> None:
        self._store: dict[str, list[Plan]] = {}

    async def add(self, plan: Plan) -> Plan:
        self._store.setdefault(plan.project_id, []).append(plan)
        return plan

    async def list(self, project_id: str) -> list[Plan]:
        return sorted(self._store.get(project_id, []), key=lambda p: p.version)

    async def latest(self, project_id: str) -> Plan | None:
        versions = self._store.get(project_id)
        if not versions:
            return None
        return max(versions, key=lambda p: p.version)

    async def next_version(self, project_id: str) -> int:
        latest = await self.latest(project_id)
        return (latest.version + 1) if latest else 1


class CosmosPlansRepo:
    """Cosmos-NoSQL-Implementierung; PartitionKey ist `projectId`."""

    async def add(self, plan: Plan) -> Plan:
        container = await cosmos.get_container(_CONTAINER)
        await container.create_item(body=plan.model_dump(mode="json", by_alias=True))
        return plan

    async def list(self, project_id: str) -> list[Plan]:
        container = await cosmos.get_container(_CONTAINER)
        query = "SELECT * FROM c WHERE c.projectId = @pid ORDER BY c.version ASC"
        params = [{"name": "@pid", "value": project_id}]
        return [
            Plan.model_validate(item)
            async for item in container.query_items(query=query, parameters=params)
        ]

    async def latest(self, project_id: str) -> Plan | None:
        container = await cosmos.get_container(_CONTAINER)
        query = "SELECT TOP 1 * FROM c WHERE c.projectId = @pid ORDER BY c.version DESC"
        params = [{"name": "@pid", "value": project_id}]
        async for item in container.query_items(query=query, parameters=params):
            return Plan.model_validate(item)
        return None

    async def next_version(self, project_id: str) -> int:
        latest = await self.latest(project_id)
        return (latest.version + 1) if latest else 1


_repo: PlansRepo | None = None


def get_plans_repo() -> PlansRepo:
    """Singleton — wählt einmalig Cosmos oder In-Memory."""
    global _repo
    if _repo is None:
        if cosmos.is_configured():
            logger.info("plans repo: Cosmos")
            _repo = CosmosPlansRepo()
        else:
            logger.warning("plans repo: In-Memory (COSMOS_ENDPOINT unset)")
            _repo = InMemoryPlansRepo()
    return _repo
