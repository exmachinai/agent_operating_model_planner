"""Compiler-Invarianten (Teststrategie §4, Risk R1/R6, P0).

Der Harness-Compiler ist der deterministische Kern. Hier die härtesten Eigenschaften
direkt am Compiler (nicht über die UI):

- INV-7 Determinismus: derselbe (graph, plan, project) ⇒ bit-identisches Zip + SHA-256;
  auch die volle Pipeline (compile_graph → build_zip) ist reproduzierbar.
- INV-5/Struktur: jeder Graph hat genau einen Orchestrator (Lead/„F/L"-analog) plus
  Evaluator + HITL und mindestens einen Agenten; Iteration startet bei 1.
"""

from __future__ import annotations

import asyncio
import json

from fastapi.testclient import TestClient

from app.db.plans_repo import get_plans_repo
from app.db.projects_repo import get_projects_repo
from app.harness import compiler

_TENANT = "tenant_exmachinai"


def _load(project_id: str):
    async def _go():
        proj = await get_projects_repo().get(project_id, _TENANT)
        plan = await get_plans_repo().latest(project_id)
        return proj, plan

    return asyncio.run(_go())


def test_inv7_build_zip_is_deterministic(client: TestClient, gate2_project: str) -> None:
    proj, plan = _load(gate2_project)
    graph = compiler.compile_graph(proj, plan)
    bytes_a, _, sha_a = compiler.build_zip(graph, plan, proj)
    bytes_b, _, sha_b = compiler.build_zip(graph, plan, proj)
    assert bytes_a == bytes_b, "Zip-Bytes nicht reproduzierbar"
    assert sha_a == sha_b and sha_a.startswith("sha256:")


def test_inv7_compile_reproducible_except_audit_timestamp(
    client: TestClient, gate2_project: str
) -> None:
    """compile_graph ist reproduzierbar bis auf den BEWUSSTEN Audit-Zeitstempel
    (`plan/_version.json:compiled_at` = Wall-Clock des Compile-Laufs). Alle anderen
    Deliverables sind über Re-Compiles bit-identisch — die echte INV-7-Garantie.
    """
    proj, plan = _load(gate2_project)
    files_a = compiler.build_files(compiler.compile_graph(proj, plan), plan, proj)
    files_b = compiler.build_files(compiler.compile_graph(proj, plan), plan, proj)

    assert set(files_a) == set(files_b)
    differing = [p for p in files_a if files_a[p] != files_b[p]]
    # Einzige erlaubte Abweichung: die Provenance-Datei.
    assert differing == ["plan/_version.json"], differing
    # … und dort NUR das compiled_at-Feld.
    ver_a = json.loads(files_a["plan/_version.json"])
    ver_b = json.loads(files_b["plan/_version.json"])
    ver_a.pop("compiled_at", None)
    ver_b.pop("compiled_at", None)
    assert ver_a == ver_b


def test_inv5_graph_core_structure(client: TestClient, gate2_project: str) -> None:
    proj, plan = _load(gate2_project)
    graph = compiler.compile_graph(proj, plan)
    kinds = [n.kind for n in graph.nodes]
    assert "orchestrator" in kinds and "evaluator" in kinds and "hitl" in kinds
    # Genau ein Orchestrator (Lead) — Pendant zu INV-2 „genau ein F/L".
    assert kinds.count("orchestrator") == 1, kinds
    assert graph.agents, "Graph ohne Agenten"
    assert graph.iteration == 1


def test_node_order_is_stable(client: TestClient, gate2_project: str) -> None:
    """Knoten-Reihenfolge ist über Wiederholungen stabil (Voraussetzung für INV-7)."""
    proj, plan = _load(gate2_project)
    order_a = [n.id for n in compiler.compile_graph(proj, plan).nodes]
    order_b = [n.id for n in compiler.compile_graph(proj, plan).nodes]
    assert order_a == order_b
