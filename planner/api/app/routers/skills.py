"""Skill-Repository (v0.7, docs/15) — kuratierter, klassifizierter Katalog.

Versorgt die Picker-UI (Schritt 8) mit dem Skill-Katalog und dem Agent→Skill-
Matching. Read-only; keine Auth nötig (Stub wie übrige Katalog-Router).

Das Matching nutzt den bestehenden Agentenkatalog: erkannte Agentenrollen
(`CatalogAgent.id`) → empfohlene Skills. `preselected` = anthropic-vetted/
aegira-certified/world-top; `offered` = community/experimental (nie Default,
Security-Gate).
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from ..harness import skill_catalog
from ..schemas.harness import CatalogSkill
from pydantic import BaseModel

router = APIRouter()


class RecommendedSkills(BaseModel):
    """Antwort von GET /v1/skills/recommended."""

    preselected: list[CatalogSkill]
    offered: list[CatalogSkill]


def _parse_agents(agents: str | None) -> list[str]:
    if not agents:
        return []
    return [a.strip() for a in agents.split(",") if a.strip()]


@router.get("/skills", response_model=list[CatalogSkill])
async def list_skills() -> list[CatalogSkill]:
    """Vollständiger Skill-Katalog (klassifiziert, mit Trust-Tier)."""
    return skill_catalog.list_catalog()


@router.get("/skills/recommended", response_model=RecommendedSkills)
async def recommended_skills(
    agents: str | None = Query(default=None, description="Komma-Liste von CatalogAgent.id"),
) -> RecommendedSkills:
    """Empfehlungen je erkanntem Agenten-Set (vorselektiert vs. angeboten)."""
    ids = _parse_agents(agents)
    return RecommendedSkills(
        preselected=skill_catalog.preselected(ids),
        offered=skill_catalog.offered(ids),
    )


@router.get("/skills/{catalog_id}", response_model=CatalogSkill)
async def get_skill(catalog_id: str) -> CatalogSkill:
    """Detail eines Katalog-Skills (für die Vorschau / Progressive Disclosure)."""
    skill = skill_catalog.by_id(catalog_id)
    if skill is None:
        raise HTTPException(status_code=404, detail=f"Skill '{catalog_id}' nicht im Katalog.")
    return skill
