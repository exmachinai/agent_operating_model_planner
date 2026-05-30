"""Leitplanken-Endpunkte — PLANEN-Phase (Schritt 5).

Spec: docs/09_process-flow.md (Schritt 5). Erst nach Gate 1 (Verständnis steht).
Das System verweigert harte Verbote und eskaliert Grenzfälle an den Anwender.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from ..db.projects_repo import get_projects_repo
from ..policy import guardrails as policy
from ..schemas.guardrails import GuardrailCheck, GuardrailClearRequest
from ..schemas.project import Project

router = APIRouter()

_STUB_TENANT = "tenant_exmachinai"


async def _load(project_id: str) -> Project:
    project = await get_projects_repo().get(project_id, _STUB_TENANT)
    if project is None:
        raise HTTPException(status_code=404, detail="project not found")
    if project.gate1_approved_at is None:
        raise HTTPException(
            status_code=409,
            detail="Leitplanken erst nach Gate 1 (Verständnis-Freigabe).",
        )
    return project


def _check_for(project: Project) -> GuardrailCheck:
    text = " ".join(
        filter(None, [project.title, project.description, project.understanding_summary])
    )
    verdict, flags = policy.screen(text)
    return GuardrailCheck(
        project_id=project.id,
        verdict=verdict,
        flags=flags,
        rationale=policy.rationale_for(verdict, flags),
        allowed_natures=policy.ALLOWED_NATURES,
        forbidden_categories=policy.forbidden_categories(),
        cleared_at=project.guardrails_cleared_at,
    )


@router.get("/{project_id}/guardrails", response_model=GuardrailCheck)
async def get_guardrails(project_id: str) -> GuardrailCheck:
    """Schritt 5 — Rahmen anzeigen + Projekt gegen Verbote prüfen."""
    return _check_for(await _load(project_id))


@router.post("/{project_id}/guardrails/clear", response_model=Project)
async def clear_guardrails(
    project_id: str, req: GuardrailClearRequest
) -> Project:
    """Schritt 5 — Anwender quittiert die Leitplanken und gibt Schritt 6 frei.

    Harte Verbote (`refused`) sind nicht quittierbar. Grenzfälle (`escalate`)
    erfordern eine bewusste Bestätigung (`proceed=true`).
    """
    repo = get_projects_repo()
    project = await _load(project_id)
    check = _check_for(project)

    if check.verdict == "refused":
        raise HTTPException(
            status_code=422,
            detail="Vorhaben berührt einen harten Verbotsbereich — nicht quittierbar.",
        )
    if check.verdict == "escalate" and not req.proceed:
        raise HTTPException(
            status_code=409,
            detail="Grenzfall offen — bitte bewusst bestätigen (proceed=true).",
        )

    now = datetime.now(timezone.utc)
    cleared = project.model_copy(
        update={"guardrails_cleared_at": now, "updated_at": now}
    )
    return await repo.replace(cleared)
