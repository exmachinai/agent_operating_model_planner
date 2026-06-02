"""Skill-Registry-Repository (v0.8) — Admin-Freigabeliste + Custom-Skills.

Ein einzelnes Dokument (id == "registry") im Cosmos-Container `skill_registry`
(In-Memory-Fallback für Dev/Test). Hält die Freigabe-/Sperr-Overrides und die
vom Admin hinzugefügten Skills."""

from __future__ import annotations

import logging
from typing import Protocol

from ..schemas.harness import SkillRegistry
from . import cosmos

logger = logging.getLogger("aegira.planner.api.db")

_CONTAINER = "skill_registry"
_DOC_ID = "registry"


class SkillRegistryRepo(Protocol):
    async def get(self) -> SkillRegistry: ...
    async def put(self, reg: SkillRegistry) -> SkillRegistry: ...


class InMemorySkillRegistryRepo:
    def __init__(self) -> None:
        self._reg = SkillRegistry()

    async def get(self) -> SkillRegistry:
        return self._reg.model_copy(deep=True)

    async def put(self, reg: SkillRegistry) -> SkillRegistry:
        self._reg = reg.model_copy(deep=True)
        return self._reg


class CosmosSkillRegistryRepo:
    async def get(self) -> SkillRegistry:
        from azure.cosmos.exceptions import CosmosResourceNotFoundError

        container = await cosmos.get_container(_CONTAINER)
        try:
            item = await container.read_item(item=_DOC_ID, partition_key=_DOC_ID)
        except CosmosResourceNotFoundError:
            return SkillRegistry()
        return SkillRegistry.model_validate(item)

    async def put(self, reg: SkillRegistry) -> SkillRegistry:
        container = await cosmos.get_container(_CONTAINER)
        body = reg.model_dump(mode="json")
        body["id"] = _DOC_ID
        await container.upsert_item(body=body)
        return reg


_repo: SkillRegistryRepo | None = None


def get_skill_registry_repo() -> SkillRegistryRepo:
    global _repo
    if _repo is None:
        if cosmos.is_configured():
            logger.info("skill_registry repo: Cosmos")
            _repo = CosmosSkillRegistryRepo()
        else:
            logger.warning("skill_registry repo: In-Memory (COSMOS_ENDPOINT unset)")
            _repo = InMemorySkillRegistryRepo()
    return _repo
