"""Health + readiness probes — used by Container Apps and Front Door."""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

from ..config import get_settings

router = APIRouter()


@router.get("/health", summary="Liveness probe")
async def health() -> dict[str, str]:
    """Used by Container Apps liveness probe. Returns 200 if process is alive."""
    s = get_settings()
    return {
        "status": "ok",
        "service": "aegira-planner-api",
        "env": s.app_env,
        "version": s.app_version,
        "now": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready", summary="Readiness probe")
async def ready() -> dict[str, Any]:
    """Returns 200 once dependencies (Cosmos, Foundry) are reachable.

    Stub-implementation for Phase-2 spike: always ready.
    Real check kommt in Phase-2-Beta (validiert Cosmos-Auth + Foundry-Endpoint).

    Return-Type ist dict[str, Any], weil 'checks' ein verschachteltes dict[str, bool]
    enthält. Strikter wie dict[str, str | bool] führt zu FastAPI/Pydantic
    ResponseValidationError, weil 'checks' weder str noch bool ist.
    """
    return {
        "status": "ready",
        "checks": {
            "cosmos": True,
            "foundry": True,
            "storage": True,
        },
    }
