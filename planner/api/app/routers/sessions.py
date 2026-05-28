"""Multi-Agent-Session Endpunkte — Stub für Phase-2-Spike.

Streaming-Endpoint (`GET /sessions/{id}/stream`) wird in Phase-2-Beta
mit echtem SSE + Foundry-Hookup implementiert.
"""

from __future__ import annotations

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

router = APIRouter()

_SESSIONS: dict[str, dict] = {}


@router.post("", status_code=201)
async def create_session(project_id: str) -> dict:
    sid = "ses_" + uuid.uuid4().hex[:12]
    _SESSIONS[sid] = {
        "id": sid,
        "project_id": project_id,
        "trace": [],
        "started_at": datetime.now(timezone.utc).isoformat(),
    }
    return _SESSIONS[sid]


async def _demo_stream(sid: str) -> AsyncIterator[bytes]:
    """SSE-Demo: emittiert simulierte Agent-Outputs.

    Real impl ruft Foundry Claude Sonnet 4.6 via Streaming-API.
    """
    events = [
        {"agent": "pmo-agent", "iteration": 1, "thinking_summary": "Strukturiere Auftrag in 4 Phasen (MECE)."},
        {"agent": "pmo-agent", "iteration": 1, "tool_call": {"name": "skill:zgpm-compose", "status": "running"}},
        {"agent": "pmo-agent", "iteration": 1, "tool_call": {"name": "skill:zgpm-compose", "status": "completed"}},
        {"agent": "architecture-agent", "iteration": 1, "delegated_by": "pmo-agent"},
        {"agent": "architecture-agent", "iteration": 1, "status": "completed"},
        {"hitl_approval_required": {"milestone_id": "M01", "risk": "gruen"}},
    ]
    for evt in events:
        yield f"data: {json.dumps(evt)}\n\n".encode("utf-8")
        await asyncio.sleep(0.6)


@router.get("/{session_id}/stream")
async def stream(session_id: str) -> StreamingResponse:
    if session_id not in _SESSIONS:
        raise HTTPException(status_code=404, detail="session not found")
    return StreamingResponse(_demo_stream(session_id), media_type="text/event-stream")
