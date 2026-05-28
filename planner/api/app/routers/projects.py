"""Project CRUD — Stub für Phase-2-Spike.

Full impl folgt mit Cosmos-Integration (db/cosmos.py).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from ..schemas.project import CreateProjectRequest, Project

router = APIRouter()

# In-memory stub. Phase-2-Beta ersetzt das durch Cosmos-Container `projects`.
_STORE: dict[str, Project] = {}


@router.post("", response_model=Project, status_code=201)
async def create_project(req: CreateProjectRequest) -> Project:
    pid = "prj_" + uuid.uuid4().hex[:12]
    p = Project(
        id=pid,
        tenantId="tenant_exmachinai",  # stubbed; from JWT in Phase-2-Beta
        owner_user_id="stub_user",
        title=req.title,
        created_at=datetime.now(timezone.utc),
    )
    _STORE[pid] = p
    return p


@router.get("/{project_id}", response_model=Project)
async def get_project(project_id: str) -> Project:
    p = _STORE.get(project_id)
    if not p:
        raise HTTPException(status_code=404, detail="project not found")
    return p


@router.get("", response_model=list[Project])
async def list_projects() -> list[Project]:
    return list(_STORE.values())
