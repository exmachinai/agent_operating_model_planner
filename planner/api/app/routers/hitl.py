"""HITL-Approval Endpunkt — Stub.

Approval-Mode hardcoded auf "yes" für Spike. Phase-2-Beta integriert
Entra-ID-Claim-Check für Rolle `aegira.planner.hitl_pm`.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()


class HitlDecision(BaseModel):
    project_id: str
    milestone_id: str
    decision: Literal["approve", "request_changes", "stop", "comment"]
    message: str | None = Field(default=None, max_length=4000)


@router.post("/hitl-decision", status_code=202)
async def hitl_decision(decision: HitlDecision) -> dict:
    return {
        "accepted": True,
        "received_at": datetime.now(timezone.utc).isoformat(),
        "decision": decision.decision,
        "audit_id": f"audit_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
    }
