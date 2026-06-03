"""Coverage-Tests für den Harness-Compiler (Revisions-Kommandos + Befunde).

Deckt gezielt die Revisions-Pfade von `apply_command` (sequence/parallel/skill/
tool/agent/layout/stage-pattern/model-strategy/autonomy) inkl. Fehlerpfade,
sowie die Anti-Muster-Erkennung und die Layout-/HITL-Ableitung. Deterministisch,
ohne Netz/LLM — Graph + Plan werden über die In-Memory-Repos geladen bzw. direkt
konstruiert.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.db.plans_repo import get_plans_repo
from app.db.projects_repo import get_projects_repo
from app.harness import compiler
from app.schemas.harness import (
    MAX_HARNESS_ITERATIONS,
    AgentSpec,
    AutonomyLevel,
    HarnessNode,
    ReviseCommand,
)

_TENANT = "tenant_exmachinai"


def _load(project_id: str):
    async def _go():
        proj = await get_projects_repo().get(project_id, _TENANT)
        plan = await get_plans_repo().latest(project_id)
        return proj, plan

    return asyncio.run(_go())


def _graph(gate2_project: str):
    proj, plan = _load(gate2_project)
    return compiler.compile_graph(proj, plan), plan, proj


# --- slugify ------------------------------------------------------------------


def test_slugify_umlaute_und_leerstring() -> None:
    assert compiler.slugify("Ärger über Größe") == "aerger-ueber-groesse"
    assert compiler.slugify("Straße") == "strasse"
    # Nur Sonderzeichen -> Fallback-Slug.
    assert compiler.slugify("!!!") == "harness"


# --- sequence / parallel ------------------------------------------------------


def test_command_sequence_then_parallel(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    seq = compiler.apply_command(graph, ReviseCommand(command="sequence"))
    # Sequenziell verdrahtet: jeder Worker hängt am Vorgänger (chain-Muster).
    workers_seq = [n for n in seq.nodes if n.kind == "worker"]
    assert all(n.pattern == "chain" for n in workers_seq)
    assert seq.iteration == graph.iteration + 1

    par = compiler.apply_command(seq, ReviseCommand(command="parallel"))
    workers_par = [n for n in par.nodes if n.kind == "worker"]
    assert all(n.pattern == "section" for n in workers_par)


# --- skill (Freitext + Entfernen) ---------------------------------------------


def _first_worker_id(graph) -> str:
    return next(a.id for a in graph.agents if a.kind == "worker")


def test_command_skill_freitext_import_und_remove(
    client: TestClient, gate2_project: str
) -> None:
    graph, _, _ = _graph(gate2_project)
    aid = _first_worker_id(graph)
    content = "---\nname: mein-skill\ndescription: tut etwas\n---\n# Body\n"
    added = compiler.apply_command(
        graph,
        ReviseCommand(command="skill", agent_id=aid, skill="Mein Skill", skill_content=content),
    )
    target = next(a for a in added.agents if a.id == aid)
    assert "mein-skill" in target.skills
    assert any(s.name == "mein-skill" and s.content == content for s in added.imported_skills)

    removed = compiler.apply_command(
        added, ReviseCommand(command="skill", agent_id=aid, skill="Mein Skill", remove=True)
    )
    target2 = next(a for a in removed.agents if a.id == aid)
    assert "mein-skill" not in target2.skills


def test_command_skill_ohne_agent_id_faellt(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    with pytest.raises(ValueError):
        compiler.apply_command(graph, ReviseCommand(command="skill"))


def test_command_skill_unbekannter_agent_faellt(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    with pytest.raises(ValueError):
        compiler.apply_command(
            graph, ReviseCommand(command="skill", agent_id="ag_existiert_nicht", skill="x")
        )


def test_command_skill_ohne_skill_und_catalog_faellt(
    client: TestClient, gate2_project: str
) -> None:
    graph, _, _ = _graph(gate2_project)
    aid = _first_worker_id(graph)
    with pytest.raises(ValueError):
        compiler.apply_command(graph, ReviseCommand(command="skill", agent_id=aid))


def test_command_skill_ungueltiges_frontmatter_faellt(
    client: TestClient, gate2_project: str
) -> None:
    graph, _, _ = _graph(gate2_project)
    aid = _first_worker_id(graph)
    with pytest.raises(ValueError):
        compiler.apply_command(
            graph,
            ReviseCommand(
                command="skill", agent_id=aid, skill="x", skill_content="kein frontmatter"
            ),
        )


# --- tool ---------------------------------------------------------------------


def test_command_tool_add_und_remove(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    aid = _first_worker_id(graph)
    added = compiler.apply_command(
        graph, ReviseCommand(command="tool", agent_id=aid, tool="WebFetch")
    )
    assert "WebFetch" in next(a for a in added.agents if a.id == aid).tools
    removed = compiler.apply_command(
        added, ReviseCommand(command="tool", agent_id=aid, tool="WebFetch", remove=True)
    )
    assert "WebFetch" not in next(a for a in removed.agents if a.id == aid).tools


def test_command_tool_fehlende_felder_faellt(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    with pytest.raises(ValueError):
        compiler.apply_command(graph, ReviseCommand(command="tool", agent_id="x"))


def test_command_tool_unbekannter_agent_faellt(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    with pytest.raises(ValueError):
        compiler.apply_command(
            graph, ReviseCommand(command="tool", agent_id="ag_nope", tool="Read")
        )


# --- agent CRUD ---------------------------------------------------------------


def test_command_agent_add_update_delete(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    new = AgentSpec(role="Extra", name="Extra Worker", kind="worker", mission="x" * 50)
    added = compiler.apply_command(graph, ReviseCommand(command="agent", op="add", agent=new))
    spec = next(a for a in added.agents if a.name == "extra-worker")
    assert spec.id.startswith("ag_")

    patch = AgentSpec(role="Extra 2", name="Extra Worker", kind="worker", mission="y" * 50)
    updated = compiler.apply_command(
        added, ReviseCommand(command="agent", op="update", agent_id=spec.id, agent=patch)
    )
    assert next(a for a in updated.agents if a.id == spec.id).role == "Extra 2"

    deleted = compiler.apply_command(
        updated, ReviseCommand(command="agent", op="delete", agent_id=spec.id)
    )
    assert all(a.id != spec.id for a in deleted.agents)


def test_command_agent_add_doppelt_faellt(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    existing = graph.agents[0]
    dup = AgentSpec(id=existing.id, role="x", name=existing.name, kind="worker", mission="x" * 50)
    with pytest.raises(ValueError):
        compiler.apply_command(graph, ReviseCommand(command="agent", op="add", agent=dup))


def test_command_agent_add_ohne_agent_faellt(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    with pytest.raises(ValueError):
        compiler.apply_command(graph, ReviseCommand(command="agent", op="add"))


def test_command_agent_delete_ohne_id_faellt(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    with pytest.raises(ValueError):
        compiler.apply_command(graph, ReviseCommand(command="agent", op="delete"))


def test_command_agent_update_fehlende_felder_faellt(
    client: TestClient, gate2_project: str
) -> None:
    graph, _, _ = _graph(gate2_project)
    with pytest.raises(ValueError):
        compiler.apply_command(graph, ReviseCommand(command="agent", op="update"))


def test_command_agent_update_unbekannt_faellt(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    patch = AgentSpec(role="x", name="x", kind="worker", mission="x" * 50)
    with pytest.raises(ValueError):
        compiler.apply_command(
            graph, ReviseCommand(command="agent", op="update", agent_id="ag_nope", agent=patch)
        )


def test_command_agent_ohne_op_faellt(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    with pytest.raises(ValueError):
        compiler.apply_command(graph, ReviseCommand(command="agent"))


# --- layout / stage-pattern / model-strategy / autonomy -----------------------


def test_command_layout(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    stages = {a.id: i % 3 for i, a in enumerate(graph.agents)}
    out = compiler.apply_command(graph, ReviseCommand(command="layout", stages=stages))
    assert {n.stage for n in out.nodes} <= {0, 1, 2}


def test_command_layout_ohne_stages_faellt(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    with pytest.raises(ValueError):
        compiler.apply_command(graph, ReviseCommand(command="layout"))


def test_command_stage_pattern(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    out = compiler.apply_command(
        graph, ReviseCommand(command="stage-pattern", stage=1, pattern="vote")
    )
    assert all(n.pattern == "vote" for n in out.nodes if n.stage == 1)


def test_command_stage_pattern_fehlende_felder_faellt(
    client: TestClient, gate2_project: str
) -> None:
    graph, _, _ = _graph(gate2_project)
    with pytest.raises(ValueError):
        compiler.apply_command(graph, ReviseCommand(command="stage-pattern", stage=1))


def test_command_model_strategy_economy_premium_balanced(
    client: TestClient, gate2_project: str
) -> None:
    graph, _, _ = _graph(gate2_project)
    eco = compiler.apply_command(graph, ReviseCommand(command="model-strategy", strategy="economy"))
    assert all(a.model == "claude-sonnet-4-6" for a in eco.agents if a.kind != "hitl")

    prem = compiler.apply_command(graph, ReviseCommand(command="model-strategy", strategy="premium"))
    assert all(a.model == "claude-opus-4-8" for a in prem.agents if a.kind != "hitl")

    bal = compiler.apply_command(graph, ReviseCommand(command="model-strategy", strategy="balanced"))
    for a in bal.agents:
        if a.kind == "hitl":
            continue
        expected = "claude-opus-4-8" if a.kind == "orchestrator" else "claude-sonnet-4-6"
        assert a.model == expected


def test_command_model_strategy_ohne_strategy_faellt(
    client: TestClient, gate2_project: str
) -> None:
    graph, _, _ = _graph(gate2_project)
    with pytest.raises(ValueError):
        compiler.apply_command(graph, ReviseCommand(command="model-strategy"))


def test_command_autonomy(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    out = compiler.apply_command(graph, ReviseCommand(command="autonomy", autonomy_level=3))
    assert out.autonomy_level == AutonomyLevel.delegated


def test_command_autonomy_ohne_level_faellt(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    with pytest.raises(ValueError):
        compiler.apply_command(graph, ReviseCommand(command="autonomy"))


# --- Guard-Rails: eingefroren + Iterationslimit -------------------------------


def test_command_auf_eingefrorenem_harness_faellt(
    client: TestClient, gate2_project: str
) -> None:
    graph, _, _ = _graph(gate2_project)
    frozen = graph.model_copy(update={"status": "compiled"})
    with pytest.raises(ValueError):
        compiler.apply_command(frozen, ReviseCommand(command="parallel"))


def test_command_iterationslimit_faellt(client: TestClient, gate2_project: str) -> None:
    graph, _, _ = _graph(gate2_project)
    maxed = graph.model_copy(update={"iteration": MAX_HARNESS_ITERATIONS})
    with pytest.raises(RuntimeError):
        compiler.apply_command(maxed, ReviseCommand(command="parallel"))


def test_command_note_wird_als_finding_aufgenommen(
    client: TestClient, gate2_project: str
) -> None:
    graph, _, _ = _graph(gate2_project)
    out = compiler.apply_command(
        graph, ReviseCommand(command="parallel", note="Bitte beachten")
    )
    assert any(f.rule == "revise.note" and f.message == "Bitte beachten" for f in out.findings)


# --- Katalog-Skill-Pfad (_apply_catalog_skill) --------------------------------


def test_command_catalog_skill_add_und_remove(client: TestClient, gate2_project: str) -> None:
    from app.harness import skill_catalog

    graph, _, _ = _graph(gate2_project)
    aid = _first_worker_id(graph)
    cs = skill_catalog.hydrate(skill_catalog.list_catalog()[0])
    added = compiler.apply_command(
        graph,
        ReviseCommand(command="skill", agent_id=aid, catalog_id=cs.catalog_id, resolved_skill=cs),
    )
    target = next(a for a in added.agents if a.id == aid)
    assert cs.slug in target.skills
    assert any(c.catalog_id == cs.catalog_id for c in added.catalog_skills)

    removed = compiler.apply_command(
        added,
        ReviseCommand(
            command="skill", agent_id=aid, catalog_id=cs.catalog_id, resolved_skill=cs, remove=True
        ),
    )
    assert cs.slug not in next(a for a in removed.agents if a.id == aid).skills


def test_command_catalog_skill_nicht_aufgeloest_faellt(
    client: TestClient, gate2_project: str
) -> None:
    graph, _, _ = _graph(gate2_project)
    aid = _first_worker_id(graph)
    with pytest.raises(ValueError):
        compiler.apply_command(
            graph,
            ReviseCommand(command="skill", agent_id=aid, catalog_id="x_skill", resolved_skill=None),
        )


# --- Anti-Muster-Erkennung (_detect_anti_patterns) ----------------------------


def test_anti_pattern_ueber_spawning_und_vage_delegation() -> None:
    """Sechs parallele Worker -> Über-Spawning; dünne Mission -> vage Delegation."""
    agents = [
        AgentSpec(id=f"ag{i}", role=f"W{i}", name=f"w{i}", kind="worker", mission="kurz")
        for i in range(6)
    ]
    nodes = compiler._build_nodes(agents, parallel=True)
    findings = compiler._detect_anti_patterns(agents, nodes)
    rules = {f.rule for f in findings}
    assert "anti.ueber-spawning" in rules
    assert "anti.vage-delegation" in rules
    # Kein HITL/Evaluator/Methodik -> auch deren Befunde.
    assert "anti.fehlender-checkpoint" in rules
    assert "harness.kein-evaluator" in rules
    assert "mckinsey.mece-ungesichert" in rules


def test_anti_pattern_preflight_ok_mit_methodik() -> None:
    """Vollständiges Team (Orchestrator/Worker/Evaluator/HITL + Methodik) -> sauber."""
    agents = [
        AgentSpec(id="o", role="Lead", name="pmo", kind="orchestrator", mission="x" * 60),
        AgentSpec(
            id="m", role="Methodik", name="methodology-agent", kind="worker", mission="x" * 60
        ),
        AgentSpec(id="e", role="Reviewer", name="rev", kind="evaluator", mission="x" * 60),
        AgentSpec(id="h", role="HITL", name="hitl", kind="hitl", mission="x" * 60, hitl=True),
    ]
    nodes = compiler._build_nodes(agents, parallel=True)
    findings = compiler._detect_anti_patterns(agents, nodes)
    assert [f.rule for f in findings] == ["harness.preflight-ok"]


# --- Irreversible HITL-Punkte (_irreversible_hitl_points) ---------------------


def test_irreversible_hitl_points() -> None:
    agents = [
        AgentSpec(
            id="d", role="Deployer", name="deployer", kind="worker", mission="x" * 60,
            tools=["trigger_deploy"],
        )
    ]
    points = compiler._irreversible_hitl_points(agents)
    assert points and "trigger_deploy" in points[0]


# --- Layout-Ableitung: Muster je Stage (_build_nodes_from_layout) -------------


def test_build_nodes_from_layout_pattern_per_stage() -> None:
    """Stage mit Evaluator -> evaluator-optimizer; Router -> route; mehrere -> section;
    einzelner -> chain. Default-Stage greift, wenn ein Agent nicht gemappt ist."""
    agents = [
        AgentSpec(id="o", role="Lead", name="pmo", kind="orchestrator", mission="x" * 60),
        AgentSpec(id="r", role="Router", name="router", kind="router", mission="x" * 60),
        AgentSpec(id="w1", role="W1", name="w1", kind="worker", mission="x" * 60),
        AgentSpec(id="w2", role="W2", name="w2", kind="worker", mission="x" * 60),
        AgentSpec(id="e", role="Eval", name="eval", kind="evaluator", mission="x" * 60),
    ]
    # Stage 0: nur Router -> route. Stage 1: zwei Worker -> section. Stage 2: Evaluator.
    # Orchestrator nicht gemappt -> _default_stage(orchestrator)=0.
    stages = {"r": 0, "w1": 1, "w2": 1, "e": 2}
    nodes = compiler._build_nodes_from_layout(agents, stages)
    by_stage = {n.stage: n.pattern for n in nodes}
    assert by_stage[2] == "evaluator-optimizer"
    assert by_stage[1] == "section"
    # Stage 0 enthält Router (und den default-gemappten Orchestrator) -> route.
    assert by_stage[0] == "route"


def test_build_nodes_from_layout_single_node_chain() -> None:
    agents = [AgentSpec(id="w", role="W", name="w", kind="worker", mission="x" * 60)]
    nodes = compiler._build_nodes_from_layout(agents, {"w": 0})
    assert nodes[0].pattern == "chain"


# --- _validate_skill_frontmatter (direkt) -------------------------------------


def test_validate_skill_frontmatter_fehlerpfade() -> None:
    with pytest.raises(ValueError):
        compiler._validate_skill_frontmatter("kein frontmatter")
    with pytest.raises(ValueError):
        compiler._validate_skill_frontmatter("---\nname: x\n")  # nicht geschlossen
    with pytest.raises(ValueError):
        compiler._validate_skill_frontmatter("---\ndescription: y\n---\n")  # name fehlt
    with pytest.raises(ValueError):
        compiler._validate_skill_frontmatter("---\nname: x\n---\n")  # description fehlt
    # Gültig -> kein Fehler.
    compiler._validate_skill_frontmatter("---\nname: x\ndescription: y\n---\n# B\n")


# --- _prepopulate_skills: Skill ohne Katalog-Treffer wird übersprungen ---------


def test_prepopulate_skills_ueberspringt_unbekannten_slug() -> None:
    agents = [
        AgentSpec(
            id="a", role="W", name="w", kind="worker", mission="x" * 60,
            skills=["gibt-es-im-katalog-nicht"],
        )
    ]
    imported, catalog_entries = compiler._prepopulate_skills(agents)
    assert imported == [] and catalog_entries == []


# --- _hitl_points: rote Meilenstein-/Projektampeln ----------------------------


def test_hitl_points_rote_ampeln(client: TestClient, gate2_project: str) -> None:
    _, plan, _ = _graph(gate2_project)
    red_ms = plan.milestones[0].model_copy(update={"ampel": "rot"})
    red_risk = plan.prl[0].model_copy(update={"ampel": "rot"})
    red_plan = plan.model_copy(update={"milestones": [red_ms], "prl": [red_risk]})
    points = compiler._hitl_points(red_plan)
    assert any("rote Ampel" in p for p in points)
    assert any("rotes Projektrisiko" in p for p in points)


# --- _tasks_for: Risiko- + Worker-Pfade über echten Plan ----------------------


def test_tasks_for_risk_und_worker(client: TestClient, gate2_project: str) -> None:
    _, plan, _ = _graph(gate2_project)
    assert compiler._tasks_for("risk-agent", plan)  # aus PRL abgeleitet
    assert compiler._tasks_for("architecture-agent", plan)  # aus Meilensteinen
    assert compiler._tasks_for("unbekannt", plan) == []
