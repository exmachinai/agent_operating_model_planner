"""Harness-Repository — ein aktueller Harness-Graph je Projekt (Schritt 8/9).

Spec: docs/02 §4 (analog `plans`, PartitionKey `/projectId`). Anders als Pläne
ist der Harness *editierbar*, solange er `draft` ist: jede Revision ersetzt den
gespeicherten Graph (die Iteration zählt die Runden). Mit Gate 3 wird er
`compiled` eingefroren.

Wie die übrigen Repos zwei Implementierungen, zur Laufzeit gewählt.
"""

from __future__ import annotations

import logging
from typing import Protocol

from ..schemas.harness import HarnessGraph
from . import cosmos

logger = logging.getLogger("aegira.planner.api.db")

_CONTAINER = "harness"


class HarnessRepo(Protocol):
    async def get(self, project_id: str) -> HarnessGraph | None: ...
    async def upsert(self, graph: HarnessGraph) -> HarnessGraph: ...
    async def delete(self, project_id: str) -> bool: ...


class InMemoryHarnessRepo:
    """Prozess-lokaler Speicher — ein Graph je Projekt."""

    def __init__(self) -> None:
        self._store: dict[str, HarnessGraph] = {}

    async def get(self, project_id: str) -> HarnessGraph | None:
        return self._store.get(project_id)

    async def upsert(self, graph: HarnessGraph) -> HarnessGraph:
        self._store[graph.project_id] = graph
        return graph

    async def delete(self, project_id: str) -> bool:
        return self._store.pop(project_id, None) is not None


class CosmosHarnessRepo:
    """Cosmos-NoSQL-Implementierung; ein Dokument je Projekt (id == projectId)."""

    async def get(self, project_id: str) -> HarnessGraph | None:
        from azure.cosmos.exceptions import CosmosResourceNotFoundError

        container = await cosmos.get_container(_CONTAINER)
        try:
            item = await container.read_item(item=project_id, partition_key=project_id)
        except CosmosResourceNotFoundError:
            return None
        return HarnessGraph.model_validate(item)

    async def upsert(self, graph: HarnessGraph) -> HarnessGraph:
        container = await cosmos.get_container(_CONTAINER)
        body = graph.model_dump(mode="json", by_alias=True)
        # Cosmos-Item-id ist die Projekt-ID (ein Harness je Projekt).
        body["id"] = graph.project_id
        await container.upsert_item(body=body)
        return graph

    async def delete(self, project_id: str) -> bool:
        from azure.cosmos.exceptions import CosmosResourceNotFoundError

        container = await cosmos.get_container(_CONTAINER)
        try:
            await container.delete_item(item=project_id, partition_key=project_id)
        except CosmosResourceNotFoundError:
            return False
        return True


_repo: HarnessRepo | None = None


def get_harness_repo() -> HarnessRepo:
    """Singleton — wählt einmalig Cosmos oder In-Memory."""
    global _repo
    if _repo is None:
        if cosmos.is_configured():
            logger.info("harness repo: Cosmos")
            _repo = CosmosHarnessRepo()
        else:
            logger.warning("harness repo: In-Memory (COSMOS_ENDPOINT unset)")
            _repo = InMemoryHarnessRepo()
    return _repo
