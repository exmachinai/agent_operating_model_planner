"""Plan-Endpunkte — PLANEN-Phase (Schritt 6).

Spec: docs/09_process-flow.md (Schritt 6). Der Orchestrator-Worker-Lauf erzeugt
einen ZGPM-konformen Plan; der Reviewer prüft ihn. Voraussetzung: Gate 1 steht
*und* die Leitplanken sind quittiert (Schritt 5). Pläne sind append-only —
jede Generierung legt eine neue Version an, alte Versionen bleiben erhalten.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from ..db.plans_repo import get_plans_repo
from ..db.projects_repo import get_projects_repo
from ..planning import llm_planner, zgpm_composer
from ..schemas.plan import (
    MilestoneOp,
    Plan,
    PlanRevisionRequest,
)
from ..schemas.project import Project

router = APIRouter()

_STUB_TENANT = "tenant_exmachinai"


async def _load_project(project_id: str):
    project = await get_projects_repo().get(project_id, _STUB_TENANT)
    if project is None:
        raise HTTPException(status_code=404, detail="project not found")
    return project


@router.post("/{project_id}/plan", response_model=Plan, status_code=201)
async def generate_plan(project_id: str) -> Plan:
    """Schritt 6 — eine neue ZGPM-Planversion erzeugen (append-only).

    Verlangt Gate 1 (Verständnis freigegeben) und quittierte Leitplanken
    (Schritt 5). Setzt den Projektstatus auf `reviewing` und merkt den plan_hash.
    """
    projects = get_projects_repo()
    plans = get_plans_repo()
    project = await _load_project(project_id)

    if project.gate1_approved_at is None:
        raise HTTPException(
            status_code=409,
            detail="Planung erst nach Gate 1 (Verständnis-Freigabe).",
        )
    if project.guardrails_cleared_at is None:
        raise HTTPException(
            status_code=409,
            detail="Leitplanken nicht quittiert (Schritt 5) — Planung gesperrt.",
        )

    version = await plans.next_version(project_id)
    # v0.5 — LLM-first (Foundry) mit deterministischem Fallback. Kontext ist das
    # bei Gate 1 eingefrorene Verständnis (immer verfügbar, keine ephemere Kopplung).
    plan = await llm_planner.generate_plan(
        project,
        version=version,
        plan_id="plan_" + uuid.uuid4().hex[:12],
        context_text=project.understanding_summary or "",
    )
    await plans.add(plan)

    updated = project.model_copy(
        update={
            "status": "reviewing",
            "current_iteration": version,
            "plan_hash": plan.plan_hash,
            # Geführtes Plan-DONE-Gate für die neue Version zurücksetzen (6a).
            "milestones_done_at": None,
            "updated_at": plan.created_at,
        }
    )
    await projects.replace(updated)
    return plan


@router.get("/{project_id}/plan", response_model=Plan)
async def get_plan(project_id: str) -> Plan:
    """Schritt 6 — die zuletzt erzeugte Planversion abrufen."""
    await _load_project(project_id)
    plan = await get_plans_repo().latest(project_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="noch kein Plan erzeugt")
    return plan


@router.get("/{project_id}/plan/versions", response_model=list[Plan])
async def list_plan_versions(project_id: str) -> list[Plan]:
    """Schritt 7 — alle Planversionen (aufsteigend) für Verlauf und Diff."""
    await _load_project(project_id)
    return await get_plans_repo().list(project_id)


@router.post("/{project_id}/plan/revise", response_model=Plan, status_code=201)
async def revise_plan(project_id: str, revision: PlanRevisionRequest) -> Plan:
    """Schritt 7 — Inline-Edits anwenden und als neue Version anlegen (append-only).

    Nach Gate 2 ist der Plan eingefroren — dann sind keine Revisionen mehr möglich.
    """
    plans = get_plans_repo()
    project = await _load_project(project_id)
    if project.gate2_approved_at is not None:
        raise HTTPException(
            status_code=409,
            detail="Plan ist nach Gate 2 eingefroren — keine Revision mehr.",
        )
    previous = await plans.latest(project_id)
    if previous is None:
        raise HTTPException(status_code=404, detail="noch kein Plan erzeugt")

    version = await plans.next_version(project_id)
    plan = zgpm_composer.revise(
        previous, revision, version=version, plan_id="plan_" + uuid.uuid4().hex[:12]
    )
    await plans.add(plan)

    updated = project.model_copy(
        update={
            "current_iteration": version,
            "plan_hash": plan.plan_hash,
            "updated_at": plan.created_at,
        }
    )
    await get_projects_repo().replace(updated)
    return plan


# --- Schritt 6a: geführte Plan-Bearbeitung (Wizard) --------------------------


async def _persist_new_version(project: Project, plan: Plan) -> Plan:
    """Legt eine neue Planversion ab und aktualisiert den Projekt-Zeiger."""
    await get_plans_repo().add(plan)
    updated = project.model_copy(
        update={
            "current_iteration": plan.version,
            "plan_hash": plan.plan_hash,
            "updated_at": plan.created_at,
        }
    )
    await get_projects_repo().replace(updated)
    return plan


@router.post("/{project_id}/plan/milestones/op", response_model=Plan, status_code=201)
async def edit_milestones(project_id: str, ops: list[MilestoneOp]) -> Plan:
    """Schritt 6a — Meilensteine bearbeiten (add/update/delete/reorder), neue Version.

    Nur vor dem Meilenstein-DONE und vor Gate 2. PVM/Risiken/Termine werden im
    Composer regelkonform neu abgeleitet (recompute)."""
    plans = get_plans_repo()
    project = await _load_project(project_id)
    if project.gate2_approved_at is not None:
        raise HTTPException(status_code=409, detail="Plan nach Gate 2 eingefroren.")
    if project.milestones_done_at is not None:
        raise HTTPException(
            status_code=409,
            detail="Meilensteine sind bereits bestätigt (DONE) — Bearbeitung gesperrt.",
        )
    previous = await plans.latest(project_id)
    if previous is None:
        raise HTTPException(status_code=404, detail="noch kein Plan erzeugt")
    version = await plans.next_version(project_id)
    plan = zgpm_composer.apply_milestone_ops(
        previous, ops, project, version=version, plan_id="plan_" + uuid.uuid4().hex[:12]
    )
    return await _persist_new_version(project, plan)


@router.post("/{project_id}/plan/milestones/done", response_model=Project)
async def milestones_done(project_id: str) -> Project:
    """Schritt 6a — DONE: Meilensteine bestätigen, schaltet Gantt/Risiko + Review frei.

    v0.6 — danach folgt direkt das 6c-Ergebnis (keine Aktivitäts-Stufe mehr)."""
    projects = get_projects_repo()
    project = await _load_project(project_id)
    if project.gate2_approved_at is not None:
        raise HTTPException(status_code=409, detail="Plan nach Gate 2 eingefroren.")
    plan = await get_plans_repo().latest(project_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="noch kein Plan erzeugt")
    now = datetime.now(timezone.utc)
    updated = project.model_copy(update={"milestones_done_at": now, "updated_at": now})
    return await projects.replace(updated)


@router.post("/{project_id}/approve-plan", response_model=Project)
async def approve_plan(project_id: str) -> Project:
    """Schritt 7 — Gate 2. Friert die zuletzt erzeugte Planversion als Bauvorlage ein.

    Voraussetzung: ein Plan existiert und der Reviewer meldet keinen HARD_FAIL
    (harte ZGPM-Regelverletzungen blockieren die Freigabe).
    """
    projects = get_projects_repo()
    project = await _load_project(project_id)
    if project.gate2_approved_at is not None:
        raise HTTPException(status_code=409, detail="Gate 2 already approved")

    plan = await get_plans_repo().latest(project_id)
    if plan is None:
        raise HTTPException(status_code=404, detail="noch kein Plan erzeugt")
    if plan.reviewer_status == "HARD_FAIL":
        raise HTTPException(
            status_code=409,
            detail="Reviewer meldet HARD_FAIL — Plan zuerst überarbeiten (Schritt 7).",
        )

    now = datetime.now(timezone.utc)
    approved = project.model_copy(
        update={
            "gate2_approved_at": now,
            "approved_plan_version": plan.version,
            "plan_hash": plan.plan_hash,
            "status": "approved",
            "updated_at": now,
        }
    )
    return await projects.replace(approved)
