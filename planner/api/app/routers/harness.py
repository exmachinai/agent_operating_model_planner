"""Harness-Endpunkte — BAUEN-Phase (Schritt 8) + Export (Schritt 9, Gate 3).

Spec: docs/03_harness-zip-spec.md, docs/09_process-flow.md (Schritt 8/9).

Der Compiler nimmt den bei Gate 2 freigegebenen Plan und erzeugt einen
editierbaren Harness-Graph (Orchestrator → Worker → Evaluator → HITL). Der
Nutzer revidiert ihn per Kommando (Sequenz/Parallel/Skill/Agent-CRUD), gibt ihn
an Gate 3 frei (friert ihn ein) und lädt das signierte Zip herunter.

Auth ist im Spike gestubbt (fixer Tenant), wie in den übrigen Routern.
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..db.harness_repo import get_harness_repo
from ..db.plans_repo import get_plans_repo
from ..db.projects_repo import get_projects_repo
from ..db.skill_registry_repo import get_skill_registry_repo
from ..harness import compiler, skills_service
from ..schemas.harness import HarnessFile, HarnessFileMap, HarnessGraph, ReviseCommand
from ..schemas.project import Project

router = APIRouter()

_STUB_TENANT = "tenant_exmachinai"


async def _load_project(project_id: str) -> Project:
    project = await get_projects_repo().get(project_id, _STUB_TENANT)
    if project is None:
        raise HTTPException(status_code=404, detail="project not found")
    return project


async def _approved_plan(project: Project):
    """Holt den bei Gate 2 freigegebenen Plan (oder den letzten, falls passend)."""
    plans = get_plans_repo()
    if project.approved_plan_version is not None:
        for pl in await plans.list(project.id):
            if pl.version == project.approved_plan_version:
                return pl
    return await plans.latest(project.id)


@router.post("/{project_id}/harness", response_model=HarnessGraph, status_code=201)
async def compile_harness(project_id: str) -> HarnessGraph:
    """Schritt 8 — kompiliert den freigegebenen Plan zu einem Harness-Graph.

    Nur nach Gate 2. Ein bereits eingefrorener (compiled) Harness wird nicht
    überschrieben — dafür erst neu freigeben/zurücksetzen.
    """
    project = await _load_project(project_id)
    if project.gate2_approved_at is None:
        raise HTTPException(
            status_code=409,
            detail="Harness erst nach Gate 2 (Plan-Freigabe) kompilierbar.",
        )
    repo = get_harness_repo()
    existing = await repo.get(project_id)
    if existing is not None and existing.status == "compiled":
        raise HTTPException(
            status_code=409,
            detail="Harness ist nach Gate 3 eingefroren — bereits kompiliert.",
        )

    plan = await _approved_plan(project)
    if plan is None:
        raise HTTPException(status_code=404, detail="kein freigegebener Plan gefunden")

    graph = compiler.compile_graph(project, plan)
    return await repo.upsert(graph)


@router.get("/{project_id}/harness", response_model=HarnessGraph)
async def get_harness(project_id: str) -> HarnessGraph:
    """Schritt 8 — aktuellen Harness-Graph abrufen (Agenten, Knoten, HITL, Findings)."""
    await _load_project(project_id)
    graph = await get_harness_repo().get(project_id)
    if graph is None:
        raise HTTPException(status_code=404, detail="noch kein Harness kompiliert")
    return graph


@router.post("/{project_id}/harness/revise", response_model=HarnessGraph, status_code=201)
async def revise_harness(project_id: str, command: ReviseCommand) -> HarnessGraph:
    """Schritt 8 — Kommando anwenden (Sequenz/Parallel/Skill/Agent-CRUD), versioniert."""
    await _load_project(project_id)
    repo = get_harness_repo()
    graph = await repo.get(project_id)
    if graph is None:
        raise HTTPException(status_code=404, detail="noch kein Harness kompiliert")
    # v0.8 — Katalog-Skill: nur freigegebene Skills (Admin-Freigabeliste) zuweisbar.
    # Der Router löst den Skill auf + hydriert ihn; der Compiler bleibt DB-frei.
    if command.command == "skill" and command.catalog_id:
        reg = await get_skill_registry_repo().get()
        if command.remove:
            resolved = skills_service.any_by_id(command.catalog_id, reg)
            if resolved is None:
                raise HTTPException(status_code=404, detail="Skill nicht im Katalog.")
            command = command.model_copy(update={"resolved_skill": resolved})
        else:
            resolved = skills_service.released_by_id(command.catalog_id, reg)
            if resolved is None:
                raise HTTPException(
                    status_code=403,
                    detail="Dieser Skill ist nicht freigegeben — der Admin muss ihn erst freigeben.",
                )
            command = command.model_copy(update={"resolved_skill": skills_service.hydrate(resolved)})
    try:
        revised = compiler.apply_command(graph, command)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return await repo.upsert(revised)


@router.post("/{project_id}/harness/approve", response_model=Project)
async def approve_harness(project_id: str) -> Project:
    """Schritt 9 — Gate 3. Friert den Harness ein, berechnet den Zip-Hash, status=compiled."""
    project = await _load_project(project_id)
    repo = get_harness_repo()
    graph = await repo.get(project_id)
    if graph is None:
        raise HTTPException(status_code=404, detail="noch kein Harness kompiliert")
    if any(f.severity == "fail" for f in graph.findings):
        raise HTTPException(
            status_code=409,
            detail="Harness hat blockierende Befunde (fail) — zuerst beheben.",
        )
    plan = await _approved_plan(project)
    if plan is None:
        raise HTTPException(status_code=404, detail="kein freigegebener Plan gefunden")

    now = datetime.now(timezone.utc)
    _, artifacts, zip_sha256 = compiler.build_zip(graph, plan, project)
    frozen = graph.model_copy(
        update={
            "status": "compiled",
            "artifacts": artifacts,
            "zip_sha256": zip_sha256,
            "compiled_at": now,
        }
    )
    await repo.upsert(frozen)

    updated = project.model_copy(
        update={
            "gate3_approved_at": now,
            "harness_zip_sha256": zip_sha256,
            "status": "compiled",
            "updated_at": now,
        }
    )
    return await get_projects_repo().replace(updated)


@router.get("/{project_id}/harness/download")
async def download_harness(project_id: str) -> StreamingResponse:
    """Schritt 9 — das signierte Harness-Zip als Download (StreamingResponse).

    Lädt sowohl den `draft`- als auch den eingefrorenen Stand herunter; der
    eingefrorene Stand entspricht exakt dem bei Gate 3 berechneten Zip-Hash.
    """
    project = await _load_project(project_id)
    graph = await get_harness_repo().get(project_id)
    if graph is None:
        raise HTTPException(status_code=404, detail="noch kein Harness kompiliert")
    plan = await _approved_plan(project)
    if plan is None:
        raise HTTPException(status_code=404, detail="kein freigegebener Plan gefunden")

    import io

    data, _, _ = compiler.build_zip(graph, plan, project)
    headers = {"Content-Disposition": f'attachment; filename="{graph.zip_name}"'}
    return StreamingResponse(io.BytesIO(data), media_type="application/zip", headers=headers)


@router.get("/{project_id}/harness/files", response_model=HarnessFileMap)
async def harness_files(project_id: str) -> HarnessFileMap:
    """Schritt 9 — der Harness **entpackt** als Datei-Map (für „Speichern unter").

    Liefert dieselben Artefakte wie das Zip, nur einzeln (Pfad + Textinhalt), damit
    der Client sie clientseitig (File System Access API) in einen lokal gewählten
    Ordner schreiben kann. Bit-Parität zur Zip über `compiler.build_file_map`;
    `checksums.txt` ist enthalten, sodass `shasum -c` auch im Ordner gilt.
    """
    project = await _load_project(project_id)
    graph = await get_harness_repo().get(project_id)
    if graph is None:
        raise HTTPException(status_code=404, detail="noch kein Harness kompiliert")
    plan = await _approved_plan(project)
    if plan is None:
        raise HTTPException(status_code=404, detail="kein freigegebener Plan gefunden")

    files, _ = compiler.build_file_map(graph, plan, project)
    root = graph.zip_name.replace(".harness.zip", "")
    return HarnessFileMap(
        root=root,
        zip_name=graph.zip_name,
        zip_sha256=graph.zip_sha256,
        files=[HarnessFile(path=p, content=files[p]) for p in sorted(files)],
    )
