"""Users-Repository — Multi-User-Auth (Registrierung/Login/Admin).

Cosmos-Container `users`, ein Dokument je Nutzer (id == E-Mail klein, zugleich
Partition-Key → Punkt-Lesen + Eindeutigkeit). Wie die übrigen Repos zwei
Implementierungen (In-Memory für Dev/Test, Cosmos in Azure), zur Laufzeit gewählt.
"""

from __future__ import annotations

import logging
from typing import Protocol

from ..schemas.auth import User
from . import cosmos

logger = logging.getLogger("aegira.planner.api.db")

_CONTAINER = "users"


def _key(email: str) -> str:
    return email.strip().lower()


class UsersRepo(Protocol):
    async def get(self, email: str) -> User | None: ...
    async def upsert(self, user: User) -> User: ...
    async def list(self) -> list[User]: ...
    async def delete(self, email: str) -> bool: ...


class InMemoryUsersRepo:
    def __init__(self) -> None:
        self._store: dict[str, User] = {}

    async def get(self, email: str) -> User | None:
        return self._store.get(_key(email))

    async def upsert(self, user: User) -> User:
        self._store[_key(user.email)] = user
        return user

    async def list(self) -> list[User]:
        return list(self._store.values())

    async def delete(self, email: str) -> bool:
        return self._store.pop(_key(email), None) is not None


class CosmosUsersRepo:
    async def get(self, email: str) -> User | None:
        from azure.cosmos.exceptions import CosmosResourceNotFoundError

        container = await cosmos.get_container(_CONTAINER)
        try:
            item = await container.read_item(item=_key(email), partition_key=_key(email))
        except CosmosResourceNotFoundError:
            return None
        return User.model_validate(item)

    async def upsert(self, user: User) -> User:
        container = await cosmos.get_container(_CONTAINER)
        body = user.model_dump(mode="json")
        body["id"] = _key(user.email)
        await container.upsert_item(body=body)
        return user

    async def list(self) -> list[User]:
        container = await cosmos.get_container(_CONTAINER)
        items = [item async for item in container.read_all_items()]
        return [User.model_validate(i) for i in items]

    async def delete(self, email: str) -> bool:
        from azure.cosmos.exceptions import CosmosResourceNotFoundError

        container = await cosmos.get_container(_CONTAINER)
        try:
            await container.delete_item(item=_key(email), partition_key=_key(email))
        except CosmosResourceNotFoundError:
            return False
        return True


_repo: UsersRepo | None = None


def get_users_repo() -> UsersRepo:
    global _repo
    if _repo is None:
        if cosmos.is_configured():
            logger.info("users repo: Cosmos")
            _repo = CosmosUsersRepo()
        else:
            logger.warning("users repo: In-Memory (COSMOS_ENDPOINT unset)")
            _repo = InMemoryUsersRepo()
    return _repo
