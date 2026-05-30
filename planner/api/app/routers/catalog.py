"""Subagent-Katalog + Guardrails (v0.4, docs/11) — projektunabhängig.

Versorgt die „Agent definieren"-UI (Canvas) mit den Weltklasse-Vorlagen und der
Guardrail-Liste. Read-only; keine Auth nötig (Stub wie übrige Router).
"""

from __future__ import annotations

from fastapi import APIRouter

from ..harness import catalog
from ..schemas.harness import CatalogAgent

router = APIRouter()


@router.get("/agents", response_model=list[CatalogAgent])
async def list_agents() -> list[CatalogAgent]:
    """Vollständiger Subagent-Katalog (Vorlagen mit Modell-Tier, Tools, Risk)."""
    return catalog.list_catalog()


@router.get("/guardrails")
async def list_guardrails() -> list[dict]:
    """Guardrail-Schicht (Relevanz/Safety/PII/Moderation/Tool-Risk/Output)."""
    return catalog.GUARDRAILS
