"""Schärfungs-Interview (Schritt 2, VERSTEHEN) — Chat + SSE-Stream.

Spec: docs/09_process-flow.md (Schritt 2). Eine Frage nach der anderen,
hypothesengeleitete Vorschläge, Interview-Schleife bis zum Verständnis.

Transcript-Persistenz im Spike: prozess-lokal (In-Memory). Phase-2-Beta legt
den Verlauf in den Cosmos-Container `sessions` (PartitionKey `/projectId`).
Der SSE-Stream gibt eine vorberechnete Runde wortweise aus — echtes
Token-Streaming aus Foundry ist eine spätere Optimierung.
"""

from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..context import store as context_store
from ..db.projects_repo import get_projects_repo
from ..llm import interview_engine
from ..schemas.interview import (
    InterviewMessage,
    InterviewState,
    InterviewTurnRequest,
)

router = APIRouter()

_STUB_TENANT = "tenant_exmachinai"

# project_id -> Transcript (In-Memory-Spike).
_TRANSCRIPTS: dict[str, list[InterviewMessage]] = {}


async def _load_project(project_id: str):
    project = await get_projects_repo().get(project_id, _STUB_TENANT)
    if project is None:
        raise HTTPException(status_code=404, detail="project not found")
    return project


@router.get("/{project_id}/interview", response_model=InterviewState)
async def get_interview(project_id: str) -> InterviewState:
    """Liefert den Verlauf. Beim ersten Aufruf wird die Eröffnungsfrage erzeugt."""
    project = await _load_project(project_id)
    transcript = _TRANSCRIPTS.setdefault(project_id, [])
    if not transcript:
        opening, _ = interview_engine.next_turn(
            project, transcript, context_store.combined(project_id)
        )
        transcript.append(opening)
    done = bool(transcript) and not _can_continue(project)
    return InterviewState(project_id=project_id, transcript=transcript, done=done)


def _can_continue(project) -> bool:  # noqa: ANN001
    return project.gate1_approved_at is None


@router.post("/{project_id}/interview/turn")
async def interview_turn(
    project_id: str, req: InterviewTurnRequest
) -> StreamingResponse:
    """Nimmt eine Anwender-Antwort an und streamt die nächste Interviewer-Runde (SSE)."""
    project = await _load_project(project_id)
    if not _can_continue(project):
        raise HTTPException(
            status_code=409, detail="Interview abgeschlossen (Gate 1 freigegeben)."
        )

    transcript = _TRANSCRIPTS.setdefault(project_id, [])
    transcript.append(InterviewMessage(role="user", content=req.message))
    assistant_msg, done = interview_engine.next_turn(
        project, transcript, context_store.combined(project_id)
    )
    transcript.append(assistant_msg)

    async def stream() -> AsyncIterator[bytes]:
        for word in assistant_msg.content.split(" "):
            chunk = word + " "
            yield f"data: {json.dumps({'token': chunk})}\n\n".encode()
            await asyncio.sleep(0.02)
        final = {
            "event": "done",
            "done": done,
            "message": assistant_msg.model_dump(),
        }
        yield f"data: {json.dumps(final)}\n\n".encode()

    return StreamingResponse(stream(), media_type="text/event-stream")
