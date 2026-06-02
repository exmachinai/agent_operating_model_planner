"""Skill-Repository (v0.7/0.8, docs/15) — kuratierter, klassifizierter Katalog.

Versorgt die Harness-UI mit dem **freigegebenen** Skill-Katalog (Admin-Freigabe-
liste, v0.8) und dem Agent→Skill-Matching. Read-only; keine Auth nötig.

Normale Nutzer sehen nur vom Admin freigegebene Skills (Standard: anthropic-
vetted/aegira-certified/world-top; community/experimental erst nach Freigabe).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ..db.skill_registry_repo import get_skill_registry_repo
from ..harness import skills_service
from ..schemas.harness import CatalogSkill

router = APIRouter()


class RecommendedSkills(BaseModel):
    preselected: list[CatalogSkill]
    offered: list[CatalogSkill]


def _parse_agents(agents: str | None) -> list[str]:
    if not agents:
        return []
    return [a.strip() for a in agents.split(",") if a.strip()]


@router.get("/skills", response_model=list[CatalogSkill])
async def list_skills() -> list[CatalogSkill]:
    """Freigegebener Skill-Katalog (klassifiziert, mit Trust-Tier)."""
    reg = await get_skill_registry_repo().get()
    return skills_service.released_catalog(reg)


@router.get("/skills/recommended", response_model=RecommendedSkills)
async def recommended_skills(
    agents: str | None = Query(default=None, description="Komma-Liste von CatalogAgent.id"),
) -> RecommendedSkills:
    """Empfehlungen je erkanntem Agenten-Set (vorselektiert vs. angeboten)."""
    reg = await get_skill_registry_repo().get()
    rec = skills_service.recommended(_parse_agents(agents), reg)
    return RecommendedSkills(preselected=rec["preselected"], offered=rec["offered"])


@router.get("/skills/{catalog_id}", response_model=CatalogSkill)
async def get_skill(catalog_id: str) -> CatalogSkill:
    """Detail eines freigegebenen Katalog-Skills (Vorschau)."""
    reg = await get_skill_registry_repo().get()
    skill = skills_service.released_by_id(catalog_id, reg)
    if skill is None:
        raise HTTPException(status_code=404, detail=f"Skill '{catalog_id}' nicht freigegeben/vorhanden.")
    return skill
